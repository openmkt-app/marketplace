'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ListingCard from '@/components/marketplace/ListingCard';
import ListingFilters from '@/components/marketplace/ListingFilters';
import { type MarketplaceListing } from '@/lib/marketplace-client';
import Navbar from '@/components/layout/Navbar';

export default function BrowsePage() {
  const { client } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    location: {
      state: '',
      county: '',
      locality: '',
    },
    category: '',
    condition: '',
  });

  const fetchListings = async () => {
    if (!client) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use filter values that are set
      const state = filters.location.state || 'all';
      const county = filters.location.county || 'all';
      const locality = filters.location.locality || undefined;
      
      const results = await client.getListingsByLocation(state, county, locality);
      
      // Apply client-side filtering for category and condition
      let filteredResults = [...results];
      
      if (filters.category) {
        filteredResults = filteredResults.filter(
          listing => listing.category === filters.category
        );
      }
      
      if (filters.condition) {
        filteredResults = filteredResults.filter(
          listing => listing.condition === filters.condition
        );
      }
      
      setListings(filteredResults);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setError('Failed to load listings. Please try again later.');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (client) {
      fetchListings();
    }
  }, [client, filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      ...filters,
      ...newFilters,
    });
  };

  return (
    <>
      <Navbar />
      
      <main className="max-w-6xl mx-auto p-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Browse Listings</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 mb-4 md:mb-0">
            <ListingFilters onFilterChange={handleFilterChange} />
          </div>
          
          <div className="flex-1">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-8">
                <div className="spinner animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading listings...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">No listings found</h2>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing, index) => (
                  <ListingCard key={index} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
