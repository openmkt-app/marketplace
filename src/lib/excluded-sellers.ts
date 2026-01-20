/**
 * List of Bluesky handles that have opted out of having a storefront on OpenMkt.
 * Add handles here (without the @) to exclude them from the platform.
 *
 * Example: 'username.bsky.social'
 */
export const EXCLUDED_SELLERS: string[] = [
  // Add handles below, one per line:
  // 'example.bsky.social',
];

/**
 * Check if a handle is in the exclusion list.
 * Handles comparison in a case-insensitive manner.
 */
export function isSellerExcluded(handle: string): boolean {
  const normalizedHandle = handle.toLowerCase().trim();
  return EXCLUDED_SELLERS.some(
    excluded => excluded.toLowerCase().trim() === normalizedHandle
  );
}
