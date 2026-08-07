import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchStoreByHandle } from '@/lib/server/fetch-store';
import { isSellerExcluded } from '@/lib/excluded-sellers';
import StorePageClient from './StorePageClient';

type Props = {
  params: Promise<{ handle: string; locale: string }>;
};

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, locale } = await params;

  // Handle the placeholder link from Bluesky bio
  if (handle === '[your-handle]' || handle === '%5Byour-handle%5D' || handle === 'your-handle') {
    redirect(`/${locale}/my-store`);
  }

  const t = await getTranslations({ locale, namespace: 'store.metadata' });

  // Check if seller has opted out
  if (isSellerExcluded(handle)) {
    return {
      title: t('notAvailableTitle'),
      description: t('notAvailableDescription'),
    };
  }

  const storeData = await fetchStoreByHandle(handle);

  if (!storeData) {
    return {
      title: t('notFoundTitle'),
      description: t('notFoundDescription'),
    };
  }

  const { profile, listingsCount } = storeData;
  const displayName = profile.displayName || profile.handle;
  const title = t('titleTemplate', { name: displayName });
  const description = profile.description
    ? `${profile.description.substring(0, 150)}${profile.description.length > 150 ? '...' : ''}`
    : t('descriptionFallback', { count: listingsCount, name: displayName });

  const canonicalUrl = `https://openmkt.app/store/${handle}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: canonicalUrl,
      images: profile.avatar ? [{ url: profile.avatar, alt: displayName }] : [],
      siteName: 'Open Market',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: profile.avatar ? [profile.avatar] : [],
    },
  };
}

// JSON-LD structured data for seller profile
function generateJsonLd(profile: NonNullable<Awaited<ReturnType<typeof fetchStoreByHandle>>>['profile'], listingsCount: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.displayName || profile.handle,
      alternateName: `@${profile.handle}`,
      description: profile.description,
      image: profile.avatar,
      url: `https://openmkt.app/store/${profile.handle}`,
      sameAs: [`https://bsky.app/profile/${profile.handle}`],
      makesOffer: {
        '@type': 'OfferCatalog',
        numberOfItems: listingsCount,
        itemListElement: {
          '@type': 'ItemList',
          numberOfItems: listingsCount,
        },
      },
    },
  };
}

export default async function StorePage({ params }: Props) {
  const { handle, locale } = await params;

  // Handle the placeholder link from Bluesky bio
  if (handle === '[your-handle]' || handle === '%5Byour-handle%5D' || handle === 'your-handle') {
    redirect(`/${locale}/my-store`);
  }

  // Check if seller has opted out - return 404
  if (isSellerExcluded(handle)) {
    notFound();
  }

  const storeData = await fetchStoreByHandle(handle);

  return (
    <>
      {storeData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateJsonLd(storeData.profile, storeData.listingsCount)),
          }}
        />
      )}
      <StorePageClient
        handle={handle}
        initialProfile={storeData?.profile || null}
        initialListings={storeData?.listings ?? null}
        initialListingsCount={storeData?.listingsCount || 0}
        shop={storeData?.shop ?? null}
      />
    </>
  );
}
