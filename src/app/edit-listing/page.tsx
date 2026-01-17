'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceListing } from '@/lib/marketplace-client';
import CreateListingForm from '@/components/marketplace/CreateListingForm';
import Navbar from '@/components/layout/Navbar';

function EditListingContent() {
    const searchParams = useSearchParams();
    const uri = searchParams.get('uri');
    const router = useRouter();
    const { client, isLoggedIn, isLoading: isAuthLoading } = useAuth();

    const [listing, setListing] = useState<MarketplaceListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthLoading) return;

        if (!isLoggedIn) {
            router.push('/login');
            return;
        }

        if (!uri) {
            setError('No listing URI provided');
            setLoading(false);
            return;
        }

        async function fetchListing() {
            if (!client) return;

            try {
                const data = await client.getListingByUri(uri!);
                if (data) {
                    // Verify ownership
                    if (client.agent && client.agent.session?.did && data.authorDid && client.agent.session.did !== data.authorDid) {
                        setError('You do not have permission to edit this listing.');
                    } else {
                        setListing(data);
                    }
                } else {
                    setError('Listing not found');
                }
            } catch (err) {
                setError('Failed to fetch listing');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchListing();
    }, [uri, client, isLoggedIn, isAuthLoading, router]);

    if (isAuthLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20 px-4">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow text-center">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
                    <p className="text-gray-700 mb-6">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8 flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full hover:bg-gray-200 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
                    </div>

                    {listing && client && (
                        <CreateListingForm
                            client={client}
                            mode="edit"
                            initialData={listing}
                            onSuccess={(uri) => {
                                router.push('/my-listings');
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function EditListingPage() {
    return (
        <>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                <EditListingContent />
            </Suspense>
        </>
    );
}
