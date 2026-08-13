// src/lib/server/reconcile.ts
//
// Walks Jetstream's archive for listing records and makes our own state agree
// with what is actually on the network.
//
// The site has only ever learned about listings by being told: the seller's
// browser calls /api/feed/notify-new-listing when they publish, and the bot
// follows them when they register. Both are pushes from our own UI, so anything
// that happens outside it never reaches us — a listing published from another
// client, a notify call that failed because the tab closed, a listing deleted
// straight from the seller's PDS. This job is the pull side of that.
//
// Two things come out of a run, and it is worth being precise about why it is
// only two:
//
//   * Deletions are applied. A delete commit for a listing we are serving in
//     the feed means the record is gone and the feed entry should go with it.
//     This is unambiguous and safe to do unattended.
//   * Unknown sellers are queued for review, not acted on. See the note in
//     discovered-sellers.ts.
//
// What a run deliberately cannot do is backfill the feed. The feed index is an
// index of *posts* — getFeedSkeleton serves post URIs, and a FeedEntry without
// one is not a thing the feed generator can return. Replay yields listing
// records, not the announcement posts about them, so a listing that was never
// announced has no post to point at. Manufacturing one would mean the bot
// posting, at backfill scale, to every follower it has. That is a decision for
// a person, so the job surfaces the seller and leaves the posting alone.

import { isDelete, isPut } from '@bsky/jetstream';
import type { CollectionFilter } from '@bsky/jetstream';
import { READ_COLLECTIONS } from '../commerce/collections';
import { findFeedEntry, removeFromFeedIndex } from '../feed-index';
import { getBotAgent } from '../bot-client';
import logger from '../logger';
import { recordDiscoveredSellers } from './discovered-sellers';
import { getJetstream, reconcileCursor } from './jetstream';

export type ReconcileResult = {
  /** Commits read from the archive this run. */
  events: number;
  /** Listing writes seen. */
  puts: number;
  /** Listing deletions seen. */
  deletes: number;
  /** Feed entries removed because their listing is gone. */
  feedEntriesRemoved: number;
  /** Sellers added to the review queue. */
  sellersDiscovered: number;
  /** Where the archive walk got to; null if it read nothing. */
  cursor: number | null;
  /** True when the run hit its budget rather than reaching the sealed tip. */
  truncated: boolean;
  startedAt: string;
  durationMs: number;
};

export type ReconcileOptions = {
  /**
   * Wall-clock budget. Netlify kills a scheduled function well before a full
   * backfill of the network could finish, so the job stops on its own terms
   * and saves its cursor instead of being killed mid-write.
   */
  budgetMs?: number;
  /** Hard ceiling on events per run, independent of the clock. */
  maxEvents?: number;
  /** Ignore the stored cursor and walk from this seq instead. */
  afterSeq?: number;
  signal?: AbortSignal;
};

// Netlify kills a synchronous function at 10s by default, and this route runs
// as one. Stopping at 8s means the job saves its cursor and reports what it did
// rather than being killed mid-run with nothing written down. A manual backfill
// can ask for more, up to whatever the site's function timeout actually allows.
const DEFAULT_BUDGET_MS = 8_000;
const DEFAULT_MAX_EVENTS = 20_000;

/**
 * DIDs we already know about: everyone the bot follows.
 *
 * Read once per run and held for the run's duration. The alternative — asking
 * per event — would put a network round trip inside the hot loop of an archive
 * walk that can cover tens of thousands of records.
 *
 * A failure here is not fatal. An empty set means every seller looks new, which
 * inflates the review queue but corrupts nothing; recordDiscoveredSellers folds
 * duplicates into the existing rows.
 */
async function loadKnownDids(): Promise<Set<string>> {
  try {
    const agent = await getBotAgent();
    const session = agent.session;
    if (!session) return new Set();

    const dids = new Set<string>([session.did]);
    let cursor: string | undefined;
    do {
      const res = await agent.getFollows({ actor: session.did, limit: 100, cursor });
      for (const f of res.data.follows) dids.add(f.did);
      cursor = res.data.cursor;
    } while (cursor);

    return dids;
  } catch (error) {
    logger.warn(`reconcile: could not read the bot's follows, treating every seller as new: ${String(error)}`);
    return new Set();
  }
}

export async function reconcile(opts: ReconcileOptions = {}): Promise<ReconcileResult> {
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const maxEvents = opts.maxEvents ?? DEFAULT_MAX_EVENTS;
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const deadline = start + budgetMs;

  const js = getJetstream();
  const afterSeq = opts.afterSeq ?? (await reconcileCursor.load());
  const knownDids = await loadKnownDids();

  const unknownSellers = new Map<string, { sampleListingUri: string; count: number }>();
  let events = 0;
  let puts = 0;
  let deletes = 0;
  let feedEntriesRemoved = 0;
  let cursor: number | null = null;
  let truncated = false;

  // The archive is walked, not tailed: snapshot() ends at the sealed tip
  // instead of handing over to the live socket. A scheduled job wants a run
  // that finishes, and the push path already covers the seconds after a
  // listing is published, which is the only thing a live tail would add.
  const stream = js.snapshot({
    collections: READ_COLLECTIONS as unknown as CollectionFilter[],
    kinds: ['commit'],
    afterSeq,
    signal: opts.signal,
    onError: (err) => logger.warn(`reconcile: recoverable archive error: ${err.message}`),
  });

  for await (const ev of stream) {
    if (ev.kind !== 'commit') continue;

    events++;
    const uri = `at://${ev.did}/${ev.commit.collection}/${ev.commit.rkey}`;

    if (isPut(ev)) {
      puts++;
      if (!knownDids.has(ev.did)) {
        const entry = unknownSellers.get(ev.did);
        if (entry) entry.count++;
        else unknownSellers.set(ev.did, { sampleListingUri: uri, count: 1 });
      }
    } else if (isDelete(ev)) {
      deletes++;
      // Checked before removing so the count reports feed entries actually
      // dropped, not delete commits seen. Most deletions are for listings the
      // feed never carried.
      if (await findFeedEntry(uri)) {
        await removeFromFeedIndex(uri);
        feedEntriesRemoved++;
        logger.info(`reconcile: dropped ${uri} from the feed, its record is gone`);
      }
    }

    // Only advance past an event once its side effects are done, so a run cut
    // short here resumes at the last fully handled event rather than skipping
    // whatever was in flight.
    cursor = ev.seq;

    if (events >= maxEvents || Date.now() >= deadline) {
      truncated = true;
      break;
    }
  }

  const sellersDiscovered = await recordDiscoveredSellers(unknownSellers);
  if (cursor !== null) await reconcileCursor.save(cursor);

  const result: ReconcileResult = {
    events,
    puts,
    deletes,
    feedEntriesRemoved,
    sellersDiscovered,
    cursor,
    truncated,
    startedAt,
    durationMs: Date.now() - start,
  };

  logger.info(`reconcile: ${JSON.stringify(result)}`);
  return result;
}
