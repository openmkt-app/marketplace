// src/components/marketplace/ListingDetail/index.tsx
'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import ListingImageGallery from '../ListingImageGallery';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice, formatDate } from '@/lib/price-utils';
import { CATEGORIES } from '@/lib/category-data';
import { extractSubcategoryFromDescription, formatCategoryDisplay, getCategoryName } from '@/lib/category-utils';
import { getSellerDisplayName } from '@/lib/seller-display';
import { isAdminHandle } from '@/lib/constants';
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
  ExternalLink,
  Clock,
} from 'lucide-react';
import { COMMISSION_CATEGORY_ID } from '@/lib/artist-store-utils';
import { isOnlineStore, formatLocationShort } from '@/lib/location-utils';
import { getPlatformDisplayName } from '@/lib/external-link-utils';
import { trackListingView, trackInterest } from '@/lib/analytics';
import { hasNsfwLabel, shouldBlurListing } from '@/lib/content-labels';

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
  const t = useTranslations('listingDetail');
  const tCommon = useTranslations('common');
  const tCats = useTranslations('categories');
  const tSubs = useTranslations('subcategories');
  const tConds = useTranslations('conditions');
  const locale = useLocale();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  // Format creation date
  const formattedDate = formatDate(listing.createdAt, locale);

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

  // NSFW blur state
  const [isModFlagged, setIsModFlagged] = useState(false);
  const [isTogglingFlag, setIsTogglingFlag] = useState(false);
  const isNsfw = shouldBlurListing(listing.labels, listing.uri, isModFlagged ? new Set([listing.uri!]) : new Set());
  const [isNsfwRevealed, setNsfwRevealed] = useState(false);

  // Admin check
  const isAdmin = isAdminHandle(user?.handle);

  // Fetch moderation status on mount
  React.useEffect(() => {
    if (!listing.uri) return;
    fetch(`/api/admin/moderate?uri=${encodeURIComponent(listing.uri)}`)
      .then(res => res.json())
      .then(data => { if (data.flagged) setIsModFlagged(true); })
      .catch(() => {});
  }, [listing.uri]);

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
        alert(t('alerts.followBotFailed'));
      }
    } catch (e) {
      console.error('Follow bot error:', e);
      alert(t('alerts.followBotError'));
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
        alert(t('alerts.followSellerFailed'));
      }
    } catch (e) {
      console.error('Follow seller error:', e);
      alert(t('alerts.followSellerError'));
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
        setRateLimitError(data.message || t('alerts.notifySellerFailed', { error: 'Rate limit exceeded' }));
      } else {
        alert(t('alerts.notifySellerFailed', { error: data.error || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error notifying seller:', error);
      alert(t('alerts.interestNotificationError'));
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
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert(t('alerts.linkCopied'));
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
        alert(t('alerts.reportSubmitted'));
        setIsReportModalOpen(false);
        setReportDescription('');
        setReportReason('Spam');
      } else {
        const data = await response.json();
        alert(t('alerts.reportFailed', { error: data.error || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(t('alerts.reportError'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Get category for badge display using proper formatting
  const mainCategory = tCats(listing.category);

  // Get localized subcategory
  let subcategoryLocalized = subcategory;
  if (listing.category && listing.metadata?.subcategory) {
    const categoryObj = CATEGORIES.find(c => c.id === listing.category);
    if (categoryObj) {
      const subObj = categoryObj.subcategories.find(s => s.name === listing.metadata!.subcategory || s.id === listing.metadata!.subcategory);
      if (subObj) {
        subcategoryLocalized = tSubs(`${listing.category}.${subObj.id}`);
      }
    }
  }

  // Get tags from category - use the formatted names
  const tags: string[] = [];
  if (listing.category) {
    tags.push(tCats(listing.category));
  }
  if (subcategoryLocalized) {
    tags.push(subcategoryLocalized);
  }

  const sellerDisplayName = getSellerDisplayName(listing);
  const sellerHandle = listing.authorHandle || sellerProfile?.handle;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column - Image and Description */}
      <div className="lg:col-span-3 space-y-6">
        {/* Image Gallery */}
        {hasFormattedImages ? (
          <div className="relative">
            <ListingImageGallery
              images={listing.formattedImages!}
              title={listing.title}
            />
            {/* NSFW Blur Overlay */}
            {isNsfw && !isNsfwRevealed && (
              <div
                className="absolute inset-0 z-30 flex flex-col items-center justify-center cursor-pointer bg-black/10 backdrop-blur-2xl rounded-xl"
                onClick={() => setNsfwRevealed(true)}
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="text-white text-sm font-bold bg-red-500/80 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-lg">
                    {t('nsfwContent')}
                  </span>
                  <span className="text-white/70 text-xs">
                    {t('clickToReveal')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center">
              <span className="text-gray-500">{t('noImages')}</span>
            </div>
          </div>
        )}

        {/* Description Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('description')}</h2>
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
              aria-label={t('shareListing')}
            >
              <Share2 size={20} />
            </button>
          </div>

          {/* Title and Price */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <div className="mb-6">
            {listing.category === COMMISSION_CATEGORY_ID && (
              <p className="text-xs text-gray-400 mb-0.5">{t('startingAt')}</p>
            )}
            <p className={`text-2xl font-bold ${listing.category === COMMISSION_CATEGORY_ID ? 'text-rose-600' : 'text-blue-600'}`}>
              {formatPrice(listing.price, listing.currency, locale, tCommon('free'))}
            </p>
          </div>

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
                    {t('viewStore')}
                  </Link>
                  <Link
                    href={`https://bsky.app/profile/${sellerHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 text-sm font-medium text-center text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {t('atmosphereProfile')}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Condition and Listed Date Grid */}
          <div className={`grid ${listing.condition && listing.category !== 'digital_arts' ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
            {listing.condition && listing.category !== 'digital_arts' && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('condition')}</p>
                <p className="font-medium text-gray-900">{tConds(listing.condition)}</p>
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('listed')}</p>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <p className="font-medium text-gray-900">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* Commission Metadata */}
          {listing.category === COMMISSION_CATEGORY_ID && (
            <div className="space-y-2 mb-4">
              {listing.metadata?.slotsAvailable !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <p className="text-xs text-gray-500">{t('commissionStatus')}</p>
                  {listing.metadata.slotsAvailable === 0 ? (
                    <span className="text-sm font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {t('waitlistOnly')}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {t('slotsOpen', { count: listing.metadata.slotsAvailable })}
                    </span>
                  )}
                </div>
              )}
              {listing.metadata?.turnaroundTime && (
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                  <Clock size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{t('estimatedTurnaround')}</p>
                    <p className="font-medium text-gray-900">{listing.metadata.turnaroundTime}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location */}
          <div className="p-3 bg-gray-50 rounded-lg mb-6">
            <p className="text-xs text-gray-500 mb-1">
              {listing.category === COMMISSION_CATEGORY_ID ? t('timezoneRegion') : t('location')}
            </p>
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
                  {t('buyOn', { platform: getPlatformDisplayName(listing.externalUrl) || 'Website' })}
                </a>
                <p className="text-center text-xs text-gray-500">
                  {t('opensInNewTab', { platform: getPlatformDisplayName(listing.externalUrl) || 'external website' })}
                </p>
              </div>
            )}

            {isLoggedIn ? (
              <>
                {/* 1. Own Listing State */}
                {isOwnListing ? (
                  <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl text-center space-y-3">
                    <p className="font-medium text-blue-800">{t('ownListing')}</p>
                    <Link
                      href="/my-listings"
                      className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {t('manageListings')}
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
                      {t('interestSent')}
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                      <Info size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-700">
                        {t('interestSentBody')}
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
                          {listing.category === COMMISSION_CATEGORY_ID ? t('requestCommission') : t('imInterested')}
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-500">
                      {listing.category === COMMISSION_CATEGORY_ID
                        ? t('requestCommissionHint')
                        : t('imInterestedHint')}
                    </p>
                  </div>
                )}

                {/* MODAL: Interest Flow */}
                {isInterestModalOpen && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">{t('contactSeller')}</h3>
                        <button
                          onClick={() => setIsInterestModalOpen(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>

                      <div className="space-y-6">
                        <p className="text-sm text-gray-600">
                          {t('contactSellerHint')}
                        </p>

                        {/* Step 1: Follow Bot */}
                        <div className={`p-4 rounded-lg border ${isFollowingBotState ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold ${isFollowingBotState ? 'text-green-700' : 'text-gray-900'}`}>{t('step1Title')}</span>
                            {isFollowingBotState && <CheckCircle size={18} className="text-green-600" />}
                          </div>
                          {!isFollowingBotState ? (
                            <button
                              onClick={handleFollowBot}
                              disabled={isLoadingFollowBot}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              {isLoadingFollowBot ? <Loader2 size={16} className="animate-spin" /> : t('followBot')}
                            </button>
                          ) : (
                            <p className="text-xs text-green-700">{t('followingBot')}</p>
                          )}
                        </div>

                        {/* Step 2: Follow Seller */}
                        <div className={`p-4 rounded-lg border ${isFollowingSellerState ? 'bg-green-50 border-green-200' : isFollowingBotState ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold ${isFollowingSellerState ? 'text-green-700' : 'text-gray-900'}`}>{t('step2Title')}</span>
                            {isFollowingSellerState && <CheckCircle size={18} className="text-green-600" />}
                          </div>
                          {!isFollowingSellerState && (
                            isFollowingBotState ? (
                              <button
                                onClick={handleFollowSeller}
                                disabled={isLoadingFollowSeller}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                {isLoadingFollowSeller ? <Loader2 size={16} className="animate-spin" /> : t('followSeller')}
                              </button>
                            ) : (
                              <p className="text-xs text-gray-500">{t('completeStep1')}</p>
                            )
                          )}
                          {isFollowingSellerState && <p className="text-xs text-green-700">{t('followingSeller')}</p>}
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
                                {t('sending')}
                              </>
                            ) : (
                              <>
                                <Send size={20} />
                                {t('sendInterest')}
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
                  {t('loginToInterest')}
                </Link>
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <Info size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    {t('loginHint')}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={20} className={listing.category === COMMISSION_CATEGORY_ID ? 'text-rose-500' : 'text-blue-600'} />
            <h3 className="font-semibold text-gray-900">
              {listing.category === COMMISSION_CATEGORY_ID ? t('commissionTips') : t('safetyTips')}
            </h3>
          </div>
          {listing.category === COMMISSION_CATEGORY_ID ? (
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{t('commissionTips_1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{t('commissionTips_2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{t('commissionTips_3')}</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{t('safetyTips_1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{t('safetyTips_2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{t('safetyTips_3')}</span>
              </li>
            </ul>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="text-xs text-gray-400 hover:text-red-600 hover:underline flex items-center gap-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                <line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
              {t('reportListing')}
            </button>
          </div>

          {/* Admin Moderation */}
          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={async () => {
                  if (!listing.uri) return;
                  setIsTogglingFlag(true);
                  try {
                    const action = isModFlagged ? 'unflag' : 'flag';
                    const res = await fetch('/api/admin/moderate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ uri: listing.uri, action, handle: user?.handle })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setIsModFlagged(data.flagged);
                      if (data.flagged) setNsfwRevealed(false);
                    }
                  } catch (e) {
                    console.error('Moderation error:', e);
                  } finally {
                    setIsTogglingFlag(false);
                  }
                }}
                disabled={isTogglingFlag}
                className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isModFlagged
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                } disabled:opacity-50`}
              >
                {isTogglingFlag ? (
                  <span className="inline-block h-3 w-3 border-2 border-current border-r-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                {isModFlagged ? t('removeNsfwFlag') : t('flagNsfwAdmin')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('reportModalTitle')}</h3>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reason')}</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Spam">{t('reasons.spam')}</option>
                  <option value="Scam">{t('reasons.scam')}</option>
                  <option value="Illegal">{t('reasons.illegal')}</option>
                  <option value="Offensive">{t('reasons.offensive')}</option>
                  <option value="Other">{t('reasons.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('descriptionOptional')}</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder={t('placeholderDetails')}
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
