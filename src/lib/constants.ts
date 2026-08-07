// src/lib/constants.ts
// Centralized constants for the marketplace application

// Production uses app.openmkt.marketplace.listing
// Development uses app.atprotomkt.marketplace.listing (to keep test data separate)
const PRODUCTION_COLLECTION = 'app.openmkt.marketplace.listing';
const DEVELOPMENT_COLLECTION = 'app.atprotomkt.marketplace.listing';

// Use NEXT_PUBLIC_MARKETPLACE_ENV to switch between collections
// Set to 'production' in production, anything else (or unset) uses development
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
