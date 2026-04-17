import { NextRequest, NextResponse } from 'next/server';
import { BskyAgent } from '@atproto/api';
import { addToFeedIndex, removeFromFeedIndex, type FeedEntry } from '@/lib/feed-index';
import { ADMIN_HANDLE } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

// Parse a Bluesky post URL or AT URI into a post AT URI.
// Accepts:
//   https://bsky.app/profile/<handle-or-did>/post/<rkey>
//   at://<did>/app.bsky.feed.post/<rkey>
async function resolveToAtUri(input: string): Promise<string> {
  const trimmed = input.trim();

  // Already an AT URI
  if (trimmed.startsWith('at://')) {
    // If it has a handle instead of DID, resolve it
    const parts = trimmed.slice(5).split('/');
    const authority = parts[0];
    if (authority.startsWith('did:')) return trimmed;
    // Resolve handle → DID
    const did = await resolveHandle(authority);
    return `at://${did}/${parts.slice(1).join('/')}`;
  }

  // Bluesky web URL
  const match = trimmed.match(
    /^https?:\/\/bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/
  );
  if (!match) {
    throw new Error(
      'Unrecognized format. Use a bsky.app URL or an at:// URI.'
    );
  }

  const [, handleOrDid, rkey] = match;
  const did = handleOrDid.startsWith('did:')
    ? handleOrDid
    : await resolveHandle(handleOrDid);

  return `at://${did}/app.bsky.feed.post/${rkey}`;
}

async function resolveHandle(handle: string): Promise<string> {
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
  );
  if (!res.ok) throw new Error(`Could not resolve handle: ${handle}`);
  const data = await res.json();
  if (!data.did) throw new Error(`No DID returned for handle: ${handle}`);
  return data.did as string;
}

// Verify the AT URI points to a real app.bsky.feed.post record
async function verifyPostExists(atUri: string): Promise<void> {
  const parts = atUri.slice(5).split('/');
  const [repo, collection, rkey] = parts;
  if (collection !== 'app.bsky.feed.post') {
    throw new Error(`Expected app.bsky.feed.post, got ${collection}`);
  }
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(repo)}&collection=app.bsky.feed.post&rkey=${encodeURIComponent(rkey)}`
  );
  if (!res.ok) throw new Error(`Post not found: ${atUri}`);
}

export async function POST(req: NextRequest) {
  let body: { handle?: string; postUrl?: string; note?: string; action?: 'remove' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.handle !== ADMIN_HANDLE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!body.postUrl) {
    return NextResponse.json({ error: 'postUrl required' }, { status: 400 });
  }

  try {
    const postUri = await resolveToAtUri(body.postUrl);

    if (body.action === 'remove') {
      // Remove by postUri — scan the index for a matching postUri
      // We store listingUri as the key, but for curated posts we set listingUri = postUri
      await removeFromFeedIndex(postUri);
      return NextResponse.json({ success: true, removed: postUri });
    }

    await verifyPostExists(postUri);

    const entry: FeedEntry = {
      postUri,
      listingUri: postUri, // curated posts use postUri as their own identifier
      sellerDid: postUri.slice(5).split('/')[0],
      indexedAt: new Date().toISOString(),
      source: 'curated',
      note: body.note,
    };

    await addToFeedIndex(entry);

    return NextResponse.json({ success: true, postUri });
  } catch (err) {
    console.error('[feed/push-post] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
