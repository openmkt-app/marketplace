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
    <div className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-light/50 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row h-auto relative">
      {/* Make the whole card clickable */}
      <Link href={linkHref} className="absolute inset-0 z-10">
        <span className="sr-only">View {listing.title}</span>
      </Link>

      {/* Debug overlay */}
      <div className="relative z-20 pointer-events-none">
        <ListingImageDebug listing={listing} show={showDebug} />
      </div>

      {/* Image Container */}
      <div className="relative w-full sm:w-72 aspect-video sm:aspect-auto overflow-hidden bg-gray-100 shrink-0">
        <ListingImageDisplay
          listing={listing}
          size="thumbnail"
          height="100%"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          fallbackText="No image"
        />

        {/* Condition Badge */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-sm text-gray-800 shadow-sm">
            {formatConditionForDisplay(listing.condition)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col justify-between pointer-events-none">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              {listing.category && (
                <span className="text-xs font-bold text-primary-color uppercase tracking-wide mb-1 block">
                  {getCategoryName(listing.category)}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-color transition-colors mb-1">
                {listing.title}
              </h3>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(listing.price)}
            </div>
          </div>

          <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
            {cleanDescription}
          </p>

          {/* Tags/Badges - Using Subcategories or other meta if available, else just a placeholder layout matching the mock if needed. 
              The mock shows specific tags. We can just skip or add if we had them. 
              Let's keep it simple for now or use Condition again? No, Condition is on image.
          */}
        </div>

        {/* Footer Meta */}
        <div className="flex items-center gap-6 pt-4 border-t border-gray-50 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gray-400" />
            <span className="truncate max-w-[120px]">
              {listing.location.locality}, {listing.location.state}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Simple User Icon since we are in a tight list row, but we can reuse the avatar if we want. 
                The mock uses a simple User icon. Let's stick to the mock's clean look or use our avatar.
                The mock uses <lucide-user>. Let's try that for "Google AI" look.
            */}
            {listing.authorDid && listing.authorAvatarCid ? (
              <div className="w-4 h-4 rounded-full overflow-hidden relative">
                <Image
                  src={generateAvatarUrl(listing.authorDid, listing.authorAvatarCid) || ''}
                  alt="User"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user text-gray-400">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            )}
            <span className="truncate max-w-[100px]">
              {listing.authorDisplayName || listing.authorHandle || 'Unknown'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar text-gray-400">
              <path d="M8 2v4"></path>
              <path d="M16 2v4"></path>
              <rect width="18" height="18" x="3" y="4" rx="2"></rect>
              <path d="M3 10h18"></path>
            </svg>
            <span>{postedDate}</span>
          </div>
        </div>
      </div>

      {/* Button Column */}
      <div className="hidden sm:flex flex-col justify-center items-center px-8 border-l border-gray-50 bg-gray-50/30 min-w-[160px]">
        <button className="flex items-center gap-2 bg-primary-color text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-primary-light/30 group-hover:bg-primary-light group-hover:shadow-primary-light/50 transition-all pointer-events-none">
          View Details
        </button>
      </div>
    </div>
  );
});

export default ListingCard;