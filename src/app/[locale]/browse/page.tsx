import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BrowsePageClient from './BrowsePageClient';

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
