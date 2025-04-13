'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { encodeAtUri } from '@/lib/uri-utils';

// Using the types from marketplace-client
type MarketplaceListing = {
  title: string;
  description: string;
  price: string;
  images?: any[];
  location: {
    state: string;
    county: string;
    locality: string;
    zipPrefix?: string;
  };
  category: string;
  condition: string;
  createdAt: string;
};

const categoryIcons: Record<string, string> = {
  furniture: '🪑',
  electronics: '📱',
  clothing: '👕',
  vehicles: '🚗',
  toys: '🧸',
  sports: '⚽️',
  other: '📦'
};

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-green-100 text-green-800' },
  likeNew: { label: 'Like New', color: 'bg-emerald-100 text-emerald-800' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
  poor: { label: 'Poor', color: 'bg-red-100 text-red-800' }
};

export default function BrowsePage() {
  const { client, isLoggedIn } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    state: '',
    county: '',
    locality: '',
    category: '',
    condition: '',
    showOnlyMyListings: false
  });

  // Placeholder data for demo purposes
  const demoListings: MarketplaceListing[] = [
    {
      title: 'Vintage Mid-Century Desk',
      description: 'Beautiful solid wood desk in excellent condition. Perfect for a home office or study area.',
      price: '$125',
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
      title: 'iPhone 13 Pro - 256GB',
      description: 'Lightly used iPhone 13 Pro in perfect working condition. Includes original box, charger, and case.',
      price: '$650',
      location: {
        state: 'California',
        county: 'Orange',
        locality: 'Irvine',
      },
      category: 'electronics',
      condition: 'likeNew',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Mountain Bike - Trek X-Caliber',
      description: 'Trek X-Caliber 8 mountain bike, size large. Great condition with recent tune-up.',
      price: '$450',
      location: {
        state: 'California',
        county: 'Los Angeles',
        locality: 'Santa Monica',
      },
      category: 'sports',
      condition: 'good',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Designer Leather Jacket',
      description: 'Genuine leather jacket, size medium. Only worn a few times, looks brand new.',
      price: '$200',
      location: {
        state: 'California',
        county: 'San Diego',
        locality: 'La Jolla',
      },
      category: 'clothing',
      condition: 'likeNew',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Antique Writing Desk',
      description: 'Beautiful mahogany writing desk from the 1940s. Some wear but excellent condition overall.',
      price: '$375',
      location: {
        state: 'California',
        county: 'Los Angeles',
        locality: 'Pasadena',
      },
      category: 'furniture',
      condition: 'fair',
      createdAt: new Date().toISOString()
    },
    {
      title: 'LEGO Star Wars Collection',
      description: 'Collection of Star Wars LEGO sets. Includes Millennium Falcon, X-Wing, and TIE Fighter.',
      price: '$150',
      location: {
        state: 'California',
        county: 'Orange',
        locality: 'Anaheim',
      },
      category: 'toys',
      condition: 'good',
      createdAt: new Date().toISOString()
    }
  ];

  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (client && isLoggedIn) {
          try {
            // Get all marketplace listings
            const allListings = await client.getAllListings();
            
            // Add a flag to identify user's own listings
            const currentUserDid = client.agent.session?.did;
            
            const augmentedListings = allListings.map(listing => ({
              ...listing,
              isOwnListing: listing.authorDid === currentUserDid
            }));
            
            // Apply filters
            let filteredListings = [...augmentedListings];
            
            // Filter by "Show only my listings" if selected
            if (filters.showOnlyMyListings) {
              filteredListings = filteredListings.filter(listing => listing.isOwnListing);
            }
            
            // Apply location filters
            if (filters.state) {
              filteredListings = filteredListings.filter(
                listing => listing.location.state.toLowerCase().includes(filters.state.toLowerCase())
              );
            }
            
            if (filters.county) {
              filteredListings = filteredListings.filter(
                listing => listing.location.county.toLowerCase().includes(filters.county.toLowerCase())
              );
            }
            
            if (filters.locality) {
              filteredListings = filteredListings.filter(
                listing => listing.location.locality.toLowerCase().includes(filters.locality.toLowerCase())
              );
            }
            
            if (filters.category) {
              filteredListings = filteredListings.filter(
                listing => listing.category === filters.category
              );
            }
            
            if (filters.condition) {
              filteredListings = filteredListings.filter(
                listing => listing.condition === filters.condition
              );
            }
            
            if (filteredListings.length > 0) {
              setListings(filteredListings);
              return; // Exit early if we have real listings
            } else if (filters.state || filters.county || filters.locality || filters.category || filters.condition || filters.showOnlyMyListings) {
              // If we have filters applied but no results, show empty list
              setListings([]);
              return;
            } else {
              console.log('No real listings found after filtering, using demo data');
            }
          } catch (apiError) {
            console.error('Error fetching from API:', apiError);
          }
        }
        
        // Fallback to demo data
        let filteredListings = [];
        
        // If "Show only my listings" is checked and we're logged in,
        // we don't want to show any demo listings
        if (!isLoggedIn || !filters.showOnlyMyListings) {
          filteredListings = [...demoListings];
        }
        
        // Apply filters to demo listings
        if (filters.state) {
          filteredListings = filteredListings.filter(
            listing => listing.location.state.toLowerCase().includes(filters.state.toLowerCase())
          );
        }
        
        if (filters.county) {
          filteredListings = filteredListings.filter(
            listing => listing.location.county.toLowerCase().includes(filters.county.toLowerCase())
          );
        }
        
        if (filters.locality) {
          filteredListings = filteredListings.filter(
            listing => listing.location.locality.toLowerCase().includes(filters.locality.toLowerCase())
          );
        }
        
        if (filters.category) {
          filteredListings = filteredListings.filter(
            listing => listing.category === filters.category
          );
        }
        
        if (filters.condition) {
          filteredListings = filteredListings.filter(
            listing => listing.condition === filters.condition
          );
        }
        
        setListings(filteredListings);
      } catch (err) {
        console.error('Failed to fetch listings:', err);
        setError(`Failed to fetch listings: ${err instanceof Error ? err.message : String(err)}`);
        
        // Use demo data even if there's an error
        setListings(demoListings);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchListings();
  }, [client, isLoggedIn, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Browse Listings</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Search & Filter</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
        <label htmlFor="state" className="block text-sm font-medium mb-1">
        State
        </label>
        <input
        type="text"
        id="state"
        name="state"
        value={filters.state}
        onChange={handleFilterChange}
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
        value={filters.county}
        onChange={handleFilterChange}
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
        value={filters.locality}
        onChange={handleFilterChange}
        className="w-full px-3 py-2 border rounded-md"
        placeholder="e.g. Pasadena"
        />
        </div>
        
        <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
        Category
        </label>
        <select
        id="category"
        name="category"
        value={filters.category}
        onChange={handleFilterChange}
        className="w-full px-3 py-2 border rounded-md"
        >
        <option value="">All Categories</option>
        <option value="furniture">Furniture</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="vehicles">Vehicles</option>
        <option value="toys">Toys & Games</option>
        <option value="sports">Sports Equipment</option>
        <option value="other">Other</option>
        </select>
        </div>
        
        <div>
        <label htmlFor="condition" className="block text-sm font-medium mb-1">
        Condition
        </label>
        <select
        id="condition"
        name="condition"
        value={filters.condition}
        onChange={handleFilterChange}
        className="w-full px-3 py-2 border rounded-md"
        >
        <option value="">Any Condition</option>
        <option value="new">New</option>
        <option value="likeNew">Like New</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
        </select>
        </div>

            {isLoggedIn && (
              <div className="flex items-center pt-7">
                <input
                  type="checkbox"
                  id="showOnlyMyListings"
                  name="showOnlyMyListings"
                  checked={filters.showOnlyMyListings}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="showOnlyMyListings" className="ml-2 block text-sm font-medium text-gray-700">
                  Show only my listings
                </label>
              </div>
            )}
          </div>
      </div>
      
      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-center">
            <div className="h-8 w-32 bg-gray-200 rounded mb-4 mx-auto"></div>
            <div className="h-4 w-48 bg-gray-200 rounded mx-auto"></div>
          </div>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No listings found</h3>
          <p className="text-gray-500">Try adjusting your search filters</p>
          {isLoggedIn && (
            <div className="mt-6">
              <p className="text-gray-600 mb-4">You haven't created any listings yet. Get started by creating your first listing!</p>
              <Link
                href="/create-listing"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium"
              >
                Create a Listing
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing, index) => (
            <div key={index} className="listing-card bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow relative">
              {/* Add label for different listing types */}
              {listing.isOwnListing && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="inline-block px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow">
                    Your Listing
                  </span>
                </div>
              )}
              {listing.author && !listing.isOwnListing && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow">
                    AT Protocol
                  </span>
                </div>
              )}
              {!listing.authorDid && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="inline-block px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded-full shadow">
                    Demo Listing
                  </span>
                </div>
              )}
              <div className="h-48 bg-gray-200 flex items-center justify-center text-4xl">
                {categoryIcons[listing.category] || '📦'}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold">{listing.title}</h3>
                  <span className="text-lg font-semibold text-indigo-600">{listing.price}</span>
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${conditionLabels[listing.condition]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {conditionLabels[listing.condition]?.label || listing.condition}
                  </span>
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 capitalize">
                    {listing.category}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500 mb-4">
                  <div>
                    📍 {listing.location.locality}, {listing.location.county}, {listing.location.state}
                    {listing.location.zipPrefix && ` ${listing.location.zipPrefix}xx`}
                  </div>
                  <div>📅 Listed on {formatDate(listing.createdAt)}</div>
                  {listing.authorHandle && (
                    <div>👤 Posted by @{listing.authorHandle}</div>
                  )}
                </div>
                
                <div className="mt-4">
                  {listing.uri ? (
                    <Link 
                      href={`/listing/${encodeAtUri(listing.uri)}`}
                      className="inline-block w-full text-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
                    >
                      View Details
                    </Link>
                  ) : (
                    <Link
                      href={`/listing/${index}`} // For demo listings
                      className="inline-block w-full text-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
