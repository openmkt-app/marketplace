// Tests for the @openmkt.app announcement post.
//
// Two things can break a post that no reviewer will notice in a diff: it can
// exceed the 300-grapheme limit and be rejected outright, and it can say
// "Free" about a listing whose seller simply never named a price. Both are
// covered here, along with the ordinary shapes the post has to render.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  announcementPriceLabel,
  buildAnnouncement,
  type AnnouncementListing,
} from '../src/lib/bot-announcement.ts';

const graphemes = (text: string) =>
  Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length;

const listing = (over: Partial<AnnouncementListing> = {}): AnnouncementListing => ({
  title: 'Herman Miller Aeron',
  description: 'Size B, fully loaded, posture fit.',
  price: '450.00',
  currency: 'USD',
  category: 'furniture',
  condition: 'good',
  location: { locality: 'Austin', state: 'Texas' },
  sellerHandle: 'seller.example.com',
  ...over,
});

// --- price ------------------------------------------------------------

test('a price of zero is free, and a missing price is not', () => {
  assert.equal(announcementPriceLabel(listing({ price: '0' })), 'Free 🎁');
  assert.equal(announcementPriceLabel(listing({ price: '', noPrice: true })), 'Make an offer');
  assert.equal(announcementPriceLabel(listing({ price: '' })), '');
});

test('a running sale names what the price used to be', () => {
  const label = announcementPriceLabel(
    listing({ price: '8.00', originalPrice: '12.00', isOnSale: true }),
  );
  assert.match(label, /\$8\.00/);
  assert.match(label, /was \$12\.00/);
});

test('a repeating price carries its billing period', () => {
  assert.equal(announcementPriceLabel(listing({ price: '9.00', billingPeriod: 'month' })), '$9.00/month');
});

test('offers are mentioned only when no sale is running', () => {
  assert.equal(
    announcementPriceLabel(listing({ price: '450.00', acceptingOffers: true })),
    '$450.00 or best offer',
  );
  assert.doesNotMatch(
    announcementPriceLabel(
      listing({ price: '8.00', originalPrice: '12.00', isOnSale: true, acceptingOffers: true }),
    ),
    /best offer/,
  );
});

test('a non-dollar currency keeps its own symbol', () => {
  assert.match(announcementPriceLabel(listing({ price: '30.00', currency: 'EUR' })), /€30\.00/);
});

// --- the whole post ---------------------------------------------------

test('the post carries the item, the facts, the seller and the tags', () => {
  const { text } = buildAnnouncement(listing());

  assert.match(text, /New on Open Market: Herman Miller Aeron/);
  assert.match(text, /\$450\.00/);
  assert.match(text, /Good/);
  assert.match(text, /by @seller\.example\.com/);
  assert.match(text, /#OpenMarket/);
  assert.match(text, /#Furniture/);
  assert.match(text, /#ForSale/);
});

test('a giveaway is not tagged for sale', () => {
  const { text } = buildAnnouncement(listing({ price: '0' }));
  assert.match(text, /Free 🎁/);
  assert.doesNotMatch(text, /#ForSale/);
});

test('a storefront listing is not tagged for sale either', () => {
  const { text } = buildAnnouncement(
    listing({ category: 'digital', location: { isOnlineStore: true } }),
  );
  assert.match(text, /#Software/);
  assert.doesNotMatch(text, /#ForSale/);
});

// The bot posts to everyone following @openmkt.app. Where the item physically
// is belongs on the listing page, not in a broadcast.
test('the post never names where the seller is', () => {
  const local = buildAnnouncement(listing()).text;
  assert.doesNotMatch(local, /Austin/);
  assert.doesNotMatch(local, /TX/);

  const shop = buildAnnouncement(listing({ location: { isOnlineStore: true } })).text;
  assert.doesNotMatch(shop, /Online/);
});

test('condition is dropped where it means nothing', () => {
  const digital = buildAnnouncement(listing({ type: 'digital', condition: 'new' })).text;
  assert.doesNotMatch(digital, /New\b(?!.*Open Market)/);

  const brandNew = buildAnnouncement(listing({ condition: 'new' })).text;
  assert.doesNotMatch(brandNew, /· New/);
});

test('the post never exceeds the 300-grapheme limit', () => {
  const long = buildAnnouncement(
    listing({
      title: 'Vintage '.repeat(60),
      sellerHandle: 'a-rather-long-handle.example.com',
      description: 'x'.repeat(2000),
    }),
  );

  assert.ok(graphemes(long.text) <= 300, `post was ${graphemes(long.text)} graphemes`);
  // The facts survive the squeeze — only the title gives ground.
  assert.match(long.text, /#OpenMarket/);
  assert.match(long.text, /\$450\.00/);
  assert.match(long.text, /…/);
});

test('emoji in a title are counted as one character each', () => {
  const { text } = buildAnnouncement(listing({ title: '👨‍👩‍👧‍👦 '.repeat(40) }));
  assert.ok(graphemes(text) <= 300, `post was ${graphemes(text)} graphemes`);
});

// --- the link card ----------------------------------------------------

test('the card names the item and its price, and describes it', () => {
  const card = buildAnnouncement(listing());
  assert.equal(card.cardTitle, 'Herman Miller Aeron · $450.00');
  assert.equal(card.cardDescription, 'Size B, fully loaded, posture fit.');
});

test('a listing with no description still gets a card body', () => {
  const card = buildAnnouncement(listing({ description: '' }));
  assert.ok(card.cardDescription.length > 0);
});

test('a multi-line description is flattened into one line', () => {
  const card = buildAnnouncement(listing({ description: 'One.\n\nTwo.\n  Three.' }));
  assert.equal(card.cardDescription, 'One. Two. Three.');
});
