// src/components/marketplace/ListingImageDisplay.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
      // Log the listing for debugging
      console.log('ListingImageDisplay - Processing listing:', listing.title || 'Untitled');
      
      const authorDid = listing.authorDid || '';
      const hasImages = listing.images && listing.images.length > 0;

      if (!authorDid) {
        console.warn('ListingImageDisplay - Missing author DID, cannot generate image URL');
        setImageUrl(null);
        return;
      }
      
      if (!hasImages) {
        console.log('ListingImageDisplay - No images found in listing');
        setImageUrl(null);
        return;
      }
      
      // Debug the first image object
      console.log('ListingImageDisplay - First image:', JSON.stringify(listing.images[0], null, 2));
      
      // Check if this is a demo image with SVG format
      const isDemoImage = listing.images[0]?.ref?.$link?.includes('demo-') || 
                         listing.images[0]?.ref?.$link?.endsWith('.svg');
      
      if (isDemoImage) {
        console.log('ListingImageDisplay - Detected demo image');
        const svgPath = `/${listing.images[0].ref.$link}`;
        console.log('ListingImageDisplay - Using demo SVG path:', svgPath);
        setImageUrl(svgPath);
        return;
      }
      
      // Use the blobCid extraction utility for AT Protocol images
      const blobCid = extractBlobCid(listing.images[0]);
      
      if (!blobCid) {
        console.warn('ListingImageDisplay - Failed to extract blob CID from image:', listing.images[0]);
        console.warn('ListingImageDisplay - Listing author DID:', authorDid);
        setImageUrl(null);
        return;
      }
      
      console.log('ListingImageDisplay - Successfully extracted blob CID:', blobCid);
      
      // Get the MIME type from the image object if available
      const imageMimeType = listing.images[0].mimeType || 'image/jpeg';
      
      // Create a properly formatted image object to pass to the URL generator
      const imageObj = {
        ref: { $link: blobCid },
        mimeType: imageMimeType,
        size: listing.images[0].size || 0
      };
      
      console.log('ListingImageDisplay - Using DID:', authorDid);
      console.log('ListingImageDisplay - Using image object:', imageObj);
      
      // Generate the image URLs
      const imageData = createBlueskyCdnImageUrls(imageObj, authorDid);
      const url = size === 'thumbnail' ? imageData.thumbnail : imageData.fullsize;
      
      console.log(`ListingImageDisplay - Generated ${size} URL:`, url);
      setImageUrl(url);
    } catch (err) {
      console.error('ListingImageDisplay - Error generating image URL:', err);
      setImageUrl(null);
    }
  }, [listing, size]);
  
  // Handle image loading error
  const handleImageError = () => {
    console.log('ListingImageDisplay - Image failed to load:', imageUrl);
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
    <img
      src={imageUrl}
      alt={listing.title || 'Listing image'}
      className={className}
      onError={handleImageError}
      style={{ height }}
    />
  );
}