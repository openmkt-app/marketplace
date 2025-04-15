// src/components/marketplace/ListingGrid/index.tsx
import React from 'react';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import ListingCard from '../ListingCard';
import './styles.css';

interface ListingGridProps {
  listings: Array<MarketplaceListing & { uri?: string }>;
  emptyMessage?: string;
}

export default function ListingGrid({ 
  listings, 
  emptyMessage = 'No listings found.' 
}: ListingGridProps) {
  if (!listings || listings.length === 0) {
    return (
      <div className="listing-grid-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="listing-grid">
      {listings.map((listing, index) => (
        <ListingCard key={listing.uri || `listing-${index}`} listing={listing} />
      ))}
    </div>
  );
}
