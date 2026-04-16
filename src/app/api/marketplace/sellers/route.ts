import { NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
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

        return NextResponse.json({
            sellers: allFollows,
            count: allFollows.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching verified sellers:', error);
        // Return empty list instead of 500 so the client degrades gracefully
        return NextResponse.json({ sellers: [], count: 0 }, { status: 200 });
    }
}
