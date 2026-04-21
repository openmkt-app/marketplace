import { NextResponse } from 'next/server';
import { AtpAgent } from '@atproto/api';
import { MARKETPLACE_COLLECTION } from '@/lib/constants';
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

        const result = await agent.api.com.atproto.repo.listRecords({
            repo: did,
            collection: MARKETPLACE_COLLECTION,
            limit: 50,
        });

        if (!result.success || !result.data.records.length) return [];

        const handle = await getHandleFromDID(did);

        return result.data.records.map(record => ({
            ...(record.value as any),
            authorDid: did,
            authorHandle: handle,
            uri: record.uri,
            cid: record.cid,
        }));
    } catch {
        return [];
    }
}

export async function GET() {
    try {
        const cached = getCachedListings();
        if (cached) {
            return NextResponse.json({ listings: cached, count: cached.length });
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

        return NextResponse.json({ listings: allListings, count: allListings.length });
    } catch (error) {
        console.error('[listings] error:', error);
        return NextResponse.json({ listings: [], count: 0 }, { status: 200 });
    }
}
