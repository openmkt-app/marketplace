// src/lib/bot-announcement.ts
//
// What the @openmkt.app bot says when a listing goes up.
//
// The bot posts into the same timelines as the seller's own share, so a bare
// "New listing: <title>" next to the seller's card made the marketplace look
// thinner than it is. Everything the listing page already knows — who is
// selling, the price, whether a sale is running, where it ships from, what it
// is — belongs in the announcement.
//
// Pure on purpose: no network, no agent, no environment. The post is assembled
// here and only handed to the AT Protocol client in bot-client.ts, so the
// wording and the 300-grapheme budget can be tested without a session.

import { formatPrice, formatLocation } from './price-utils.ts';
import { formatConditionForDisplay } from './condition-utils.ts';
import { buildListingHashtags } from './listing-hashtags.ts';

/** app.bsky.feed.post caps text at 300 graphemes. */
const MAX_POST_GRAPHEMES = 300;

/** Bluesky truncates card descriptions itself; this keeps the record small. */
const MAX_CARD_DESCRIPTION = 300;

/** Never squeeze the title below this, however long the rest of the post is. */
const MIN_TITLE_GRAPHEMES = 24;

const BILLING_SUFFIX: Record<string, string> = {
  day: '/day',
  week: '/week',
  month: '/month',
  quarter: '/quarter',
  year: '/year',
};

/**
 * The subset of a listing the announcement reads. Structural rather than an
 * import of LegacyListing, so the caller can pass either a hydrated listing or
 * the thin payload the create-listing form sends.
 */
export type AnnouncementListing = {
  title?: string;
  description?: string;
  /** What a buyer pays today — already the sale price when one is running. */
  price?: string;
  /** The struck-through price, set only while a sale is actually running. */
  originalPrice?: string;
  isOnSale?: boolean;
  /** No price was named at all. Distinct from a price of zero. */
  noPrice?: boolean;
  acceptingOffers?: boolean;
  billingPeriod?: string;
  currency?: string;
  type?: 'goods' | 'service' | 'digital';
  category?: string;
  condition?: string;
  location?: {
    state?: string;
    county?: string;
    locality?: string;
    isOnlineStore?: boolean;
  };
  /** The seller's Bluesky handle, so the post can credit and notify them. */
  sellerHandle?: string;
};

export type Announcement = {
  /** The post text, already inside the grapheme budget. Facets are detected later. */
  text: string;
  /** Headline of the link card. */
  cardTitle: string;
  /** Body of the link card. */
  cardDescription: string;
};

/**
 * Graphemes, not code units. "👨‍👩‍👧" is one character to a reader and to
 * Bluesky's counter, but eight to `String.length` — counting the wrong one
 * truncates a perfectly legal post.
 */
function graphemesOf(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  // Code points, which is wrong for a family emoji but never undercounts.
  return Array.from(text);
}

function graphemeLength(text: string): number {
  return graphemesOf(text).length;
}

/** Cuts to `max` graphemes inclusive of the ellipsis, and trims a dangling word. */
function truncate(text: string, max: number): string {
  const segments = graphemesOf(text);
  if (segments.length <= max) return text;

  let cut = segments.slice(0, Math.max(max - 1, 1)).join('');

  // Prefer a word boundary, but not one that throws most of the text away.
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > cut.length * 0.6) cut = cut.slice(0, lastSpace);

  return `${cut.replace(/[\s.,;:—-]+$/, '')}…`;
}

/**
 * The price as a shopper would read it.
 *
 * Returns an empty string when the listing names no price and takes no offers,
 * so the caller drops the whole field rather than printing "Free" for a price
 * nobody set — those two mean opposite things.
 */
export function announcementPriceLabel(listing: AnnouncementListing): string {
  if (listing.noPrice) return 'Make an offer';

  const price = listing.price?.trim();
  if (!price) return listing.acceptingOffers ? 'Make an offer' : '';

  const currency = listing.currency || 'USD';
  const amount = parseFloat(price.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(amount)) return '';
  if (amount === 0) return 'Free 🎁';

  let label = formatPrice(price, currency);
  if (listing.billingPeriod && BILLING_SUFFIX[listing.billingPeriod]) {
    label += BILLING_SUFFIX[listing.billingPeriod];
  }

  // A sale is the single most postable fact about a listing, so it earns the
  // extra characters. `price` is already the sale price by the time it is here.
  if (listing.isOnSale && listing.originalPrice) {
    label = `${label} (was ${formatPrice(listing.originalPrice, currency)}) 🔖`;
  } else if (listing.acceptingOffers) {
    label = `${label} or best offer`;
  }

  return label;
}

/** "Online" for a storefront, "Austin, TX" for something with an address. */
export function announcementLocationLabel(listing: AnnouncementListing): string {
  const location = listing.location;
  if (!location) return '';
  if (location.isOnlineStore) return 'Online';
  return formatLocation(location.locality, location.state);
}

/**
 * Condition is worth saying about a used bicycle and says nothing about a
 * software licence, which is never anything but new.
 */
function announcementConditionLabel(listing: AnnouncementListing): string {
  if (listing.type === 'digital' || listing.type === 'service') return '';
  if (!listing.condition || listing.condition === 'new') return '';
  return formatConditionForDisplay(listing.condition);
}

/** Collapses the newlines a description may carry; a post line has to be one line. */
function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Builds the whole announcement: post text plus the link card that carries the
 * photo, so the reader sees the item without opening anything.
 *
 * The title is the only field of unbounded length, so it absorbs the budget:
 * the fixed lines are laid out first and whatever is left over goes to the
 * title. That way a long title never costs the post its price or its tags.
 */
export function buildAnnouncement(listing: AnnouncementListing): Announcement {
  const title = flatten(listing.title || 'Untitled listing');
  const priceLabel = announcementPriceLabel(listing);
  // A listing with no price is not a giveaway: #ForSale belongs on "make an
  // offer" and would send buyers to the wrong place on a free one.
  const isFree =
    !listing.noPrice && !listing.acceptingOffers && parseFloat(listing.price || '0') === 0;

  const facts = [priceLabel, announcementConditionLabel(listing), announcementLocationLabel(listing)]
    .filter(Boolean)
    .join(' · ');

  const byLine = listing.sellerHandle ? `by @${listing.sellerHandle}` : '';

  const tagLine = buildListingHashtags(listing.category, {
    isFree,
    isOnlineStore: listing.location?.isOnlineStore,
  }).join(' ');

  const lead = '🛍️ New on Open Market: ';
  const tail = [[facts, byLine].filter(Boolean).join('\n'), tagLine].filter(Boolean).join('\n\n');
  const tailCost = tail ? graphemeLength(`\n\n${tail}`) : 0;

  const titleBudget = Math.max(MAX_POST_GRAPHEMES - graphemeLength(lead) - tailCost, MIN_TITLE_GRAPHEMES);
  const text = `${lead}${truncate(title, titleBudget)}${tail ? `\n\n${tail}` : ''}`;

  // No URL in the text. The card below it carries the link, and the raw
  // at:// URL percent-encoded into a path was the ugliest thing in the old post.
  // A middle dot rather than a dash: plenty of titles contain a dash already,
  // and "Aeron Chair - Size B — $450.00" reads as one run-on phrase.
  const cardTitle = priceLabel ? `${title} · ${priceLabel}` : title;
  const description = flatten(listing.description || '');

  return {
    text: truncate(text, MAX_POST_GRAPHEMES),
    cardTitle: truncate(cardTitle, 200),
    cardDescription: description
      ? truncate(description, MAX_CARD_DESCRIPTION)
      : 'See the full listing on Open Market.',
  };
}
