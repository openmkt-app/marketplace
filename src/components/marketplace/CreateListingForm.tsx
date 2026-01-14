// src/components/marketplace/CreateListingForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import MarketplaceClient from '@/lib/marketplace-client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LocationFilterValue } from './filters/LocationFilter';
import { formatZipPrefix } from '@/lib/location-utils';
import Image from 'next/image';
import { CATEGORIES, CONDITIONS, SubcategoryOption } from '@/lib/category-data';

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
  
  // Add state for category and subcategory
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  
  // Get saved locations for quick selection
  const [savedLocations, setSavedLocations] = useLocalStorage<SavedLocation[]>('saved-locations', []);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  
  // Add state for accordion
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);
  
  // Add state for geolocation
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoSuccess, setGeoSuccess] = useState<boolean | null>(null);
  
  // Add state for location saved notification
  const [locationSaved, setLocationSaved] = useState(false);
  
  // Add state for price input
  const [priceInput, setPriceInput] = useState('');
  
  // Add state for Free category confirmation dialog
  const [showFreeConfirmation, setShowFreeConfirmation] = useState(false);
  const [previousCategory, setPreviousCategory] = useState<string>('');
  
  // Set up an effect to auto-dismiss error messages after a timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 8000); // 8 seconds
      
      return () => clearTimeout(timer); // Clean up the timer
    }
  }, [error]);
  
  // Load the last used location when component mounts
  useEffect(() => {
    // Check for a saved location in localStorage
    const lastLocationJson = localStorage.getItem('last-used-location');
    if (lastLocationJson) {
      try {
        const lastLocation = JSON.parse(lastLocationJson);
        setSelectedLocation(lastLocation);
        // Keep accordion closed if we have a saved location
        setIsLocationExpanded(false);
        
        // We need to update the form fields after the component has mounted
        // and the form is available in the DOM
        setTimeout(() => {
          const form = document.getElementById('listing-form') as HTMLFormElement;
          if (form) {
            const stateInput = form.elements.namedItem('state') as HTMLInputElement;
            const countyInput = form.elements.namedItem('county') as HTMLInputElement;
            const localityInput = form.elements.namedItem('locality') as HTMLInputElement;
            const zipPrefixInput = form.elements.namedItem('zipPrefix') as HTMLInputElement;
            
            if (stateInput) stateInput.value = lastLocation.state || '';
            if (countyInput) countyInput.value = lastLocation.county || '';
            if (localityInput) localityInput.value = lastLocation.locality || '';
            if (zipPrefixInput) zipPrefixInput.value = lastLocation.zipPrefix || '';
          }
        }, 100); // Small delay to ensure form is rendered
      } catch (e) {
        console.error('Error parsing saved location:', e);
      }
    } else {
      // No saved location, expand the accordion by default
      setIsLocationExpanded(true);
    }
  }, []);
  
  // Update subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      const category = CATEGORIES.find(c => c.id === selectedCategory);
      setSubcategories(category ? category.subcategories : []);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory]);
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const newImages = Array.from(files);
    
    // Check if adding these images would exceed the 10 image limit
    if (images.length + newImages.length > 10) {
      setError("You can only upload a maximum of 10 images. Please remove some images first.");
      return;
    }
    
    // Clear any existing error message since we&apos;re under the limit now
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
    
    // Clear any "too many images" error message since we&apos;re reducing the count
    if (error && error.includes("maximum of 10 images")) {
      setError(null);
    }
  };
  
  // Save the current location for future use
  const saveCurrentLocation = (locationData: { state: string; county: string; locality: string; zipPrefix?: string }) => {
    // Create a location object for saving
    const locationToSave: SavedLocation = {
      name: `${locationData.locality}, ${locationData.state}`,
      ...locationData
    };
    
    // Save to localStorage
    localStorage.setItem('last-used-location', JSON.stringify(locationToSave));
    
    // Check if this location already exists in saved locations
    const locationExists = savedLocations.some(
      loc => loc.name === locationToSave.name
    );
    
    if (!locationExists) {
      // Add to saved locations
      setSavedLocations([...savedLocations, locationToSave]);
    }
    
    // Show saved notification
    setLocationSaved(true);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setLocationSaved(false);
    }, 3000);
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
    
    // Save this location as the most recently used location
    localStorage.setItem('last-used-location', JSON.stringify(location));
    
    // Close the accordion after selecting a location
    setIsLocationExpanded(false);
  };
  
  // Add accordion toggle function
  const toggleLocationAccordion = () => {
    setIsLocationExpanded(!isLocationExpanded);
  };
  
  // Get user's current location using browser geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    setIsGeolocating(true);
    setGeoSuccess(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Fetch location details from coordinates using a reverse geocoding service
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10`
          );
          
          if (!response.ok) {
            throw new Error("Failed to get location details");
          }
          
          const data = await response.json();
          
          // Extract location data from OpenStreetMap response
          // Format may vary, so we need to handle different response structures
          const state = data.address.state || data.address.region || '';
          const county = data.address.county || '';
          const locality = data.address.city || data.address.town || data.address.village || data.address.hamlet || '';
          const postalCode = data.address.postcode || '';
          const zipPrefix = postalCode.substring(0, 3);
          
          // Create location data object
          const locationData = {
            state,
            county,
            locality,
            zipPrefix
          };
          
          // Update form fields
          const form = document.getElementById('listing-form') as HTMLFormElement;
          if (form) {
            const stateInput = form.elements.namedItem('state') as HTMLInputElement;
            const countyInput = form.elements.namedItem('county') as HTMLInputElement;
            const localityInput = form.elements.namedItem('locality') as HTMLInputElement;
            const zipPrefixInput = form.elements.namedItem('zipPrefix') as HTMLInputElement;
            
            if (stateInput) stateInput.value = state;
            if (countyInput) countyInput.value = county;
            if (localityInput) localityInput.value = locality;
            if (zipPrefixInput) zipPrefixInput.value = zipPrefix;
          }
          
          // Save the location to localStorage for future use
          saveCurrentLocation(locationData);
          
          setGeoSuccess(true);
          
          // Save this as the currently selected location
          const newLocation = {
            name: `${locality}, ${state}`,
            ...locationData
          };
          
          setSelectedLocation(newLocation);
          
          // Close the accordion after location is detected
          setIsLocationExpanded(false);
          
        } catch (err) {
          console.error("Error getting location details:", err);
          setError("Could not determine your location details. Please enter them manually.");
          setGeoSuccess(false);
        } finally {
          setIsGeolocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsGeolocating(false);
        setGeoSuccess(false);
        
        // Provide user-friendly error messages
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Geolocation access was denied. Please enter your location manually or allow location access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information is unavailable. Please try again or enter your location manually.");
            break;
          case error.TIMEOUT:
            setError("Location request timed out. Please try again or enter your location manually.");
            break;
          default:
            setError("An unknown error occurred while getting your location. Please enter it manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };
  
  // Format price to always have two decimal places
  const formatPrice = (price: string): string => {
    // First, clean the input (remove any non-numeric characters except decimal point)
    const cleanedPrice = price.replace(/[^0-9.]/g, '');
    
    // Handle empty input
    if (!cleanedPrice) return '';
    
    // Check if it contains a decimal point
    if (cleanedPrice.includes('.')) {
      // Split into whole and decimal parts
      const [whole, decimal] = cleanedPrice.split('.');
      
      // Ensure decimal part has exactly 2 digits
      return `${whole || '0'}.${decimal.padEnd(2, '0').substring(0, 2)}`;
    } else {
      // No decimal point, add ".00"
      return `${cleanedPrice}.00`;
    }
  };
  
  // Handle price input changes with formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the input value without dollar sign
    const value = e.target.value.replace(/^\$/, '');
    
    // Remove any non-numeric characters except for decimal point
    // and only allow one decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

    // Split the value into whole and decimal parts
    const parts = sanitizedValue.split('.');
    let wholePart = parts[0];
    const decimalPart = parts[1];

    // Limit the whole part to 7 digits
    if (wholePart.length > 7) {
      wholePart = wholePart.substring(0, 7);
    }

    // Limit the decimal part to 2 digits if it exists
    let formattedValue = wholePart;
    if (decimalPart !== undefined) {
      formattedValue = `${wholePart}.${decimalPart.substring(0, 2)}`;
    }
    
    // Store the sanitized value
    setPriceInput(formattedValue);
    
    // If price is 0, automatically set category to "Free Stuff"
    const isZeroPrice = parseFloat(formattedValue) === 0 || formattedValue === '0' || formattedValue === '0.0' || formattedValue === '0.00';
    if (isZeroPrice && formattedValue !== '') {
      setSelectedCategory('free');
    } else if (!isZeroPrice && selectedCategory === 'free') {
      // If price is non-zero and category is "Free Stuff", reset category
      setSelectedCategory('');
    }
  };
  
  // Check if price is zero (for category locking)
  const isPriceZero = parseFloat(priceInput) === 0 || priceInput === '0' || priceInput === '0.0' || priceInput === '0.00';
  
  // Handle category selection changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    
    // If selecting Free category, show confirmation dialog
    if (categoryId === 'free' && selectedCategory !== 'free') {
      setPreviousCategory(selectedCategory);
      setShowFreeConfirmation(true);
    } else {
      // Set the category directly for other categories
      setSelectedCategory(categoryId);
      
      // If "Free Stuff" category is selected, automatically set price to 0
      if (categoryId === 'free') {
        setPriceInput('0.00');
      }
    }
  };
  
  // Handle Free category confirmation
  const handleFreeConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      setSelectedCategory('free');
      setPriceInput('0.00');
    } else {
      // Revert to the previous category or empty if there was none
      setSelectedCategory(previousCategory || '');
    }
    
    setShowFreeConfirmation(false);
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(event.currentTarget);
    
    try {
      // Get selected category
      const categoryId = formData.get('category') as string;
      
      // Get the subcategory value
      const subcategory = formData.get('subcategory') as string;
      const description = formData.get('description') as string;
      
      // Prepare listing data
      let subcategoryName = '';
      
      // Get subcategory name if selected
      if (subcategory) {
        const categorySelect = event.currentTarget.elements.namedItem('category') as HTMLSelectElement;
        const category = CATEGORIES.find(c => c.id === categorySelect.value);
        const subcategoryObj = category?.subcategories.find(s => s.id === subcategory);
        
        if (subcategoryObj) {
          subcategoryName = subcategoryObj.name;
        }
      }
      
      // Collect the location data from the form or use selected location
      let locationData;
      
      // If we have a selectedLocation and the accordion is closed (i.e., the user is using the saved location)
      if (selectedLocation && !isLocationExpanded) {
        locationData = {
          state: selectedLocation.state,
          county: selectedLocation.county,
          locality: selectedLocation.locality,
          zipPrefix: selectedLocation.zipPrefix
        };
      } else {
        // Get location from form inputs
        locationData = {
          state: formData.get('state') as string,
          county: formData.get('county') as string,
          locality: formData.get('locality') as string,
          zipPrefix: formData.get('zipPrefix') as string || undefined,
        };
      }
      
      // Validate location data
      if (!locationData.state || !locationData.county || !locationData.locality) {
        setError("Please provide complete location information (state, county, and city/town).");
        setIsSubmitting(false);
        return;
      }
      
      // Validate price input before formatting
      if (!priceInput.trim()) {
        setError("Please enter a price for your listing.");
        setIsSubmitting(false);
        return;
      }
      
      // Format the price to ensure consistent decimal places
      const formattedPrice = formatPrice(priceInput);
      const priceValue = parseFloat(formattedPrice);
      
      // Validate price and category combination
      if (priceValue === 0) {
        // If price is zero, category must be "Free Stuff"
        if (categoryId !== 'free') {
          setError("Items with price $0.00 must be listed in the 'Free Stuff' category. Please change either the price or the category.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // If price is not zero, category cannot be "Free Stuff"
        if (categoryId === 'free') {
          setError("Items in the 'Free Stuff' category must have a price of $0.00.");
          setIsSubmitting(false);
          return;
        }
      }
      
      // Update the price input to show the formatted price
      setPriceInput(formattedPrice);
      
      // Create custom metadata for inclusion in description
      const metadata = {
        subcategory: subcategoryName
      };
      
      // Prepare listing data with metadata embedded as JSON
      const listingData = {
        title: formData.get('title') as string,
        description: description,
        price: formattedPrice,
        location: locationData,
        category: categoryId,
        condition: formData.get('condition') as string,
        images: images as any, // Type conversion for the API
        hideFromFriends: hideFromFriends,
        metadata: metadata // Include metadata here - client will need to be updated to process this
      };
      
      console.log('Creating listing with location:', locationData);
      const result = await client.createListing(listingData);
      
      // Save the location for future use
      saveCurrentLocation(locationData);
      
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
  
  return (
    <div className="max-w-2xl mx-auto p-4">
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
      
      {/* Free Category Confirmation Dialog */}
      {showFreeConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold mb-2">Change to Free Stuff category?</h3>
            <p className="mb-4 text-text-secondary">
              Changing to the "Free Stuff" category will set your item's price to $0.00. Do you want to continue?
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={() => handleFreeConfirmation(false)}
                className="px-4 py-2 border border-neutral-light rounded-md hover:bg-neutral-light/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleFreeConfirmation(true)}
                className="px-4 py-2 bg-primary-color hover:bg-primary-light text-white rounded-md"
              >
                Confirm
              </button>
            </div>
          </div>
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
            Upload up to 10 crystal-clear photos so buyers can see what they&apos;re getting. The first image will be used as the cover photo.
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
                  value={priceInput}
                  onChange={handlePriceChange}
                  className="w-full pl-7 pr-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">
                Category <span className="text-red-500">*</span>
                {isPriceZero && priceInput !== '' && (
                  <span className="ml-2 text-xs text-primary-color">
                    ($0.00 = Free Stuff category only - Change price to unlock)
                  </span>
                )}
              </label>
              <select
                id="category"
                name="category"
                required
                className={`w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light ${isPriceZero && priceInput !== '' ? 'bg-neutral-light/50 cursor-not-allowed' : ''}`}
                value={selectedCategory}
                onChange={handleCategoryChange}
                disabled={isPriceZero && priceInput !== ''}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(category => (
                  <option 
                    key={category.id} 
                    value={category.id}
                  >
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
                {subcategories.map(subcategory => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
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
                placeholder="Describe your item in detail. Include features, specifications, and why you&apos;re selling. The more details you provide, the more likely buyers will be interested."
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
          </div>
        </div>
        
        {/* Location Section with Accordion UI */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-light overflow-hidden">
          <div
            onClick={toggleLocationAccordion}
            className="p-6 cursor-pointer flex justify-between items-center hover:bg-neutral-light/10 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-text-primary">Location</h2>
                {locationSaved && (
                  <span className="ml-3 animate-pulse text-sm text-green-600 bg-green-50 rounded-full px-3 py-0.5">
                    Location saved!
                  </span>
                )}
              </div>
              {selectedLocation && (
                <p className="text-sm text-text-secondary mt-1">
                  <span className="font-medium">{selectedLocation.name}</span>
                  {selectedLocation.zipPrefix && (
                    <span> ({formatZipPrefix(selectedLocation.zipPrefix)})</span>
                  )}
                </p>
              )}
            </div>
            <div className="text-text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 transition-transform ${isLocationExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {isLocationExpanded && (
            <div className="p-6 border-t border-neutral-light">
              {/* Geolocation Button - add more padding at the top */}
              <div className="mb-4 mt-3">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isGeolocating}
                  className="flex items-center px-4 py-2 bg-primary-color hover:bg-primary-light text-white rounded-md transition-colors"
                >
                  {isGeolocating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Detecting your location...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Use my current location
                    </>
                  )}
                </button>
                
                {geoSuccess === true && (
                  <p className="text-sm text-green-600 mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Location detected successfully!
                  </p>
                )}
              </div>
              
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
          )}
        </div>
        
        {/* Privacy Options */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Visibility Options</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-text-secondary">Hide from friends</span>
              <p className="text-sm text-text-secondary">When enabled, this listing won&apos;t appear in feeds of people who follow you on the AT Protocol network (Bluesky, this marketplace, etc.). This helps keep certain listings private from people you know.</p>
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
            Your listing will be visible to the entire AT Protocol community. Please note that we don&apos;t allow listings for live animals, controlled substances, weapons, counterfeit items, or anything that violates intellectual property rights. Keep it legal and community-friendly!
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