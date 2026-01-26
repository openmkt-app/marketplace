import { Suspense } from 'react';
import { Metadata } from 'next';
import BrowsePageClient from './BrowsePageClient';

export const metadata: Metadata = {
    title: 'Browse Listings | Open Market',
    description: 'Browse local listings on Open Market. Find great deals on items for sale in your area without fees or middlemen.',
    alternates: {
        canonical: '/browse',
    },
};

export default function BrowsePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-color border-t-transparent rounded-full"></div>
            </div>
        }>
            <BrowsePageClient />
        </Suspense>
    );
}
