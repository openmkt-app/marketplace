// src/components/marketplace/ListingDetail/index.tsx
'use client';

import React from 'react';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import ListingImageGallery from '../ListingImageGallery';
import './styles.css';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice } from '@/lib/price-utils';
import { formatCategoryDisplay } from '@/lib/category-utils';
import { extractSubcategoryFromDescription } from '@/lib/category-utils';
import {
  contactSellerViaBluesky,
  canContactSeller,
  formatSellerHandle,
  showContactInfo,
  getSellerDisplayName
} from '@/lib/chat-utils';

interface ListingDetailProps {
  listing: MarketplaceListing & {
    authorDid?: string;
    authorHandle?: string;
    uri?: string;
    cid?: string;
  };
}

export default function ListingDetail({ listing }: ListingDetailProps) {
  // Format creation date
  const createdDate = new Date(listing.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Get clean description without subcategory text
  const { cleanDescription } = extractSubcategoryFromDescription(listing.description);

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
          <div className="listing-price">{formatPrice(listing.price)}</div>

          <div className="listing-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{formatCategoryDisplay(listing.category, listing)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Condition:</span>
              <span className="meta-value">{formatConditionForDisplay(listing.condition)}</span>
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
                <span className="meta-value">
                  {getSellerDisplayName(listing)}
                </span>
              </div>
            )}
          </div>

          <div className="listing-description">
            <h2>Description</h2>
            <p>{cleanDescription}</p>
          </div>

          <div className="listing-action">
            {canContactSeller(listing) ? (
              <button
                className="contact-button"
                onClick={() => contactSellerViaBluesky(listing.authorHandle!, listing)}
              >
                Contact Seller via Bluesky
              </button>
            ) : (
              <button
                className="contact-button contact-button-disabled"
                disabled
                title="Seller contact information not available"
              >
                Contact Unavailable
              </button>
            )}

            {listing.authorHandle && (
              <p className="seller-info">
                Seller: {getSellerDisplayName(listing)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}