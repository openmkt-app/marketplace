'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Store, Plus, ShoppingBag } from 'lucide-react';
import StoreCard, { SellerWithListings } from './StoreCard';

interface MallGridProps {
    sellers: SellerWithListings[];
}

const CATEGORIES = [
    { id: 'all', labelKey: 'categories.all' },
    { id: 'digital', labelKey: 'categories.digital' },
    { id: 'handmade', labelKey: 'categories.handmade' },
    { id: 'vintage', labelKey: 'categories.vintage' },
    { id: 'tech', labelKey: 'categories.tech' },
];

export default function MallGrid({ sellers }: MallGridProps) {
    const t = useTranslations('mallGrid');
    const [activeCategory, setActiveCategory] = useState('all');
    const [flaggedUris, setFlaggedUris] = useState<Set<string>>(new Set());

    // Fetch moderation flagged URIs
    useEffect(() => {
        fetch('/api/admin/moderate/flagged')
            .then(res => res.json())
            .then(data => { if (data.uris) setFlaggedUris(new Set(data.uris)); })
            .catch(() => {});
    }, []);

    const filteredSellers = useMemo(() => {
        if (activeCategory === 'all') return sellers;

        const term = activeCategory.toLowerCase();

        return sellers.filter(seller => {
            // Check seller description
            if (seller.description?.toLowerCase().includes(term)) return true;

            // Check listings categories or titles
            if (seller.listings?.some(item =>
                item.category?.toLowerCase().includes(term) ||
                item.title.toLowerCase().includes(term) ||
                item.description.toLowerCase().includes(term)
            )) return true;

            return false;
        });
    }, [sellers, activeCategory]);

    return (
        <div>
            {/* Category Chips - Hidden until we have more stores
            <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-2 min-w-max">
                    {CATEGORIES.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === category.id
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 transform scale-105'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            {t(category.labelKey as any)}
                        </button>
                    ))}
                </div>
            </div>
            */}

            {/* Grid Layout Updated to match request: gap-8, responsive cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {filteredSellers.map((seller) => (
                    <StoreCard key={seller.did} seller={seller} flaggedUris={flaggedUris} />
                ))}

                {/* Call to Action Card - Updated Design */}
                {activeCategory === 'all' && (
                    <div className="group relative rounded-3xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-yellow-400 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 hover:bg-yellow-50/30 min-h-[420px]">
                        <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300 group-hover:text-yellow-500 group-hover:scale-110 transition-all duration-300 mb-6">
                            <Plus size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('ctaTitle')}</h3>
                        <p className="text-slate-500 text-sm max-w-xs mb-8">
                            {t('ctaDescription')}
                        </p>
                        <div className="flex flex-col gap-3 w-full px-8">
                            <Link
                                href="/create-listing"
                                className="bg-slate-900 text-white w-full py-3 rounded-full font-bold text-sm shadow-lg hover:bg-yellow-400 hover:text-slate-900 hover:shadow-yellow-400/30 transition-all transform hover:-translate-y-1 inline-flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('claimSpot')}
                            </Link>
                            {/* Import from Etsy - Hidden until API Key is ready
                            <Link
                                href="/mall/import"
                                className="bg-white text-slate-900 border border-slate-200 w-full py-3 rounded-full font-bold text-sm hover:bg-slate-50 transition-all inline-flex items-center justify-center gap-2"
                            >
                                <ShoppingBag size={16} />
                                {t('importEtsy')}
                            </Link>
                            */}
                        </div>
                    </div>
                )}
            </div>

            {filteredSellers.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="mx-auto h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <Store size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500">{t('noStoresFound')}</p>
                    <button
                        onClick={() => setActiveCategory('all')}
                        className="mt-2 text-blue-600 text-sm font-medium hover:underline"
                    >
                        {t('viewAllStores')}
                    </button>
                </div>
            )}
        </div>
    );
}
