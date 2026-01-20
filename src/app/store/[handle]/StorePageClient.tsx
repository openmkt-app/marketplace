'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BskyAgent } from '@atproto/api';
import { MarketplaceListing } from '@/lib/marketplace-client';
import { generateImageUrls } from '@/lib/image-utils';
import { MARKETPLACE_COLLECTION } from '@/lib/constants';
import ListingCard from '@/components/marketplace/ListingCard';
import { ExternalLink, Calendar } from 'lucide-react';
import type { SellerProfile } from '@/lib/server/fetch-store';

interface SellerListing extends MarketplaceListing {
  uri: string;
  cid: string;
  authorDid: string;
  authorHandle: string;
  authorDisplayName?: string;
  authorAvatarCid?: string;
}

type Props = {
  handle: string;
  initialProfile: SellerProfile | null;
  initialListingsCount: number;
};

export default function StorePageClient({ handle: encodedHandle, initialProfile, initialListingsCount }: Props) {
  const handle = decodeURIComponent(encodedHandle);

  const [profile, setProfile] = useState<SellerProfile | null>(initialProfile);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStoreData() {
      try {
        setLoading(true);
        setError(null);

        // Create a public agent to fetch data
        const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });

        // Fetch the user's profile
        const profileResult = await agent.getProfile({ actor: handle });

        if (!profileResult.success) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = profileResult.data;
        setProfile({
          did: profileData.did,
          handle: profileData.handle,
          displayName: profileData.displayName,
          description: profileData.description,
          avatar: profileData.avatar,
          banner: profileData.banner,
          followersCount: profileData.followersCount,
          followsCount: profileData.followsCount,
          postsCount: profileData.postsCount,
          createdAt: profileData.createdAt,
        });

        // Fetch the user's marketplace listings
        // We need to resolve their PDS first
        let pdsEndpoint = 'https://bsky.social';
        try {
          const didDocResponse = await agent.com.atproto.identity.resolveHandle({ handle });
          const did = didDocResponse.data.did;

          // Try to resolve the PDS from the DID document
          const didDoc = await fetch(`https://plc.directory/${did}`).then(r => r.json());
          const pdsService = didDoc.service?.find(
            (s: { id: string; type: string; serviceEndpoint: string }) =>
              s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
          );
          if (pdsService?.serviceEndpoint) {
            pdsEndpoint = pdsService.serviceEndpoint;
          }
        } catch (e) {
          console.warn('Could not resolve PDS, using default:', e);
        }

        // Create an agent for the user's PDS
        const pdsAgent = new BskyAgent({ service: pdsEndpoint });

        // Fetch listings from the marketplace collection
        const listingsResult = await pdsAgent.api.com.atproto.repo.listRecords({
          repo: profileData.did,
          collection: MARKETPLACE_COLLECTION,
          limit: 50,
        });

        if (listingsResult.success && listingsResult.data.records.length > 0) {
          const processedListings = listingsResult.data.records.map((record) => {
            const listing = record.value as MarketplaceListing;
            const formattedImages = generateImageUrls(profileData.did, listing.images);

            return {
              ...listing,
              uri: record.uri,
              cid: record.cid,
              authorDid: profileData.did,
              authorHandle: profileData.handle,
              authorDisplayName: profileData.displayName,
              authorAvatarCid: profileData.avatar ? extractAvatarCid(profileData.avatar) : undefined,
              formattedImages,
            };
          });

          // Sort by creation date (newest first)
          processedListings.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setListings(processedListings);
        } else {
          setListings([]);
        }
      } catch (err) {
        console.error('Failed to fetch store data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load store');
      } finally {
        setLoading(false);
      }
    }

    fetchStoreData();
  }, [handle]);

  // Extract avatar CID from Bluesky CDN URL
  function extractAvatarCid(avatarUrl: string): string | undefined {
    // Avatar URLs look like: https://cdn.bsky.app/img/avatar/plain/did:plc:.../bafkrei...@jpeg
    const match = avatarUrl.match(/\/(bafkrei[a-z0-9]+)@/);
    return match ? match[1] : undefined;
  }

  // Format join date
  function formatJoinDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          {/* Banner skeleton */}
          <div className="h-48 md:h-64 bg-gray-200" />

          {/* Profile section skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative -mt-16 sm:-mt-20">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gray-300 border-4 border-white" />
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-8 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-16 w-full max-w-xl bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
          <p className="text-gray-500 mb-6">
            {error || `We couldn't find a store for @${handle}. The user may not exist or may not have any marketplace listings.`}
          </p>
          <Link
            href="/browse"
            className="inline-flex items-center px-6 py-3 bg-primary-color text-white rounded-xl font-medium hover:bg-primary-light transition-colors"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Banner */}
      <div className="relative">
        {/* Banner Image */}
        <div className="h-48 md:h-64 lg:h-72 bg-gradient-to-r from-sky-400 to-blue-500 relative overflow-hidden">
          {profile.banner ? (
            <Image
              src={profile.banner}
              alt={`${profile.displayName || profile.handle}'s banner`}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600">
              {/* Decorative pattern for default banner */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            </div>
          )}
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* Profile Info Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-12 sm:-mt-14 pb-8">
            {/* Avatar, Name, and Stats Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white bg-white shadow-lg">
                  {profile.avatar ? (
                    <Image
                      src={profile.avatar}
                      alt={profile.displayName || profile.handle}
                      width={160}
                      height={160}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {(profile.displayName || profile.handle).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Handle - vertically centered with avatar */}
              <div className="mt-4 sm:mt-0 sm:pt-10 flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {profile.displayName || profile.handle}
                </h1>
                <p className="text-gray-500 flex items-center gap-2">
                  <span>@{profile.handle}</span>
                  <a
                    href={`https://bsky.app/profile/${profile.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    <ExternalLink size={14} className="ml-1" />
                  </a>
                </p>
              </div>

              {/* Stats (Desktop) - vertically centered */}
              <div className="hidden sm:flex items-center space-x-6 sm:pt-10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
                  <p className="text-sm text-gray-500">Listings</p>
                </div>
                {profile.followersCount !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{profile.followersCount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Followers</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.description && (
              <div className="mt-4 max-w-2xl">
                <p className="text-gray-700 whitespace-pre-wrap">{profile.description}</p>
              </div>
            )}

            {/* Stats (Mobile) and Meta Info */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {/* Mobile stats */}
              <div className="flex sm:hidden items-center gap-4">
                <span><strong className="text-gray-900">{listings.length}</strong> listings</span>
                {profile.followersCount !== undefined && (
                  <span><strong className="text-gray-900">{profile.followersCount.toLocaleString()}</strong> followers</span>
                )}
              </div>

              {/* Join date */}
              {profile.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Joined {formatJoinDate(profile.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Listings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {listings.length > 0 ? `${listings.length} Item${listings.length !== 1 ? 's' : ''} for Sale` : 'Items for Sale'}
          </h2>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="mx-auto h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No listings yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              This seller hasn&apos;t listed any items for sale yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.uri} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
