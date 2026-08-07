// src/components/marketplace/CreateListingForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import MarketplaceClient, { InsufficientScopeError, ListingImage, MarketplaceListing } from '@/lib/marketplace-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LocationFilterValue } from './filters/LocationFilter';
import { formatZipPrefix } from '@/lib/location-utils';
import Image from 'next/image';
import { CATEGORIES, CONDITIONS, SubcategoryOption } from '@/lib/category-data';
import { resolveSubcategoryId } from '@/lib/category-utils';
import { isFollowingBot, followBot } from '@/lib/bot-utils';
import LiveListingPreview from './LiveListingPreview';
import { createBlueskyCdnImageUrls } from '@/lib/image-utils';
import { trackCreateListing } from '@/lib/analytics';
import { processExternalLink, getPlatformDisplayName } from '@/lib/external-link-utils';
import { Wand2, Loader2, Sparkles, Package, Palette, Download, ChevronUp, ChevronDown } from 'lucide-react';
import type { BillingPeriod, ListingType, ProductGroup } from '@/lib/commerce/types';
import { useListingFormState, NEW_GROUP, FIELD_CLASS, type SavedLocation } from './listing-form/state';
import { ListingFormProvider } from './listing-form/context';
import { formatPrice } from './listing-form/format';
import { saveLocation } from './listing-form/useSaveLocation';
import VariantSection from './listing-form/sections/VariantSection';
import TypeSelectorSection from './listing-form/sections/TypeSelectorSection';
import CatalogueSection from './listing-form/sections/CatalogueSection';
import SubmitSection from './listing-form/sections/SubmitSection';
import ImagesSection from './listing-form/sections/ImagesSection';
import MagicImportSection from './listing-form/sections/MagicImportSection';
import LocationSection from './listing-form/sections/LocationSection';
import DetailsSection from './listing-form/sections/DetailsSection';
import VisibilitySection from './listing-form/sections/VisibilitySection';

import { useSearchParams } from 'next/navigation';
import { CURRENCIES } from '@/lib/price-utils';

/** "oak, mid-century , " -> ["oak", "mid-century"]. Order kept, blanks dropped. */
function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(',')
    .map(t => t.trim())
    .filter(t => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
}

/**
 * A spec row needs a name; the value is optional.
 *
 * With both it is a property — "Material: oak". With only a name it is a
 * feature the listing includes — "Priority support" — which is how every tiered
 * product states what a plan comes with. A value on its own says nothing and is
 * dropped.
 */
function cleanSpecs(rows: Array<{ name: string; value: string }>) {
  return rows
    .map(r => ({ name: r.name.trim(), value: r.value.trim() }))
    .filter(r => r.name)
    .map(r => (r.value ? r : { name: r.name }));
}

