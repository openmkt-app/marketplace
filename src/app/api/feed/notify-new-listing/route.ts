import { NextRequest, NextResponse } from 'next/server';
import { addToFeedIndex, findFeedEntry, removeFromFeedIndex, type FeedEntry } from '@/lib/feed-index';
import { createBotAnnouncementPost } from '@/lib/bot-client';
import { invalidateSellersCache, invalidateListingsCache, invalidateAppViewListingsCache } from '@/lib/mall-cache';
import { MAY_BROADCAST } from '@/lib/constants';
import { fetchListingById } from '@/lib/server/fetch-listing';
import {
  isFreshEnoughToAnnounce,
  postBelongsToSeller,
  sellerDidFromListingUri,
} from '@/lib/notify-guards';

export const dynamic = 'force-dynamic';

/**
 * What a caller may send.
 *
 * Deliberately thin. It used to carry the listing's title, price, category and
 * location, and the bot read them out to its followers — from an endpoint with
 * no authentication, which made "post this text as @openmkt.app" a request
 * anyone could make. Every one of those fields now comes from the signed record
 * instead, so the body says which listing and nothing about it.
 */
type NotifyBody = {
  listingUri: string;
  // When the user shares the listing themselves, they pass the post URI directly
  postUri?: string;
  source?: 'bot' | 'user';
  // For deletion tombstoning
  action?: 'delete';
};

export async function POST(req: NextRequest) {
  // An optional shared secret for server-to-server callers. It is not the
  // protection this endpoint relies on and never was: the ordinary caller is
  // the seller's own browser, which cannot hold a secret, so the variable is
  // unset in production and this block does nothing there. What actually
  // guards the endpoint is that every claim below is checked against the
  // seller's own record.
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

  const { listingUri, postUri, source, action } = body;

  if (!listingUri) {
    return NextResponse.json({ error: 'listingUri required' }, { status: 400 });
  }

  // Everything below this point is a broadcast: a post from @openmkt.app and an
  // entry in the public feed. Only the live site gets to do either — a deploy
  // preview announcing a listing reaches the same real followers the production
  // site does. Local caches are still cleared, because those only affect the
  // page in front of the developer.
  if (!MAY_BROADCAST) {
    invalidateAppViewListingsCache();
    return NextResponse.json({ success: true, announced: false, reason: 'mayNotBroadcast' });
  }

  // The seller DID the listing URI claims. Every check below is measured
  // against the record itself, so a caller cannot talk this endpoint into
  // acting on a repo it does not own.
  const sellerDid = sellerDidFromListingUri(listingUri);
  if (!sellerDid) {
    return NextResponse.json({ error: 'listingUri is not an AT URI' }, { status: 400 });
  }

  // Deleting is only allowed once the record is genuinely gone. Taking the
  // caller's word for it let anyone empty the public feed one listing at a
  // time, which needs nothing but a URI that is already public.
  if (action === 'delete') {
    const stillThere = await fetchListingById(listingUri);
    if (stillThere !== 'removed' && stillThere !== null) {
      return NextResponse.json(
        { error: 'That listing still exists', tombstoned: false },
        { status: 400 },
      );
    }

    await removeFromFeedIndex(listingUri);
    invalidateAppViewListingsCache();
    return NextResponse.json({ success: true, tombstoned: true });
  }

  // Read the record before anything is broadcast. This is the request's only
  // claim that gets verified, and everything downstream is derived from it
  // rather than from the body.
  const listing = await fetchListingById(listingUri);
  if (!listing || listing === 'removed') {
    return NextResponse.json({ error: 'No such listing' }, { status: 400 });
  }

  // A listing the seller wants kept from their followers must not be announced
  // by the bot or put in the public Open Market feed. Both are broadcasts, and
  // broadcasting it is the one thing the flag exists to prevent — the bot
  // follows every seller, so its post reaches precisely the wrong audience.
  //
  // Read off the record, not the request. The flag protects the seller, so the
  // seller's own repo is the only place worth reading it from.
  if ((listing as { hideFromFriends?: boolean }).hideFromFriends) {
    invalidateAppViewListingsCache();
    return NextResponse.json({ success: true, announced: false, reason: 'hideFromFriends' });
  }

  // A seller's own share is indexed instead of a bot post, but only if the post
  // is really theirs. Otherwise this request is a way to put any post on the
  // network into the Open Market feed.
  if (postUri && !postBelongsToSeller(postUri, sellerDid)) {
    return NextResponse.json({ error: 'That post does not belong to the seller' }, { status: 400 });
  }

  // The two checks below apply only when the bot would be the one posting.
  //
  // A seller's own share is a different proposition: the post already exists,
  // they made it, and indexing it costs no new broadcast — it replaces the
  // bot's entry rather than adding one. Applying the same checks here would
  // break that upgrade, because by the time a seller shares, the bot's entry is
  // already in the index and would read as a replay of it.
  if (!postUri) {
    // Announce once. The endpoint has no authentication — the caller is the
    // seller's browser, which has no secret to hold — so replaying a single
    // legitimate request is otherwise enough to post the same listing to the
    // same followers over and over.
    if (await findFeedEntry(listingUri)) {
      return NextResponse.json({ success: true, announced: false, reason: 'alreadyIndexed' });
    }

    // And announce only what is new. Every listing URI on the site is public,
    // so without this any of them could be replayed back through here months
    // later.
    if (!isFreshEnoughToAnnounce((listing as { createdAt?: string }).createdAt)) {
      return NextResponse.json({ success: true, announced: false, reason: 'tooOld' });
    }
  }

  try {
    let resolvedPostUri: string | undefined = postUri;
    let resolvedSource: FeedEntry['source'] = source ?? 'bot';

    if (!resolvedPostUri) {
      // Bot creates the announcement post
      const botUri = await createBotAnnouncementPost(listingUri);
      resolvedPostUri = botUri ?? undefined;
      resolvedSource = 'bot';
    }

    if (!resolvedPostUri) {
      return NextResponse.json({ error: 'Failed to create bot post' }, { status: 500 });
    }

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
