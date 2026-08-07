// Compatibility adapter: canonical Listing -> the app's MarketplaceListing.
//
// Every component, filter, and formatter in the app is typed against
// MarketplaceListing. Rewriting them all in one go would be a huge, risky
// change, so read paths instead do:
//
//     record  ->  normalizeListing  ->  toLegacyListing  ->  existing UI
//
// The win is that a v2 record renders in today's UI with no component changes,
// which is what unblocks writing v2 records at all.
//
// This file is scaffolding with a defined end: as components migrate to
// `Listing`, calls to toLegacyListing disappear. When none are left, delete it.

import { exponentFor, fromMinorUnits } from './money.ts';
import type { Listing } from './types.ts';

/**
 * Render minor units back to the decimal string the old UI expects.
 *
 * Uses the currency's own exponent, so JPY comes back as "1000" rather than
 * "1000.00" — the legacy formatPrice would otherwise show "¥1,000.00".
 */
function toLegacyPriceString(amount: number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return '';
  return fromMinorUnits(amount, currency).toFixed(exponentFor(currency));
}

/** The shape the app has always used. Kept structural to avoid a circular import. */
export type LegacyListing = {
  title: string;
  type?: 'goods' | 'service' | 'digital';
  description: string;
  price: string;
  currency?: string;
  category: string;
  condition: string;
  createdAt: string;
  location: {
    state: string;
    county: string;
    locality: string;
    zipPrefix?: string;
    isOnlineStore?: boolean;
  };
  metadata?: Record<string, any>;
  externalUrl?: string;
  hideFromFriends?: boolean;
  labels?: any;
  images?: any[];
  formattedImages?: Array<{ thumbnail: string; fullsize: string; mimeType: string }>;
  uri?: string;
  cid?: string;
  authorDid?: string;
  sellerDid?: string;
  authorHandle?: string;
  authorDisplayName?: string;
  isVerifiedSeller?: boolean;
  [key: string]: any;
};

/**
 * Work out whether a seller is taking commissions.
 *
 * `closed` used to be unreachable: ListingCard renders a badge for it, but the
 * form could only ever produce open or waitlist from the slot count, so the
 * branch was dead. It now comes from the lexicon's own `availability` field
 * rather than a bespoke one — commissionStatus is app state, not something to
 * invent a place in the record for.
 *
 * Slots stay the finer-grained signal: zero slots means a waitlist, which is
 * different from having closed the shop.
 */
function deriveCommissionStatus(
  availability: Listing['availability'],
  slotsAvailable: number | undefined,
): 'open' | 'waitlist' | 'closed' | undefined {
  if (availability === 'out_of_stock' || availability === 'discontinued') return 'closed';
  if (availability === 'backorder' || availability === 'pre_order') return 'waitlist';
  if (slotsAvailable === 0) return 'waitlist';
  if (slotsAvailable === undefined) return availability === 'in_stock' ? 'open' : undefined;
  return 'open';
}

export function toLegacyListing(listing: Listing): LegacyListing {
  const currency = listing.pricing.currency;

  // The old UI reads commission fields off `metadata`, so fold serviceDetails
  // and externalPlatform back into it.
  const metadata: Record<string, any> = {};
  if (listing.subcategory) metadata.subcategory = listing.subcategory;
  if (listing.externalPlatform) metadata.externalPlatform = listing.externalPlatform;
  if (listing.serviceDetails || listing.type === 'service') {
    const { slotsAvailable, turnaroundTime, commissionStatus } = listing.serviceDetails ?? {};
    if (slotsAvailable !== undefined) metadata.slotsAvailable = slotsAvailable;
    if (turnaroundTime !== undefined) metadata.turnaroundTime = turnaroundTime;
    // Derived, never stored. v1 wrote it; v2 does not, so recompute when absent
    // rather than losing the open/waitlist badge on ListingCard.
    metadata.commissionStatus = commissionStatus ?? deriveCommissionStatus(listing.availability, slotsAvailable);
  }

  return {
    title: listing.title,
    description: listing.description,
    price: toLegacyPriceString(listing.pricing.regularPrice, currency),
    currency,
    category: listing.category,
    condition: listing.condition ?? '',
    createdAt: listing.createdAt,

    location: {
      // The old shape had no notion of "unset", so empty strings it is.
      state: listing.location?.region ?? (listing.location?.isRemote ? 'Online' : ''),
      county: listing.location?.legacyCounty ?? (listing.location?.isRemote ? 'Online' : ''),
      locality: listing.location?.locality ?? (listing.location?.isRemote ? 'Online Store' : ''),
      zipPrefix: listing.location?.postalPrefix,
      isOnlineStore: listing.location?.isRemote,
    },

    metadata: Object.keys(metadata).length ? metadata : undefined,
    externalUrl: listing.externalUrl ?? listing.checkoutUrl,
    hideFromFriends: listing.hideFromFriends,
    labels: listing.labels,
    images: listing.images,
    formattedImages: listing.formattedImages,

    uri: listing.uri,
    cid: listing.cid,
    authorDid: listing.authorDid,
    sellerDid: listing.authorDid,
    authorHandle: listing.authorHandle,
    authorDisplayName: listing.authorDisplayName,
    isVerifiedSeller: listing.isVerifiedSeller,

    // Provenance, so UI can offer "update this listing" on old records without
    // having to re-derive which format it came from.
    schemaVersion: listing.schemaVersion,

    // The listing type travels with the listing so consumers stop inferring it
    // from the category. normalize sets it for both record formats, so this is
    // populated even for a v1 record that never stored one.
    type: listing.type,
  };
}

export function toLegacyListings(listings: Listing[]): LegacyListing[] {
  return listings.map(toLegacyListing);
}
