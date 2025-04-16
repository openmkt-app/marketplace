// src/components/marketplace/CreateListingForm.tsx
import React, { useState, useRef } from 'react';
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
  onSuccess?: () => void;
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
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const newImages = Array.from(files);
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
      
      await client.createListing({
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
      });
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(`Failed to create listing: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Load saved location data into form
  const handleSelectLocation = (location: SavedLocation) => {
    setSelectedLocation(location);
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">Create New Listing</h1>
      <p className="text-gray-600 mb-6">List your item for sale in the marketplace</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form id="listing-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Photos Section */}
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Photos</h2>
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
                  className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:text-gray-500 hover:border-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500">
            Add up to 10 photos. The first image will be the cover photo.
          </p>
        </div>
        
        {/* Item Details */}
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Item Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1 text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                placeholder="What are you selling?"
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1 text-gray-700">
                Price
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="text"
                  id="price"
                  name="price"
                  required
                  placeholder="0.00"
                  className="w-full pl-7 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1 text-gray-700">
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="subcategory" className="block text-sm font-medium mb-1 text-gray-700">
                Subcategory
              </label>
              <select
                id="subcategory"
                name="subcategory"
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="condition" className="block text-sm font-medium mb-1 text-gray-700">
                Condition
              </label>
              <select
                id="condition"
                name="condition"
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="description" className="block text-sm font-medium mb-1 text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                placeholder="Describe your item in detail. Include condition, features, and why you're selling."
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        {/* Location Section */}
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Location</h2>
          
          {/* Saved Locations */}
          {savedLocations.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
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
              <label htmlFor="state" className="block text-sm font-medium mb-1 text-gray-700">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                required
                value={selectedLocation?.state || ''}
                onChange={() => setSelectedLocation(null)}
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="county" className="block text-sm font-medium mb-1 text-gray-700">
                County
              </label>
              <input
                type="text"
                id="county"
                name="county"
                required
                value={selectedLocation?.county || ''}
                onChange={() => setSelectedLocation(null)}
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="locality" className="block text-sm font-medium mb-1 text-gray-700">
                City/Town/Village
              </label>
              <input
                type="text"
                id="locality"
                name="locality"
                required
                value={selectedLocation?.locality || ''}
                onChange={() => setSelectedLocation(null)}
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="zipPrefix" className="block text-sm font-medium mb-1 text-gray-700">
                ZIP Code (first 3 digits, optional)
              </label>
              <input
                type="text"
                id="zipPrefix"
                name="zipPrefix"
                maxLength={3}
                pattern="[0-9]{3}"
                value={selectedLocation?.zipPrefix || ''}
                onChange={() => setSelectedLocation(null)}
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {selectedLocation?.zipPrefix && (
                <p className="text-xs text-gray-500 mt-1">
                  Full ZIP code area: {formatZipPrefix(selectedLocation.zipPrefix)}
                </p>
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            Location information helps buyers find items near them. More specific location details 
            will make your listing appear in more relevant searches.
          </p>
        </div>
        
        {/* Privacy Options */}
        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Visibility Options</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-700">Hide from friends</span>
              <p className="text-sm text-gray-500">This listing is still public. If you hide this listing from friends, they won't see it in most cases.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={hideFromFriends}
                onChange={() => setHideFromFriends(!hideFromFriends)}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-4">
            Marketplace items are public and can be seen by anyone on or off the platform. Items like animals, drugs, weapons, counterfeits, and other items that infringe intellectual property aren't allowed on this Marketplace.
          </p>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70"
          >
            {isSubmitting ? 'Creating listing...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}