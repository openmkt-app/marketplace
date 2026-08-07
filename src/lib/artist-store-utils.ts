import type { MarketplaceListing } from './marketplace-client';

export interface SellerSummary {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  listingsCount: number;
  listings?: MarketplaceListing[];
}

export const COMMISSION_CATEGORY_ID = 'digital_arts';
const ARTIST_STORE_THRESHOLD = 0.5;

/**
 * Does this listing offer a service rather than a thing?
 *
 * Reads the listing's own `type`, which the commerce normalizer sets for both
 * record formats. The category fallback is for listings that never went
 * through it — a raw record spread straight into the UI — and is the old rule
 * verbatim, so it cannot change any answer it used to give.
 */
function isServiceListing(listing: MarketplaceListing): boolean {
  if (listing.type) return listing.type === 'service';
  return listing.category === COMMISSION_CATEGORY_ID;
}

/**
 * Whether a seller belongs in the Gallery rather than the Mall.
 *
 * This used to key on the `digital_arts` category, which made Gallery/Mall
 * routing a side effect of a category choice — a seller could not offer
 * commissions in any other category, and picking that category put them in the
 * Gallery whether they meant to or not. It now keys on the listing type, which
 * sellers set deliberately.
 *
 * The threshold stays: one commission among twenty sold items does not make
 * someone a commission artist.
 */
export function isArtistStore(listings: MarketplaceListing[]): boolean {
  if (!listings || listings.length === 0) return false;
  const commissionCount = listings.filter(isServiceListing).length;
  return commissionCount / listings.length >= ARTIST_STORE_THRESHOLD;
}

export function filterArtistSellers<T extends SellerSummary>(sellers: T[]): T[] {
  return sellers.filter(s => isArtistStore(s.listings ?? []));
}
