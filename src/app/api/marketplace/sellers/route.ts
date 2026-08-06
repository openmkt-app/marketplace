import { NextResponse } from 'next/server';
import { BskyAgent } from '@atproto/api';
import { getBotAgent } from '@/lib/bot-client';
import { READ_COLLECTIONS } from '@/lib/commerce/collections';
import { getCachedSellers, setSellersCache, getCachedPDS, setCachedPDS } from '@/lib/mall-cache';

export const dynamic = 'force-dynamic';

const PDS_TIMEOUT_MS = 5000;

async function resolvePDS(did: string): Promise<string> {
    const cached = getCachedPDS(did);
    if (cached) return cached;

    try {
        const didDocUrl = did.startsWith('did:web:')
            ? `https://${did.slice('did:web:'.length)}/.well-known/did.json`
            : `https://plc.directory/${did}`;

        const res = await fetch(didDocUrl, { signal: AbortSignal.timeout(PDS_TIMEOUT_MS) });
        if (!res.ok) return 'https://bsky.social';
        const doc = await res.json();
        const svc = doc.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer');
        const endpoint = svc?.serviceEndpoint || 'https://bsky.social';
        setCachedPDS(did, endpoint);
        return endpoint;
    } catch {
        return 'https://bsky.social';
    }
}

async function fetchListingCount(did: string): Promise<number> {
    try {
        const pds = await resolvePDS(did);
        const agent = new BskyAgent({ service: pds });
        let count = 0;

        // Counted across both collections. A seller's listings are split
        // between them for as long as they have old records they never edited.
        for (const collection of READ_COLLECTIONS) {
            try {
                let cursor: string | undefined;
                do {
                    const res = await agent.api.com.atproto.repo.listRecords({
                        repo: did,
                        collection,
                        limit: 100,
                        cursor,
                    });
                    count += res.data.records.length;
                    cursor = res.data.cursor;
                } while (cursor);
            } catch {
                // Caught per collection so one unreadable collection undercounts
                // rather than reporting the seller as having nothing at all.
            }
        }

        return count;
    } catch {
        return 0;
    }
}

export async function GET() {
    try {
        const cached = getCachedSellers();
        if (cached) {
            return NextResponse.json(cached);
        }

        const agent = await getBotAgent();
        const session = agent.session;
        if (!session) {
            return NextResponse.json({ sellers: [], count: 0 }, { status: 200 });
        }

        // Paginate through all follows
        const allFollows: { did: string; handle: string; displayName?: string; avatar?: string }[] = [];
        let cursor: string | undefined;
        do {
            const response = await agent.getFollows({ actor: session.did, limit: 100, cursor });
            allFollows.push(...response.data.follows.map(p => ({
                did: p.did,
                handle: p.handle,
                displayName: p.displayName,
                avatar: p.avatar,
            })));
            cursor = response.data.cursor;
        } while (cursor);

        // Fetch listing counts with higher concurrency
        const CONCURRENCY = 20;
        const counts: number[] = new Array(allFollows.length).fill(0);
        for (let i = 0; i < allFollows.length; i += CONCURRENCY) {
            const batch = allFollows.slice(i, i + CONCURRENCY);
            const results = await Promise.all(batch.map(s => fetchListingCount(s.did)));
            results.forEach((n, j) => { counts[i + j] = n; });
        }

        // Resolve PDS for all sellers (already in cache from fetchListingCount)
        const pdsEndpoints = await Promise.all(allFollows.map(s => resolvePDS(s.did)));

        const payload = {
            sellers: allFollows.map((s, i) => ({
                ...s,
                listingCount: counts[i],
                pds: pdsEndpoints[i],
            })),
            count: allFollows.length,
            timestamp: new Date().toISOString(),
        };

        setSellersCache(payload);

        return NextResponse.json(payload);

    } catch (error) {
        console.error('Error fetching verified sellers:', error);
        return NextResponse.json({ sellers: [], count: 0 }, { status: 200 });
    }
}
