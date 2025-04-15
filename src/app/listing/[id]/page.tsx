'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BskyAgent } from '@atproto/api';
import { createBlueskyCdnImageUrls } from '@/lib/image-utils';

export default function ListingDetailPage() {
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const params = useParams();
  
  useEffect(() => {
    const fetchListing = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Attempting to fetch listing with ID:', params.id);
        
        // Decode the URI
        const uri = decodeURIComponent(params.id as string);
        console.log('Decoded URI:', uri);
        
        if (!uri) {
          throw new Error('No listing ID provided');
        }
        
        // Parse the URI to get the components
        // Format: at://did:plc:xxx/collection/rkey
        const parts = uri.split('/');
        const did = parts[2];
        const collection = parts[3];
        const rkey = parts[4];
        
        console.log('Fetching record - DID:', did, 'Collection:', collection, 'RKey:', rkey);
        
        // Validate the DID format
        if (!did || !did.startsWith('did:plc:')) {
          console.error('Invalid DID format:', did);
          throw new Error('Invalid listing identifier format');
        }
        
        // Initialize the agent
        const agent = new BskyAgent({
          service: 'https://bsky.social',
        });
        
        // Get record directly
        const record = await agent.api.com.atproto.repo.getRecord({
          repo: did,
          collection: collection,
          rkey: rkey
        });
        
        console.log('Raw API response data:', record.data);
        
        // Check if record.data.value exists and has images array
        if (record.data && record.data.value && Array.isArray(record.data.value.images)) {
          console.log('Images found in API response:', record.data.value.images.length);
        } else {
          console.warn('No images array found in API response or it is not an array');
        }
        
        // Create a listing object with the data
        const listingData = {
          ...record.data.value,
          uri: record.data.uri,
          cid: record.data.cid,
          authorDid: did
        };
        
        // SPECIAL DIAGNOSTIC: Extract JSON-safe version of problematic properties
        const diagnosticData = {
          recordData: {
            uri: record.data.uri,
            cid: record.data.cid,
            valueType: record.data.value?.$type,
            hasImages: Boolean(record.data.value?.images),
            imagesIsArray: Array.isArray(record.data.value?.images),
            imagesLength: Array.isArray(record.data.value?.images) ? record.data.value.images.length : 'not array',
            // Try to get a serializable version of images
            imagesSample: record.data.value?.images ? record.data.value.images.map(img => {
              try {
                return {
                  type: img?.$type,
                  hasRef: Boolean(img?.ref),
                  refType: typeof img?.ref,
                  refJson: JSON.stringify(img?.ref),
                  mimeType: img?.mimeType,
                  size: img?.size
                };
              } catch (e) {
                return { error: 'Failed to serialize image', message: e.message };
              }
            }) : 'no images'
          },
          listingData: {
            uri: listingData.uri,
            cid: listingData.cid,
            type: listingData.$type,
            title: listingData.title,
            hasImages: Boolean(listingData.images),
            imagesIsArray: Array.isArray(listingData.images),
            imagesLength: Array.isArray(listingData.images) ? listingData.images.length : 'not array',
          }
        };
        
        // EXPERIMENTAL: Direct extraction of CIDs from raw data
        try {
          const rawJson = JSON.stringify(record.data);
          // Find all potential CID strings in the raw data
          // This regex targets both bafk and bafkr prefixes commonly used for Bluesky CIDs
          const cidMatches = rawJson.match(/bafk(?:re)?[a-zA-Z0-9]{44,60}/g) || [];
          
          if (cidMatches.length > 0) {
            console.log('🔍 Found potential CIDs in raw data:', cidMatches);
            
            // Create direct URLs using these CIDs
            const directUrls = cidMatches.map(cid => ({
              thumbnail: `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`,
              fullsize: `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@jpeg`,
              mimeType: 'image/jpeg',
              extractedCid: cid
            }));
            
            // Store these direct URLs in the listing data for later use
            listingData.extractedImageUrls = directUrls;
            console.log('📷 Created direct image URLs:', directUrls);
          }
        } catch (error) {
          console.error('Failed to extract CIDs from raw data:', error);
        }
        
        console.log('Created listing object:', listingData);
        
        // Ensure authorDid is correctly set
        if (!listingData.authorDid) {
          console.error('Author DID is missing, using DID from the URI');
          listingData.authorDid = did;
        }
        
        // Log the full data object for debugging
        console.log('Full listing data before validation:', JSON.stringify(listingData, null, 2));
        console.log(`Found ${listingData.images ? listingData.images.length : 0} images in the listing`);
          
          // Check if images exist and have the expected structure
          if (listingData.images && Array.isArray(listingData.images)) {
            console.log(`Found ${listingData.images.length} images in the listing`);
          
          // Validate each image object
          listingData.images = listingData.images.filter(image => {
            // Print the exact object for debugging
            console.log('Validating image object:', JSON.stringify(image, null, 2));
            
            // More flexible validation to handle both BlobRef objects and regular objects
            // with ref.$link properties
            if (!image) {
              console.warn('Skipping null/undefined image object');
              return false;
            }
            
            // In case we get a BlobRef, the $type should be 'blob'
            if (image.$type === 'blob' && image.ref && typeof image.ref === 'object') {
              if (image.ref.$link) {
                console.log('Valid blob image with ref.$link:', image.ref.$link);
                return true;
              }
            }

            // Handle case where image might be the ref itself
            if (typeof image === 'object' && image.$link) {
              console.log('Direct blob reference with $link:', image.$link);
              return true;
            }
            
            // Log the exact reason for skipping
            console.warn('Skipping invalid image object, missing ref.$link:', image);
            return false;
          });
          
          // Log the image objects after validation
          if (listingData.images.length > 0) {
            console.log('First image object after validation:', JSON.stringify(listingData.images[0], null, 2));
            console.log(`Validated ${listingData.images.length} images`);
          }
        } else {
          console.warn('No images found in the listing or images is not an array');
          listingData.images = [];
        }
        
        setListing(listingData);
      } catch (err) {
        console.error('Failed to fetch listing:', err);
        setError(`Failed to load listing: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (params.id) {
      fetchListing();
    }
  }, [params.id]);
  
  // Use the directly extracted URLs if available, or generate them using our utility function
  const directImageUrls = React.useMemo(() => {
    // First try to use the URLs we extracted directly from the raw data
    if (listing && listing.extractedImageUrls && listing.extractedImageUrls.length > 0) {
      console.log('Using extracted image URLs:', listing.extractedImageUrls);
      return listing.extractedImageUrls;
    }
    
    if (!listing || !listing.images || !Array.isArray(listing.images)) {
      console.log('No images found in listing:', listing);
      return [];
    }
    
    console.log(`Processing ${listing.images.length} images with author DID:`, listing.authorDid);
    
    // Use a try-catch for each image to prevent a single failure from breaking all images
    const urls = [];
    
    for (let i = 0; i < listing.images.length; i++) {
      const image = listing.images[i];
      
      try {
        // Debug each image
        console.log(`Processing image ${i}:`, JSON.stringify(image, null, 2));
        
        // We'll be more lenient about validation here and let the utility function handle it
        const imageUrls = createBlueskyCdnImageUrls(image, listing.authorDid, image.mimeType);
        console.log(`Generated URLs for image ${i}:`, imageUrls);
        
        urls.push({
          thumbnail: imageUrls.thumbnail,
          fullsize: imageUrls.fullsize,
          mimeType: image.mimeType || 'image/jpeg'
        });
      } catch (err) {
        console.error(`Error processing image ${i}:`, err);
      }
    }
    
    console.log(`Successfully processed ${urls.length} images`);
    return urls;
  }, [listing]);
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <Link href="/browse" className="text-blue-600 hover:underline">
            Back to Listings
          </Link>
        </div>
        <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Error</h1>
          <Link href="/browse" className="text-blue-600 hover:underline">
            Back to Listings
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }
  
  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">No Listing Found</h1>
          <Link href="/browse" className="text-blue-600 hover:underline">
            Back to Listings
          </Link>
        </div>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          No listing data was found for this ID.
        </div>
      </div>
    );
  }
  
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
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <Link href="/browse" className="text-blue-600 hover:underline">
          Back to Listings
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        {/* Main image display */}
        <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
          {directImageUrls.length > 0 ? (
            <img 
              src={directImageUrls[selectedImageIndex].fullsize} 
              alt={listing.title}
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                console.error('Failed to load fullsize image:', directImageUrls[selectedImageIndex].fullsize);
                e.currentTarget.src = '/placeholder-image.svg';
                e.currentTarget.alt = 'Image failed to load';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4">
              <img 
                src="/placeholder-image.svg" 
                alt="No images available"
                className="max-w-xs mb-2"
              />
              <div className="text-gray-500 text-center">
                <p>No images available for this listing</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Image URL debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 bg-gray-100 border-t border-gray-200 text-xs">
            <details>
              <summary className="text-blue-600 cursor-pointer">Debug Information</summary>
              <div className="mt-2 p-2 overflow-auto space-y-2">
                {directImageUrls.length > 0 ? (
                  <>
                    <p>Selected Image URL: <code className="break-all">{directImageUrls[selectedImageIndex].fullsize}</code></p>
                    <p>Author DID: <code>{listing.authorDid}</code></p>
                    {directImageUrls[selectedImageIndex].extractedCid && (
                      <div className="mt-2 bg-green-50 p-2 border border-green-200 rounded">
                        <p className="font-semibold text-green-700">Using directly extracted CID:</p>
                        <code className="break-all">{directImageUrls[selectedImageIndex].extractedCid}</code>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-yellow-50 p-2 border border-yellow-200 rounded">
                    <p className="font-semibold">No images were processed successfully</p>
                    <p>Original image data from API:</p>
                    <pre className="bg-gray-50 p-2 mt-1 rounded overflow-x-auto">
                      {JSON.stringify(listing.images, null, 2)}
                    </pre>
                    
                    <p className="mt-2 font-semibold">Image Processing Diagnostics:</p>
                    <div className="bg-gray-50 p-2 rounded">
                      <ul className="list-disc list-inside">
                        <li>Images array exists? <code>{listing.images ? 'Yes' : 'No'}</code></li>
                        <li>Images is array? <code>{Array.isArray(listing.images) ? 'Yes' : 'No'}</code></li>
                        <li>Images count: <code>{listing.images ? listing.images.length : 0}</code></li>
                        <li>Listing has authorDid? <code>{listing.authorDid ? 'Yes' : 'No'}</code></li>
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 p-2 border border-blue-200 rounded mt-4">
                  <p className="font-semibold">URL Format Reference</p>
                  <code className="block mt-1">https://cdn.bsky.app/img/[variant]/plain/[DID]/[IMAGE_BLOB]@[extension]</code>
                  <p className="mt-2">Where:</p>
                  <ul className="list-disc list-inside">
                    <li>variant = "feed_thumbnail" or "feed_fullsize"</li>
                    <li>DID = "{listing.authorDid}"</li>
                    <li>IMAGE_BLOB = The blob reference CID</li>
                    <li>extension = The file format (e.g., "jpeg")</li>
                  </ul>
                </div>
              </div>
            </details>
          </div>
        )}
        
        {/* Thumbnails */}
        {directImageUrls.length > 1 && (
          <div className="flex gap-2 p-4 bg-gray-50">
            {directImageUrls.map((url, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedImageIndex(i)}
                className={`w-20 h-20 border-2 rounded-md overflow-hidden cursor-pointer transition-all
                  ${i === selectedImageIndex ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}
              >
                <img 
                  src={url.thumbnail} 
                  alt={`${listing.title} thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load thumbnail image:', url.thumbnail);
                    e.currentTarget.src = '/placeholder-image.svg';
                    e.currentTarget.alt = 'Thumbnail failed to load';
                  }}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Listing details */}
        <div className="p-6">
          <div className="text-2xl font-bold text-blue-600 mb-4">
            {formattedPrice}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700 mb-4">{listing.description}</p>
              
              <h2 className="text-lg font-semibold mb-2">Details</h2>
              <div className="space-y-2">
                <div className="flex">
                  <span className="font-medium w-24">Category:</span> 
                  <span className="text-gray-700">{listing.category}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Condition:</span> 
                  <span className="text-gray-700">{listing.condition}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Location:</span> 
                  <span className="text-gray-700">
                    {listing.location.locality}, {listing.location.county}, {listing.location.state}
                    {listing.location.zipPrefix && ` (${listing.location.zipPrefix}xx)`}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Listing Information</h2>
                <div className="space-y-2">
                  <div className="flex">
                    <span className="font-medium w-24">Listed on:</span> 
                    <span className="text-gray-700">{formattedDate}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium w-24">Seller:</span> 
                    <span className="text-gray-700">@{listing.authorDid.split(':')[2].substring(0, 8)}...</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                  >
                    Contact Seller
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}