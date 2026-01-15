'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BskyAgent } from '@atproto/api';
import { createBlueskyCdnImageUrls } from '@/lib/image-utils';
import { demoListingsData } from '@/app/browse/demo-data';
import ListingDetail from '@/components/marketplace/ListingDetail';
import type { MarketplaceListing } from '@/lib/marketplace-client';

export default function ListingDetailPage() {
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if this is a newly created listing
    const isNewListing = searchParams.get('newListing') === 'true';
    setShowSuccessMessage(isNewListing);
    
    // Hide the message after 8 seconds
    if (isNewListing) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);
  
  useEffect(() => {
    const fetchListing = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const id = decodeURIComponent(params.id as string);
        
        if (!id) {
          throw new Error('No listing ID provided');
        }
        
        // Check if this is a demo listing
        if (id.startsWith('demo-listing-')) {
          const demoListing = demoListingsData.find(listing => listing.uri === id);
          if (demoListing) {
            setListing(demoListing);
            return;
          } else {
            throw new Error('Demo listing not found');
          }
        }
        
        // If it&apos;s not a demo listing, try to fetch from AT Protocol
        const uri = id;
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
        } as any;
        
        // Extract image CIDs from raw data
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
            listingData.formattedImages = directUrls; // Add this for ListingDetail component
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
            
            // Process images using the original logic if we don&apos;t have extracted URLs
            if (!listingData.formattedImages || listingData.formattedImages.length === 0) {
              const processedImages = [];
              
              for (let i = 0; i < listingData.images.length; i++) {
                const image = listingData.images[i];
                
                try {
                  const imageUrls = createBlueskyCdnImageUrls(image, listingData.authorDid, image.mimeType);
                  
                  processedImages.push({
                    thumbnail: imageUrls.thumbnail,
                    fullsize: imageUrls.fullsize,
                    mimeType: image.mimeType || 'image/jpeg'
                  });
                } catch (err) {
                  console.error(`Error processing image ${i}:`, err);
                }
              }
              
              listingData.formattedImages = processedImages;
            }
          }
        } else {
          console.warn('No images found in the listing or images is not an array');
          listingData.images = [];
        }
        
        setListing(listingData);
        
        // Fetch seller profile
        try {
          console.log('Fetching seller profile for:', listingData.authorDid);
          
          // First, get the repo info to get the handle
          const repoInfo = await agent.api.com.atproto.repo.describeRepo({
            repo: did
          });
          
          console.log('Got repo info:', repoInfo.data);
          
          const profileData: {
            did: string;
            handle: string;
            displayName?: string;
            description?: string;
            avatarUrl?: string;
          } = {
            did: did,
            handle: repoInfo.data.handle || did.split(':')[2], // Use actual handle from repo info
            displayName: undefined,
            description: undefined
          };
          
          // Then try to get the profile record for display name and avatar
          try {
            const profileRecord = await agent.api.com.atproto.repo.getRecord({
              repo: did,
              collection: 'app.bsky.actor.profile',
              rkey: 'self'
            });
            
            console.log('Got profile record:', profileRecord.data);
            
            if (profileRecord.data && profileRecord.data.value) {
              profileData.displayName = (profileRecord.data.value as any).displayName;
              profileData.description = (profileRecord.data.value as any).description;

              // Extract avatar blob CID with multiple fallback methods
              const avatar = (profileRecord.data.value as any).avatar;
              let avatarCid: string | undefined;

              if (avatar && typeof avatar === 'object') {
                const avatarObj = avatar as Record<string, unknown>;

                // Try ref.$link format first (standard blob format)
                if (avatarObj.ref && typeof avatarObj.ref === 'object') {
                  const ref = avatarObj.ref as Record<string, unknown>;
                  if (typeof ref.$link === 'string') {
                    avatarCid = ref.$link;
                  }
                }

                // Fallback: try direct $link on avatar
                if (!avatarCid && typeof avatarObj.$link === 'string') {
                  avatarCid = avatarObj.$link;
                }

                // Try regex extraction as last resort (finds bafk... patterns)
                if (!avatarCid) {
                  const avatarStr = JSON.stringify(avatar);
                  const cidMatch = avatarStr.match(/bafkrei[a-z0-9]{52,}/i);
                  if (cidMatch) {
                    avatarCid = cidMatch[0];
                  }
                }
              }

              if (avatarCid) {
                profileData.avatarUrl = `https://cdn.bsky.app/img/avatar/plain/${did}/${avatarCid}@jpeg`;
              }
            }
          } catch (profileRecordError) {
            console.warn('Could not fetch profile record, but we have the handle:', profileRecordError);
          }
          
          // Add seller info to listing
          listingData.authorHandle = profileData.handle;
          listingData.authorDisplayName = profileData.displayName;
          
          setSellerProfile(profileData);
          
        } catch (profileError) {
          console.error('Failed to fetch seller profile:', profileError);
          
          const basicProfile = {
            did: did,
            handle: did.split(':')[2] + '...',
            displayName: null
          };
          listingData.authorHandle = basicProfile.handle;
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
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>Attempted to load listing: {decodeURIComponent(params.id as string)}</p>
          </div>
        )}
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
  
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {showSuccessMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 sticky top-0 z-10 shadow-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-green-800">Your item is now live in the marketplace!</p>
                <p className="text-sm text-green-700">Others can discover and engage with your listing right away.</p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-500 hover:text-green-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to listings
          </Link>
        </div>

        <ListingDetail listing={listing} sellerProfile={sellerProfile} />
        
        {process.env.NODE_ENV === 'development' && listing && (
          <div className="mt-8 p-4 bg-gray-100 rounded">
            <details>
              <summary className="font-bold cursor-pointer">Debug Image Information</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <strong>Formatted Images:</strong> {listing.formattedImages ? listing.formattedImages.length : 0}
                </div>
                <div>
                  <strong>Raw Images:</strong> {listing.images ? listing.images.length : 0}
                </div>
                <div>
                  <strong>Extracted Image URLs:</strong> {listing.extractedImageUrls ? listing.extractedImageUrls.length : 0}
                </div>
                {listing.formattedImages && listing.formattedImages.length > 0 && (
                  <div>
                    <strong>First Image URLs:</strong>
                    <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(listing.formattedImages[0], null, 2)}
                    </pre>
                  </div>
                )}
                {listing.images && listing.images.length > 0 && (
                  <div>
                    <strong>First Raw Image:</strong>
                    <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(listing.images[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}