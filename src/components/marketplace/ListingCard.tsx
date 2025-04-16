// src/components/marketplace/ListingCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import ListingImageDisplay from './ListingImageDisplay';
import ListingImageDebug from './ListingImageDebug';
import type { MarketplaceListing } from '@/lib/marketplace-client';

interface ListingCardProps {
  listing: MarketplaceListing & { 
    uri?: string;
    authorDid?: string;
    authorHandle?: string;
    authorDisplayName?: string;
  };
  showDebug?: boolean;
}

export default function ListingCard({ listing, showDebug = false }: ListingCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md overflow-hidden flex flex-col">
      {/* Debug info - only shown when showDebug is true */}
      <ListingImageDebug listing={listing} show={showDebug} />
      
      {/* Image Section */}
      <div className="relative w-full h-48 mb-4 bg-gray-100 rounded-md overflow-hidden">
        <ListingImageDisplay 
          listing={listing}
          size="thumbnail"
          height="100%"
          fallbackText="No image available"
        />
      </div>
      
      {/* Listing Details */}
      <h2 className="text-xl font-semibold mb-2">{listing.title}</h2>
      <p className="text-gray-600 mb-2 flex-grow line-clamp-2">{listing.description}</p>
      <p className="text-xl font-bold text-blue-600 mb-2">{listing.price}</p>
      
      {listing.authorHandle && (
        <div className="mb-2">
          <span className="text-sm text-gray-500">
            Listed by: {listing.authorDisplayName ? (
              <span className="font-medium">{listing.authorDisplayName}</span>
            ) : (
              <span>@{listing.authorHandle}</span>
            )}
          </span>
        </div>
      )}
      
      <div className="mb-2">
        <span className="text-sm text-gray-500">
          Location: {listing.location.locality}, {listing.location.state}
        </span>
      </div>
      
      <div className="mb-3">
        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
          {listing.category}
        </span>
        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
          {listing.condition}
        </span>
      </div>
      
      {listing.uri ? (
        <Link
          href={`/listing/${encodeURIComponent(listing.uri)}`}
          className="mt-auto inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-center w-full"
        >
          View Details
        </Link>
      ) : (
        <Link
          href={`/listing/${encodeURIComponent(listing.title)}`}
          className="mt-auto inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-center w-full"
        >
          View Details
        </Link>
      )}
    </div>
  );
}