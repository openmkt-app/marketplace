'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BskyAgent } from '@atproto/api';
import { createBlueskyCdnImageUrls } from '@/lib/image-utils';
import ListingDetail from '@/components/marketplace/ListingDetail';
import type { ListingData } from '@/lib/server/fetch-listing';

type Props = {
  listingId: string;
  initialListing: ListingData | null;
  isNewListing: boolean;
  isRemoved?: boolean;
};

export default function ListingPageClient({ listingId, initialListing, isNewListing, isRemoved: initialIsRemoved }: Props) {
  const [listing, setListing] = useState<any>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialListing && !initialIsRemoved);
  const [error, setError] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(initialIsRemoved ?? false);
  const [sellerProfile, setSellerProfile] = useState<any>(
    initialListing
      ? {
          did: initialListing.authorDid,
          handle: initialListing.authorHandle,
          displayName: initialListing.authorDisplayName,
          avatarUrl: initialListing.authorAvatarUrl,
        }
      : null
  );
  const [showSuccessMessage, setShowSuccessMessage] = useState(isNewListing);

  useEffect(() => {
    // Hide the success message after 8 seconds
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  useEffect(() => {
    // If we already have initial listing data from server, or it's known removed, no need to fetch
    if (initialListing || initialIsRemoved) {
      return;
    }

    const fetchListing = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const id = decodeURIComponent(listingId);

        if (!id) {
          throw new Error('No listing ID provided');
        }

        // Fetch from AT Protocol
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
            listingData.formattedImages = directUrls;
          }
        } catch (error) {
          console.error('Failed to extract CIDs from raw data:', error);
        }

        if (!listingData.authorDid) {
          listingData.authorDid = did;
        }

        if (listingData.images && Array.isArray(listingData.images)) {
          listingData.images = listingData.images.filter((image: any) => {
            if (!image) {
              return false;
            }

            if (image.$type === 'blob' || image.mimeType) {
              if (image.ref) return true;
            }

            if (typeof image === 'object' && image.$link) {
              return true;
            }

            return false;
          });

          if (listingData.images.length > 0) {
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
          listingData.images = [];
        }

        setListing(listingData);

        // Fetch seller profile
        try {
          const repoInfo = await agent.api.com.atproto.repo.describeRepo({
            repo: did
          });

          const profileData: {
            did: string;
            handle: string;
            displayName?: string;
            description?: string;
            avatarUrl?: string;
          } = {
            did: did,
            handle: repoInfo.data.handle || did.split(':')[2],
            displayName: undefined,
            description: undefined
          };

          try {
            const profileRecord = await agent.api.com.atproto.repo.getRecord({
              repo: did,
              collection: 'app.bsky.actor.profile',
              rkey: 'self'
            });

            if (profileRecord.data && profileRecord.data.value) {
              profileData.displayName = (profileRecord.data.value as any).displayName;
              profileData.description = (profileRecord.data.value as any).description;

              const avatar = (profileRecord.data.value as any).avatar;
              let avatarCid: string | undefined;

              if (avatar && typeof avatar === 'object') {
                const avatarObj = avatar as Record<string, unknown>;

                if (avatarObj.ref && typeof avatarObj.ref === 'object') {
                  const ref = avatarObj.ref as Record<string, unknown>;
                  if (typeof ref.$link === 'string') {
                    avatarCid = ref.$link;
                  }
                }

                if (!avatarCid && typeof avatarObj.$link === 'string') {
                  avatarCid = avatarObj.$link;
                }

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
          } catch {
            // Profile record not available
          }

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
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Could not locate record')) {
          setIsRemoved(true);
        } else {
          setError(`Failed to load listing: ${msg}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [listingId, initialListing]);

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

  if (isRemoved) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-6">
            <Link href="/browse" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to listings
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">This listing has been removed</h1>
            <p className="text-gray-500 mb-6">The seller has deleted this listing. It is no longer available.</p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-primary-color hover:bg-primary-dark text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse other listings
            </Link>
          </div>
        </div>
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
            <p>Attempted to load listing: {decodeURIComponent(listingId)}</p>
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
