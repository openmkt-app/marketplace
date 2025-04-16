'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarketplaceClient from '@/lib/marketplace-client';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { useAuth } from '@/contexts/AuthContext';
import ListingCard from '@/components/marketplace/ListingCard';

// Demo listings data for showcase purposes - define outside component to avoid recreation
const demoListingsData: MarketplaceListing[] = [
  {
    title: 'Vintage Mid-Century Chair',
    description: 'Beautiful wooden chair from the 1960s in excellent condition.',
    price: '$75',
    images: [
      {
        ref: {
          $link: 'demo-furniture.svg'
        },
        mimeType: 'image/svg+xml',
        size: 1024
      }
    ],
    location: {
      state: 'California',
      county: 'Los Angeles',
      locality: 'Pasadena',
      zipPrefix: '910'
    },
    category: 'furniture',
    condition: 'good',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Mountain Bike',
    description: 'Trek mountain bike, barely used. Great for trails.',
    price: '$350',
    images: [
      {
        ref: {
          $link: 'demo-sports.svg'
        },
        mimeType: 'image/svg+xml',
        size: 1024
      }
    ],
    location: {
      state: 'Oregon',
      county: 'Multnomah',
      locality: 'Portland',
      zipPrefix: '972'
    },
    category: 'sports',
    condition: 'likeNew',
    createdAt: new Date().toISOString()
  },
  {
    title: 'iPhone 13',
    description: 'Used iPhone 13, 128GB. Battery health at 92%.',
    price: '$450',
    images: [
      {
        ref: {
          $link: 'demo-electronics.svg'
        },
        mimeType: 'image/svg+xml',
        size: 1024
      }
    ],
    location: {
      state: 'New York',
      county: 'Kings',
      locality: 'Brooklyn',
      zipPrefix: '112'
    },
    category: 'electronics',
    condition: 'good',
    createdAt: new Date().toISOString()
  }
];

export default function BrowsePage() {
  // Memoize demo data to have a stable reference
  const memoDemoListings = useMemo(() => demoListingsData, []);
  
  // Get search params for debug mode
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  
  // Start with empty listings and set auth state first
  const [showDemoListings, setShowDemoListings] = useState(false);
  const [realListingsCount, setRealListingsCount] = useState(0);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState({
    state: '',
    county: '',
    locality: ''
  });
  // Track if we've made the initial determination of what to show
  const [initialized, setInitialized] = useState(false);
  
  // Get auth context to use existing client if available
  const auth = useAuth();
  
  // Fetch profile information for a listing
  const fetchAuthorProfile = async (did: string, client: MarketplaceClient) => {
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
  };
  
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
        setListings(memoDemoListings); // Set demo listings if not logged in
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
          
          setListings(enhancedListings);
          setShowDemoListings(false);
        } else {
          console.log('No real listings found, showing demos');
          setRealListingsCount(0);
          setListings(memoDemoListings); // Set demo listings when no real listings found
          setShowDemoListings(true);
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(`Failed to fetch listings: ${err instanceof Error ? err.message : String(err)}`);
        setListings(memoDemoListings); // Set demo listings on error
        setShowDemoListings(true);
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    };
    
    fetchListings();
  }, [auth.client, auth.isLoggedIn, auth.isLoading, initialized]);
  
  // Handle location form changes
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocation(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle location form submission
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate that at least state is provided
      if (!location.state) {
        setError('Please provide at least a state for location search');
        setIsLoading(false);
        return;
      }
      
      // Check if user is logged in
      if (!auth.isLoggedIn || !auth.client) {
        console.log('User not logged in, filtering demo listings by location');
        
        // Filter demo listings by location
        const filteredDemos = memoDemoListings.filter(listing => {
          const stateMatch = listing.location.state.toLowerCase() === location.state.toLowerCase();
          
          if (location.county) {
            const countyMatch = listing.location.county.toLowerCase() === location.county.toLowerCase();
            
            if (location.locality) {
              const localityMatch = listing.location.locality.toLowerCase() === location.locality.toLowerCase();
              return stateMatch && countyMatch && localityMatch;
            }
            
            return stateMatch && countyMatch;
          }
          
          return stateMatch;
        });
        
        if (filteredDemos.length > 0) {
          setListings(filteredDemos);
          setShowDemoListings(true);
        } else {
          setListings([]);
          setShowDemoListings(false);
        }
        
        setIsLoading(false);
        return;
      }
      
      const client = auth.client;
      
      // If county is provided, use it for more targeted search
      if (location.county) {
        console.log(`Searching for listings in ${location.state}, ${location.county}${location.locality ? `, ${location.locality}` : ''}`);
        const locationResults = await client.getListingsByLocation(
          location.state,
          location.county,
          location.locality || undefined
        );
        
        if (locationResults && locationResults.length > 0) {
          setRealListingsCount(locationResults.length);

          // Enhance listings with author profile information
          const enhancedListings = await Promise.all(locationResults.map(async (listing) => {
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
          
          setListings(enhancedListings);
          setShowDemoListings(false);
        } else {
          // If no results for specific location, show that no listings were found
          setRealListingsCount(0);
          setListings([]);
          setShowDemoListings(false);
        }
      } else {
        // If only state is provided, get all listings and filter client-side
        const allListings = await client.getAllListings();
        const filteredListings = allListings.filter(listing => 
          listing.location.state.toLowerCase() === location.state.toLowerCase()
        );
        
        if (filteredListings.length > 0) {
          setRealListingsCount(filteredListings.length);

          // Enhance listings with author profile information
          const enhancedListings = await Promise.all(filteredListings.map(async (listing) => {
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
          
          setListings(enhancedListings);
          setShowDemoListings(false);
        } else {
          setRealListingsCount(0);
          setListings([]);
          setShowDemoListings(false);
        }
      }
    } catch (err) {
      console.error('Error searching listings by location:', err);
      setError(`Failed to search listings: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Browse Listings</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-8">
        <form onSubmit={handleLocationSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Find Items Near You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={location.state}
                onChange={handleLocationChange}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g. California"
              />
            </div>
            <div>
              <label htmlFor="county" className="block text-sm font-medium mb-1">
                County
              </label>
              <input
                type="text"
                id="county"
                name="county"
                value={location.county}
                onChange={handleLocationChange}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g. Los Angeles"
              />
            </div>
            <div>
              <label htmlFor="locality" className="block text-sm font-medium mb-1">
                City/Town
              </label>
              <input
                type="text"
                id="locality"
                name="locality"
                value={location.locality}
                onChange={handleLocationChange}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g. Pasadena"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          >
            Search
          </button>
        </form>
      </div>
      
      {!initialized || isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2">Loading listings...</p>
        </div>
      ) : realListingsCount > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing: any, index) => (
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
      ) : showDemoListings ? (
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing, index) => (
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
          <p className="text-xl">No listings found in this area.</p>
          <p className="mt-2">Try another location or create your own listing!</p>
          <Link
            href="/create-listing"
            className="mt-4 inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          >
            Create Listing
          </Link>
        </div>
      )}
    </div>
  );
}