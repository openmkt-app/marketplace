// src/components/marketplace/ListingImageDebug.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { extractBlobCid } from '@/lib/image-utils';

interface ListingImageDebugProps {
  listing: any;
  show?: boolean;
}

/**
 * A debugging component to display information about listing images
 * to help troubleshoot image loading issues.
 */
export default function ListingImageDebug({ listing, show = false }: ListingImageDebugProps) {
  if (!show) return null;
  
  const hasImages = listing?.images && listing.images.length > 0;
  const authorDid = listing?.authorDid;
  const firstImage = hasImages ? listing.images[0] : null;
  
  // Extract the blob CID if an image exists
  const blobCid = firstImage ? extractBlobCid(firstImage) : null;
  
  // Generate an example CDN URL - using undefined instead of null for compatibility with img src
  const generatedUrl = blobCid && authorDid 
    ? `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${blobCid}@jpeg`
    : undefined; // Changed from null to undefined
  
  return (
    <div className="bg-gray-100 border border-gray-300 p-4 rounded-md text-xs mb-4">
      <h3 className="font-bold text-sm mb-2">Image Debug Info</h3>
      <div className="space-y-2">
        <div><strong>Has Images:</strong> {hasImages ? 'Yes' : 'No'}</div>
        <div><strong>Author DID:</strong> {authorDid || 'Not set'}</div>
        
        {firstImage && (
          <>
            <div><strong>Image MIME Type:</strong> {firstImage.mimeType || 'Not set'}</div>
            <div><strong>Image Size:</strong> {firstImage.size || 'Not set'}</div>
            <div className="break-all">
              <strong>Blob Reference:</strong> {JSON.stringify(firstImage.ref || {}, null, 2)}
            </div>
            <div className="break-all">
              <strong>Extracted Blob CID:</strong> {blobCid || 'Failed to extract'}
            </div>
            {generatedUrl && (
              <div className="break-all">
                <strong>Example CDN URL:</strong> {generatedUrl}
              </div>
            )}
            <div className="mt-4">
              <strong>Direct Image Test:</strong>
              {blobCid && authorDid && generatedUrl ? (
                <div className="border border-gray-300 p-2 mt-1 relative w-20 h-20">
                  <Image
                    src={generatedUrl}
                    alt="Test image"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="text-red-500">Missing required data to test</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}