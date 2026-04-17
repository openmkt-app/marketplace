import { NextRequest, NextResponse } from 'next/server';
import { getFeedPage } from '@/lib/feed-index';

export const dynamic = 'force-dynamic';

const FEED_GENERATOR_DID = 'did:web:openmkt.app';
const KNOWN_FEEDS = new Set(['all']);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const feed = searchParams.get('feed');
  if (!feed) {
    return NextResponse.json({ error: 'Missing feed parameter' }, { status: 400 });
  }

  // Parse the AT URI: at://<did>/app.bsky.feed.generator/<rkey>
  let rkey: string;
  try {
    const url = new URL(feed.replace('at://', 'https://'));
    const parts = url.pathname.split('/').filter(Boolean);
    // parts: ['app.bsky.feed.generator', '<rkey>']
    rkey = parts[parts.length - 1];
  } catch {
    return NextResponse.json({ error: 'Invalid feed URI' }, { status: 400 });
  }

  if (!KNOWN_FEEDS.has(rkey)) {
    return NextResponse.json({ error: 'Unknown feed' }, { status: 404 });
  }

  const cursor = searchParams.get('cursor') ?? undefined;
  const limitParam = parseInt(searchParams.get('limit') ?? '30', 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 30 : limitParam), 100);

  try {
    const { entries, nextCursor } = await getFeedPage(cursor, limit);

    const feedItems = entries.map((e) => ({ post: e.postUri }));

    return NextResponse.json(
      { feed: feedItems, ...(nextCursor ? { cursor: nextCursor } : {}) },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('[feed skeleton] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Bluesky AppView sometimes sends OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
