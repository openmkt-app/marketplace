// src/lib/server/fetch-listing.ts
// Server-side utility for fetching listing data (used by generateMetadata and server components)

import { BskyAgent } from '@atproto/api';
import { isListingCollection } from '../commerce/collections';
import { fetchPublicProfile } from '../public-listings';
import { normalizeAndHydrate } from '../commerce/hydrate';
import { toLegacyListing } from '../commerce/legacy';

export type ListingData = {
  title: string;
  description: string;
  price: string;
  currency?: string;
  labels?: any;
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

export async function fetchListingById(id: string): Promise<ListingData | 'removed' | null> {
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

    // Accept both collections. Existing feed-index entries store full AT URIs
    // including the collection segment, so a v1-only check here would turn every
    // old feed entry into a 404 once writes move to the commerce collection.
    if (!isListingCollection(collection)) {
      console.error('Not a marketplace listing:', collection);
      return null;
    }

    // Started here, awaited after the record is in hand. The seller's profile
    // does not depend on the record, but used to be fetched after it and as two
    // more round trips (describeRepo, then the profile record), making four
    // sequential hops before this function could return. Now it overlaps.
    const profilePromise = fetchPublicProfile(did);

    // Resolve the DID to find the correct PDS (handles non-bsky.social accounts)
    let pdsEndpoint = 'https://bsky.social';
    try {
      const didDocUrl = did.startsWith('did:web:')
        ? `https://${did.slice('did:web:'.length)}/.well-known/did.json`
        : `https://plc.directory/${did}`;
      const didDocRes = await fetch(didDocUrl, { signal: AbortSignal.timeout(5000) });
      if (didDocRes.ok) {
        const didDoc = await didDocRes.json();
        const pdsService = didDoc.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer');
        if (pdsService?.serviceEndpoint) {
          pdsEndpoint = pdsService.serviceEndpoint;
        }
      }
    } catch {
      // Fall back to bsky.social
    }

    const agent = new BskyAgent({
      service: pdsEndpoint,
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

    // Normalize whichever shape came back, then read the images off the
    // `images` array. The old path regex-matched `bafk…` against the entire
    // stringified record, which picks up any CID anywhere in it — a non-image
    // blob or a nested ref would have rendered as a product photo.
    const listing = normalizeAndHydrate(record.data.value as any, {
      uri: record.data.uri,
      cid: record.data.cid,
      authorDid: did,
    });
    const value = toLegacyListing(listing);
    const formattedImages = listing.formattedImages ?? [];

    // Seller profile, started before the record fetch above.
    //
    // app.bsky.actor.getProfile returns the handle, display name and a ready
    // avatar URL in one call, replacing describeRepo plus a raw profile-record
    // read and the CID extraction that went with it. It resolves to null on any
    // failure, which leaves the fields undefined exactly as the old catches did.
    const profile = await profilePromise;
    const authorHandle = profile?.handle;
    const authorDisplayName = profile?.displayName;
    const authorAvatarUrl = profile?.avatarCid;

    return {
      title: value.title || 'Untitled Listing',
      description: value.description || '',
      price: value.price || '',
      currency: value.currency,
      labels: value.labels ? JSON.parse(JSON.stringify(value.labels)) : undefined,
      images: value.images ? JSON.parse(JSON.stringify(value.images)) : undefined,
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
    if (error instanceof Error && error.message.includes('Could not locate record')) {
      return 'removed';
    }
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
