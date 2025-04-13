// src/lib/uri-utils.ts

/**
 * Encodes an AT Protocol URI component
 * @param str The string to encode
 * @returns The encoded string
 */
export function encodeAtUri(str: string): string {
  // Standard encodeURIComponent with additional replacements for AT Protocol
  return encodeURIComponent(str)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\!/g, '%21')
    .replace(/\'/g, '%27')
    .replace(/\*/g, '%2A');
}

/**
 * Decodes an AT Protocol URI component
 * @param str The string to decode
 * @returns The decoded string
 */
export function decodeAtUri(str: string): string {
  return decodeURIComponent(str);
}

/**
 * Creates a full URI string for an AT Protocol resource
 * @param did The DID (Decentralized Identifier)
 * @param collection The collection name
 * @param rkey The record key
 * @returns The full AT URI
 */
export function createAtUri(did: string, collection: string, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`;
}

/**
 * Parses an AT Protocol URI into its components
 * @param uri The AT URI to parse
 * @returns An object containing the URI components
 */
export function parseAtUri(uri: string): { did: string; collection: string; rkey: string } | null {
  const match = uri.match(/^at:\/\/([^\/]+)\/([^\/]+)\/(.+)$/);
  
  if (!match) {
    return null;
  }
  
  return {
    did: match[1],
    collection: match[2],
    rkey: match[3]
  };
}

/**
 * Constructs a URL to view an AT Protocol resource in a browser
 * @param uri The AT Protocol URI
 * @returns A URL to view the resource in a browser
 */
export function getAtProtocolBrowserLink(uri: string): string | null {
  try {
    if (!uri.startsWith('at://')) {
      return null;
    }
    
    // For Bluesky posts, we can use the Bluesky web interface
    if (uri.includes('app.bsky.feed.post')) {
      const parsed = parseAtUri(uri);
      
      if (parsed) {
        return `https://bsky.app/profile/${parsed.did}/post/${parsed.rkey}`;
      }
    }
    
    // For other AT Protocol resources, use the generic AT Protocol browser
    return `https://atproto-browser.vercel.app/at/${encodeURIComponent(uri)}`;
  } catch (error) {
    console.error('Error creating AT Protocol browser link:', error);
    return null;
  }
}