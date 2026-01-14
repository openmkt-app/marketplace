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
  if (!value) return false; // Empty value doesn't match anything except empty search term

  // Convert both strings to lowercase for case-insensitive comparison
  const lowerValue = value.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();

  // Check if the value includes the search term anywhere (partial match)
  return lowerValue.includes(lowerSearchTerm);
}

/**
 * Checks if a listing location matches the filter criteria
 * Now uses coordinate-based distance calculation
 * Note: This function is now a placeholder as filtering is done async
 */
export function isListingWithinRadius(
  _listing: { location: ListingLocation },
  _filter: LocationFilterValue
): boolean {
  // This function is deprecated with the new coordinate-based filtering
  // Actual filtering should be done using calculateDistanceFromCoords and geocodeLocation
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
  const startName = route.startLocation.toLowerCase();
  const endName = route.endLocation.toLowerCase();
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
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistanceFromCoords(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// In-memory cache as first layer
const memoryCache = new Map<string, { lat: number; lon: number }>();
const CACHE_KEY = 'geocode-cache';

/**
 * Get coordinates from a location string (city, state format)
 * Uses persistent cache to minimize API calls
 */
export async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  if (!location) return null;

  // 1. Check in-memory cache
  if (memoryCache.has(location)) {
    return memoryCache.get(location)!;
  }

  // 2. Check persistent cache (localStorage)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const cache = JSON.parse(stored);
        if (cache[location]) {
          // Hydrate memory cache
          memoryCache.set(location, cache[location]);
          return cache[location];
        }
      }
    } catch (e) {
      console.warn('Failed to access localStorage for geocoding cache', e);
    }
  }

  try {
    // 3. Fetch from API
    // Add a small random delay to prevent hammering the API if called in a loop
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      { headers: { 'User-Agent': 'ATMarketplace/1.0' } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };

      // 4. Update caches
      memoryCache.set(location, result);

      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(CACHE_KEY);
          const cache = stored ? JSON.parse(stored) : {};
          cache[location] = result;
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
          console.warn('Failed to update localStorage cache', e);
        }
      }

      return result;
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Calculate the approximate distance between two locations
 * This is a placeholder function - in a real app, you would use geocoding and distance calculation
 */
export function calculateDistance(location1: ListingLocation, _location2: ListingLocation): number {
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