'use client';

import { useState, useEffect } from 'react';
import { getKnownMarketplaceDIDs } from '@/lib/marketplace-dids';

export default function DebugDidsPage() {
    const [verifiedDids, setVerifiedDids] = useState<string[]>([]);
    const [allKnownDids, setAllKnownDids] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const loadDids = async () => {
        setLoading(true);
        try {
            // Direct fetch to API to see what the server sees
            const res = await fetch('/api/marketplace/sellers?t=' + Date.now());
            const data = await res.json();

            if (data.sellers) {
                setVerifiedDids(data.sellers.map((s: any) => s.did));
            }
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDids();
        // Get client-side known DIDs
        const all = getKnownMarketplaceDIDs();
        setAllKnownDids(all);
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Debug: Marketplace DIDs</h1>
            <p className="mb-4 text-gray-600">
                Use this page to verify if your new user is being picked up by the marketplace registry.
            </p>

            <button
                onClick={loadDids}
                className="px-4 py-2 bg-blue-600 text-white rounded mb-6 hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
            >
                {loading ? 'Refreshing...' : 'Refresh Verified List'}
            </button>

            {lastUpdated && <span className="ml-4 text-sm text-gray-500">Last updated: {lastUpdated}</span>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-green-700">
                        Server Verified DIDs ({verifiedDids.length})
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">
                        These are the users the Marketplace Bot is currently following.
                        If your user is NOT here, the registration failed.
                    </p>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto bg-gray-50 p-4 rounded">
                        {verifiedDids.map(did => (
                            <div key={did} className="font-mono text-xs break-all border-b border-gray-200 last:border-0 py-1">
                                {did}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">
                        Local Client DIDs ({allKnownDids.length})
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">
                        These are all DIDs your browser knows about (Local + Verified).
                    </p>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto bg-gray-50 p-4 rounded">
                        {allKnownDids.map(did => (
                            <div key={did} className="font-mono text-xs break-all border-b border-gray-200 last:border-0 py-1">
                                <span className={verifiedDids.includes(did) ? "text-green-600 font-bold" : "text-gray-600"}>
                                    {did} {verifiedDids.includes(did) ? '(Verified)' : '(Local Only)'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
