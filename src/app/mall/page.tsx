import type { Metadata } from 'next';
import Link from 'next/link';
import { BskyAgent } from '@atproto/api';
import { Store } from 'lucide-react';
import { isSellerExcluded } from '@/lib/excluded-sellers';
import { MARKETPLACE_COLLECTION } from '@/lib/constants';
import { generateImageUrls } from '@/lib/image-utils';
import MallGrid from '@/components/marketplace/MallGrid';
import type { SellerWithListings } from '@/components/marketplace/StoreCard';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { isSellerCachedEmpty, markSellerEmpty, invalidateSeller } from '@/lib/mall-cache';

export const revalidate = 60; // revalidate at most once per minute

export const metadata: Metadata = {
  title: 'The Mall | Open Market',
  description: 'Browse online storefronts on Open Market. Discover verified sellers linking to Etsy, Amazon, Shopify and more.',
  alternates: {
    canonical: 'https://openmkt.app/mall',
  },
  openGraph: {
    title: 'The Mall | Open Market',
    description: 'Browse online storefronts on Open Market. Discover verified sellers linking to Etsy, Amazon, Shopify and more.',
    type: 'website',
    url: 'https://openmkt.app/mall',
    siteName: 'Open Market',
    images: [{
      url: '/images/mall-og.png',
      width: 1200,
      height: 630,
      alt: 'The Open Mall Preview'
    }]
  },
};

// Helper to check if a listing is an online store listing
function isOnlineStoreListing(listing: MarketplaceListing): boolean {
  return listing.location?.isOnlineStore === true;
}

