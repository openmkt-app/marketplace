/**
 * Helper utilities for handling AT Protocol URIs
 */

/**
 * Encodes an AT Protocol URI for use in a URL
 */
export function encodeAtUri(uri: string): string {
  // Make sure it's not already encoded
  const decodedUri = decodeURIComponent(uri);
  return encodeURIComponent(decodedUri);
}

/**
 * Decodes an AT Protocol URI from a URL
 */
export function decodeAtUri(encodedUri: string): string {
  // Handle double-encoding
  try {
    return decodeURIComponent(encodedUri);
  } catch (e) {
    // If it's not properly encoded, return as is
    return encodedUri;
  }
}

/**
 * Extracts parts from an AT Protocol URI
 */
export function parseAtUri(uri: string): { 
  repo: string; 
  collection: string; 
  rkey: string;
  isAtUri: boolean;
} | null {
  // Normalize the URI
  const normalizedUri = decodeAtUri(uri);
  
  // Check if it's an AT Protocol URI
  if (!normalizedUri.startsWith('at://')) {
    return null;
  }
  
  // Parse the URI
  // Format: at://did:plc:xxx/app.bsky.feed.post/rkey
  const parts = normalizedUri.replace('at://', '').split('/');
  
  if (parts.length < 3) {
    return null;
  }
  
  return {
    repo: parts[0],
    collection: parts[1],
    rkey: parts.slice(2).join('/'),
    isAtUri: true
  };
}

/**
 * Gets a human-readable string representation of an AT Protocol URI
 */
export function getReadableAtUri(uri: string): string {
  const parsed = parseAtUri(uri);
  
  if (!parsed) {
    return uri;
  }
  
  return `${parsed.repo} / ${parsed.collection} / ${parsed.rkey}`;
}

/**
 * Gets a link to view the record in the AT Protocol Browser
 */
export function getAtProtocolBrowserLink(uri: string): string | null {
  const parsed = parseAtUri(uri);
  
  if (!parsed) {
    return null;
  }
  
  // Format: https://atproto-browser.vercel.app/at/did:plc:xxx/com.example.record/rkey
  return `https://atproto-browser.vercel.app/at/${parsed.repo}/${parsed.collection}/${parsed.rkey}`;
}
