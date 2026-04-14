// src/lib/content-labels.ts
// Utilities for AT Protocol content labels (self-labels and external labels)

/**
 * List of label values that should trigger a content blur.
 * These align with the AT Protocol / Bluesky labeler standards.
 */
const BLUR_LABEL_VALUES = ['nsfw', 'porn', 'sexual', 'nudity', 'graphic-media'];

/**
 * Check if a listing's labels contain any NSFW / graphic content flags.
 * Supports the standard `com.atproto.label.defs#selfLabels` shape:
 *   { $type: "com.atproto.label.defs#selfLabels", values: [{ val: "nsfw" }] }
 *
 * Also handles bare arrays for defensive compatibility.
 */
export function hasNsfwLabel(labels: any): boolean {
  if (!labels) return false;

  // Standard selfLabels shape: { values: [{ val: "nsfw" }] }
  if (labels.values && Array.isArray(labels.values)) {
    return labels.values.some(
      (label: any) =>
        typeof label.val === 'string' &&
        BLUR_LABEL_VALUES.includes(label.val.toLowerCase())
    );
  }

  // Fallback: bare array of { val: "..." }
  if (Array.isArray(labels)) {
    return labels.some(
      (label: any) =>
        typeof label.val === 'string' &&
        BLUR_LABEL_VALUES.includes(label.val.toLowerCase())
    );
  }

  return false;
}

/**
 * Check if a listing should be blurred — either by self-labels OR by admin moderation.
 * @param labels  The listing's ATProto labels object
 * @param uri     The listing URI
 * @param flaggedUris  Set of URIs flagged by admin moderation
 */
export function shouldBlurListing(labels: any, uri?: string, flaggedUris?: Set<string>): boolean {
  if (hasNsfwLabel(labels)) return true;
  if (uri && flaggedUris && flaggedUris.has(uri)) return true;
  return false;
}
