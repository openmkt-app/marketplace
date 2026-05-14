import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { getCategoryName } from '@/lib/category-utils';
import { formatPrice } from '@/lib/price-utils';
import { COMMISSION_CATEGORY_ID } from '@/lib/artist-store-utils';

interface LiveListingPreviewProps {
    title: string;
    price: string;
    currency?: string;
    description: string;
    category: string;
    condition: string;
    slotsAvailable?: string;
    turnaroundTime?: string;
    location: {
        locality: string;
        state: string;
    };
    imageUrls: string[];
    isNsfw?: boolean;
}

const LiveListingPreview = ({
    title,
    price,
    description,
    category,
    condition,
    slotsAvailable,
    turnaroundTime,
    location,
    imageUrls,
    currency,
    isNsfw
}: LiveListingPreviewProps) => {
    const t = useTranslations('livePreview');
    const tCats = useTranslations('categories');
    const tConds = useTranslations('conditions');
    const tCommon = useTranslations('common');
    const locale = useLocale();

    const isCommission = category === COMMISSION_CATEGORY_ID;

    const displayPrice = formatPrice(price, currency, locale, tCommon('free'));

    // Format date (always today for preview)
    const today = new Date().toLocaleDateString(locale);

    return (
        <div className="sticky top-24">
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t('livePreview')}
                </div>

                {/* Card Mockup */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg text-slate-900">
                    <div className="flex flex-col">
                        {/* Image Area */}
                        <div className="relative aspect-video bg-gray-100 overflow-hidden w-full">
                            {imageUrls.length > 0 ? (
                                <Image
                                    src={imageUrls[0]}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                    <span className="text-4xl mb-2 font-light">{t('noImage')}</span>
                                </div>
                            )}

                            {/* Condition / Slots Badge */}
                            <div className="absolute top-3 left-3">
                                {isCommission ? (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                                        slotsAvailable === '0'
                                            ? 'bg-amber-100 text-amber-800'
                                            : slotsAvailable
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {slotsAvailable === '' || slotsAvailable === undefined
                                            ? t('open')
                                            : slotsAvailable === '0'
                                                ? t('waitlist')
                                                : t('slotsOpen', { count: parseInt(slotsAvailable) })}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-sm text-slate-800 shadow-sm">
                                        {condition ? tConds(condition) : t('condition')}
                                    </span>
                                )}
                            </div>

                            {/* NSFW Preview Overlay */}
                            {isNsfw && (
                              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/10 backdrop-blur-xl">
                                <span className="text-white text-xs font-bold bg-red-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                                  {t('nsfwContent')}
                                </span>
                              </div>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-1 block">
                                        {category ? tCats(category) : t('category')}
                                    </span>
                                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1 mb-1">
                                        {title || t('itemTitle')}
                                    </h3>
                                </div>
                                <div className="text-right ml-4">
                                    {isCommission && (
                                        <span className="text-[10px] text-gray-400 block">{t('startingAt')}</span>
                                    )}
                                    <span className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                                        {displayPrice}
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed h-10">
                                {description || t('noDescription')}
                            </p>

                            {/* Footer Meta */}
                            <div className="flex items-center gap-4 pt-4 border-t border-gray-50 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {isCommission && turnaroundTime ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            <span className="truncate">{turnaroundTime}</span>
                                        </>
                                    ) : (
                                        <>
                                            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="truncate">
                                                {location.locality && location.state
                                                    ? `${location.locality}, ${location.state}`
                                                    : t('location')}
                                            </span>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                        <path d="M8 2v4"></path>
                                        <path d="M16 2v4"></path>
                                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                                        <path d="M3 10h18"></path>
                                    </svg>
                                    <span>{today}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 text-center">
                    {t('appearanceHint')}
                </p>
            </div>
        </div>
    );
};

export default LiveListingPreview;