async function getVerifiedSellers(): Promise<SellerWithListings[]> {
  try {
    const botHandle = process.env.BOT_HANDLE || 'openmkt.app';
    const botPassword = process.env.BOT_APP_PASSWORD;

    if (!botPassword) {
      console.warn('BOT_APP_PASSWORD not set, cannot fetch verified sellers');
      return [];
    }

    const agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({
      identifier: botHandle,
      password: botPassword,
    });

    // Fetch who the bot is following (verified sellers)
    const response = await agent.getFollows({
      actor: agent.session?.did || botHandle,
      limit: 100,
    });

    // Filter excluded sellers up front
    const followProfiles = response.data.follows.filter(
      p => !isSellerExcluded(p.handle)
    );

    // Batch-fetch full profiles (ProfileViewDetailed) to get banner + followersCount
    // getProfiles accepts up to 25 actors per call
    const fullProfileMap = new Map<string, { banner?: string; followersCount?: number }>();
    const chunkSize = 25;
    for (let i = 0; i < followProfiles.length; i += chunkSize) {
      const chunk = followProfiles.slice(i, i + chunkSize).map(p => p.did);
      try {
        const res = await agent.getProfiles({ actors: chunk });
        for (const p of res.data.profiles) {
          fullProfileMap.set(p.did, { banner: p.banner, followersCount: p.followersCount });
        }
      } catch {
        // Non-fatal — banner just won't show for this chunk
      }
    }

    // Fetch all sellers in parallel, skipping those known to have no online store listings
    const sellerResults = await Promise.allSettled(
      followProfiles.map(async (followProfile) => {
        // Skip sellers recently confirmed to have no online store listings
        if (isSellerCachedEmpty(followProfile.did)) {
          return null;
        }

        // Use the follow profile data directly (already has displayName, avatar, description)
        // and fetch PDS+listings
        const fullProfile = followProfile;
        const detailedProfile = fullProfileMap.get(followProfile.did);
        const listings = await (async (): Promise<MarketplaceListing[]> => {
            try {
              let pdsEndpoint = 'https://bsky.social';
              try {
                const didDoc = await fetch(`https://plc.directory/${followProfile.did}`).then(r => r.json());
                const pdsService = didDoc.service?.find(
                  (s: { id: string; type: string; serviceEndpoint: string }) =>
                    s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
                );
                if (pdsService?.serviceEndpoint) {
                  pdsEndpoint = pdsService.serviceEndpoint;
                }
              } catch {
                // Use default
              }

              const pdsAgent = new BskyAgent({ service: pdsEndpoint });
              const listingsResult = await pdsAgent.api.com.atproto.repo.listRecords({
                repo: followProfile.did,
                collection: MARKETPLACE_COLLECTION,
                limit: 50,
                reverse: true,
              });

              if (!listingsResult.success) return [];

              return listingsResult.data.records.map(record => {
                const listing = record.value as MarketplaceListing;
                const formattedImages = generateImageUrls(followProfile.did, listing.images);
                const { images, ...sanitizedListing } = listing;
                return {
                  ...sanitizedListing,
                  uri: record.uri,
                  cid: record.cid,
                  sellerDid: followProfile.did,
                  formattedImages
                };
              });
            } catch (e) {
              console.warn(`Could not fetch listings for ${followProfile.handle}:`, e);
              return [];
            }
          })();

        const onlineStoreListings = listings.filter(isOnlineStoreListing);
        if (onlineStoreListings.length === 0) {
          markSellerEmpty(followProfile.did);
          return null;
        }

        // Seller has products — remove from empty cache in case they were previously empty
        invalidateSeller(followProfile.did);

        return {
          did: followProfile.did,
          handle: followProfile.handle,
          displayName: fullProfile.displayName,
          description: fullProfile.description,
          avatar: fullProfile.avatar,
          banner: detailedProfile?.banner,
          followersCount: detailedProfile?.followersCount,
          listingsCount: onlineStoreListings.length,
          listings: onlineStoreListings,
        } as SellerWithListings;
      })
    );

    const sellers: SellerWithListings[] = sellerResults
      .filter((r): r is PromiseFulfilledResult<SellerWithListings | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((s): s is SellerWithListings => s !== null);

    // Sort Demo stores last, then by newest listings first
    sellers.sort((a, b) => {
      // 1. Demo stores go last
      const aIsDemo = a.displayName?.includes('(Demo Store)') || a.handle.includes('demo');
      const bIsDemo = b.displayName?.includes('(Demo Store)') || b.handle.includes('demo');

      if (aIsDemo && !bIsDemo) return 1;
      if (!aIsDemo && bIsDemo) return -1;

      // 2. Newest stores/listings first (based on most recent listing)
      const aLatest = a.listings?.[0]?.createdAt || '';
      const bLatest = b.listings?.[0]?.createdAt || '';

      if (aLatest !== bLatest) {
        return bLatest.localeCompare(aLatest); // Descending order (newest first)
      }

      // 3. Fallback to listing count and followers
      if (b.listingsCount !== a.listingsCount) {
        return b.listingsCount - a.listingsCount;
      }
      return (b.followersCount || 0) - (a.followersCount || 0);
    });

    return sellers;
  } catch (error) {
    console.error('Failed to fetch verified sellers:', error);
    return [];
  }
}

export default async function MallPage() {
  const sellers = await getVerifiedSellers();
  const sellersCount = sellers.length;
  const listingsCount = sellers.reduce((acc, s) => acc + s.listingsCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      {/* Hero Section */}
      <div className="relative bg-slate-900 border-b border-white/10 overflow-hidden">
        {/* Abstract background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/40 via-slate-900 to-slate-900 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left Col: Text */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <Store size={20} className="text-blue-400" />
                <span className="text-blue-400 font-medium tracking-wider text-sm uppercase">The Open Mall</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Discover <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-200">
                  Online Storefronts
                </span>
              </h1>

              <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
                Browse verified sellers linking to Etsy, Amazon, Shopify and more. Shop from trusted storefronts with real identities on Bluesky.
              </p>
            </div>

            {/* Right Col: Stats */}
            <div className="flex flex-wrap lg:justify-end gap-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[160px] flex flex-col items-center justify-center text-center shadow-2xl shadow-blue-900/20">
                <span className="text-3xl font-bold text-white mb-1">{sellersCount}</span>
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Active Stores</span>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[160px] flex flex-col items-center justify-center text-center shadow-2xl shadow-blue-900/20">
                {/* Mocked Sales Count for Design Parity - In real app, this would be aggregated */}
                <span className="text-3xl font-bold text-amber-200 mb-1">{listingsCount}</span>
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Items Listed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sellers.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Store size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No online stores yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Be the first to open an online storefront! Create a listing and check &quot;Online / Store Listing&quot; to appear here.
            </p>
            <Link
              href="/create-listing"
              className="mt-6 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <MallGrid sellers={sellers} />
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Want to open your own store?</h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              It&apos;s free and easy! Just log in with your Bluesky account and create your first listing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/create-listing"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Create a Listing
              </Link>
              <Link
                href="/mall/import"
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                Import from Etsy
              </Link>
              <Link
                href="/community/seller-guide"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Read the Seller Guide
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
