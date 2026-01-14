// src/lib/chat-utils.ts

import type { MarketplaceListing } from './marketplace-client';

/**
 * Generate a pre-filled message for contacting a seller about a listing
 */
export function generateSellerMessage(listing: MarketplaceListing): string {
  const listingUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  return `Hi! I'm interested in your listing: "${listing.title}" - ${listing.price}. Is this still available?

Listing: ${listingUrl}`;
}

/**
 * Open Bluesky chat with the seller
 * This function attempts to open the Bluesky app or website with a pre-filled message
 */
export function contactSellerViaBluesky(
  sellerHandle: string, 
  listing: MarketplaceListing
): void {
  const message = generateSellerMessage(listing);
  const encodedMessage = encodeURIComponent(message);
  
  // Try to open the Bluesky app first (mobile), then fallback to web
  const blueskyAppUrl = `bluesky://dm/${sellerHandle}?text=${encodedMessage}`;
  const blueskyWebUrl = `https://bsky.app/messages/${sellerHandle}?text=${encodedMessage}`;
  
  // Detect if we're on mobile
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (isMobile) {
    // Try app first, fallback to web
    try {
      window.location.href = blueskyAppUrl;
      // Fallback to web after a short delay if app doesn't open
      setTimeout(() => {
        window.open(blueskyWebUrl, '_blank');
      }, 2000);
    } catch (error) {
      // If app fails, open web version
      window.open(blueskyWebUrl, '_blank');
    }
  } else {
    // Desktop: just open web version
    window.open(blueskyWebUrl, '_blank');
  }
}

/**
 * Check if we can contact this seller (has valid handle)
 */
export function canContactSeller(listing: MarketplaceListing & { authorHandle?: string }): boolean {
  return !!(listing.authorHandle && listing.authorHandle.trim());
}

/**
 * Format seller handle for display (ensure it starts with @)
 */
export function formatSellerHandle(handle?: string): string {
  if (!handle) return '';
  return handle.startsWith('@') ? handle : `@${handle}`;
}

/**
 * Get the best display name for a seller (prefers display name over handle)
 */
export function getSellerDisplayName(listing: MarketplaceListing & { authorHandle?: string; authorDisplayName?: string }): string {
  if (listing.authorDisplayName && listing.authorDisplayName.trim()) {
    return listing.authorDisplayName;
  }
  if (listing.authorHandle) {
    return formatSellerHandle(listing.authorHandle);
  }
  return 'Unknown Seller';
}

/**
 * Alternative: Open a simple contact modal with seller info
 * Use this if direct Bluesky integration doesn't work as expected
 */
export function showContactInfo(
  sellerHandle: string, 
  listing: MarketplaceListing
): void {
  const message = generateSellerMessage(listing);
  const formattedHandle = formatSellerHandle(sellerHandle);
  
  alert(`To contact the seller:

1. Open Bluesky app or visit bsky.app
2. Send a message to: ${formattedHandle}
3. Suggested message:

${message}`);
}
