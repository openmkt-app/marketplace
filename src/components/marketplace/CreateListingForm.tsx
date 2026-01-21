// src/components/marketplace/CreateListingForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import MarketplaceClient, { ListingImage, MarketplaceListing } from '@/lib/marketplace-client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LocationFilterValue } from './filters/LocationFilter';
import { formatZipPrefix } from '@/lib/location-utils';
import Image from 'next/image';
import { CATEGORIES, CONDITIONS, SubcategoryOption } from '@/lib/category-data';
import { isFollowingBot, followBot } from '@/lib/bot-utils';
import LiveListingPreview from './LiveListingPreview';
import { createBlueskyCdnImageUrls } from '@/lib/image-utils';
import { trackCreateListing } from '@/lib/analytics';
import { processExternalLink, getPlatformDisplayName } from '@/lib/external-link-utils';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Define the SavedLocation type
interface SavedLocation {
  name: string;
  state: string;
  county: string;
  locality: string;
  zipPrefix?: string;
  isOnlineStore?: boolean;
}

interface CreateListingFormProps {
  client: MarketplaceClient;
  onSuccess?: (listingUri?: string) => void;
  initialData?: MarketplaceListing;
  mode?: 'create' | 'edit';
}

export default function CreateListingForm({ client, onSuccess, initialData, mode = 'create' }: CreateListingFormProps) {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<(File | ListingImage)[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hideFromFriends, setHideFromFriends] = useState(false);
  const [postToBluesky, setPostToBluesky] = useState(true);

  // Bot Following State
  const [isFollowingBotState, setIsFollowingBotState] = useState(false);
  const [isCheckingFollow, setIsCheckingFollow] = useState(true);

  // Add state for category and subcategory
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
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

  // Add state for controlled inputs (Title, Description, Condition)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');

  // Add state for controlled location inputs
  const [locationState, setLocationState] = useState('');
  const [locationCounty, setLocationCounty] = useState('');
  const [locationLocality, setLocationLocality] = useState('');
  const [locationZip, setLocationZip] = useState('');

  // Add state for Free category confirmation dialog
  const [showFreeConfirmation, setShowFreeConfirmation] = useState(false);
  const [previousCategory, setPreviousCategory] = useState<string>('');

  // Add state for external URL
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlError, setExternalUrlError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  // Add state for online store mode (hides location, shows "Online Store")
  const [isOnlineStore, setIsOnlineStore] = useState(false);

  // Magic Link State
  const [magicLinkUrl, setMagicLinkUrl] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

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

        // Check if this is an online store location
        const isOnline = lastLocation.isOnlineStore === true ||
          (lastLocation.locality === 'Online Store' && lastLocation.state === 'Online');

        if (isOnline) {
          setIsOnlineStore(true);
        }

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

            // Sync with state
            setLocationState(lastLocation.state || '');
            setLocationCounty(lastLocation.county || '');
            setLocationLocality(lastLocation.locality || '');
            setLocationZip(lastLocation.zipPrefix || '');
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

  // Check if seller follows bot on mount
  useEffect(() => {
    async function checkBotFollow() {
      if (!client.agent || !client.agent.session?.did) return;

      setIsCheckingFollow(true);
      try {
        const isFollowing = await isFollowingBot(client.agent, client.agent.session.did);
        setIsFollowingBotState(isFollowing);
      } catch (e) {
        console.error('Error checking bot follow:', e);
      } finally {
        setIsCheckingFollow(false);
      }
    }

    checkBotFollow();
  }, [client.agent]);

  const handleFollowBot = async () => {
    if (!client.agent) return;
    try {
      const success = await followBot(client.agent);
      if (success) {
        setIsFollowingBotState(true);
        // Clear error if related to bot
        if (error && error.includes('Marketplace Bot')) setError(null);
      } else {
        setError('Failed to follow the bot. Please try again.');
      }
    } catch (e) {
      console.error('Follow bot error:', e);
      setError('Error following bot');
    }
  };

  // Populate form for Edit Mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setPriceInput(formatPrice(initialData.price));
      setCondition(initialData.condition);
      setSelectedCategory(initialData.category);
      setHideFromFriends(initialData.hideFromFriends || false);

      // Handle External URL
      if (initialData.externalUrl) {
        setExternalUrl(initialData.externalUrl);
        setDetectedPlatform(getPlatformDisplayName(initialData.externalUrl));
      }

      // Handle Location
      if (initialData.location) {
        const loc = initialData.location;
        setLocationState(loc.state);
        setLocationCounty(loc.county);
        setLocationLocality(loc.locality);
        setLocationZip(loc.zipPrefix || '');

        const locObj: SavedLocation = {
          name: `${loc.locality}, ${loc.state}`,
          state: loc.state,
          county: loc.county,
          locality: loc.locality,
          zipPrefix: loc.zipPrefix,
          isOnlineStore: loc.isOnlineStore
        };
        setSelectedLocation(locObj);
        setIsLocationExpanded(false);

        // Ensure checkbox is checked if it's an online store
        if (loc.isOnlineStore) {
          setIsOnlineStore(true);
        }
      }

      // Handle Images
      if (initialData.images) {
        // We accept ListingImage objects here as they are compatible with our new type definition
        setImages(initialData.images);
      }

      if (initialData.formattedImages && initialData.formattedImages.length > 0) {
        setPreviewUrls(initialData.formattedImages.map(img => img.fullsize));
      } else if (initialData.images && initialData.authorDid) {
        // Fallback: Generate URLs from raw images if formattedImages is missing
        const generatedUrls = initialData.images.map(img =>
          createBlueskyCdnImageUrls(img, initialData.authorDid!).fullsize
        );
        setPreviewUrls(generatedUrls);
      }

      // Handle Subcategory
      if (initialData.metadata && initialData.metadata.subcategory && initialData.category) {
        // Find the category to get its subcategories
        const categoryFn = CATEGORIES.find(c => c.id === initialData.category);
        if (categoryFn) {
          // Update the options state immediately so we can select the value
          setSubcategories(categoryFn.subcategories);

          // Find the ID matching the stored name
          const subObj = categoryFn.subcategories.find(s => s.name === initialData.metadata!.subcategory);
          if (subObj) {
            setSelectedSubcategory(subObj.id);
          }
        }
      }
    }
  }, [mode, initialData]);

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
    // Revoke the URL to prevent memory leaks ONLY if it was created by createObjectURL (starts with blob:)
    const url = previewUrls[index];
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }

    // Remove the image and preview
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));

    // Clear any "too many images" error message since we're reducing the count
    if (error && error.includes("maximum of 10 images")) {
      setError(null);
    }
  };

  // Save the current location for future use
  const saveCurrentLocation = (locationData: { state: string; county: string; locality: string; zipPrefix?: string; isOnlineStore?: boolean }) => {
    // Create a location object for saving
    const locationToSave: SavedLocation = {
      name: locationData.isOnlineStore ? 'Online Store, Online' : `${locationData.locality}, ${locationData.state}`,
      state: locationData.state,
      county: locationData.county,
      locality: locationData.locality,
      zipPrefix: locationData.zipPrefix,
      isOnlineStore: locationData.isOnlineStore
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

    // Update Online Store state
    const isOnline = location.isOnlineStore === true ||
      (location.locality === 'Online Store' && location.state === 'Online');

    setIsOnlineStore(isOnline);

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

      // Update state for preview
      setLocationState(location.state || '');
      setLocationCounty(location.county || '');
      setLocationLocality(location.locality || '');
      setLocationZip(location.zipPrefix || '');
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
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Check permissions first to give a better error message if already denied
    try {
      if (navigator.permissions && navigator.permissions.query) {
        // Cast to any to avoid TypeScript issues if PermissionName doesn't include 'geolocation' in some envs
        const result = await navigator.permissions.query({ name: 'geolocation' as any });
        if (result.state === 'denied') {
          setError("Location access is blocked. Please check your browser settings (usually the lock icon in the address bar) to allow location access for this site.");
          return;
        }
      }
    } catch (e) {
      // Ignore errors if permission API is not supported or behaves unexpectedly
      console.error("Error checking permissions:", e);
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

            // Update state for preview
            setLocationState(state);
            setLocationCounty(county);
            setLocationLocality(locality);
            setLocationZip(zipPrefix);
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
            setError("Location access was denied. Please check your browser settings (lock icon in address bar) to allow location access.");
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
      // Reset subcategory when category changes
      setSelectedSubcategory('');

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

  // Handle external URL changes
  const handleExternalUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setExternalUrl(url);
    setExternalUrlError(null);

    if (url.trim()) {
      const result = processExternalLink(url);
      if (!result.isValid) {
        setExternalUrlError(result.error || 'Invalid URL');
        setDetectedPlatform(null);
      } else {
        setDetectedPlatform(result.platformName);
      }
    } else {
      setDetectedPlatform(null);
    }
  };

  // Handle Magic Link Auto-Fill
  const handleMagicFill = async () => {
    if (!magicLinkUrl.trim()) return;

    setIsMagicLoading(true);
    setMagicError(null);

    try {
      // 1. Fetch Metadata
      const res = await fetch(`/api/magic-link?url=${encodeURIComponent(magicLinkUrl)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch link data');
      }

      // 2. Populate Fields
      if (data.title) setTitle(data.title.substring(0, 300)); // Limit title length
      if (data.description) setDescription(data.description.substring(0, 3000)); // Limit desc length

      // Handle Price if found
      if (data.price) {
        setPriceInput(formatPrice(data.price));
      }

      // Set External URL
      setExternalUrl(magicLinkUrl);
      setDetectedPlatform(getPlatformDisplayName(magicLinkUrl));

      // 3. Handle Image (Fetch via proxy -> Blob -> File)
      if (data.image) {
        try {
          const imageRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(data.image)}`);
          if (imageRes.ok) {
            const blob = await imageRes.blob();
            // Guess extension from MIME type or default to jpg
            const mimeType = blob.type;
            const ext = mimeType.split('/')[1] || 'jpg';
            const filename = `imported-image.${ext}`;
            const file = new File([blob], filename, { type: mimeType });

            // Add to images if we have space
            if (images.length < 10) {
              setImages(prev => [...prev, file]);
              setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]);
            }
          }
        } catch (imgErr) {
          console.warn('Failed to auto-import image:', imgErr);
          // Non-blocking error
        }
      }

      // Success feedback
      setMagicError(null);
      // Optional: scroll to title?

    } catch (err: any) {
      console.error('Magic Link Error:', err);
      setMagicError(err.message || 'Could not auto-fill details. Please try manually.');
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      // 0. Check if following bot
      if (!isFollowingBotState) {
        setError("You must follow the Marketplace Bot to create listings. This ensures buyers can contact you.");
        setIsSubmitting(false);
        window.scrollTo(0, 0);
        return;
      }

      // Get selected category
      // We use the state variable because the select element might be disabled (for Free Stuff),
      // in which case it's not included in the formData
      const categoryId = selectedCategory;

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

      // Handle online store mode - hide specific location
      if (isOnlineStore) {
        // For online stores, we use placeholder values and mark as online
        locationData = {
          state: 'Online',
          county: 'Online',
          locality: 'Online Store',
          isOnlineStore: true
        };
      } else if (selectedLocation && !isLocationExpanded) {
        // If we have a selectedLocation and the accordion is closed (i.e., the user is using the saved location)
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

      // Validate location data (skip for online store mode which has preset values)
      if (!isOnlineStore && (!locationData.state || !locationData.county || !locationData.locality)) {
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

      // Validate external URL if provided
      let processedExternalUrl: string | undefined;
      if (externalUrl.trim()) {
        const urlResult = processExternalLink(externalUrl);
        if (!urlResult.isValid) {
          setError(urlResult.error || 'Invalid external URL');
          setIsSubmitting(false);
          return;
        }
        // Use the processed URL with affiliate tracking
        processedExternalUrl = urlResult.processedUrl;
      }

      // Create custom metadata for inclusion in description
      const metadata = {
        subcategory: subcategoryName
      };

      // Prepare listing data with metadata embedded as JSON
      const listingDataRaw = {
        title: formData.get('title') as string,
        description: description,
        price: formattedPrice,
        location: locationData,
        category: categoryId,
        condition: formData.get('condition') as string,
        images: images as any, // The client handles mixed types now
        hideFromFriends: hideFromFriends,
        metadata: metadata,
        ...(processedExternalUrl && { externalUrl: processedExternalUrl })
      };



      let result;
      if (mode === 'edit' && initialData && initialData.uri) {
        // Update existing listing
        await client.updateListing(initialData.uri, listingDataRaw);
        result = { uri: initialData.uri };
      } else {
        // Create new listing
        result = await client.createListing(listingDataRaw);

        // Post to Bluesky feed if requested (only for new listings)
        if (postToBluesky && result && result.uri) {
          try {
            // We need to pass the processed blobs which are in result.images
            const shareData = {
              ...listingDataRaw,
              images: (result as any).images || []
            };
            await client.shareListingOnBluesky(shareData, result.uri as string);
          } catch (shareError) {
            console.error('Failed to post to Bluesky feed:', shareError);
            // Don't block the huge success flow, just log it
          }
        }
      }

      // Save the location for future use
      saveCurrentLocation(locationData);

      // Extract the URI from the result for redirection
      const listingUri = result?.uri ? String(result.uri) : undefined;

      // Pass the listing URI to the onSuccess callback
      if (onSuccess) onSuccess(listingUri);

      // Track listing creation
      trackCreateListing({
        title: listingDataRaw.title,
        category: listingDataRaw.category,
        price: listingDataRaw.price
      });
    } catch (err) {
      setError(`Failed to ${mode === 'edit' ? 'update' : 'create'} listing: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="max-w-7xl mx-auto p-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Form Column */}
        <div className="flex-1 min-w-0">
          <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
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
                    Changing to the &ldquo;Free Stuff&rdquo; category will set your item&apos;s price to $0.00. Do you want to continue?
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

            {/* Bot Follow Warning */}
            {!isCheckingFollow && !isFollowingBotState && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-800">Enable Buyer Notifications</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        To receive inquiries from interested buyers, you need to follow our Introduction Bot.
                        Listing creation is disabled until you follow.
                      </p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleFollowBot}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Follow Marketplace Bot
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form id="listing-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Magic Link Section (Hidden unless ?ml=true) */}
              {searchParams.get('ml') === 'true' && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                      <Wand2 size={18} />
                    </div>
                    <h3 className="font-bold text-indigo-900">Magic Import</h3>
                    <span className="bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide">Beta</span>
                  </div>
                  <p className="text-sm text-indigo-700/80 mb-4">
                    Paste a link from Amazon, Shopify, or other stores to auto-fill details.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://amazon.com/dp/..."
                      value={magicLinkUrl}
                      onChange={(e) => setMagicLinkUrl(e.target.value)}
                      className="flex-1 rounded-xl border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleMagicFill}
                      disabled={isMagicLoading || !magicLinkUrl}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {isMagicLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Auto-Fill
                        </>
                      )}
                    </button>
                  </div>
                  {magicError && (
                    <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                      ⚠️ {magicError}
                    </p>
                  )}
                </div>
              )}
              {/* Photos Section */}

              {/* Error Message */}
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
                        unoptimized
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
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
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
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
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
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
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
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={4}
                      placeholder="Describe your item in detail. Include features, specifications, and why you&apos;re selling. The more details you provide, the more likely buyers will be interested."
                      className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>

                  <div>
                    <label htmlFor="externalUrl" className="block text-sm font-medium text-text-secondary mb-1">
                      External Buy Link (optional)
                    </label>
                    <input
                      type="url"
                      id="externalUrl"
                      name="externalUrl"
                      value={externalUrl}
                      onChange={handleExternalUrlChange}
                      placeholder="https://amazon.com/dp/..."
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light ${externalUrlError ? 'border-red-400' : 'border-neutral-light'
                        }`}
                    />
                    {externalUrlError && (
                      <p className="text-sm text-red-500 mt-1">{externalUrlError}</p>
                    )}
                    {detectedPlatform && !externalUrlError && (
                      <p className="text-sm text-green-600 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Detected: {detectedPlatform}
                      </p>
                    )}
                    <p className="text-xs text-text-secondary mt-1">
                      Link to where buyers can purchase this item (Amazon, eBay, Etsy, etc.). A &quot;Buy on Website&quot; button will appear on your listing.
                    </p>
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
                    {isOnlineStore ? (
                      <p className="text-sm text-text-secondary mt-1">
                        <span className="font-medium text-blue-600">Online Store</span>
                      </p>
                    ) : selectedLocation && (
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
                    {/* Online Store Toggle */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="onlineStore"
                          checked={isOnlineStore}
                          onChange={(e) => setIsOnlineStore(e.target.checked)}
                          className="mt-1 h-4 w-4 text-primary-color border-gray-300 rounded focus:ring-primary-light"
                        />
                        <div className="flex-1">
                          <label htmlFor="onlineStore" className="font-medium text-blue-900 cursor-pointer">
                            Online / Store Listing
                          </label>
                          <p className="text-sm text-blue-700 mt-1">
                            Check this if you are linking to an external store (Etsy, Shopify, etc.). We will hide your specific location and mark the item as &quot;Online Store&quot;.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Local location fields - only shown if not online store */}
                    {!isOnlineStore && (
                      <>
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
                                  className={`px-3 py-1 rounded-full text-sm ${selectedLocation?.name === location.name
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
                              value={locationState}
                              onChange={(e) => setLocationState(e.target.value)}
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
                              value={locationCounty}
                              onChange={(e) => setLocationCounty(e.target.value)}
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
                              value={locationLocality}
                              onChange={(e) => setLocationLocality(e.target.value)}
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
                              value={locationZip}
                              onChange={(e) => setLocationZip(e.target.value)}
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
                      </>
                    )}
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

              {/* Post to Bluesky Checkbox (Create Mode Only) */}
              {mode === 'create' && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="postToBluesky"
                      name="postToBluesky"
                      type="checkbox"
                      checked={postToBluesky}
                      onChange={(e) => setPostToBluesky(e.target.checked)}
                      className="focus:ring-primary-500 h-4 w-4 text-primary-color border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="postToBluesky" className="font-medium text-blue-900">
                      Post to Bluesky
                    </label>
                    <p className="text-blue-700">
                      Automatically create a post on your Bluesky feed to let your followers know about this listing.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-text-secondary mb-4">
                  Your listing will be visible to the entire AT Protocol community. Please note that we don&apos;t allow listings for live animals, controlled substances, weapons, counterfeit items, or anything that violates intellectual property rights. Keep it legal and community-friendly!
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting || (!isFollowingBotState && !isCheckingFollow)}
                  className="w-full py-3 px-4 bg-primary-color hover:bg-primary-light text-white font-medium rounded-md focus:outline-none focus:ring-4 focus:ring-primary-light disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (mode === 'edit' ? 'Updating listing...' : 'Creating listing...')
                    : (mode === 'edit' ? 'Update Listing' : 'Create Listing')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview Column - Hidden on mobile/tablet, visible on desktop */}
        <div className="hidden lg:block w-96 flex-shrink-0">
          <LiveListingPreview
            title={title}
            price={priceInput}
            description={description}
            category={selectedCategory}
            condition={condition}
            location={{
              locality: locationLocality,
              state: locationState
            }}
            imageUrls={previewUrls}
          />
        </div>
      </div>


    </div>
  );
}