'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarketplaceClient, { MarketplaceListing, ListingLocation } from '@/lib/marketplace-client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavbarFilter } from '@/contexts/NavbarFilterContext';
import ListingCard from '@/components/marketplace/ListingCard';
import ListingImageDisplay from '@/components/marketplace/ListingImageDisplay';
import FilterPanel, { FilterValues } from '@/components/marketplace/filters/FilterPanel';
import { LocationFilterValue } from '@/components/marketplace/filters/LocationFilter';
import {
  filterListingsByCommuteRoute,
  calculateDistanceFromCoords,
  geocodeLocation,
  partialMatch
} from '@/lib/location-utils';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice } from '@/lib/price-utils';
import { formatCategoryDisplay, getCategoryName } from '@/lib/category-utils';
import { extractSubcategoryFromDescription } from '@/lib/category-utils';
import { demoListingsData } from './demo-data';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Fix the location filter utility functions types to match MarketplaceListing
const fixFilterResults = <T extends { location: any }>(listings: T[]): MarketplaceListing[] => {
  return listings as unknown as MarketplaceListing[];
};

// Helper to filter listings by distance from user's location
async function filterListingsByDistance(
  listings: MarketplaceListing[],
  locationFilter: LocationFilterValue
): Promise<MarketplaceListing[]> {
  if (!locationFilter.latitude || !locationFilter.longitude || !locationFilter.radius) {
    return listings;
  }

  const { latitude, longitude, radius } = locationFilter;
  const filtered: MarketplaceListing[] = [];

  for (const listing of listings) {
    // Try to geocode the listing's location if we haven't already
    const locationString = `${listing.location.locality}, ${listing.location.state}`;
    const coords = await geocodeLocation(locationString);

    if (coords) {
      const distance = calculateDistanceFromCoords(
        latitude,
        longitude,
        coords.lat,
        coords.lon
      );

      if (distance <= radius) {
        filtered.push(listing);
      }
    }
  }

  return filtered;
}

/**
 * Toast component for new listings notification
 */
