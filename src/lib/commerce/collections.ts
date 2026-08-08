// Collection NSIDs for the commerce lexicon.
//
// Kept separate from the legacy constant in `../constants` so the two can be
// reasoned about independently during the migration. Writes go to exactly one
// collection; reads span both.

import { IS_PRODUCTION, MARKETPLACE_COLLECTION } from '../constants.ts';

const PRODUCTION_COMMERCE = 'app.openmkt.commerce.listing';
const PRODUCTION_SHOP = 'app.openmkt.commerce.shop';
const PRODUCTION_GROUP = 'app.openmkt.commerce.productGroup';

// Dev writes to a distinct NSID so test listings never land in the production
// index. The v1 collection splits the same way and for the same shape of
// reason — see the note in ../constants.
const DEVELOPMENT_COMMERCE = 'app.openmkt.test.commerce.listing';
const DEVELOPMENT_SHOP = 'app.openmkt.test.commerce.shop';
const DEVELOPMENT_GROUP = 'app.openmkt.test.commerce.productGroup';

/** The only collection new records are written to. */
export const COMMERCE_COLLECTION = IS_PRODUCTION ? PRODUCTION_COMMERCE : DEVELOPMENT_COMMERCE;

/**
 * The seller's shop record. One per repo, at rkey `self`.
 *
 * Listings need it before Phase 6 gives it a UI: `shopRef` is a required field
 * on a listing, so a listing cannot be written without a shop to point at.
 */
export const SHOP_COLLECTION = IS_PRODUCTION ? PRODUCTION_SHOP : DEVELOPMENT_SHOP;

/** Every repo has at most one shop, so the record key is fixed. */
export const SHOP_RKEY = 'self';

/**
 * A product whose variants are separate listings.
 *
 * Unlike the shop there are many per repo, so these get generated rkeys and a
 * listing points at one through `partOf`.
 */
export const PRODUCT_GROUP_COLLECTION = IS_PRODUCTION ? PRODUCTION_GROUP : DEVELOPMENT_GROUP;

/** The v1 collection. Read-only — nothing should write here again. */
export const LEGACY_COLLECTION = MARKETPLACE_COLLECTION;

/**
 * Every collection a listing may live in, newest format first.
 *
 * Read paths must cover all of these; a seller who never edits again keeps a v1
 * record forever, so this is not temporary scaffolding.
 */
export const READ_COLLECTIONS: readonly string[] = [COMMERCE_COLLECTION, LEGACY_COLLECTION];

export function isListingCollection(nsid: string | undefined | null): boolean {
  return !!nsid && READ_COLLECTIONS.includes(nsid);
}

/** Pull the collection segment out of `at://did/<collection>/<rkey>`. */
export function collectionFromUri(uri: string | undefined | null): string | null {
  if (!uri) return null;
  const match = /^at:\/\/[^/]+\/([^/]+)\//.exec(uri);
  return match ? match[1] : null;
}

/** Pull the repo DID out of `at://<did>/collection/rkey`. */
export function didFromUri(uri: string | undefined | null): string | null {
  if (!uri) return null;
  const match = /^at:\/\/([^/]+)\//.exec(uri);
  return match ? match[1] : null;
}

export function rkeyFromUri(uri: string | undefined | null): string | null {
  if (!uri) return null;
  const match = /^at:\/\/[^/]+\/[^/]+\/(.+)$/.exec(uri);
  return match ? match[1] : null;
}

export function isLegacyUri(uri: string | undefined | null): boolean {
  return collectionFromUri(uri) === LEGACY_COLLECTION;
}