function numberOrUndefined(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
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
  const { logout } = useAuth();
  // Every piece of state lives in one hook now, so a section component can read
  // what it needs instead of closing over this function body. Destructured here
  // so the rest of the form reads exactly as it did before the lift.
  const form = useListingFormState();
  const {
    setIsSubmitting, error, setError, needsReauth, setNeedsReauth, messageRef, images,
    setImages, previewUrls, setPreviewUrls, hideFromFriends, setHideFromFriends, isNsfw,
    setIsNsfw, postToBluesky, isFollowingBotState, setIsFollowingBotState, isCheckingFollow,
    setIsCheckingFollow, selectedCategory, setSelectedCategory, setSelectedSubcategory,
    subcategories, setSubcategories, savedLocations, setSavedLocations, selectedLocation,
    setSelectedLocation, isLocationExpanded, setIsLocationExpanded, setLocationSaved,
    locationState, setLocationState, setLocationCounty, locationLocality,
    setLocationLocality, setLocationZip, isOnlineStore, setIsOnlineStore, currency,
    setCurrency, priceInput, setPriceInput, salePriceInput, setSalePriceInput, saleStartsAt,
    setSaleStartsAt, saleEndsAt, setSaleEndsAt, showSaleFields, setShowSaleFields,
    taxInclusive, setTaxInclusive, acceptingOffers, setAcceptingOffers, billingPeriod,
    setBillingPeriod, isVariant, setIsVariant, groups, setGroups, groupUri, setGroupUri,
    groupTitle, axisName, setAxisName, optionValue, setOptionValue, groupsLoaded,
    suggestedTitle, setShowMoreDetails, sku, setSku, gtin, setGtin, brand, setBrand,
    tagsInput, setTagsInput, specs, setSpecs, manageStock, setManageStock, quantity,
    setQuantity, lowStockThreshold, setLowStockThreshold, soldIndividually,
    setSoldIndividually, shippingWeight, setShippingWeight, dimL, setDimL, dimW, setDimW,
    dimH, setDimH, title, setTitle, description, setDescription, condition, setCondition,
    slotsAvailable, setSlotsAvailable, turnaroundTime, setTurnaroundTime, commissionOpen,
    setCommissionOpen, listingType, setListingType, externalUrl, setExternalUrl,
    detectedPlatform, setDetectedPlatform, isService, isPhysical,
  } = form;
  const detailField = FIELD_CLASS;

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

  useEffect(() => {
    if (error || needsReauth) {
      messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error, needsReauth]);

  // Populate form for Edit Mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      // `price` is what the buyer pays, so on a live sale it holds the sale
      // price and the regular one is in originalPrice. Unpick that, or editing
      // a discounted listing would save the sale price as the new regular one.
      // A sale that has not started, or has already ended, still has to load —
      // `isOnSale` only says whether it is running right now.
      const running = !!initialData.isOnSale && !!initialData.originalPrice;
      const hasSale = running || !!initialData.salePrice;
      setPriceInput(formatPrice(running ? initialData.originalPrice! : initialData.price));
      setSalePriceInput(
        running ? formatPrice(initialData.price) : initialData.salePrice ? formatPrice(initialData.salePrice) : ''
      );
      setShowSaleFields(hasSale);
      // <input type="date"> wants YYYY-MM-DD; the record holds a datetime.
      setSaleStartsAt(initialData.saleStartsAt ? initialData.saleStartsAt.slice(0, 10) : '');
      setSaleEndsAt(initialData.saleEndsAt ? initialData.saleEndsAt.slice(0, 10) : '');
      setTaxInclusive(initialData.taxInclusive);
      setAcceptingOffers(!!initialData.acceptingOffers);
      setBillingPeriod(initialData.billingPeriod ?? '');

      // Editing a variant reopens on its product, with the option it already
      // is. The axis name comes from the group and is filled in once the
      // groups load, below.
      if (initialData.partOf) {
        setIsVariant(true);
        setGroupUri(initialData.partOf);
        setOptionValue(initialData.variantProperties?.[0]?.value || '');
      }

      setSku(initialData.sku || '');
      setGtin(initialData.gtin || '');
      setBrand(initialData.brand || '');
      setTagsInput((initialData.tags || []).join(', '));
      // The record may omit `value` for a feature row; the inputs are
      // controlled, so it comes back as an empty string rather than undefined.
      setSpecs((initialData.specifications || []).map(s => ({ name: s.name, value: s.value ?? '' })));
      setManageStock(!!initialData.manageStock);
      setQuantity(initialData.quantity !== undefined ? String(initialData.quantity) : '');
      setLowStockThreshold(initialData.lowStockThreshold !== undefined ? String(initialData.lowStockThreshold) : '');
      setSoldIndividually(!!initialData.soldIndividually);
      setShippingWeight(initialData.shippingWeight !== undefined ? String(initialData.shippingWeight) : '');
      setDimL(initialData.dimensions?.length !== undefined ? String(initialData.dimensions.length) : '');
      setDimW(initialData.dimensions?.width !== undefined ? String(initialData.dimensions.width) : '');
      setDimH(initialData.dimensions?.height !== undefined ? String(initialData.dimensions.height) : '');
      // Opened when there is something in it, so an edit never hides data.
      setShowMoreDetails(
        !!(initialData.sku || initialData.gtin || initialData.brand || initialData.tags?.length ||
           initialData.specifications?.length || initialData.manageStock ||
           initialData.soldIndividually || initialData.shippingWeight !== undefined ||
           initialData.dimensions)
      );
      setCurrency(initialData.currency || 'USD');
      setCondition(initialData.condition);
      setSelectedCategory(initialData.category);
      // A v1 record has no type; inferring from the category is what the
      // normalizer does for those, so the form agrees with the stored value.
      setListingType(
        initialData.type === 'digital'
          ? 'digital'
          : initialData.type === 'service' || initialData.category === 'digital_arts'
            ? 'service'
            : 'goods'
      );
      setCommissionOpen(initialData.metadata?.commissionStatus === 'closed' ? 'closed' : 'open');
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
          // Records may hold either the id (new) or the English name (old).
        const subId = resolveSubcategoryId(initialData.category, initialData.metadata!.subcategory);
        const subObj = categoryFn.subcategories.find(s => s.id === subId);
          if (subObj) {
            setSelectedSubcategory(subObj.id);
          }
        }
      }
    }
  }, [mode, initialData]);

  /**
   * The seller's existing products, loaded the first time the variant section
   * is opened rather than on mount — almost nobody groups anything, and this
   * costs a PDS round trip.
   */
  useEffect(() => {
    if (!isVariant || groupsLoaded.current || !client) return;
    groupsLoaded.current = true;

    client
      .listProductGroups()
      .then(setGroups)
      // An empty picker still lets the seller make a new product, which is the
      // common case anyway. Failing loudly here would block the whole form.
      .catch(() => setGroups([]));
  }, [isVariant, client]);

  /**
   * Adopt what the chosen product already knows.
   *
   * The options of one product share a description, a category and a type —
   * that is what makes them one product — so a seller adding the second tier
   * should not retype any of it. Only empty fields are filled: an edit in
   * progress is never overwritten, and neither is a variant that genuinely
   * differs.
   */
  useEffect(() => {
    if (groupUri === NEW_GROUP) return;
    const chosen = groups.find(g => g.uri === groupUri);
    if (!chosen) return;

    setAxisName(chosen.optionAxes[0]?.name || '');
    if (chosen.type) setListingType(chosen.type);
    setDescription(prev => (prev.trim() ? prev : chosen.description || ''));
    setSelectedCategory(prev => (prev ? prev : chosen.category || ''));
  }, [groupUri, groups]);

  /**
   * Suggest a title for a variant: the product's name plus this option's.
   *
   * Only while the title is untouched or still holds the last suggestion —
   * once the seller edits it, it is theirs and nothing rewrites it.
   */
  useEffect(() => {
    if (!isVariant) return;

    const productName =
      groupUri === NEW_GROUP
        ? groupTitle.trim()
        : groups.find(g => g.uri === groupUri)?.title || '';
    const suggestion = [productName, optionValue.trim()].filter(Boolean).join(' ');

    if (!suggestion) return;
    setTitle(prev => {
      if (prev.trim() && prev !== suggestedTitle.current) return prev;
      suggestedTitle.current = suggestion;
      return suggestion;
    });
  }, [isVariant, groupUri, groupTitle, optionValue, groups]);

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
      //
      // County is deliberately not required. The commerce lexicon has no county
      // field, so an upgraded listing comes back with an empty one — requiring
      // it here made every migrated listing impossible to save a second time.
      if (!isOnlineStore && (!locationData.state || !locationData.locality)) {
        setError(tCreate('errors.locationRequired'));
        setIsSubmitting(false);
        return;
      }

      // Validate price input before formatting
      // A seller taking offers may have no number in mind — that is the whole
      // point of the flag, and requiring one is what makes people type 0.
      if (!acceptingOffers && !priceInput.trim()) {
        setError(tCreate('errors.priceRequired'));
        setIsSubmitting(false);
        return;
      }

      // Format the price to ensure consistent decimal places
      const formattedPrice = formatPrice(priceInput);
      const priceValue = parseFloat(formattedPrice);

      // Free and "make me an offer" are different claims, and the lie needs
      // both at once: a price of zero to win the cheapest-first sort, and the
      // intention to negotiate. Sellers who want offers now have an honest
      // way to say so, so this combination is refused rather than tolerated.
      if (acceptingOffers && priceValue === 0 && priceInput.trim() !== '') {
        setError(tCreate('errors.freeAndOffers'));
        setIsSubmitting(false);
        return;
      }

      // Update the price input to show the formatted price
      setPriceInput(formattedPrice);

      if (showSaleFields && salePriceInput.trim()) {
        const saleValue = parseFloat(formatPrice(salePriceInput));
        if (!(saleValue < priceValue)) {
          setError(tCreate('errors.salePriceTooHigh'));
          setIsSubmitting(false);
          return;
        }
        if (saleStartsAt && saleEndsAt && saleEndsAt < saleStartsAt) {
          setError(tCreate('errors.saleDatesBackwards'));
          setIsSubmitting(false);
          return;
        }
      }

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

      // Something free cannot also be bought somewhere else. Checked here
      // rather than with the other price rules because the URL is not
      // processed until this point.
      if (priceValue === 0 && priceInput.trim() !== '' && processedExternalUrl) {
        setError(tCreate('errors.freeWithExternalUrl'));
        setIsSubmitting(false);
        return;
      }

      // The product this listing is one option of.
      //
      // Done before the listing is written, because the listing has to carry
      // the group's URI. If this throws, nothing has been saved yet — which is
      // the right order: a variant pointing at a product that failed to save
      // would be a listing nobody can find the siblings of.
      let variantLink: { partOf: string; variantProperties: Array<{ axis: string; value: string }> } | undefined;

      if (isVariant) {
        const axis = (axisName.trim() || tCreate('variantAxisDefault')).trim();
        const value = optionValue.trim();

        if (!value) {
          setError(tCreate('errors.variantValueRequired'));
          setIsSubmitting(false);
          return;
        }

        const existing = groupUri === NEW_GROUP ? undefined : groups.find(g => g.uri === groupUri);

        if (groupUri === NEW_GROUP && !groupTitle.trim()) {
          setError(tCreate('errors.variantProductRequired'));
          setIsSubmitting(false);
          return;
        }

        if (!existing && groupUri !== NEW_GROUP) {
          // A product was chosen but its record never loaded — the picker was
          // populated from a read that failed. Link to it and leave it alone:
          // writing a group we cannot see would overwrite an axis whose other
          // values we do not know, and take every sibling's ordering with it.
          variantLink = { partOf: groupUri, variantProperties: [{ axis, value }] };
        } else {
          // The axis carries every value any variant uses, and its order is the
          // order buyers see the options in. Adding this listing's value keeps
          // the two in step; an axis missing a value silently unsorts it.
          const values = existing
            ? Array.from(new Set([...(existing.optionAxes[0]?.values || []), value]))
            : [value];

          const saved = await client.saveProductGroup(
            {
              title: existing?.title || groupTitle.trim(),
              optionAxes: [{ name: existing?.optionAxes[0]?.name || axis, values }],
              // Mirrored from the listing: the lexicon calls the group the
              // source of truth for both, and a mismatch would put the product
              // in one category and its options in another.
              category: categoryId,
              type: listingType,
              // What the options share lives on the product, so the next
              // variant inherits it instead of the seller typing it again.
              // An existing description wins — this fills a gap, never
              // rewrites the product from whichever variant was saved last.
              description: existing?.description || description,
              defaultVariant: existing?.defaultVariant,
              sku: existing?.sku,
              specifications: existing?.specifications,
              taxonomy: existing?.taxonomy,
            },
            existing?.uri,
          );

          variantLink = {
            partOf: saved.uri,
            variantProperties: [{ axis: saved.optionAxes[0]?.name || axis, value }],
          };
        }
      }

      // Create custom metadata for inclusion in description
      // The id, not the display name. Storing "Vintage Items" locale-locked the
      // record and broke every reverse lookup the moment a name was reworded.
      const metadata: Record<string, any> = {
        subcategory: subcategory || undefined
      };

      // Store detected platform in metadata for badge display
      if (detectedPlatform) {
        // Convert display name to key (e.g., "Shopify" -> "shopify")
        metadata.externalPlatform = detectedPlatform.toLowerCase().replace(/\s+/g, '');
      }

      // Commission-specific metadata. Keyed on the listing type, not the
      // category — a seller offering a service outside digital_arts still has
      // slots and a turnaround, and the fields are shown to them.
      if (isService) {
        if (slotsAvailable !== '') {
          const slots = parseInt(slotsAvailable, 10);
          metadata.slotsAvailable = slots;
        }
        if (turnaroundTime.trim()) {
          metadata.turnaroundTime = turnaroundTime.trim();
        }
        // commissionStatus is derived on read, never stored — the record says
        // whether the seller is available, and the badge follows from that.
        metadata.commissionStatus =
          commissionOpen === 'closed'
            ? 'closed'
            : slotsAvailable !== '' && parseInt(slotsAvailable, 10) === 0
              ? 'waitlist'
              : 'open';
      }

      // Prepare listing data with metadata embedded as JSON
      const listingDataRaw = {
        type: listingType,
        // Only sent when the seller actually set one; an empty field is not a
        // sale, and toMinorUnits turns it into null either way.
        ...(showSaleFields && salePriceInput.trim() && {
          salePrice: formatPrice(salePriceInput),
          saleStartsAt: saleStartsAt ? new Date(`${saleStartsAt}T00:00:00Z`).toISOString() : undefined,
          saleEndsAt: saleEndsAt ? new Date(`${saleEndsAt}T23:59:59Z`).toISOString() : undefined,
        }),
        ...(taxInclusive !== undefined && { taxInclusive }),
        ...(acceptingOffers && { acceptingOffers: true }),
        // Recurrence describes an amount, so with no amount there is nothing
        // for it to describe. A listing taking offers can say "per year" once
        // it names a number, and not before.
        ...(billingPeriod && priceValue > 0 && { billingPeriod }),
        // Both or neither: variantProperties without partOf names an axis on
        // no product. legacy-input enforces the same pairing.
        ...(variantLink ?? {}),

        // Blank fields are left out entirely rather than sent as empty
        // strings, so nothing writes a field the seller did not fill in.
        ...(sku.trim() && { sku: sku.trim() }),
        ...(gtin.trim() && { gtin: gtin.trim() }),
        ...(brand.trim() && { brand: brand.trim() }),
        ...(parseTags(tagsInput).length > 0 && { tags: parseTags(tagsInput) }),
        ...(cleanSpecs(specs).length > 0 && { specifications: cleanSpecs(specs) }),
        ...(manageStock && {
          manageStock: true,
          ...(quantity.trim() !== '' && { quantity: parseInt(quantity, 10) }),
          ...(lowStockThreshold.trim() !== '' && { lowStockThreshold: parseInt(lowStockThreshold, 10) }),
        }),
        ...(soldIndividually && { soldIndividually: true }),
        ...(isPhysical && numberOrUndefined(shippingWeight) !== undefined && {
          shippingWeight: numberOrUndefined(shippingWeight),
        }),
        ...(isPhysical && (numberOrUndefined(dimL) !== undefined || numberOrUndefined(dimW) !== undefined || numberOrUndefined(dimH) !== undefined) && {
          dimensions: {
            length: numberOrUndefined(dimL),
            width: numberOrUndefined(dimW),
            height: numberOrUndefined(dimH),
          },
        }),
        // The lexicon's own availability field. Only meaningful for services
        // today; goods listings do not ask, so it stays unset for them.
        ...(isService && { availability: commissionOpen === 'closed' ? 'out_of_stock' : 'in_stock' }),
        title: formData.get('title') as string,
        description: description,
        price: formattedPrice,
        currency: currency,
        location: locationData,
        category: categoryId,
        condition: isPhysical ? (formData.get('condition') as string) : '',
        images: images as any, // The client handles mixed types now
        hideFromFriends: hideFromFriends,
        isNsfw: isNsfw,
        metadata: metadata,
        ...(processedExternalUrl && { externalUrl: processedExternalUrl })
      };



      let result;
      if (mode === 'edit' && initialData && initialData.uri) {
        // Editing an old listing moves it to the commerce collection, which
        // changes its URI. Redirect to where the record actually ended up —
        // the old URI is deleted by then and would 404.
        const updated = await client.updateListing(initialData.uri, listingDataRaw);
        result = { uri: updated.uri };
      } else {
        // Create new listing
        result = await client.createListing(listingDataRaw);

        // Post to Bluesky feed if requested (only for new listings).
        // Never when the listing is hidden from friends: that post lands in
        // the feeds of the seller's followers, which is the audience the flag
        // exists to keep it from. The checkbox is disabled in that case, but
        // it defaults to on, so this guard is what actually decides.
        if (postToBluesky && !hideFromFriends && result && result.uri) {
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
      saveLocation(form, locationData);

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
      // A missing permission is not a failure the seller can fix by retrying,
      // so it gets its own message and a way out instead of a raw OAuth error.
      if (err instanceof InsufficientScopeError) {
        setNeedsReauth(true);
        setError(null);
      } else {
        setError(tCreate('errors.submitFailed', {
          action: mode === 'edit' ? tCreate('errors.actionUpdate') : tCreate('errors.actionCreate'),
          message: err instanceof Error ? err.message : String(err)
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <ListingFormProvider value={form}>
    <div className="max-w-7xl mx-auto p-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Form Column */}
        <div className="flex-1 min-w-0">
          <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
            <div ref={messageRef}>
            {needsReauth && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded mb-4">
                <p className="font-semibold mb-1">{tCreate('errors.reauthTitle')}</p>
                <p className="mb-3 text-sm">{tCreate('errors.reauthBody')}</p>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-4 py-2 bg-primary-color hover:bg-primary-light text-white rounded-md text-sm"
                >
                  {tCreate('errors.reauthAction')}
                </button>
              </div>
            )}

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

            </div>

            {/* Free Category Confirmation Dialog */}

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
              <TypeSelectorSection />

              <VariantSection />

              <MagicImportSection />

              {/* Photos Section */}

              <ImagesSection />

              <DetailsSection mode={mode} />

              <LocationSection />

              <CatalogueSection />

              <VisibilitySection />

              <SubmitSection mode={mode} />

            </form>
          </div>
        </div>

        {/* Live Preview Column - Hidden on mobile/tablet, visible on desktop */}
        <div className="hidden lg:block w-96 flex-shrink-0">
          <LiveListingPreview
            title={title}
            price={priceInput}
            currency={currency}
            salePrice={showSaleFields ? salePriceInput : ''}
            saleStartsAt={saleStartsAt}
            saleEndsAt={saleEndsAt}
            billingPeriod={billingPeriod}
            description={description}
            category={selectedCategory}
            condition={condition}
            listingType={listingType}
            slotsAvailable={slotsAvailable}
            location={{
              locality: locationLocality,
              state: locationState,
              isOnlineStore
            }}
            imageUrls={previewUrls}
            isNsfw={isNsfw}
          />
        </div>
      </div>


    </div>
    </ListingFormProvider>
  );
}
