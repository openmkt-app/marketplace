// src/components/marketplace/ListingDetail/index.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import ListingImageGallery from '../ListingImageGallery';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice } from '@/lib/price-utils';
import { extractSubcategoryFromDescription, formatCategoryDisplay, getCategoryName } from '@/lib/category-utils';
import { getSellerDisplayName } from '@/lib/chat-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import {
  MessageCircle,
  Send,
  Loader2,
  MapPin,
  Calendar,
  Share2,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface ListingDetailProps {
  listing: MarketplaceListing & {
    authorDid?: string;
    authorHandle?: string;
    authorDisplayName?: string;
    uri?: string;
    cid?: string;
  };
  sellerProfile?: {
    did: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
  } | null;
}

export default function ListingDetail({ listing, sellerProfile }: ListingDetailProps) {
  // Format creation date
  const createdDate = new Date(listing.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Get clean description without subcategory text
  const { cleanDescription, subcategory } = extractSubcategoryFromDescription(listing.description);

  // Determine if we have formatted images to display
  const hasFormattedImages = listing.formattedImages && listing.formattedImages.length > 0;

  // Contact/Bot state
  const { isLoggedIn, client, user } = useAuth();
  const [isFollowingBotState, setIsFollowingBotState] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isSendingInterest, setIsSendingInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);

  // Check if user follows bot on mount
  React.useEffect(() => {
    async function checkFollow() {
      if (isLoggedIn && client?.agent && user?.did) {
        try {
          const { isFollowingBot } = await import('@/lib/bot-utils');
          const isFollowing = await isFollowingBot(client.agent, user.did);
          setIsFollowingBotState(isFollowing);
        } catch (e) {
          console.error('Error checking bot follow:', e);
        }
      }
    }
    checkFollow();
  }, [isLoggedIn, client, user]);

  const handleFollowBot = async () => {
    if (!client?.agent) return;
    setIsLoadingFollow(true);
    try {
      const { followBot } = await import('@/lib/bot-utils');
      const success = await followBot(client.agent);
      if (success) {
        setIsFollowingBotState(true);
      } else {
        alert('Failed to follow the bot. Please try again.');
      }
    } catch (e) {
      console.error('Follow bot error:', e);
      alert('Error following bot');
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleInterestedClick = async () => {
    if (!listing.authorDid || !user?.handle) return;

    setIsSendingInterest(true);
    try {
      const response = await fetch('/api/bot/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerDid: listing.authorDid,
          listingTitle: listing.title,
          listingPath: window.location.href,
          buyerHandle: user.handle
        })
      });

      const data = await response.json();

      if (response.ok) {
        setInterestSent(true);
      } else {
        alert(`Failed to notify seller: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error notifying seller:', error);
      alert('Failed to send interest notification.');
    } finally {
      setIsSendingInterest(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Check out this listing: ${listing.title}`,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Get category for badge display using proper formatting
  const mainCategory = getCategoryName(listing.category);
  const fullCategoryDisplay = formatCategoryDisplay(listing.category, listing);

  // Get tags from category - use the formatted names
  const tags: string[] = [];
  const categoryParts = listing.category?.split('/') || [];
  if (categoryParts[0]) {
    tags.push(getCategoryName(categoryParts[0]));
  }
  if (subcategory) {
    tags.push(subcategory);
  } else if (categoryParts[1]) {
    // Try to get the subcategory name from metadata or use the ID
    const subName = listing.metadata?.subcategory || categoryParts[1];
    if (subName && !tags.includes(subName)) {
      tags.push(subName);
    }
  }

  const sellerDisplayName = getSellerDisplayName(listing);
  const sellerHandle = listing.authorHandle || sellerProfile?.handle;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column - Image and Description */}
      <div className="lg:col-span-3 space-y-6">
        {/* Image Gallery */}
        {hasFormattedImages ? (
          <ListingImageGallery
            images={listing.formattedImages!}
            title={listing.title}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center">
              <span className="text-gray-500">No images available</span>
            </div>
          </div>
        )}

        {/* Description Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-600 whitespace-pre-line leading-relaxed">
            {cleanDescription}
          </p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full"
                >
                  <Tag size={14} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Details Card */}
      <div className="lg:col-span-2 space-y-4">
        {/* Main Details Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Category Badge and Share */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md uppercase tracking-wide">
              {mainCategory}
            </span>
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Share listing"
            >
              <Share2 size={20} />
            </button>
          </div>

          {/* Title and Price */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <p className="text-2xl font-bold text-blue-600 mb-6">{formatPrice(listing.price)}</p>

          {/* Seller Info */}
          {(sellerDisplayName || sellerHandle) && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                {sellerProfile?.avatarUrl ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    <Image
                      src={sellerProfile.avatarUrl}
                      alt={sellerDisplayName || 'Seller'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {(sellerDisplayName || sellerHandle || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{sellerDisplayName}</p>
                  {sellerHandle && (
                    <p className="text-sm text-gray-500">@{sellerHandle.replace('.bsky.social', '')}</p>
                  )}
                </div>
              </div>
              {sellerHandle && (
                <Link
                  href={`https://bsky.app/profile/${sellerHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  View Profile
                </Link>
              )}
            </div>
          )}

          {/* Condition and Listed Date Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Condition</p>
              <p className="font-medium text-gray-900">{formatConditionForDisplay(listing.condition)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Listed</p>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <p className="font-medium text-gray-900">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="p-3 bg-gray-50 rounded-lg mb-6">
            <p className="text-xs text-gray-500 mb-1">Location</p>
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              <p className="font-medium text-gray-900">
                {listing.location.locality}, {listing.location.state}
              </p>
            </div>
          </div>

          {/* Contact Button */}
          <div className="space-y-3">
            {isLoggedIn ? (
              <>
                {!isFollowingBotState ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleFollowBot}
                    disabled={isLoadingFollow}
                  >
                    {isLoadingFollow ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Following...
                      </>
                    ) : (
                      <>
                        <MessageCircle size={20} />
                        Enable Messaging
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      interestSent
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    onClick={handleInterestedClick}
                    disabled={isSendingInterest || interestSent}
                  >
                    {isSendingInterest ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Contacting Seller...
                      </>
                    ) : interestSent ? (
                      <>
                        <Send size={20} />
                        Interest Sent!
                      </>
                    ) : (
                      <>
                        <MessageCircle size={20} />
                        Contact Seller
                      </>
                    )}
                  </button>
                )}

                {interestSent && (
                  <p className="text-xs text-gray-500 text-center">
                    To protect privacy, our bot introduces you to the seller.
                    Please wait for them to accept your request.
                  </p>
                )}
              </>
            ) : (
              <button
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                onClick={() => alert('Please log in to contact the seller')}
              >
                <MessageCircle size={20} />
                Log in to Contact Seller
              </button>
            )}
          </div>
        </div>

        {/* Marketplace Safety Tips */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={20} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Marketplace Safety</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>Meet in a public place.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>Check the item before paying.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>Payment happens outside this app (Cash/Zelle).</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
