// src/components/marketplace/ListingCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import ListingImageDisplay from './ListingImageDisplay';
import ListingImageDebug from './ListingImageDebug';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice } from '@/lib/price-utils';
import { extractSubcategoryFromDescription, getCategoryName } from '@/lib/category-utils';
import { generateAvatarUrl } from '@/lib/image-utils';

interface ListingCardProps {
  listing: MarketplaceListing & {
    uri?: string;
    authorDid?: string;
    authorHandle?: string;
    authorDisplayName?: string;
    authorAvatarCid?: string;
  };
  showDebug?: boolean;
}

const ListingCard = React.memo(({ listing, showDebug = false }: ListingCardProps) => {
  // Format price
  const formattedPrice = listing.price.startsWith('$') ? listing.price : `$${listing.price}`;

  // Get clean description
  const { cleanDescription } = extractSubcategoryFromDescription(listing.description);

  // Determine link target
  const linkHref = listing.uri
    ? `/listing/${encodeURIComponent(listing.uri)}`
    : `/listing/${encodeURIComponent(listing.title)}`;

  // Format date
  const postedDate = new Date(listing.createdAt).toLocaleDateString();

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative">
      {/* Make the whole card clickable via a stretched link approach or wrapping content */}
      <Link href={linkHref} className="absolute inset-0 z-10">
        <span className="sr-only">View {listing.title}</span>
      </Link>

      {/* Debug overlay */}
      <div className="relative z-20 pointer-events-none">
        <ListingImageDebug listing={listing} show={showDebug} />
      </div>

      {/* Image Container - Using square aspect ratio for cleaner look */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <ListingImageDisplay
          listing={listing}
          size="thumbnail"
          height="100%"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          fallbackText="No image"
        />

        {/* Condition Badge */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/95 backdrop-blur-sm text-gray-700 shadow-sm">
            {formatConditionForDisplay(listing.condition)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow relative z-20 pointer-events-none">
        {listing.category && (
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
            {getCategoryName(listing.category)}
          </span>
        )}
        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">
          {listing.title}
        </h3>

        <p className="text-lg font-bold text-gray-900 mb-2">
          {formatPrice(listing.price)}
        </p>

        <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-grow">
          {cleanDescription}
        </p>

        {/* Location */}
        <div className="flex items-center text-xs text-gray-400 mb-3">
          <MapPin size={12} className="mr-1 flex-shrink-0" />
          <span className="truncate">
            {listing.location.locality}, {listing.location.state}
          </span>
        </div>

        {/* Footer - Author and Date */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar - shows profile image or fallback to initials */}
            {listing.authorDid && listing.authorAvatarCid ? (
              <div className="w-6 h-6 rounded-full overflow-hidden relative flex-shrink-0 ring-1 ring-gray-200">
                <Image
                  src={generateAvatarUrl(listing.authorDid, listing.authorAvatarCid) || ''}
                  alt={listing.authorDisplayName || listing.authorHandle || 'Seller'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-semibold flex-shrink-0">
                {listing.authorDisplayName ? listing.authorDisplayName.charAt(0).toUpperCase() : (listing.authorHandle?.charAt(0).toUpperCase() || '?')}
              </div>
            )}
            <span className="text-sm text-gray-600 truncate">
              {listing.authorDisplayName || listing.authorHandle || 'Unknown'}
            </span>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
            {postedDate}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ListingCard;