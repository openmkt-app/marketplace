import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getInitialBrowseListings } from '@/lib/server/browse-ssr';
import { defaultOgImages, defaultTwitterImages } from '@/lib/site-metadata';
import BrowsePageClient from './BrowsePageClient';

// Rebuilt at most once a minute rather than on every request.
//
// This page was force-dynamic, which meant no cache anywhere: every crawler
// sweep, every link unfurl, every bot cost a function invocation, and there
// were far more of those than there were visitors. The filters live in
// useSearchParams on the client, so the served shell is the same document for
// everyone and the client fetches the filtered set after hydration — there is
// nothing per-visitor in here to keep out of a shared cache.
//
// A listing therefore takes up to a minute to appear in or leave this page's
// seed. The client fetch behind it is still live, so the grid a visitor ends
// up looking at is current either way.
export const revalidate = 60;

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
            images: defaultOgImages,
        },
        twitter: {
            card: 'summary_large_image',
            title: t('title'),
            description: t('ogDescription'),
            images: defaultTwitterImages,
        },
    };
}

export default async function BrowsePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    // Opts this page out of reading the locale from a request header, which is
    // what next-intl does otherwise and what silently made every page on the
    // site render per request. Without this the revalidate above is inert.
    const { locale } = await params;
    setRequestLocale(locale);

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
