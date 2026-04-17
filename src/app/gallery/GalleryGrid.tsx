'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ArtistCard from './ArtistCard';
import type { SellerWithListings } from '@/components/marketplace/StoreCard';

const FILTERS = [
  { id: 'all', label: 'All Artists' },
  { id: 'commissions', label: 'Illustration' },
  { id: 'graphic_design', label: 'Graphic Design' },
  { id: '3d_animation', label: '3D & Animation' },
  { id: 'web_design', label: 'Web & UI' },
  { id: 'other_digital', label: 'Other Digital' },
];

interface GalleryGridProps {
  sellers: SellerWithListings[];
}

export default function GalleryGrid({ sellers }: GalleryGridProps) {
  const [activeFilter, setActiveFilter] = useState('all');

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
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          No artists found for this category yet.
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
  return (
    <Link
      href="/create-listing"
      className="flex flex-col items-center justify-center h-full min-h-[320px] bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl border-2 border-dashed border-rose-200 hover:border-rose-400 hover:shadow-lg transition-all duration-300 group p-8 text-center"
    >
      <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-rose-200 transition-colors">
        <Plus size={24} className="text-rose-600" />
      </div>
      <h3 className="font-bold text-rose-900 mb-2">Open for Commissions?</h3>
      <p className="text-sm text-rose-700 max-w-xs">
        List your commission types on Open Market and get discovered by the Bluesky community.
      </p>
    </Link>
  );
}
