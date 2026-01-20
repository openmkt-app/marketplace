import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BskyAgent } from '@atproto/api';
import { Store, Users, ShoppingBag } from 'lucide-react';
import { isSellerExcluded } from '@/lib/excluded-sellers';
import { MARKETPLACE_COLLECTION } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'The Mall | Open Market',
  description: 'Browse all stores on Open Market. Discover verified sellers and their unique offerings on the decentralized marketplace.',
  openGraph: {
    title: 'The Mall | Open Market',
    description: 'Browse all stores on Open Market. Discover verified sellers and their unique offerings.',
    type: 'website',
    url: 'https://openmkt.app/mall',
    siteName: 'Open Market',
  },
};

type SellerWithListings = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  listingsCount: number;
};

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
          limit: 100,
        });

        if (listingsResult.success) {
          listingsCount = listingsResult.data.records.length;
        }
      } catch (e) {
        console.warn(`Could not fetch listings for ${followProfile.handle}:`, e);
      }

      // Only include sellers who have at least one listing
      if (listingsCount > 0) {
        sellers.push({
          did: followProfile.did,
          handle: followProfile.handle,
          displayName: fullProfile.displayName,
          description: fullProfile.description,
          avatar: fullProfile.avatar,
          banner: (fullProfile as { banner?: string }).banner,
          followersCount: (fullProfile as { followersCount?: number }).followersCount,
          listingsCount,
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

function StoreCard({ seller }: { seller: SellerWithListings }) {
  const displayName = seller.displayName || seller.handle;
  const shortHandle = seller.handle.replace('.bsky.social', '');

  return (
    <Link
      href={`/store/${seller.handle}`}
      className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 hover:border-blue-200"
    >
      {/* Header with banner or gradient background */}
      <div className="h-20 relative">
        <div className="absolute inset-0 overflow-hidden rounded-t-xl">
          {seller.banner ? (
            <Image
              src={seller.banner}
              alt={`${displayName}'s banner`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500" />
          )}
          {/* Subtle overlay for better avatar visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </div>

      {/* Avatar positioned to overlap header and content */}
      <div className="relative px-4">
        <div className="absolute -top-8 left-4">
          <div className="w-16 h-16 rounded-full border-4 border-white bg-white shadow-sm overflow-hidden">
            {seller.avatar ? (
              <Image
                src={seller.avatar}
                alt={displayName}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-10 pb-4 px-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
          {displayName}
        </h3>
        <p className="text-sm text-gray-500 truncate">@{shortHandle}</p>

        {seller.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {seller.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <ShoppingBag size={14} className="text-gray-400" />
            <span>{seller.listingsCount} listing{seller.listingsCount !== 1 ? 's' : ''}</span>
          </div>
          {seller.followersCount !== undefined && seller.followersCount > 0 && (
            <div className="flex items-center gap-1">
              <Users size={14} className="text-gray-400" />
              <span>{seller.followersCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function MallPage() {
  const sellers = await getVerifiedSellers();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Store size={32} className="text-white/90" />
            <h1 className="text-3xl sm:text-4xl font-bold">The Mall</h1>
          </div>
          <p className="text-lg text-white/80 max-w-2xl">
            Discover verified sellers on Open Market. Each store is run by a real person
            with a Bluesky account, offering unique items across various categories.
          </p>
          <div className="mt-6 flex items-center gap-4 text-sm">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="font-semibold">{sellers.length}</span> verified stores
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="font-semibold">{sellers.reduce((acc, s) => acc + s.listingsCount, 0)}</span> total listings
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stores yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Be the first to open a store on Open Market! Create a listing to get started.
            </p>
            <Link
              href="/create-listing"
              className="mt-6 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">All Stores</h2>
              <p className="text-gray-500 text-sm mt-1">
                Browse stores by clicking on any card below
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sellers.map((seller) => (
                <StoreCard key={seller.did} seller={seller} />
              ))}
            </div>
          </>
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
