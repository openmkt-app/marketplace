// The only place that builds a v2 record for writing to a PDS.
//
// Deliberately a whitelist, following the pattern in marketplace-client.ts:
// hydrated UI fields (authorHandle, formattedImages, isVerifiedSeller…) must
// never reach the repo. Spreading an app object into a record is how those
// leaked in the first place.

import { COMMERCE_COLLECTION, SHOP_COLLECTION } from './collections.ts';
import { DEFAULT_CURRENCY } from './money.ts';
import type { ListingInput, ShopInput } from './types.ts';

const DETAILS_TYPE = {
  goods: `${COMMERCE_COLLECTION}#goodsDetails`,
  service: `${COMMERCE_COLLECTION}#serviceDetails`,
  digital: `${COMMERCE_COLLECTION}#digitalDetails`,
} as const;

/** Drop undefined/null/empty entries so we never write empty objects. */
function compact<T extends Record<string, any>>(obj: T): Partial<T> | undefined {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? (out as Partial<T>) : undefined;
}

function buildDetails(input: ListingInput): Record<string, any> | undefined {
  const type = input.type;
  const source =
    type === 'goods' ? input.goodsDetails : type === 'service' ? input.serviceDetails : input.digitalDetails;

  if (!source) return undefined;

  // commissionStatus is app state, not a lexicon field — it is derived from
  // slotsAvailable at render time and must not be written.
  const { commissionStatus: _drop, ...rest } = source as Record<string, any>;
  const body = compact(rest);
  if (!body) return undefined;

  return { $type: DETAILS_TYPE[type], ...body };
}

export type BuildOptions = {
  /**
   * Preserve the original creation time. Required when upgrading a v1 record:
   * the legacy update path reset createdAt to now ("bumps to top of feed"), so
   * a silent migration would reshuffle the whole browse order.
   */
  createdAt?: string;
  /** Self-labels union, e.g. NSFW. Built by the caller from form state. */
  labels?: unknown;
};

/**
 * Build an `app.openmkt.commerce.listing` record.
 *
 * Returns a plain object ready for createRecord/putRecord — it does not touch
 * the network or upload blobs; `images` must already be uploaded blob refs.
 */
export function buildListingRecord(input: ListingInput, options: BuildOptions = {}): Record<string, any> {
  const pricing = compact({
    regularPrice: input.pricing?.regularPrice,
    salePrice: input.pricing?.salePrice,
    currency: input.pricing?.currency || DEFAULT_CURRENCY,
    taxInclusive: input.pricing?.taxInclusive,
    saleStartsAt: input.pricing?.saleStartsAt,
    saleEndsAt: input.pricing?.saleEndsAt,
  });

  const record = compact({
    $type: COMMERCE_COLLECTION,

    type: input.type,
    title: input.title,
    description: input.description,
    shortDescription: input.shortDescription,
    pricing,
    category: input.category,
    subcategory: input.subcategory,
    taxonomy: input.taxonomy ? compact(input.taxonomy) : undefined,
    tags: input.tags,
    brand: input.brand,
    condition: input.condition,

    availability: input.availability,
    manageStock: input.manageStock,
    quantity: input.quantity,
    lowStockThreshold: input.lowStockThreshold,
    soldIndividually: input.soldIndividually,

    sku: input.sku,
    gtin: input.gtin,
    shopRef: input.shopRef,
    partOf: input.partOf,
    variantProperties: input.variantProperties,
    groupedItems: input.groupedItems,
    specifications: input.specifications,

    // stripLegacyFields, not compact: `legacyCounty` exists to carry a v1 field
    // through a read, and must never be written back out to a v2 record.
    location: stripLegacyFields(input.location),
    taxStatus: input.taxStatus,
    taxCategory: input.taxCategory,
    externalUrl: input.externalUrl,
    checkoutUrl: input.checkoutUrl,

    hideFromFriends: input.hideFromFriends,
    catalogVisibility: input.catalogVisibility,
    reviewsAllowed: input.reviewsAllowed,

    images: input.images,
    details: buildDetails(input),
    labels: options.labels,

    createdAt: options.createdAt || input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt,
  });

  // compact() returns undefined only for an empty object, which cannot happen
  // here since $type and createdAt are always present.
  return record as Record<string, any>;
}

/**
 * Build an `app.openmkt.commerce.shop` record.
 *
 * Whitelisted like the listing builder, for the same reason: a shop read back
 * from the repo carries `uri` and `ownerDid`, and spreading it into a record
 * would write those straight back.
 *
 * `logo` and `banner` are in the lexicon but not written here. Store pages use
 * the seller's Bluesky avatar and banner, which they already have and can
 * change in one place — a second pair of images to keep in sync is a cost with
 * no benefit until someone asks for it.
 */
export function buildShopRecord(input: ShopInput, createdAt?: string): Record<string, any> {
  const record = compact({
    $type: SHOP_COLLECTION,

    name: input.name,
    description: input.description,
    website: input.website,
    location: stripLegacyFields(input.location),
    policies: input.policies ? compact(input.policies) : undefined,
    handlingTime: input.handlingTime,
    defaultCurrency: input.defaultCurrency,
    shipsTo: input.shipsTo,

    createdAt: createdAt || input.createdAt || new Date().toISOString(),
  });

  return record as Record<string, any>;
}

/**
 * v1's location had no home for `legacyCounty`, and v2 has no `county` field.
 * Dropping it on write is intentional — the field does not survive an upgrade.
 */
export function stripLegacyFields(location?: ListingInput['location']) {
  if (!location) return undefined;
  const { legacyCounty: _drop, ...rest } = location;
  return compact(rest);
}
