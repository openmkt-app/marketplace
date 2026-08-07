// src/lib/category-utils.ts
// Utility functions for handling category values throughout the application

// .ts extension and `import type`, matching src/lib/commerce/: together they
// keep this module runnable under plain node (marketplace-client pulls in the
// AT Protocol SDK, and MarketplaceListing is only ever used as a type here).
import { CATEGORIES } from './category-data.ts';
import type { MarketplaceListing } from './marketplace-client';

/**
 * Gets the proper formatted name for a category ID
 * @param categoryId The ID of the category
 * @returns The properly formatted category name
 */
export function getCategoryName(categoryId: string): string {
  const category = CATEGORIES.find(c => c.id === categoryId);
  return category ? category.name : categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

/**
 * Gets the proper formatted name for a subcategory ID within a category
 * @param categoryId The ID of the parent category
 * @param subcategoryId The ID of the subcategory
 * @returns The properly formatted subcategory name or null if not found
 */
export function getSubcategoryName(categoryId: string, subcategoryId: string): string | null {
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return null;
  
  const subcategory = category.subcategories.find(s => s.id === subcategoryId);
  return subcategory ? subcategory.name : null;
}

/**
 * Extracts subcategory information from the listing description if present
 * Also returns the clean description with the subcategory text removed
 * @param description The listing description text
 * @returns An object with the subcategory name and cleaned description
 */
export function extractSubcategoryFromDescription(description: string): { 
  subcategory: string | null; 
  cleanDescription: string;
} {
  if (!description) return { subcategory: null, cleanDescription: '' };
  
  const matches = description.match(/Subcategory: ([^\n]+)/);
  
  if (matches && matches[1]) {
    // Remove the subcategory text from the description
    const cleanDescription = description.replace(/\s*Subcategory: [^\n]+/, '').trim();
    return { 
      subcategory: matches[1], 
      cleanDescription 
    };
  }
  
  return { subcategory: null, cleanDescription: description };
}

/**
 * Gets subcategory from metadata or description, with preference to metadata
 * @param listing The marketplace listing object
 * @returns Subcategory string or null
 */
export function getListingSubcategory(listing: Partial<MarketplaceListing>): string | null {
  // First check if subcategory is in the metadata (new format)
  if (listing.metadata && listing.metadata.subcategory) {
    return listing.metadata.subcategory;
  }
  
  // Fall back to extracting from description (legacy format)
  if (listing.description) {
    const { subcategory } = extractSubcategoryFromDescription(listing.description);
    return subcategory;
  }
  
  return null;
}

/**
 * Resolve a stored subcategory value to its id.
 *
 * Records used to store the English display name ("Vintage Items") rather than
 * the id ("vintage"), which locale-locked them and broke the moment a name was
 * reworded. New records store the id; this accepts either so the old ones keep
 * working, and it is the only place that knows both forms exist.
 *
 * Returns null when the value matches nothing in the category, which is what a
 * hand-edited record or a renamed subcategory looks like.
 */
export function resolveSubcategoryId(
  categoryId: string | undefined | null,
  value: string | undefined | null,
): string | null {
  if (!categoryId || !value) return null;
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return null;

  const needle = value.trim().toLowerCase();
  const byId = category.subcategories.find(sub => sub.id.toLowerCase() === needle);
  if (byId) return byId.id;

  // Legacy: the English display name as written at the time.
  const byName = category.subcategories.find(sub => sub.name.toLowerCase() === needle);
  return byName ? byName.id : null;
}

/** The listing's subcategory as an id, whichever form the record stores. */
export function getListingSubcategoryId(listing: Partial<MarketplaceListing>): string | null {
  return resolveSubcategoryId(listing.category, getListingSubcategory(listing));
}

/**
 * Formats category and subcategory for display
 * @param categoryId The category ID
 * @param listing The listing object or description string
 * @returns Formatted string with category and possibly subcategory
 */
export function formatCategoryDisplay(
  categoryId: string, 
  listingOrDescription?: string | Partial<MarketplaceListing>
): string {
  const categoryName = getCategoryName(categoryId);
  
  if (!listingOrDescription) return categoryName;
  
  let subcategory: string | null = null;
  
  // Check if we have a listing object or just a description string
  if (typeof listingOrDescription === 'object') {
    subcategory = getListingSubcategory(listingOrDescription);
  } else {
    // It's just a description string
    const { subcategory: extractedSubcategory } = extractSubcategoryFromDescription(listingOrDescription);
    subcategory = extractedSubcategory;
  }
  
  // The stored value may be an id now, so it is resolved back to a name before
  // display — otherwise a record written today would render "vintage" where an
  // older one renders "Vintage Items".
  const subcategoryName =
    (subcategory && getSubcategoryName(categoryId, resolveSubcategoryId(categoryId, subcategory) ?? '')) ||
    subcategory;

  return subcategoryName
    ? `${categoryName} › ${subcategoryName}`
    : categoryName;
} 