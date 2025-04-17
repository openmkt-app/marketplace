// src/lib/category-utils.ts
// Utility functions for handling category values throughout the application

import { CATEGORIES } from './category-data';
import { MarketplaceListing } from './marketplace-client';

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
  
  return subcategory 
    ? `${categoryName} › ${subcategory}` 
    : categoryName;
} 