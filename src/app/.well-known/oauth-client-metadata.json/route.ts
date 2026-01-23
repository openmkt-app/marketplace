import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Defaults to auto, but we want to ensure per-request eval

export async function GET(request: NextRequest) {
    // Determine the protocol and host from the request
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    // Dynamically construct the metadata based on the current origin
    const metadata = {
        client_id: `${origin}/.well-known/oauth-client-metadata.json`,
        client_name: 'Open Market',
        client_uri: origin,
        logo_uri: `${origin}/icon.png`,
        redirect_uris: [
            `${origin}/oauth/callback`
        ],
        scope: 'atproto transition:generic transition:chat.bsky',
        grant_types: [
            'authorization_code',
            'refresh_token'
        ],
        response_types: [
            'code'
        ],
        token_endpoint_auth_method: 'none',
        application_type: 'web',
        dpop_bound_access_tokens: true
    };

    return NextResponse.json(metadata);
}
