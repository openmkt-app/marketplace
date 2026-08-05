// App-side hydration: everything that needs the rest of the codebase.
//
// Kept out of normalize.ts so the core transform stays a pure data function
// with no app imports — that keeps it testable under plain node and portable if
// the same logic has to move server-side or into the AppView.

import { generateImageUrls } from '../image-utils';
import { normalizeListing, type RecordIdentity } from './normalize.ts';
import type { Listing } from './types.ts';

/**
 * Attach CDN image URLs.
 *
 * This is what replaces the three regex CID scrapers in `src/lib/server/`,
 * which matched `bafk…` against the entire stringified record and would happily
 * render any non-image CID as a product photo. Here the `images` array is read
 * properly.
 *
 * The AppView does not do this for us — HappyView documents blob enrichment
 * with a `url` field, but a Lua query script that builds its own response
 * object bypasses it, so blobs arrive as raw refs either way.
 */
export function withImageUrls(listing: Listing): Listing {
  if (!listing.images?.length || !listing.authorDid) return listing;
  return {
    ...listing,
    formattedImages: generateImageUrls(listing.authorDid, listing.images as any),
  };
}

/** Normalize + hydrate images in one pass. The usual entry point for list reads. */
export function normalizeListings(
  rows: Array<{ record: Record<string, any> } & RecordIdentity>,
): Listing[] {
  return rows.map((row) =>
    withImageUrls(normalizeListing(row.record, { uri: row.uri, cid: row.cid, authorDid: row.authorDid })),
  );
}

/** Single-record equivalent. */
export function normalizeAndHydrate(record: Record<string, any>, id: RecordIdentity): Listing {
  return withImageUrls(normalizeListing(record, id));
}
