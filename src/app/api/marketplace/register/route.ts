import { NextRequest, NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';

export async function POST(req: NextRequest) {
    try {
        const { did } = await req.json();

        if (!did) {
            return NextResponse.json(
                { error: 'Missing DID' },
                { status: 400 }
            );
        }

        const agent = await getBotAgent();

        // Check if already following to avoid errors? 
        // Agent 'follow' usually handles strictness or we can check first.
        // For simplicity, we just try to follow. if it fails because already following, that's fine?
        // Actually, 'follow' creates a record. If one exists, we might duplicate? 
        // Most robust way: Check first.

        const session = agent.session;
        if (!session) {
            return NextResponse.json({ error: 'Bot service unavailable' }, { status: 503 });
        }

        // Check if already following
        // We can use getProfile on the target, as the bot
        const profile = await agent.getProfile({ actor: did });
        const isFollowing = !!profile.data.viewer?.following;

        if (isFollowing) {
            return NextResponse.json({
                success: true,
                message: 'Already verified'
            });
        }

        // Create Follow
        await agent.follow(did);

        return NextResponse.json({
            success: true,
            message: 'Successfully registered! The verified bot is now following you.'
        });

    } catch (error) {
        console.error('Error registering seller:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
