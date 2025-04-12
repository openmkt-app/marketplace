// src/components/marketplace/CreateListingForm.tsx
import React, { useState } from 'react';
import MarketplaceClient from '@/lib/marketplace-client';

interface CreateListingFormProps {
  client: MarketplaceClient;
  onSuccess?: () => void;
}

export default function CreateListingForm({ client, onSuccess }: CreateListingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(event.currentTarget);
    
    try {
      await client.createListing({
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
      });
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(`Failed to create listing: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create New Listing</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1">
            Price
          </label>
          <input
            type="text"
            id="price"
            name="price"
            required
            className="w-full px-3 py-2 border rounded-md"
            placeholder="$0.00"
          />
        </div>
        
        <fieldset className="border rounded-md p-4">
          <legend className="font-medium px-2">Location</legend>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="county" className="block text-sm font-medium mb-1">
                County
              </label>
              <input
                type="text"
                id="county"
                name="county"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="locality" className="block text-sm font-medium mb-1">
                City/Town/Village
              </label>
              <input
                type="text"
                id="locality"
                name="locality"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="zipPrefix" className="block text-sm font-medium mb-1">
                ZIP Code (first 3 digits, optional)
              </label>
              <input
                type="text"
                id="zipPrefix"
                name="zipPrefix"
                maxLength={3}
                pattern="[0-9]{3}"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </fieldset>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            className="w-full px-3 py-2 border rounded-md"
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
          <label htmlFor="condition" className="block text-sm font-medium mb-1">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            required
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select condition</option>
            <option value="new">New</option>
            <option value="likeNew">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
        >
          {isSubmitting ? 'Creating...' : 'Create Listing'}
        </button>
      </form>
    </div>
  );
}