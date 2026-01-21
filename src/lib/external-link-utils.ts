// src/lib/external-link-utils.ts
// Utility functions for processing external commerce links with affiliate tracking

/**
 * Affiliate configuration for supported platforms.
 * Each platform has its own affiliate parameter format.
 * To add a new platform:
 * 1. Add entry to AFFILIATE_CONFIG with domain patterns
 * 2. Set the affiliateParam (query parameter name)
 * 3. Set the affiliateValue (your affiliate ID)
 */
interface AffiliateConfig {
  /** Human-readable platform name */
  name: string;
  /** Domain patterns to match (without protocol) */
  domains: string[];
  /** Query parameter name for affiliate tracking */
  affiliateParam: string;
  /** Affiliate ID value */
  affiliateValue: string;
  /** Whether this platform is currently enabled */
  enabled: boolean;
}

// Affiliate configuration table - update values with actual affiliate IDs when available
export const AFFILIATE_CONFIG: Record<string, AffiliateConfig> = {
  amazon: {
    name: 'Amazon',
    domains: ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.es', 'amazon.it', 'amazon.co.jp', 'amzn.to'],
    affiliateParam: 'tag',
    affiliateValue: 'openmkt-20', // Placeholder - replace with actual Amazon Associates ID
    enabled: true,
  },
  ebay: {
    name: 'eBay',
    domains: ['ebay.com', 'ebay.co.uk', 'ebay.ca', 'ebay.de', 'ebay.fr', 'ebay.es', 'ebay.it', 'ebay.com.au'],
    affiliateParam: 'campid',
    affiliateValue: 'openmkt', // Placeholder - replace with actual eBay Partner Network ID
    enabled: true,
  },
  etsy: {
    name: 'Etsy',
    domains: ['etsy.com'],
    affiliateParam: 'ref',
    affiliateValue: 'openmkt',
    enabled: true,
  },
  mercari: {
    name: 'Mercari',
    domains: ['mercari.com', 'jp.mercari.com'],
    affiliateParam: 'ref',
    affiliateValue: 'openmkt',
    enabled: true,
  },
  poshmark: {
    name: 'Poshmark',
    domains: ['poshmark.com', 'poshmark.ca'],
    affiliateParam: 'ref',
    affiliateValue: 'openmkt',
    enabled: true,
  },
  depop: {
    name: 'Depop',
    domains: ['depop.com'],
    affiliateParam: 'ref',
    affiliateValue: 'openmkt',
    enabled: true,
  },
  facebook: {
    name: 'Facebook Marketplace',
    domains: ['facebook.com/marketplace', 'fb.com/marketplace'],
    affiliateParam: 'ref',
    affiliateValue: 'openmkt',
    enabled: false, // Facebook doesn't support traditional affiliate params
  },
  craigslist: {
    name: 'Craigslist',
    domains: ['craigslist.org'],
    affiliateParam: 'ref',
    affiliateValue: 'openmkt',
    enabled: false, // Craigslist doesn't support affiliate params
  },
  shopify: {
    name: 'Shopify',
    domains: [], // Shopify stores use custom domains, detected via HTTP headers/HTML
    affiliateParam: '',
    affiliateValue: '',
    enabled: false, // No affiliate program, but badge display is supported
  },
  woocommerce: {
    name: 'WooCommerce',
    domains: [], // WooCommerce stores use custom domains
    affiliateParam: '',
    affiliateValue: '',
    enabled: false,
  },
  bigcommerce: {
    name: 'BigCommerce',
    domains: [], // BigCommerce stores use custom domains
    affiliateParam: '',
    affiliateValue: '',
    enabled: false,
  },
  squarespace: {
    name: 'Squarespace',
    domains: [], // Squarespace stores use custom domains
    affiliateParam: '',
    affiliateValue: '',
    enabled: false,
  },
};

