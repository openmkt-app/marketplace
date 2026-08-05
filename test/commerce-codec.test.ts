// Codec tests. Run with: npm run test:commerce
//
// Covers the cases the AppView spike could not reach with live data — there are
// no JPY or KWD listings in production, so the minor-unit exponent branch has
// never been exercised against a real record.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

import { exponentFor, formatMinorUnits, toMinorUnits, effectiveAmount, isOnSale } from '../src/lib/commerce/money.ts';
import { normalizeListing } from '../src/lib/commerce/normalize.ts';
import { buildListingRecord } from '../src/lib/commerce/serialize.ts';
import { LEGACY_COLLECTION, COMMERCE_COLLECTION, collectionFromUri, didFromUri } from '../src/lib/commerce/collections.ts';

const fixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', name), 'utf8'));

const legacyUri = (rkey = 'abc') => `at://did:plc:test/${LEGACY_COLLECTION}/${rkey}`;
const commerceUri = (rkey = 'abc') => `at://did:plc:test/${COMMERCE_COLLECTION}/${rkey}`;

// --- money -------------------------------------------------------------

test('exponent follows ISO 4217, not a flat 2', () => {
  assert.equal(exponentFor('USD'), 2);
  assert.equal(exponentFor('EUR'), 2);
  assert.equal(exponentFor('JPY'), 0, 'yen has no minor unit');
  assert.equal(exponentFor('KWD'), 3, 'dinar has three');
  assert.equal(exponentFor('BHD'), 3);
  assert.equal(exponentFor('jpy'), 0, 'case-insensitive');
  assert.equal(exponentFor(undefined), 2, 'defaults to 2');
  assert.equal(exponentFor('ZZZ'), 2, 'unknown code defaults to 2');
});

test('toMinorUnits respects the currency exponent', () => {
  assert.equal(toMinorUnits('1250.00', 'USD'), 125000);
  assert.equal(toMinorUnits('5.00', 'USD'), 500);
  // The bug this prevents: ¥1000 must stay 1000, not become 100000.
  assert.equal(toMinorUnits('1000', 'JPY'), 1000);
  assert.equal(toMinorUnits('1.500', 'KWD'), 1500);
  assert.equal(toMinorUnits('0.00', 'USD'), 0, 'free is zero, not null');
});

test('toMinorUnits copes with the messy v1 strings', () => {
  assert.equal(toMinorUnits('$1,250.00', 'USD'), 125000);
  assert.equal(toMinorUnits(25, 'USD'), 2500, 'accepts numbers');
  assert.equal(toMinorUnits('', 'USD'), null);
  assert.equal(toMinorUnits(null, 'USD'), null);
  assert.equal(toMinorUnits('not a price', 'USD'), null, 'null, so callers can tell it apart from free');
});

test('formatMinorUnits does not force 2 decimals', () => {
  assert.equal(formatMinorUnits(125000, 'USD', 'en-US'), '$1,250.00');
  // price-utils.formatPrice renders this as "¥1,000.00" today.
  assert.equal(formatMinorUnits(1000, 'JPY', 'en-US'), '¥1,000');
  assert.match(formatMinorUnits(1500, 'KWD', 'en-US'), /1\.500/);
  assert.equal(formatMinorUnits(0, 'USD', 'en-US', 'Free'), 'Free');
  assert.equal(formatMinorUnits(null, 'USD'), '');
});

test('sale price only applies inside its window', () => {
  const now = new Date('2026-08-05T12:00:00Z');
  const base = { regularPrice: 3000, salePrice: 2400 };

  assert.equal(effectiveAmount(base, now), 2400, 'no window means always on');
  assert.equal(
    effectiveAmount({ ...base, saleStartsAt: '2026-08-01T00:00:00Z', saleEndsAt: '2026-08-14T00:00:00Z' }, now),
    2400,
  );
  assert.equal(
    effectiveAmount({ ...base, saleEndsAt: '2026-08-01T00:00:00Z' }, now),
    3000,
    'expired sale falls back to regular',
  );
  assert.equal(
    effectiveAmount({ ...base, saleStartsAt: '2026-09-01T00:00:00Z' }, now),
    3000,
    'future sale is not active yet',
  );
  assert.equal(effectiveAmount({ regularPrice: 3000 }, now), 3000);
  assert.equal(isOnSale(base, now), true);
  assert.equal(isOnSale({ regularPrice: 3000 }, now), false);
});

