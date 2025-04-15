// src/lib/image-utils.ts
//
// This file contains utility functions for working with images in the AT Protocol marketplace,
// particularly for generating proper CDN URLs for Bluesky's image hosting service.
//
// Format of Bluesky CDN URLs:
// https://cdn.bsky.app/img/[variant]/plain/[DID]/[IMAGE_BLOB]@[extension]
import type { ListingImage } from './marketplace-client';

/**
 * Validates an image file for size, type, and dimensions
 * 
 * @param file File to validate
 * @param options Validation options
 * @returns Validation result with processed file and data URL
 */
export async function validateImage(file: File, options: {
  maxSize?: number,
  acceptedTypes?: string[],
  maxWidth?: number,
  maxHeight?: number
}): Promise<{
  valid: boolean,
  file?: File,
  dataUrl?: string,
  error?: string
}> {
  const { 
    maxSize = 1000000, // 1MB default
    acceptedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxWidth = 3000,
    maxHeight = 3000
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    return { 
      valid: false,
      error: `File too large. Maximum size is ${Math.round(maxSize / 1024)}KB.`
    };
  }
  
  // Check file type
  if (!acceptedTypes.includes(file.type)) {
    return { 
      valid: false,
      error: `Invalid file type. Accepted types are: ${acceptedTypes.join(', ')}.`
    };
  }
  
  // Create a data URL for the image preview
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // Check image dimensions
      const img = new Image();
      img.onload = () => {
        if (img.width > maxWidth || img.height > maxHeight) {
          resolve({
            valid: false,
            error: `Image dimensions too large. Maximum dimensions are ${maxWidth}x${maxHeight} pixels.`
          });
        } else {
          resolve({
            valid: true,
            file,
            dataUrl
          });
        }
      };
      
      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Failed to load image for validation.'
        });
      };
      
      img.src = dataUrl;
    };
    
    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Failed to read file.'
      });
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image if it exceeds a certain size threshold
 * 
 * @param file File to compress
 * @param maxSizeKB Maximum size in KB before compression is applied
 * @param quality Compression quality (0-1)
 * @returns Compressed file or original file if no compression needed
 */
