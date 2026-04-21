import type { Metadata } from 'next';
import Link from 'next/link';
import { Store, Palette } from 'lucide-react';
import MallGrid from '@/components/marketplace/MallGrid';
import { getVerifiedSellers } from '@/lib/server/fetch-mall-sellers';
import { isArtistStore } from '@/lib/artist-store-utils';

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

export default async function MallPage() {
  const sellers = (await getVerifiedSellers()).filter(s => !isArtistStore(s.listings ?? []));
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
                Browse verified sellers linking to Etsy, Amazon, Shopify and more. Shop from trusted storefronts with real identities on the Atmosphere.
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

      {/* Gallery Cross-Promo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Palette size={20} className="text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-rose-900">Looking for commission art?</p>
              <p className="text-sm text-rose-700">The Gallery features Atmosphere artists open for commissions — illustrations, graphic design, and more.</p>
            </div>
          </div>
          <Link
            href="/gallery"
            className="shrink-0 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors"
          >
            Visit The Gallery
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Want to open your own store?</h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              It&apos;s free and easy! Just log in with your Atmosphere account and create your first listing.
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
