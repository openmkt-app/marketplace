// src/lib/server/fetch-store.ts
// Server-side utility for fetching store/seller data (used by generateMetadata)

import { BskyAgent } from '@atproto/api';
import { READ_COLLECTIONS } from '../commerce/collections';
import { fetchListings as fetchListingsFromAppView } from '../commerce/appview';
import { normalizeListings } from '../commerce/hydrate';
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
};

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
    const indexed = await fetchListingsFromAppView({ did: profileData.did, limit: 100 });

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
      let pdsEndpoint = 'https://bsky.social';
      try {
        const didDoc = await fetch(`https://plc.directory/${profileData.did}`).then(r => r.json());
        const pdsService = didDoc.service?.find(
          (s: { id: string; type: string; serviceEndpoint: string }) =>
            s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
        );
        if (pdsService?.serviceEndpoint) {
          pdsEndpoint = pdsService.serviceEndpoint;
        }
      } catch (e) {
        console.warn('Could not resolve PDS, using default:', e);
      }

      const pdsAgent = new BskyAgent({ service: pdsEndpoint });

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
    };
  } catch (error) {
    console.error('Failed to fetch store data:', error);
    return null;
  }
}
