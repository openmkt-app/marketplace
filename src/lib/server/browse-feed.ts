// The indexed browse feed, shared by the listings API route and the server
// render of /browse.
//
// Both need the same thing — the AppView's cross-seller listings, with author
// handles attached and the stale-while-revalidate cache in front — so it lives
// here rather than being duplicated or, worse, fetched by the page over HTTP
// from our own API route.

import { fetchListingsWithDiagnostics, isAppViewEnabled } from '@/lib/commerce/appview';
import { toLegacyListings } from '@/lib/commerce/legacy';
import {
    getAppViewCacheEntry, setAppViewListingsCache, refreshAppViewInBackground,
    getCachedHandle, setCachedHandle,
    type PublicListing,
} from '@/lib/mall-cache';

const PDS_TIMEOUT_MS = 5000;

/** How many listings to pull from the index in one query. */
export const FEED_LIMIT = 100;

export async function getHandleFromDID(did: string): Promise<string> {
    try {
        const url = did.startsWith('did:web:')
            ? `https://${did.slice('did:web:'.length)}/.well-known/did.json`
            : `https://plc.directory/${did}`;

        const res = await fetch(url, { signal: AbortSignal.timeout(PDS_TIMEOUT_MS) });
        if (!res.ok) return did;
        const doc = await res.json();
        const aka = doc.alsoKnownAs?.[0];
        return aka?.startsWith('at://') ? aka.slice(5) : did;
    } catch {
        return did;
    }
}

/**
 * Attach author handles to listings that came from the AppView.
 *
 * The index stores DIDs; the UI needs handles for author names and store links.
 * Without this the AppView path silently drops authorHandle, which shows up as
 * missing names and broken store links rather than as an error.
 *
 * One lookup per unique seller, cached for a day, all in parallel.
 */
export async function attachHandles(listings: any[]): Promise<any[]> {
    const dids = Array.from(new Set(listings.map(l => l.authorDid).filter(Boolean)));
    const resolved = new Map<string, string>();

    await Promise.all(
        dids.map(async (did) => {
            const cached = getCachedHandle(did);
            if (cached) {
                resolved.set(did, cached);
                return;
            }
            const handle = await getHandleFromDID(did);
            if (handle && handle !== did) setCachedHandle(did, handle);
            resolved.set(did, handle);
        })
    );

    return listings.map(l => ({ ...l, authorHandle: resolved.get(l.authorDid) ?? l.authorDid }));
}

/** Query the index and shape the result for the UI. Null means it did not answer. */
export async function fetchIndexedListings(timeoutMs?: number): Promise<PublicListing[] | null> {
    const { listings } = await fetchListingsWithDiagnostics({ limit: FEED_LIMIT, timeoutMs });
    if (!listings) return null;
    return attachHandles(toLegacyListings(listings));
}

export type FeedResult = {
    listings: PublicListing[];
    source: 'appview' | 'appview-cached' | 'appview-stale';
    ageMs?: number;
};

/**
 * Cached feed, refreshing behind the response when it goes stale.
 *
 * Returns null if the index is off or did not answer, which callers treat as
 * "fall back" rather than as an error.
 */
export async function getIndexedFeed(timeoutMs?: number): Promise<FeedResult | null> {
    if (!isAppViewEnabled()) return null;

    const entry = getAppViewCacheEntry();
    if (entry) {
        if (entry.needsRefresh) {
            refreshAppViewInBackground(() => fetchIndexedListings());
        }
        return {
            listings: entry.listings,
            source: entry.needsRefresh ? 'appview-stale' : 'appview-cached',
            ageMs: entry.ageMs,
        };
    }

    const listings = await fetchIndexedListings(timeoutMs);
    if (!listings) return null;

    setAppViewListingsCache(listings);
    return { listings, source: 'appview' };
}
