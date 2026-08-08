import { NextRequest, NextResponse } from 'next/server';
import { addToFeedIndex, removeFromFeedIndex, type FeedEntry } from '@/lib/feed-index';
import { createBotAnnouncementPost } from '@/lib/bot-client';
import { invalidateSellersCache, invalidateListingsCache, invalidateAppViewListingsCache } from '@/lib/mall-cache';
import { IS_PRODUCTION } from '@/lib/constants';

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
    hideFromFriends?: boolean;
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

  // Everything below this point is a broadcast: a post from @openmkt.app and an
  // entry in the public feed. A development instance writes its listings to a
  // collection nobody reads, so announcing them means telling real followers
  // about a listing they cannot open. Local caches are still cleared, because
  // those only affect the page in front of the developer.
  if (!IS_PRODUCTION) {
    invalidateAppViewListingsCache();
    return NextResponse.json({ success: true, announced: false, reason: 'notProduction' });
  }

  // Handle listing deletion
  if (action === 'delete') {
    await removeFromFeedIndex(listingUri);
    invalidateAppViewListingsCache();
    return NextResponse.json({ success: true });
  }

  if (!listingData) {
    return NextResponse.json({ error: 'listingData required' }, { status: 400 });
  }

  // A listing the seller wants kept from their followers must not be announced
  // by the bot or put in the public Open Market feed. Both are broadcasts, and
  // broadcasting it is the one thing the flag exists to prevent — the bot
  // follows every seller, so its post reaches precisely the wrong audience.
  if (listingData.hideFromFriends) {
    invalidateAppViewListingsCache();
    return NextResponse.json({ success: true, announced: false, reason: 'hideFromFriends' });
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
    invalidateSellersCache();
    invalidateListingsCache();
    // Browse reads the AppView cache, not the fan-out caches above. Leaving it
    // alone is why a deleted listing kept showing for up to a minute: the two
    // invalidations here cleared caches that browse never consults.
    invalidateAppViewListingsCache();

    return NextResponse.json({ success: true, postUri: resolvedPostUri });
  } catch (err) {
    console.error('[notify-new-listing] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
