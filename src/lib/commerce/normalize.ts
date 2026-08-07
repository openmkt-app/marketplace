// The only place in the app that knows two record formats exist.
//
// Everything downstream consumes `Listing`. If you find yourself checking
// `$type` or reading `record.price` anywhere else, it belongs here instead.
//
// NOTE: happyview/scripts/listListings.lua does the same job for records read
// through the AppView. Keep the two in step — the currency exponents, the
// digital_arts mapping, and the "Online" sentinel handling all exist twice.

import { COMMERCE_COLLECTION, collectionFromUri, didFromUri, LEGACY_COLLECTION } from './collections.ts';
import { DEFAULT_CURRENCY, toMinorUnits } from './money.ts';
import type {
  Availability,
  CommerceLocation,
  ImageBlob,
  Listing,
  ListingType,
  Pricing,
  Shop,
  ShopStatus,
} from './types.ts';

export type RecordIdentity = {
  uri: string;
  cid?: string;
  authorDid?: string;
};

/**
 * v1 had no listing type. `digital_arts` was the de-facto services category and
 * is what artist-store detection keys on today (artist-store-utils.ts).
 */
export const LEGACY_SERVICE_CATEGORY = 'digital_arts';

/** Etsy import wrote categories that were never in CATEGORIES (etsy-client.ts). */
const ORPHAN_CATEGORY_MAP: Record<string, string> = {
  vintage: 'collectibles',
  handmade: 'other',
  digital: 'hobbies',
};

/**
 * "Free Stuff" was a category, and it carried a parallel copy of the taxonomy:
 * Free Clothing, Free Furniture, Free Household and so on. A free sofa was
 * therefore invisible to anyone browsing Furniture, and being free — a fact
 * about price — cost the seller the ability to say what the thing was.
 *
 * Free is now a price of zero in whatever category the item actually belongs
 * to. Records written under the old scheme are mapped here, using the old
 * subcategory to recover the real category. Their price is already 0, because
 * the form forced it.
 */
const FREE_CATEGORY = 'free';

const FREE_SUBCATEGORY_TO_CATEGORY: Record<string, string> = {
  clothing: 'apparel',
  electronics: 'electronics',
  furniture: 'furniture',
  household: 'home_goods',
  toys: 'kids',
  other_free: 'other',
};

/** The old English display names, which is what v1 records actually stored. */
const FREE_SUBCATEGORY_NAMES: Record<string, string> = {
  'free clothing': 'clothing',
  'free electronics': 'electronics',
  'free furniture': 'furniture',
  'free household': 'household',
  'free toys & games': 'toys',
  'other free items': 'other_free',
};

/**
 * Recover a real category for a record filed under "Free Stuff".
 *
 * Falls back to `other` rather than dropping the listing out of every category
 * listing: an uncategorised item is findable, an item in a category that no
 * longer exists is not.
 */
function categoryForFreeListing(subcategory: string | undefined): string {
  if (!subcategory) return 'other';
  const raw = subcategory.trim().toLowerCase();
  const id = FREE_SUBCATEGORY_NAMES[raw] ?? raw;
  return FREE_SUBCATEGORY_TO_CATEGORY[id] ?? 'other';
}

type RawRecord = Record<string, any>;
type Identity = RecordIdentity;

/**
 * Exported because the write path needs the same rule: a listing created from
 * the old form has no `type` field, so both directions must agree on what
 * `digital_arts` means. Phase 5 replaces this with a real discriminator.
 */
export function inferListingType(category: string | undefined): ListingType {
  return category === LEGACY_SERVICE_CATEGORY ? 'service' : 'goods';
}

export function normalizeCategory(category: string | undefined): string {
  if (!category) return '';
  return ORPHAN_CATEGORY_MAP[category] ?? category;
}

/**
 * Resolve a stored category/subcategory pair to the one the app should use.
 *
 * The single place that knows about categories that no longer mean what they
 * say: the Etsy import's orphans, and "Free Stuff". Exported because the
 * AppView path builds its listings from an already-indexed record and would
 * otherwise need its own copy — which is how the orphan mapping came to apply
 * on one read path and not the other.
 */
export function resolveListingCategory(
  category: string | undefined,
  subcategory: string | undefined,
): { category: string; subcategory: string | undefined } {
  if (category === FREE_CATEGORY) {
    return { category: categoryForFreeListing(subcategory), subcategory: undefined };
  }
  return { category: normalizeCategory(category), subcategory };
}

function normalizeLegacyLocation(loc: RawRecord | undefined): CommerceLocation | undefined {
  if (!loc || typeof loc !== 'object') return undefined;

  // v1 wrote literal "Online" sentinels into state/county/locality for online
  // stores. Carrying those through would surface them as real place names.
  if (loc.isOnlineStore) return { isRemote: true };

  const out: CommerceLocation = { isRemote: false };
  if (loc.state) out.region = loc.state;
  if (loc.locality) out.locality = loc.locality;
  if (loc.zipPrefix) out.postalPrefix = loc.zipPrefix;
  if (loc.county) out.legacyCounty = loc.county;
  // countryCode deliberately unset: v1 was US-only in practice but never said
  // so, and guessing puts wrong data into every downstream consumer.
  return out;
}

