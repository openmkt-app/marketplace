'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Palette } from 'lucide-react';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { formatPrice } from '@/lib/price-utils';
import { shouldBlurListing } from '@/lib/content-labels';
import { COMMISSION_CATEGORY_ID } from '@/lib/artist-store-utils';

interface GalleryListingTileProps {
  listing: MarketplaceListing;
  flaggedUris?: Set<string>;
  priority?: boolean;
}

export default function GalleryListingTile({ listing, flaggedUris, priority }: GalleryListingTileProps) {
  const [hovered, setHovered] = useState(false);
  const isNsfw = shouldBlurListing(listing.labels, listing.uri, flaggedUris);
  const [blurDismissed, setBlurDismissed] = useState(false);

  const thumbnail = listing.formattedImages?.[0]?.thumbnail;
  const slots = listing.metadata?.slotsAvailable;
  const isCommission = listing.category === COMMISSION_CATEGORY_ID;

  const linkHref = listing.uri
    ? `/listing/${encodeURIComponent(listing.uri)}`
    : '#';

  return (
    <Link
      href={linkHref}
      className="relative aspect-square overflow-hidden bg-gray-100 group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          priority={priority}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-purple-50">
          <Palette size={24} className="text-purple-200" />
        </div>
      )}

      {/* NSFW blur overlay */}
      {isNsfw && !blurDismissed && (
        <div
          className="absolute inset-0 bg-black/10 backdrop-blur-xl z-20 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setBlurDismissed(true);
          }}
        >
          <span className="text-white text-xs font-bold bg-red-500/80 px-2 py-1 rounded-full">NSFW</span>
        </div>
      )}

      {/* Slot/status badge */}
      {slots !== undefined && (
        <div className="absolute top-2 left-2 z-10">
          {slots === 0 ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full shadow-sm">
              Waitlist
            </span>
          ) : (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full shadow-sm">
              Open
            </span>
          )}
        </div>
      )}

      {/* Hover overlay with title + price + CTA */}
      <div
        className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-end p-3 transition-opacity duration-200 z-10 ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <p className="text-white text-xs font-semibold text-center line-clamp-2 mb-1">{listing.title}</p>
        <p className="text-white/80 text-xs mb-2">
          {isCommission ? 'Starting at ' : ''}{formatPrice(listing.price, listing.currency)}
        </p>
        <span className="px-3 py-1 bg-white text-slate-900 text-xs font-bold rounded-full">
          {isCommission ? 'View Commission' : 'Quick View'}
        </span>
      </div>
    </Link>
  );
}
