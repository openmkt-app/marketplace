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
const PLC_DIRECTORY = 'https://plc.directory';
const FALLBACK_PDS = 'https://bsky.social';

/** The lexicon caps `others` at 30 per call. */
const CHUNK_SIZE = 30;

/**
 * What we know about one viewer -> seller edge.
 *
 * `null` means the viewer does not follow that seller. An object means they do,
 * with `followedAt` set when the follow record's date could be read.
 */
export type FollowEdge = { followedAt?: string } | null;

/** `${viewerDid}|${sellerDid}` -> edge. */
const followCache = new Map<string, FollowEdge>();

let pdsViewerDid = '';
let pdsPromise: Promise<string> | null = null;

function cacheKey(viewerDid: string, sellerDid: string) {
  return `${viewerDid}|${sellerDid}`;
}

/** Drop everything cached. Called on logout so the next viewer starts clean. */
export function clearRelationshipCache(): void {
  followCache.clear();
  pdsViewerDid = '';
  pdsPromise = null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Where the viewer's own repo lives, so their follow records can be read.
 *
 * Resolved once per session — there is only ever one viewer. bsky.social will
 * proxy for repos on its own network but not for a self-hosted PDS, so the DID
 * document is the reliable answer.
 */
async function resolveViewerPds(viewerDid: string): Promise<string> {
  if (pdsPromise && pdsViewerDid === viewerDid) return pdsPromise;

  pdsViewerDid = viewerDid;
  pdsPromise = (async () => {
    try {
      const url = viewerDid.startsWith('did:web:')
        ? `https://${viewerDid.slice('did:web:'.length)}/.well-known/did.json`
        : `${PLC_DIRECTORY}/${viewerDid}`;
      const res = await fetch(url);
      if (!res.ok) return FALLBACK_PDS;
      const doc = await res.json();
      const pds = doc?.service?.find(
        (s: { id?: string; type?: string }) =>
          s.type === 'AtprotoPersonalDataServer' || s.id === '#atproto_pds',
      );
      return pds?.serviceEndpoint || FALLBACK_PDS;
    } catch {
      return FALLBACK_PDS;
    }
  })();

  return pdsPromise;
}

/**
 * Read the date a follow was created.
 *
 * The follow record belongs to the viewer, so this reads the viewer's own repo.
 * Returns undefined when it cannot be read, which the caller treats as "assume
 * an existing friend" rather than as permission.
 */
async function fetchFollowedAt(viewerDid: string, followUri: string): Promise<string | undefined> {
  const rkey = followUri.split('/').pop();
  if (!rkey) return undefined;

  try {
    const pds = await resolveViewerPds(viewerDid);
    const params = new URLSearchParams({
      repo: viewerDid,
      collection: 'app.bsky.graph.follow',
      rkey,
    });
    const res = await fetch(`${pds}/xrpc/com.atproto.repo.getRecord?${params.toString()}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    const createdAt = data?.value?.createdAt;
    return typeof createdAt === 'string' ? createdAt : undefined;
  } catch {
    return undefined;
  }
}

/**
 * For each seller, does this viewer follow them, and since when?
 *
 * Only the sellers actually on screen are asked about, rather than paging the
 * viewer's entire follow list — a seller set is small (tens), a follow list is
 * not. The follow dates cost one read each, but only for sellers the viewer
 * actually follows *and* who have a flagged listing, which is usually none.
 *
 * A failed relationship lookup resolves to "not following", which shows the
 * listings. That is the safe direction for a soft filter: a network blip should
 * not silently empty someone's browse page.
 */
export async function fetchFollowEdges(
  viewerDid: string,
  sellerDids: string[],
): Promise<Map<string, FollowEdge>> {
  const edges = new Map<string, FollowEdge>();
  if (!viewerDid || sellerDids.length === 0) return edges;

  const unique = Array.from(new Set(sellerDids)).filter(Boolean);
  const unknown: string[] = [];

  for (const did of unique) {
    const cached = followCache.get(cacheKey(viewerDid, did));
    if (cached === undefined) unknown.push(did);
    else edges.set(did, cached);
  }

  if (unknown.length === 0) return edges;

  // Follow URIs first, then dates only for the ones that came back following.
  const following = new Map<string, string>();

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
          if (typeof rel.following === 'string') {
            following.set(rel.did, rel.following);
          } else {
            followCache.set(cacheKey(viewerDid, rel.did), null);
            edges.set(rel.did, null);
          }
        }
      } catch {
        // Treated as "not following" — see the note above about failing open.
      }
    }),
  );

  await Promise.all(
    Array.from(following, async ([sellerDid, followUri]) => {
      const edge: FollowEdge = { followedAt: await fetchFollowedAt(viewerDid, followUri) };
      followCache.set(cacheKey(viewerDid, sellerDid), edge);
      edges.set(sellerDid, edge);
    }),
  );

  return edges;
}

type HideableListing = {
  hideFromFriends?: boolean;
  authorDid?: string;
  sellerDid?: string;
  createdAt?: string;
};

/**
 * Should this listing be hidden from a viewer with this relationship to it?
 *
 * The exception that matters: someone who followed the seller *after* the
 * listing went up is not the audience the flag is for. They saw the listing
 * while it was visible to them and followed the seller because of it — often to
 * ask a question — and hiding it the moment they follow makes the listing
 * disappear as a direct result of their interest in it.
 *
 * An unreadable follow date hides the listing. We already know this viewer is a
 * follower; it is only the exemption that is unproven, so the seller's stated
 * preference wins. That is the opposite of the network failure above, where we
 * did not know whether they followed at all.
 *
 * The comparison relies on the listing keeping its original createdAt, which is
 * why the commerce migration preserves it rather than stamping the edit time.
 */
function isHidden(listing: HideableListing, edge: FollowEdge): boolean {
  if (!listing.hideFromFriends) return false;
  if (!edge) return false; // not a follower

  if (!edge.followedAt || !listing.createdAt) return true;

  const followedAt = Date.parse(edge.followedAt);
  const listedAt = Date.parse(listing.createdAt);
  if (Number.isNaN(followedAt) || Number.isNaN(listedAt)) return true;

  // Followed after the listing went up: a buyer, not an old friend.
  return followedAt <= listedAt;
}

/** Remove flagged listings whose seller this viewer already followed. */
export function applyFriendVisibility<T extends HideableListing>(
  listings: T[],
  edges: Map<string, FollowEdge>,
): T[] {
  if (edges.size === 0) return listings;
  return listings.filter((listing) => {
    const seller = listing.authorDid || listing.sellerDid;
    if (!seller) return true;
    return !isHidden(listing, edges.get(seller) ?? null);
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

  const edges = await fetchFollowEdges(viewerDid, sellers);
  return applyFriendVisibility(listings, edges);
}
