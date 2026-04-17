import type { Metadata } from 'next';
import Link from 'next/link';
import { Palette } from 'lucide-react';
import { getVerifiedSellers } from '@/lib/server/fetch-mall-sellers';
import { filterArtistSellers, COMMISSION_CATEGORY_ID } from '@/lib/artist-store-utils';
import GalleryGrid from './GalleryGrid';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'The Gallery | Open Market',
  description: 'Discover Bluesky commission artists. Browse illustration, graphic design, 3D art, and digital commissions — verified identities on AT Protocol.',
  alternates: {
    canonical: 'https://openmkt.app/gallery',
  },
  openGraph: {
    title: 'The Gallery | Open Market',
    description: 'Discover Bluesky commission artists. Browse illustration, graphic design, 3D art, and digital commissions.',
    type: 'website',
    url: 'https://openmkt.app/gallery',
    siteName: 'Open Market',
  },
};

export default async function GalleryPage() {
  const allSellers = await getVerifiedSellers();
  const artists = filterArtistSellers(allSellers);
  const artistCount = artists.length;
  const commissionCount = artists.reduce(
    (acc, s) => acc + (s.listings?.filter(l => l.category === COMMISSION_CATEGORY_ID).length ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-slate-900 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-700/40 via-slate-900 to-slate-900 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <Palette size={20} className="text-rose-400" />
                <span className="text-rose-400 font-medium tracking-wider text-sm uppercase">The Gallery</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Commission <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-300">
                  Artists on Bluesky
                </span>
              </h1>

              <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
                Browse illustrators, graphic designers, and digital artists open for commissions. Shop with confidence — verified identities on AT Protocol.
              </p>
            </div>

            <div className="flex flex-wrap lg:justify-end gap-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[160px] flex flex-col items-center justify-center text-center shadow-2xl">
                <span className="text-3xl font-bold text-white mb-1">{artistCount}</span>
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Artists</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[160px] flex flex-col items-center justify-center text-center shadow-2xl">
                <span className="text-3xl font-bold text-rose-200 mb-1">{commissionCount}</span>
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Commission Types</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {artists.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Palette size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No commission artists yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Be the first! Create a listing under &quot;Digital Arts &amp; Commissions&quot; to appear in The Gallery.
            </p>
            <Link
              href="/create-listing"
              className="inline-flex items-center px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
            >
              List Your Commissions
            </Link>
          </div>
        ) : (
          <GalleryGrid sellers={artists} />
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Want to showcase your commissions?</h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              It&apos;s free! Log in with your Bluesky account, create a listing under Digital Arts &amp; Commissions, and you&apos;ll automatically appear in The Gallery.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/create-listing"
                className="px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
              >
                List Your Commissions
              </Link>
              <Link
                href="/mall"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Browse The Mall
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
