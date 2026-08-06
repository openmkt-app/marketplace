import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_SCOPE } from '@/lib/oauth-scopes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    // client_id at /oauth-client-metadata.json (root) causes Bluesky's authorize
    // screen to display just the domain name ("openmkt.app") instead of the full path.
    const metadata = {
        client_id: `${origin}/oauth-client-metadata.json`,
        client_name: 'Open Market',
        client_uri: origin,
        logo_uri: `${origin}/icon.png`,
        redirect_uris: [
            `${origin}/oauth/callback`
        ],
        scope: OAUTH_SCOPE,
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
