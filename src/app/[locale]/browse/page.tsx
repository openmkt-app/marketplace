import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getInitialBrowseListings } from '@/lib/server/browse-ssr';
import BrowsePageClient from './BrowsePageClient';

// Already dynamic by way of useSearchParams; stating it skips the static
// prerender attempt at build time, which cannot reach the index and logs three
// dynamic-server-usage errors on the way to falling back to an empty grid.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'browse.metadata' });
    return {
        title: t('title'),
        description: t('description'),
        alternates: { canonical: '/browse' },
        openGraph: {
            title: t('title'),
            description: t('ogDescription'),
            type: 'website',
            url: 'https://openmkt.app/browse',
            siteName: 'Open Market',
        },
    };
}

export default async function BrowsePage() {
    // Seeds the grid so the first screen of products is in the HTML, which lets
    // the browser start downloading their images immediately instead of waiting
    // for the bundle to load, hydrate and fetch. Empty on any failure or delay,
    // in which case the page behaves exactly as it did before.
    const initialListings = await getInitialBrowseListings();

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-color border-t-transparent rounded-full"></div>
            </div>
        }>
            <BrowsePageClient initialListings={initialListings as any} />
        </Suspense>
    );
}
