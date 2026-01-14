/**
 * Registry of known marketplace participant DIDs
 *
 * This file maintains a list of DIDs that are known to have marketplace listings.
 * This is a temporary solution until proper discovery mechanisms (like Jetstream or AppView) are working.
 *
 * You can add DIDs here manually or programmatically discover them.
 */

export const KNOWN_MARKETPLACE_DIDS: string[] = [
  'did:plc:oyhgprn7edb3dpdaq4mlgfkv', // Your personal profile
  // Add more DIDs here as you discover marketplace participants
];

/**
 * Add a DID to the known marketplace participants list
 * This can be called when you discover a new user has created listings
 */
export function addMarketplaceDID(did: string): void {
  if (!KNOWN_MARKETPLACE_DIDS.includes(did)) {
    KNOWN_MARKETPLACE_DIDS.push(did);
    console.log(`Added ${did} to known marketplace DIDs`);

    // Optionally persist to localStorage for client-side persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('marketplace-dids', JSON.stringify(KNOWN_MARKETPLACE_DIDS));
      } catch (e) {
        console.warn('Failed to persist marketplace DIDs to localStorage', e);
      }
    }
  }
}

/**
 * Load marketplace DIDs from localStorage on client initialization
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
        console.log(`Loaded ${storedDIDs.length} marketplace DIDs from storage`);
      }
    } catch (e) {
      console.warn('Failed to load marketplace DIDs from localStorage', e);
    }
  }
}

/**
 * Get all known marketplace DIDs
 */
export function getKnownMarketplaceDIDs(): string[] {
  return [...KNOWN_MARKETPLACE_DIDS];
}

// Auto-load from storage on module initialization
if (typeof window !== 'undefined') {
  loadMarketplaceDIDsFromStorage();
}
