// src/lib/price-utils.ts
// Utility functions for handling price values throughout the application

/**
 * Ensures a price string has a dollar sign at the beginning
 * @param price The price string that may or may not already have a dollar sign
 * @returns The price with a dollar sign added if it wasn't already present
 */
export function formatPrice(price: string): string {
  return price.startsWith('$') ? price : `$${price}`;
}

/**
 * Formats a numeric price value to a currency string with 2 decimal places
 * @param value The numeric price value
 * @returns Formatted price string with dollar sign and 2 decimal places
 */
export function formatNumericPrice(value: number): string {
  return `$${value.toFixed(2)}`;
} 