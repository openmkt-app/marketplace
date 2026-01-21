'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarketplaceClient, { MarketplaceListing, ListingLocation, fetchPublicListings } from '@/lib/marketplace-client';
import { useAuth } from '@/contexts/AuthContext';
import ListingCard from '@/components/marketplace/ListingCard';
import ListingImageDisplay from '@/components/marketplace/ListingImageDisplay';
import FilterPanel, { FilterValues } from '@/components/marketplace/filters/FilterPanel';
import SmartFilterSummary from '@/components/marketplace/SmartFilterSummary';
import { LocationFilterValue } from '@/components/marketplace/filters/LocationFilter';
import {
  filterListingsByCommuteRoute,
  calculateDistanceFromCoords,
  geocodeLocation,
  partialMatch
} from '@/lib/location-utils';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice, formatDate, formatLocation } from '@/lib/price-utils';
import { formatCategoryDisplay, getCategoryName, getSubcategoryName, getListingSubcategory, extractSubcategoryFromDescription } from '@/lib/category-utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { isOnlineStore } from '@/lib/location-utils';
import { Globe, MapPin } from 'lucide-react';

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
    if (subcategory) {
      // Get the subcategory name from the ID (e.g., "vintage" -> "Vintage Items")
      const subcategoryName = getSubcategoryName(category, subcategory);
      if (!subcategoryName) return true; // If subcategory name not found, don't filter

      // Get the listing's subcategory (from metadata or description)
      const listingSubcategory = getListingSubcategory(listing);
      if (!listingSubcategory) return false; // Listing has no subcategory, exclude it

      // Compare subcategory names (case-insensitive)
      return listingSubcategory.toLowerCase() === subcategoryName.toLowerCase();
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

// Hero section component for when we have few listings
const HeroSection = ({ listingCount, locationName }: { listingCount: number; locationName?: string }) => {
  return (
    <div className="relative z-10 px-8 py-16 sm:px-12 sm:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 bg-slate-900 rounded-3xl overflow-hidden mb-12">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/20 rounded-full filter blur-3xl -z-10"></div>

      <div className="max-w-xl text-center lg:text-left space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-xs font-semibold tracking-wider uppercase text-sky-100 mx-auto lg:mx-0">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          Live on AT Protocol
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-200 to-yellow-200">Open Market</span> <br />
          is Finally Here.
        </h1>
        <p className="text-lg text-slate-300 leading-relaxed font-light">
          Buy, sell, and connect directly with your community. No middlemen, no hidden fees, just pure decentralized commerce.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start">
          <Link
            href="/create-listing"
            className="w-full sm:w-auto px-8 py-4 bg-yellow-400 text-slate-900 rounded-full font-bold text-sm shadow-lg hover:shadow-yellow-400/20 hover:bg-yellow-300 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            Start Selling
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right" aria-hidden="true">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-bold text-sm hover:bg-white/10 transition-all backdrop-blur-sm flex items-center justify-center gap-2"
          >
            Sign In with Bluesky
          </Link>
        </div>
      </div>

      {/* 3D Card Effect */}
      <div className="relative w-full max-w-sm lg:max-w-md perspective-1000 hidden sm:block">
        <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition-all duration-500">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400"></div>
              <div className="text-xs font-medium text-white">@alice.bsky.social</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-bag text-sky-200" aria-hidden="true">
              <path d="M16 10a4 4 0 0 1-8 0"></path>
              <path d="M3.103 6.034h17.794"></path>
              <path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"></path>
            </svg>
          </div>
          <div className="aspect-[4/3] rounded-lg bg-gray-800 mb-4 overflow-hidden relative group">
            {/* Using a placeholder or the unsplash image from prompt */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
              alt="Product"
              src="/images/headphone-hero.jpg"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex justify-end">
              <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded shadow-sm">$120.00</span>
            </div>
          </div>
          <div className="space-y-1 mb-4">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-4 bg-white/10 rounded w-1/2"></div>
          </div>
          <div className="w-full py-3 bg-sky-600 text-white rounded-lg font-semibold text-sm shadow-lg shadow-sky-900/20 text-center cursor-default">
            Buy Now
          </div>
        </div>

        <div className="absolute -right-4 top-12 bg-white text-slate-900 p-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap" aria-hidden="true">
              <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold">New Offer!</div>
            <div className="text-[10px] text-gray-500">Just now</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BrowsePageContent = () => {
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
  // State for listings
  const [allListings, setAllListings] = useState<MarketplaceListing[]>([]);
  const [newRealTimeListings, setNewRealTimeListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listing type filter: 'all' | 'community' | 'online'
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'community' | 'online'>('all');

  // Filtering state - initialize with location from localStorage if available
  const [filters, setFilters] = useState<FilterValues>(() => {
    // Try to restore location from localStorage on initial render
    if (typeof window !== 'undefined') {
      try {
        const savedLocationJson = localStorage.getItem('last-used-location');
        if (savedLocationJson) {
          const savedLocation = JSON.parse(savedLocationJson);
          if (savedLocation.latitude && savedLocation.longitude) {
            return {
              viewMode: 'grid',
              resultsPerPage: 12,
              sortBy: 'recency',
              location: {
                latitude: savedLocation.latitude,
                longitude: savedLocation.longitude,
                radius: undefined, // Don't restore radius on page refresh
                locationName: savedLocation.locationName
              }
            };
          }
        }
      } catch (e) {
        console.error('Error restoring location from localStorage:', e);
      }
    }
    return {
      viewMode: 'grid',
      resultsPerPage: 12,
      sortBy: 'recency'
    };
  });

  // Track if we've made the initial determination of what to show
  const [initialized, setInitialized] = useState(false);

  // Store recently viewed listings
  const [viewedListings, setViewedListings] = useLocalStorage<string[]>('viewed-listings', []);

  // Store saved filters
  const [savedFilters, setSavedFilters] = useLocalStorage<Array<{ name: string, filter: FilterValues }>>('saved-filters', []);

  // Get auth context to use existing client if available
  const auth = useAuth();

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

  // Individual filter clear handlers for SmartFilterSummary chips
  const handleClearSearch = useCallback(() => {
    setFilters(prev => ({ ...prev, searchQuery: undefined }));
  }, []);

  const handleClearCategory = useCallback(() => {
    setFilters(prev => ({ ...prev, category: undefined, subcategory: undefined }));
  }, []);

  const handleClearLocation = useCallback(() => {
    // Clear the radius but keep the location coordinates/name
    setFilters(prev => ({
      ...prev,
      location: prev.location ? { ...prev.location, radius: undefined } : undefined
    }));
  }, []);

  const handleClearPrice = useCallback(() => {
    setFilters(prev => ({ ...prev, price: undefined }));
  }, []);

  const handleClearCondition = useCallback((conditionId: string) => {
    setFilters(prev => ({
      ...prev,
      condition: prev.condition?.filter(c => c !== conditionId) || []
    }));
  }, []);

  const handleClearPostedWithin = useCallback(() => {
    setFilters(prev => ({ ...prev, postedWithin: undefined }));
  }, []);

  const handleClearAllFilterChips = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      category: undefined,
      subcategory: undefined,
      location: prev.location ? { ...prev.location, radius: undefined } : undefined,
      price: undefined,
      condition: [],
      postedWithin: undefined
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

  // Check if there are filter chips to show (for the clear all button)
  const hasFilterChips = Boolean(
    filters.category ||
    (filters.location && filters.location.radius) ||
    filters.price ||
    (filters.condition && filters.condition.length > 0) ||
    filters.postedWithin
  );

  // Compute active categories from actual listings (for dynamic filter chips)
  const activeCategories = useMemo(() => {
    const categorySet = new Set<string>();
    allListings.forEach(listing => {
      if (listing.category) {
        // Get the main category (before any slash)
        const mainCategory = listing.category.split('/')[0];
        categorySet.add(mainCategory);
      }
    });
    return Array.from(categorySet);
  }, [allListings]);

  // Get location name for display
  const locationDisplayName = useMemo(() => {
    if (filters.location?.locationName) {
      return filters.location.locationName;
    }
    return undefined;
  }, [filters.location]);

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

  // Fetch listings - works for both logged in and logged out users
  // AT Protocol data is public, so we can always fetch real listings
  useEffect(() => {
    // Don't fetch until auth state is settled
    if (initialized || auth.isLoading) return;

    const fetchListings = async () => {
      try {

        let listings: MarketplaceListing[] = [];

        if (auth.isLoggedIn && auth.client) {
          // Logged in - use authenticated client (allows privacy filtering etc.)

          listings = await auth.client.getAllListings();
        } else {
          // Logged out - use public fetch (no auth required)

          listings = await fetchPublicListings();
        }

        if (listings && listings.length > 0) {
          // If logged in, enhance with profile info
          if (auth.isLoggedIn && auth.client) {
            // Extract unique author DIDs
            const uniqueDids = Array.from(new Set(listings.map(l => (l as any).authorDid).filter(Boolean) as string[]));

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
            listings = listings.map((listing) => {
              const authorDid = (listing as any).authorDid;
              if (authorDid && profilesMap.has(authorDid)) {
                const profile = profilesMap.get(authorDid)!;
                return {
                  ...listing,
                  authorHandle: profile.handle,
                  authorDisplayName: profile.displayName,
                  authorAvatarCid: profile.avatarCid
                };
              }
              return listing;
            });
          }


          setAllListings(listings as MarketplaceListing[]);
          setFilteredListings(listings as MarketplaceListing[]);
        } else {

          setAllListings([]);
          setFilteredListings([]);
        }
      } catch (err) {
        console.error('Failed to fetch listings:', err);
        setError('Failed to load listings. Please try again.');
        setAllListings([]);
        setFilteredListings([]);
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    };

    fetchListings();
  }, [auth.client, auth.isLoggedIn, auth.isLoading, initialized, fetchAuthorProfile]);

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



      // Process in small batches relative to UI non-blocking
      const locations = Array.from(uniqueLocations);
      for (const loc of locations) {
        // geocodeLocation handles caching, so this is safe and efficient
        // It will skip API calls for cached items
        await geocodeLocation(loc);
      }

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

      // Apply listing type filter (community vs online stores)
      if (listingTypeFilter === 'community') {
        filtered = filtered.filter(listing => !isOnlineStore(listing.location));
      } else if (listingTypeFilter === 'online') {
        filtered = filtered.filter(listing => isOnlineStore(listing.location));
      }

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
  }, [filters, allListings, initialized, isLoading, auth.user?.did, viewedListings, searchParams, listingTypeFilter]);

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

        {/* Hero Section for low inventory / onboarding - Logged out users only */}
        {!auth.isLoggedIn && (
          <HeroSection listingCount={allListings.length} locationName={locationDisplayName} />
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Browse Listings</h1>
          <p className="text-sm text-gray-500 mt-1">Discover what the community is selling.</p>
        </div>

        {/* Listing Type Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setListingTypeFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              listingTypeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setListingTypeFilter('online')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              listingTypeFilter === 'online'
                ? 'bg-slate-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Globe size={14} />
            Online Stores
          </button>
          <button
            onClick={() => setListingTypeFilter('community')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              listingTypeFilter === 'community'
                ? 'bg-slate-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MapPin size={14} />
            Local / Community
          </button>
        </div>

        {/* Smart Filter Summary with controls */}
        <SmartFilterSummary
          itemCount={filteredListings.length}
          searchQuery={filters.searchQuery}
          selectedCategory={filters.category}
          locationName={locationDisplayName}
          locationRadius={filters.location?.radius}
          priceRange={filters.price}
          conditions={filters.condition}
          postedWithin={filters.postedWithin}
          onClearSearch={handleClearSearch}
          onClearCategory={handleClearCategory}
          onClearLocation={handleClearLocation}
          onClearPrice={handleClearPrice}
          onClearCondition={handleClearCondition}
          onClearPostedWithin={handleClearPostedWithin}
          onClearAllFilters={hasFilterChips ? handleClearAllFilterChips : undefined}
          onToggleFilters={toggleAdvancedFilters}
          showFilters={showAdvancedFilters}
          hasActiveFilters={hasActiveFilters}
          sortBy={filters.sortBy || 'recency'}
          onSortChange={handleSortChange}
          viewMode={filters.viewMode || 'grid'}
          resultsPerPage={filters.resultsPerPage || 12}
          onViewOptionsChange={handleViewOptionsChange}
        />

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

        <NewListingsToast
          count={newRealTimeListings.length}
          onClick={handleShowNewListings}
        />

        {!initialized || isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-color border-r-transparent"></div>
            <p className="mt-2 text-text-primary">Loading listings...</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <div>
            {/* Show hero section when we have few items and user is not logged in - MOVED TO TOP */}
            {/* Removed duplicate HeroSection */}

            {/* Section title for featured listings when showing hero */}
            {!auth.isLoggedIn && allListings.length < 10 && allListings.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {locationDisplayName ? `Just Listed in ${locationDisplayName}` : 'Just Listed'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Check out these items from our community</p>
              </div>
            )}
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
                  const postedDate = formatDate(listing.createdAt);

                  // Format location - clean up prefixes and abbreviate state
                  const locationString = formatLocation(listing.location.locality, listing.location.state);

                  const listingHref = `/listing/${encodeURIComponent(listing.uri || listing.title)}`;

                  return (
                    <Link
                      key={index}
                      href={listingHref}
                      onClick={() => listing.uri ? recordListingView(listing.uri) : null}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex hover:shadow-xl hover:border-sky-200 transition-all duration-300 group"
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
                        <span className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-sky-200 group-hover:bg-sky-700 group-hover:shadow-sky-300 transition-all whitespace-nowrap">
                          View Details
                        </span>
                      </div>
                    </Link>
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
        ) : allListings.length === 0 ? (
          /* No listings at all - show empty state */
          <div>
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-neutral-medium mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h2 className="text-xl font-semibold mb-2 text-text-primary">No Listings Yet</h2>
              <p className="text-text-secondary mb-6">
                Be the first to list an item on the decentralized marketplace!
              </p>
              <Link
                href="/create-listing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                List Your First Item
              </Link>
            </div>
          </div>
        ) : (
          /* Listings exist but filters returned no results */
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