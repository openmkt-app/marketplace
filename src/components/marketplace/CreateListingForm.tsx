// src/components/marketplace/CreateListingForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import { Wand2, Loader2, Sparkles, Package, Palette } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { CURRENCIES } from '@/lib/price-utils';

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
  const tCreate = useTranslations('createListing');
  const tCats = useTranslations('categories');
  const tSubs = useTranslations('subcategories');
  const tConds = useTranslations('conditions');
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<(File | ListingImage)[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hideFromFriends, setHideFromFriends] = useState(false);
  const [isNsfw, setIsNsfw] = useState(false);
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
  const [currency, setCurrency] = useState('USD');

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

  // Commission-specific state
  const [slotsAvailable, setSlotsAvailable] = useState<string>('');
  const [turnaroundTime, setTurnaroundTime] = useState<string>('');
  const isCommissionCategory = selectedCategory === 'digital_arts';

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
  const [magicNote, setMagicNote] = useState<string | null>(null);
  const [etsyListingId, setEtsyListingId] = useState<string | null>(null);
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const etsyCsvInputRef = useRef<HTMLInputElement>(null);

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
      if (!client.agent || !client.agent.did) return;

      setIsCheckingFollow(true);
      try {
        const isFollowing = await isFollowingBot(client.agent, client.agent.accountDid);
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
        setError(tCreate('errors.followBot'));
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
      setCurrency(initialData.currency || 'USD');
      setCondition(initialData.condition);
      setSelectedCategory(initialData.category);
      setHideFromFriends(initialData.hideFromFriends || false);
      const hasNsfwLabel = initialData.labels?.values?.some((l: any) => 
        ['nsfw', 'porn', 'sexual', 'nudity', 'graphic-media'].includes(l.val)
      ) || false;
      setIsNsfw(hasNsfwLabel);

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

      // Handle Commission fields
      if (initialData.metadata?.slotsAvailable !== undefined) {
        setSlotsAvailable(String(initialData.metadata.slotsAvailable));
      }
      if (initialData.metadata?.turnaroundTime) {
        setTurnaroundTime(initialData.metadata.turnaroundTime);
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
      setError(tCreate('errors.maxImages'));
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
      setError(tCreate('errors.geoNotSupported'));
      return;
    }

    // Check permissions first to give a better error message if already denied
    try {
      if (navigator.permissions && navigator.permissions.query) {
        // Cast to any to avoid TypeScript issues if PermissionName doesn't include 'geolocation' in some envs
        const result = await navigator.permissions.query({ name: 'geolocation' as any });
        if (result.state === 'denied') {
          setError(tCreate('errors.geoBlocked'));
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
          setError(tCreate('errors.geoDetails'));
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
            setError(tCreate('errors.geoDenied'));
            break;
          case error.POSITION_UNAVAILABLE:
            setError(tCreate('errors.geoUnavailable'));
            break;
          case error.TIMEOUT:
            setError(tCreate('errors.geoTimeout'));
            break;
          default:
            setError(tCreate('errors.geoUnknown'));
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

      // Auto-configure for digital arts commissions
      if (categoryId === 'digital_arts') {
        setIsOnlineStore(true);
        setIsLocationExpanded(false);
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
      // Auto-configure for digital arts commissions if reverting
      if (previousCategory === 'digital_arts') {
        setIsOnlineStore(true);
        setIsLocationExpanded(false);
      }
    }

    setShowFreeConfirmation(false);
  };

  // Handle external URL changes
  const handleExternalUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setExternalUrl(url);
    setExternalUrlError(null);

    if (url.trim()) {
      const result = processExternalLink(url);
      if (!result.isValid) {
        setExternalUrlError(result.error || 'Invalid URL');
        setDetectedPlatform(null);
      } else {
        // First set platform from URL pattern (synchronous)
        setDetectedPlatform(result.platformName);

        // If no platform detected from URL, try async detection (for Shopify, etc.)
        if (!result.platformName) {
          try {
            const platformRes = await fetch(`/api/detect-platform?url=${encodeURIComponent(url)}`);
            const platformData = await platformRes.json();
            if (platformData.platformName) {
              setDetectedPlatform(platformData.platformName);
            }
          } catch (e) {
            // Non-blocking - just won't show platform badge
          }
        }
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
    setMagicNote(null);
    setEtsyListingId(null);
    setCsvError(null);

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
        // Convert to string in case the API returns a number
        const priceStr = typeof data.price === 'string' ? data.price : String(data.price);
        setPriceInput(formatPrice(priceStr));
      }

      // Set External URL
      setExternalUrl(magicLinkUrl);

      // Try to detect platform - first from URL pattern, then via async detection
      let platform = getPlatformDisplayName(magicLinkUrl);
      if (!platform) {
        try {
          const platformRes = await fetch(`/api/detect-platform?url=${encodeURIComponent(magicLinkUrl)}`);
          const platformData = await platformRes.json();
          if (platformData.platformName) {
            platform = platformData.platformName;
          }
        } catch (e) {
          // Non-blocking - just won't show platform badge
          console.warn('Platform detection failed:', e);
        }
      }
      setDetectedPlatform(platform);

      // 3. Handle Images (Fetch via proxy -> Blob -> File)
      const imagesToFetch = data.images && data.images.length > 0 ? data.images : (data.image ? [data.image] : []);
      
      if (imagesToFetch.length > 0) {
        try {
          const newFiles: File[] = [];
          const newUrls: string[] = [];
          
          // Create a snapshot of current images length to enforce the 10 image limit
          const currentCount = images.length;
          const limit = Math.min(10 - currentCount, imagesToFetch.length, 10);
          
          for (let i = 0; i < limit; i++) {
            const imgUrl = imagesToFetch[i];
            try {
              const imageRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(imgUrl)}`);
              if (imageRes.ok) {
                const blob = await imageRes.blob();
                const mimeType = blob.type;
                const ext = mimeType.split('/')[1] || 'jpg';
                const filename = `imported-image-${Date.now()}-${i + 1}.${ext}`;
                const file = new File([blob], filename, { type: mimeType });
                
                newFiles.push(file);
                newUrls.push(URL.createObjectURL(file));
              }
            } catch (imgErr) {
              console.warn(`Failed to auto-import image ${i}:`, imgErr);
            }
          }

          if (newFiles.length > 0) {
            setImages(prev => [...prev, ...newFiles]);
            setPreviewUrls(prev => [...prev, ...newUrls]);
          }
        } catch (imgErr) {
          console.warn('Failed to auto-import images:', imgErr);
        }
      }

      // Success feedback
      setMagicError(null);
      if (data.note) setMagicNote(data.note);

      // If Etsy, capture listing ID so we can enhance via CSV later
      const etsyIdMatch = magicLinkUrl.match(/etsy\.com\/listing\/(\d+)/);
      setEtsyListingId(etsyIdMatch ? etsyIdMatch[1] : null);
      setCsvError(null);

    } catch (err: any) {
      console.error('Magic Link Error:', err);
      setMagicNote(null);
      setEtsyListingId(null);
      setMagicError(err.message || 'Could not auto-fill details. Please try manually.');
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleEtsyCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !etsyListingId) return;

    setIsCsvLoading(true);
    setCsvError(null);

    try {
      const text = await file.text();

      // Minimal but correct CSV parser (handles quoted fields with embedded commas/newlines)
      const parseCSV = (csv: string): Record<string, string>[] => {
        const rows: Record<string, string>[] = [];
        let i = 0;
        const fields: string[] = [];

        const parseField = () => {
          if (csv[i] === '"') {
            i++; // skip opening quote
            let val = '';
            while (i < csv.length) {
              if (csv[i] === '"' && csv[i + 1] === '"') { val += '"'; i += 2; }
              else if (csv[i] === '"') { i++; break; }
              else { val += csv[i++]; }
            }
            return val;
          } else {
            let val = '';
            while (i < csv.length && csv[i] !== ',' && csv[i] !== '\n' && csv[i] !== '\r') val += csv[i++];
            return val;
          }
        };

        // Parse header row
        const headers: string[] = [];
        while (i < csv.length && csv[i] !== '\n' && csv[i] !== '\r') {
          headers.push(parseField().trim().toUpperCase());
          if (csv[i] === ',') i++;
        }
        while (csv[i] === '\n' || csv[i] === '\r') i++;

        // Parse data rows
        while (i < csv.length) {
          const row: Record<string, string> = {};
          let col = 0;
          while (i < csv.length && csv[i] !== '\n' && csv[i] !== '\r') {
            if (headers[col]) row[headers[col]] = parseField();
            else parseField();
            col++;
            if (csv[i] === ',') i++;
          }
          while (csv[i] === '\n' || csv[i] === '\r') i++;
          if (Object.keys(row).length > 0) rows.push(row);
        }

        return rows;
      };

      const rows = parseCSV(text);
      const match = rows.find(r => r['LISTING_ID'] === etsyListingId);

      if (!match) {
        setCsvError(`Listing ID ${etsyListingId} not found in this CSV. Make sure you're uploading the correct export file.`);
        return;
      }

      // Fill description
      if (match['DESCRIPTION']) {
        setDescription(match['DESCRIPTION'].substring(0, 3000));
      }

      // Fill price
      if (match['PRICE']) {
        const parsed = parseFloat(match['PRICE']);
        if (!isNaN(parsed)) setPriceInput(formatPrice(parsed.toFixed(2)));
      }

      // Collect IMAGE1–IMAGE10 columns
      const csvImages: string[] = [];
      for (let n = 1; n <= 10; n++) {
        const url = match[`IMAGE${n}`];
        if (url && url.startsWith('http')) csvImages.push(url);
      }

      if (csvImages.length > 0) {
        const newFiles: File[] = [];
        const newUrls: string[] = [];
        const currentCount = images.length;
        const limit = Math.min(10 - currentCount, csvImages.length);

        for (let n = 0; n < limit; n++) {
          try {
            const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(csvImages[n])}`);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const ext = blob.type.split('/')[1] || 'jpg';
              const file = new File([blob], `etsy-image-${Date.now()}-${n + 1}.${ext}`, { type: blob.type });
              newFiles.push(file);
              newUrls.push(URL.createObjectURL(file));
            }
          } catch (imgErr) {
            console.warn(`Failed to import CSV image ${n}:`, imgErr);
          }
        }

        if (newFiles.length > 0) {
          setImages(prev => [...prev, ...newFiles]);
          setPreviewUrls(prev => [...prev, ...newUrls]);
        }
      }

      setMagicNote(null);
      setEtsyListingId(null); // hide the enhance section — we're done
    } catch (err: any) {
      setCsvError(err.message || 'Failed to parse CSV file.');
    } finally {
      setIsCsvLoading(false);
      if (etsyCsvInputRef.current) etsyCsvInputRef.current.value = '';
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
        setError(tCreate('errors.followRequired'));
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
        setError(tCreate('errors.locationRequired'));
        setIsSubmitting(false);
        return;
      }

      // Validate price input before formatting
      if (!priceInput.trim()) {
        setError(tCreate('errors.priceRequired'));
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
          setError(tCreate('errors.freeCategoryPrice'));
          setIsSubmitting(false);
          return;
        }
      } else {
        // If price is not zero, category cannot be "Free Stuff"
        if (categoryId === 'free') {
          setError(tCreate('errors.freePriceCategory'));
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
      const metadata: Record<string, any> = {
        subcategory: subcategoryName
      };

      // Store detected platform in metadata for badge display
      if (detectedPlatform) {
        // Convert display name to key (e.g., "Shopify" -> "shopify")
        metadata.externalPlatform = detectedPlatform.toLowerCase().replace(/\s+/g, '');
      }

      // Commission-specific metadata
      if (categoryId === 'digital_arts') {
        if (slotsAvailable !== '') {
          const slots = parseInt(slotsAvailable, 10);
          metadata.slotsAvailable = slots;
          metadata.commissionStatus = slots === 0 ? 'waitlist' : 'open';
        }
        if (turnaroundTime.trim()) {
          metadata.turnaroundTime = turnaroundTime.trim();
        }
      }

      // Prepare listing data with metadata embedded as JSON
      const listingDataRaw = {
        title: formData.get('title') as string,
        description: description,
        price: formattedPrice,
        currency: currency,
        location: locationData,
        category: categoryId,
        condition: isCommissionCategory ? '' : (formData.get('condition') as string),
        images: images as any, // The client handles mixed types now
        hideFromFriends: hideFromFriends,
        isNsfw: isNsfw,
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

      // If this is a new online store listing, clear the seller from the empty-seller cache
      // so they appear on the Mall page immediately on next load.
      if (mode === 'create' && isOnlineStore && client.agent?.did) {
        fetch('/api/mall/invalidate-seller', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ did: client.agent.did }),
        }).catch(() => {}); // fire-and-forget, non-critical
      }

      // Pass the listing URI to the onSuccess callback
      if (onSuccess) onSuccess(listingUri);

      // Track listing creation
      trackCreateListing({
        title: listingDataRaw.title,
        category: listingDataRaw.category,
        price: listingDataRaw.price
      });
    } catch (err) {
      setError(tCreate('errors.submitFailed', { 
        action: mode === 'edit' ? tCreate('errors.actionUpdate') : tCreate('errors.actionCreate'),
        message: err instanceof Error ? err.message : String(err)
      }));
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
                  <h3 className="text-lg font-bold mb-2">{tCreate('freeConfirmTitle')}</h3>
                  <p className="mb-4 text-text-secondary">
                    {tCreate('freeConfirmBody')}
                  </p>
                  <div className="flex space-x-3 justify-end">
                    <button
                      type="button"
                      onClick={() => handleFreeConfirmation(false)}
                      className="px-4 py-2 border border-neutral-light rounded-md hover:bg-neutral-light/50"
                    >
                      {tCreate('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFreeConfirmation(true)}
                      className="px-4 py-2 bg-primary-color hover:bg-primary-light text-white rounded-md"
                    >
                      {tCreate('confirm')}
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
                    <h3 className="text-sm font-medium text-blue-800">{tCreate('botFollowTitle')}</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        {tCreate('botFollowBody')}
                      </p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleFollowBot}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {tCreate('botFollowButton')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form id="listing-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Listing Type Selector */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('sellingHeader')}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCommissionCategory) {
                        setSelectedCategory('');
                        setSelectedSubcategory('');
                        setIsOnlineStore(false);
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                      !isCommissionCategory
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-neutral-light bg-white text-text-secondary hover:border-slate-300'
                    }`}
                  >
                    <Package size={24} />
                    <span className="font-semibold text-sm">{tCreate('physicalProduct')}</span>
                    <span className={`text-xs text-center leading-tight ${!isCommissionCategory ? 'text-slate-300' : 'text-text-secondary'}`}>
                      {tCreate('physicalProductDesc')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCommissionCategory) {
                        setSelectedCategory('digital_arts');
                        setSelectedSubcategory('');
                        setIsOnlineStore(true);
                        setIsLocationExpanded(false);
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                      isCommissionCategory
                        ? 'border-rose-600 bg-rose-600 text-white shadow-md'
                        : 'border-neutral-light bg-white text-text-secondary hover:border-rose-300'
                    }`}
                  >
                    <Palette size={24} />
                    <span className="font-semibold text-sm">{tCreate('digitalArts')}</span>
                    <span className={`text-xs text-center leading-tight ${isCommissionCategory ? 'text-rose-200' : 'text-text-secondary'}`}>
                      {tCreate('digitalArtsDesc')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Magic Link Section */}
              <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-amber-200 rounded-lg text-amber-700">
                    <Wand2 size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900">{tCreate('magicImport')}</h3>
                  <span className="bg-amber-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide">{tCreate('magicImportBeta')}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {tCreate('magicImportDesc')}
                </p>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder={tCreate('magicImportPlaceholder')}
                    value={magicLinkUrl}
                    onChange={(e) => setMagicLinkUrl(e.target.value)}
                    className="flex-1 rounded-xl border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleMagicFill}
                    disabled={isMagicLoading || !magicLinkUrl}
                    className="bg-gray-900 hover:bg-gray-800 text-amber-300 px-5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-sm"
                  >
                    {isMagicLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {tCreate('magicImportLoading')}
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        {tCreate('magicImportButton')}
                      </>
                    )}
                  </button>
                </div>

                {magicError && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    ⚠️ {magicError}
                  </p>
                )}
                {magicNote && (
                  <p className="text-amber-700 text-xs mt-2 flex items-center gap-1">
                    ℹ️ {magicNote}
                  </p>
                )}

                {/* Etsy CSV Enhance Card */}
                {etsyListingId && (
                  <div className="mt-4 border border-orange-200 bg-orange-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-orange-800 mb-1">Want more details?</p>
                    <p className="text-xs text-orange-700 mb-3">
                      Etsy limits what we can fetch automatically. Upload your Etsy export CSV to fill in description, price, and all images for this listing — or import your entire store at once.
                    </p>
                    <ol className="text-xs text-orange-700 list-decimal list-inside space-y-0.5 mb-3">
                      <li>Go to <strong>Etsy Shop Manager → Listings</strong></li>
                      <li>Click <strong>Download Data</strong> (top right)</li>
                      <li>Upload the downloaded CSV file below</li>
                    </ol>
                    <input
                      ref={etsyCsvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleEtsyCsvUpload}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => etsyCsvInputRef.current?.click()}
                        disabled={isCsvLoading}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isCsvLoading ? (
                          <><Loader2 size={13} className="animate-spin" /> Importing...</>
                        ) : (
                          'Upload Etsy Export CSV'
                        )}
                      </button>
                      <a
                        href="/mall/import"
                        className="text-orange-700 border border-orange-300 hover:bg-orange-100 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        Import Your Whole Store
                      </a>
                    </div>
                    {csvError && (
                      <p className="text-red-600 text-xs mt-2">⚠️ {csvError}</p>
                    )}
                  </div>
                )}
              </div>
              {/* Photos Section */}

              {/* Error Message */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('imagesHeader')}</h2>

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
                  {tCreate('imagesDesc')}
                </p>
              </div>

              {/* Item Details */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                <h2 className="text-xl font-semibold mb-4 text-text-primary">
                  {isCommissionCategory ? tCreate('detailsHeaderCommission') : tCreate('detailsHeader')}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1">
                      {isCommissionCategory ? tCreate('labelTitleCommission') : tCreate('labelTitle')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isCommissionCategory ? tCreate('placeholderTitleCommission') : tCreate('placeholderTitle')}
                      className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-text-secondary mb-1">
                      {isCommissionCategory ? tCreate('labelPriceCommission') : tCreate('labelPrice')} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex rounded-md shadow-sm">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-24 pl-3 pr-2 py-2 bg-neutral-light/30 border border-neutral-light border-r-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-light text-sm text-text-secondary cursor-pointer"
                      >
                        {CURRENCIES.map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        id="price"
                        name="price"
                        required
                        placeholder="0.00"
                        value={priceInput}
                        onChange={handlePriceChange}
                        className="flex-1 w-full pl-3 pr-3 py-2 border border-neutral-light rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">
                      {tCreate('labelCategory')} <span className="text-red-500">*</span>
                      {isPriceZero && priceInput !== '' && (
                        <span className="ml-2 text-xs text-primary-color">
                          {tCreate('labelCategoryFreeInfo')}
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
                      <option value="">{tCreate('selectCategory')}</option>
                      {CATEGORIES.map(category => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {tCats(category.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="subcategory" className="block text-sm font-medium text-text-secondary mb-1">
                      {tCreate('labelSubcategory')}
                    </label>
                    <select
                      id="subcategory"
                      name="subcategory"
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                    >
                      <option value="">{tCreate('selectSubcategory')}</option>
                      {subcategories.map(subcategory => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {tSubs(`${selectedCategory}.${subcategory.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isCommissionCategory && (
                    <div className="space-y-4 p-4 bg-rose-50 border border-rose-100 rounded-lg">
                      <p className="text-sm font-semibold text-rose-800">{tCreate('commissionSettings')}</p>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          {tCreate('openSlots')}{' '}
                          <span className="text-xs font-normal text-text-secondary">{tCreate('openSlotsDesc')}</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={slotsAvailable}
                          onChange={(e) => setSlotsAvailable(e.target.value)}
                          placeholder="e.g. 3"
                          className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                        />
                        {slotsAvailable !== '' && parseInt(slotsAvailable, 10) === 0 && (
                          <p className="text-xs text-amber-600 mt-1">{tCreate('waitlistNote')}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          {tCreate('turnaroundTime')}{' '}
                          <span className="text-xs font-normal text-text-secondary">{tCreate('openSlotsDesc')}</span>
                        </label>
                        <input
                          type="text"
                          value={turnaroundTime}
                          onChange={(e) => setTurnaroundTime(e.target.value)}
                          placeholder={tCreate('turnaroundTimePlaceholder')}
                          className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                        />
                      </div>
                    </div>
                  )}

                  {!isCommissionCategory && (
                  <div>
                    <label htmlFor="condition" className="block text-sm font-medium text-text-secondary mb-1">
                      {tCreate('labelCondition')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="condition"
                      name="condition"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                    >
                      <option value="">{tCreate('selectCondition')}</option>
                      {CONDITIONS.map(condition => (
                        <option key={condition.id} value={condition.id}>
                          {tConds(condition.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  )}

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
                      {isCommissionCategory ? tCreate('labelDescriptionCommission') : tCreate('labelDescription')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={4}
                      placeholder={isCommissionCategory
                        ? tCreate('placeholderDescriptionCommission')
                        : tCreate('placeholderDescription')}
                      className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>

                  <div>
                    <label htmlFor="externalUrl" className="block text-sm font-medium text-text-secondary mb-1">
                      {tCreate('externalLink')}
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
                        {tCreate('detectedPlatform', { platform: detectedPlatform })}
                      </p>
                    )}
                    <p className="text-xs text-text-secondary mt-1">
                      {tCreate('externalLinkDesc')}
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
                      <h2 className="text-xl font-semibold text-text-primary">
                        {isCommissionCategory ? tCreate('locationHeaderCommission') : tCreate('locationHeader')}
                      </h2>
                      {locationSaved && (
                        <span className="ml-3 animate-pulse text-sm text-green-600 bg-green-50 rounded-full px-3 py-0.5">
                          {tCreate('locationSaved')}
                        </span>
                      )}
                    </div>
                    {isOnlineStore ? (
                      <p className="text-sm text-text-secondary mt-1">
                        <span className="font-medium text-blue-600">
                          {isCommissionCategory ? 'Global / Remote Work' : tCreate('onlineStoreToggle')}
                        </span>
                      </p>
                    ) : selectedLocation && (
                      <p className="text-sm text-text-secondary mt-1">
                        <span className="font-medium">{selectedLocation.name}</span>
                        {selectedLocation.zipPrefix && (
                          <span> ({tCreate('zipAreaInfo', { area: formatZipPrefix(selectedLocation.zipPrefix) })})</span>
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
                            {tCreate('onlineStoreToggle')}
                          </label>
                          <p className="text-sm text-blue-700 mt-1">
                            {tCreate('onlineStoreDesc')}
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
                                  {tCreate('detectingLocation')}
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {tCreate('detectLocation')}
                                </>
                              )}
                            </button>

                            {geoSuccess === true && (
                              <p className="text-sm text-green-600 mt-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {tCreate('locationDetected')}
                              </p>
                            )}
                          </div>

                        {/* Saved Locations */}
                        {savedLocations.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                              {tCreate('savedLocationsHeader')}
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
                              {tCreate('labelState')}
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
                              {tCreate('labelCounty')}
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
                              {tCreate('labelLocality')}
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
                              {tCreate('labelZip')}
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
                              {tCreate('zipAreaInfo', { area: formatZipPrefix(selectedLocation.zipPrefix) })}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-text-secondary mt-3">
                          {tCreate('locationHelp')}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Privacy Options */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('visibilityHeader')}</h2>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-text-secondary">{tCreate('hideFromFriends')}</span>
                    <p className="text-sm text-text-secondary">{tCreate('hideFromFriendsDesc')}</p>
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

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                  <div>
                    <span className="font-medium text-text-secondary items-center flex gap-2">
                      {tCreate('markNsfw')}
                    </span>
                    <p className="text-sm text-text-secondary max-w-[85%]">
                      {tCreate('markNsfwDesc')}
                    </p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isNsfw}
                      onChange={() => setIsNsfw(!isNsfw)}
                    />
                    <div className="relative w-11 h-6 bg-neutral-light peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
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
                      {tCreate('shareToFeed')}
                    </label>
                    <p className="text-blue-700">
                      {tCreate('shareToFeedDesc')}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-text-secondary mb-4">
                  {tCreate('legalWarning')}
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting || (!isFollowingBotState && !isCheckingFollow)}
                  className="w-full py-3 px-4 bg-primary-color hover:bg-primary-light text-white font-medium rounded-md focus:outline-none focus:ring-4 focus:ring-primary-light disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (mode === 'edit' ? tCreate('submitLoading') : tCreate('submitLoading'))
                    : (mode === 'edit' ? tCreate('submitEdit') : tCreate('submitCreate'))}
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
            currency={currency}
            description={description}
            category={selectedCategory}
            condition={condition}
            slotsAvailable={slotsAvailable}
            location={{
              locality: locationLocality,
              state: locationState
            }}
            imageUrls={previewUrls}
            isNsfw={isNsfw}
          />
        </div>
      </div>


    </div>
  );
}