// Client for the Open Market AppView.
//
// The AppView indexes every listing on the network — both the legacy
// app.openmkt.marketplace.listing collection and app.openmkt.commerce.listing —
// and normalizes them into one shape before we ever see them. That is the whole
// point: one indexed query instead of fanning out to every seller's PDS.
//
// It is a cache of PDS truth, never the source of truth. Every call here has to
// be allowed to fail without taking a page down, which is why the flag exists
// and why callers fall back to the fan-out path.

import { withImageUrls } from './hydrate.ts';
import type { Availability, Listing, ListingType, SchemaVersion } from './types.ts';

const DEFAULT_APPVIEW_URL = 'https://appview.openmkt.app';

/** Base URL. Overridable so local dev can point at a LAN address or a tunnel. */
export function appViewUrl(): string {
  return (process.env.NEXT_PUBLIC_APPVIEW_URL || DEFAULT_APPVIEW_URL).replace(/\/$/, '');
}

/**
 * Whether reads should go through the AppView.
 *
 * Defaults to OFF. The fan-out path stays the default until the AppView has
 * proven itself against real traffic, and stays available afterwards as the
 * fallback — an index that is down must never mean a marketplace that is down.
 */
export function isAppViewEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_APPVIEW === 'true';
}

const NSID = {
  listListings: 'app.openmkt.commerce.listListings',
  getListing: 'app.openmkt.commerce.getListing',
} as const;

const DEFAULT_TIMEOUT_MS = 6000;

type AppViewRecord = Record<string, any>;

async function xrpc<T>(method: string, params: Record<string, string | number | undefined>, timeoutMs: number): Promise<T> {
  const url = new URL(`${appViewUrl()}/xrpc/${method}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
    // The index changes as the firehose delivers records; never serve a stale
    // cached response from the fetch layer.
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`${method} -> HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Map an AppView record onto the canonical Listing.
 *
 * The Lua query script already emits this shape — it performs the same
 * normalization as src/lib/commerce/normalize.ts, on the server side. This is
 * a light adaptation rather than a second normalizer, but it stays defensive:
 * records reaching it have been through a Lua script we deploy separately from
 * this code, so the two can drift.
 */
function toListing(rec: AppViewRecord): Listing | null {
  if (!rec?.uri) return null;

  const did = String(rec.uri).split('/')[2] ?? '';
  const pricing = rec.pricing ?? {};

  return {
    uri: rec.uri,
    cid: rec.cid,
    authorDid: did,
    schemaVersion: (rec.schemaVersion ?? 1) as SchemaVersion,

    type: (rec.type as ListingType) || 'goods',
    title: rec.title || 'Untitled Listing',
    description: rec.description || '',
    shortDescription: rec.shortDescription,
    pricing: {
      regularPrice: pricing.regularPrice ?? null,
      salePrice: pricing.salePrice,
      currency: pricing.currency || 'USD',
      taxInclusive: pricing.taxInclusive,
      saleStartsAt: pricing.saleStartsAt,
      saleEndsAt: pricing.saleEndsAt,
    },
    category: rec.category || '',
    subcategory: rec.subcategory,
    taxonomy: rec.taxonomy,
    tags: rec.tags,
    brand: rec.brand,
    condition: rec.condition,
    createdAt: rec.createdAt || new Date().toISOString(),
    updatedAt: rec.updatedAt,

    availability: rec.availability as Availability | undefined,
    manageStock: rec.manageStock,
    quantity: rec.quantity,
    soldIndividually: rec.soldIndividually,

    sku: rec.sku,
    gtin: rec.gtin,
    partOf: rec.partOf,
    groupedItems: rec.groupedItems,
    specifications: rec.specifications,

    location: rec.location,
    taxStatus: rec.taxStatus,
    taxCategory: rec.taxCategory,
    externalUrl: rec.externalUrl,
    checkoutUrl: rec.checkoutUrl,
    externalPlatform: rec.externalPlatform,

    hideFromFriends: rec.hideFromFriends,
    catalogVisibility: rec.catalogVisibility,
    reviewsAllowed: rec.reviewsAllowed,
    labels: rec.labels,

    goodsDetails: rec.goodsDetails,
    serviceDetails: rec.serviceDetails,
    digitalDetails: rec.digitalDetails,

    images: rec.images,
  };
}

export type ListOptions = {
  limit?: number;
  /** Restrict to one seller — used by store pages. */
  did?: string;
  timeoutMs?: number;
};

/**
 * Cross-seller listings from the index.
 *
 * Returns null rather than throwing, so a caller can fall back to fan-out
 * without a try/catch at every site. A null means "the index did not answer",
 * which is different from an empty array meaning "the index has nothing".
 */
export async function fetchListings(options: ListOptions = {}): Promise<Listing[] | null> {
  const { limit = 50, did, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  try {
    const data = await xrpc<{ records?: AppViewRecord[] }>(NSID.listListings, { limit, did }, timeoutMs);
    const listings = (data.records || [])
      .map(toListing)
      .filter((l): l is Listing => l !== null)
      .map(withImageUrls);
    return listings;
  } catch (err) {
    console.warn('[appview] listListings failed, falling back:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** A single listing by AT URI. Null means the index did not answer. */
export async function fetchListing(uri: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Listing | null> {
  try {
    const data = await xrpc<{ record?: AppViewRecord }>(NSID.getListing, { uri }, timeoutMs);
    const listing = data.record ? toListing(data.record) : null;
    return listing ? withImageUrls(listing) : null;
  } catch (err) {
    console.warn('[appview] getListing failed, falling back:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Liveness check, for diagnostics and the comparison page. */
export async function health(timeoutMs = 3000): Promise<boolean> {
  try {
    const res = await fetch(`${appViewUrl()}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
