// Tests for the compatibility adapter.
//
// The contract: a v2 record must reach today's components carrying everything
// they read, and a v1 record must come out the far side unchanged from what the
// app sees now. Any drift here shows up as a silently blank field in the UI.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

import { normalizeListing } from '../src/lib/commerce/normalize.ts';
import { toLegacyListing } from '../src/lib/commerce/legacy.ts';
import { LEGACY_COLLECTION, COMMERCE_COLLECTION } from '../src/lib/commerce/collections.ts';

const fixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', name), 'utf8'));

const legacyUri = `at://did:plc:test/${LEGACY_COLLECTION}/abc`;
const commerceUri = `at://did:plc:test/${COMMERCE_COLLECTION}/abc`;

const roundTrip = (name: string, uri: string) => toLegacyListing(normalizeListing(fixture(name), { uri }));

test('v1 goods survives the round trip unchanged', () => {
  const legacy = roundTrip('legacy-marketplace-listing.json', legacyUri);

  assert.equal(legacy.price, '1250.00', 'the exact string the old UI parsed before');
  assert.equal(legacy.currency, 'USD');
  assert.equal(legacy.category, 'furniture');
  assert.equal(legacy.condition, 'good');
  assert.equal(legacy.location.state, 'CA');
  assert.equal(legacy.location.county, 'Alameda');
  assert.equal(legacy.location.locality, 'Oakland');
  assert.equal(legacy.location.zipPrefix, '946');
  assert.equal(legacy.metadata?.subcategory, 'Living Room');
  assert.equal(legacy.externalUrl, 'https://example.com/listing/123');
  assert.ok(legacy.labels, 'self-labels drive NSFW blurring and must survive');
});

test('v1 online store keeps the sentinels the old UI expects', () => {
  const legacy = roundTrip('legacy-marketplace-commission.json', legacyUri);

  // location-utils and the Mall/Gallery gate read isOnlineStore; several places
  // still display locality, so the sentinel has to be reconstructed.
  assert.equal(legacy.location.isOnlineStore, true);
  assert.equal(legacy.location.locality, 'Online Store');
  assert.equal(legacy.location.state, 'Online');
});

test('v1 commission keeps the fields ListingCard renders', () => {
  const legacy = roundTrip('legacy-marketplace-commission.json', legacyUri);

  assert.equal(legacy.category, 'digital_arts', 'artist-store detection keys on this');
  assert.equal(legacy.metadata?.slotsAvailable, 3);
  assert.equal(legacy.metadata?.turnaroundTime, '2-3 weeks');
  assert.equal(legacy.metadata?.commissionStatus, 'open');
  assert.equal(legacy.metadata?.externalPlatform, 'kofi', 'StoreCard builds platform badges from this');
});

test('a v2 record reaches the old UI with a usable price', () => {
  const legacy = roundTrip('listing-standalone-goods.json', commerceUri);

  assert.equal(legacy.price, '30.00', 'regular price, not the sale price');
  assert.equal(legacy.currency, 'USD');
  assert.equal(legacy.category, 'apparel');
  assert.equal(legacy.condition, 'new');
  assert.equal(legacy.schemaVersion, 2, 'provenance survives for an upgrade nudge');
});

test('a v2 service record still shows its commission badge', () => {
  const record = {
    $type: COMMERCE_COLLECTION,
    type: 'service',
    title: 'Character Illustration',
    pricing: { regularPrice: 8500, currency: 'USD', taxInclusive: false },
    category: 'digital_arts',
    createdAt: '2026-08-01T00:00:00Z',
    details: {
      $type: `${COMMERCE_COLLECTION}#serviceDetails`,
      slotsAvailable: 0,
      turnaroundTime: '3-5 weeks',
    },
  };
  const legacy = toLegacyListing(normalizeListing(record, { uri: commerceUri }));

  assert.equal(legacy.metadata?.slotsAvailable, 0);
  assert.equal(legacy.metadata?.turnaroundTime, '3-5 weeks');
  // v2 does not store commissionStatus — it is derived. Without recomputing it
  // here the open/waitlist badge on ListingCard would silently vanish.
  assert.equal(legacy.metadata?.commissionStatus, 'waitlist', 'zero slots means waitlist');
});

test('a v2 service with open slots derives the open badge', () => {
  const record = {
    $type: COMMERCE_COLLECTION,
    type: 'service',
    title: 'x',
    pricing: { regularPrice: 100, currency: 'USD' },
    category: 'digital_arts',
    createdAt: '2026-08-01T00:00:00Z',
    details: { $type: `${COMMERCE_COLLECTION}#serviceDetails`, slotsAvailable: 4 },
  };
  const legacy = toLegacyListing(normalizeListing(record, { uri: commerceUri }));
  assert.equal(legacy.metadata?.commissionStatus, 'open');
});

test('JPY does not gain fake decimals on the way back out', () => {
  const record = {
    $type: COMMERCE_COLLECTION,
    type: 'goods',
    title: 'Tenugui',
    pricing: { regularPrice: 1000, currency: 'JPY' },
    category: 'other',
    createdAt: '2026-08-01T00:00:00Z',
  };
  const legacy = toLegacyListing(normalizeListing(record, { uri: commerceUri }));

  // "1000.00" here would make the legacy formatter render ¥1,000.00 — wrong by
  // two orders of magnitude in appearance, and wrong for price sorting.
  assert.equal(legacy.price, '1000');
});

test('KWD keeps three decimals', () => {
  const record = {
    $type: COMMERCE_COLLECTION,
    type: 'goods',
    title: 'x',
    pricing: { regularPrice: 1500, currency: 'KWD' },
    category: 'other',
    createdAt: '2026-08-01T00:00:00Z',
  };
  const legacy = toLegacyListing(normalizeListing(record, { uri: commerceUri }));
  assert.equal(legacy.price, '1.500');
});

test('a listing with no parseable price yields an empty string, not NaN', () => {
  const legacy = toLegacyListing(
    normalizeListing({ title: 'x', price: 'ask me', category: 'other', createdAt: '2026-01-01T00:00:00Z' }, { uri: legacyUri }),
  );
  assert.equal(legacy.price, '', 'formatPrice returns its input unchanged for non-numeric, so empty is safest');
});

test('checkoutUrl falls back into externalUrl for the old buy button', () => {
  const record = {
    $type: COMMERCE_COLLECTION,
    type: 'goods',
    title: 'x',
    pricing: { regularPrice: 100, currency: 'USD' },
    category: 'other',
    createdAt: '2026-08-01T00:00:00Z',
    checkoutUrl: 'https://shop.example/checkout/1',
  };
  const legacy = toLegacyListing(normalizeListing(record, { uri: commerceUri }));
  assert.equal(legacy.externalUrl, 'https://shop.example/checkout/1');
});
