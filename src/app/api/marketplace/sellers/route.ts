import { NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';
import { BskyAgent } from '@atproto/api';
import { MARKETPLACE_COLLECTION } from '@/lib/constants';

export const dynamic = 'force-dynamic';

async function resolvePDS(did: string): Promise<string> {
    try {
        let didDocUrl: string;
        if (did.startsWith('did:web:')) {
            const domain = did.slice('did:web:'.length);
            didDocUrl = `https://${domain}/.well-known/did.json`;
        } else {
            didDocUrl = `https://plc.directory/${did}`;
        }
        const res = await fetch(didDocUrl);
        if (!res.ok) return 'https://bsky.social';
        const doc = await res.json();
        const svc = doc.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer');
        return svc?.serviceEndpoint || 'https://bsky.social';
    } catch {
        return 'https://bsky.social';
    }
}

async function fetchListingCount(did: string): Promise<number> {
    try {
        const pds = await resolvePDS(did);
        const agent = new BskyAgent({ service: pds });
        let count = 0;
        let cursor: string | undefined;
        do {
            const res = await agent.api.com.atproto.repo.listRecords({
                repo: did,
                collection: MARKETPLACE_COLLECTION,
                limit: 100,
                cursor,
            });
            count += res.data.records.length;
            cursor = res.data.cursor;
        } while (cursor);
        return count;
    } catch {
        return 0;
    }
}

export async function GET() {
    try {
        const agent = await getBotAgent();
        const session = agent.session;
        if (!session) {
            return NextResponse.json({ error: 'Bot service unavailable' }, { status: 503 });
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

        // Fetch listing counts in parallel
        const listingCounts = await Promise.all(allFollows.map(s => fetchListingCount(s.did)));

        const sellers = allFollows.map((s, i) => ({
            ...s,
            listingCount: listingCounts[i],
        }));

        return NextResponse.json({
            sellers,
            count: sellers.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching verified sellers:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
