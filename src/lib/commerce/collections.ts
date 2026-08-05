// Collection NSIDs for the commerce lexicon.
//
// Kept separate from the legacy constant in `../constants` so the two can be
// reasoned about independently during the migration. Writes go to exactly one
// collection; reads span both.

import { MARKETPLACE_COLLECTION } from '../constants.ts';

const PRODUCTION_COMMERCE = 'app.openmkt.commerce.listing';

// Dev writes to a distinct NSID so test listings never land in the production
// index, mirroring the reason the old app.atprotomkt.* split existed.
//
// TODO: confirm this name with Al. The old dev NSID borrowed a domain that is
// no longer ours, which is not a good basis for NSID authority.
const DEVELOPMENT_COMMERCE = 'app.openmkt.test.commerce.listing';

/** The only collection new records are written to. */
export const COMMERCE_COLLECTION =
  process.env.NEXT_PUBLIC_MARKETPLACE_ENV === 'production'
    ? PRODUCTION_COMMERCE
    : DEVELOPMENT_COMMERCE;

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
