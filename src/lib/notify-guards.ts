// src/lib/notify-guards.ts
//
// The checks that stand in for authentication on /api/feed/notify-new-listing.
//
// That endpoint cannot authenticate its caller. The ordinary caller is the
// seller's own browser immediately after a write, and a browser has no secret
// to hold — FEED_INDEX_SECRET is unset in production, so the bearer check there
// does nothing. For a while that meant anyone could hand the endpoint a title
// and a price and have @openmkt.app read them out to its followers.
//
// What guards it now is that nothing in the request is believed. The listing is
// read back from the seller's PDS and the post is built from that record; these
// functions cover the rest — that the URI names a repo, that a post being
// indexed belongs to the seller who owns the listing, and that the listing is
// new. They are pure so the reasoning can be tested directly.

/** How recently a listing must have been created for the bot to announce it. */
export const ANNOUNCE_WINDOW_MS = 15 * 60 * 1000;

/**
 * The repo an `at://` listing URI names, or null if it names nothing usable.
 *
 * Everything else keys off this, so it refuses anything that is not plainly a
 * DID rather than returning a string that merely looks like one.
 */
export function sellerDidFromListingUri(listingUri: string): string | null {
  if (!listingUri.startsWith('at://')) return null;

  const did = listingUri.slice('at://'.length).split('/')[0];
  if (!did || !did.startsWith('did:')) return null;

  // did:method:identifier — anything shorter is not a DID.
  return did.split(':').length >= 3 ? did : null;
}

/**
 * Whether a post URI lives in the seller's own repo.
 *
 * A seller may ask for their own share to be indexed in place of the bot's
 * post. Without this check that request will put any post on the network into
 * the Open Market feed. The trailing slash matters: `did:plc:abcdef` must not
 * satisfy a check for `did:plc:abc`.
 */
export function postBelongsToSeller(postUri: string, sellerDid: string): boolean {
  return postUri.startsWith(`at://${sellerDid}/`);
}

/**
 * Whether a listing is new enough to announce.
 *
 * Every listing URI on the site is public, so an old one can be replayed
 * through the endpoint at any time. A record with no readable creation date is
 * refused rather than trusted, and so is one dated in the future — a clock
 * skewed forward would otherwise buy an indefinite window.
 */
export function isFreshEnoughToAnnounce(createdAt: string | undefined): boolean {
  const created = Date.parse(createdAt || '');
  if (Number.isNaN(created)) return false;

  const age = Date.now() - created;
  return age >= 0 && age <= ANNOUNCE_WINDOW_MS;
}
