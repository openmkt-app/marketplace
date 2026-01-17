import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const pdsEndpoint = searchParams.get('pdsEndpoint');

        if (!pdsEndpoint) {
            return NextResponse.json({ error: 'Missing pdsEndpoint parameter' }, { status: 400 });
        }

        // Construct the PDS URL - ensure no trailing slash
        const cleanEndpoint = pdsEndpoint.replace(/\/$/, '');
        const upstreamUrl = `${cleanEndpoint}/xrpc/chat.bsky.convo.listConvos?limit=50`;

        // Perform the server-to-server request (mimicking the Python script)
        const response = await fetch(upstreamUrl, {
            method: 'GET',
            headers: {
                // Forward the Bearer token
                'Authorization': authHeader,
                // Critical proxy header
                'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat',
                // Ensure no cookies or browser artifacts are sent (default in node-fetch/Next server)
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[Proxy] Chat API failed: ${response.status} ${errorText}`);
            return NextResponse.json(
                { error: `Upstream error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[Proxy] Check failed:', error);
        return NextResponse.json(
            { error: 'Internal proxy error', details: error.message },
            { status: 500 }
        );
    }
}
