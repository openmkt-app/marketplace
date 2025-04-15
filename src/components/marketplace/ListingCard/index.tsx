// src/components/marketplace/ListingCard/index.tsx
import React from 'react';
import Link from 'next/link';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import './styles.css';

interface ListingCardProps {
  listing: MarketplaceListing & {
    uri?: string;
  };
}

export default function ListingCard({ listing }: ListingCardProps) {
  // Format price for display
  const formattedPrice = listing.price.includes('$')
    ? listing.price
    : `$${listing.price}`;
  
  // Determine if we have formatted images to display
  const hasImages = listing.formattedImages && listing.formattedImages.length > 0;
  
  // Format listing URI for linking
  const listingId = listing.uri ? encodeURIComponent(listing.uri) : '';
  const listingHref = listing.uri ? `/listings/${listingId}` : '#';

  return (
    <Link href={listingHref} className="listing-card">
      <div className="listing-card-image">
        {hasImages ? (
          <img 
            src={listing.formattedImages![0].thumbnail} 
            alt={listing.title}
            className="thumbnail-image"
          />
        ) : (
          <div className="placeholder-image">
            <span>No image</span>
          </div>
        )}
      </div>
      
      <div className="listing-card-content">
        <h3 className="listing-card-title">{listing.title}</h3>
        <p className="listing-card-price">{formattedPrice}</p>
        <p className="listing-card-location">
          {listing.location.locality}, {listing.location.state}
        </p>
      </div>
    </Link>
  );
}
