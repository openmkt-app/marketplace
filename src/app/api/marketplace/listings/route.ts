import { NextResponse } from 'next/server';
import { AtpAgent } from '@atproto/api';
import { fetchListings as fetchListingsFromAppView, isAppViewEnabled } from '@/lib/commerce/appview';
import { READ_COLLECTIONS } from '@/lib/commerce/collections';
import { normalizeListings } from '@/lib/commerce/hydrate';
import { toLegacyListings } from '@/lib/commerce/legacy';
import { getCachedListings, setListingsCache, getCachedSellers, getCachedPDS, setCachedPDS } from '@/lib/mall-cache';
import { getBotAgent } from '@/lib/bot-client';

export const dynamic = 'force-dynamic';

const PDS_TIMEOUT_MS = 5000;

async function resolvePDS(did: string): Promise<string> {
    const cached = getCachedPDS(did);
    if (cached) return cached;

    try {
        const url = did.startsWith('did:web:')
            ? `https://${did.slice('did:web:'.length)}/.well-known/did.json`
            : `https://plc.directory/${did}`;

        const res = await fetch(url, { signal: AbortSignal.timeout(PDS_TIMEOUT_MS) });
        if (!res.ok) return 'https://bsky.social';
        const doc = await res.json();
        const svc = doc.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer');
        const endpoint = svc?.serviceEndpoint ?? 'https://bsky.social';
        setCachedPDS(did, endpoint);
        return endpoint;
    } catch {
        return 'https://bsky.social';
    }
}

async function getHandleFromDID(did: string): Promise<string> {
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

async function fetchListingsForDID(did: string, pdsHint?: string): Promise<any[]> {
    try {
        const pds = pdsHint ?? await resolvePDS(did);
        const agent = new AtpAgent({ service: pds });

        // A seller's listings can live in either collection: v2 for anything
        // created or edited since the migration, v1 for everything they have
        // not touched since. Both are read; neither is authoritative over the
        // other.
        const results = await Promise.all(
            READ_COLLECTIONS.map(collection =>
                agent.api.com.atproto.repo
                    .listRecords({ repo: did, collection, limit: 50 })
                    .catch(() => null)
            )
        );

        const records = results.flatMap(result =>
            result?.success ? result.data.records : []
        );
        if (!records.length) return [];

        const handle = await getHandleFromDID(did);

        // normalizeListings collapses both record shapes into one canonical
        // form; toLegacyListings maps that onto the shape the UI still expects.
        // Nothing downstream needs to know which collection a listing came from.
        return toLegacyListings(
            normalizeListings(
                records.map(record => ({
                    record: record.value as any,
                    uri: record.uri,
                    cid: record.cid,
                    authorDid: did,
                }))
            )
        ).map(listing => ({ ...listing, authorHandle: handle }));
    } catch {
        return [];
    }
}

export async function GET(request: Request) {
    try {
        // ?source=appview|fanout forces one path, so the two can be compared
        // side by side on the same deployment without flipping the flag.
        const forced = new URL(request.url).searchParams.get('source');
        const useAppView = forced === 'appview' || (forced !== 'fanout' && isAppViewEnabled());

        if (useAppView) {
            // One indexed query instead of a fan-out to every seller's PDS.
            // Returns null on any failure, which drops through to fan-out below
            // rather than failing the request — an index that is down must not
            // mean a marketplace that is down.
            const indexed = await fetchListingsFromAppView({ limit: 100 });
            if (indexed) {
                const listings = toLegacyListings(indexed);
                return NextResponse.json({ listings, count: listings.length, source: 'appview' });
            }
        }

        const cached = getCachedListings();
        if (cached) {
            return NextResponse.json({ listings: cached, count: cached.length, source: 'fanout-cached' });
        }

        // Get seller DIDs — prefer the already-warm sellers cache
        const sellersCached = getCachedSellers();
        let sellers: { did: string; pds?: string }[];

        if (sellersCached) {
            sellers = sellersCached.sellers.map(s => ({ did: s.did, pds: (s as any).pds }));
        } else {
            // Fall back to fetching bot follows directly
            const agent = await getBotAgent();
            const session = agent.session;
            if (!session) return NextResponse.json({ listings: [], count: 0 });

            const allFollows: { did: string }[] = [];
            let cursor: string | undefined;
            do {
                const res = await agent.getFollows({ actor: session.did, limit: 100, cursor });
                allFollows.push(...res.data.follows);
                cursor = res.data.cursor;
            } while (cursor);

            sellers = allFollows;
        }

        // Fetch listings from all sellers in parallel (server-side — no CORS)
        const CONCURRENCY = 20;
        const allListings: any[] = [];

        for (let i = 0; i < sellers.length; i += CONCURRENCY) {
            const batch = sellers.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
                batch.map(s => fetchListingsForDID(s.did, s.pds))
            );
            results.forEach(didListings => {
                didListings.forEach(listing => {
                    if (!allListings.some(existing => existing.uri === listing.uri)) {
                        allListings.push(listing);
                    }
                });
            });
        }

        // Sort by newest first
        allListings.sort((a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );

        setListingsCache(allListings);

        return NextResponse.json({ listings: allListings, count: allListings.length, source: 'fanout' });
    } catch (error) {
        console.error('[listings] error:', error);
        return NextResponse.json({ listings: [], count: 0 }, { status: 200 });
    }
}
