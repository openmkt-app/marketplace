'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarketplaceClient from '@/lib/marketplace-client';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { useAuth } from '@/contexts/AuthContext';
import ListingCard from '@/components/marketplace/ListingCard';
import FilterPanel, { FilterValues } from '@/components/marketplace/filters/FilterPanel';
import { filterListingsByLocation, filterListingsByCommuteRoute } from '@/lib/location-utils';
import { demoListingsData } from './demo-data';

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
  });
  
  // Track if we've made the initial determination of what to show
  const [initialized, setInitialized] = useState(false);
  
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
        return {
          did: did,
          handle: profileRecord.data.value.handle || did.split(':')[2],
          displayName: profileRecord.data.value.displayName
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
        console.log('User not logged in, showing demo listings');
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
        console.log('Fetching all marketplace listings...');
        const allListings = await client.getAllListings();
        
        if (allListings && allListings.length > 0) {
          console.log(`Found ${allListings.length} real listings`);
          setRealListingsCount(allListings.length);
          
          // Enhance listings with author profile information
          const enhancedListings = await Promise.all(allListings.map(async (listing) => {
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
          }));
          
          setAllListings(enhancedListings);
          setFilteredListings(enhancedListings); // Start with all listings
          setShowDemoListings(false);
        } else {
          console.log('No real listings found, showing demos');
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
  }, [auth.client, auth.isLoggedIn, auth.isLoading, initialized, memoDemoListings, fetchAuthorProfile]);
  
  // Apply filters when they change
  useEffect(() => {
    // Don't apply filters until listings are loaded
    if (!initialized || isLoading) return;
    
    // Apply filtering logic based on selected filter type
    let filtered = [...allListings];
    
    if (filters.locationType === 'basic' && filters.location) {
      // Apply basic location filter
      filtered = filterListingsByLocation(filtered, filters.location);
    } else if (filters.locationType === 'commute' && filters.commuteRoute) {
      // Apply commute route filter
      filtered = filterListingsByCommuteRoute(filtered, filters.commuteRoute);
    }
    
    setFilteredListings(filtered);
  }, [filters, allListings, initialized, isLoading]);
  
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
            {filters.locationType === 'basic' && filters.location && (
              <>
                {filters.location.state && <> matching <span className="font-medium">{filters.location.state}</span></>}
                {filters.location.county && <>, <span className="font-medium">{filters.location.county}</span></>}
                {filters.location.locality && <>, <span className="font-medium">{filters.location.locality}</span></>}
              </>
            )}
            {filters.locationType === 'commute' && filters.commuteRoute && (
              <> along route from <span className="font-medium">{filters.commuteRoute.startLocation.name}</span> to <span className="font-medium">{filters.commuteRoute.endLocation.name}</span></>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing: any, index) => (
              <ListingCard 
                key={index} 
                listing={{
                  ...listing,
                  // Make sure we have the authorDid to generate image URLs
                  authorDid: listing.authorDid || auth.user?.did || 'did:plc:oyhgprn7edb3dpdaq4mlgfkv'
                }}
                showDebug={debugMode}
              />
            ))}
          </div>
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
                {filters.location.locality && <>, <span className="font-medium">{filters.location.locality}</span></>}
              </>
            )}
            {filters.locationType === 'commute' && filters.commuteRoute && (
              <> along route from <span className="font-medium">{filters.commuteRoute.startLocation.name}</span> to <span className="font-medium">{filters.commuteRoute.endLocation.name}</span></>
            )}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing, index) => (
              <ListingCard 
                key={index} 
                listing={{
                  ...listing,
                  // For demo listings, we need to provide authorDid for image handling
                  authorDid: 'did:plc:demo',
                  authorHandle: 'demo_user',
                  authorDisplayName: 'Demo User'
                }}
                showDebug={debugMode}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl">No listings found matching your filters.</p>
          <p className="mt-2">Try adjusting your search criteria or create your own listing!</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setFilters({ locationType: 'basic' })}
              className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md"
            >
              Clear Filters
            </button>
            <Link
              href="/create-listing"
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Create Listing
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}