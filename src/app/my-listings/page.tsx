'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import ListingCard from '@/components/marketplace/ListingCard';
import { type MarketplaceListing } from '@/lib/marketplace-client';

export default function MyListingsPage() {
  const { client, user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserListings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real app, you would fetch the user's listings from their AT Protocol repo
        // For this example, we&apos;re just using sample data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample data - in a real app, this would come from the AT Protocol
        const mockListings: MarketplaceListing[] = []; // Empty for now
        
        setListings(mockListings);
      } catch (err) {
        console.error('Failed to fetch user listings:', err);
        setError('Failed to load your listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserListings();
  }, [client, user]);

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-4xl mx-auto p-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Listings</h1>
          
          <Link 
            href="/create-listing"
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          >
            Create New Listing
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <div className="spinner animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
            <p className="text-gray-600 mb-4">
              You haven't created any listings yet. Start selling your items by creating your first listing.
            </p>
            <Link 
              href="/create-listing"
              className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Create First Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listings.map((listing, index) => (
              <div key={index} className="relative">
                <ListingCard listing={listing} />
                <div className="absolute top-2 right-2 flex space-x-2">
                  <Link
                    href={`/edit-listing/${listing.title.replace(/\s+/g, '-').toLowerCase()}`}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                    title="Edit listing"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </Link>
                  <button
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                    title="Delete listing"
                    onClick={() => {
                      // In a real app, this would delete the listing
                      if (window.confirm('Are you sure you want to delete this listing?')) {
                        // Delete listing logic would go here
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
