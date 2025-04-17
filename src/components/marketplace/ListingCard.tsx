// src/components/marketplace/ListingCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import ListingImageDisplay from './ListingImageDisplay';
import ListingImageDebug from './ListingImageDebug';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice } from '@/lib/price-utils';
import { formatCategoryDisplay } from '@/lib/category-utils';
import { extractSubcategoryFromDescription } from '@/lib/category-utils';

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
  // Format price to ensure it has a dollar sign
  const formattedPrice = listing.price.startsWith('$') ? listing.price : `$${listing.price}`;
  
  // Get clean description without subcategory text
  const { cleanDescription } = extractSubcategoryFromDescription(listing.description);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md overflow-hidden flex flex-col h-full">
      {/* Debug info - only shown when showDebug is true */}
      <ListingImageDebug listing={listing} show={showDebug} />
      
      {/* Image Section - Fixed height */}
      <div className="relative w-full h-48 mb-4 bg-neutral-light rounded-md overflow-hidden">
        <ListingImageDisplay 
          listing={listing}
          size="thumbnail"
          height="100%"
          fallbackText="No image available"
        />
      </div>
      
      {/* Content Section - Flex grow to fill space */}
      <div className="flex flex-col flex-grow">
        {/* Listing Details */}
        <h2 className="text-xl font-semibold mb-2 text-text-primary line-clamp-1">{listing.title}</h2>
        
        {/* Description with proper two-line height and ellipsis */}
        <div className="mb-2 h-[3em] overflow-hidden relative">
          <p className="text-text-secondary line-clamp-2">{cleanDescription}</p>
        </div>
        
        <p className="text-xl font-bold text-primary-color mb-2">{formatPrice(listing.price)}</p>
        
        {/* Metadata Section - Push to bottom with margin-top auto */}
        <div className="mt-auto">
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
              {formatCategoryDisplay(listing.category, listing)}
            </span>
            <span className="badge">
              {formatConditionForDisplay(listing.condition)}
            </span>
          </div>
          
          {listing.uri ? (
            <Link
              href={`/listing/${encodeURIComponent(listing.uri)}`}
              className="btn-primary w-full block"
            >
              View Details
            </Link>
          ) : (
            <Link
              href={`/listing/${encodeURIComponent(listing.title)}`}
              className="btn-primary w-full block"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}