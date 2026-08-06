// Reading listings without an account.
//
// Deliberately separate from marketplace-client. That module imports
// @atproto/api at the top level for the authenticated write path, which pulls
// the SDK and its lexicon machinery — the single largest chunk on the site —
// into anything that touches it. This needs none of that: it calls our own API
// route and formats image URLs, so browse can read the marketplace without the
// bundle cost of being able to write to it.

import { generateImageUrls } from './image-utils';
import logger from './logger';
// Type-only, so it is erased at compile time and does not pull the module in.
import type { MarketplaceListing } from './marketplace-client';

export type PublicListing = MarketplaceListing & {
  authorDid: string;
  authorHandle: string;
  uri: string;
  cid: string;
};

export async function fetchPublicListings(): Promise<PublicListing[]> {
  logger.info('[Public] Fetching public listings via API proxy');

  try {
    const response = await fetch('/api/marketplace/listings');
    if (!response.ok) {
      logger.warn(`[Public] Listings API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const listings: PublicListing[] = (data.listings ?? []).map((listing: any) => ({
      ...listing,
      formattedImages: generateImageUrls(listing.authorDid, listing.images),
    }));

    logger.info(`[Public] Total marketplace listings found: ${listings.length}`);
    return listings;
  } catch (error) {
    logger.error('[Public] Failed to fetch listings', error as Error);
    return [];
  }
}

export type PublicProfile = {
  did: string;
  handle: string;
  displayName?: string;
  avatarCid?: string;
};

/**
 * A public Bluesky profile.
 *
 * A plain fetch rather than AtpAgent.getProfile. The call is an unauthenticated
 * GET returning JSON, and constructing an agent for it meant every page that
 * shows a seller name shipped the whole client SDK to make one request.
 */
export async function fetchPublicProfile(did: string): Promise<PublicProfile | null> {
  if (!did) return null;

  try {
    const url = new URL('https://api.bsky.app/xrpc/app.bsky.actor.getProfile');
    url.searchParams.set('actor', did);

    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;

    const profile = await res.json();
    return {
      did,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarCid: profile.avatar || undefined,
    };
  } catch {
    return null;
  }
}
