import { NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';

export const dynamic = 'force-dynamic'; // No caching for now to ensure freshness
// export const revalidate = 0; // Disable caching

export async function GET() {
    try {
        const agent = await getBotAgent();

        // Get the bot's own DID to query its follows
        // We can cache this DID if needed, but for now we'll fetch it or assume verified from handle
        const session = agent.session;
        if (!session) {
            return NextResponse.json({ error: 'Bot service unavailable' }, { status: 503 });
        }

        // Fetch who the bot is following
        // Limit to 100 for now, pagination can be added later
        const response = await agent.getFollows({ actor: session.did, limit: 100 });

        // Extract DIDs
        const sellers = response.data.follows.map(profile => ({
            did: profile.did,
            handle: profile.handle,
            displayName: profile.displayName,
            avatar: profile.avatar,
        }));

        return NextResponse.json({
            sellers,
            count: sellers.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching verified sellers:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
