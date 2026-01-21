
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { fetchEtsyListings, importListing } from '@/lib/etsy-client';
import { EtsyListing } from '@/lib/etsy-types';
import ListingSelector from '@/components/marketplace/ImportWizard/ListingSelector';
import { useAuth } from '@/contexts/AuthContext';

export default function ImportPage() {
    const router = useRouter();
    const { client, isLoggedIn, user } = useAuth(); // Get user for redirect

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [shopId, setShopId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [listings, setListings] = useState<EtsyListing[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    const handleFetchListings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopId.trim()) return;

        setIsLoading(true);
        setError(null);
        setWarning(null);
        try {
            const { results, warning } = await fetchEtsyListings(shopId);
            setListings(results);
            if (warning) {
                setWarning(warning);
                setStep(2);
            } else if (results.length === 0) {
                setError('No active listings found for this shop (or shop is private).');
            } else {
                setStep(2);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch listings. Please check the Shop ID.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!client || !isLoggedIn) {
            setError('You must be logged in to import listings.');
            return;
        }

        const selectedListings = listings.filter(l => selectedIds.has(l.listing_id));
        setStep(3);
        setImportProgress({ current: 0, total: selectedListings.length });

        let successCount = 0;

        for (let i = 0; i < selectedListings.length; i++) {
            const listing = selectedListings[i];
            try {
                await importListing(client, listing);
                successCount++;
            } catch (err) {
                console.error('Failed to import listing', listing.listing_id, err);
                // Verify if we should stop or continue. For now, we continue.
            }
            setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }

        // Finished
        setTimeout(() => {
            if (user?.handle) {
                router.push(`/store/${user.handle}`);
            } else {
                router.push('/mall');
            }
        }, 1000);
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Login</h1>
                    <p className="text-slate-500 mb-6">You need to be logged in to import products.</p>
                    <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors">Go to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 pb-24">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
                <Link href="/mall" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Import from Etsy</h1>
                    <p className="text-slate-500">Bring your existing products to Open Market</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {step === 1 && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 max-w-md mx-auto">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-orange-600" />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-center mb-2">Connect Your Shop</h2>
                        <p className="text-slate-500 text-center mb-6 text-sm">
                            Enter your Etsy Shop Name or Shop ID.
                            <br />
                            <span className="text-xs text-slate-400">e.g. "MyVintageStore" or "12345678"</span>
                        </p>

                        <form onSubmit={handleFetchListings} className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Shop Name or ID"
                                    value={shopId}
                                    onChange={(e) => setShopId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? 'Fetching...' : 'Find Listings'}
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {warning && (
                            <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-yellow-700 text-sm">Demo Mode Active</h3>
                                    <p className="text-sm text-yellow-800/80">{warning}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Select Products ({selectedIds.size})</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedIds(new Set(listings.map(l => l.listing_id)))}
                                    className="text-sm text-slate-500 hover:text-slate-900 font-medium"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={selectedIds.size === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Import Selected
                                </button>
                            </div>
                        </div>

                        <ListingSelector
                            listings={listings}
                            selectedIds={selectedIds}
                            onToggle={(id) => {
                                const next = new Set(selectedIds);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                setSelectedIds(next);
                            }}
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="max-w-md mx-auto text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        <div className="mb-6 relative w-20 h-20 mx-auto">
                            <svg className="animate-spin w-full h-full text-blue-600" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Importing Products...</h2>
                        <p className="text-slate-500 mb-8">
                            Processing {importProgress.current} of {importProgress.total} items
                        </p>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full transition-all duration-300"
                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                            />
                        </div>
                        <p className="mt-4 text-xs text-slate-400">Please do not close this window.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
