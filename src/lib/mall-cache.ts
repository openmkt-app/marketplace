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

// --- Verified sellers list cache ---

type SellersPayload = {
  sellers: { did: string; handle: string; displayName?: string; avatar?: string; listingCount: number }[];
  count: number;
  timestamp: string;
};

const SELLERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let sellersCache: SellersPayload | null = null;
let sellersCachedAt = 0;

export function getCachedSellers(): SellersPayload | null {
  if (sellersCache && Date.now() - sellersCachedAt < SELLERS_CACHE_TTL) {
    return sellersCache;
  }
  return null;
}

export function setSellersCache(payload: SellersPayload): void {
  sellersCache = payload;
  sellersCachedAt = Date.now();
}

export function invalidateSellersCache(): void {
  sellersCache = null;
  sellersCachedAt = 0;
}

// --- PDS resolution cache ---

const pdsCache = new Map<string, string>();

export function getCachedPDS(did: string): string | undefined {
  return pdsCache.get(did);
}

export function setCachedPDS(did: string, endpoint: string): void {
  pdsCache.set(did, endpoint);
}

// --- Public listings cache ---

export type PublicListing = Record<string, any>;

const LISTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let listingsCache: PublicListing[] | null = null;
let listingsCachedAt = 0;

export function getCachedListings(): PublicListing[] | null {
  if (listingsCache && Date.now() - listingsCachedAt < LISTINGS_CACHE_TTL) {
    return listingsCache;
  }
  return null;
}

export function setListingsCache(listings: PublicListing[]): void {
  listingsCache = listings;
  listingsCachedAt = Date.now();
}

export function invalidateListingsCache(): void {
  listingsCache = null;
  listingsCachedAt = 0;
}

// --- AppView listings cache ---
//
// Kept separate from the fan-out cache above for two reasons. Sharing it would
// let a ?source=fanout request be answered from AppView-cached data (and the
// reverse), making the two paths impossible to compare honestly. And the AppView
// deserves a shorter TTL: it indexes the firehose live, so caching it for five
// minutes would throw away the freshness that is the point of having it.
//
// The TTL exists mainly to protect the origin. The index runs on a home NAS
// behind a tunnel, so one request per page load is load worth avoiding.

const APPVIEW_CACHE_TTL = 60 * 1000; // 1 minute

let appViewCache: PublicListing[] | null = null;
let appViewCachedAt = 0;

export function getCachedAppViewListings(): PublicListing[] | null {
  if (appViewCache && Date.now() - appViewCachedAt < APPVIEW_CACHE_TTL) {
    return appViewCache;
  }
  return null;
}

export function setAppViewListingsCache(listings: PublicListing[]): void {
  appViewCache = listings;
  appViewCachedAt = Date.now();
}

export function invalidateAppViewListingsCache(): void {
  appViewCache = null;
  appViewCachedAt = 0;
}
