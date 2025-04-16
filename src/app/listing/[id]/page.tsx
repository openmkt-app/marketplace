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
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const params = useParams();
  
  useEffect(() => {
    const fetchListing = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const uri = decodeURIComponent(params.id as string);
        
        if (!uri) {
          throw new Error('No listing ID provided');
        }
        
        const parts = uri.split('/');
        const did = parts[2];
        const collection = parts[3];
        const rkey = parts[4];
        
        const agent = new BskyAgent({
          service: 'https://bsky.social',
        });
        
        const record = await agent.api.com.atproto.repo.getRecord({
          repo: did,
          collection: collection,
          rkey: rkey
        });
        
        if (record.data && record.data.value && Array.isArray(record.data.value.images)) {
          console.log('Images found in API response:', record.data.value.images.length);
        } else {
          console.warn('No images array found in API response or it is not an array');
        }
        
        const listingData = {
          ...record.data.value,
          uri: record.data.uri,
          cid: record.data.cid,
          authorDid: did
        } as any; // Using 'as any' to handle dynamic properties from the Bluesky API that TypeScript cannot detect statically
        
        const diagnosticData = {
          recordData: {
            uri: record.data.uri,
            cid: record.data.cid,
            valueType: record.data.value?.$type,
            hasImages: Boolean(record.data.value?.images),
            imagesIsArray: Array.isArray(record.data.value?.images),
            imagesLength: Array.isArray(record.data.value?.images) ? record.data.value.images.length : 'not array',
            imagesSample: Array.isArray(record.data.value?.images) ? record.data.value.images.map(img => {
              try {
                return {
                  type: img?.$type,
                  hasRef: Boolean(img?.ref),
                  refType: typeof img?.ref,
                  refJson: JSON.stringify(img?.ref),
                  mimeType: img?.mimeType,
                  size: img?.size
                };
              } catch (e: any) {
                return { error: 'Failed to serialize image', message: e.message };
              }
            }) : 'no images'
          },
          listingData: {
            uri: listingData.uri,
            cid: listingData.cid,
            type: (listingData as any).$type,
            title: (listingData as any).title,
            hasImages: Boolean((listingData as any).images),
            imagesIsArray: Array.isArray((listingData as any).images),
            imagesLength: Array.isArray((listingData as any).images) ? (listingData as any).images.length : 'not array',
          }
        };
        
        try {
          const rawJson = JSON.stringify(record.data);
          const cidMatches = rawJson.match(/bafk(?:re)?[a-zA-Z0-9]{44,60}/g) || [];
          
          if (cidMatches.length > 0) {
            const directUrls = cidMatches.map(cid => ({
              thumbnail: `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`,
              fullsize: `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@jpeg`,
              mimeType: 'image/jpeg',
              extractedCid: cid
            }));
            
            listingData.extractedImageUrls = directUrls;
          }
        } catch (error) {
          console.error('Failed to extract CIDs from raw data:', error);
        }
        
        console.log('Created listing object:', listingData);
        
        if (!listingData.authorDid) {
          console.error('Author DID is missing, using DID from the URI');
          listingData.authorDid = did;
        }
        
        console.log(`Found ${listingData.images ? listingData.images.length : 0} images in the listing`);
          
        if (listingData.images && Array.isArray(listingData.images)) {
          console.log(`Found ${listingData.images.length} images in the listing`);
          
          listingData.images = listingData.images.filter((image: any) => {
            if (!image) {
              console.warn('Skipping null/undefined image object');
              return false;
            }
            
            if (image.$type === 'blob' && image.ref && typeof image.ref === 'object') {
              if (image.ref.$link) {
                return true;
              }
            }

            if (typeof image === 'object' && image.$link) {
              return true;
            }
            
            console.warn('Skipping invalid image object, missing ref.$link:', image);
            return false;
          });
          
          if (listingData.images.length > 0) {
            console.log('First image object after validation:', JSON.stringify(listingData.images[0], null, 2));
            console.log(`Validated ${listingData.images.length} images`);
          }
        } else {
          console.warn('No images found in the listing or images is not an array');
          listingData.images = [];
        }
        
        setListing(listingData);
        
        try {
          console.log('Fetching seller profile for:', listingData.authorDid);
          
          const profileRecord = await agent.api.com.atproto.repo.getRecord({
            repo: did,
            collection: 'app.bsky.actor.profile',
            rkey: 'self'
          });
          
          console.log('Got profile record:', profileRecord.data);
          
          if (profileRecord.data && profileRecord.data.value) {
            const profileData: { 
              did: string;
              handle: string;
              displayName?: string;
              description?: string;
              avatarUrl?: string;
            } = {
              did: did,
              handle: did.split(':')[2],
              displayName: (profileRecord.data.value as any).displayName,
              description: (profileRecord.data.value as any).description
            };
            
            if ((profileRecord.data.value as any).avatar && 
                (profileRecord.data.value as any).avatar.ref && 
                (profileRecord.data.value as any).avatar.ref.$link) {
              const avatarCid = (profileRecord.data.value as any).avatar.ref.$link;
              const mimeType = (profileRecord.data.value as any).avatar.mimeType || 'image/jpeg';
              const extension = mimeType.split('/')[1] || 'jpeg';
              
              profileData.avatarUrl = `https://cdn.bsky.app/img/avatar/plain/${did}/${avatarCid}@${extension}`;
            }
            
            setSellerProfile(profileData);
          }
        } catch (profileError) {
          console.error('Failed to fetch seller profile:', profileError);
          
          const basicProfile = {
            did: did,
            handle: did.split(':')[2],
            displayName: null
          };
          setSellerProfile(basicProfile);
        }
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
  
  const directImageUrls = React.useMemo(() => {
    if (listing && listing.extractedImageUrls && listing.extractedImageUrls.length > 0) {
      return listing.extractedImageUrls;
    }
    
    if (!listing || !listing.images || !Array.isArray(listing.images)) {
      return [];
    }
    
    const urls = [];
    
    for (let i = 0; i < listing.images.length; i++) {
      const image = listing.images[i];
      
      try {
        const imageUrls = createBlueskyCdnImageUrls(image, listing.authorDid, image.mimeType);
        
        urls.push({
          thumbnail: imageUrls.thumbnail,
          fullsize: imageUrls.fullsize,
          mimeType: image.mimeType || 'image/jpeg'
        });
      } catch (err) {
        console.error(`Error processing image ${i}:`, err);
      }
    }
    
    return urls;
  }, [listing]);
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <Link href="/browse" className="text-primary-color hover:text-primary-light hover:underline">
            Back to Listings
          </Link>
        </div>
        <div className="animate-pulse bg-neutral-light h-96 rounded-lg"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Error</h1>
          <Link href="/browse" className="text-primary-color hover:text-primary-light hover:underline">
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
          <h1 className="text-2xl font-bold text-text-primary">No Listing Found</h1>
          <Link href="/browse" className="text-primary-color hover:text-primary-light hover:underline">
            Back to Listings
          </Link>
        </div>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          No listing data was found for this ID.
        </div>
      </div>
    );
  }
  
  const formattedPrice = listing.price.includes('$')
    ? listing.price
    : `$${listing.price}`;
  
  const createdDate = new Date(listing.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{listing.title}</h1>
        <Link href="/browse" className="text-primary-color hover:text-primary-light hover:underline">
          Back to Listings
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="w-full h-96 bg-neutral-light flex items-center justify-center">
          {directImageUrls.length > 0 ? (
            <img 
              src={directImageUrls[selectedImageIndex].fullsize} 
              alt={listing.title}
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
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
              <div className="text-text-secondary text-center">
                <p>No images available for this listing</p>
              </div>
            </div>
          )}
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 bg-neutral-light/30 border-t border-neutral-light text-xs">
            <details>
              <summary className="text-primary-color cursor-pointer">Debug Information</summary>
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
                    <pre className="bg-white p-2 mt-1 rounded overflow-x-auto border border-neutral-light">
                      {JSON.stringify(listing.images, null, 2)}
                    </pre>
                    
                    <p className="mt-2 font-semibold">Image Processing Diagnostics:</p>
                    <div className="bg-white p-2 rounded border border-neutral-light">
                      <ul className="list-disc list-inside">
                        <li>Images array exists? <code>{listing.images ? 'Yes' : 'No'}</code></li>
                        <li>Images is array? <code>{Array.isArray(listing.images) ? 'Yes' : 'No'}</code></li>
                        <li>Images count: <code>{listing.images ? listing.images.length : 0}</code></li>
                        <li>Listing has authorDid? <code>{listing.authorDid ? 'Yes' : 'No'}</code></li>
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className="bg-primary-light/10 p-2 border border-primary-light/20 rounded mt-4">
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
        
        {directImageUrls.length > 1 && (
          <div className="flex gap-2 p-4 bg-neutral-light/30">
            {directImageUrls.map((url: any, i: number) => (
              <div 
                key={i} 
                onClick={() => setSelectedImageIndex(i)}
                className={`w-20 h-20 border-2 rounded-md overflow-hidden cursor-pointer transition-all
                  ${i === selectedImageIndex ? 'border-primary-color shadow-md' : 'border-neutral-light'}`}
              >
                <img 
                  src={url.thumbnail} 
                  alt={`${listing.title} thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-image.svg';
                    e.currentTarget.alt = 'Thumbnail failed to load';
                  }}
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="p-6">
          <div className="text-2xl font-bold text-primary-color mb-4">
            {formattedPrice}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-2 text-text-primary">Description</h2>
              <p className="text-text-secondary mb-4">{listing.description}</p>
              
              <h2 className="text-lg font-semibold mb-2 text-text-primary">Details</h2>
              <div className="space-y-2">
                <div className="flex">
                  <span className="font-medium w-24">Category:</span> 
                  <span className="badge">{listing.category}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Condition:</span> 
                  <span className="badge">{listing.condition}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Location:</span> 
                  <span className="text-text-secondary">
                    {listing.location.locality}, {listing.location.county}, {listing.location.state}
                    {listing.location.zipPrefix && ` (${listing.location.zipPrefix}xx)`}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <div className="bg-neutral-light/30 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 border-b pb-2 border-neutral-light text-text-primary">Listing Information</h2>
                
                <div className="space-y-2">
                  <div className="flex">
                    <span className="font-medium w-24">Listed on:</span> 
                    <span className="text-text-secondary">{formattedDate}</span>
                  </div>
                  
                  <div className="flex items-center rounded">
                    <span className="font-medium w-24 shrink-0">Seller:</span> 
                    <div className="flex items-center">
                      {sellerProfile?.avatarUrl && (
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-2 bg-white flex-shrink-0 border border-neutral-light">
                          <img 
                            src={sellerProfile.avatarUrl} 
                            alt="Seller avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <span className="text-text-primary font-bold">
                        {sellerProfile?.displayName ? (
                          <>
                            {sellerProfile.displayName} 
                          </>
                        ) : (
                          <span className="text-text-secondary">
                            <span className="bg-yellow-100 px-1 rounded">User ID:</span> @{sellerProfile?.handle || listing.authorDid.split(':')[2].substring(0, 8)}...
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    className="btn-primary w-full"
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