
'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { importListing } from '@/lib/etsy-client';
import { EtsyListing } from '@/lib/etsy-types';
import ListingSelector from '@/components/marketplace/ImportWizard/ListingSelector';
import { useAuth } from '@/contexts/AuthContext';

// Parse Etsy CSV export into EtsyListing objects
function parseEtsyCsv(text: string): EtsyListing[] {
    let i = 0;

    const parseField = (): string => {
        if (text[i] === '"') {
            i++;
            let val = '';
            while (i < text.length) {
                if (text[i] === '"' && text[i + 1] === '"') { val += '"'; i += 2; }
                else if (text[i] === '"') { i++; break; }
                else { val += text[i++]; }
            }
            return val;
        }
        let val = '';
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') val += text[i++];
        return val;
    };

    const skipNewlines = () => { while (text[i] === '\n' || text[i] === '\r') i++; };

    // Parse header row
    const headers: string[] = [];
    while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
        headers.push(parseField().trim().toUpperCase());
        if (text[i] === ',') i++;
    }
    skipNewlines();

    const rows: EtsyListing[] = [];

    while (i < text.length) {
        const row: Record<string, string> = {};
        let col = 0;
        while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
            if (headers[col] !== undefined) row[headers[col]] = parseField();
            else parseField();
            col++;
            if (text[i] === ',') i++;
        }
        skipNewlines();

        const listingId = parseInt(row['LISTING_ID'] || '');
        const title = row['TITLE'] || '';
        if (!listingId || !title) continue;

        const priceRaw = parseFloat(row['PRICE'] || '0');
        const images = [];
        for (let n = 1; n <= 10; n++) {
            const url = row[`IMAGE${n}`];
            if (url && url.startsWith('http')) {
                images.push({
                    listing_image_id: n,
                    rank: n,
                    url_75x75: url,
                    url_170x135: url,
                    url_570xN: url,
                    url_fullxfull: url,
                    full_height: null,
                    full_width: null,
                });
            }
        }

        const tags = (row['TAGS'] || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        rows.push({
            listing_id: listingId,
            title,
            description: row['DESCRIPTION'] || '',
            state: 'active',
            price: {
                amount: priceRaw,
                divisor: 1,
                currency_code: row['CURRENCY_CODE'] || 'USD',
            },
            quantity: parseInt(row['QUANTITY'] || '1') || 1,
            tags,
            url: `https://www.etsy.com/listing/${listingId}`,
            images,
        });
    }

    return rows;
}

export default function ImportPage() {
    const router = useRouter();
    const { client, isLoggedIn, isLoading, user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [listings, setListings] = useState<EtsyListing[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError(null);

        try {
            const text = await file.text();
            const parsed = parseEtsyCsv(text);

            if (parsed.length === 0) {
                setError('No listings found in this file. Make sure you uploaded the correct Etsy export CSV.');
                return;
            }

            setListings(parsed);
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Failed to read the CSV file.');
        } finally {
            setIsParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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

        for (let i = 0; i < selectedListings.length; i++) {
            try {
                await importListing(client, selectedListings[i]);
            } catch (err) {
                console.error('Failed to import listing', selectedListings[i].listing_id, err);
            }
            setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setTimeout(() => {
            router.push(user?.handle ? `/store/${user.handle}` : '/mall');
        }, 1000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Login</h1>
                    <p className="text-slate-500 mb-6">You need to be logged in to import products.</p>
                    <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 pb-24">
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

                        <h2 className="text-xl font-bold text-center mb-2">Upload Your Etsy Listings</h2>
                        <p className="text-slate-500 text-center text-sm mb-6">
                            Export your listings from Etsy and upload the file here to import them all at once.
                        </p>

                        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1.5 mb-6 bg-slate-50 rounded-xl p-4">
                            <li>Go to <strong>Etsy Shop Manager → Listings</strong></li>
                            <li>Click <strong>Download Data</strong> (top right corner)</li>
                            <li>Upload the downloaded CSV file below</li>
                        </ol>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 mb-4">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleCsvUpload}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isParsing}
                            className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            {isParsing ? 'Reading file...' : 'Upload Etsy Export CSV'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-semibold">Select Listings ({selectedIds.size} selected)</h2>
                                <p className="text-slate-500 text-sm">{listings.length} listings found in your export</p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <button
                                    onClick={() => setSelectedIds(
                                        selectedIds.size === listings.length
                                            ? new Set()
                                            : new Set(listings.map(l => l.listing_id))
                                    )}
                                    className="text-sm text-slate-500 hover:text-slate-900 font-medium"
                                >
                                    {selectedIds.size === listings.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={selectedIds.size === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Import {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
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
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Importing Listings...</h2>
                        <p className="text-slate-500 mb-8">
                            Processing {importProgress.current} of {importProgress.total} items
                        </p>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full transition-all duration-300"
                                style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                            />
                        </div>
                        <p className="mt-4 text-xs text-slate-400">Please do not close this window.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
