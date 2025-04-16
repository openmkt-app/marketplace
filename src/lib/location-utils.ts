// src/lib/location-utils.ts

import type { ListingLocation } from './marketplace-client';
import type { LocationFilterValue } from '@/components/marketplace/filters/LocationFilter';
import type { CommuteRoute } from '@/components/marketplace/filters/CommuteFilter';

/**
 * Checks if a value partially matches a search term (case insensitive)
 * @param value The string to check
 * @param searchTerm The search term to look for
 * @returns True if the value contains the search term (case insensitive)
 */
export function partialMatch(value: string, searchTerm: string): boolean {
  if (!searchTerm) return true; // Empty search term matches everything
  return value.toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * Checks if a listing location matches the filter criteria
 * Uses partial matching for text fields
 */
export function isListingWithinRadius(
  listing: { location: ListingLocation },
  filter: LocationFilterValue
): boolean {
  // If state is provided, check for partial match
  if (filter.state && !partialMatch(listing.location.state, filter.state)) {
    return false;
  }

  // If county is provided, check for partial match
  if (filter.county && !partialMatch(listing.location.county, filter.county)) {
    return false;
  }

  // If locality is provided, check for partial match
  if (filter.locality && !partialMatch(listing.location.locality, filter.locality)) {
    return false;
  }

  // If ZIP prefix is provided, it must be an exact match at the start
  if (filter.zipPrefix && 
      (listing.location.zipPrefix?.indexOf(filter.zipPrefix) !== 0)) {
    return false;
  }

  // All specified criteria match
  return true;
}

/**
 * Checks if a listing is along a commute route
 * Note: This is a simplified version - in a real implementation, 
 * we would use geocoding to convert addresses to coordinates and 
 * check if the listing is within a certain distance of the route
 */
export function isListingAlongCommuteRoute(
  listing: { location: ListingLocation },
  route: CommuteRoute
): boolean {
  // In a real app, this would involve actual route calculations
  // For this demo, we'll just check if the listing's state or county matches
  // either the start or end location
  
  // Check if state or county partially matches route locations
  const startName = route.startLocation.name.toLowerCase();
  const endName = route.endLocation.name.toLowerCase();
  const listingState = listing.location.state.toLowerCase();
  const listingCounty = listing.location.county.toLowerCase();
  const listingLocality = listing.location.locality.toLowerCase();
  
  // Check if any location component matches start or end point
  const matchesStart = listingState.includes(startName) || 
                      startName.includes(listingState) || 
                      listingCounty.includes(startName) || 
                      startName.includes(listingCounty) ||
                      listingLocality.includes(startName) ||
                      startName.includes(listingLocality);
                      
  const matchesEnd = listingState.includes(endName) || 
                    endName.includes(listingState) || 
                    listingCounty.includes(endName) || 
                    endName.includes(listingCounty) ||
                    listingLocality.includes(endName) ||
                    endName.includes(listingLocality);
  
  return matchesStart || matchesEnd;
}

/**
 * Filter a list of listings based on location criteria
 */
export function filterListingsByLocation(
  listings: Array<{ location: ListingLocation }>,
  filter: LocationFilterValue
): Array<{ location: ListingLocation }> {
  return listings.filter(listing => isListingWithinRadius(listing, filter));
}

/**
 * Filter a list of listings based on a commute route
 */
export function filterListingsByCommuteRoute(
  listings: Array<{ location: ListingLocation }>,
  route: CommuteRoute
): Array<{ location: ListingLocation }> {
  return listings.filter(listing => isListingAlongCommuteRoute(listing, route));
}

/**
 * Calculate the approximate distance between two locations
 * This is a placeholder function - in a real app, you would use geocoding and distance calculation
 */
export function calculateDistance(location1: ListingLocation, location2: ListingLocation): number {
  // This would use the Haversine formula with geocoded coordinates
  // For now, we'll return a random distance for demo purposes
  return Math.floor(Math.random() * 20) + 1; // 1-20 miles
}

/**
 * Format a location for display
 */
export function formatLocation(location: ListingLocation): string {
  const parts = [];
  
  if (location.locality) parts.push(location.locality);
  if (location.county) parts.push(location.county);
  if (location.state) parts.push(location.state);
  
  return parts.join(', ');
}

/**
 * Format a ZIP prefix (add ** placeholder)
 */
export function formatZipPrefix(zipPrefix?: string): string {
  if (!zipPrefix) return '';
  return `${zipPrefix}**`;
}