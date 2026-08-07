'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import ListingCard from '@/components/marketplace/ListingCard';
import GalleryListingTile from '@/components/marketplace/GalleryListingTile';
import { ExternalLink, Calendar, Globe, MapPin, Palette, Settings } from 'lucide-react';
import type { SellerProfile, StoreListing } from '@/lib/server/fetch-store';
import { linkifyText } from '@/lib/linkify';
import { isOnlineStore } from '@/lib/location-utils';
import { isArtistStore } from '@/lib/artist-store-utils';
import { getStoreName } from '@/lib/seller-display';
import ShopDetails from '@/components/marketplace/ShopDetails';
import type { Shop } from '@/lib/commerce/types';
import { useAuth } from '@/contexts/AuthContext';
import { filterForViewer } from '@/lib/viewer-visibility';

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
  /** Null means the server could not fetch them, not that there are none. */
  initialListings: StoreListing[] | null;
  initialListingsCount: number;
  /** The seller's shop record, read on the server. Null when they have none. */
  shop: Shop | null;
};

export default function StorePageClient({
  handle: encodedHandle,
  initialProfile,
  initialListings,
  initialListingsCount,
  shop,
}: Props) {
  const t = useTranslations('store');
  const locale = useLocale();
  const handle = decodeURIComponent(encodedHandle);

  const [profile, setProfile] = useState<SellerProfile | null>(initialProfile);
  const [allListings, setAllListings] = useState<SellerListing[]>((initialListings ?? []) as SellerListing[]);
  // The server renders the store outright. Only a server-side failure leaves
  // anything to load, and that path is handled by the fallback effect below.
  const [loading, setLoading] = useState(initialListings === null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'store' | 'local'>('store');
  const [flaggedUris, setFlaggedUris] = useState<Set<string>>(new Set());
  const auth = useAuth();
  const isOwnStore = !!auth.user?.did && auth.user.did === profile?.did;
  const [hiddenUris, setHiddenUris] = useState<Set<string>>(new Set());

  // "Hide from friends" — resolved here rather than on the server, which has no
  // viewer to check the follow graph against. Everything downstream reads the
  // filtered `listings`, so the counts, the artist-store check and the
  // online/local split all agree with what is actually on screen.
  useEffect(() => {
    let cancelled = false;
    const flagged = allListings.filter(l => l.hideFromFriends);
    if (flagged.length === 0 || !auth.user?.did) {
      setHiddenUris(prev => (prev.size === 0 ? prev : new Set()));
      return;
    }
    filterForViewer(allListings, auth.user.did, auth.user.handle).then(visible => {
      if (cancelled) return;
      const shown = new Set(visible.map(l => l.uri));
      setHiddenUris(new Set(allListings.filter(l => !shown.has(l.uri)).map(l => l.uri)));
    });
    return () => { cancelled = true; };
  }, [allListings, auth.user?.did, auth.user?.handle]);

  const listings = useMemo(
    () => (hiddenUris.size === 0 ? allListings : allListings.filter(l => !hiddenUris.has(l.uri))),
    [allListings, hiddenUris],
  );

  // Fetch moderation flagged URIs
  useEffect(() => {
    fetch('/api/admin/moderate/flagged')
      .then(res => res.json())
      .then(data => { if (data.uris) setFlaggedUris(new Set(data.uris)); })
      .catch(() => {});
  }, []);

  // Fallback for a server-side failure only.
  //
  // The store is rendered on the server, so this normally never runs. When it
  // does, it reads the seller's PDS directly the way this page always used to.
  // The AT Protocol SDK it needs is imported dynamically: a static import put
  // 109 KB in front of every store page to cover a case that should not happen.
  useEffect(() => {
    if (initialListings !== null) return;

    let cancelled = false;

    async function fetchStoreData() {
      try {
        setLoading(true);
        setError(null);

        const [{ BskyAgent }, { READ_COLLECTIONS }, { normalizeListings }, { toLegacyListing }] =
          await Promise.all([
            import('@atproto/api'),
            import('@/lib/commerce/collections'),
            import('@/lib/commerce/hydrate'),
            import('@/lib/commerce/legacy'),
          ]);

        const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });

        const profileResult = await agent.getProfile({ actor: handle });
        if (!profileResult.success) throw new Error(t('fetchProfileError'));

        const profileData = profileResult.data;
        if (cancelled) return;

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

        let pdsEndpoint = 'https://bsky.social';
        try {
          const didDoc = await fetch(`https://plc.directory/${profileData.did}`).then(r => r.json());
          const pdsService = didDoc.service?.find(
            (s: { id: string; type: string; serviceEndpoint: string }) =>
              s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
          );
          if (pdsService?.serviceEndpoint) pdsEndpoint = pdsService.serviceEndpoint;
        } catch (e) {
          console.warn('Could not resolve PDS, using default:', e);
        }

        const pdsAgent = new BskyAgent({ service: pdsEndpoint });

        // A seller's listings are split across both collections until every old
        // record has been edited, which may never happen.
        const listingsResults = await Promise.all(
          READ_COLLECTIONS.map((collection) =>
            pdsAgent.api.com.atproto.repo
              .listRecords({ repo: profileData.did, collection, limit: 50 })
              .catch(() => null)
          )
        );
        if (cancelled) return;

        const rawRecords = listingsResults.flatMap((result) =>
          result?.success ? result.data.records : []
        );

        if (rawRecords.length > 0) {
          const processedListings = normalizeListings(
            rawRecords.map((record) => ({
              record: record.value as Record<string, any>,
              uri: record.uri,
              cid: record.cid,
              authorDid: profileData.did,
            }))
          ).map((listing) => ({
            ...(toLegacyListing(listing) as any),
            uri: listing.uri,
            cid: listing.cid,
            authorDid: profileData.did,
            authorHandle: profileData.handle,
            authorDisplayName: profileData.displayName,
            authorAvatarCid: profileData.avatar ? extractAvatarCid(profileData.avatar) : undefined,
            formattedImages: listing.formattedImages,
          }));

          processedListings.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setAllListings(processedListings);
        } else {
          setAllListings([]);
        }
      } catch (err) {
        console.error('Failed to fetch store data:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : t('loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStoreData();
    return () => { cancelled = true; };
  }, [handle, t, initialListings]);

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
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('notFoundTitle')}</h1>
          <p className="text-gray-500 mb-6">
            {error || t('notFoundBody', { handle })}
          </p>
          <Link
            href="/browse"
            className="inline-flex items-center px-6 py-3 bg-primary-color text-white rounded-xl font-medium hover:bg-primary-light transition-colors"
          >
            {t('browseMarketplace')}
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
              alt={t('bannerAlt', { name: profile.displayName || profile.handle })}
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
                  {getStoreName(shop, profile)}
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
                  <p className="text-sm text-gray-500">{t('listingsCount')}</p>
                </div>
                {profile.followersCount !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{profile.followersCount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{t('followersCount')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bio — the shop's own description wins over the Bluesky one when
                set, since the seller wrote it specifically for this page. */}
            {(shop?.description || profile.description) && (
              <div className="mt-4 max-w-2xl">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {linkifyText(shop?.description || profile.description || '')}
                </p>
              </div>
            )}

            {/* Owner-only: the shop form is otherwise unreachable, since the
                store page is the only place a seller looks at their own shop. */}
            {isOwnStore && (
              <div className="mt-3">
                <Link
                  href="/my-store/settings"
                  className="inline-flex items-center gap-1.5 px-3 py-1 border border-neutral-light rounded-full text-xs font-medium text-text-secondary hover:bg-neutral-light/50"
                >
                  <Settings size={12} />
                  {t('editShop')}
                </Link>
              </div>
            )}

            {/* Commission Artist badge */}
            {isArtistStore(listings) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 text-xs font-semibold rounded-full">
                  <Palette size={12} />
                  {t('commissionArtist')}
                </span>
                <Link href="/gallery" className="text-xs text-rose-600 hover:underline">
                  {t('viewInGallery')}
                </Link>
              </div>
            )}

            {/* Stats (Mobile) and Meta Info */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {/* Mobile stats */}
              <div className="flex sm:hidden items-center gap-4">
                <span><strong className="text-gray-900">{listings.length}</strong> {t('listingsCount').toLowerCase()}</span>
                {profile.followersCount !== undefined && (
                  <span><strong className="text-gray-900">{profile.followersCount.toLocaleString()}</strong> {t('followersCount').toLowerCase()}</span>
                )}
              </div>

              {/* Join date */}
              {profile.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{t('joinedDate', { date: formatJoinDate(profile.createdAt) })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shop details: policies, handling time, where they ship. */}
      {shop && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <ShopDetails shop={shop} />
        </div>
      )}

      {/* Listings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(() => {
          // Separate listings by type
          const onlineListings = listings.filter(l => isOnlineStore(l.location));
          const localListings = listings.filter(l => !isOnlineStore(l.location));
          const hasBothTypes = onlineListings.length > 0 && localListings.length > 0;

          // Determine which listings to show
          const displayListings = hasBothTypes
            ? (activeTab === 'store' ? onlineListings : localListings)
            : listings;

          const galleryMode = isArtistStore(displayListings);

          return (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {galleryMode
                    ? t('commissionTypesCount', { count: listings.length })
                    : listings.length > 0 ? t('itemsForSaleCount', { count: listings.length }) : t('itemsForSale')}
                </h2>
              </div>

              {/* Store/Local Tabs - only show if seller has both types */}
              {hasBothTypes && (
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setActiveTab('store')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'store'
                        ? 'bg-slate-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Globe size={14} />
                    {t('storeTab', { count: onlineListings.length })}
                  </button>
                  <button
                    onClick={() => setActiveTab('local')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'local'
                        ? 'bg-slate-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <MapPin size={14} />
                    {t('localTab', { count: localListings.length })}
                  </button>
                </div>
              )}

              {displayListings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <div className="mx-auto h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{t('noListingsTitle')}</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {t('noListingsBody')}
                  </p>
                </div>
              ) : galleryMode ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                  {displayListings.map((listing, index) => (
                    <GalleryListingTile key={listing.uri} listing={listing} flaggedUris={flaggedUris} priority={index < 4} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayListings.map((listing, index) => (
                    <ListingCard key={listing.uri} listing={listing} flaggedUris={flaggedUris} priority={index < 4} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
