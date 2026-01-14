// src/components/marketplace/ListingImageDisplay.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createBlueskyCdnImageUrls, extractBlobCid } from '@/lib/image-utils';
import type { ListingImage } from '@/lib/marketplace-client';

interface ListingImageDisplayProps {
  listing: any; // Accept any type of listing
  size?: 'thumbnail' | 'fullsize';
  className?: string;
  height?: string | number;
  fallbackText?: string;
}

export default function ListingImageDisplay({
  listing,
  size = 'thumbnail',
  className = 'w-full h-full object-cover',
  height = 200,
  fallbackText = 'No image available'
}: ListingImageDisplayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  
  useEffect(() => {
    if (!listing) return;
    setError(false); // Reset error state on new listing

    try {
      const authorDid = listing.authorDid || '';
      const hasImages = listing.images && listing.images.length > 0;

      if (!authorDid) {
        setImageUrl(null);
        return;
      }
      
      if (!hasImages) {
        setImageUrl(null);
        return;
      }
      
      // Check if this is a demo image with SVG format
      const isDemoImage = listing.images[0]?.ref?.$link?.includes('demo-') || 
                         listing.images[0]?.ref?.$link?.endsWith('.svg');
      
      if (isDemoImage) {
        const svgPath = `/${listing.images[0].ref.$link}`;
        setImageUrl(svgPath);
        return;
      }
      
      // Use the blobCid extraction utility for AT Protocol images
      const blobCid = extractBlobCid(listing.images[0]);
      
      if (!blobCid) {
        setImageUrl(null);
        return;
      }
      
      // Get the MIME type from the image object if available
      const imageMimeType = listing.images[0].mimeType || 'image/jpeg';
      
      // Create a properly formatted image object to pass to the URL generator
      const imageObj = {
        ref: { $link: blobCid },
        mimeType: imageMimeType,
        size: listing.images[0].size || 0
      };
      
      // Generate the image URLs
      const imageData = createBlueskyCdnImageUrls(imageObj, authorDid);
      const url = size === 'thumbnail' ? imageData.thumbnail : imageData.fullsize;
      
      setImageUrl(url);
    } catch (err) {
      setImageUrl(null);
    }
  }, [listing, size]);
  
  // Handle image loading error
  const handleImageError = () => {
    setError(true);
  };
  
  // Show placeholder if no image or error
  if (!imageUrl || error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm">{fallbackText}</p>
        </div>
      </div>
    );
  }
  
  // Render the image
  return (
    <div className="relative w-full" style={{ height }}>
      <Image
        src={imageUrl}
        alt={listing.title || 'Listing image'}
        fill
        className={className}
        onError={handleImageError}
        unoptimized
      />
    </div>
  );
}