// src/components/marketplace/DebugImageDisplay.tsx
'use client';

import React from 'react';

interface DebugImageDisplayProps {
  listing: any;
}

export default function DebugImageDisplay({ listing }: DebugImageDisplayProps) {
  // Extract images directly from the listing
  const hasImages = listing.images && listing.images.length > 0;
  const authorDid = listing.authorDid || '';
  
  // Log the raw listing for debugging
  console.log('Debug Image Display - Raw listing:', listing);
  
  if (!hasImages) {
    return (
      <div className="bg-red-100 p-4 rounded-md mb-4">
        <h3 className="font-bold text-red-700">Debug: No images found in listing</h3>
        <pre className="text-xs overflow-auto mt-2">
          {JSON.stringify(listing, null, 2)}
        </pre>
      </div>
    );
  }
  
  // Generate direct URLs from raw image data
  const imageUrls = listing.images.map((image: any) => {
    const blobCid = image.ref.$link;
    let extension = 'jpeg';
    
    if (image.mimeType) {
      const parts = image.mimeType.split('/');
      if (parts.length > 1) {
        extension = parts[1] === 'jpg' ? 'jpeg' : parts[1];
      }
    }
    
    return {
      thumbnail: `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${blobCid}@${extension}`,
      fullsize: `https://cdn.bsky.app/img/feed_fullsize/plain/${authorDid}/${blobCid}@${extension}`,
      mimeType: image.mimeType
    };
  });
  
  console.log('Debug Image Display - Generated URLs:', imageUrls);
  
  return (
    <div className="bg-blue-50 p-4 rounded-md mb-6">
      <h3 className="font-bold text-blue-700 mb-4">Debug: Direct Image Display</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Main Image (Direct URL):</h4>
        <div className="border border-gray-300 rounded-md p-2">
          {imageUrls[0] && (
            <img 
              src={imageUrls[0].fullsize}
              alt="Debug fullsize image"
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }}
            />
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold mb-2">URL Information:</h4>
        <div className="text-xs bg-white p-2 rounded-md overflow-auto">
          <p>Author DID: {authorDid}</p>
          <p>First image blob: {listing.images[0]?.ref?.$link}</p>
          <p>First image MIME: {listing.images[0]?.mimeType}</p>
          <p>Full URL: {imageUrls[0]?.fullsize}</p>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-2">All Thumbnails:</h4>
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url: any, index: number) => (
            <div key={index} className="border border-gray-300 rounded-md overflow-hidden">
              <img 
                src={url.thumbnail}
                alt={`Debug thumbnail ${index + 1}`}
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}