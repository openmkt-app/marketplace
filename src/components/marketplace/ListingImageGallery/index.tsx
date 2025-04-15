// src/components/marketplace/ListingImageGallery/index.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  
  // Log images when component renders
  useEffect(() => {
    console.log('ListingImageGallery - Images provided:', images);
  }, [images]);
  
  // If no images are provided, show a placeholder
  if (!images || images.length === 0) {
    console.error('No images provided to gallery');
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
    console.error('Invalid image format:', images);
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
      <div className="main-image-container">
        <img 
          src={images[selectedImageIndex].fullsize} 
          alt={`${title} - Image ${selectedImageIndex + 1}`}
          className="main-image"
        />
      </div>
      
      {images.length > 1 && (
        <div className="thumbnails-container">
          {images.map((image, index) => (
            <div 
              key={`thumb-${index}`}
              className={`thumbnail ${index === selectedImageIndex ? 'selected' : ''}`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <img 
                src={image.thumbnail} 
                alt={`${title} - Thumbnail ${index + 1}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}