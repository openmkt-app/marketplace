// src/lib/price-utils.ts
// Utility functions for handling price values throughout the application

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a price string with thousands separators
 * @param price The price string (with or without dollar sign)
 * @returns Formatted price string with dollar sign and thousands separators (e.g., "$10,000.00")
 */
export function formatPrice(price: string): string {
  // Remove any existing dollar sign and commas, then parse
  const cleanPrice = price.replace(/[$,]/g, '');
  const numericValue = parseFloat(cleanPrice);

  if (isNaN(numericValue)) {
    return price.startsWith('$') ? price : `$${price}`;
  }

  // Check for zero price (Free)
  if (numericValue === 0) {
    return 'Free';
  }

  return currencyFormatter.format(numericValue);
}

/**
 * Formats a numeric price value to a currency string with thousands separators
 * @param value The numeric price value
 * @returns Formatted price string with dollar sign, thousands separators, and 2 decimal places
 */
export function formatNumericPrice(value: number): string {
  return currencyFormatter.format(value);
}

/**
 * Formats a date to "MMM D, YYYY" format (e.g., "Jan 15, 2026")
 * @param date The date to format (Date object or string)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Cleans up a locality name by removing common prefixes like "Village of", "Town of", etc.
 * @param locality The locality name to clean
 * @returns Cleaned locality name
 */
export function cleanLocality(locality: string): string {
  if (!locality) return '';

  // Common prefixes to remove
  const prefixes = [
    'Village of ',
    'Town of ',
    'City of ',
    'Borough of ',
    'Township of ',
  ];

  let cleaned = locality;
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }

  return cleaned;
}

/**
 * Formats a location string from locality and state, cleaning up prefixes
 * @param locality The locality (city/town/village name)
 * @param state The state (full name or abbreviation)
 * @returns Formatted location string (e.g., "Garden City, NY")
 */
export function formatLocation(locality?: string, state?: string): string {
  const cleanedLocality = locality ? cleanLocality(locality) : '';

  // Convert full state names to abbreviations for common states
  const stateAbbreviations: Record<string, string> = {
    'New York': 'NY',
    'California': 'CA',
    'Texas': 'TX',
    'Florida': 'FL',
    'Illinois': 'IL',
    'Pennsylvania': 'PA',
    'Ohio': 'OH',
    'Georgia': 'GA',
    'North Carolina': 'NC',
    'Michigan': 'MI',
    'New Jersey': 'NJ',
    'Virginia': 'VA',
    'Washington': 'WA',
    'Arizona': 'AZ',
    'Massachusetts': 'MA',
    'Tennessee': 'TN',
    'Indiana': 'IN',
    'Missouri': 'MO',
    'Maryland': 'MD',
    'Wisconsin': 'WI',
    'Colorado': 'CO',
    'Minnesota': 'MN',
    'South Carolina': 'SC',
    'Alabama': 'AL',
    'Louisiana': 'LA',
    'Kentucky': 'KY',
    'Oregon': 'OR',
    'Oklahoma': 'OK',
    'Connecticut': 'CT',
    'Utah': 'UT',
    'Iowa': 'IA',
    'Nevada': 'NV',
    'Arkansas': 'AR',
    'Mississippi': 'MS',
    'Kansas': 'KS',
    'New Mexico': 'NM',
    'Nebraska': 'NE',
    'West Virginia': 'WV',
    'Idaho': 'ID',
    'Hawaii': 'HI',
    'New Hampshire': 'NH',
    'Maine': 'ME',
    'Montana': 'MT',
    'Rhode Island': 'RI',
    'Delaware': 'DE',
    'South Dakota': 'SD',
    'North Dakota': 'ND',
    'Alaska': 'AK',
    'Vermont': 'VT',
    'Wyoming': 'WY',
  };

  const stateAbbr = state ? (stateAbbreviations[state] || state) : '';

  const parts = [cleanedLocality, stateAbbr].filter(Boolean);
  return parts.join(', ');
} 