import { NextRequest, NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';
import { BskyAgent } from '@atproto/api';

// The admin handle to receive reports
const ADMIN_HANDLE = 'openmkt.app';

export async function POST(req: NextRequest) {
    try {
        const { listingUri, reason, description, reporterDid } = await req.json();

        if (!listingUri || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Initialize Bot Agent
        let agent: BskyAgent;
        try {
            agent = await getBotAgent();
        } catch (e) {
            console.error('Failed to initialize bot:', e);
            return NextResponse.json(
                { error: 'Service temporarily unavailable' },
                { status: 503 }
            );
        }

        // Resolve Admin DID
        let adminDid;
        try {
            const response = await agent.resolveHandle({ handle: ADMIN_HANDLE });
            adminDid = response.data.did;
        } catch (e) {
            console.error('Failed to resolve admin handle:', e);
            return NextResponse.json(
                { error: 'Configuration error: Admin not found' },
                { status: 500 }
            );
        }

        // Resolve Reporter Handle (optional)
        let reporterHandle = 'Anonymous';
        if (reporterDid) {
            try {
                // Try to find the handle, simplified
                reporterHandle = reporterDid;
            } catch { }
        }

        // Compose the report message
        const message = `🚨 REPORT RECEIVED 🚨

Reason: ${reason}
Listing: ${listingUri}
Reporter: ${reporterHandle}

Description:
${description ? description : 'No description provided.'}

[Action Required] Check this listing.`;

        // Send DM using the Chat API logic
        try {
            const { data: { did: botDid } } = await agent.getProfile({ actor: agent.session!.did });
            const accessJwt = agent.session!.accessJwt;

            // 1. Get Convo
            const convoUrl = new URL('https://api.bsky.chat/xrpc/chat.bsky.convo.getConvoForMembers');
            convoUrl.searchParams.append('members', adminDid);
            convoUrl.searchParams.append('members', botDid); // Convo between Bot and Admin

            const getConvoRes = await fetch(convoUrl.toString(), {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessJwt}` }
            });

            if (!getConvoRes.ok) {
                console.error('Failed to get convo:', await getConvoRes.text());
                throw new Error('Failed to establish chat with admin');
            }

            const convoData = await getConvoRes.json();
            const convoId = convoData.convo.id;

            // 2. Send Message
            const sendRes = await fetch('https://api.bsky.chat/xrpc/chat.bsky.convo.sendMessage', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessJwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    convoId: convoId,
                    message: {
                        text: message
                    }
                })
            });

            if (!sendRes.ok) {
                console.error('Failed to send DM:', await sendRes.text());
                throw new Error('Failed to send report message');
            }

        } catch (e) {
            console.error('Chat error:', e);
            return NextResponse.json({ error: 'Failed to notify admin via Chat' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing report:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
