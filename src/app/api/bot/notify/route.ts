import { NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';
import { BskyAgent } from '@atproto/api';
import { checkRateLimit } from '@/lib/rate-limiter';

// Helper to get direct chat service agent
async function getChatAgent(mainAgent: BskyAgent) {
    // 1. Get Service Auth Token
    const serviceAuth = await mainAgent.api.com.atproto.server.getServiceAuth({
        aud: 'did:web:api.bsky.chat',
        lxm: 'chat.bsky.convo.sendMessage', // We'll need create convo too, but usually sendMessage scope covers it or we request both
    });

    if (!serviceAuth.success) throw new Error('Failed to get service auth for chat');

    // For robust operations, we might need separate tokens like in the frontend
    // But let's try with a fresh agent for the chat service
    const chatAgent = new BskyAgent({
        service: 'https://api.bsky.chat'
    });

    // We need distinct tokens for different operations usually, let's get a second one for getConvo
    const convoAuth = await mainAgent.api.com.atproto.server.getServiceAuth({
        aud: 'did:web:api.bsky.chat',
        lxm: 'chat.bsky.convo.getConvoForMembers',
    });

    return { chatAgent, messageToken: serviceAuth.data.token, convoToken: convoAuth.data.token ? convoAuth.data.token : serviceAuth.data.token };
}

export async function POST(request: Request) {
    try {
        const { sellerDid, listingTitle, listingPath, buyerHandle, buyerDid } = await request.json();

        if (!sellerDid || !listingTitle || !buyerHandle || !buyerDid) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check rate limit for the buyer
        const rateLimitResult = checkRateLimit(buyerDid);
        if (rateLimitResult.isLimited) {
            return NextResponse.json({
                error: 'Rate limit exceeded',
                message: rateLimitResult.message,
                remainingRequests: 0,
                resetInMinutes: rateLimitResult.resetInMinutes
            }, { status: 429 });
        }

        // 1. Login Bot
        const botAgent = await getBotAgent();

        // 2. Prepare Message
        const message = `Someone is interested in your "${listingTitle}" 👋

Hi! @${buyerHandle} saw your listing and is interested in buying it!

Since you don't follow each other yet, they are unable to message you first. You will need to start the conversation.

To connect:
• Go to their profile: https://bsky.app/profile/${buyerHandle}
• Send them a message (or follow back) to arrange the details.

📦 View Listing: ${listingPath}`;

        // 3. Send Message via Chat Service
        // We reuse the logic found to be stable: Direct Connection + Service Auth
        const { chatAgent, messageToken, convoToken } = await getChatAgent(botAgent);

        // Get/Create Conversation
        const convoResponse = await chatAgent.api.chat.bsky.convo.getConvoForMembers(
            { members: [sellerDid] },
            { headers: { Authorization: `Bearer ${convoToken}` } }
        );

        if (!convoResponse.success) {
            console.error('Bot failed to get convo:', convoResponse);
            return NextResponse.json({ error: 'Failed to connect to seller chat' }, { status: 500 });
        }

        const convoId = convoResponse.data.convo.id;

        // Send Message
        const sendResponse = await chatAgent.api.chat.bsky.convo.sendMessage(
            {
                convoId: convoId,
                message: { text: message }
            },
            { headers: { Authorization: `Bearer ${messageToken}` }, encoding: 'application/json' }
        );

        if (!sendResponse.success) {
            // If this fails, it might be that the seller blocked the bot or keeps STRICTEST settings
            console.error('Bot failed to send message:', sendResponse);
            return NextResponse.json({ error: 'Failed to send message to seller' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            remainingRequests: rateLimitResult.remainingRequests,
            resetInMinutes: rateLimitResult.resetInMinutes
        });

    } catch (error) {
        console.error('Error in bot notify API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
