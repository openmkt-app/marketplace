'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarketplaceClient, { MarketplaceListing, ListingLocation } from '@/lib/marketplace-client';
import { useAuth } from '@/contexts/AuthContext';
import ListingCard from '@/components/marketplace/ListingCard';
import ListingImageDisplay from '@/components/marketplace/ListingImageDisplay';
import FilterPanel, { FilterValues } from '@/components/marketplace/filters/FilterPanel';
import { LocationFilterValue } from '@/components/marketplace/filters/LocationFilter';
import { 
  filterListingsByLocation, 
  filterListingsByCommuteRoute,
  calculateDistance,
  partialMatch
} from '@/lib/location-utils';
import { demoListingsData } from './demo-data';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Fix the location filter utility functions types to match MarketplaceListing
const fixFilterResults = <T extends { location: any }>(listings: T[]): MarketplaceListing[] => {
  return listings as unknown as MarketplaceListing[];
};

// Convert a LocationFilterValue to a ListingLocation object
const adaptLocationFilter = (filter: LocationFilterValue): ListingLocation => {
  return {
    state: filter.state || '',
    county: filter.county || '',
    locality: filter.city || '',    // map 'city' to 'locality'
    zipPrefix: filter.zipCode       // map 'zipCode' to 'zipPrefix'
  };
};

// Function to filter listings based on search query
function filterListingsBySearchQuery(listings: MarketplaceListing[], query?: string): MarketplaceListing[] {
  if (!query) return listings;
  
  // Split query into words for better matching
  const searchTerms = query.trim().toLowerCase().split(/\s+/);
  
  return listings.filter(listing => {
    // For each search term, check if it matches any part of the listing
    return searchTerms.every(term => {
      // Use partialMatch for better case-insensitive partial matching
      return partialMatch(listing.title, term) ||
        partialMatch(listing.description, term) ||
        partialMatch(listing.location.state, term) ||
        partialMatch(listing.location.county, term) ||
        partialMatch(listing.location.locality, term) ||
        partialMatch(listing.category || '', term) ||
        partialMatch(listing.condition || '', term) ||
        // Check price (removing currency symbols and formatting)
        partialMatch(listing.price.replace(/[^\d.]/g, ''), term) ||
        // Check ZIP prefix if available
        partialMatch(listing.location.zipPrefix || '', term);
    });
  });
}

// Function to filter listings based on price
function filterListingsByPrice(listings: MarketplaceListing[], priceFilter?: FilterValues['price']): MarketplaceListing[] {
  if (!priceFilter) return listings;
  
  const filtered = listings.filter(listing => {
    const price = parseFloat(listing.price.replace(/[^\d.]/g, ''));
    
    // Skip listings with invalid prices
    if (isNaN(price)) return false;
    
    // Apply price bracket filters
    if (priceFilter.bracket) {
      switch (priceFilter.bracket) {
        case 'under_50':
          if (price >= 50) return false;
          break;
        case '50_100':
          if (price < 50 || price > 100) return false;
          break;
        case '100_250':
          if (price < 100 || price > 250) return false;
          break;
        case '250_500':
          if (price < 250 || price > 500) return false;
          break;
        case 'over_500':
          if (price <= 500) return false;
          break;
      }
    } else {
      // Apply min price filter
      if (priceFilter.min !== undefined && price < priceFilter.min) return false;
      
      // Apply max price filter
      if (priceFilter.max !== undefined && price > priceFilter.max) return false;
    }
    
    // For demonstration, we'll consider any listing with price ending in .99 as a "deal"
    if (priceFilter.deals && !listing.price.includes('.99')) return false;
    
    return true;
  });
  
  return filtered;
}

// Function to filter listings based on category
function filterListingsByCategory(
  listings: MarketplaceListing[], 
  category?: string, 
  subcategory?: string
): MarketplaceListing[] {
  if (!category) return listings;
  
  return listings.filter(listing => {
    // Filter by main category
    if (listing.category !== category) return false;
    
    // If subcategory is specified, check it
    // Note: This is a simplified example since our current data model doesn't include subcategories
    if (subcategory) {
      // This would be a more sophisticated check in a real application
      return true; // Placeholder for subcategory filtering
    }
    
    return true;
  });
}

