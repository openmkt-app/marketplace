// How a seller's name is shown.
//
// Split out of chat-utils because these are pure string helpers but chat-utils
// constructs an AtpAgent to talk to the chat service, so importing them pulled
// the AT Protocol SDK into every listing card — and, through the navbar, into
// every page. Nothing here needs the network.

import type { MarketplaceListing } from './marketplace-client';

export function formatSellerHandle(handle?: string): string {
  if (!handle) return '';
  return handle.startsWith('@') ? handle : `@${handle}`;
}

/**
 * Get the best display name for a seller (prefers display name over handle)
 */
export function getSellerDisplayName(
  listing: MarketplaceListing & { authorHandle?: string; authorDisplayName?: string },
): string {
  if (listing.authorDisplayName && listing.authorDisplayName.trim()) {
    return listing.authorDisplayName;
  }
  if (listing.authorHandle) {
    return formatSellerHandle(listing.authorHandle);
  }
  return 'Unknown Seller';
}

/**
 * What to call a store.
 *
 * The shop record's name wins, but only when the seller actually chose one. A
 * shop is created automatically on their first listing with `name` set to their
 * handle, so preferring it unconditionally would replace every seller's display
 * name with their handle — a worse title that nobody asked for.
 */
export function getStoreName(
  shop: { name?: string } | null | undefined,
  profile: { displayName?: string; handle: string },
): string {
  const shopName = shop?.name?.trim();
  if (shopName && shopName !== profile.handle) return shopName;
  return profile.displayName || profile.handle;
}
