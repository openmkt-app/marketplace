// src/lib/marketplace-client-extensions.ts
import MarketplaceClient, { MarketplaceListing } from './marketplace-client';
import type { LocationFilterValue } from '@/components/marketplace/filters/LocationFilter';
import type { CommuteRoute } from '@/components/marketplace/filters/CommuteFilter';
import { filterListingsByLocation, filterListingsByCommuteRoute } from './location-utils';

/**
 * Extension methods for MarketplaceClient to support enhanced filtering
 */

/**
 * Get listings based on the enhanced location filter parameters
 */
export async function getListingsByLocationFilter(
  client: MarketplaceClient,
  locationFilter: LocationFilterValue
): Promise<MarketplaceListing[]> {
  // First, get all listings
  const allListings = await client.getAllListings();

  // Then apply the location filter
  return filterListingsByLocation(allListings, locationFilter) as MarketplaceListing[];
}

/**
 * Get listings along a commute route
 */
export async function getListingsByCommuteRoute(
  client: MarketplaceClient,
  commuteRoute: CommuteRoute
): Promise<MarketplaceListing[]> {
  // First, get all listings
  const allListings = await client.getAllListings();

  // Then apply the commute route filter
  return filterListingsByCommuteRoute(allListings, commuteRoute) as MarketplaceListing[];
}

/**
 * Get listings by zip code
 */
export async function getListingsByZipPrefix(
  client: MarketplaceClient,
  zipPrefix: string
): Promise<MarketplaceListing[]> {
  // First, get all listings
  const allListings = await client.getAllListings();

  // Filter by ZIP prefix
  return allListings.filter(listing =>
    listing.location.zipPrefix === zipPrefix
  );
}

/**
 * Helper function to add distance information to listings
 * This would typically use geocoding and distance calculation
 * For demo purposes, it just adds random distance values
 */
export function addDistanceToListings(
  listings: MarketplaceListing[],
  baseLocation: LocationFilterValue
): Array<MarketplaceListing & { distanceMiles?: number }> {
  return listings.map(listing => {
    // In a real implementation, this would calculate actual distances
    // For demo purposes, we'll generate a random distance
    const distanceMiles = Math.floor(Math.random() * ((baseLocation as any).radius || 10)) + 1;

    return {
      ...listing,
      distanceMiles
    };
  });
}

/**
 * Sort listings by distance
 */
export function sortListingsByDistance(
  listings: Array<MarketplaceListing & { distanceMiles?: number }>
): Array<MarketplaceListing & { distanceMiles?: number }> {
  return [...listings].sort((a, b) => {
    const distanceA = a.distanceMiles || 999;
    const distanceB = b.distanceMiles || 999;
    return distanceA - distanceB;
  });
}