// --- uri helpers -------------------------------------------------------

test('uri parsing', () => {
  assert.equal(collectionFromUri(legacyUri()), LEGACY_COLLECTION);
  assert.equal(didFromUri(legacyUri()), 'did:plc:test');
  assert.equal(collectionFromUri('not a uri'), null);
  assert.equal(didFromUri(undefined), null);
});

// --- v1 normalization --------------------------------------------------

test('v1 goods listing normalizes', () => {
  const listing = normalizeListing(fixture('legacy-marketplace-listing.json'), { uri: legacyUri() });

  assert.equal(listing.schemaVersion, 1);
  assert.equal(listing.type, 'goods');
  assert.equal(listing.title, 'Vintage Leather Armchair');
  // taxInclusive first: assert.deepEqual narrows the type, so any field check
  // after it stops compiling.
  assert.equal(listing.pricing.taxInclusive, undefined, 'v1 never recorded this; must stay unknown');
  assert.deepEqual(listing.pricing, { regularPrice: 125000, currency: 'USD' });
  assert.equal(listing.subcategory, 'Living Room', 'lifted out of metadata');
  assert.equal(listing.authorDid, 'did:plc:test', 'derived from the uri');
});

test('v1 location keeps region but never invents a country', () => {
  const listing = normalizeListing(fixture('legacy-marketplace-listing.json'), { uri: legacyUri() });

  assert.equal(listing.location?.region, 'CA');
  assert.equal(listing.location?.locality, 'Oakland');
  assert.equal(listing.location?.postalPrefix, '946');
  assert.equal(listing.location?.isRemote, false);
  assert.equal(listing.location?.countryCode, undefined, 'v1 was US-only in practice but never said so');
  assert.equal(listing.location?.legacyCounty, 'Alameda');
});

test('v1 online-store sentinels do not leak through as place names', () => {
  const listing = normalizeListing(fixture('legacy-marketplace-commission.json'), { uri: legacyUri() });

  assert.equal(listing.location?.locality, undefined, '"Online Store" must not survive as a locality');
  assert.equal(listing.location?.region, undefined, '"Online" must not survive as a region');
  assert.deepEqual(listing.location, { isRemote: true });
});

test('digital_arts becomes a service and keeps its commission fields', () => {
  const listing = normalizeListing(fixture('legacy-marketplace-commission.json'), { uri: legacyUri() });

  assert.equal(listing.type, 'service');
  assert.deepEqual(listing.serviceDetails, {
    slotsAvailable: 3,
    turnaroundTime: '2-3 weeks',
    commissionStatus: 'open',
  });
  assert.equal(listing.externalPlatform, 'kofi');
});

test('orphan etsy categories are mapped, not passed through', () => {
  const listing = normalizeListing(
    { title: 'x', price: '10.00', currency: 'USD', category: 'vintage', createdAt: '2026-01-01T00:00:00Z' },
    { uri: legacyUri() },
  );
  assert.equal(listing.category, 'collectibles', 'vintage is not in CATEGORIES and renders as a raw slug today');
});

test('a JPY v1 listing survives the round trip', () => {
  const listing = normalizeListing(
    { title: 'Tenugui', price: '1000', currency: 'JPY', category: 'other', createdAt: '2026-01-01T00:00:00Z' },
    { uri: legacyUri() },
  );
  assert.equal(listing.pricing.regularPrice, 1000);
  assert.equal(formatMinorUnits(listing.pricing.regularPrice, 'JPY', 'en-US'), '¥1,000');
});

// --- v2 normalization --------------------------------------------------

test('v2 listing passes through with its details union unpacked', () => {
  const listing = normalizeListing(fixture('listing-standalone-goods.json'), { uri: commerceUri() });

  assert.equal(listing.schemaVersion, 2);
  assert.equal(listing.pricing.regularPrice, 3000);
  assert.equal(listing.pricing.salePrice, 2400);
  assert.equal(listing.pricing.taxInclusive, false);
  assert.equal(listing.gtin, '0012345678905');
  assert.deepEqual(listing.tags, ['organic', 'unisex']);
  assert.equal(listing.goodsDetails?.shippingWeight, 200);
  assert.equal(listing.goodsDetails?.shippingClass, 'light');
  assert.equal(listing.serviceDetails, undefined, 'wrong union arm must not be populated');
});

