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
