// src/lib/server/fetch-store.ts
// Server-side utility for fetching store/seller data (used by generateMetadata)

import { BskyAgent } from '@atproto/api';
import { READ_COLLECTIONS, SHOP_COLLECTION, SHOP_RKEY } from '../commerce/collections';
import { fetchListings as fetchListingsFromAppView } from '../commerce/appview';
import { normalizeListings } from '../commerce/hydrate';
import { normalizeShop } from '../commerce/normalize';
import type { Shop } from '../commerce/types';
import { toLegacyListing, toLegacyListings } from '../commerce/legacy';
import type { MarketplaceListing } from '../marketplace-client';

export type SellerProfile = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  createdAt?: string;
};

/**
 * A listing ready to hand straight to ListingCard.
 *
 * This used to carry only the five fields the metadata generator needed, so
 * the store page threw it away and refetched everything in the browser. Card
 * rendering wants category, condition and location too, and they cost nothing
 * extra here — they were already fetched and then discarded.
 */
export type StoreListing = MarketplaceListing & {
  uri: string;
  cid: string;
  authorDid: string;
  authorHandle: string;
  authorDisplayName?: string;
  authorAvatarCid?: string;
  formattedImages?: Array<{
    thumbnail: string;
    fullsize: string;
    mimeType: string;
  }>;
};

/**
 * How long a store page will wait on the index before reading the PDS instead.
 *
 * Above the cold-tunnel case rather than below it, which is the opposite of
 * where this started. The fallback is not a cheap consolation: it costs a
 * handle resolution, a PLC lookup and one request per collection, and it
 * regularly ran three to ten seconds while the function sat there holding the
 * request open. Giving the index long enough to actually answer is cheaper than
 * the thing that runs when it does not.
 */
const APPVIEW_BUDGET_MS = 3500;

/** Avatar URLs look like https://cdn.bsky.app/img/avatar/plain/did:plc:…/bafkrei…@jpeg */
function extractAvatarCid(avatarUrl?: string): string | undefined {
  if (!avatarUrl) return undefined;
  const match = avatarUrl.match(/\/(bafkrei[a-z0-9]+)@/);
  return match ? match[1] : undefined;
}

export type StoreData = {
  profile: SellerProfile;
  listings: StoreListing[];
  listingsCount: number;
  /** Null when the seller has no shop record yet. */
  shop: Shop | null;
};

/**
 * Read the seller's shop record from their PDS.
 *
 * Never throws: a store page without a shop record is the normal state for a
 * seller who has not saved a listing since the commerce collection landed, and
 * the page falls back to their Bluesky profile exactly as it always has.
 */
async function fetchShop(pdsEndpoint: string, did: string): Promise<Shop | null> {
  try {
    const agent = new BskyAgent({ service: pdsEndpoint });
    const res = await agent.api.com.atproto.repo.getRecord({
      repo: did,
      collection: SHOP_COLLECTION,
      rkey: SHOP_RKEY,
    });
    if (!res.data?.value) return null;
    return normalizeShop(res.data.value as Record<string, any>, {
      uri: res.data.uri,
      cid: res.data.cid,
      authorDid: did,
    });
  } catch {
    return null;
  }
}

/** Resolve a DID's PDS, falling back to bsky.social. */
async function resolvePds(did: string): Promise<string> {
  try {
    const didDoc = await fetch(`https://plc.directory/${did}`).then(r => r.json());
    const pdsService = didDoc.service?.find(
      (s: { id: string; type: string; serviceEndpoint: string }) =>
        s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
    );
    return pdsService?.serviceEndpoint || 'https://bsky.social';
  } catch {
    return 'https://bsky.social';
  }
}

export async function fetchStoreByHandle(handle: string): Promise<StoreData | null> {
  try {
    const decodedHandle = decodeURIComponent(handle);

    // Create a public agent to fetch data
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });

    // Fetch the user's profile
    const profileResult = await agent.getProfile({ actor: decodedHandle });

    if (!profileResult.success) {
      return null;
    }

    const profileData = profileResult.data;

    const profile: SellerProfile = {
      did: profileData.did,
      handle: profileData.handle,
      displayName: profileData.displayName,
      description: profileData.description,
      avatar: profileData.avatar,
      banner: profileData.banner,
      followersCount: profileData.followersCount,
      followsCount: profileData.followsCount,
      postsCount: profileData.postsCount,
      createdAt: profileData.createdAt,
    };

    const author = {
      authorDid: profileData.did,
      authorHandle: profileData.handle,
      authorDisplayName: profileData.displayName,
      authorAvatarCid: extractAvatarCid(profileData.avatar),
    };

    // One indexed query for this seller, covering both collections, instead of
    // resolving their PDS and listing each collection from it. Null means the
    // index did not answer, which falls through to the direct read below.
    //
    // The budget matters because this blocks the page. A warm index answers in
    // about 130ms; the client's default would wait six seconds for a cold
    // tunnel before giving up, and the fallback still has to run after that.
    // The seller's PDS, resolved once and shared by the shop read and the
    // listings fallback below — they used to each pay their own PLC lookup.
    const pdsPromise = resolvePds(profileData.did);

    // Started here, awaited after the listings. The shop record does not depend
    // on them, so it overlaps rather than adding a round trip to the page.
    const shopPromise = pdsPromise.then(pds => fetchShop(pds, profileData.did));

    const indexed = await fetchListingsFromAppView({
      did: profileData.did,
      limit: 100,
      timeoutMs: APPVIEW_BUDGET_MS,
    });

    let listings: StoreListing[];

    if (indexed) {
      listings = toLegacyListings(indexed).map(listing => ({
        ...(listing as any),
        ...author,
      }));
    } else {
      // Direct from the seller's PDS. Slower — it costs a handle resolution, a
      // PLC lookup and one request per collection — but it is the source of
      // truth, so a store page still works with the index down.
      const pdsAgent = new BskyAgent({ service: await pdsPromise });

      // A store's listings span both collections during the migration.
      const listingsResults = await Promise.all(
        READ_COLLECTIONS.map(collection =>
          pdsAgent.api.com.atproto.repo
            .listRecords({ repo: profileData.did, collection, limit: 50 })
            .catch(() => null)
        )
      );

      const rawRecords = listingsResults.flatMap(result =>
        result?.success ? result.data.records : []
      );

      // Images come from the normalized `images` array rather than a regex over
      // the stringified record, which matched any CID anywhere in it.
      listings = normalizeListings(
        rawRecords.map(record => ({
          record: record.value as any,
          uri: record.uri,
          cid: record.cid,
          authorDid: profileData.did,
        }))
      ).map(listing => ({
        ...(toLegacyListing(listing) as any),
        ...author,
      }));
    }

    // Sort by creation date (newest first)
    listings.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      profile,
      listings,
      listingsCount: listings.length,
      shop: await shopPromise,
    };
  } catch (error) {
    console.error('Failed to fetch store data:', error);
    return null;
  }
}