test('v2 digital listing lands in digitalDetails', () => {
  const listing = normalizeListing(fixture('listing-digital.json'), { uri: commerceUri() });

  assert.equal(listing.type, 'digital');
  assert.deepEqual(listing.digitalDetails?.fileFormats, ['SVG', 'PNG', 'AI']);
  assert.equal(listing.digitalDetails?.downloadLimit, -1);
  assert.equal(listing.pricing.taxInclusive, true);
});

test('v2 grouped listing keeps its items', () => {
  const listing = normalizeListing(fixture('listing-grouped.json'), { uri: commerceUri() });

  assert.equal(listing.groupedItems?.length, 2);
  assert.equal(listing.groupedItems?.[0].title, 'Custom Mechanical Keyboard');
});

test('shape is detected structurally when the uri gives nothing away', () => {
  const v2 = normalizeListing({ pricing: { regularPrice: 100, currency: 'USD' }, title: 'x' }, { uri: 'garbage' });
  assert.equal(v2.schemaVersion, 2);

  const v1 = normalizeListing({ price: '1.00', currency: 'USD', title: 'x' }, { uri: 'garbage' });
  assert.equal(v1.schemaVersion, 1);
});

// --- serialization -----------------------------------------------------

test('buildListingRecord emits a clean v2 record', () => {
  const record = buildListingRecord({
    type: 'goods',
    title: 'Classic Tee',
    description: 'Soft cotton',
    pricing: { regularPrice: 3000, salePrice: 2400, currency: 'USD', taxInclusive: false },
    category: 'apparel',
    goodsDetails: { shippingWeight: 200 },
  });

  assert.equal(record.$type, COMMERCE_COLLECTION);
  assert.equal(record.pricing.regularPrice, 3000);
  assert.equal(record.details.$type, `${COMMERCE_COLLECTION}#goodsDetails`);
  assert.ok(record.createdAt, 'always stamped');
});

test('hydrated UI fields never reach the record', () => {
  const record = buildListingRecord({
    type: 'goods',
    title: 'x',
    description: '',
    pricing: { regularPrice: 100, currency: 'USD' },
    category: 'other',
    // These are on the app type but must not be serialized.
    formattedImages: [{ thumbnail: 'a', fullsize: 'b', mimeType: 'image/jpeg' }],
    authorHandle: 'someone.bsky.social',
    isVerifiedSeller: true,
  } as any);

  assert.equal(record.formattedImages, undefined);
  assert.equal(record.authorHandle, undefined);
  assert.equal(record.isVerifiedSeller, undefined);
});

test('createdAt is preserved when upgrading, not bumped to now', () => {
  const original = '2026-04-21T10:00:00Z';
  const record = buildListingRecord(
    {
      type: 'goods',
      title: 'x',
      description: '',
      pricing: { regularPrice: 100, currency: 'USD' },
      category: 'other',
    },
    { createdAt: original },
  );
  assert.equal(record.createdAt, original, 'otherwise every upgraded listing jumps to the top of browse');
});

test('empty values are omitted rather than written as undefined', () => {
  const record = buildListingRecord({
    type: 'goods',
    title: 'x',
    description: '',
    pricing: { regularPrice: 100, currency: 'USD' },
    category: 'other',
    tags: [],
    brand: '',
  });

  assert.ok(!('description' in record), 'empty string dropped');
  assert.ok(!('tags' in record), 'empty array dropped');
  assert.ok(!('brand' in record), 'empty string dropped');
});

test('commissionStatus is derived state and is not written', () => {
  const record = buildListingRecord({
    type: 'service',
    title: 'Commission',
    description: '',
    pricing: { regularPrice: 8500, currency: 'USD' },
    category: 'digital_arts',
    serviceDetails: { slotsAvailable: 3, turnaroundTime: '2-3 weeks', commissionStatus: 'open' },
  });

  assert.equal(record.details.slotsAvailable, 3);
  assert.equal(record.details.commissionStatus, undefined, 'not a lexicon field');
});

test('v1 -> canonical -> v2 keeps the money identical', () => {
  const listing = normalizeListing(fixture('legacy-marketplace-listing.json'), { uri: legacyUri() });
  const record = buildListingRecord(listing as any, { createdAt: listing.createdAt });

  assert.equal(record.pricing.regularPrice, 125000);
  assert.equal(record.pricing.currency, 'USD');
  assert.equal(record.type, 'goods');
  assert.equal(record.createdAt, '2026-04-21T10:00:00Z');
});
