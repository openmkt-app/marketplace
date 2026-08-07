// Every piece of state the listing form holds, in one hook.
//
// CreateListingForm was 2,700 lines, and roughly sixty of them were useState
// calls at the top. Nothing could be pulled out into a section component while
// every section read its values from that one closure.
//
// This is a lift, not a redesign: the same state, the same initial values, the
// same names. What it buys is that a section can now take the bag and read what
// it needs, which is what makes the form splittable at all.

import { useRef, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { ListingImage } from '@/lib/marketplace-client';
import type { SubcategoryOption } from '@/lib/category-data';
import type { BillingPeriod, ListingType, ProductGroup } from '@/lib/commerce/types';

/** Sentinel for "make a new product" in the group picker. Not an AT URI. */
export const NEW_GROUP = '__new__';

/** Shared input styling, so sections do not each invent their own. */
export const FIELD_CLASS =
  'w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light';

export interface SavedLocation {
  name: string;
  state: string;
  county: string;
  locality: string;
  zipPrefix?: string;
  isOnlineStore?: boolean;
}

export function useListingFormState() {
  // --- submission and messaging ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the PDS refuses a write because the session predates the commerce
  // collection being added to the OAuth scopes. Signing in again fixes it.
  const [needsReauth, setNeedsReauth] = useState(false);
  // The banners sit at the top of a very long form. Submitting from the bottom
  // showed the message off screen, which reads as nothing having happened.
  const messageRef = useRef<HTMLDivElement>(null);

  // --- media ---
  const [images, setImages] = useState<(File | ListingImage)[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- visibility ---
  const [hideFromFriends, setHideFromFriends] = useState(false);
  const [isNsfw, setIsNsfw] = useState(false);
  const [postToBluesky, setPostToBluesky] = useState(true);

  // --- bot follow gate ---
  const [isFollowingBotState, setIsFollowingBotState] = useState(false);
  const [isCheckingFollow, setIsCheckingFollow] = useState(true);

  // --- taxonomy ---
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);

  // --- location ---
  const [savedLocations, setSavedLocations] = useLocalStorage<SavedLocation[]>('saved-locations', []);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoSuccess, setGeoSuccess] = useState<boolean | null>(null);
  const [locationSaved, setLocationSaved] = useState(false);
  const [locationState, setLocationState] = useState('');
  const [locationCounty, setLocationCounty] = useState('');
  const [locationLocality, setLocationLocality] = useState('');
  const [locationZip, setLocationZip] = useState('');
  const [isOnlineStore, setIsOnlineStore] = useState(false);

  // --- price ---
  const [currency, setCurrency] = useState('USD');
  const [priceInput, setPriceInput] = useState('');
  const [salePriceInput, setSalePriceInput] = useState('');
  const [saleStartsAt, setSaleStartsAt] = useState('');
  const [saleEndsAt, setSaleEndsAt] = useState('');
  const [showSaleFields, setShowSaleFields] = useState(false);
  const [taxInclusive, setTaxInclusive] = useState<boolean | undefined>(undefined);
  const [acceptingOffers, setAcceptingOffers] = useState(false);
  // Empty means a one-off price, which is what every listing was until now.
  const [billingPeriod, setBillingPeriod] = useState<'' | BillingPeriod>('');

  // --- variants ---
  //
  // A listing is one option of a product — a tier, a size, a colour — and the
  // product itself is a separate record every option points at. `groupUri` is
  // the chosen existing product, or NEW_GROUP to make one.
  const [isVariant, setIsVariant] = useState(false);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [groupUri, setGroupUri] = useState<string>(NEW_GROUP);
  const [groupTitle, setGroupTitle] = useState('');
  const [axisName, setAxisName] = useState('');
  const [optionValue, setOptionValue] = useState('');
  const groupsLoaded = useRef(false);
  /** The last title this form suggested, so a seller's own wording survives. */
  const suggestedTitle = useRef('');

  // --- catalogue detail ---
  //
  // Folded away by default: someone selling one used chair needs none of it,
  // and a form that opens with twelve empty boxes reads as twelve things you
  // are expected to fill in.
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [sku, setSku] = useState('');
  const [gtin, setGtin] = useState('');
  const [brand, setBrand] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [specs, setSpecs] = useState<Array<{ name: string; value: string }>>([]);
  const [manageStock, setManageStock] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [soldIndividually, setSoldIndividually] = useState(false);
  const [shippingWeight, setShippingWeight] = useState('');
  const [dimL, setDimL] = useState('');
  const [dimW, setDimW] = useState('');
  const [dimH, setDimH] = useState('');

  // --- core fields ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');

  // --- services ---
  const [slotsAvailable, setSlotsAvailable] = useState('');
  const [turnaroundTime, setTurnaroundTime] = useState('');
  // Whether the seller is taking commissions. Stored as the lexicon's
  // `availability`, which is why "closed" finally has somewhere to live.
  const [commissionOpen, setCommissionOpen] = useState<'open' | 'closed'>('open');

  // The listing's own type, not a guess from its category. Gallery/Mall routing
  // and the commission fields key on this, so a seller can offer a service
  // without being forced into one particular category.
  const [listingType, setListingType] = useState<ListingType>('goods');

  // --- external commerce ---
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlError, setExternalUrlError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  // --- magic import ---
  const [magicLinkUrl, setMagicLinkUrl] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [magicNote, setMagicNote] = useState<string | null>(null);
  const [etsyListingId, setEtsyListingId] = useState<string | null>(null);
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const etsyCsvInputRef = useRef<HTMLInputElement>(null);

  return {
    isSubmitting, setIsSubmitting,
    error, setError,
    needsReauth, setNeedsReauth,
    messageRef,

    images, setImages,
    previewUrls, setPreviewUrls,
    fileInputRef,

    hideFromFriends, setHideFromFriends,
    isNsfw, setIsNsfw,
    postToBluesky, setPostToBluesky,

    isFollowingBotState, setIsFollowingBotState,
    isCheckingFollow, setIsCheckingFollow,

    selectedCategory, setSelectedCategory,
    selectedSubcategory, setSelectedSubcategory,
    subcategories, setSubcategories,

    savedLocations, setSavedLocations,
    selectedLocation, setSelectedLocation,
    isLocationExpanded, setIsLocationExpanded,
    isGeolocating, setIsGeolocating,
    geoSuccess, setGeoSuccess,
    locationSaved, setLocationSaved,
    locationState, setLocationState,
    locationCounty, setLocationCounty,
    locationLocality, setLocationLocality,
    locationZip, setLocationZip,
    isOnlineStore, setIsOnlineStore,

    currency, setCurrency,
    priceInput, setPriceInput,
    salePriceInput, setSalePriceInput,
    saleStartsAt, setSaleStartsAt,
    saleEndsAt, setSaleEndsAt,
    showSaleFields, setShowSaleFields,
    taxInclusive, setTaxInclusive,
    acceptingOffers, setAcceptingOffers,
    billingPeriod, setBillingPeriod,

    isVariant, setIsVariant,
    groups, setGroups,
    groupUri, setGroupUri,
    groupTitle, setGroupTitle,
    axisName, setAxisName,
    optionValue, setOptionValue,
    groupsLoaded,
    suggestedTitle,

    showMoreDetails, setShowMoreDetails,
    sku, setSku,
    gtin, setGtin,
    brand, setBrand,
    tagsInput, setTagsInput,
    specs, setSpecs,
    manageStock, setManageStock,
    quantity, setQuantity,
    lowStockThreshold, setLowStockThreshold,
    soldIndividually, setSoldIndividually,
    shippingWeight, setShippingWeight,
    dimL, setDimL,
    dimW, setDimW,
    dimH, setDimH,

    title, setTitle,
    description, setDescription,
    condition, setCondition,

    slotsAvailable, setSlotsAvailable,
    turnaroundTime, setTurnaroundTime,
    commissionOpen, setCommissionOpen,
    listingType, setListingType,

    externalUrl, setExternalUrl,
    externalUrlError, setExternalUrlError,
    detectedPlatform, setDetectedPlatform,

    magicLinkUrl, setMagicLinkUrl,
    isMagicLoading, setIsMagicLoading,
    magicError, setMagicError,
    magicNote, setMagicNote,
    etsyListingId, setEtsyListingId,
    isCsvLoading, setIsCsvLoading,
    csvError, setCsvError,
    etsyCsvInputRef,

    // Derived, kept here so every section agrees on what the type means.
    // Weight, size and condition describe something you can hold; neither a
    // commission nor a download has any of them.
    isService: listingType === 'service',
    isDigital: listingType === 'digital',
    isPhysical: listingType === 'goods',
  };
}

export type ListingFormState = ReturnType<typeof useListingFormState>;
