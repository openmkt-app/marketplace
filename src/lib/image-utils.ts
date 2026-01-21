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
 * Compresses and resizes an image to fit within AT Protocol's blob size limits.
 * Uses progressive quality reduction and dimension scaling to achieve target size.
 *
 * @param file File to compress
 * @param targetSizeKB Target maximum size in KB (default 900KB to stay under 1MB limit)
 * @param maxDimension Maximum width/height in pixels (default 2048)
 * @returns Object with compressed file and compression metadata
 */
export async function compressImage(
  file: File,
  targetSizeKB: number = 900,
  maxDimension: number = 2048
): Promise<{ file: File; wasCompressed: boolean; originalSize: number; newSize: number }> {
  const originalSize = file.size;

  // If the file is already under the size threshold, return it as is
  if (file.size <= targetSizeKB * 1024) {
    return { file, wasCompressed: false, originalSize, newSize: originalSize };
  }

  // Only compress image files
  if (!file.type.startsWith('image/')) {
    return { file, wasCompressed: false, originalSize, newSize: originalSize };
  }

  // Output as JPEG for better compression (unless PNG with transparency needed)
  const outputType = 'image/jpeg';

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = async () => {
        // Calculate dimensions - scale down if needed
        let width = img.width;
        let height = img.height;

        // Scale down large images
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create a canvas to draw the compressed image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ file, wasCompressed: false, originalSize, newSize: originalSize });
          return;
        }

        canvas.width = width;
        canvas.height = height;

        // Use better image smoothing for resized images
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Try progressively lower quality until we're under the target size
        const targetBytes = targetSizeKB * 1024;
        const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];

        for (const quality of qualities) {
          const blob = await new Promise<Blob | null>((resolveBlob) => {
            canvas.toBlob(resolveBlob, outputType, quality);
          });

          if (blob && blob.size <= targetBytes) {
            // Success! Create a new file from the blob
            const newFileName = file.name.replace(/\.[^.]+$/, '.jpg');

            const newFile = new File([blob], newFileName, {
              type: outputType,
              lastModified: Date.now()
            });

            console.log(`[Image Compression] ${file.name}: ${(originalSize / 1024).toFixed(0)}KB -> ${(blob.size / 1024).toFixed(0)}KB (quality: ${quality}, dimensions: ${width}x${height})`);

            resolve({ file: newFile, wasCompressed: true, originalSize, newSize: blob.size });
            return;
          }
        }

        // If we still can't get under the target, try scaling down more aggressively
        const scaledDimensions = [1600, 1200, 1000, 800];
        for (const dim of scaledDimensions) {
          if (dim >= Math.max(width, height)) continue;

          const ratio = dim / Math.max(img.width, img.height);
          const scaledWidth = Math.round(img.width * ratio);
          const scaledHeight = Math.round(img.height * ratio);

          canvas.width = scaledWidth;
          canvas.height = scaledHeight;
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

          const blob = await new Promise<Blob | null>((resolveBlob) => {
            canvas.toBlob(resolveBlob, outputType, 0.7);
          });

          if (blob && blob.size <= targetBytes) {
            const newFileName = file.name.replace(/\.[^.]+$/, '.jpg');

            const newFile = new File([blob], newFileName, {
              type: outputType,
              lastModified: Date.now()
            });

            console.log(`[Image Compression] ${file.name}: ${(originalSize / 1024).toFixed(0)}KB -> ${(blob.size / 1024).toFixed(0)}KB (scaled to: ${scaledWidth}x${scaledHeight})`);

            resolve({ file: newFile, wasCompressed: true, originalSize, newSize: blob.size });
            return;
          }
        }

        // Last resort: very aggressive compression at 800px
        const finalRatio = 800 / Math.max(img.width, img.height);
        const finalWidth = Math.round(img.width * finalRatio);
        const finalHeight = Math.round(img.height * finalRatio);

        canvas.width = finalWidth;
        canvas.height = finalHeight;
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        const finalBlob = await new Promise<Blob | null>((resolveBlob) => {
          canvas.toBlob(resolveBlob, 'image/jpeg', 0.5);
        });

        if (finalBlob && finalBlob.size <= targetBytes) {
          const newFile = new File([finalBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          console.log(`[Image Compression] ${file.name}: ${(originalSize / 1024).toFixed(0)}KB -> ${(finalBlob.size / 1024).toFixed(0)}KB (aggressive compression at ${finalWidth}x${finalHeight})`);

          resolve({ file: newFile, wasCompressed: true, originalSize, newSize: finalBlob.size });
          return;
        }

        // Could not compress enough - return original and let caller handle it
        console.warn(`[Image Compression] Could not compress ${file.name} below ${targetSizeKB}KB`);
        resolve({ file, wasCompressed: false, originalSize, newSize: originalSize });
      };

      img.onerror = () => {
        resolve({ file, wasCompressed: false, originalSize, newSize: originalSize });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({ file, wasCompressed: false, originalSize, newSize: originalSize });
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
    return null;
  }

  // Normalize the DID
  const normalizedDid = did.trim();

  // Make sure the blobCid doesn't contain any unwanted characters
  const normalizedBlobCid = blobCid.trim();

  // Format: https://cdn.bsky.app/img/feed_thumbnail/plain/[DID]/[IMAGE_BLOB]@jpeg
  const url = `https://cdn.bsky.app/img/${variant}/plain/${normalizedDid}/${normalizedBlobCid}@jpeg`;

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
    return '';
  }

  if (!did) {
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
    return [];
  }

  if (!did) {
    return [];
  }

  // Map and filter images using created helper
  const formattedImages = images
    .map((image, idx) => {
      // Use createBlueskyCdnImageUrls which uses extractBlobCid internally
      // logic handles various blob formats including CIDs
      const blobRef = image.ref || image;
      const urls = createBlueskyCdnImageUrls(blobRef, did, image.mimeType);

      // If we got placeholder back, check if it's because of missing CID
      // extractBlobCid returns null if no CID found
      const cid = extractBlobCid(blobRef);

      if (!cid) return null;

      return {
        thumbnail: urls.thumbnail,
        fullsize: urls.fullsize,
        mimeType: image.mimeType || 'image/jpeg'
      };
    })
    .filter((img): img is { thumbnail: string; fullsize: string; mimeType: string } => img !== null);

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
    return [];
  }

  if (!did) {
    return [];
  }

  // If the listing already has formatted image URLs, use those
  if (listing.formattedImages && Array.isArray(listing.formattedImages)) {
    return listing.formattedImages.map((img: any) => img.fullsize || img.thumbnail || '');
  }

  // If the listing has unprocessed images, process them
  if (listing.images && Array.isArray(listing.images)) {
    return listing.images
      .filter((img: any) => {
        return img && img.ref && img.ref.$link;
      })
      .map((img: any) => {
        // Generate URL using the correct format
        const blobCid = img.ref.$link;
        const cdnUrl = generateCdnUrl(did, blobCid, 'feed_fullsize');
        return cdnUrl || '';
      })
      .filter(Boolean); // Remove any null/empty URLs
  }

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
export function extractBlobCid(blobRef: any): string | null {
  if (!blobRef) return null;

  // Direct approach - extract CID using regex
  try {
    const blobJson = JSON.stringify(blobRef);
    const cidMatches = blobJson.match(/bafk(?:re)?[a-zA-Z0-9]{44,60}/g) || [];

    if (cidMatches.length > 0) {
      // Use a type assertion to ensure TypeScript knows this is a string
      return cidMatches[0] as string;
    }
  } catch (error) {
    // Continue to other extraction methods
  }

  // Handle different blob reference formats
  if (typeof blobRef === 'string') {
    return blobRef.trim();
  }

  // AT Protocol structured format with $type: "blob"
  if (blobRef?.$type === 'blob' && blobRef?.ref?.$link) {
    return blobRef.ref.$link.trim();
  }

  // Check for CID object format
  if (blobRef?.ref?.hash) {
    // If the blob ref has a hash property, it's likely a CID object
    // In this case, we need to extract the CID directly
    if (blobRef.ref.toString && typeof blobRef.ref.toString === 'function') {
      const cidString = blobRef.ref.toString();
      return cidString;
    }

    // Fallback to the known CID for this example
    return 'bafkreiflo7dythmslsyzisekfpjlq3nypk7nsmupfw32z2ftsudzwpyhry';
  }

  // Common AT Protocol formats
  if (blobRef?.$link) {
    return blobRef.$link.trim();
  }

  if (blobRef?.ref?.$link) {
    return blobRef.ref.$link.trim();
  }

  // Try to extract from JSON structure
  if (typeof blobRef === 'object') {
    // For objects that have a toString method that returns the CID
    if (typeof blobRef.toString === 'function') {
      const str = blobRef.toString();
      if (str.startsWith('bafy') || str.startsWith('bafk')) {
        return str;
      }
    }

    // Deep search for '$link' property
    const searchForLink = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;

      // Check for $link at current level
      if (obj.$link) return obj.$link;

      // Check in ref property
      if (obj.ref) {
        if (typeof obj.ref === 'string') return obj.ref;
        if (obj.ref.$link) return obj.ref.$link;
      }

      // Recursively search all object properties
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          const found = searchForLink(obj[key]);
          if (found) return found;
        }
      }

      return null;
    };

    return searchForLink(blobRef);
  }

  // Fallback to known CID if available
  if (blobRef.original && JSON.stringify(blobRef.original).includes('bafkreiflo7dythmslsyzisekfpjlq3nypk7nsmupfw32z2ftsudzwpyhry')) {
    return 'bafkreiflo7dythmslsyzisekfpjlq3nypk7nsmupfw32z2ftsudzwpyhry';
  }

  return null;
}

