// Compatibility adapter: the form's v1-shaped output -> canonical ListingInput.
//
// The mirror of legacy.ts. That file turns a canonical Listing into the shape
// the old UI reads; this one turns what the old form produces into the shape
// serialize.ts writes. Both exist so the write path could move to the commerce
// lexicon without first rewriting a 1951-line form.
//
// When CreateListingForm produces a ListingInput directly (Phase 5), this file
// is only needed for the Etsy importer, and can shrink to that.

import { inferListingType, normalizeCategory } from './normalize.ts';
import { toMinorUnits } from './money.ts';
import { DEFAULT_CURRENCY } from './money.ts';
import type { BillingPeriod, CommerceLocation, ListingInput, ListingType, ServiceDetails } from './types.ts';

/** What CreateListingForm and etsy-client build today. */
export type LegacyListingInput = {
  title: string;
  /** Set by the form. Falls back to inferring from the category when absent. */
  type?: ListingType;
  description: string;
  price: string;
  /** Blank or absent means no sale. */
  salePrice?: string;
  saleStartsAt?: string;
  saleEndsAt?: string;
  /** Absent means a one-off price, which is what it always used to be. */
  billingPeriod?: BillingPeriod;
  taxInclusive?: boolean;
  acceptingOffers?: boolean;
  currency?: string;
  sku?: string;
  gtin?: string;
  brand?: string;
  tags?: string[];
  specifications?: Array<{ name: string; value?: string }>;
  manageStock?: boolean;
  quantity?: number;
  lowStockThreshold?: number;
  soldIndividually?: boolean;
  shippingWeight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  category: string;
  condition?: string;
  /** AT URI of the productGroup this listing is one option of. */
  partOf?: string;
  /** Which option this listing is, e.g. [{axis: 'Tier', value: 'Professional'}]. */
  variantProperties?: Array<{ axis: string; value?: string }>;
  location?: {
    state?: string;
    county?: string;
    locality?: string;
    zipPrefix?: string;
    isOnlineStore?: boolean;
  };
  metadata?: Record<string, any>;
  externalUrl?: string;
  hideFromFriends?: boolean;
  isNsfw?: boolean;
};

/**
 * v1 wrote the literal strings "Online" / "Online Store" into state, county and
 * locality for online sellers. Those are sentinels, not places, so they become
 * `isRemote` and nothing else.
 *
 * `county` has no home in the new model and is dropped here rather than carried
 * as `legacyCounty` — that field exists for reading old records, not for
 * smuggling a dead field into a new one.
 */
function toCommerceLocation(loc: LegacyListingInput['location']): CommerceLocation | undefined {
  if (!loc) return undefined;
  if (loc.isOnlineStore) return { isRemote: true };

  const out: CommerceLocation = { isRemote: false };
  if (loc.state) out.region = loc.state;
  if (loc.locality) out.locality = loc.locality;
  if (loc.zipPrefix) out.postalPrefix = loc.zipPrefix;

  // Nothing was actually said, so say nothing. Writing { isRemote: false }
  // asserts "this has a physical location" for a listing with no location.
  if (!out.region && !out.locality && !out.postalPrefix) return undefined;

  // Only claim a country when there is a place to attach it to. The form is
  // still US-only, and an empty location with countryCode: "US" would assert
  // something the seller never said.
  out.countryCode = 'US';

  return out;
}

function toServiceDetails(metadata: Record<string, any> | undefined): ServiceDetails | undefined {
  if (!metadata) return undefined;
  const details: ServiceDetails = {};
  if (typeof metadata.slotsAvailable === 'number') details.slotsAvailable = metadata.slotsAvailable;
  if (metadata.turnaroundTime) details.turnaroundTime = metadata.turnaroundTime;
  // commissionStatus is deliberately not carried: it is derived from
  // slotsAvailable at render time (legacy.ts) and is not a lexicon field.
  return Object.keys(details).length ? details : undefined;
}

/**
 * Build the self-labels union the record carries for NSFW listings.
 *
 * Same shape the v1 write path used, kept here so the two write call sites do
 * not each construct it.
 */
export function buildSelfLabels(isNsfw?: boolean) {
  if (!isNsfw) return undefined;
  return {
    $type: 'com.atproto.label.defs#selfLabels',
    values: [{ val: 'nsfw' }],
  };
}

/**
 * Convert the form's output into a canonical ListingInput.
 *
 * `images` is not handled here — blobs are uploaded by the client and attached
 * afterwards, because this function must stay free of network calls.
 *
 * Known loss: `metadata.externalPlatform`. The commerce lexicon has no field
 * for it and inventing one in a schema we share with Niizuki is worse than
 * losing it. StoreCard already falls back to detectPlatform(externalUrl), which
 * covers every platform except a custom domain that only the async probe can
 * identify.
 */
export function toListingInput(input: LegacyListingInput): ListingInput {
  const currency = input.currency || DEFAULT_CURRENCY;
  const category = normalizeCategory(input.category);
  // The form's own answer wins. Inference is the fallback for callers that do
  // not ask — the Etsy importer, and any older caller — and for v1 records,
  // which never had a type field to read.
  const type = input.type ?? inferListingType(input.category);

  const listingInput: ListingInput = {
    type,
    title: input.title,
    description: input.description,
    pricing: {
      regularPrice: toMinorUnits(input.price, currency),
      // toMinorUnits returns null for a blank field, which is exactly "no
      // sale" — the same value an absent sale price has.
      salePrice: toMinorUnits(input.salePrice, currency),
      currency,
      // Left unset when the seller did not say. Defaulting either way would
      // misprice every seller on the other side of the tax line.
      taxInclusive: input.taxInclusive,
      saleStartsAt: input.saleStartsAt,
      saleEndsAt: input.saleEndsAt,
      billingPeriod: input.billingPeriod,
    },
    acceptingOffers: input.acceptingOffers,
    category,
    subcategory: input.metadata?.subcategory,
    condition: input.condition || undefined,
    location: toCommerceLocation(input.location),
    externalUrl: input.externalUrl,
    hideFromFriends: input.hideFromFriends,

    // A variant only makes sense as part of a group, so the pair travels
    // together: variantProperties without partOf names an axis on nothing.
    ...(input.partOf
      ? { partOf: input.partOf, variantProperties: input.variantProperties }
      : {}),

    sku: input.sku,
    gtin: input.gtin,
    brand: input.brand,
    tags: input.tags,
    specifications: input.specifications,
    manageStock: input.manageStock,
    quantity: input.quantity,
    lowStockThreshold: input.lowStockThreshold,
    soldIndividually: input.soldIndividually,
  };

  // Weight and dimensions describe a physical thing, so they only exist on a
  // goods listing. A service with a shipping weight would be nonsense.
  //
  // `dimensions` is dropped unless at least one side was given: compact() does
  // not recurse, so an empty object would otherwise be written as one.
  const dims = input.dimensions;
  const hasDims = !!dims && (dims.length !== undefined || dims.width !== undefined || dims.height !== undefined);
  if (type === 'goods' && (input.shippingWeight !== undefined || hasDims)) {
    listingInput.goodsDetails = {
      shippingWeight: input.shippingWeight,
      dimensions: hasDims ? dims : undefined,
    };
  }

  if (type === 'service') {
    listingInput.serviceDetails = toServiceDetails(input.metadata);
  }

  return listingInput;
}