// Function to filter listings based on condition
function filterListingsByCondition(
  listings: MarketplaceListing[], 
  conditions?: string[],
  age?: string
): MarketplaceListing[] {
  if (!conditions?.length && !age) return listings;
  
  return listings.filter(listing => {
    // Filter by condition
    if (conditions?.length && !conditions.includes(listing.condition)) return false;
    
    // Filter by age
    // Note: This is a placeholder since our current data model doesn't include age
    if (age) {
      // This would be a more sophisticated check in a real application
      return true; // Placeholder for age filtering
    }
    
    return true;
  });
}

// Function to filter listings based on seller criteria
function filterListingsBySeller(
  listings: MarketplaceListing[], 
  verifiedSellers?: boolean,
  networkSellers?: boolean,
  currentUserDid?: string
): MarketplaceListing[] {
  if (!verifiedSellers && !networkSellers) return listings;
  
  return listings.filter(listing => {
    // Filter by verified sellers
    if (verifiedSellers) {
      // This is a placeholder - in a real app, you'd check seller verification status
      return true; // Placeholder for verified sellers filtering
    }
    
    // Filter by network
    if (networkSellers && currentUserDid) {
      // This is a placeholder - in a real app, you'd check if the seller is in the user's network
      return true; // Placeholder for network filtering
    }
    
    return !verifiedSellers && !networkSellers;
  });
}

// Function to filter listings based on recency
function filterListingsByRecency(
  listings: MarketplaceListing[], 
  postedWithin?: string,
  recentlyViewed?: boolean,
  viewedListingIds?: string[]
): MarketplaceListing[] {
  if (!postedWithin && !recentlyViewed) return listings;
  
  return listings.filter(listing => {
    // Filter by posting time
    if (postedWithin && postedWithin !== 'anytime') {
      const createdAt = new Date(listing.createdAt);
      const now = new Date();
      
      switch (postedWithin) {
        case 'today':
          if (now.getDate() !== createdAt.getDate() || 
              now.getMonth() !== createdAt.getMonth() || 
              now.getFullYear() !== createdAt.getFullYear()) {
            return false;
          }
          break;
        case 'week':
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          if (createdAt < oneWeekAgo) return false;
          break;
        case 'month':
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);
          if (createdAt < oneMonthAgo) return false;
          break;
        case 'threemonths':
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          if (createdAt < threeMonthsAgo) return false;
          break;
      }
    }
    
    // Filter by recently viewed
    if (recentlyViewed && viewedListingIds && listing.uri) {
      return viewedListingIds.includes(listing.uri);
    }
    
    return true;
  });
}

// Function to sort listings based on criteria
function sortListings(
  listings: MarketplaceListing[], 
  sortBy?: FilterValues['sortBy'],
  userLocation?: LocationFilterValue
): MarketplaceListing[] {
  if (!sortBy) return listings;
  
  const listingsCopy = [...listings];
  
  switch (sortBy) {
    case 'price_asc':
      return listingsCopy.sort((a, b) => {
        const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
        const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
        return isNaN(priceA) || isNaN(priceB) ? 0 : priceA - priceB;
      });
    
    case 'price_desc':
      return listingsCopy.sort((a, b) => {
        const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
        const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
        return isNaN(priceA) || isNaN(priceB) ? 0 : priceB - priceA;
      });
    
    case 'distance':
      if (userLocation) {
        const adaptedLocation = adaptLocationFilter(userLocation);
        return listingsCopy.sort((a, b) => {
          // Simplified distance calculation for demo purposes
          const distanceA = calculateDistance(a.location, adaptedLocation);
          const distanceB = calculateDistance(b.location, adaptedLocation);
          return distanceA - distanceB;
        });
      }
      return listingsCopy;
    
    case 'recency':
      return listingsCopy.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    
    case 'relevance':
    default:
      return listingsCopy;
  }
}

