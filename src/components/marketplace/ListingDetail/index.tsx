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
  Tag,
  UserPlus,
  CheckCircle,
  Info
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
  const [isFollowingSellerState, setIsFollowingSellerState] = useState(false);
  const [isLoadingFollowBot, setIsLoadingFollowBot] = useState(false);
  const [isLoadingFollowSeller, setIsLoadingFollowSeller] = useState(false);
  const [isSendingInterest, setIsSendingInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [isCheckingFollowStatus, setIsCheckingFollowStatus] = useState(true);

  // Check if this is the user's own listing
  const isOwnListing = user?.did && listing.authorDid && user.did === listing.authorDid;

  // Storage key for persisting interest sent state
  const interestStorageKey = listing.uri ? `interest-sent-${listing.uri}` : null;

  // Check if user follows bot and seller on mount
  React.useEffect(() => {
    async function checkFollowStatus() {
      if (isLoggedIn && client?.agent && user?.did) {
        setIsCheckingFollowStatus(true);
        try {
          const { isFollowingBot, isFollowingUser } = await import('@/lib/bot-utils');

          // Check if interest was already sent (from localStorage)
          if (interestStorageKey) {
            const alreadySent = localStorage.getItem(interestStorageKey) === 'true';
            if (alreadySent) {
              setInterestSent(true);
            }
          }

          // Check if user follows the bot
          const followsBot = await isFollowingBot(client.agent, user.did);
          setIsFollowingBotState(followsBot);

          // Check if user follows the seller (only if seller DID exists and not own listing)
          if (listing.authorDid && !isOwnListing) {
            const followsSeller = await isFollowingUser(client.agent, listing.authorDid);
            setIsFollowingSellerState(followsSeller);
          }
        } catch (e) {
          console.error('Error checking follow status:', e);
        } finally {
          setIsCheckingFollowStatus(false);
        }
      } else {
        setIsCheckingFollowStatus(false);
      }
    }
    checkFollowStatus();
  }, [isLoggedIn, client, user, listing.authorDid, isOwnListing, interestStorageKey]);

  const handleFollowBot = async () => {
    if (!client?.agent) return;
    setIsLoadingFollowBot(true);
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
      setIsLoadingFollowBot(false);
    }
  };

  const handleFollowSeller = async () => {
    if (!client?.agent || !listing.authorDid) return;
    setIsLoadingFollowSeller(true);
    try {
      const { followUser } = await import('@/lib/bot-utils');
      const success = await followUser(client.agent, listing.authorDid);
      if (success) {
        setIsFollowingSellerState(true);
      } else {
        alert('Failed to follow the seller. Please try again.');
      }
    } catch (e) {
      console.error('Follow seller error:', e);
      alert('Error following seller');
    } finally {
      setIsLoadingFollowSeller(false);
    }
  };

  // State for rate limit error
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const handleShowInterest = async () => {
    if (!listing.authorDid || !user?.handle || !user?.did) return;

    setIsSendingInterest(true);
    setRateLimitError(null);
    try {
      const response = await fetch('/api/bot/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerDid: listing.authorDid,
          listingTitle: listing.title,
          listingPath: window.location.href,
          buyerHandle: user.handle,
          buyerDid: user.did
        })
      });

      const data = await response.json();

      if (response.ok) {
        setInterestSent(true);
        // Persist to localStorage to prevent re-sending
        if (interestStorageKey) {
          localStorage.setItem(interestStorageKey, 'true');
        }
      } else if (response.status === 429) {
        // Rate limit exceeded
        setRateLimitError(data.message || `Rate limit exceeded. Please wait ${data.resetInMinutes || 60} minutes before trying again.`);
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

  // Determine the current step in the interest flow
  const getInterestFlowStep = (): 'loading' | 'follow-bot' | 'follow-seller' | 'ready' | 'sent' | 'own-listing' => {
    if (isOwnListing) return 'own-listing';
    if (isCheckingFollowStatus) return 'loading';
    if (interestSent) return 'sent';
    if (!isFollowingBotState) return 'follow-bot';
    if (!isFollowingSellerState) return 'follow-seller';
    return 'ready';
  };

  const flowStep = getInterestFlowStep();

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

          {/* Show Interest Section */}
          <div className="space-y-3">
            {isLoggedIn ? (
              <>
                {/* Step indicator for multi-step flow */}
                {flowStep !== 'sent' && flowStep !== 'own-listing' && flowStep !== 'loading' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isFollowingBotState ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {isFollowingBotState ? <CheckCircle size={14} /> : '1'}
                    </div>
                    <div className={`h-0.5 flex-1 ${isFollowingBotState ? 'bg-green-200' : 'bg-gray-200'}`} />
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isFollowingSellerState ? 'bg-green-100 text-green-600' : isFollowingBotState ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isFollowingSellerState ? <CheckCircle size={14} /> : '2'}
                    </div>
                    <div className={`h-0.5 flex-1 ${isFollowingSellerState ? 'bg-green-200' : 'bg-gray-200'}`} />
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      flowStep === 'ready' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      3
                    </div>
                  </div>
                )}

                {/* Loading state */}
                {flowStep === 'loading' && (
                  <button
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 text-gray-500 font-medium rounded-xl"
                    disabled
                  >
                    <Loader2 size={20} className="animate-spin" />
                    Checking status...
                  </button>
                )}

                {/* Own listing - can't show interest in your own listing */}
                {flowStep === 'own-listing' && (
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-sm text-gray-600">This is your listing</p>
                  </div>
                )}

                {/* Step 1: Follow the bot */}
                {flowStep === 'follow-bot' && (
                  <>
                    <button
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleFollowBot}
                      disabled={isLoadingFollowBot}
                    >
                      {isLoadingFollowBot ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Following...
                        </>
                      ) : (
                        <>
                          <UserPlus size={20} />
                          Step 1: Follow Our Bot
                        </>
                      )}
                    </button>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Bluesky requires mutual follows to chat. Follow our bot to enable the introduction system.
                      </p>
                    </div>
                  </>
                )}

                {/* Step 2: Follow the seller */}
                {flowStep === 'follow-seller' && (
                  <>
                    <button
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleFollowSeller}
                      disabled={isLoadingFollowSeller}
                    >
                      {isLoadingFollowSeller ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Following...
                        </>
                      ) : (
                        <>
                          <UserPlus size={20} />
                          Step 2: Follow the Seller
                        </>
                      )}
                    </button>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Follow the seller so they can message you back after seeing your interest.
                      </p>
                    </div>
                  </>
                )}

                {/* Step 3: Show interest (ready to send) */}
                {flowStep === 'ready' && (
                  <>
                    {rateLimitError ? (
                      <>
                        <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-100 text-amber-700 font-medium rounded-xl">
                          <Info size={20} />
                          Limit Reached
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                          <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700">
                            {rateLimitError}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleShowInterest}
                          disabled={isSendingInterest}
                        >
                          {isSendingInterest ? (
                            <>
                              <Loader2 size={20} className="animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send size={20} />
                              Show Interest
                            </>
                          )}
                        </button>
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-700">
                            Our bot will introduce you to the seller via Bluesky DM. They can then message you directly.
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Interest sent - success state */}
                {flowStep === 'sent' && (
                  <>
                    <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-green-100 text-green-700 font-medium rounded-xl">
                      <CheckCircle size={20} />
                      Interest Sent!
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                      <Info size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-700">
                        The seller has been notified of your interest. They will reach out to you via Bluesky DM if interested.
                        Please wait for them to respond.
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  <MessageCircle size={20} />
                  Log in to Show Interest
                </Link>
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <Info size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    Log in with your Bluesky account to contact the seller.
                  </p>
                </div>
              </>
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
