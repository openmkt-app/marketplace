import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchStoreByHandle } from '@/lib/server/fetch-store';
import { isSellerExcluded } from '@/lib/excluded-sellers';
import StorePageClient from './StorePageClient';

type Props = {
  params: Promise<{ handle: string }>;
};

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;

  // Check if seller has opted out
  if (isSellerExcluded(handle)) {
    return {
      title: 'Store Not Available | Open Market',
      description: 'This store is not available on Open Market.',
    };
  }

  const storeData = await fetchStoreByHandle(handle);

  if (!storeData) {
    return {
      title: 'Store Not Found | Open Market',
      description: 'This store could not be found on Open Market.',
    };
  }

  const { profile, listingsCount } = storeData;
  const displayName = profile.displayName || profile.handle;
  const title = `${displayName}'s Store | Open Market`;
  const description = profile.description
    ? `${profile.description.substring(0, 150)}${profile.description.length > 150 ? '...' : ''}`
    : `Shop ${listingsCount} item${listingsCount !== 1 ? 's' : ''} from ${displayName} on Open Market.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `https://openmkt.app/store/${handle}`,
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
  const { handle } = await params;

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
        initialListingsCount={storeData?.listingsCount || 0}
      />
    </>
  );
}
