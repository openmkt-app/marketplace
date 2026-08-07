// "Hide from friends": keep a seller's flagged listings out of Open Market for
// people who follow that seller.
//
// What this is not: privacy. The record stays public on the seller's PDS and
// any other AT Protocol client can read it. This filter only governs what Open
// Market itself shows, which is what the UI copy now says.
//
// Direction matters. The promise is "people who follow you", so the test is
// whether the *viewer* follows the *seller* — app.bsky.graph.getRelationships
// reports that as `following` on the relationship for each seller DID.
//
// Deliberately plain fetch rather than the AT Protocol SDK: browse loads this,
// and the SDK was moved off the critical path on purpose.

// .ts extension, matching src/lib/commerce/: it keeps this module runnable
// under plain node, which is how the visibility rules are tested.
import { isAdminHandle } from './constants.ts';

const RELATIONSHIPS_URL = 'https://public.api.bsky.app/xrpc/app.bsky.graph.getRelationships';

/** The lexicon caps `others` at 30 per call. */
const CHUNK_SIZE = 30;

/** `${viewerDid}|${sellerDid}` -> does the viewer follow that seller. */
const relationshipCache = new Map<string, boolean>();

function cacheKey(viewerDid: string, sellerDid: string) {
  return `${viewerDid}|${sellerDid}`;
}

/** Drop cached relationships. Called on logout so the next viewer starts clean. */
export function clearRelationshipCache(): void {
  relationshipCache.clear();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Of the given sellers, which ones does this viewer follow?
 *
 * Only the sellers actually on screen are asked about, rather than paging the
 * viewer's entire follow list — a seller set is small (tens), a follow list is
 * not. Answers are cached for the session because follow edges rarely change
 * mid-browse, and a wrong answer here costs a listing being shown or hidden for
 * one page load, not a privacy breach.
 *
 * Any failure resolves to "follows nobody", which shows the listings. That is
 * the safe direction for a soft filter: a network blip should not silently
 * empty someone's browse page.
 */
export async function fetchFollowedSellers(
  viewerDid: string,
  sellerDids: string[],
): Promise<Set<string>> {
  const followed = new Set<string>();
  if (!viewerDid || sellerDids.length === 0) return followed;

  const unique = Array.from(new Set(sellerDids)).filter(Boolean);
  const unknown: string[] = [];

  for (const did of unique) {
    const cached = relationshipCache.get(cacheKey(viewerDid, did));
    if (cached === undefined) unknown.push(did);
    else if (cached) followed.add(did);
  }

  if (unknown.length === 0) return followed;

  await Promise.all(
    chunk(unknown, CHUNK_SIZE).map(async (batch) => {
      try {
        const params = new URLSearchParams();
        params.set('actor', viewerDid);
        for (const did of batch) params.append('others', did);

        const res = await fetch(`${RELATIONSHIPS_URL}?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        for (const rel of data?.relationships ?? []) {
          if (!rel?.did) continue;
          // `following` is the URI of the viewer's follow record, present only
          // when the viewer follows this seller.
          const isFollowing = Boolean(rel.following);
          relationshipCache.set(cacheKey(viewerDid, rel.did), isFollowing);
          if (isFollowing) followed.add(rel.did);
        }
      } catch {
        // Treated as "not following" — see the note above about failing open.
      }
    }),
  );

  return followed;
}

type HideableListing = {
  hideFromFriends?: boolean;
  authorDid?: string;
  sellerDid?: string;
};

/** Remove flagged listings whose seller this viewer follows. */
export function applyFriendVisibility<T extends HideableListing>(
  listings: T[],
  followedSellers: Set<string>,
): T[] {
  if (followedSellers.size === 0) return listings;
  return listings.filter((listing) => {
    if (!listing.hideFromFriends) return true;
    const seller = listing.authorDid || listing.sellerDid;
    return !seller || !followedSellers.has(seller);
  });
}

/**
 * Resolve and apply in one step, for callers that just have a list and a viewer.
 *
 * A signed-out viewer has no follow graph, so nothing is hidden from them.
 * Sellers always see their own listings — hiding a listing from its author in
 * their own store or browse would look like it had been lost.
 *
 * The Open Market account is exempt. It follows every seller, because that
 * follow graph is how discovery works, so the plain rule would hide every
 * flagged listing from the one account that moderates them. Being invisible to
 * moderation is not a privacy feature anyone asked for.
 */
export async function filterForViewer<T extends HideableListing>(
  listings: T[],
  viewerDid: string | undefined | null,
  viewerHandle?: string | undefined | null,
): Promise<T[]> {
  if (!viewerDid) return listings;
  if (isAdminHandle(viewerHandle)) return listings;

  const flagged = listings.filter((l) => l.hideFromFriends);
  if (flagged.length === 0) return listings;

  const sellers = flagged
    .map((l) => l.authorDid || l.sellerDid)
    .filter((did): did is string => Boolean(did) && did !== viewerDid);

  if (sellers.length === 0) return listings;

  const followed = await fetchFollowedSellers(viewerDid, sellers);
  return applyFriendVisibility(listings, followed);
}
