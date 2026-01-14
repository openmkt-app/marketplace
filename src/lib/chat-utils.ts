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
 * Open Bluesky to contact the seller
 * Opens the seller's profile where the user can click "Message" to start a chat
 * Note: Bluesky doesn't support direct DM links, so we link to the profile instead
 */
export function contactSellerViaBluesky(
  sellerHandle: string,
  listing: MarketplaceListing
): void {
  // Clean up the handle (remove @ if present)
  const cleanHandle = sellerHandle.startsWith('@') ? sellerHandle.slice(1) : sellerHandle;

  // Bluesky profile URL - users can click "Message" button from the profile
  const blueskyProfileUrl = `https://bsky.app/profile/${cleanHandle}`;

  // Detect if we're on mobile
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    // Try to open Bluesky app with profile URL scheme
    const blueskyAppUrl = `bluesky://profile/${cleanHandle}`;

    // Create a hidden iframe to try the app URL
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = blueskyAppUrl;
    document.body.appendChild(iframe);

    // Fallback to web after a short delay if app doesn't open
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.open(blueskyProfileUrl, '_blank');
    }, 1500);
  } else {
    // Desktop: open web profile
    window.open(blueskyProfileUrl, '_blank');
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