export interface ProcessedLink {
  /** The original URL before processing */
  originalUrl: string;
  /** The processed URL with affiliate params (if applicable) */
  processedUrl: string;
  /** Whether the URL is valid */
  isValid: boolean;
  /** The detected platform, if any */
  platform: string | null;
  /** Platform display name */
  platformName: string | null;
  /** Whether affiliate tracking was applied */
  hasAffiliateTracking: boolean;
  /** Error message if URL is invalid */
  error?: string;
}

/**
 * Validates a URL string
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects the platform from a URL
 */
export function detectPlatform(url: string): { key: string; config: AffiliateConfig } | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const fullPath = hostname + parsed.pathname;

    for (const [key, config] of Object.entries(AFFILIATE_CONFIG)) {
      for (const domain of config.domains) {
        // Check if hostname matches domain or if full path starts with domain (for paths like facebook.com/marketplace)
        if (hostname === domain || hostname.endsWith('.' + domain) || fullPath.startsWith(domain)) {
          return { key, config };
        }
      }
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Processes an external link, validating it and optionally adding affiliate tracking.
 *
 * @param url - The URL to process
 * @returns ProcessedLink object with validation and affiliate info
 */
export function processExternalLink(url: string): ProcessedLink {
  // Trim whitespace
  const trimmedUrl = url.trim();

  // Handle empty URL
  if (!trimmedUrl) {
    return {
      originalUrl: url,
      processedUrl: '',
      isValid: false,
      platform: null,
      platformName: null,
      hasAffiliateTracking: false,
      error: 'URL cannot be empty',
    };
  }

  // Validate URL format
  if (!isValidUrl(trimmedUrl)) {
    return {
      originalUrl: url,
      processedUrl: trimmedUrl,
      isValid: false,
      platform: null,
      platformName: null,
      hasAffiliateTracking: false,
      error: 'Invalid URL format. Please include http:// or https://',
    };
  }

  // Detect platform
  const platformResult = detectPlatform(trimmedUrl);

  // If no recognized platform or platform is disabled, return URL as-is
  if (!platformResult || !platformResult.config.enabled) {
    return {
      originalUrl: url,
      processedUrl: trimmedUrl,
      isValid: true,
      platform: platformResult?.key || null,
      platformName: platformResult?.config.name || null,
      hasAffiliateTracking: false,
    };
  }

  // Apply affiliate tracking
  try {
    const parsed = new URL(trimmedUrl);
    const { affiliateParam, affiliateValue } = platformResult.config;

    // Only add affiliate param if not already present
    if (!parsed.searchParams.has(affiliateParam)) {
      parsed.searchParams.set(affiliateParam, affiliateValue);
    }

    return {
      originalUrl: url,
      processedUrl: parsed.toString(),
      isValid: true,
      platform: platformResult.key,
      platformName: platformResult.config.name,
      hasAffiliateTracking: true,
    };
  } catch {
    // Shouldn't happen since we validated above, but handle gracefully
    return {
      originalUrl: url,
      processedUrl: trimmedUrl,
      isValid: true,
      platform: platformResult.key,
      platformName: platformResult.config.name,
      hasAffiliateTracking: false,
    };
  }
}

/**
 * Gets the display name for a platform from a URL
 */
export function getPlatformDisplayName(url: string): string | null {
  const result = detectPlatform(url);
  return result?.config.name || null;
}

/**
 * Checks if a URL is from a known/trusted platform
 */
export function isKnownPlatform(url: string): boolean {
  return detectPlatform(url) !== null;
}

/**
 * Platforms that use custom domains and require async detection via HTTP/HTML analysis
 */
export const ASYNC_DETECT_PLATFORMS = ['shopify', 'woocommerce', 'bigcommerce', 'squarespace'] as const;

/**
 * Gets the config for a platform by key (useful for async-detected platforms)
 */
export function getPlatformConfig(platformKey: string): AffiliateConfig | null {
  return AFFILIATE_CONFIG[platformKey] || null;
}
