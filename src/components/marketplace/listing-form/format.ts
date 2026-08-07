// Formatting helpers shared by the form and its sections.
//
// `formatPrice` was a closure inside CreateListingForm, which meant the magic
// importer, the price field and the submit handler could not be separated from
// each other. It never touched state, so it is a plain function.

/** Normalize a typed price to a plain decimal string with two places. */
export function formatPrice(price: string): string {
  // First, clean the input (remove any non-numeric characters except decimal point)
  const cleanedPrice = price.replace(/[^0-9.]/g, '');

  // Handle empty input
  if (!cleanedPrice) return '';

  // Check if it contains a decimal point
  if (cleanedPrice.includes('.')) {
    // Split into whole and decimal parts
    const [whole, decimal] = cleanedPrice.split('.');

    // Ensure decimal part has exactly 2 digits
    return `${whole || '0'}.${decimal.padEnd(2, '0').substring(0, 2)}`;
  } else {
    // No decimal point, add ".00"
    return `${cleanedPrice}.00`;
  }
}

