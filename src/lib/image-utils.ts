// src/lib/image-utils.ts
/**
 * Utilities for handling image uploads and validation
 */

export interface ImageValidationOptions {
  maxSize?: number; // Maximum size in bytes
  maxWidth?: number; // Maximum width in pixels
  maxHeight?: number; // Maximum height in pixels
  acceptedTypes?: string[]; // Array of accepted MIME types
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
  dataUrl?: string; // Base64 data URL for previews
}

/**
 * Validate an image file according to the specified options
 */
export async function validateImage(
  file: File,
  options: ImageValidationOptions = {}
): Promise<ImageValidationResult> {
  // Default options
  const {
    maxSize = 1000000, // 1MB
    maxWidth = 2000,
    maxHeight = 2000,
    acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  } = options;

  // Check file type
  if (!acceptedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted types are: ${acceptedTypes.join(', ')}`
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.round(maxSize / 1024)}KB`
    };
  }

  try {
    // Create a data URL for preview
    const dataUrl = await readFileAsDataURL(file);
    
    // Check image dimensions
    const dimensions = await getImageDimensions(dataUrl);
    
    if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
      return {
        valid: false,
        error: `Image dimensions too large. Maximum dimensions are ${maxWidth}x${maxHeight} pixels`
      };
    }

    return {
      valid: true,
      file,
      dataUrl
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to process image: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Read a file as a data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    
    reader.onerror = () => {
      reject(reader.error || new Error('Unknown error'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Get the dimensions of an image from a data URL
 */
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Compress an image to fit within size limits
 * This is a basic implementation, more advanced compression could be added
 */
export async function compressImage(
  file: File, 
  maxSizeInBytes: number = 980000
): Promise<File> {
  // If the file is already small enough, return it as-is
  if (file.size <= maxSizeInBytes) {
    return file;
  }
  
  // Read as data URL
  const dataUrl = await readFileAsDataURL(file);
  
  // Get original dimensions
  const { width, height } = await getImageDimensions(dataUrl);
  
  // Create a canvas to resize and compress the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Start with original dimensions
  let targetWidth = width;
  let targetHeight = height;
  
  // Calculate a scale factor based on the file size
  // This is a simple approach - more sophisticated approaches could be used
  const scaleFactor = Math.sqrt(maxSizeInBytes / file.size) * 0.9; // 10% safety margin
  
  // Scale down dimensions
  targetWidth = Math.floor(targetWidth * scaleFactor);
  targetHeight = Math.floor(targetHeight * scaleFactor);
  
  // Set canvas dimensions
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  // Create an image element
  const img = new Image();
  
  // Wait for the image to load
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
  
  // Draw the image to the canvas with the new dimensions
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  // Convert canvas to blob with reduced quality
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      file.type, // Maintain original type
      0.85 // Quality factor (0.7-0.9 is usually a good balance)
    );
  });
  
  // Create a new File object
  return new File(
    [blob],
    file.name,
    {
      type: file.type,
      lastModified: file.lastModified
    }
  );
}
