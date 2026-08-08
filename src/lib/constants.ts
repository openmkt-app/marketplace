// src/lib/constants.ts
// Centralized constants for the marketplace application

// The v1 listing collection. Nothing writes v1 records any more — v2 took over
// — so the only traffic here is reads, plus the delete that retires a record
// once its seller upgrades it.
//
// The dev/prod split is still load-bearing, for a different reason than when it
// was added. Upgrading a listing writes the v2 copy and then deletes the v1
// original. Pointed at production, a local session that upgraded a listing
// would put the replacement in the dev commerce collection and delete the real
// record — the listing would disappear from the live site. Dev therefore reads
// a collection of its own, which stays empty, so that path never starts.
//
// The dev NSID used to be app.atprotomkt.marketplace.listing, from a domain
// that is no longer ours and so was never ours to name records under. It now
// follows the same app.openmkt.test.* shape as the v2 dev collections.
const PRODUCTION_COLLECTION = 'app.openmkt.marketplace.listing';
const DEVELOPMENT_COLLECTION = 'app.openmkt.test.marketplace.listing';

// Set NEXT_PUBLIC_MARKETPLACE_ENV to 'production' in production; anything else
// (or unset) is development.
export const MARKETPLACE_COLLECTION =
  process.env.NEXT_PUBLIC_MARKETPLACE_ENV === 'production'
    ? PRODUCTION_COLLECTION
    : DEVELOPMENT_COLLECTION;

/**
 * The Open Market account. It is both the announcement bot and the moderation
 * admin, and it follows every seller as the discovery mechanism.
 *
 * Defined here because this file has no imports. The other two copies live in
 * moderation.ts, which imports `fs`, and bot-utils.ts, which imports the AT
 * Protocol SDK — neither can be reached from a client bundle, and the string
 * had already been hardcoded a fourth time in ListingDetail.
 */
export const ADMIN_HANDLE = 'openmkt.app';

export function isAdminHandle(handle: string | undefined | null): boolean {
  return !!handle && handle.toLowerCase() === ADMIN_HANDLE;
}
