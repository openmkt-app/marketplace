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

// Stale-while-revalidate.
//
// A cache miss used to cost the visitor the full round trip to the NAS, which
// measured 0.7s to 3.8s from Netlify and is highly variable — it crosses the
// public internet to a home connection. So every 60 seconds one unlucky visitor
// paid for everyone else's freshness.
//
// Instead: serve what we have immediately and refresh behind the response. Data
// is at most a minute or so old, and nobody ever waits on the origin.

/** Past this, the entry is refreshed — but still served while that happens. */
const APPVIEW_REFRESH_AFTER = 60 * 1000;

/**
 * Past this, the entry is too old to serve and the caller must wait.
 *
 * Deliberately much longer than the refresh interval: if the NAS is unreachable,
 * ten-minute-old listings beat dropping to a fan-out that takes 8.7 seconds.
 */
const APPVIEW_MAX_STALE = 10 * 60 * 1000;

let appViewCache: PublicListing[] | null = null;
let appViewCachedAt = 0;

export type AppViewCacheEntry = {
  listings: PublicListing[];
  ageMs: number;
  /** Served now, but a refresh should be started. */
  needsRefresh: boolean;
};

/** Returns anything still within the max-stale window, fresh or not. */
export function getAppViewCacheEntry(): AppViewCacheEntry | null {
  if (!appViewCache) return null;
  const ageMs = Date.now() - appViewCachedAt;
  if (ageMs > APPVIEW_MAX_STALE) return null;
  return { listings: appViewCache, ageMs, needsRefresh: ageMs > APPVIEW_REFRESH_AFTER };
}

export function setAppViewListingsCache(listings: PublicListing[]): void {
  appViewCache = listings;
  appViewCachedAt = Date.now();
}

export function invalidateAppViewListingsCache(): void {
  appViewCache = null;
  appViewCachedAt = 0;
}

// --- DID -> handle cache ---
//
// The AppView returns DIDs, not handles, but the UI needs handles for author
// names and for links to store pages. Resolving them means one PLC lookup per
// unique seller, so they are cached for a day — handles change rarely, and a
// stale one costs a wrong display name rather than a broken page.

const HANDLE_CACHE_TTL = 24 * 60 * 60 * 1000;

const handleCache = new Map<string, { handle: string; at: number }>();

export function getCachedHandle(did: string): string | null {
  const hit = handleCache.get(did);
  if (hit && Date.now() - hit.at < HANDLE_CACHE_TTL) return hit.handle;
  return null;
}

export function setCachedHandle(did: string, handle: string): void {
  handleCache.set(did, { handle, at: Date.now() });
}

// One shared in-flight refresh. Without this, a burst of requests arriving on a
// stale entry would each start their own fetch and stampede the NAS.
let inFlightRefresh: Promise<void> | null = null;

/**
 * Start a background refresh unless one is already running.
 *
 * Not awaited by the caller. On a serverless platform the function may be frozen
 * after responding, so this is best-effort — if it does not finish, the next
 * request simply tries again. That is acceptable because a stale entry is still
 * being served either way.
 */
export function refreshAppViewInBackground(refresh: () => Promise<PublicListing[] | null>): void {
  if (inFlightRefresh) return;
  inFlightRefresh = refresh()
    .then((listings) => {
      if (listings) setAppViewListingsCache(listings);
    })
    .catch(() => {
      // Keep serving the stale entry; the next request retries.
    })
    .finally(() => {
      inFlightRefresh = null;
    });
}
