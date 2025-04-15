// src/components/marketplace/CreateListingForm.tsx
'use client';

import React, { useState, useRef } from 'react';
import MarketplaceClient from '@/lib/marketplace-client';
import { validateImage, compressImage } from '@/lib/image-utils';

interface CreateListingFormProps {
  client: MarketplaceClient;
  onSuccess?: () => void;
}

export default function CreateListingForm({ client, onSuccess }: CreateListingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setImageErrors([]);
    
    // Limit to 4 images maximum
    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];
    const newErrors: string[] = [];
    
    // Add new files (up to 4 total)
    const remainingSlots = 4 - selectedImages.length;
    const filesToAdd = Math.min(remainingSlots, files.length);
    
    for (let i = 0; i < filesToAdd; i++) {
      const file = files[i];
      
      try {
        // Validate the image
        const validationResult = await validateImage(file, {
          maxSize: 980000, // Slightly under 1MB to be safe
          acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });
        
        if (validationResult.valid && validationResult.file && validationResult.dataUrl) {
          // Try to compress the image if needed
          const processedFile = await compressImage(validationResult.file);
          newFiles.push(processedFile);
          newPreviewUrls.push(validationResult.dataUrl); // Use the data URL from validation
        } else if (validationResult.error) {
          newErrors.push(`${file.name}: ${validationResult.error}`);
        }
      } catch (error) {
        newErrors.push(`Failed to process ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (newErrors.length > 0) {
      setImageErrors(newErrors);
    }
    
    if (newFiles.length > 0) {
      setSelectedImages([...selectedImages, ...newFiles]);
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }
  };
  
  const removeImage = (index: number) => {
    // Remove the image at the specified index
    const newImages = [...selectedImages];
    const newPreviews = [...previewUrls];
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index]);
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setSelectedImages(newImages);
    setPreviewUrls(newPreviews);
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Simple form access - don't try to be fancy
    const form = event.currentTarget;
    const formData = new FormData(form);
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Use the real client to create the listing
      const result = await client.createListing({
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        price: formData.get('price') as string,
        location: {
          state: formData.get('state') as string,
          county: formData.get('county') as string,
          locality: formData.get('locality') as string,
          zipPrefix: formData.get('zipPrefix') as string || undefined,
        },
        category: formData.get('category') as string,
        condition: formData.get('condition') as string,
        images: selectedImages.length > 0 
          ? selectedImages.map(file => ({
              ref: file.name,
              mimeType: file.type,
            }))
          : undefined,
      });
      
      console.log('Listing created:', result);
      
      // Show the success message
      setSuccess(true);
      
      // Clean up image preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setSelectedImages([]);

      // Use setTimeout to allow the success message to be seen
      if (onSuccess) {
        setTimeout(() => {
          window.location.href = '/browse';
        }, 1500);
      }
    } catch (err) {
      console.error('Error creating listing:', err);
      setError(`Failed to create listing: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {imageErrors.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <p className="font-medium mb-1">Issues with selected images:</p>
          <ul className="list-disc pl-5 text-sm">
            {imageErrors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          Listing created successfully! Redirecting to browse page...
        </div>
      )}
      
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Images (optional, max 4)
          </label>
          
          {/* Image previews */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-24 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add image button */}
          {selectedImages.length < 4 && (
            <div>
              <input
                type="file"
                id="images"
                name="images"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
                ref={fileInputRef}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add {selectedImages.length > 0 ? 'More ' : ''}Images
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Supported formats: JPG, PNG, GIF (max 1MB each)
              </p>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g. Vintage Mid-Century Desk"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Provide details about your item's condition, features, dimensions, etc."
          />
        </div>
        
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Price
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="text"
              id="price"
              name="price"
              required
              className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <fieldset className="border border-gray-200 rounded-md p-4">
          <legend className="font-medium px-2 text-gray-700">Location</legend>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. California"
              />
            </div>
            
            <div>
              <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-1">
                County
              </label>
              <input
                type="text"
                id="county"
                name="county"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. Los Angeles"
              />
            </div>
            
            <div>
              <label htmlFor="locality" className="block text-sm font-medium text-gray-700 mb-1">
                City/Town/Village
              </label>
              <input
                type="text"
                id="locality"
                name="locality"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. Pasadena"
              />
            </div>
            
            <div>
              <label htmlFor="zipPrefix" className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code (first 3 digits, optional)
              </label>
              <input
                type="text"
                id="zipPrefix"
                name="zipPrefix"
                maxLength={3}
                pattern="[0-9]{3}"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. 900"
              />
              <p className="mt-1 text-xs text-gray-500">
                For privacy, only the first 3 digits will be shared
              </p>
            </div>
          </div>
        </fieldset>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a category</option>
            <option value="furniture">Furniture</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="vehicles">Vehicles</option>
            <option value="toys">Toys & Games</option>
            <option value="sports">Sports Equipment</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select condition</option>
            <option value="new">New</option>
            <option value="likeNew">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {isSubmitting ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
