import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Store, Palette } from 'lucide-react';
import MallGrid from '@/components/marketplace/MallGrid';
import { getVerifiedSellers } from '@/lib/server/fetch-mall-sellers';
import { isArtistStore } from '@/lib/artist-store-utils';

export const revalidate = 60; // revalidate at most once per minute

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mall.metadata' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: 'https://openmkt.app/mall' },
    openGraph: {
      title: t('title'),
      description: t('description'),
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
}

export default async function MallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mall' });
  const sellers = (await getVerifiedSellers()).filter(s => !isArtistStore(s.listings ?? []));
  const sellersCount = sellers.length;
  const listingsCount = sellers.reduce((acc, s) => acc + s.listingsCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
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
                <span className="text-blue-400 font-medium tracking-wider text-sm uppercase">{t('heroLabel')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                {t('heroTitleLine1')} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-200">
                  {t('heroTitleLine2')}
                </span>
              </h1>

              <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
                {t('heroSubtitle')}
              </p>
            </div>

            {/* Right Col: Stats */}
            <div className="flex flex-wrap lg:justify-end gap-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[160px] flex flex-col items-center justify-center text-center shadow-2xl shadow-blue-900/20">
                <span className="text-3xl font-bold text-white mb-1">{sellersCount}</span>
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">{t('activeStores')}</span>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[160px] flex flex-col items-center justify-center text-center shadow-2xl shadow-blue-900/20">
                <span className="text-3xl font-bold text-amber-200 mb-1">{listingsCount}</span>
                <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">{t('itemsListed')}</span>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noStoresTitle')}</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {t('noStoresBody')}
            </p>
            <Link
              href="/create-listing"
              className="mt-6 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {t('createFirst')}
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
              <p className="font-bold text-rose-900">{t('commissionPromoTitle')}</p>
              <p className="text-sm text-rose-700">{t('commissionPromoBody')}</p>
            </div>
          </div>
          <Link
            href="/gallery"
            className="shrink-0 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors"
          >
            {t('visitGallery')}
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('ctaTitle')}</h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              {t('ctaBody')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/create-listing"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                {t('createListing')}
              </Link>
              <Link
                href="/mall/import"
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                {t('importEtsy')}
              </Link>
              <Link
                href="/community/seller-guide"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                {t('readSellerGuide')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
