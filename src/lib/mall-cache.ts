// Shared in-memory cache for sellers with no online store listings.
// Module-level so it persists across requests within the same server process.

const emptySellerCache = new Map<string, number>();
export const EMPTY_SELLER_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function isSellerCachedEmpty(did: string): boolean {
  const emptySince = emptySellerCache.get(did);
  return !!emptySince && Date.now() - emptySince < EMPTY_SELLER_TTL;
}

export function markSellerEmpty(did: string): void {
  emptySellerCache.set(did, Date.now());
}

export function invalidateSeller(did: string): void {
  emptySellerCache.delete(did);
}