export async function compressImage(file: File, maxSizeKB: number = 900, quality: number = 0.8): Promise<File> {
  // If the file is already under the size threshold, return it as is
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }
  
  // Only compress JPEG and PNG files
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return file;
  }
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create a canvas to draw the compressed image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(file); // If canvas context isn't available, return original file
          return;
        }
        
        // Set canvas dimensions to match the image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        // Convert canvas to blob with compression
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file); // If compression fails, return original file
            return;
          }
          
          // Create a new file from the blob
          const newFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified
          });
          
          resolve(newFile);
        }, file.type, quality);
      };
      
      img.onerror = () => {
        resolve(file); // If loading fails, return original file
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      resolve(file); // If reading fails, return original file
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a Bluesky CDN URL for an image, using the CORRECT format:
 * https://cdn.bsky.app/img/feed_thumbnail/plain/[DID]/[IMAGE_BLOB]@jpeg
 * 
 * @param did User's DID
 * @param blobCid Image blob CID
 * @param variant Image variant (feed_thumbnail, feed_fullsize, etc.)
 * @returns CDN URL for the image
 */
export function generateCdnUrl(did: string, blobCid: string, variant: 'feed_thumbnail' | 'feed_fullsize' = 'feed_thumbnail'): string | null {
  if (!did || !blobCid) {
    console.error('Missing required parameters for CDN URL generation', { did, blobCid });
    return null;
  }
  
  // Normalize the DID
  const normalizedDid = did.trim();
  
  // Make sure the blobCid doesn't contain any unwanted characters
  const normalizedBlobCid = blobCid.trim();
  
  // Format: https://cdn.bsky.app/img/feed_thumbnail/plain/[DID]/[IMAGE_BLOB]@jpeg
  const url = `https://cdn.bsky.app/img/${variant}/plain/${normalizedDid}/${normalizedBlobCid}@jpeg`;
  
  console.log(`Generated CDN URL: ${url}`);
  return url;
}

/**
 * Generates a Bluesky CDN URL for an image using the correct format
 * 
 * @param did User's DID (required for the correct CDN URL format)
 * @param image Image blob data
 * @param variant Image variant (feed_thumbnail, feed_fullsize, etc.)
 * @returns CDN URL for the image
 */
export function generateImageUrl(
  did: string,
  image: ListingImage,
  variant: 'feed_thumbnail' | 'feed_fullsize' = 'feed_thumbnail'
): string {
  if (!image || !image.ref || !image.ref.$link) {
    console.error('Invalid image object:', image);
    return '';
  }
  
  if (!did) {
    console.error('Missing DID for image URL generation');
    return '';
  }
  
  // Extract the blob link
  const blobCid = image.ref.$link;
  
  // Determine the file extension based on MIME type
  let extension = 'jpeg'; // Default to jpeg
  if (image.mimeType) {
    const parts = image.mimeType.split('/');
    if (parts.length > 1) {
      extension = parts[1];
      // Convert jpg to jpeg for consistency with Bluesky CDN
      if (extension === 'jpg') {
        extension = 'jpeg';
      }
    }
  }
  
  // Format: https://cdn.bsky.app/img/feed_thumbnail/plain/[DID]/[IMAGE_BLOB]@jpeg
  const url = `https://cdn.bsky.app/img/${variant}/plain/${did}/${blobCid}@${extension}`;
  
  console.log(`Generated URL: ${url}`);
  
  return url;
}

/**
 * Generates thumbnail and fullsize image URLs for all images in a listing
 * 
 * @param did User's DID (required for the correct CDN URL format)
 * @param images Array of image blobs
 * @returns Array of image objects with thumbnail and fullsize URLs
 */
export function generateImageUrls(did: string, images?: ListingImage[]): Array<{
  thumbnail: string;
  fullsize: string;
  mimeType: string;
}> {
  if (!images || images.length === 0) {
    console.log('No images to generate URLs for');
    return [];
  }
  
  if (!did) {
    console.error('Missing DID for image URL generation');
    return [];
  }
  
  console.log(`Generating URLs for ${images.length} images with DID: ${did}`);
  
  // Filter out invalid images
  const validImages = images.filter(image => {
    return image && image.ref && image.ref.$link;
  });
  
  if (validImages.length !== images.length) {
    console.warn(`${images.length - validImages.length} invalid images filtered out`);
  }
  
  const formattedImages = validImages.map(image => {
    // Use the correct CDN URL format that includes the DID
    const result = {
      thumbnail: generateImageUrl(did, image, 'feed_thumbnail'),
      fullsize: generateImageUrl(did, image, 'feed_fullsize'),
      mimeType: image.mimeType || 'image/jpeg'
    };
    
    return result;
  });
  
  return formattedImages;
}

/**
 * Safely extracts images from a listing object and generates proper CDN URLs
 * 
 * @param listing The listing object that may contain images
 * @param did The DID of the user (required for CDN URL generation)
 * @returns Array of processed image URLs
 */
export function extractAndFormatListingImages(listing: any, did: string): string[] {
  // Check if the listing exists and has images
  if (!listing) {
    console.error('Listing is null or undefined');
    return [];
  }
  
  if (!did) {
    console.error('Missing DID for image URL generation');
    return [];
  }

  console.log('Extracting images from listing:', listing);
  console.log('Using DID:', did);
  
  // If the listing already has formatted image URLs, use those
  if (listing.formattedImages && Array.isArray(listing.formattedImages)) {
    return listing.formattedImages.map((img: any) => img.fullsize || img.thumbnail || '');
  }
  
  // If the listing has unprocessed images, process them
  if (listing.images && Array.isArray(listing.images)) {
    return listing.images
      .filter((img: any) => {
        // Log each image for debugging
        console.log('Processing image:', img);
        return img && img.ref && img.ref.$link;
      })
      .map((img: any) => {
        // Generate URL using the correct format
        const blobCid = img.ref.$link;
        console.log(`Generating URL for blob: ${blobCid}`);
        const cdnUrl = generateCdnUrl(did, blobCid, 'feed_fullsize');
        console.log(`Generated URL: ${cdnUrl}`);
        return cdnUrl || '';
      })
      .filter(Boolean); // Remove any null/empty URLs
  }
  
  console.warn('No images found in listing object', listing);
  return [];
}

/**
 * Creates properly formatted Bluesky CDN image URLs from a blob reference and DID
 * This is a helper function for use throughout the application to ensure consistent URL generation
 * 
 * @param blobRef The blob reference object or string from the Bluesky API
 * @param did The DID of the user who created the blob
 * @param variant The image variant (thumbnail or fullsize)
 * @returns An object with thumbnail and fullsize URLs
 */
export function createBlueskyCdnImageUrls(
  blobRef: string | { $link: string } | any,
  did: string,
  mimeType: string = 'image/jpeg'
): { thumbnail: string; fullsize: string } {
  // Debug the input object to understand its structure
  console.log('createBlueskyCdnImageUrls - input blobRef:', 
    typeof blobRef === 'object' ? JSON.stringify(blobRef, null, 2) : blobRef);
  console.log('createBlueskyCdnImageUrls - did:', did);
  console.log('createBlueskyCdnImageUrls - mimeType:', mimeType);
  
  // Extract the blob CID
  let blobCid: string;
  
  // Special handling for BlobRef-like objects from the AT Protocol
  if (typeof blobRef === 'string') {
    // If passed directly as a string
    blobCid = blobRef.trim();
    console.log('Working with string blob CID:', blobCid);
  } else if (blobRef?.$link) {
    // Direct $link property
    blobCid = blobRef.$link.trim();
    console.log('Working with object with $link property:', blobCid);
  } else if (blobRef?.ref?.$link) {
    // Nested ref.$link (standard structure from API)
    blobCid = blobRef.ref.$link.trim();
    mimeType = blobRef.mimeType || mimeType;
    console.log('Working with standard blob ref structure:', blobCid);
  } else if (blobRef?.$type === 'blob' && blobRef.ref) {
    // Try to access the ref object using different approaches
    console.log('BlobRef found, typeof ref:', typeof blobRef.ref);
    console.log('BlobRef.ref:', JSON.stringify(blobRef.ref, null, 2));
    
    // Try different approaches to get the link
    if (typeof blobRef.ref === 'string') {
      blobCid = blobRef.ref.trim();
      console.log('Using ref as direct string:', blobCid);
    } else if (typeof blobRef.ref === 'object') {
      // Access link property using different notations to handle property name issues
      blobCid = blobRef.ref.$link || blobRef.ref['$link'] || blobRef.ref.link || '';
      console.log('Extracted link from ref object:', blobCid);
    } else {
      console.error('Could not extract link from BlobRef object');
      return {
        thumbnail: '/placeholder-image.svg',
        fullsize: '/placeholder-image.svg'
      };
    }
    
    mimeType = blobRef.mimeType || mimeType;
  } else {
    // Last resort - try to find any property that might contain a CID
    console.log('No standard structure found, searching for CID-like properties');
    let possibleCid = '';
    
    // Check if this is a plain CID string with a direct toString method
    if (blobRef && typeof blobRef.toString === 'function') {
      possibleCid = blobRef.toString();
      if (possibleCid.startsWith('bafy') || possibleCid.startsWith('bafk')) {
        console.log('Found CID-like string from toString():', possibleCid);
        blobCid = possibleCid;
      }
    }
    
    if (!possibleCid) {
      console.error('Invalid blob reference, cannot extract CID:', 
        typeof blobRef === 'object' ? JSON.stringify(blobRef, null, 2) : blobRef);
      return {
        thumbnail: '/placeholder-image.svg',
        fullsize: '/placeholder-image.svg'
      };
    }
    
    blobCid = possibleCid;
  }
  
  if (!blobCid) {
    console.error('Extracted empty blob CID');
    return {
      thumbnail: '/placeholder-image.svg',
      fullsize: '/placeholder-image.svg'
    };
  }
  
  // Normalize the DID
  const normalizedDid = did.trim();
  
  // Determine the file extension based on MIME type
  let extension = 'jpeg'; // Default to jpeg
  if (mimeType) {
    const parts = mimeType.split('/');
    if (parts.length > 1) {
      extension = parts[1];
      // Convert jpg to jpeg for consistency with Bluesky CDN
      if (extension === 'jpg') {
        extension = 'jpeg';
      }
    }
  }
  
  // Format the URLs
  const thumbnailUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${normalizedDid}/${blobCid}@${extension}`;
  const fullsizeUrl = `https://cdn.bsky.app/img/feed_fullsize/plain/${normalizedDid}/${blobCid}@${extension}`;
  
  console.log('Generated thumbnail URL:', thumbnailUrl);
  console.log('Generated fullsize URL:', fullsizeUrl);
  
  return {
    thumbnail: thumbnailUrl,
    fullsize: fullsizeUrl
  };
}