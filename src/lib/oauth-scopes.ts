// The one place the OAuth scope string is written.
//
// It used to live in three files that had already drifted apart: the
// .well-known copy granted no `repo:` scope at all. Granular scopes name the
// collection, so a scope string that is missing one means writes fail at the
// PDS with an error the seller cannot act on.
//
// The collection scopes are derived from the same constants the write path
// uses, so dev and production ask for the collection they actually write.

import { COMMERCE_COLLECTION, LEGACY_COLLECTION, SHOP_COLLECTION } from './commerce/collections';

/**
 * Why the legacy collection is still here: upgrading a v1 listing deletes the
 * old record, and deleting needs write access to the collection it lives in.
 * This entry can go when no v1 records are left, which may be never.
 */
const SCOPES = [
  'atproto',
  'transition:chat.bsky',
  `repo:${COMMERCE_COLLECTION}`,
  // A listing's shopRef is required, so writing a listing means writing a shop
  // record first. Asking for it now avoids a second round of re-consent when
  // the shop gets a UI of its own.
  `repo:${SHOP_COLLECTION}`,
  `repo:${LEGACY_COLLECTION}`,
  'repo:app.bsky.feed.post',
  'repo:app.bsky.graph.follow',
  'blob:*/*',
];

export const OAUTH_SCOPE = SCOPES.join(' ');
