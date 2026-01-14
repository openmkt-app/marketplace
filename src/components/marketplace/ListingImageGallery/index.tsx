// src/components/marketplace/ListingImageGallery/index.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import './styles.css';

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
  
  // If no images are provided, show a placeholder
  if (!images || images.length === 0) {
    return (
      <div className="listing-image-gallery">
        <div className="main-image-container placeholder">
          <div className="placeholder-text">No images available</div>
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
      <div className="listing-image-gallery">
        <div className="main-image-container placeholder">
          <div className="placeholder-text">Image format error</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="listing-image-gallery">
      <div className="main-image-container relative">
        <Image
          src={images[selectedImageIndex].fullsize}
          alt={`${title} - Image ${selectedImageIndex + 1}`}
          fill
          className="main-image object-contain"
          unoptimized
        />
      </div>

      {images.length > 1 && (
        <div className="thumbnails-container">
          {images.map((image, index) => (
            <div
              key={`thumb-${index}`}
              className={`thumbnail ${index === selectedImageIndex ? 'selected' : ''} relative`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <Image
                src={image.thumbnail}
                alt={`${title} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}