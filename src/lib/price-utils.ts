// src/lib/price-utils.ts
// Utility functions for handling price values throughout the application

export const CURRENCIES = [
  // Most popular / commonly used at the top
  'USD', 'EUR', 'GBP', 'JPY', 'BRL', 'CAD', 'AUD', 'CHF', 'CNY', 'INR',
  // Alphabetical list of other common/standard ISO 4217 codes
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AWG', 'AZN', 'BAM', 
  'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BOV', 'BSD', 
  'BTN', 'BWP', 'BYN', 'BZD', 'CDF', 'CHE', 'CHW', 'CLF', 'CLP', 'COP', 
  'COU', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 
  'EGP', 'ERN', 'ETB', 'FJD', 'FKP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 
  'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IQD', 
  'IRR', 'ISK', 'JMD', 'JOD', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 
  'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 
  'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 
  'MXN', 'MXV', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 
  'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 
  'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 
  'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 
  'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USN', 
  'UYI', 'UYU', 'UZS', 'VEF', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF', 
  'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL'
];

/**
 * Formats a price string with proper currency symbols and thousands separators
 * @param price The price string (with or without currency symbols)
 * @param currencyCode The ISO 4217 currency code (defaults to 'USD')
 * @param locale The locale to use for formatting (defaults to 'en-US')
 * @param freeLabel The label to use for zero prices (defaults to 'Free')
 * @returns Formatted price string with currency symbol and thousands separators
 */
export function formatPrice(price: string, currencyCode: string = 'USD', locale: string = 'en-US', freeLabel: string = 'Free'): string {
  // Remove any non-numeric characters except dots and minus signs
  const cleanPrice = price.replace(/[^\d.-]/g, '');
  const numericValue = parseFloat(cleanPrice);

  if (isNaN(numericValue)) return price;

  // Check for zero price (Free)
  if (numericValue === 0) {
    return freeLabel;
  }
  
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(numericValue);
}

/**
 * Formats a numeric price value to a currency string with thousands separators
 * @param value The numeric price value
 * @param currencyCode The ISO 4217 currency code (defaults to 'USD')
 * @param locale The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted price string with currency symbol, thousands separators, and 2 decimal places
 */
export function formatNumericPrice(value: number, currencyCode: string = 'USD', locale: string = 'en-US'): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(value);
}

/**
 * Formats a date to "MMM D, YYYY" format (e.g., "Jan 15, 2026")
 * @param date The date to format (Date object or string)
 * @param locale The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (locale === 'pt') {
    // Custom format for Portuguese to keep it short and remove "de"
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('pt', { month: 'short' }).replace('.', '');
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return dateObj.toLocaleDateString(locale, {
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