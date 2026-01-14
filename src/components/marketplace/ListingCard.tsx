// src/components/marketplace/ListingCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Tag, User } from 'lucide-react';
import ListingImageDisplay from './ListingImageDisplay';
import ListingImageDebug from './ListingImageDebug';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice } from '@/lib/price-utils';
import { extractSubcategoryFromDescription, getCategoryName } from '@/lib/category-utils';

interface ListingCardProps {
  listing: MarketplaceListing & {
    uri?: string;
    authorDid?: string;
    authorHandle?: string;
    authorDisplayName?: string;
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
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
            {formatConditionForDisplay(listing.condition)}
          </span>
        </div>

        {/* Quick View Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center z-10">
          <span className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium text-sm shadow-lg">
            Quick View
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow relative z-20 pointer-events-none">
        {listing.category && (
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            {getCategoryName(listing.category)}
          </span>
        )}
        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
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
          <div className="flex items-center text-xs text-slate-400">
            <MapPin size={12} className="mr-1" />
            <span className="truncate">
              {listing.location.locality}, {listing.location.state}
            </span>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Placeholder Avatar or Initials */}
              <div className="w-5 h-5 rounded-full bg-primary-light/10 flex items-center justify-center text-[10px] text-primary-color font-bold ring-1 ring-primary-color/20">
                {listing.authorDisplayName ? listing.authorDisplayName.charAt(0).toUpperCase() : (listing.authorHandle?.charAt(0).toUpperCase() || '?')}
              </div>
              <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
                {listing.authorDisplayName || listing.authorHandle || 'Unknown Seller'}
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

export default ListingCard;