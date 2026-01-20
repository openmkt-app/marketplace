// src/components/marketplace/ListingImageGallery/index.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';

interface ListingImage {
  thumbnail: string;
  fullsize: string;
  mimeType: string;
}

interface ListingImageGalleryProps {
  images: ListingImage[];
  title: string;
}

export default function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  // If no images are provided, show a placeholder
  if (!images || images.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="relative w-full h-[400px] bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500">No images available</span>
        </div>
      </div>
    );
  }

  // Check that the images are properly formatted
  const hasValidImages = images.every(img =>
    img.fullsize && typeof img.fullsize === 'string' &&
    img.thumbnail && typeof img.thumbnail === 'string'
  );

  if (!hasValidImages) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="relative w-full h-[400px] bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500">Image format error</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Main Image with Heart Icon */}
      <div className="relative w-full h-[400px] sm:h-[450px]">
        <Image
          src={images[selectedImageIndex].fullsize}
          alt={`${title} - Image ${selectedImageIndex + 1}`}
          fill
          className="object-cover"
          unoptimized
        />

{/* TODO: Favorite Heart Button - Hidden until favorites feature is implemented (see TODO-STORE-IMPROVEMENTS.md)
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={22}
            className={isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>
        */}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={`thumb-${index}`}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                index === selectedImageIndex
                  ? 'border-blue-500'
                  : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <Image
                src={image.thumbnail}
                alt={`${title} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}