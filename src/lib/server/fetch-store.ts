// src/lib/server/fetch-store.ts
// Server-side utility for fetching store/seller data (used by generateMetadata)

import { BskyAgent } from '@atproto/api';
import { MARKETPLACE_COLLECTION } from '../constants';

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

function extractImageCids(rawJson: string): string[] {
  const cidMatches = rawJson.match(/bafk(?:re)?[a-zA-Z0-9]{44,60}/g) || [];
  return Array.from(new Set(cidMatches));
}

function formatImageUrls(cids: string[], did: string) {
  return cids.map(cid => ({
    thumbnail: `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`,
    fullsize: `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@jpeg`,
    mimeType: 'image/jpeg',
  }));
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

    // Fetch listings from the marketplace collection
    const listingsResult = await pdsAgent.api.com.atproto.repo.listRecords({
      repo: profileData.did,
      collection: MARKETPLACE_COLLECTION,
      limit: 50,
    });

    const listings: StoreListing[] = [];

    if (listingsResult.success && listingsResult.data.records.length > 0) {
      for (const record of listingsResult.data.records) {
        const listing = record.value as any;
        const rawJson = JSON.stringify(record);
        const imageCids = extractImageCids(rawJson);
        const formattedImages = formatImageUrls(imageCids, profileData.did);

        listings.push({
          title: listing.title || 'Untitled',
          description: listing.description || '',
          price: listing.price || '',
          uri: record.uri,
          createdAt: listing.createdAt || new Date().toISOString(),
          formattedImages,
        });
      }

      // Sort by creation date (newest first)
      listings.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

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
