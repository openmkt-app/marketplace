// src/components/marketplace/ListingCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ShoppingCart } from 'lucide-react';
import ListingImageDisplay from './ListingImageDisplay';
import ListingImageDebug from './ListingImageDebug';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice, formatDate, formatLocation } from '@/lib/price-utils';
import { extractSubcategoryFromDescription, getCategoryName } from '@/lib/category-utils';
import { generateAvatarUrl } from '@/lib/image-utils';
import { getSellerDisplayName } from '@/lib/chat-utils';

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
  // Get clean description
  const { cleanDescription } = extractSubcategoryFromDescription(listing.description);

  // Determine link target
  const linkHref = listing.uri
    ? `/listing/${encodeURIComponent(listing.uri)}`
    : `/listing/${encodeURIComponent(listing.title)}`;

  // Format date
  const postedDate = formatDate(listing.createdAt);

  // Format location - clean up prefixes and abbreviate state
  const locationString = formatLocation(listing.location?.locality, listing.location?.state);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative">
      {/* Make the whole card clickable via a stretched link approach */}
      <Link href={linkHref} className="absolute inset-0 z-10">
        <span className="sr-only">View {listing.title}</span>
      </Link>

      {/* Debug overlay */}
      {showDebug && (
        <div className="relative z-20 pointer-events-none">
          <ListingImageDebug listing={listing} show={showDebug} />
        </div>
      )}

      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <ListingImageDisplay
          listing={listing}
          size="thumbnail"
          height="100%"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          fallbackText="No image"
        />

        {/* Condition Badge */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
            {formatConditionForDisplay(listing.condition)}
          </span>
        </div>

        {/* External Buy Badge */}
        {listing.externalUrl && (
          <div className="absolute top-3 right-3 z-20 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-slate-800 shadow-sm">
              <ShoppingCart size={12} />
              Buy Online
            </span>
          </div>
        )}

        {/* Quick View Overlay - pointer-events-none so clicks pass through to the card link */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center z-20 pointer-events-none">
          <span className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium text-sm shadow-lg">
            Quick View
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow relative z-20 pointer-events-none">
        {listing.category && (
          <span className="text-[10px] font-medium text-sky-600 uppercase tracking-wider mb-1">
            {getCategoryName(listing.category)}
          </span>
        )}
        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-sky-600 transition-colors">
          {listing.title}
        </h3>

        <p className="text-xl font-bold text-slate-900 mb-2">
          {formatPrice(listing.price)}
        </p>

        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-grow">
          {cleanDescription}
        </p>

        {/* Footer Info */}
        <div className="mt-auto space-y-2">
          {locationString && (
            <div className="flex items-center text-xs text-slate-400">
              <MapPin size={12} className="mr-1" />
              <span className="truncate">
                {locationString}
              </span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Avatar or Initials */}
              {listing.authorDid && listing.authorAvatarCid ? (
                <div className="w-5 h-5 rounded-full overflow-hidden relative flex-shrink-0">
                  <Image
                    src={generateAvatarUrl(listing.authorDid, listing.authorAvatarCid) || ''}
                    alt="User"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[10px] text-sky-600 font-bold ring-1 ring-sky-200">
                  {listing.authorDisplayName ? listing.authorDisplayName.charAt(0).toUpperCase() : (listing.authorHandle?.charAt(0).toUpperCase() || '?')}
                </div>
              )}
              <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
                {getSellerDisplayName(listing)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
              {postedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ListingCard.displayName = 'ListingCard';

export default ListingCard;
