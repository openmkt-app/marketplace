import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchStoreByHandle } from '@/lib/server/fetch-store';
import { isSellerExcluded } from '@/lib/excluded-sellers';
import { getStoreName } from '@/lib/seller-display';
import StorePageClient from './StorePageClient';
import { defaultOgImages, defaultTwitterImages } from '@/lib/site-metadata';

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

  const { profile, listingsCount, shop } = storeData;
  // Same name the page renders, so the tab title and the heading agree.
  const displayName = getStoreName(shop, profile);
  const title = t('titleTemplate', { name: displayName });
  const about = shop?.description || profile.description;
  const description = about
    ? `${about.substring(0, 150)}${about.length > 150 ? '...' : ''}`
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
      // Falls back to the house card so a store without an avatar still
      // unfurls with an image instead of a bare line of text.
      images: profile.avatar ? [{ url: profile.avatar, alt: displayName }] : defaultOgImages,
      siteName: 'Open Market',
    },
    twitter: {
      // An avatar is square, so it belongs in the small card; the house image
      // is 1200x630 and belongs in the wide one.
      card: profile.avatar ? 'summary' : 'summary_large_image',
      title,
      description,
      images: profile.avatar ? [profile.avatar] : defaultTwitterImages,
    },
  };
}

// JSON-LD structured data for seller profile
function generateJsonLd(
  profile: NonNullable<Awaited<ReturnType<typeof fetchStoreByHandle>>>['profile'],
  listingsCount: number,
  shop: NonNullable<Awaited<ReturnType<typeof fetchStoreByHandle>>>['shop'],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: getStoreName(shop, profile),
      alternateName: `@${profile.handle}`,
      description: shop?.description || profile.description,
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
            __html: JSON.stringify(generateJsonLd(storeData.profile, storeData.listingsCount, storeData.shop)),
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
