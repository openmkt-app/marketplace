// src/components/marketplace/CreateListingForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import MarketplaceClient from '@/lib/marketplace-client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LocationFilterValue } from './filters/LocationFilter';
import { formatZipPrefix } from '@/lib/location-utils';
import Image from 'next/image';
import { CATEGORIES, CONDITIONS } from '@/lib/category-data';

// Define the SavedLocation type
interface SavedLocation {
  name: string;
  state: string;
  county: string;
  locality: string;
  zipPrefix?: string;
}

interface CreateListingFormProps {
  client: MarketplaceClient;
  onSuccess?: (listingUri?: string) => void;
}

export default function CreateListingForm({ client, onSuccess }: CreateListingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hideFromFriends, setHideFromFriends] = useState(false);
  
  // Get saved locations for quick selection
  const [savedLocations] = useLocalStorage<SavedLocation[]>('saved-locations', []);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  
  // Set up an effect to auto-dismiss error messages after a timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 8000); // 8 seconds
      
      return () => clearTimeout(timer); // Clean up the timer
    }
  }, [error]);
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const newImages = Array.from(files);
    
    // Check if adding these images would exceed the 10 image limit
    if (images.length + newImages.length > 10) {
      setError("You can only upload a maximum of 10 images. Please remove some images first.");
      return;
    }
    
    // Clear any existing error message since we're under the limit now
    if (error && error.includes("maximum of 10 images")) {
      setError(null);
    }
    
    setImages(prev => [...prev, ...newImages]);
    
    // Create preview URLs
    const newPreviewUrls = newImages.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };
  
  const removeImage = (index: number) => {
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    
    // Remove the image and preview
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    // Clear any "too many images" error message since we're reducing the count
    if (error && error.includes("maximum of 10 images")) {
      setError(null);
    }
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(event.currentTarget);
    
    try {
      // Get the subcategory value - not used in the API directly but kept for UI
      const subcategory = formData.get('subcategory') as string;
      let description = formData.get('description') as string;
      
      // If subcategory is selected, append it to the description
      if (subcategory) {
        const categorySelect = event.currentTarget.elements.namedItem('category') as HTMLSelectElement;
        const category = CATEGORIES.find(c => c.id === categorySelect.value);
        const subcategoryObj = category?.subcategories.find(s => s.id === subcategory);
        
        if (subcategoryObj) {
          description += `\n\nSubcategory: ${subcategoryObj.name}`;
        }
      }
      
      const result = await client.createListing({
        title: formData.get('title') as string,
        description: description,
        price: formData.get('price') as string,
        location: {
          state: formData.get('state') as string,
          county: formData.get('county') as string,
          locality: formData.get('locality') as string,
          zipPrefix: formData.get('zipPrefix') as string || undefined,
        },
        category: formData.get('category') as string,
        condition: formData.get('condition') as string,
        images: images as any, // Type conversion for the API
        hideFromFriends: hideFromFriends
      });
      
      // Extract the URI from the result for redirection
      const listingUri = result?.uri ? String(result.uri) : undefined;
      
      // Pass the listing URI to the onSuccess callback
      if (onSuccess) onSuccess(listingUri);
    } catch (err) {
      setError(`Failed to create listing: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Load saved location data into form
  const handleSelectLocation = (location: SavedLocation) => {
    setSelectedLocation(location);
    
    // Update form fields directly
    const form = document.getElementById('listing-form') as HTMLFormElement;
    if (form) {
      const stateInput = form.elements.namedItem('state') as HTMLInputElement;
      const countyInput = form.elements.namedItem('county') as HTMLInputElement;
      const localityInput = form.elements.namedItem('locality') as HTMLInputElement;
      const zipPrefixInput = form.elements.namedItem('zipPrefix') as HTMLInputElement;
      
      if (stateInput) stateInput.value = location.state || '';
      if (countyInput) countyInput.value = location.county || '';
      if (localityInput) localityInput.value = location.locality || '';
      if (zipPrefixInput) zipPrefixInput.value = location.zipPrefix || '';
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">Create New Listing</h1>
      <p className="text-gray-600 mb-6">List your item for sale in the marketplace</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      
      <form id="listing-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Photos Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Images</h2>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative w-24 h-24 rounded overflow-hidden border">
                <Image 
                  src={url}
                  alt={`Preview ${index + 1}`}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
                <button 
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md opacity-70 hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            <div className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-neutral-light rounded">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-text-secondary hover:text-primary-color"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-xs text-text-secondary">
            Upload up to 10 crystal-clear photos so buyers can see what they're getting. The first image will be used as the cover photo.
          </p>
        </div>
        
        {/* Item Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Item Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                placeholder="What are you selling?"
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-text-secondary mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-text-secondary sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="price"
                  name="price"
                  required
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                onChange={(e) => {
                  // Reset subcategory when category changes
                  const form = e.target.form;
                  if (form) {
                    const subcategorySelect = form.elements.namedItem('subcategory') as HTMLSelectElement;
                    if (subcategorySelect) {
                      subcategorySelect.value = '';
                    }
                  }
                }}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="subcategory" className="block text-sm font-medium text-text-secondary mb-1">
                Subcategory
              </label>
              <select
                id="subcategory"
                name="subcategory"
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              >
                <option value="">Select subcategory (optional)</option>
                {(() => {
                  const form = document.getElementById('listing-form') as HTMLFormElement;
                  if (!form) return null;
                  
                  const categorySelect = form.elements.namedItem('category') as HTMLSelectElement;
                  if (!categorySelect) return null;
                  
                  const categoryId = categorySelect.value;
                  if (!categoryId) return null;
                  
                  const category = CATEGORIES.find(c => c.id === categoryId);
                  if (!category) return null;
                  
                  return category.subcategories.map(subcategory => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ));
                })()}
              </select>
            </div>
            
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-text-secondary mb-1">
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                id="condition"
                name="condition"
                required
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              >
                <option value="">Select condition</option>
                {CONDITIONS.map(condition => (
                  <option key={condition.id} value={condition.id}>
                    {condition.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                placeholder="Describe your item in detail. Include condition, features, and why you're selling."
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
          </div>
        </div>
        
        {/* Location Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Location</h2>
          
          {/* Saved Locations */}
          {savedLocations.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Your Saved Locations
              </label>
              <div className="flex flex-wrap gap-2">
                {savedLocations.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedLocation?.name === location.name
                        ? 'bg-primary-color text-white'
                        : 'bg-neutral-light hover:bg-neutral-light text-text-secondary'
                    }`}
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-text-secondary mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                required
                defaultValue={selectedLocation?.state || ''}
                placeholder="e.g. California"
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
            
            <div>
              <label htmlFor="county" className="block text-sm font-medium text-text-secondary mb-1">
                County
              </label>
              <input
                type="text"
                id="county"
                name="county"
                required
                defaultValue={selectedLocation?.county || ''}
                placeholder="e.g. Los Angeles County"
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
            
            <div>
              <label htmlFor="locality" className="block text-sm font-medium text-text-secondary mb-1">
                City/Town/Village
              </label>
              <input
                type="text"
                id="locality"
                name="locality"
                required
                defaultValue={selectedLocation?.locality || ''}
                placeholder="e.g. Los Angeles"
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
            
            <div>
              <label htmlFor="zipPrefix" className="block text-sm font-medium text-text-secondary mb-1">
                ZIP Code (first 3 digits, optional)
              </label>
              <input
                type="text"
                id="zipPrefix"
                name="zipPrefix"
                maxLength={3}
                pattern="[0-9]{3}"
                defaultValue={selectedLocation?.zipPrefix || ''}
                placeholder="e.g. 900"
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              {selectedLocation?.zipPrefix && (
                <p className="text-xs text-text-secondary mt-1">
                  Full ZIP code area: {formatZipPrefix(selectedLocation.zipPrefix)}
                </p>
              )}
            </div>
          </div>
          
          <p className="text-xs text-text-secondary mt-3">
            Location information helps buyers find items near them. More specific location details 
            will make your listing appear in more relevant searches.
          </p>
        </div>
        
        {/* Privacy Options */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Visibility Options</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-text-secondary">Hide from friends</span>
              <p className="text-sm text-text-secondary">When enabled, this listing won't appear in feeds of people who follow you on the AT Protocol network (Bluesky, this marketplace, etc.). This helps keep certain listings private from people you know.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={hideFromFriends}
                onChange={() => setHideFromFriends(!hideFromFriends)}
              />
              <div className="relative w-11 h-6 bg-neutral-light peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-color"></div>
            </label>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-text-secondary mb-4">
            Your listing will be visible to the entire AT Protocol community. Please note that we don't allow listings for live animals, controlled substances, weapons, counterfeit items, or anything that violates intellectual property rights. Keep it legal and community-friendly!
          </p>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-primary-color hover:bg-primary-light text-white font-medium rounded-md focus:outline-none focus:ring-4 focus:ring-primary-light disabled:opacity-70"
          >
            {isSubmitting ? 'Creating listing...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}