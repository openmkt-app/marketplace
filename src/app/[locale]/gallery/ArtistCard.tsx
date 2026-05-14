'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Palette, ArrowRight } from 'lucide-react';
import type { SellerWithListings } from '@/components/marketplace/StoreCard';
import { COMMISSION_CATEGORY_ID } from '@/lib/artist-store-utils';

interface ArtistCardProps {
  seller: SellerWithListings;
}

export default function ArtistCard({ seller }: ArtistCardProps) {
  const t = useTranslations('gallery');
  const commissionListings = seller.listings?.filter(l => l.category === COMMISSION_CATEGORY_ID) ?? [];
  const openCount = commissionListings.filter(l =>
    l.metadata?.slotsAvailable === undefined || l.metadata.slotsAvailable > 0
  ).length;

  const displayName = seller.displayName || seller.handle;
  const storeUrl = `/store/${seller.handle}`;
  const shortHandle = seller.handle.replace('.bsky.social', '');

  return (
    <Link
      href={storeUrl}
      className="group flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Banner */}
      <div className="relative h-32 w-full shrink-0 bg-gradient-to-br from-rose-100 to-pink-100 overflow-hidden">
        {seller.banner && (
          <Image
            src={seller.banner}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}
      </div>

      <div className="flex flex-col flex-grow relative px-5">
        {/* Round avatar */}
        <div className="absolute -top-10 left-5">
          <div className="w-20 h-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden relative z-10">
            {seller.avatar ? (
              <Image
                src={seller.avatar}
                alt={displayName}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-rose-100 flex items-center justify-center">
                <Palette size={28} className="text-rose-400" />
              </div>
            )}
          </div>
        </div>

        {/* Name + handle */}
        <div className="mt-12 mb-2">
          <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-rose-600 transition-colors line-clamp-1">
            {displayName}
          </h3>
          <p className="text-sm text-slate-400 truncate">@{shortHandle}</p>
        </div>

        {/* Bio */}
        {seller.description && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-3">{seller.description}</p>
        )}

        {/* Open status */}
        <div className="mb-3">
          {openCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {t('commissionsOpen', { count: openCount })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              {t('waitlist')}
            </span>
          )}
        </div>

        {/* 2x2 Portfolio preview */}
        <div className="border-t border-gray-50 pt-3 pb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('portfolio')}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {commissionListings.slice(0, 4).map((listing, idx) => {
              const thumb = listing.formattedImages?.[0]?.thumbnail;
              return (
                <div
                  key={`${listing.uri ?? listing.title}-${idx}`}
                  className="aspect-square rounded-lg bg-gray-100 overflow-hidden relative"
                >
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={listing.title}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-rose-50">
                      <Palette size={14} className="text-rose-200" />
                    </div>
                  )}
                </div>
              );
            })}
            {commissionListings.length < 4 &&
              Array.from({ length: 4 - Math.min(commissionListings.length, 4) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-lg bg-gray-50" />
              ))}
          </div>
        </div>
      </div>

      {/* CTA footer */}
      <div className="bg-gray-50 p-3 border-t border-gray-100 group-hover:bg-rose-50/50 transition-colors mt-auto">
        <span className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-700 group-hover:text-rose-700 transition-colors">
          {t('viewPortfolio')}
          <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
