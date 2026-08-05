// src/lib/server/fetch-store.ts
// Server-side utility for fetching store/seller data (used by generateMetadata)

import { BskyAgent } from '@atproto/api';
import { READ_COLLECTIONS } from '../commerce/collections';
import { normalizeListings } from '../commerce/hydrate';
import { toLegacyListing } from '../commerce/legacy';

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

export type StoreListing = {
  title: string;
  description: string;
  price: string;
  uri: string;
  createdAt: string;
  formattedImages?: Array<{
    thumbnail: string;
    fullsize: string;
    mimeType: string;
  }>;
};

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

    // Fetch the user's marketplace listings
    let pdsEndpoint = 'https://bsky.social';
    try {
      const didDocResponse = await agent.com.atproto.identity.resolveHandle({ handle: decodedHandle });
      const did = didDocResponse.data.did;

      const didDoc = await fetch(`https://plc.directory/${did}`).then(r => r.json());
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

    // Create an agent for the user's PDS
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
    const listings: StoreListing[] = normalizeListings(
      rawRecords.map(record => ({
        record: record.value as any,
        uri: record.uri,
        cid: record.cid,
        authorDid: profileData.did,
      }))
    ).map(listing => ({
      title: listing.title,
      description: listing.description,
      price: toLegacyListing(listing).price,
      uri: listing.uri,
      createdAt: listing.createdAt,
      formattedImages: listing.formattedImages ?? [],
    }));

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
