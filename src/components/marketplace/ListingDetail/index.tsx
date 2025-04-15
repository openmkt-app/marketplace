// src/components/marketplace/ListingDetail/index.tsx
'use client';

import React from 'react';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import ListingImageGallery from '../ListingImageGallery';
import './styles.css';

interface ListingDetailProps {
  listing: MarketplaceListing & {
    authorDid?: string;
    authorHandle?: string;
    uri?: string;
    cid?: string;
  };
}

export default function ListingDetail({ listing }: ListingDetailProps) {
  // Format price for display
  const formattedPrice = listing.price.includes('$')
    ? listing.price
    : `$${listing.price}`;
  
  // Format creation date
  const createdDate = new Date(listing.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Determine if we have formatted images to display
  const hasFormattedImages = listing.formattedImages && listing.formattedImages.length > 0;
  
  return (
    <div className="listing-detail">
      <div className="listing-detail-grid">
        <div className="listing-images">
          {hasFormattedImages ? (
            <ListingImageGallery 
              images={listing.formattedImages!}
              title={listing.title}
            />
          ) : (
            <div className="listing-no-images">
              <div className="placeholder-text">No images available</div>
            </div>
          )}
        </div>
        
        <div className="listing-info">
          <h1 className="listing-title">{listing.title}</h1>
          <div className="listing-price">{formattedPrice}</div>
          
          <div className="listing-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{listing.category}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Condition:</span>
              <span className="meta-value">{listing.condition}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Location:</span>
              <span className="meta-value">
                {listing.location.locality}, {listing.location.county}, {listing.location.state}
                {listing.location.zipPrefix && ` (${listing.location.zipPrefix}xx)`}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Listed on:</span>
              <span className="meta-value">{formattedDate}</span>
            </div>
            {listing.authorHandle && (
              <div className="meta-item">
                <span className="meta-label">Listed by:</span>
                <span className="meta-value">@{listing.authorHandle}</span>
              </div>
            )}
          </div>
          
          <div className="listing-description">
            <h2>Description</h2>
            <p>{listing.description}</p>
          </div>
          
          <div className="listing-action">
            <button className="contact-button">
              Contact Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}