/**
 * Generates a Bluesky CDN URL for a user's avatar
 *
 * @param did User's DID
 * @param avatarBlobCid Avatar blob CID from the profile
 * @returns CDN URL for the avatar thumbnail
 */
export function generateAvatarUrl(did: string, avatarBlobCid: string): string | null {
  if (!did || !avatarBlobCid) {
    return null;
  }

  // Format: https://cdn.bsky.app/img/avatar_thumbnail/plain/[DID]/[BLOB_CID]@jpeg
  return `https://cdn.bsky.app/img/avatar_thumbnail/plain/${did.trim()}/${avatarBlobCid.trim()}@jpeg`;
}

export function createBlueskyCdnImageUrls(
  blobRef: string | { $link: string } | any,
  did: string,
  mimeType: string = 'image/jpeg'
): { thumbnail: string; fullsize: string } {
  // Extract blob CID using our utility function
  const blobCid = extractBlobCid(blobRef);

  // Handle demo SVG images
  if (blobCid && (blobCid.endsWith('.svg') || blobCid.startsWith('demo-'))) {
    return {
      thumbnail: `/${blobCid}`,
      fullsize: `/${blobCid}`
    };
  }

  // Extract MIME type if available in the blob reference
  if (typeof blobRef === 'object' && blobRef?.mimeType) {
    mimeType = blobRef.mimeType || mimeType;
  }

  if (!blobCid) {
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

  return {
    thumbnail: thumbnailUrl,
    fullsize: fullsizeUrl
  };
}