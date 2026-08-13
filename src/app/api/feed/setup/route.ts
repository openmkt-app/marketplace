import { NextRequest, NextResponse } from 'next/server';
import { getBotAgent } from '@/lib/bot-client';
import { requireAdmin } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

// The DID whose DID document (at https://openmkt.app/.well-known/did.json)
// declares the #atproto_feed_generator service.
const FEED_GENERATOR_DID = 'did:web:openmkt.app';

const FEED_DEFINITION = {
  rkey: 'all',
  displayName: 'Open Market',
  description: 'New marketplace listings from sellers on openmkt.app — surfaced directly in your Bluesky timeline.',
};

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const agent = await getBotAgent();

    // Delete first so the indexer sees a fresh "create" event,
    // which forces re-resolution of the did:web DID document.
    try {
      await agent.api.com.atproto.repo.deleteRecord({
        repo: agent.session!.did,
        collection: 'app.bsky.feed.generator',
        rkey: FEED_DEFINITION.rkey,
      });
    } catch {
      // Record may not exist yet — that's fine
    }

    const record = {
      $type: 'app.bsky.feed.generator',
      did: FEED_GENERATOR_DID,
      displayName: FEED_DEFINITION.displayName,
      description: FEED_DEFINITION.description,
      createdAt: new Date().toISOString(),
    };

    await agent.api.com.atproto.repo.putRecord({
      repo: agent.session!.did,
      collection: 'app.bsky.feed.generator',
      rkey: FEED_DEFINITION.rkey,
      record,
    });

    const feedUri = `at://${agent.session!.did}/app.bsky.feed.generator/${FEED_DEFINITION.rkey}`;
    const bskyUrl = `https://bsky.app/profile/${agent.session!.handle}/feed/${FEED_DEFINITION.rkey}`;

    return NextResponse.json({
      success: true,
      feedUri,
      bskyUrl,
      message: `Feed registered. Users can subscribe at: ${bskyUrl}`,
    });
  } catch (err) {
    console.error('[feed/setup] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
