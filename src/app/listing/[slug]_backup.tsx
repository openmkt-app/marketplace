'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { type MarketplaceListing } from '@/lib/marketplace-client';

interface ListingPageProps {
  params: Record<string, string>; // Updated type for params
}

export default function ListingPage({ params }: ListingPageProps) {
  const { client } = useAuth();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Format the condition to be more readable
  const formatCondition = (condition: string): string => {
    switch (condition) {
      case 'new': return 'New';
      case 'likeNew': return 'Like New';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return condition;
    }
  };
  
  // Format the category to be more readable
  const formatCategory = (category: string): string => {
    switch (category) {
      case 'furniture': return 'Furniture';
      case 'electronics': return 'Electronics';
      case 'clothing': return 'Clothing';
      case 'vehicles': return 'Vehicles';
      case 'toys': return 'Toys & Games';
      case 'sports': return 'Sports Equipment';
      case 'other': return 'Other';
      default: return category;
    }
  };

  useEffect(() => {
    // In a real app, you would fetch the listing by its ID or slug
    // For this example, we're just mocking a single listing
    const mockListing: MarketplaceListing = {
      title: params.slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      description: 'This is an example listing description. In a real app, this would be fetched from the AT Protocol repository.',
      price: '$99.99',
      location: {
        state: 'California',
        county: 'Los Angeles',
        locality: 'Santa Monica',
      },
      category: 'furniture',
      condition: 'good',
      createdAt: new Date().toISOString(),
    };
    
    // Simulate loading
    const timer = setTimeout(() => {
      setListing(mockListing);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [params.slug]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 py-8">
          <div className="text-center py-8">
            <div className="spinner animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading listing details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link href="/browse" className="text-blue-600 hover:underline">
            ← Back to listings
          </Link>
        </div>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Listing not found</h2>
            <p className="text-gray-600 mb-4">
              The listing you're looking for may have been removed or doesn't exist.
            </p>
            <Link href="/browse" className="text-blue-600 hover:underline">
              ← Browse other listings
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto p-4 py-8">
        <Link href="/browse" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to listings
        </Link>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-64 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-800">{listing.title}</h1>
              <span className="text-2xl font-bold text-blue-600">{listing.price}</span>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700">{listing.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Details</h2>
                <div className="space-y-2">
                  <div className="flex">
                    <span className="text-gray-600 w-24">Condition:</span>
                    <span className="font-medium">{formatCondition(listing.condition)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-24">Category:</span>
                    <span className="font-medium">{formatCategory(listing.category)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-24">Listed:</span>
                    <span className="font-medium">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-2">Location</h2>
                <div className="space-y-2">
                  <div className="flex">
                    <span className="text-gray-600 w-24">City:</span>
                    <span className="font-medium">{listing.location.locality}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-24">County:</span>
                    <span className="font-medium">{listing.location.county}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-24">State:</span>
                    <span className="font-medium">{listing.location.state}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Contact Seller</h2>
              <button className="w-full md:w-auto py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md">
                Message Seller
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