const NewListingsToast = ({ count, onClick }: { count: number, onClick: () => void }) => {
  if (count === 0) return null;

  return (
    <div
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-primary-color text-white px-6 py-3 rounded-full shadow-lg z-50 cursor-pointer animate-bounce hover:bg-primary-dark transition-colors flex items-center"
      onClick={onClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
      </svg>
      <span className="font-semibold">{count} new listing{count > 1 ? 's' : ''} found!</span>
      <span className="ml-2 text-xs bg-white text-primary-color px-2 py-0.5 rounded-full">Click to show</span>
    </div>
  );
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
    // Note: This is a simplified example since our current data model doesn&apos;t include subcategories
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
  // age parameter commented out for now, will revisit later
  // age?: string
): MarketplaceListing[] {
  // if (!conditions?.length && !age) return listings;
  if (!conditions?.length) return listings;

  // Map from potentially old condition IDs to the new ones
  const mapConditionId = (id: string): string => {
    const mapping: Record<string, string> = {
      'like-new': 'likeNew',
      // We don&apos;t need to map 'poor' anymore
    };
    return mapping[id] || id;
  };

  // Normalize condition IDs to ensure compatibility
  const normalizedConditions = conditions.map(mapConditionId);

  return listings.filter(listing => {
    // Normalize the listing condition ID too for comparison
    const listingCondition = mapConditionId(listing.condition);

    // Filter by condition
    if (normalizedConditions.length && !normalizedConditions.includes(listingCondition)) return false;

    // Filter by age - commented out for now, will revisit later
    /*
    if (age) {
      // This would be a more sophisticated check in a real application
      return true; // Placeholder for age filtering
    }
    */

    return true;
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
    if (postedWithin) {
      const createdAt = new Date(listing.createdAt);
      const now = new Date();

      switch (postedWithin) {
        case 'day': // Last 24 hours
          const oneDayAgo = new Date(now);
          oneDayAgo.setDate(now.getDate() - 1);
          if (createdAt < oneDayAgo) return false;
          break;

        case 'week': // Last week
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          if (createdAt < oneWeekAgo) return false;
          break;

        case 'month': // Last month
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);
          if (createdAt < oneMonthAgo) return false;
          break;

        case 'quarter': // Last 3 months
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          if (createdAt < threeMonthsAgo) return false;
          break;

        case 'older': // Older listings - show listings older than 3 months
          const olderThanThreeMonths = new Date(now);
          olderThanThreeMonths.setMonth(now.getMonth() - 3);
          if (createdAt > olderThanThreeMonths) return false;
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
      // For now, distance sorting is not supported without coordinates
      // This would require geocoding all listings which is expensive
      // Just return listings as-is
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

const BrowsePageContent = () => {
  // Memoize demo data to have a stable reference
  const memoDemoListings = useMemo(() => demoListingsData, []);

  // Get search params for debug mode and listing status
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  const listingCreated = searchParams.get('listingCreated') === 'true';

  // Success message state for newly created listings
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check for newly created listing redirect
  useEffect(() => {
    if (listingCreated) {
      setShowSuccessMessage(true);

      // Auto-hide the message after 8 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [listingCreated]);

  // Start with empty listings and set auth state first
  const [showDemoListings, setShowDemoListings] = useState(false);
  const [realListingsCount, setRealListingsCount] = useState(0);
  const [allListings, setAllListings] = useState<MarketplaceListing[]>([]);
  const [newRealTimeListings, setNewRealTimeListings] = useState<MarketplaceListing[]>([]);
  const [showNewListings, setShowNewListings] = useState(false);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering state
  const [filters, setFilters] = useState<FilterValues>({
    viewMode: 'grid',
    resultsPerPage: 12,
    sortBy: 'recency'
  });

  // Track if we've made the initial determination of what to show
  const [initialized, setInitialized] = useState(false);

  // Store recently viewed listings
  const [viewedListings, setViewedListings] = useLocalStorage<string[]>('viewed-listings', []);

  // Store saved filters
  const [savedFilters, setSavedFilters] = useLocalStorage<Array<{ name: string, filter: FilterValues }>>('saved-filters', []);

  // Get auth context to use existing client if available
  const auth = useAuth();

  // Get navbar filter context to inject filter controls into navbar
  const { setFilterProps } = useNavbarFilter();

  // Advanced filters visibility state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const toggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(prev => !prev);
  }, []);

  const handleSelectCategory = useCallback((categoryId: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      category: categoryId,
      // Reset subcategory when changing main category
      subcategory: undefined
    }));
  }, []);

  const handleSortChange = useCallback((sortBy: FilterValues['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy
    }));
  }, []);

  const handleViewOptionsChange = useCallback((viewMode: 'grid' | 'list' | 'map', resultsPerPage: number) => {
    setFilters(prev => ({
      ...prev,
      viewMode,
      resultsPerPage
    }));
  }, []);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      searchQuery: undefined,
      category: undefined,
      subcategory: undefined,
      price: undefined,
      condition: [],
      // Preserve location but clear the radius constraint
      location: prev.location ? { ...prev.location, radius: undefined } : undefined,
      postedWithin: undefined,
      recentlyViewed: false
    }));
  }, []);

  // Check if there are any active filters
  const hasActiveFilters = Boolean(
    filters.searchQuery ||
    filters.category ||
    filters.subcategory ||
    filters.price ||
    (filters.condition && filters.condition.length > 0) ||
    (filters.location && filters.location.radius) ||
    filters.postedWithin ||
    filters.recentlyViewed
  );

  // Update navbar filter props when filter state changes
  useEffect(() => {
    setFilterProps({
      selectedCategory: filters.category,
      onSelectCategory: handleSelectCategory,
      itemCount: filteredListings.length,
      onToggleFilters: toggleAdvancedFilters,
      showFilters: showAdvancedFilters,
      sortBy: filters.sortBy || 'recency',
      onSortChange: handleSortChange,
      viewMode: filters.viewMode || 'grid',
      resultsPerPage: filters.resultsPerPage || 12,
      onViewOptionsChange: handleViewOptionsChange,
      hasActiveFilters
    });

    // Clean up when component unmounts (leaving browse page)
    return () => {
      setFilterProps(null);
    };
  }, [
    filters.category,
    filters.sortBy,
    filters.viewMode,
    filters.resultsPerPage,
    filteredListings.length,
    showAdvancedFilters,
    hasActiveFilters,
    handleSelectCategory,
    handleSortChange,
    handleViewOptionsChange,
    toggleAdvancedFilters,
    setFilterProps
  ]);

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
        const profileValue = profileRecord.data.value as Record<string, unknown>;

        const handle = typeof profileValue.handle === 'string'
          ? profileValue.handle
          : did.split(':')[2];

        const displayName = typeof profileValue.displayName === 'string'
          ? profileValue.displayName
          : undefined;

        // Extract avatar blob CID if available
        let avatarCid: string | undefined;
        const avatar = profileValue.avatar;

        // Debug: log the raw avatar object
        console.log('Avatar for', did, ':', avatar);

        if (avatar && typeof avatar === 'object') {
          const avatarObj = avatar as Record<string, unknown>;
          // Try ref.$link format first (standard blob format)
          if (avatarObj.ref && typeof avatarObj.ref === 'object') {
            const ref = avatarObj.ref as Record<string, unknown>;
            if (typeof ref.$link === 'string') {
              avatarCid = ref.$link;
            }
          }
          // Fallback: try direct $link on avatar
          if (!avatarCid && typeof avatarObj.$link === 'string') {
            avatarCid = avatarObj.$link;
          }
          // Try regex extraction as last resort (finds bafk... patterns)
          if (!avatarCid) {
            const avatarStr = JSON.stringify(avatar);
            const cidMatch = avatarStr.match(/bafkrei[a-z0-9]{52,}/i);
            if (cidMatch) {
              avatarCid = cidMatch[0];
            }
          }
        }

        console.log('Profile fetched for', did, '- avatarCid:', avatarCid);

        return {
          did: did,
          handle,
          displayName,
          avatarCid
        };
      }
    } catch (error) {
      console.error('Error fetching profile for', did, error);
    }

    return null;
  }, []);

  // Fetch listings directly from known DIDs (simplified approach)
  useEffect(() => {
    // Don't fetch until auth state is settled
    if (initialized || auth.isLoading) return;

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

    // Fetch directly from known DIDs - much faster and more reliable
    const fetchListings = async () => {
      try {
        console.log('Fetching listings from known DIDs...');
        const listings = await auth.client!.getAllListings();

        if (listings && listings.length > 0) {
          // Extract unique author DIDs
          const uniqueDids = Array.from(new Set(listings.map(l => l.authorDid).filter(Boolean) as string[]));

          // Map to store profiles
          const profilesMap = new Map<string, { handle: string; displayName?: string; avatarCid?: string }>();

          // Fetch profiles in parallel
          await Promise.all(
            uniqueDids.map(async (did) => {
              if (did && auth.client) {
                const profile = await fetchAuthorProfile(did, auth.client);
                if (profile) {
                  profilesMap.set(did, {
                    handle: profile.handle,
                    displayName: profile.displayName,
                    avatarCid: profile.avatarCid
                  });
                }
              }
            })
          );

          // Enhance listings with cached profile information
          const enhancedListings = listings.map((listing) => {
            if (listing.authorDid && profilesMap.has(listing.authorDid)) {
              const profile = profilesMap.get(listing.authorDid)!;
              return {
                ...listing,
                authorHandle: profile.handle,
                authorDisplayName: profile.displayName,
                authorAvatarCid: profile.avatarCid
              };
            }
            return listing;
          });

          console.log(`Successfully loaded ${enhancedListings.length} listings`);
          setRealListingsCount(enhancedListings.length);
          setAllListings(enhancedListings as MarketplaceListing[]);
          setFilteredListings(enhancedListings as MarketplaceListing[]);
          setShowDemoListings(false);
        } else {
          console.log('No real listings found, showing demo listings');
          setRealListingsCount(0);
          setAllListings(memoDemoListings);
          setFilteredListings(memoDemoListings);
          setShowDemoListings(true);
        }
      } catch (err) {
        console.error('Failed to fetch listings:', err);
        setRealListingsCount(0);
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

  // Prefetch locations in background to warm up cache
  // This makes filtering instant when user decides to filter
  useEffect(() => {
    if (allListings.length === 0) return;

    const prefetchLocations = async () => {
      // Get unique locations efficiently
      const uniqueLocations = new Set<string>();

      allListings.forEach(listing => {
        if (listing.location) {
          const locString = `${listing.location.locality}, ${listing.location.state}`;
          uniqueLocations.add(locString);
        }
      });

      console.log(`Prefetching ${uniqueLocations.size} locations in background...`);

      // Process in small batches relative to UI non-blocking
      const locations = Array.from(uniqueLocations);
      for (const loc of locations) {
        // geocodeLocation handles caching, so this is safe and efficient
        // It will skip API calls for cached items
        await geocodeLocation(loc);
      }
      console.log('Location prefetch complete');
    };

    // Use a small timeout to not block initial render or other critical data fetching
    const timer = setTimeout(() => {
      prefetchLocations().catch(err => console.error('Prefetch failed', err));
    }, 2000);

    return () => clearTimeout(timer);
  }, [allListings]);

  const handleShowNewListings = useCallback(() => {
    setAllListings(prev => [...newRealTimeListings, ...prev]);
    setNewRealTimeListings([]);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Play a subtle notification sound if desired
    // const audio = new Audio('/notification.mp3');
    // audio.play().catch(e => console.log('Audio play failed', e));
  }, [newRealTimeListings]);

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

    const applyFilters = async () => {
      // Use searchParams as the source of truth for the search query to avoid state sync lag
      const urlQuery = searchParams.get('q');
      // Fallback to filters.searchQuery if URL param is missing but state has it (edge case), or undefined
      const effectiveSearchQuery = urlQuery !== null ? urlQuery : filters.searchQuery;

      let filtered = [...allListings];

      // Apply search filter first
      if (effectiveSearchQuery) {
        filtered = filterListingsBySearchQuery(filtered, effectiveSearchQuery);
      }

      // Apply location filters (coordinate-based) - async operation
      if (filters.location?.latitude && filters.location?.longitude && filters.location?.radius) {
        filtered = await filterListingsByDistance(filtered, filters.location);
      }

      // Apply commute route filter - commented out for now, will revisit later
      /*
      if (filters.commuteRoute) {
        filtered = fixFilterResults(filterListingsByCommuteRoute(filtered, filters.commuteRoute));
      }
      */

      // Apply price filter
      if (filters.price) {
        filtered = filterListingsByPrice(filtered, filters.price);
      }

      // Apply category filter
      if (filters.category) {
        filtered = filterListingsByCategory(filtered, filters.category, filters.subcategory);
      }

      // Apply condition filter
      if (filters.condition?.length) {
        filtered = filterListingsByCondition(filtered, filters.condition);
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
    };

    applyFilters();
  }, [filters, allListings, initialized, isLoading, auth.user?.did, viewedListings, searchParams]);

  // Memoize the filter change handler to prevent unnecessary re-renders
  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  // Sync search query from URL params
  useEffect(() => {
    const query = searchParams.get('q');

    if (query !== null && query !== filters.searchQuery) {
      setFilters(prev => ({ ...prev, searchQuery: query }));
    } else if (query === null && filters.searchQuery) {
      // If q param is removed, clear search
      setFilters(prev => ({ ...prev, searchQuery: undefined }));
    }
  }, [searchParams, filters.searchQuery]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Main content area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {showSuccessMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 sticky top-0 z-10 shadow-md">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="font-medium text-green-800">Your item has been listed in the marketplace!</p>
                  <p className="text-sm text-green-700">Your listing is now visible to the community. Check it out below!</p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-500 hover:text-green-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {showAdvancedFilters && (
          <div className="mb-6">
            <FilterPanel
              initialValues={filters}
              onFilterChange={handleFilterChange}
              savedFilters={savedFilters}
              onSaveFilter={handleSaveFilter}
            />
          </div>
        )}

        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Browse Listings</h1>
          <p className="text-sm text-gray-500 mt-1">Discover what the community is selling.</p>
        </div>

        <NewListingsToast
          count={newRealTimeListings.length}
          onClick={handleShowNewListings}
        />

        {!initialized || isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-color border-r-transparent"></div>
            <p className="mt-2 text-text-primary">Loading listings...</p>
          </div>
        ) : realListingsCount > 0 && filteredListings.length > 0 ? (
          <div>
            {filters.viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
              <div className="space-y-3">
                {filteredListings.map((listing, index) => {
                  // Get clean description without subcategory text
                  const { cleanDescription, subcategory } = extractSubcategoryFromDescription(listing.description);

                  // Set character limit for description
                  const charLimit = 120;
                  const displayDescription = cleanDescription.length > charLimit
                    ? `${cleanDescription.substring(0, charLimit)}...`
                    : cleanDescription;

                  // Get tags - show category and subcategory
                  const tags: string[] = [];
                  if (listing.category) {
                    tags.push(getCategoryName(listing.category));
                  }
                  if (subcategory && !tags.includes(subcategory)) {
                    tags.push(subcategory);
                  }

                  // Format date
                  const postedDate = new Date(listing.createdAt).toLocaleDateString();

                  // Format location - handle missing values
                  const locationParts = [listing.location.locality, listing.location.state].filter(Boolean);
                  const locationString = locationParts.length > 0 ? locationParts.join(', ') : '';

                  return (
                    <div
                      key={index}
                      onClick={() => listing.uri ? recordListingView(listing.uri) : null}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex hover:shadow-xl hover:border-sky-200 transition-all duration-300 group cursor-pointer"
                    >
                      {/* Image with condition badge */}
                      <div className="w-72 flex-shrink-0 relative bg-gray-100 overflow-hidden">
                        <ListingImageDisplay
                          listing={listing}
                          size="thumbnail"
                          height="100%"
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          fallbackText="No image"
                        />
                        {/* Condition Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-sm text-slate-800 shadow-sm">
                            {formatConditionForDisplay(listing.condition)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          {/* Category and Title/Price row */}
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-1 block">
                                {getCategoryName(listing.category)}
                              </span>
                              <h2 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                                {listing.title}
                              </h2>
                            </div>
                            <span className="text-2xl font-bold text-slate-900 flex-shrink-0 ml-4">
                              {formatPrice(listing.price)}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                            {displayDescription}
                          </p>

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {tags.map((tag, i) => (
                                <span key={i} className="inline-block px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-xs border border-gray-100">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom row - Location, Author, Date */}
                        <div className="flex items-center gap-6 pt-4 border-t border-gray-50 text-sm text-slate-500">
                          {locationString && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{locationString}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{(listing as any).authorDisplayName || (listing as any).authorHandle || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{postedDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button - separate column, centered */}
                      <div className="hidden sm:flex flex-col justify-center items-center px-8 border-l border-gray-50 bg-gray-50/30 min-w-[160px]">
                        <Link
                          href={`/listing/${encodeURIComponent(listing.uri || listing.title)}`}
                          className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-sky-200 group-hover:bg-sky-700 group-hover:shadow-sky-300 transition-all whitespace-nowrap"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filters.viewMode === 'map' && (
              <div className="bg-neutral-light rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                <p className="text-text-secondary">
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
                <Link
                  href="/login"
                  className="inline-block mt-2 py-1 px-3 bg-primary-color hover:bg-primary-light text-white text-sm font-medium rounded">
                  Log In
                </Link>
              )}
            </div>

            {/* Render listings based on view mode */}
            {filters.viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
              <div className="space-y-3">
                {filteredListings.map((listing, index) => {
                  // Get clean description without subcategory text
                  const { cleanDescription, subcategory } = extractSubcategoryFromDescription(listing.description);

                  // Set character limit for description
                  const charLimit = 120;
                  const displayDescription = cleanDescription.length > charLimit
                    ? `${cleanDescription.substring(0, charLimit)}...`
                    : cleanDescription;

                  // Get tags - show category and subcategory
                  const tags: string[] = [];
                  if (listing.category) {
                    tags.push(getCategoryName(listing.category));
                  }
                  if (subcategory && !tags.includes(subcategory)) {
                    tags.push(subcategory);
                  }

                  // Format date
                  const postedDate = new Date(listing.createdAt).toLocaleDateString();

                  // Format location - handle missing values
                  const locationParts = [listing.location.locality, listing.location.state].filter(Boolean);
                  const locationString = locationParts.length > 0 ? locationParts.join(', ') : '';

                  return (
                    <div
                      key={index}
                      onClick={() => listing.uri ? recordListingView(listing.uri) : null}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex hover:shadow-xl hover:border-sky-200 transition-all duration-300 group cursor-pointer"
                    >
                      {/* Image with condition badge */}
                      <div className="w-72 flex-shrink-0 relative bg-gray-100 overflow-hidden">
                        <ListingImageDisplay
                          listing={listing}
                          size="thumbnail"
                          height="100%"
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          fallbackText="No image"
                        />
                        {/* Condition Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-sm text-slate-800 shadow-sm">
                            {formatConditionForDisplay(listing.condition)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          {/* Category and Title/Price row */}
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-1 block">
                                {getCategoryName(listing.category)}
                              </span>
                              <h2 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                                {listing.title}
                              </h2>
                            </div>
                            <span className="text-2xl font-bold text-slate-900 flex-shrink-0 ml-4">
                              {formatPrice(listing.price)}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                            {displayDescription}
                          </p>

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {tags.map((tag, i) => (
                                <span key={i} className="inline-block px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-xs border border-gray-100">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom row - Location, Author, Date */}
                        <div className="flex items-center gap-6 pt-4 border-t border-gray-50 text-sm text-slate-500">
                          {locationString && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{locationString}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{(listing as any).authorDisplayName || (listing as any).authorHandle || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{postedDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button - separate column, centered */}
                      <div className="hidden sm:flex flex-col justify-center items-center px-8 border-l border-gray-50 bg-gray-50/30 min-w-[160px]">
                        <Link
                          href={`/listing/${encodeURIComponent(listing.uri || listing.title)}`}
                          className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-sky-200 group-hover:bg-sky-700 group-hover:shadow-sky-300 transition-all whitespace-nowrap"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filters.viewMode === 'map' && (
              <div className="bg-neutral-light rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                <p className="text-text-secondary">
                  Map view is coming soon! Listings will be displayed on an interactive map.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-neutral-medium mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2 text-text-primary">No Matching Listings</h2>
            <p className="text-text-secondary mb-6">
              We couldn&apos;t find any listings matching your current filters. Try adjusting your search criteria.
            </p>
            <button
              onClick={() => setFilters({
                viewMode: 'grid',
                resultsPerPage: 12,
                sortBy: 'recency'
              })}
              className="btn-primary"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-primary">Loading marketplace...</div>}>
      <BrowsePageContent />
    </Suspense>
  );
}