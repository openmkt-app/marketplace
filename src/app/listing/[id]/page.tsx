import type { Metadata } from 'next';
import { fetchListingById } from '@/lib/server/fetch-listing';
import { getCategoryName } from '@/lib/category-utils';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import ListingPageClient from './ListingPageClient';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListingById(id);

  if (!listing) {
    return {
      title: 'Listing Not Found | Open Market',
      description: 'This listing could not be found on Open Market.',
    };
  }

  const title = `${listing.title} | Open Market`;
  const description = listing.description
    ? `${listing.description.substring(0, 150)}${listing.description.length > 150 ? '...' : ''}`
    : `Buy ${listing.title} for ${listing.price} on Open Market.`;

  const imageUrl = listing.formattedImages?.[0]?.fullsize;
  const locationStr = [listing.location.locality, listing.location.state]
    .filter(Boolean)
    .join(', ');

  const canonicalUrl = `https://openmkt.app/listing/${encodeURIComponent(id)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      images: imageUrl ? [{ url: imageUrl, alt: listing.title }] : [],
      siteName: 'Open Market',
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    other: {
      'product:price:amount': listing.price.replace(/[^0-9.]/g, ''),
      'product:price:currency': 'USD',
      ...(locationStr && { 'product:availability': 'in stock' }),
    },
  };
}

// JSON-LD structured data for rich snippets
function generateJsonLd(listing: NonNullable<Awaited<ReturnType<typeof fetchListingById>>>) {
  const imageUrl = listing.formattedImages?.[0]?.fullsize;
  const priceValue = listing.price.replace(/[^0-9.]/g, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: imageUrl,
    offers: {
      '@type': 'Offer',
      price: priceValue || '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemCondition: getSchemaCondition(listing.condition),
      seller: {
        '@type': 'Person',
        name: listing.authorDisplayName || listing.authorHandle || 'Seller',
        ...(listing.authorHandle && {
          url: `https://openmkt.app/store/${listing.authorHandle}`,
        }),
      },
    },
    category: getCategoryName(listing.category),
    ...(listing.location && {
      availableAtOrFrom: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: listing.location.locality,
          addressRegion: listing.location.state,
          addressCountry: 'US',
        },
      },
    }),
  };
}

function getSchemaCondition(condition: string): string {
  const conditionMap: Record<string, string> = {
    new: 'https://schema.org/NewCondition',
    likeNew: 'https://schema.org/UsedCondition',
    good: 'https://schema.org/UsedCondition',
    fair: 'https://schema.org/UsedCondition',
    poor: 'https://schema.org/UsedCondition',
  };
  return conditionMap[condition] || 'https://schema.org/UsedCondition';
}

export default async function ListingDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const listing = await fetchListingById(id);

  return (
    <>
      {listing && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateJsonLd(listing)),
          }}
        />
      )}
      <ListingPageClient
        listingId={id}
        initialListing={listing}
        isNewListing={searchParamsResolved.newListing === 'true'}
      />
    </>
  );
}
