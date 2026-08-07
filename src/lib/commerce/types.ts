// Canonical listing shape.
//
// Both record formats normalize into this: the legacy
// app.openmkt.marketplace.listing (v1) and app.openmkt.commerce.listing (v2).
// Nothing outside src/lib/commerce should branch on which one a listing came
// from — read `schemaVersion` only for provenance-aware UI (e.g. nudging a
// seller to re-save an old listing), never to decide how to read a field.

export type SchemaVersion = 1 | 2;

export type ListingType = 'goods' | 'service' | 'digital';

export type Availability = 'in_stock' | 'out_of_stock' | 'backorder' | 'pre_order' | 'discontinued';

export type CatalogVisibility = 'visible' | 'catalog' | 'search' | 'hidden';

export type TaxStatus = 'taxable' | 'shipping' | 'none';

export type CommissionStatus = 'open' | 'waitlist' | 'closed';

export type Pricing = {
  /**
   * Minor currency units. Null means the seller named no price — show "make an
   * offer", not "free". Zero means genuinely free, which is a different claim.
   */
  regularPrice: number | null;
  salePrice?: number | null;
  currency: string;
  /**
   * Whether the amounts already include tax. Undefined means unknown — v1 never
   * recorded it, and defaulting to false would misprice every VAT-inclusive
   * seller. Treat undefined as "do not claim either way" in the UI.
   */
  taxInclusive?: boolean;
  saleStartsAt?: string;
  saleEndsAt?: string;
};

export type CommerceLocation = {
  /** ISO 3166-1 alpha-2. Undefined for v1, which was US-only but never said so. */
  countryCode?: string;
  region?: string;
  locality?: string;
  postalPrefix?: string;
  isRemote?: boolean;
  /** v1's `county`, which has no home in the new model. Drop once v1 is gone. */
  legacyCounty?: string;
};

export type Specification = { name: string; value: string };

export type TaxonomyRef = { scheme: string; id: string; version?: string; path?: string };

export type GroupedItem = { item: string; quantity: number; title?: string };

export type Dimensions = { length?: number; width?: number; height?: number };

export type GoodsDetails = {
  shippingWeight?: number;
  dimensions?: Dimensions;
  shippingClass?: string;
  shippingRequired?: boolean;
};

export type ServiceDetails = {
  slotsAvailable?: number;
  turnaroundTime?: string;
  /** Not in the lexicon — carried from v1 metadata and still rendered today. */
  commissionStatus?: CommissionStatus;
};

export type DigitalDetails = {
  fileFormats?: string[];
  fileSize?: number;
  downloadLimit?: number;
  downloadExpiryDays?: number;
  deliveryMethod?: string;
};

/** Raw AT Proto blob ref as stored on the record. */
export type ImageBlob = {
  ref?: { $link: string };
  mimeType?: string;
  size?: number;
};

export type FormattedImage = {
  thumbnail: string;
  fullsize: string;
  mimeType: string;
};

export type Listing = {
  // --- identity ---
  uri: string;
  cid?: string;
  authorDid: string;
  /** Which record format this came from. Provenance only. */
  schemaVersion: SchemaVersion;

  // --- core ---
  type: ListingType;
  title: string;
  description: string;
  shortDescription?: string;
  pricing: Pricing;
  /**
   * The seller will consider offers. A price alongside it is a guide.
   *
   * Exists so "I do not know what this is worth" has an honest home. Without
   * it, sellers write 0 and explain themselves in the description, which sorts
   * first and makes free filters useless.
   */
  acceptingOffers?: boolean;
  category: string;
  subcategory?: string;
  taxonomy?: TaxonomyRef;
  tags?: string[];
  brand?: string;
  condition?: string;
  createdAt: string;
  updatedAt?: string;

  // --- inventory ---
  availability?: Availability;
  manageStock?: boolean;
  quantity?: number;
  lowStockThreshold?: number;
  soldIndividually?: boolean;

  // --- identifiers & structure ---
  sku?: string;
  gtin?: string;
  /** AT URI of the seller's shop record. Required by the lexicon on write. */
  shopRef?: string;
  partOf?: string;
  variantProperties?: Array<{ axis: string; value?: string }>;
  groupedItems?: GroupedItem[];
  specifications?: Specification[];

  // --- commerce ---
  location?: CommerceLocation;
  taxStatus?: TaxStatus;
  taxCategory?: string;
  externalUrl?: string;
  checkoutUrl?: string;
  /** v1 metadata.externalPlatform — drives the "Buy on Etsy" style badge. */
  externalPlatform?: string;

  // --- visibility ---
  hideFromFriends?: boolean;
  catalogVisibility?: CatalogVisibility;
  reviewsAllowed?: boolean;
  labels?: unknown;

  // --- type-specific ---
  goodsDetails?: GoodsDetails;
  serviceDetails?: ServiceDetails;
  digitalDetails?: DigitalDetails;

  // --- media ---
  images?: ImageBlob[];
  formattedImages?: FormattedImage[];

  // --- hydration, never written to a record ---
  authorHandle?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  isVerifiedSeller?: boolean;
};

/**
 * A seller's shop: one record per repo, at rkey `self`.
 *
 * Every listing points at one via `shopRef`, which the lexicon requires, so a
 * shop exists for every seller who has ever saved a listing — created with just
 * their handle until they fill the rest in.
 */
export type ShopPolicies = {
  returns?: string;
  shipping?: string;
  terms?: string;
  privacy?: string;
};

/**
 * Whether a shop is trading. Absent means open, so no existing record has to
 * be touched for a seller to carry on as they are.
 */
export type ShopStatus = 'open' | 'vacation' | 'closed';

export type Shop = {
  uri: string;
  cid?: string;
  ownerDid: string;

  name: string;
  description?: string;
  status?: ShopStatus;
  /** Shown to buyers while the shop is not open, e.g. "Back on the 20th". */
  statusMessage?: string;
  /** What the seller tells buyers, not an instruction to any server. */
  reopensAt?: string;
  website?: string;
  location?: CommerceLocation;
  policies?: ShopPolicies;
  /** Free text, e.g. "1-3 business days". */
  handlingTime?: string;
  /** ISO 4217 code this shop normally prices in. */
  defaultCurrency?: string;
  /** ISO 3166-1 alpha-2 codes. Absent means the seller has not said. */
  shipsTo?: string[];
  createdAt: string;
};

/** What the shop form produces, before it becomes a record. */
export type ShopInput = Omit<Shop, 'uri' | 'cid' | 'ownerDid' | 'createdAt'> & {
  createdAt?: string;
};

/** What the create/edit form produces, before it becomes a record. */
export type ListingInput = Omit<
  Listing,
  | 'uri' | 'cid' | 'authorDid' | 'schemaVersion' | 'createdAt'
  | 'formattedImages' | 'authorHandle' | 'authorDisplayName'
  | 'authorAvatarUrl' | 'isVerifiedSeller'
> & {
  createdAt?: string;
};
