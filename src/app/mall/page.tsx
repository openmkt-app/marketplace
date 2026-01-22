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

export const dynamic = 'force-dynamic';

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

    const sellers: SellerWithListings[] = [];

    // Fetch profile and listing count for each seller
    for (const followProfile of response.data.follows) {
      // Skip excluded sellers
      if (isSellerExcluded(followProfile.handle)) {
        continue;
      }

      // Fetch full profile to get follower count
      let fullProfile;
      try {
        const profileResult = await agent.getProfile({ actor: followProfile.did });
        fullProfile = profileResult.data;
      } catch {
        // Use basic profile from follows if full profile fetch fails
        fullProfile = followProfile;
      }

      // Fetch listing count for this seller
      let listings: MarketplaceListing[] = [];
      let listingsCount = 0;

      try {
        // Resolve PDS for the seller
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
          limit: 50, // Get more items for accurate count (up to 50)
          reverse: true, // get latest first
        });

        if (listingsResult.success) {
          console.log(`[Debug] Fetched ${listingsResult.data.records.length} records for ${followProfile.handle}`);
          listingsResult.data.records.forEach((r, i) => {
            console.log(`[Debug] Record ${i}:`, JSON.stringify(r.value));
          });

          listingsCount = listingsResult.data.records.length; // This is just the page count, but good enough as a proxy if < 100
          // If we want total count we might need to count all, but for perf we'll just check if > 0
          // Actually, if we want accurate count we might need another strategy or just accept the count of current page if small

          // Re-map records to listings
          listings = listingsResult.data.records.map(record => {
            const listing = record.value as MarketplaceListing;
            const formattedImages = generateImageUrls(followProfile.did, listing.images);

            // Create a sanitized listing object without the raw images array
            // The raw images array contains CIDs which cause serialization errors in Client Components
            const { images, ...sanitizedListing } = listing;

            return {
              ...sanitizedListing,
              uri: record.uri,
              cid: record.cid,
              sellerDid: followProfile.did,
              formattedImages
            };
          });

          // To get accurate total counts we'd need to paginate, but let's just stick to what we have or existing logic 
          // The previous logic fetched limit 100 and counted them. 
          // Let's do a quick separate fetch for count using the 100 limit if we really need accurate counts,
          // OR we can just carry over the listing logic

          // Simplify: Just use the count from the main fetch (up to 50)
          // Ideally we would use a lightweight HEAD request or separate counter if we expected > 50 items
          // But for now, 50 is plenty for a "Mall" view context.
          listingsCount = listingsResult.data.records.length;
        }
      } catch (e) {
        console.warn(`Could not fetch listings for ${followProfile.handle}:`, e);
      }

      // Filter to only include online store listings
      const onlineStoreListings = listings.filter(isOnlineStoreListing);
      const onlineListingsCount = onlineStoreListings.length;

      // Only include sellers who have at least one ONLINE STORE listing
      if (onlineListingsCount > 0) {
        sellers.push({
          did: followProfile.did,
          handle: followProfile.handle,
          displayName: fullProfile.displayName,
          description: fullProfile.description,
          avatar: fullProfile.avatar,
          banner: (fullProfile as { banner?: string }).banner,
          followersCount: (fullProfile as { followersCount?: number }).followersCount,
          listingsCount: onlineListingsCount,
          listings: onlineStoreListings,
        });
      }
    }

    // Sort by listings count (most listings first), then by followers
    sellers.sort((a, b) => {
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
