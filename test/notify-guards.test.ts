// Tests for the checks that stand in for authentication on the notify endpoint.
//
// The endpoint cannot authenticate its caller: the ordinary caller is the
// seller's own browser, which has no secret to hold, and FEED_INDEX_SECRET is
// unset in production. What protects it instead is that every claim a request
// makes is checked against the seller's signed record. These are the pure
// pieces of that reasoning, extracted so they can be stated as facts rather
// than inferred from the route.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isFreshEnoughToAnnounce,
  postBelongsToSeller,
  sellerDidFromListingUri,
} from '../src/lib/notify-guards.ts';

// --- who the URI names -------------------------------------------------

test('the seller DID is read out of the listing URI', () => {
  assert.equal(
    sellerDidFromListingUri('at://did:plc:abc123/app.openmkt.commerce.listing/3ms'),
    'did:plc:abc123',
  );
});

test('anything that is not an AT URI names nobody', () => {
  assert.equal(sellerDidFromListingUri('https://openmkt.app/listing/1'), null);
  assert.equal(sellerDidFromListingUri('at://not-a-did/collection/rkey'), null);
  assert.equal(sellerDidFromListingUri(''), null);
  assert.equal(sellerDidFromListingUri('at://'), null);
});

// --- whose post is being indexed ---------------------------------------

test('a seller may index their own post', () => {
  assert.equal(
    postBelongsToSeller('at://did:plc:abc/app.bsky.feed.post/xyz', 'did:plc:abc'),
    true,
  );
});

test("a seller may not index somebody else's post", () => {
  // Without this, the request that says "index my share instead of the bot's"
  // will put any post on the network into the Open Market feed.
  assert.equal(
    postBelongsToSeller('at://did:plc:someoneelse/app.bsky.feed.post/xyz', 'did:plc:abc'),
    false,
  );
  // A DID that merely starts the same must not pass either.
  assert.equal(
    postBelongsToSeller('at://did:plc:abcdef/app.bsky.feed.post/xyz', 'did:plc:abc'),
    false,
  );
});

// --- how old the listing is --------------------------------------------

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

test('a listing just created is announced', () => {
  assert.equal(isFreshEnoughToAnnounce(minutesAgo(0)), true);
  assert.equal(isFreshEnoughToAnnounce(minutesAgo(14)), true);
});

test('an old listing is not, however often it is replayed', () => {
  // Every listing URI on the site is public, so this is the check that stops
  // one being pushed back through the endpoint months later.
  assert.equal(isFreshEnoughToAnnounce(minutesAgo(16)), false);
  assert.equal(isFreshEnoughToAnnounce(minutesAgo(60 * 24 * 30)), false);
});

test('a missing or unparseable date is not announced', () => {
  assert.equal(isFreshEnoughToAnnounce(undefined), false);
  assert.equal(isFreshEnoughToAnnounce(''), false);
  assert.equal(isFreshEnoughToAnnounce('whenever'), false);
});

test('a date in the future is not a way past the window', () => {
  const hourAhead = new Date(Date.now() + 60 * 60_000).toISOString();
  assert.equal(isFreshEnoughToAnnounce(hourAhead), false);
});