function normalizeV1(record: RawRecord, id: Identity): Listing {
  const meta = (record.metadata ?? {}) as RawRecord;
  const resolved = resolveListingCategory(record.category, meta.subcategory);
  const category = resolved.category;
  const type = inferListingType(record.category);
  const currency = record.currency || DEFAULT_CURRENCY;

  const pricing: Pricing = {
    regularPrice: toMinorUnits(record.price, currency),
    currency,
    // taxInclusive intentionally absent — v1 never recorded it.
  };

  const listing: Listing = {
    uri: id.uri,
    cid: id.cid,
    authorDid: id.authorDid ?? didFromUri(id.uri) ?? '',
    schemaVersion: 1,

    type,
    title: record.title || 'Untitled Listing',
    description: record.description || '',
    pricing,
    category,
    subcategory: resolved.subcategory,
    condition: record.condition || undefined,
    createdAt: record.createdAt || new Date().toISOString(),

    location: normalizeLegacyLocation(record.location),
    externalUrl: record.externalUrl,
    externalPlatform: meta.externalPlatform,
    hideFromFriends: record.hideFromFriends,
    labels: record.labels,
    images: record.images as ImageBlob[] | undefined,
  };

  if (type === 'service') {
    listing.serviceDetails = {
      slotsAvailable: meta.slotsAvailable,
      turnaroundTime: meta.turnaroundTime,
      commissionStatus: meta.commissionStatus,
    };
  }

  return listing;
}

function normalizeV2(record: RawRecord, id: Identity): Listing {
  const details = (record.details ?? {}) as RawRecord;
  const resolvedCategory = resolveListingCategory(record.category, record.subcategory);
  const detailsType: string | undefined = details.$type;

  const listing: Listing = {
    uri: id.uri,
    cid: id.cid,
    authorDid: id.authorDid ?? didFromUri(id.uri) ?? '',
    schemaVersion: 2,

    type: (record.type as ListingType) || 'goods',
    title: record.title || 'Untitled Listing',
    description: record.description || '',
    shortDescription: record.shortDescription,
    acceptingOffers: record.acceptingOffers,
    pricing: {
      regularPrice: record.pricing?.regularPrice ?? null,
      salePrice: record.pricing?.salePrice,
      currency: record.pricing?.currency || DEFAULT_CURRENCY,
      taxInclusive: record.pricing?.taxInclusive,
      saleStartsAt: record.pricing?.saleStartsAt,
      saleEndsAt: record.pricing?.saleEndsAt,
    },
    category: resolvedCategory.category,
    subcategory: resolvedCategory.subcategory,
    taxonomy: record.taxonomy,
    tags: record.tags,
    brand: record.brand,
    condition: record.condition,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt,

    availability: record.availability as Availability | undefined,
    manageStock: record.manageStock,
    quantity: record.quantity,
    lowStockThreshold: record.lowStockThreshold,
    soldIndividually: record.soldIndividually,

    sku: record.sku,
    gtin: record.gtin,
    shopRef: record.shopRef,
    partOf: record.partOf,
    variantProperties: record.variantProperties,
    groupedItems: record.groupedItems,
    specifications: record.specifications,

    location: record.location,
    taxStatus: record.taxStatus,
    taxCategory: record.taxCategory,
    externalUrl: record.externalUrl,
    checkoutUrl: record.checkoutUrl,

    hideFromFriends: record.hideFromFriends,
    catalogVisibility: record.catalogVisibility,
    reviewsAllowed: record.reviewsAllowed,
    labels: record.labels,
    images: record.images as ImageBlob[] | undefined,
  };

  // The `details` union carries a $type; split it into the typed slot so
  // consumers do not have to unpack a union.
  if (detailsType?.endsWith('#goodsDetails')) listing.goodsDetails = details;
  else if (detailsType?.endsWith('#serviceDetails')) listing.serviceDetails = details;
  else if (detailsType?.endsWith('#digitalDetails')) listing.digitalDetails = details;

  return listing;
}

/**
 * Normalize a PDS record of either format.
 *
 * Shape is decided by the URI's collection where available, falling back to
 * `$type`, then to a structural check. A v2 record always has `pricing`; a v1
 * record always has a bare `price`.
 */
export function normalizeListing(record: RawRecord, id: Identity): Listing {
  const collection = collectionFromUri(id.uri) ?? record.$type;

  if (collection === COMMERCE_COLLECTION) return normalizeV2(record, id);
  if (collection === LEGACY_COLLECTION) return normalizeV1(record, id);

  // Unknown or missing collection — decide structurally rather than guessing.
  return record.pricing ? normalizeV2(record, id) : normalizeV1(record, id);
}

/**
 * Normalize an `app.openmkt.commerce.shop` record.
 *
 * There is no v1 shop — the collection was introduced with the commerce
 * lexicon — so this is a straight read rather than a two-format merge. It
 * exists so nothing outside this module reads a raw shop record, which is the
 * same rule listings follow.
 */
export function normalizeShop(record: RawRecord, id: Identity): Shop {
  return {
    uri: id.uri,
    cid: id.cid,
    ownerDid: id.authorDid ?? didFromUri(id.uri) ?? '',

    // `name` is required by the lexicon, but a record written by an older
    // client or hand-edited might not have it; the owner's DID is a poor name
    // but better than rendering "undefined" as a shop title.
    name: record.name || id.authorDid || 'Shop',
    description: record.description,
    status: record.status as ShopStatus | undefined,
    statusMessage: record.statusMessage,
    reopensAt: record.reopensAt,
    website: record.website,
    location: record.location,
    policies: record.policies,
    handlingTime: record.handlingTime,
    defaultCurrency: record.defaultCurrency,
    shipsTo: Array.isArray(record.shipsTo) ? record.shipsTo : undefined,
    createdAt: record.createdAt || new Date().toISOString(),
  };
}
