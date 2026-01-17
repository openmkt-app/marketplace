import { NextRequest, NextResponse } from 'next/server';
import { saveChatSession } from '@/lib/chat-session-store';

type ChatSessionRequest = {
  handle?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatSessionRequest;
    const handle = body.handle?.trim();
    const password = body.password?.trim();

    if (!handle || !password) {
      return NextResponse.json({ error: 'Missing handle or password' }, { status: 400 });
    }

    const sessionResp = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password }),
    });

    const sessionText = await sessionResp.text();
    if (!sessionResp.ok) {
      return NextResponse.json(
        { error: `Session error: ${sessionResp.status}`, details: sessionText },
        { status: sessionResp.status }
      );
    }

    const sessionData = JSON.parse(sessionText) as {
      accessJwt: string;
      refreshJwt?: string;
      did: string;
      handle: string;
      didDoc?: { service?: Array<{ id?: string; type?: string; serviceEndpoint?: string }> };
    };

    let pdsEndpoint = 'https://bsky.social';
    const services = sessionData.didDoc?.service ?? [];
    const pdsService = services.find(
      (service) => service.id === '#atproto_pds' || service.type === 'AtprotoPersonalDataServer'
    );
    if (pdsService?.serviceEndpoint) {
      pdsEndpoint = pdsService.serviceEndpoint;
    }

    saveChatSession({
      did: sessionData.did,
      handle: sessionData.handle,
      pdsEndpoint,
      accessJwt: sessionData.accessJwt,
      refreshJwt: sessionData.refreshJwt,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ did: sessionData.did, pdsEndpoint });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal chat session error', details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
