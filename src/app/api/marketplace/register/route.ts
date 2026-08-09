import { NextRequest, NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';
import { invalidateSellersCache } from '@/lib/mall-cache';
import { MAY_BROADCAST } from '@/lib/constants';
import { hasPublishedListing } from '@/lib/server/seller-check';

// Registers a seller by having the @openmkt.app bot follow them — being
// followed is what puts a seller in the mall and marks them verified.
//
// The endpoint takes no authentication: it is called from the seller's own
// browser on login, which holds no secret. It used to follow whatever DID the
// request body named, so anyone could make the bot follow anyone — and since
// the mall is the bot's first ~100 follows, flooding it with junk DIDs pushed
// real sellers out of view. It now follows a DID only if that DID has actually
// published a listing, which its owner could only have done with their own
// token. See hasPublishedListing for why that stands in for authentication.
export async function POST(req: NextRequest) {
    try {
        const { did } = await req.json();

        if (!did || typeof did !== 'string' || !did.startsWith('did:')) {
            return NextResponse.json({ error: 'Missing or invalid DID' }, { status: 400 });
        }

        // Only the live site makes the bot act in public. A development instance
        // following people would spend the real @openmkt.app account's reputation
        // on throwaway test data.
        if (!MAY_BROADCAST) {
            return NextResponse.json({ success: true, followed: false, reason: 'mayNotBroadcast' });
        }

        // The gate that stands in for auth: no listing, no follow.
        if (!(await hasPublishedListing(did))) {
            return NextResponse.json(
                { success: false, followed: false, reason: 'noListing' },
                { status: 403 },
            );
        }

        const agent = await getBotAgent();
        if (!agent.session) {
            return NextResponse.json({ error: 'Bot service unavailable' }, { status: 503 });
        }

        // Already following — the seller is registered, nothing to do.
        const profile = await agent.getProfile({ actor: did });
        if (profile.data.viewer?.following) {
            return NextResponse.json({ success: true, followed: true, message: 'Already verified' });
        }

        await agent.follow(did);
        invalidateSellersCache();

        return NextResponse.json({
            success: true,
            followed: true,
            message: 'Registered — the verified bot is now following you.',
        });
    } catch (error) {
        console.error('Error registering seller:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
