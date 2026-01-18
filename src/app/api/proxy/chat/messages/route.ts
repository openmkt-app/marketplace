import { NextRequest, NextResponse } from 'next/server';
import { getChatSession, updateChatSession } from '@/lib/chat-session-store';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pdsEndpoint = searchParams.get('pdsEndpoint');
    const convoId = searchParams.get('convoId');
    const limitParam = searchParams.get('limit');

    if (!pdsEndpoint || !convoId) {
      return NextResponse.json({ error: 'Missing pdsEndpoint or convoId parameter' }, { status: 400 });
    }

    const limit = Math.max(1, Math.min(50, Number(limitParam) || 50));
    const cleanEndpoint = pdsEndpoint.replace(/\/$/, '');
    const sessionUrl = `${cleanEndpoint}/xrpc/com.atproto.server.getSession`;

    let did: string | null = null;
    try {
      const sessionResp = await fetch(sessionUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });
      if (sessionResp.ok) {
        const sessionData = await sessionResp.json();
        did = sessionData.did;
      }
    } catch {
      // Best-effort lookup only
    }

    let tokenToUse = authHeader;
    if (did) {
      const stored = getChatSession(did);
      if (stored?.accessJwt) {
        tokenToUse = `Bearer ${stored.accessJwt}`;
      }
    }

    const upstreamUrl = `${cleanEndpoint}/xrpc/chat.bsky.convo.getMessages?convoId=${encodeURIComponent(convoId)}&limit=${limit}`;

    const runChatFetch = async (authorization: string) => {
      return fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          Authorization: authorization,
          'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat',
        },
      });
    };

    let response = await runChatFetch(tokenToUse);

    if (!response.ok && did) {
      const stored = getChatSession(did);
      if (stored?.refreshJwt) {
        const refreshResp = await fetch(`${cleanEndpoint}/xrpc/com.atproto.server.refreshSession`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stored.refreshJwt}`,
          },
        });

        if (refreshResp.ok) {
          const refreshed = await refreshResp.json();
          if (refreshed.accessJwt) {
            updateChatSession(did, { accessJwt: refreshed.accessJwt, refreshJwt: refreshed.refreshJwt });
            response = await runChatFetch(`Bearer ${refreshed.accessJwt}`);
          }
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Proxy] Chat messages failed: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: `Upstream error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Proxy] Messages failed:', error);
    return NextResponse.json(
      { error: 'Internal proxy error', details: error.message },
      { status: 500 }
    );
  }
}
