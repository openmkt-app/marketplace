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
import { linkifyText } from '@/lib/linkify';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import {
  MessageCircle,
  Send,
  Loader2,
  MapPin,
  Globe,
  Calendar,
  Share2,
  ShieldCheck,
  Tag,
  UserPlus,
  CheckCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { isOnlineStore, formatLocationShort } from '@/lib/location-utils';
import { getPlatformDisplayName } from '@/lib/external-link-utils';
import { trackListingView, trackInterest } from '@/lib/analytics';

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
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [isCheckingFollowStatus, setIsCheckingFollowStatus] = useState(true);

  // Reporting State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDescription, setReportDescription] = useState('');

  // Check if this is the user's own listing
  const isOwnListing = user?.did && listing.authorDid && user.did === listing.authorDid;

  // Storage key for persisting interest sent state - scoped to user!
  const interestStorageKey = listing.uri && user?.did ? `interest-sent-${user.did}-${listing.uri}` : null;

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
            setInterestSent(alreadySent);
          } else {
            setInterestSent(false);
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

  // Track listing view on mount
  React.useEffect(() => {
    trackListingView({
      uri: listing.uri,
      title: listing.title,
      category: listing.category,
      price: listing.price,
      authorDid: listing.authorDid
    });
  }, [listing]);

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

        // Track interest (lead generation)
        trackInterest({
          uri: listing.uri,
          title: listing.title,
          category: listing.category,
          price: listing.price,
          sellerDid: listing.authorDid
        });
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

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing.uri) return;

    setIsSubmittingReport(true);
    try {
      const response = await fetch('/api/admin/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingUri: listing.uri,
          reason: reportReason,
          description: reportDescription,
          reporterDid: user?.did
        })
      });

      if (response.ok) {
        alert('Report submitted. An admin will review this listing shortly.');
        setIsReportModalOpen(false);
        setReportDescription('');
        setReportReason('Spam');
      } else {
        const data = await response.json();
        alert(`Failed to submit report: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
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
            {linkifyText(cleanDescription)}
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
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center gap-3 mb-3">
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
                <div className="flex gap-2">
                  <Link
                    href={`/store/${sellerHandle}`}
                    className="flex-1 px-3 py-2 text-sm font-medium text-center text-white bg-primary-color rounded-lg hover:bg-primary-light hover:text-white transition-colors"
                  >
                    View Store
                  </Link>
                  <Link
                    href={`https://bsky.app/profile/${sellerHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 text-sm font-medium text-center text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    Bluesky Profile
                  </Link>
                </div>
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
              {isOnlineStore(listing.location) ? (
                <Globe size={14} className="text-blue-400" />
              ) : (
                <MapPin size={14} className="text-gray-400" />
              )}
              <p className="font-medium text-gray-900">
                {formatLocationShort(listing.location)}
              </p>
            </div>
          </div>

          {/* Show Interest Section */}
          <div className="space-y-3">
            {/* External Buy Button - Always show if externalUrl exists */}
            {listing.externalUrl && (
              <div className="space-y-2">
                <a
                  href={listing.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-lg font-bold rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ExternalLink size={24} />
                  Buy on {getPlatformDisplayName(listing.externalUrl) || 'Website'}
                </a>
                <p className="text-center text-xs text-gray-500">
                  Opens in a new tab on {getPlatformDisplayName(listing.externalUrl) || 'external website'}
                </p>
              </div>
            )}

            {isLoggedIn ? (
              <>
                {/* 1. Own Listing State */}
                {isOwnListing ? (
                  <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl text-center space-y-3">
                    <p className="font-medium text-blue-800">This is your listing.</p>
                    <Link
                      href="/my-listings"
                      className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      Click here to manage your listings
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                ) : interestSent ? (
                  /* 2. Success State */
                  <div className="space-y-3">
                    <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-green-100 text-green-700 font-medium rounded-xl">
                      <CheckCircle size={20} />
                      Interest Sent!
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                      <Info size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-700">
                        The seller has been notified of your interest. They will reach out to you via Bluesky DM if interested.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* 3. Primary Action Button */
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        if (isFollowingBotState && isFollowingSellerState) {
                          handleShowInterest();
                        } else {
                          setIsInterestModalOpen(true);
                        }
                      }}
                      disabled={isCheckingFollowStatus || isSendingInterest}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSendingInterest ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageCircle size={24} />
                          I&apos;m Interested
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-500">
                      Click to contact the seller via secure DM
                    </p>
                  </div>
                )}

                {/* MODAL: Interest Flow */}
                {isInterestModalOpen && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Contact Seller</h3>
                        <button
                          onClick={() => setIsInterestModalOpen(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>

                      <div className="space-y-6">
                        <p className="text-sm text-gray-600">
                          To protect privacy and ensure delivery, please complete these steps to enable secure messaging.
                        </p>

                        {/* Step 1: Follow Bot */}
                        <div className={`p-4 rounded-lg border ${isFollowingBotState ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold ${isFollowingBotState ? 'text-green-700' : 'text-gray-900'}`}>1. Enable Notifications</span>
                            {isFollowingBotState && <CheckCircle size={18} className="text-green-600" />}
                          </div>
                          {!isFollowingBotState ? (
                            <button
                              onClick={handleFollowBot}
                              disabled={isLoadingFollowBot}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              {isLoadingFollowBot ? <Loader2 size={16} className="animate-spin" /> : 'Follow Marketplace Bot'}
                            </button>
                          ) : (
                            <p className="text-xs text-green-700">You are following the bot.</p>
                          )}
                        </div>

                        {/* Step 2: Follow Seller */}
                        <div className={`p-4 rounded-lg border ${isFollowingSellerState ? 'bg-green-50 border-green-200' : isFollowingBotState ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold ${isFollowingSellerState ? 'text-green-700' : 'text-gray-900'}`}>2. Connect with Seller</span>
                            {isFollowingSellerState && <CheckCircle size={18} className="text-green-600" />}
                          </div>
                          {!isFollowingSellerState && (
                            isFollowingBotState ? (
                              <button
                                onClick={handleFollowSeller}
                                disabled={isLoadingFollowSeller}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                {isLoadingFollowSeller ? <Loader2 size={16} className="animate-spin" /> : 'Follow Seller'}
                              </button>
                            ) : (
                              <p className="text-xs text-gray-500">Complete step 1 first.</p>
                            )
                          )}
                          {isFollowingSellerState && <p className="text-xs text-green-700">You are following the seller.</p>}
                        </div>

                        {/* Step 3: Send Interest */}
                        <div className="pt-2 border-t border-gray-100">
                          {rateLimitError && (
                            <p className="text-xs text-amber-600 mb-2">{rateLimitError}</p>
                          )}
                          <button
                            onClick={() => {
                              handleShowInterest();
                              // Close modal on success is handled by effect or manual check, but handleShowInterest sets state.
                              // We can close modal if success. 
                              // Actually handleShowInterest sets 'interestSent'.
                              // We should close modal here if send is triggered? 
                              // Better to let the user see "Sending..." then close.
                              // We'll assume handleShowInterest works.
                              setIsInterestModalOpen(false);
                            }}
                            disabled={!isFollowingBotState || !isFollowingSellerState || isSendingInterest}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {isSendingInterest ? (
                              <>
                                <Loader2 size={20} className="animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send size={20} />
                                Send Interest
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Logged Out State */
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

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="text-xs text-gray-400 hover:text-red-600 hover:underline flex items-center gap-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                <line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
              Report this listing
            </button>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Report Listing</h3>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Spam">Spam</option>
                  <option value="Scam">Scam / Fraud</option>
                  <option value="Illegal">Illegal Goods</option>
                  <option value="Offensive">Offensive Content</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Please provide more details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                  disabled={isSubmittingReport}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
