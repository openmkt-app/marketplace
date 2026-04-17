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

export function isArtistStore(listings: MarketplaceListing[]): boolean {
  if (!listings || listings.length === 0) return false;
  const commissionCount = listings.filter(l => l.category === COMMISSION_CATEGORY_ID).length;
  return commissionCount / listings.length >= ARTIST_STORE_THRESHOLD;
}

export function filterArtistSellers<T extends SellerSummary>(sellers: T[]): T[] {
  return sellers.filter(s => isArtistStore(s.listings ?? []));
}
