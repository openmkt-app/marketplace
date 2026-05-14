'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import ArtistCard from './ArtistCard';
import type { SellerWithListings } from '@/components/marketplace/StoreCard';

const FILTERS = [
  { id: 'all', key: 'all' as const },
  { id: 'commissions', key: 'illustration' as const },
  { id: 'graphic_design', key: 'graphicDesign' as const },
  { id: '3d_animation', key: 'threeDAnimation' as const },
  { id: 'web_design', key: 'webDesign' as const },
  { id: 'other_digital', key: 'otherDigital' as const },
];

interface GalleryGridProps {
  sellers: SellerWithListings[];
}

export default function GalleryGrid({ sellers }: GalleryGridProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const t = useTranslations('gallery');

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sellers;
    const term = activeFilter.replace(/_/g, ' ');
    return sellers.filter(s =>
      s.listings?.some(l =>
        l.category === 'digital_arts' &&
        l.metadata?.subcategory?.toLowerCase().includes(term)
      )
    );
  }, [sellers, activeFilter]);

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === f.id
                  ? 'bg-rose-900 text-white shadow-lg'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:bg-rose-50'
              }`}
            >
              {t(`filters.${f.key}`)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {t('noFiltered')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
          {filtered.map(seller => (
            <ArtistCard key={seller.did} seller={seller} />
          ))}
          {activeFilter === 'all' && <GalleryCTACard />}
        </div>
      )}
    </div>
  );
}

function GalleryCTACard() {
  const t = useTranslations('gallery');
  return (
    <Link
      href="/create-listing"
      className="flex flex-col items-center justify-center h-full min-h-[320px] bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl border-2 border-dashed border-rose-200 hover:border-rose-400 hover:shadow-lg transition-all duration-300 group p-8 text-center"
    >
      <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-rose-200 transition-colors">
        <Plus size={24} className="text-rose-600" />
      </div>
      <h3 className="font-bold text-rose-900 mb-2">{t('ctaCardTitle')}</h3>
      <p className="text-sm text-rose-700 max-w-xs">
        {t('ctaCardBody')}
      </p>
    </Link>
  );
}
