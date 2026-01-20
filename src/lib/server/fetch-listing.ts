// src/lib/server/fetch-listing.ts
// Server-side utility for fetching listing data (used by generateMetadata and server components)

import { BskyAgent } from '@atproto/api';
import { MARKETPLACE_COLLECTION } from '../constants';

export type ListingData = {
  title: string;
  description: string;
  price: string;
  images?: Array<{
    ref: { $link: string };
    mimeType: string;
    size: number;
  }>;
  location: {
    state: string;
    county: string;
    locality: string;
    zipPrefix?: string;
  };
  category: string;
  condition: string;
  createdAt: string;
  externalUrl?: string;
  uri: string;
  cid?: string;
  authorDid: string;
  authorHandle?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  formattedImages?: Array<{
    thumbnail: string;
    fullsize: string;
    mimeType: string;
  }>;
};

function extractImageCids(rawJson: string): string[] {
  const cidMatches = rawJson.match(/bafk(?:re)?[a-zA-Z0-9]{44,60}/g) || [];
  return Array.from(new Set(cidMatches)); // Remove duplicates
}

function formatImageUrls(cids: string[], did: string) {
  return cids.map(cid => ({
    thumbnail: `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`,
    fullsize: `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@jpeg`,
    mimeType: 'image/jpeg',
  }));
}

export async function fetchListingById(id: string): Promise<ListingData | null> {
  try {
    const decodedId = decodeURIComponent(id);

    // Skip demo listings for server-side fetch
    if (decodedId.startsWith('demo-listing-')) {
      return null;
    }

    // Parse AT Protocol URI: at://did:plc:xxx/collection/rkey
    const parts = decodedId.split('/');
    if (parts.length < 5) {
      console.error('Invalid listing URI format:', decodedId);
      return null;
    }

    const did = parts[2];
    const collection = parts[3];
    const rkey = parts[4];

    // Verify this is a marketplace listing
    if (collection !== MARKETPLACE_COLLECTION) {
      console.error('Not a marketplace listing:', collection);
      return null;
    }

    const agent = new BskyAgent({
      service: 'https://bsky.social',
    });

    // Fetch the listing record
    const record = await agent.api.com.atproto.repo.getRecord({
      repo: did,
      collection: collection,
      rkey: rkey,
    });

    if (!record.data?.value) {
      return null;
    }

    const value = record.data.value as any;

    // Extract image CIDs from raw JSON
    const rawJson = JSON.stringify(record.data);
    const imageCids = extractImageCids(rawJson);
    const formattedImages = formatImageUrls(imageCids, did);

    // Fetch seller profile
    let authorHandle: string | undefined;
    let authorDisplayName: string | undefined;
    let authorAvatarUrl: string | undefined;

    try {
      const repoInfo = await agent.api.com.atproto.repo.describeRepo({ repo: did });
      authorHandle = repoInfo.data.handle;

      try {
        const profileRecord = await agent.api.com.atproto.repo.getRecord({
          repo: did,
          collection: 'app.bsky.actor.profile',
          rkey: 'self',
        });

        if (profileRecord.data?.value) {
          const profileValue = profileRecord.data.value as any;
          authorDisplayName = profileValue.displayName;

          // Extract avatar CID
          const avatar = profileValue.avatar;
          if (avatar && typeof avatar === 'object') {
            let avatarCid: string | undefined;

            if (avatar.ref?.$link) {
              avatarCid = avatar.ref.$link;
            } else if (avatar.$link) {
              avatarCid = avatar.$link;
            } else {
              const avatarStr = JSON.stringify(avatar);
              const cidMatch = avatarStr.match(/bafkrei[a-z0-9]{52,}/i);
              if (cidMatch) {
                avatarCid = cidMatch[0];
              }
            }

            if (avatarCid) {
              authorAvatarUrl = `https://cdn.bsky.app/img/avatar/plain/${did}/${avatarCid}@jpeg`;
            }
          }
        }
      } catch {
        // Profile record not available, continue with handle only
      }
    } catch {
      // Could not fetch repo info
    }

    return {
      title: value.title || 'Untitled Listing',
      description: value.description || '',
      price: value.price || '',
      images: value.images,
      location: value.location || { state: '', county: '', locality: '' },
      category: value.category || '',
      condition: value.condition || '',
      createdAt: value.createdAt || new Date().toISOString(),
      externalUrl: value.externalUrl,
      uri: record.data.uri,
      cid: record.data.cid,
      authorDid: did,
      authorHandle,
      authorDisplayName,
      authorAvatarUrl,
      formattedImages,
    };
  } catch (error) {
    console.error('Failed to fetch listing:', error);
    return null;
  }
}

export async function fetchSellerProfile(did: string) {
  try {
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    });

    const repoInfo = await agent.api.com.atproto.repo.describeRepo({ repo: did });

    const profile: {
      did: string;
      handle: string;
      displayName?: string;
      description?: string;
      avatarUrl?: string;
    } = {
      did,
      handle: repoInfo.data.handle || did,
    };

    try {
      const profileRecord = await agent.api.com.atproto.repo.getRecord({
        repo: did,
        collection: 'app.bsky.actor.profile',
        rkey: 'self',
      });

      if (profileRecord.data?.value) {
        const value = profileRecord.data.value as any;
        profile.displayName = value.displayName;
        profile.description = value.description;

        const avatar = value.avatar;
        if (avatar && typeof avatar === 'object') {
          let avatarCid: string | undefined;

          if (avatar.ref?.$link) {
            avatarCid = avatar.ref.$link;
          } else if (avatar.$link) {
            avatarCid = avatar.$link;
          } else {
            const avatarStr = JSON.stringify(avatar);
            const cidMatch = avatarStr.match(/bafkrei[a-z0-9]{52,}/i);
            if (cidMatch) {
              avatarCid = cidMatch[0];
            }
          }

          if (avatarCid) {
            profile.avatarUrl = `https://cdn.bsky.app/img/avatar/plain/${did}/${avatarCid}@jpeg`;
          }
        }
      }
    } catch {
      // Profile not available
    }

    return profile;
  } catch (error) {
    console.error('Failed to fetch seller profile:', error);
    return null;
  }
}
