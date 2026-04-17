import { NextRequest, NextResponse } from 'next/server';
import { addToFeedIndex, removeFromFeedIndex, type FeedEntry } from '@/lib/feed-index';
import { createBotAnnouncementPost } from '@/lib/bot-client';

export const dynamic = 'force-dynamic';

type NotifyBody = {
  listingUri: string;
  listingData: {
    title: string;
    price: string;
    category: string;
    location: { state: string; county: string; locality: string; isOnlineStore?: boolean };
    description?: string;
    images?: unknown[];
  };
  // When the user shares the listing themselves, they pass the post URI directly
  postUri?: string;
  source?: 'bot' | 'user';
  // For deletion tombstoning
  action?: 'delete';
};

export async function POST(req: NextRequest) {
  // Verify the internal secret so this endpoint can't be abused externally
  const secret = process.env.FEED_INDEX_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (!auth || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: NotifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { listingUri, listingData, postUri, source, action } = body;

  if (!listingUri) {
    return NextResponse.json({ error: 'listingUri required' }, { status: 400 });
  }

  // Handle listing deletion
  if (action === 'delete') {
    await removeFromFeedIndex(listingUri);
    return NextResponse.json({ success: true });
  }

  if (!listingData) {
    return NextResponse.json({ error: 'listingData required' }, { status: 400 });
  }

  try {
    let resolvedPostUri: string | undefined = postUri;
    let resolvedSource: FeedEntry['source'] = source ?? 'bot';

    if (!resolvedPostUri) {
      // Bot creates the announcement post
      const botUri = await createBotAnnouncementPost(listingData, listingUri);
      resolvedPostUri = botUri ?? undefined;
      resolvedSource = 'bot';
    }

    if (!resolvedPostUri) {
      return NextResponse.json({ error: 'Failed to create bot post' }, { status: 500 });
    }

    // Extract the seller DID from the listing AT URI
    // Format: at://did:.../collection/rkey
    const sellerDid = listingUri.startsWith('at://') ? listingUri.slice(5).split('/')[0] : '';

    const entry: FeedEntry = {
      postUri: resolvedPostUri,
      listingUri,
      sellerDid,
      indexedAt: new Date().toISOString(),
      source: resolvedSource,
    };

    await addToFeedIndex(entry);

    return NextResponse.json({ success: true, postUri: resolvedPostUri });
  } catch (err) {
    console.error('[notify-new-listing] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
