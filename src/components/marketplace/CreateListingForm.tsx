// src/components/marketplace/CreateListingForm.tsx
'use client';

import React, { useState } from 'react';
import MarketplaceClient from '@/lib/marketplace-client';

interface CreateListingFormProps {
  client: MarketplaceClient;
  onSuccess?: () => void;
}

export default function CreateListingForm({ client, onSuccess }: CreateListingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    const formData = new FormData(event.currentTarget);
    
    try {
      // For demo purposes, we'll simulate a successful creation
      // In a real app, this would call the actual client
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Uncomment this in a real app
      // await client.createListing({
      //   title: formData.get('title') as string,
      //   description: formData.get('description') as string,
      //   price: formData.get('price') as string,
      //   location: {
      //     state: formData.get('state') as string,
      //     county: formData.get('county') as string,
      //     locality: formData.get('locality') as string,
      //     zipPrefix: formData.get('zipPrefix') as string || undefined,
      //   },
      //   category: formData.get('category') as string,
      //   condition: formData.get('condition') as string,
      // });
      
      setSuccess(true);
      
      // Reset form
      event.currentTarget.reset();
      
      // Call onSuccess callback after a delay
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
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
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          Listing created successfully! Redirecting to browse page...
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
