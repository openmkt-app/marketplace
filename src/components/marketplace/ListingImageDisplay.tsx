// src/components/marketplace/ListingImageDisplay.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { createBlueskyCdnImageUrls, extractBlobCid } from '@/lib/image-utils';
import type { ListingImage } from '@/lib/marketplace-client';

interface ListingImageDisplayProps {
  listing: any; // Accept any type of listing
  size?: 'thumbnail' | 'fullsize';
  className?: string;
  height?: string | number;
  fallbackText?: string;
  priority?: boolean;
  /**
   * Layout width hint for the optimizer, so it can pick a source width instead
   * of assuming the image fills the viewport. The default matches the browse
   * grid (1 / 2 / 3 / 4 columns).
   */
  sizes?: string;
}

const DEFAULT_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 320px';

/**
 * Work out which URL to display.
 *
 * Pure and synchronous on purpose. This used to run in a useEffect that set
 * state, which meant the <img> had no src until after hydration — so images
 * could not begin downloading until the JS bundle had loaded, parsed and run.
 * Deriving it during render puts the URL in the markup the moment the card
 * renders, and lets it be server-rendered.
 */
function resolveImageUrl(listing: any, size: 'thumbnail' | 'fullsize'): string | null {
  if (!listing) return null;

  const authorDid = listing.authorDid || '';
  if (!authorDid) return null;

  // The API already generated these server-side; prefer them over recomputing.
  const preformatted = listing.formattedImages?.[0];
  if (preformatted) {
    const url = size === 'thumbnail' ? preformatted.thumbnail : preformatted.fullsize;
    if (url) return url;
  }

  const first: ListingImage | undefined = listing.images?.[0];
  if (!first) return null;

  // Demo fixtures ship as static SVGs in /public rather than as blobs.
  const link = (first as any)?.ref?.$link;
  if (typeof link === 'string' && (link.includes('demo-') || link.endsWith('.svg'))) {
    return `/${link}`;
  }

  const blobCid = extractBlobCid(first);
  if (!blobCid) return null;

  const urls = createBlueskyCdnImageUrls(
    { ref: { $link: blobCid }, mimeType: (first as any).mimeType || 'image/jpeg', size: (first as any).size || 0 },
    authorDid,
  );

  return size === 'thumbnail' ? urls.thumbnail : urls.fullsize;
}

export default function ListingImageDisplay({
  listing,
  size = 'thumbnail',
  className = 'w-full h-full object-cover',
  height = 200,
  fallbackText = 'No image available',
  priority = false,
  sizes = DEFAULT_SIZES,
}: ListingImageDisplayProps) {
  const imageUrl = useMemo(() => {
    try {
      return resolveImageUrl(listing, size);
    } catch {
      return null;
    }
  }, [listing, size]);

  // Keyed by URL so a new image clears a previous failure without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const error = imageUrl !== null && failedUrl === imageUrl;

  // Show placeholder if no image or error
  if (!imageUrl || error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm">{fallbackText}</p>
        </div>
      </div>
    );
  }

  // Render the image
  return (
    <div className="relative w-full" style={{ height }}>
      <Image
        src={imageUrl}
        alt={listing.title || 'Listing image'}
        fill
        sizes={sizes}
        className={className}
        onError={() => setFailedUrl(imageUrl)}
        // The optimizer rejects SVG unless dangerouslyAllowSVG is set, and the
        // only SVGs here are local demo fixtures that need no resizing anyway.
        unoptimized={imageUrl.endsWith('.svg')}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}