export default function BrowsePage() {
  // Memoize demo data to have a stable reference
  const memoDemoListings = useMemo(() => demoListingsData, []);
  
  // Get search params for debug mode
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  
  // Start with empty listings and set auth state first
  const [showDemoListings, setShowDemoListings] = useState(false);
  const [realListingsCount, setRealListingsCount] = useState(0);
  const [allListings, setAllListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering state
  const [filters, setFilters] = useState<FilterValues>({
    locationType: 'basic',
    viewMode: 'grid',
    resultsPerPage: 12,
    sortBy: 'recency'
  });
  
  // Track if we've made the initial determination of what to show
  const [initialized, setInitialized] = useState(false);
  
  // Store recently viewed listings
  const [viewedListings, setViewedListings] = useLocalStorage<string[]>('viewed-listings', []);
  
  // Store saved filters
  const [savedFilters, setSavedFilters] = useLocalStorage<Array<{name: string, filter: FilterValues}>>('saved-filters', []);
  
  // Get auth context to use existing client if available
  const auth = useAuth();
  
  // Fetch profile information for a listing
  const fetchAuthorProfile = useCallback(async (did: string, client: MarketplaceClient) => {
    if (!did || !client || !client.agent) return null;
    
    try {
      // Direct approach to get the profile record
      const profileRecord = await client.agent.api.com.atproto.repo.getRecord({
        repo: did,
        collection: 'app.bsky.actor.profile',
        rkey: 'self'
      });
      
      if (profileRecord.data && profileRecord.data.value) {
        const handle = typeof profileRecord.data.value.handle === 'string' 
          ? profileRecord.data.value.handle 
          : did.split(':')[2];
          
        const displayName = typeof profileRecord.data.value.displayName === 'string' 
          ? profileRecord.data.value.displayName 
          : undefined;
          
        return {
          did: did,
          handle,
          displayName
        };
      }
    } catch (error) {
      console.error('Error fetching profile for', did, error);
    }
    
    return null;
  }, []);
  
  // Fetch listings from API
  useEffect(() => {
    // Don't fetch until auth state is settled
    if (initialized || auth.isLoading) return;
    
    const fetchListings = async () => {      
      // Keep loading state active during fetch
      setIsLoading(true);
      setError(null);
      
      // Check for auth status first
      if (!auth.isLoggedIn || !auth.client) {
        setRealListingsCount(0);
        setShowDemoListings(true);
        setAllListings(memoDemoListings);
        setFilteredListings(memoDemoListings);
        setIsLoading(false);
        setInitialized(true);
        return;
      }
      
      try {
        // Use the auth client
        const client = auth.client;
        
        // First, try to get all listings regardless of location
        const allListings = await client.getAllListings();
        
        if (allListings && allListings.length > 0) {
          setRealListingsCount(allListings.length);
          
          // Enhance listings with author profile information
          const enhancedListings = (await Promise.all(allListings.map(async (listing) => {
            if (listing.authorDid) {
              const profile = await fetchAuthorProfile(listing.authorDid, client);
              if (profile) {
                return {
                  ...listing,
                  authorHandle: profile.handle,
                  authorDisplayName: profile.displayName
                };
              }
            }
            return listing;
          }))) as MarketplaceListing[];
          
          setAllListings(enhancedListings);
          setFilteredListings(enhancedListings); // Start with all listings
          setShowDemoListings(false);
        } else {
          setRealListingsCount(0);
          setAllListings(memoDemoListings);
          setFilteredListings(memoDemoListings);
          setShowDemoListings(true);
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(`Failed to fetch listings: ${err instanceof Error ? err.message : String(err)}`);
        setAllListings(memoDemoListings);
        setFilteredListings(memoDemoListings);
        setShowDemoListings(true);
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    };
    
    fetchListings();
  }, [auth.client, auth.isLoggedIn, auth.isLoading, initialized, memoDemoListings, fetchAuthorProfile, viewedListings]);
  
  // Record viewed listings
  const recordListingView = useCallback((listingUri: string) => {
    setViewedListings(prev => {
      // Remove if already exists (to move it to the front)
      const filtered = prev.filter(uri => uri !== listingUri);
      // Add to the front of the array
      return [listingUri, ...filtered].slice(0, 100); // Limit to 100 items
    });
  }, [setViewedListings]);
  
  // Handle saving a filter configuration
  const handleSaveFilter = useCallback((name: string, filter: FilterValues) => {
    setSavedFilters(prev => [...prev, { name, filter }]);
  }, [setSavedFilters]);
  
  // Apply filters when they change
  useEffect(() => {
    // Don't apply filters until listings are loaded
    if (!initialized || isLoading) return;
    
    let filtered = [...allListings];
    
    // Apply search filter first
    if (filters.searchQuery) {
      filtered = filterListingsBySearchQuery(filtered, filters.searchQuery);
    }
    
    // Apply location filters
    if (filters.locationType === 'basic' && filters.location) {
      filtered = fixFilterResults(filterListingsByLocation(filtered, filters.location));
    } else if (filters.locationType === 'commute' && filters.commuteRoute) {
      filtered = fixFilterResults(filterListingsByCommuteRoute(filtered, filters.commuteRoute));
    }
    
    // Apply price filter
    if (filters.price) {
      filtered = filterListingsByPrice(filtered, filters.price);
    }
    
    // Apply category filter
    if (filters.category) {
      filtered = filterListingsByCategory(filtered, filters.category, filters.subcategory);
    }
    
    // Apply condition filter
    if (filters.condition?.length || filters.age) {
      filtered = filterListingsByCondition(filtered, filters.condition, filters.age);
    }
    
    // Apply seller filter
    if (filters.sellerVerified || filters.sellerNetwork) {
      filtered = filterListingsBySeller(
        filtered, 
        filters.sellerVerified, 
        filters.sellerNetwork,
        auth.user?.did
      );
    }
    
    // Apply recency filter
    if (filters.postedWithin || filters.recentlyViewed) {
      filtered = filterListingsByRecency(
        filtered, 
        filters.postedWithin, 
        filters.recentlyViewed,
        viewedListings
      );
    }
    
    // Sort the results
    if (filters.sortBy) {
      filtered = sortListings(
        filtered, 
        filters.sortBy,
        filters.location // Use location for distance-based sorting
      );
    }
    
    setFilteredListings(filtered);
  }, [filters, allListings, initialized, isLoading, auth.user?.did, viewedListings]);
  
  // Memoize the filter change handler to prevent unnecessary re-renders
  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);
  
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Browse Listings</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-8">
        <FilterPanel 
          initialValues={filters}
          onFilterChange={handleFilterChange}
          savedFilters={savedFilters}
          onSaveFilter={handleSaveFilter}
        />
      </div>
      
      {!initialized || isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2">Loading listings...</p>
        </div>
      ) : realListingsCount > 0 && filteredListings.length > 0 ? (
        <div>
          <p className="mb-4 text-gray-600">
            Showing {filteredListings.length} of {allListings.length} listings
            {filters.searchQuery && (
              <> matching <span className="font-medium">"{filters.searchQuery}"</span></>
            )}
            {filters.locationType === 'basic' && filters.location && (
              <>
                {filters.location.state && <> in <span className="font-medium">{filters.location.state}</span></>}
                {filters.location.county && <>, <span className="font-medium">{filters.location.county}</span></>}
                {filters.location.city && <>, <span className="font-medium">{filters.location.city}</span></>}
              </>
            )}
            {filters.locationType === 'commute' && filters.commuteRoute && (
              <> along route from <span className="font-medium">{filters.commuteRoute.startLocation}</span> to <span className="font-medium">{filters.commuteRoute.endLocation}</span></>
            )}
          </p>
          
          {filters.viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing: any, index) => (
                <div key={index} onClick={() => listing.uri ? recordListingView(listing.uri) : null}>
                  <ListingCard 
                    listing={{
                      ...listing,
                      // Make sure we have the authorDid to generate image URLs
                      authorDid: listing.authorDid || auth.user?.did || 'did:plc:oyhgprn7edb3dpdaq4mlgfkv'
                    }}
                    showDebug={debugMode}
                  />
                </div>
              ))}
            </div>
          )}
          
          {filters.viewMode === 'list' && (
            <div className="space-y-4">
              {filteredListings.map((listing: any, index) => (
                <div 
                  key={index} 
                  onClick={() => listing.uri ? recordListingView(listing.uri) : null}
                  className="bg-white rounded-lg shadow-md overflow-hidden flex"
                >
                  <div className="w-48 h-48 bg-gray-100 flex-shrink-0">
                    <ListingImageDisplay 
                      listing={listing}
                      size="thumbnail"
                      height="100%"
                      fallbackText="No image"
                    />
                  </div>
                  <div className="p-4 flex-grow">
                    <h2 className="text-xl font-semibold mb-2">{listing.title}</h2>
                    <p className="text-gray-600 mb-2">{listing.description.substring(0, 150)}...</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-gray-500 text-sm">
                          {listing.location.locality}, {listing.location.state}
                        </div>
                        <div className="flex space-x-2 mt-2">
                          <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">{listing.category}</span>
                          <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">{listing.condition}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-600 mb-2">{listing.price}</div>
                        <Link
                          href={`/listing/${encodeURIComponent(listing.uri || listing.title)}`}
                          className="inline-block py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {filters.viewMode === 'map' && (
            <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              <p className="text-gray-500">
                Map view is coming soon! Listings will be displayed on an interactive map.
              </p>
            </div>
          )}
        </div>
      ) : showDemoListings && filteredListings.length > 0 ? (
        <div>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p className="font-bold">Demo Mode</p>
            <p>{auth.isLoggedIn ? 'No real listings found.' : 'You need to log in to see real listings.'} Showing demo content for illustration purposes.</p>
            {!auth.isLoggedIn && (
              <button 
                onClick={() => window.location.href = '/login'}
                className="mt-2 py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded">
                Log In
              </button>
            )}
          </div>
          
          <p className="mb-4 text-gray-600">
            Showing {filteredListings.length} of {allListings.length} listings
            {filters.locationType === 'basic' && filters.location && (
              <>
                {filters.location.state && <> matching <span className="font-medium">{filters.location.state}</span></>}
                {filters.location.county && <>, <span className="font-medium">{filters.location.county}</span></>}
                {filters.location.city && <>, <span className="font-medium">{filters.location.city}</span></>}
              </>
            )}
          </p>
          
          {/* Render listings based on view mode */}
          {filters.viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing, index) => (
                <div key={index} onClick={() => listing.uri ? recordListingView(listing.uri) : null}>
                  <ListingCard 
                    listing={{
                      ...listing,
                      // For demo listings, we need to provide authorDid for image handling
                      authorDid: listing.authorDid || auth.user?.did || 'did:plc:oyhgprn7edb3dpdaq4mlgfkv'
                    }}
                    showDebug={debugMode}
                  />
                </div>
              ))}
            </div>
          )}
          
          {filters.viewMode === 'list' && (
            <div className="space-y-4">
              {filteredListings.map((listing, index) => (
                <div 
                  key={index} 
                  onClick={() => listing.uri ? recordListingView(listing.uri) : null}
                  className="bg-white rounded-lg shadow-md overflow-hidden flex"
                >
                  <div className="w-48 h-48 bg-gray-100 flex-shrink-0">
                    <ListingImageDisplay 
                      listing={listing}
                      size="thumbnail"
                      height="100%"
                      fallbackText="No image"
                    />
                  </div>
                  <div className="p-4 flex-grow">
                    <h2 className="text-xl font-semibold mb-2">{listing.title}</h2>
                    <p className="text-gray-600 mb-2">{listing.description.substring(0, 150)}...</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-gray-500 text-sm">
                          {listing.location.locality}, {listing.location.state}
                        </div>
                        <div className="flex space-x-2 mt-2">
                          <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">{listing.category}</span>
                          <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">{listing.condition}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-600 mb-2">{listing.price}</div>
                        <Link
                          href={`/listing/${encodeURIComponent(listing.uri || listing.title)}`}
                          className="inline-block py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {filters.viewMode === 'map' && (
            <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              <p className="text-gray-500">
                Map view is coming soon! Listings will be displayed on an interactive map.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No Matching Listings</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any listings matching your current filters. Try adjusting your search criteria.
          </p>
          <button
            onClick={() => setFilters({
              locationType: 'basic',
              viewMode: 'grid',
              resultsPerPage: 12,
              sortBy: 'recency'
            })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}