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
      <div className="relative w-full h-48 mb-4 bg-neutral-light rounded-md overflow-hidden">
        <ListingImageDisplay 
          listing={listing}
          size="thumbnail"
          height="100%"
          fallbackText="No image available"
        />
      </div>
      
      {/* Listing Details */}
      <h2 className="text-xl font-semibold mb-2 text-text-primary">{listing.title}</h2>
      <p className="text-text-secondary mb-2 flex-grow line-clamp-2">{listing.description}</p>
      <p className="text-xl font-bold text-primary-color mb-2">{listing.price}</p>
      
      {listing.authorHandle && (
        <div className="mb-2">
          <span className="text-sm text-text-secondary">
            Listed by: {listing.authorDisplayName ? (
              <span className="font-medium">{listing.authorDisplayName}</span>
            ) : (
              <span>@{listing.authorHandle}</span>
            )}
          </span>
        </div>
      )}
      
      <div className="mb-2">
        <span className="text-sm text-text-secondary">
          Location: {listing.location.locality}, {listing.location.state}
        </span>
      </div>
      
      <div className="mb-3">
        <span className="badge mr-2">
          {listing.category}
        </span>
        <span className="badge">
          {listing.condition}
        </span>
      </div>
      
      {listing.uri ? (
        <Link
          href={`/listing/${encodeURIComponent(listing.uri)}`}
          className="btn-primary w-full mt-auto"
        >
          View Details
        </Link>
      ) : (
        <Link
          href={`/listing/${encodeURIComponent(listing.title)}`}
          className="btn-primary w-full mt-auto"
        >
          View Details
        </Link>
      )}
    </div>
  );
}