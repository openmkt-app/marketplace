import { NextRequest, NextResponse } from 'next/server';
import { saveChatSession } from '@/lib/chat-session-store';

type ChatSessionRequest = {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt?: string;
  pdsEndpoint?: string;
};

/**
 * Initialize a chat session using already-authenticated JWT tokens.
 * This endpoint does NOT accept passwords - authentication happens
 * client-side directly with the AT Protocol, and only the resulting
 * JWT tokens are passed here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatSessionRequest;

    const { did, handle, accessJwt, refreshJwt, pdsEndpoint } = body;

    if (!did || !handle || !accessJwt) {
      return NextResponse.json(
        { error: 'Missing required fields: did, handle, accessJwt' },
        { status: 400 }
      );
    }

    // Use provided PDS endpoint or default to bsky.social
    const resolvedPdsEndpoint = pdsEndpoint || 'https://bsky.social';

    saveChatSession({
      did,
      handle,
      pdsEndpoint: resolvedPdsEndpoint,
      accessJwt,
      refreshJwt,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ did, pdsEndpoint: resolvedPdsEndpoint });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal chat session error', details: message },
      { status: 500 }
    );
  }
}
