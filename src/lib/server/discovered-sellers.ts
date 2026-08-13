// src/lib/server/discovered-sellers.ts
//
// Sellers the reconcile job found on the network that we did not already know
// about.
//
// Every other route to a seller runs through the bot's follow list: a seller
// registers on the site, /api/marketplace/register checks their repo really
// holds a listing, the bot follows them, and /api/marketplace/sellers reads the
// follows back. That means anyone who publishes a listing to the network
// without ever visiting our site is invisible to us — not just missing from the
// feed, but absent from the mall entirely.
//
// Replay finds them. What it deliberately does not do is act on them. Following
// is the bot's identity being spent, and auto-following whatever a scheduled
// job scraped off the firehose is the same class of mistake as the endpoints
// hardened in PR #7: a privileged action driven by unreviewed input. So this
// records a queue for a human to look at, and stops there.

import { readJson, writeJson } from './blob-json';

const STORE = 'feed-index';
const KEY = 'discovered-sellers';

export type DiscoveredSeller = {
  did: string;
  /** The first listing of theirs we saw, so a reviewer can go and look at it. */
  sampleListingUri: string;
  /** How many listing writes we have seen from this DID. */
  listingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Set once someone has looked; a reviewed DID stops being offered up again. */
  reviewed?: boolean;
};

type Registry = { sellers: DiscoveredSeller[]; updatedAt: string };

const EMPTY: Registry = { sellers: [], updatedAt: new Date(0).toISOString() };

export async function getDiscoveredSellers(): Promise<DiscoveredSeller[]> {
  const reg = await readJson<Registry>(STORE, KEY, EMPTY);
  return reg.sellers;
}

/**
 * Fold a run's sightings into the registry.
 *
 * Takes the whole batch rather than one DID at a time because the store is a
 * single JSON blob: a per-DID call would read and rewrite the entire registry
 * once per seller, and two of those interleaving would lose writes.
 */
export async function recordDiscoveredSellers(
  seen: Map<string, { sampleListingUri: string; count: number }>
): Promise<number> {
  if (seen.size === 0) return 0;

  const reg = await readJson<Registry>(STORE, KEY, EMPTY);
  const byDid = new Map(reg.sellers.map((s) => [s.did, s]));
  const now = new Date().toISOString();
  let added = 0;

  // forEach rather than for..of: the project compiles to es5, where iterating a
  // Map directly needs downlevelIteration.
  seen.forEach(({ sampleListingUri, count }, did) => {
    const existing = byDid.get(did);
    if (existing) {
      existing.listingCount += count;
      existing.lastSeenAt = now;
    } else {
      byDid.set(did, {
        did,
        sampleListingUri,
        listingCount: count,
        firstSeenAt: now,
        lastSeenAt: now,
      });
      added++;
    }
  });

  const sellers: DiscoveredSeller[] = [];
  byDid.forEach((s) => sellers.push(s));

  await writeJson(STORE, KEY, { sellers, updatedAt: now } satisfies Registry);

  return added;
}
