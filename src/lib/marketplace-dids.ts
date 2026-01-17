/**
 * Registry of known marketplace participant DIDs
 *
 * This file maintains a list of DIDs that are known to have marketplace listings.
 * It combines:
 * 1. Hardcoded seeds
 * 2. LocalStorage (custom added by user)
 * 3. Verified Sellers (fetched from Bot Registry API)
 */

export const KNOWN_MARKETPLACE_DIDS: string[] = [
  'did:plc:oyhgprn7edb3dpdaq4mlgfkv', // Seed profile
];

// Cache for verified sellers to avoid refetching too often
let verifiedSellers: string[] = [];
let lastFetched: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute
let fetchPromise: Promise<string[]> | null = null;

/**
 * Fetch verified sellers from the Bot Registry API
 */
export function fetchVerifiedSellers(force = false): Promise<string[]> {
  if (typeof window === 'undefined') return Promise.resolve([]);

  // If a fetch is already in progress, return the existing promise
  if (fetchPromise) return fetchPromise;

  // Check cache validity if not forced
  if (!force && verifiedSellers.length > 0 && (Date.now() - lastFetched < CACHE_TTL)) {
    return Promise.resolve(verifiedSellers);
  }

  // Otherwise start a new fetch
  fetchPromise = (async () => {
    try {
      const response = await fetch('/api/marketplace/sellers?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        if (data.sellers && Array.isArray(data.sellers)) {
          verifiedSellers = data.sellers.map((s: any) => s.did);
          lastFetched = Date.now();
          console.log(`[Registry] Fetched ${verifiedSellers.length} verified sellers`);
        }
      }
    } catch (e) {
      console.error('Failed to fetch verified sellers:', e);
    } finally {
      // Clear promise so we can fetch again later if needed
      // but keep the data
      fetchPromise = null;
    }
    return verifiedSellers;
  })();

  return fetchPromise;
}

/**
 * Ensure verified sellers are loaded before proceeding.
 * Use this when you need to be sure the registry is populated.
 */
export async function ensureVerifiedSellersLoaded(): Promise<string[]> {
  // Check if we have data and it's fresh
  if (verifiedSellers.length > 0 && (Date.now() - lastFetched < CACHE_TTL)) {
    return verifiedSellers;
  }

  // If we have a pending fetch, wait for it
  if (fetchPromise) return fetchPromise;

  // Otherwise start one
  return fetchVerifiedSellers();
}

/**
 * Add a DID to the known marketplace participants list (Local Only)
 */
export function addMarketplaceDID(did: string): void {
  const combined = new Set([...KNOWN_MARKETPLACE_DIDS, ...verifiedSellers]);

  if (!combined.has(did)) {
    KNOWN_MARKETPLACE_DIDS.push(did);
    console.log(`Added ${did} to known marketplace DIDs`);

    if (typeof window !== 'undefined') {
      try {
        // filter out verified ones so we don't save them to local storage redundantly?
        // Actually, just save local additions.
        localStorage.setItem('marketplace-dids', JSON.stringify(KNOWN_MARKETPLACE_DIDS));
      } catch (e) {
        console.warn('Failed to persist marketplace DIDs', e);
      }
    }
  }
}

/**
 * Load marketplace DIDs from localStorage
 */
export function loadMarketplaceDIDsFromStorage(): void {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('marketplace-dids');
      if (stored) {
        const storedDIDs: string[] = JSON.parse(stored);
        storedDIDs.forEach(did => {
          if (!KNOWN_MARKETPLACE_DIDS.includes(did)) {
            KNOWN_MARKETPLACE_DIDS.push(did);
          }
        });
      }

      // Kick off the verified fetch
      fetchVerifiedSellers();

    } catch (e) {
      console.warn('Failed to load marketplace DIDs', e);
    }
  }
}

/**
 * Get all known marketplace DIDs (Local + Verified)
 */
export function getKnownMarketplaceDIDs(): string[] {
  // De-duplicate
  return Array.from(new Set([...KNOWN_MARKETPLACE_DIDS, ...verifiedSellers]));
}

// Auto-load
if (typeof window !== 'undefined') {
  loadMarketplaceDIDsFromStorage();
}
