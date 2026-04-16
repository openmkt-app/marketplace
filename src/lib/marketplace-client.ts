// src/lib/marketplace-client.ts
import { Agent, AtpAgent, RichText } from '@atproto/api';
import { generateImageUrls, compressImage } from './image-utils';
import logger from './logger';
import { getKnownMarketplaceDIDs, addMarketplaceDID, ensureVerifiedSellersLoaded } from './marketplace-dids';

import { MARKETPLACE_COLLECTION } from './constants';
import type { OAuthSession } from './oauth-client';

// Define types for our marketplace listings
export type ListingLocation = {
  state: string;
  county: string;
  locality: string;
  zipPrefix?: string;
  isOnlineStore?: boolean;
};

export type ListingImage = {
  ref: {
    $link: string;
  };
  mimeType: string;
  size: number;
};

export type ListingMetadata = {
  subcategory?: string;
  [key: string]: any;
};

export type MarketplaceListing = {
  title: string;
  description: string;
  price: string;
  currency?: string;
  images?: ListingImage[];
  location: ListingLocation;
  category: string;
  condition: string;
  createdAt: string;
  // Added for listing metadata, like subcategory
  metadata?: ListingMetadata;
  // Added for external commerce
  externalUrl?: string;
  // Added for UI display
  formattedImages?: Array<{
    thumbnail: string;
    fullsize: string;
    mimeType: string;
  }>;
  // Added for listing identification
  uri?: string;
  cid?: string;
  // Added for seller information
  sellerDid?: string;
  authorDid?: string;
  authorHandle?: string;
  authorDisplayName?: string;
  authorAvatarCid?: string;
  // Added for display and filtering
  isVerifiedSeller?: boolean;
  isSameNetwork?: boolean;
  lastViewed?: string;
  // Added for privacy
  hideFromFriends?: boolean;
  // Content moderation
  labels?: any;
  isNsfw?: boolean;
};

export type CreateListingParams = Omit<MarketplaceListing, 'createdAt'>;

// Kept for any external consumers that may import it
export type SessionData = { did: string; handle: string; accessJwt: string; refreshJwt: string };

// Add a cache interface for marketplace listings
interface ListingsCache {
  data: (MarketplaceListing & {
    authorDid: string;
    authorHandle: string;
    uri: string;
    cid: string;
  })[];
  timestamp: number;
  cacheTTL: number;
  isValid: () => boolean;
}

// Define a type for post records
interface PostRecord {
  $type: string;
  location?: ListingLocation;
  // Add other fields as needed
}

export class MarketplaceClient {
  agent: Agent;
  isLoggedIn: boolean;
  private _handle: string | undefined;
  // Cache and rate limit tracking
  private listingsCache: ListingsCache | null;
  private lastApiCall: number;
  private cacheTTL: number;
  private rateLimitInterval: number;

  constructor() {
    // Start with an unauthenticated agent; replaced by setOAuthSession() after login
    this.agent = new AtpAgent({ service: 'https://bsky.social' }) as Agent;
    this.isLoggedIn = false;
    this._handle = undefined;
    this.listingsCache = null;
    this.lastApiCall = 0;
    this.cacheTTL = 5 * 60 * 1000;
    this.rateLimitInterval = 30 * 1000;
  }

  /**
   * Configure the client with an authenticated OAuth session.
   * Called by AuthContext after a successful OAuth login or session restore.
   */
  setOAuthSession(oauthSession: OAuthSession, did: string, handle: string): void {
    this.agent = new Agent(oauthSession);
    this._handle = handle;
    this.isLoggedIn = true;
    this.listingsCache = null; // Invalidate cache on session change
    logger.info('OAuth session configured', { meta: { did, handle } });
  }

  logout(): void {
    this.isLoggedIn = false;
    this._handle = undefined;
  }

  async createListing(listingData: CreateListingParams): Promise<Record<string, unknown>> {
    if (!this.isLoggedIn || !this.agent.did) {
      throw new Error('User must be logged in to create a listing');
    }

    try {
      // Upload images first if they exist (handling File objects from form)
      let processedImages;
      if (listingData.images && Array.isArray(listingData.images)) {
        // cast images to File[] as we know they are files at this point from usage
        processedImages = await this.processImages(listingData.images as unknown as File[]);
      }

      // Create a copy of the listing data without the images property
      // This prevents issues with the original File objects being passed to the API
      const {

        images: _,
        ...listingDataWithoutImages
      } = listingData;

      // Create the listing record
      logger.info('Creating listing', {
        meta: {
          title: listingDataWithoutImages.title,
          category: listingDataWithoutImages.category,
          subcategory: listingDataWithoutImages.metadata?.subcategory,
          imageCount: processedImages ? processedImages.length : 0,
          hideFromFriends: listingDataWithoutImages.hideFromFriends || false
        }
      });

      logger.logApiRequest('POST', 'com.atproto.repo.createRecord', {
        collection: MARKETPLACE_COLLECTION,
        imageCount: processedImages ? processedImages.length : 0,
        hideFromFriends: listingDataWithoutImages.hideFromFriends || false
      });

      // Construct labels if NSFW is checked
      const labels = listingDataWithoutImages.isNsfw ? {
        $type: 'com.atproto.label.defs#selfLabels',
        values: [{ val: 'nsfw' }]
      } : undefined;

      // Construct the record with ONLY the fields defined in the lexicon
      // This prevents 'authorHandle' or other hydrated fields from polluting the PDS record
      const recordToCreate: Record<string, any> = {
        title: listingDataWithoutImages.title,
        price: listingDataWithoutImages.price,
        currency: listingDataWithoutImages.currency,
        category: listingDataWithoutImages.category,
        condition: listingDataWithoutImages.condition,
        description: listingDataWithoutImages.description,
        location: listingDataWithoutImages.location,
        images: processedImages,
        createdAt: new Date().toISOString(),
        hideFromFriends: listingDataWithoutImages.hideFromFriends || false,
        metadata: listingDataWithoutImages.metadata || {},
        externalUrl: listingDataWithoutImages.externalUrl,
        $type: MARKETPLACE_COLLECTION
      };

      if (labels) {
        recordToCreate.labels = labels;
      }

      const result = await this.agent.api.com.atproto.repo.createRecord({
        repo: this.agent.accountDid,
        collection: MARKETPLACE_COLLECTION,
        record: recordToCreate,
      });

      // Handle standard AT Proto response shape { data: { uri, cid }, success: boolean }
      const recordData = result.data ? result.data : result;

      return {
        ...(recordData as unknown as Record<string, unknown>),
        images: processedImages // Return the blobs so we can use them for sharing
      };
    } catch (error) {
      console.error('Failed to create listing:', error);
      throw error;
    }
  }

  /**
   * Delete a listing from the marketplace
   */
  async deleteListing(uri: string): Promise<void> {
    if (!this.isLoggedIn || !this.agent.did) {
      throw new Error('User must be logged in to delete a listing');
    }

    try {
      logger.info(`Attempting to delete listing: ${uri}`);

      // Parse URI to get repo, collection, and rkey
      // URI format: at://did:plc:xxx/app.atprotomkt.marketplace.listing/rkey
      const uriParts = uri.replace('at://', '').split('/');

      if (uriParts.length !== 3) {
        throw new Error(`Invalid URI format: ${uri}`);
      }

      const [repo, collection, rkey] = uriParts;

      // Verify ownership (repo must match session DID)
      if (repo !== this.agent.did) {
        throw new Error('You can only delete your own listings');
      }

      logger.logApiRequest('POST', 'com.atproto.repo.deleteRecord', {
        repo,
        collection,
        rkey
      });

      await this.agent.api.com.atproto.repo.deleteRecord({
        repo,
        collection,
        rkey
      });

      logger.info(`Successfully deleted listing: ${uri}`);

      // Invalidate cache
      this.listingsCache = null;

    } catch (error) {
      logger.error('Failed to delete listing', error as Error);
      throw error;
    }
  }

  /**
   * Update an existing listing
   */
  async updateListing(uri: string, listingData: CreateListingParams & { images?: (File | ListingImage)[] }): Promise<void> {
    if (!this.isLoggedIn || !this.agent.did) {
      throw new Error('User must be logged in to update a listing');
    }

    try {
      logger.info(`Attempting to update listing: ${uri}`);

      // Parse URI
      const uriParts = uri.replace('at://', '').split('/');
      if (uriParts.length !== 3) {
        throw new Error(`Invalid URI format: ${uri}`);
      }
      const [repo, collection, rkey] = uriParts;

      // Verify ownership
      if (repo !== this.agent.did) {
        throw new Error('You can only update your own listings');
      }

      // Process images
      // We essentially need to build the final list of image blobs
      let finalImages: ListingImage[] | undefined = undefined;

      if (listingData.images && Array.isArray(listingData.images) && listingData.images.length > 0) {
        finalImages = [];
        const filesToUpload: File[] = [];

        // Separate existing images from new files
        // We use a robust check: if it's a File, upload it. Otherwise, assume it's a valid existing image record.
        for (const img of listingData.images) {
          if (img instanceof File) {
            // It's a new File to upload
            filesToUpload.push(img);
          } else {
            // It's an existing ListingImage blob (from initialData)
            // We preserve it as is
            finalImages.push(img as ListingImage);
          }
        }

        // Upload new files if any
        if (filesToUpload.length > 0) {
          const uploadedImages = await this.processImages(filesToUpload);
          if (uploadedImages) {
            finalImages.push(...uploadedImages);
          }
        }
      }

      // Create record data excluding the raw images array
      const {
        images: _,
        ...listingDataWithoutImages
      } = listingData;

      logger.info('Updating listing record', {
        meta: {
          uri,
          title: listingDataWithoutImages.title,
          imageCount: finalImages ? finalImages.length : 0
        }
      });

      // Construct labels if NSFW is checked
      const labels = listingDataWithoutImages.isNsfw ? {
        $type: 'com.atproto.label.defs#selfLabels',
        values: [{ val: 'nsfw' }]
      } : undefined;

      // Construct the record with ONLY the fields defined in the lexicon
      const recordToUpdate: Record<string, any> = {
        title: listingDataWithoutImages.title,
        price: listingDataWithoutImages.price,
        currency: listingDataWithoutImages.currency,
        category: listingDataWithoutImages.category,
        condition: listingDataWithoutImages.condition,
        description: listingDataWithoutImages.description,
        location: listingDataWithoutImages.location,
        images: finalImages,
        createdAt: new Date().toISOString(), // Bumps to top of feed
        hideFromFriends: listingDataWithoutImages.hideFromFriends || false,
        metadata: listingDataWithoutImages.metadata || {},
        externalUrl: listingDataWithoutImages.externalUrl,
        $type: MARKETPLACE_COLLECTION
      };

      if (labels) {
        recordToUpdate.labels = labels;
      }

      // Use putRecord to overwrite
      await this.agent.api.com.atproto.repo.putRecord({
        repo,
        collection,
        rkey,
        record: recordToUpdate
      });

      // Invalidate cache
      this.listingsCache = null;

    } catch (error) {
      logger.error('Failed to update listing', error as Error);
      throw error;
    }
  }

  private async processImages(imageFiles?: File[]): Promise<ListingImage[] | undefined> {
    if (!imageFiles || imageFiles.length === 0) {
      return undefined;
    }

    const processedImages: ListingImage[] = [];
    const MAX_SIZE_BYTES = 980000; // Slightly below 1MB to be safe

    for (let file of imageFiles) {
      try {
        logger.debug(`Processing image: ${file.name}`, {
          meta: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        });

        // Check file type to ensure it's an image
        if (!file.type.startsWith('image/')) {
          logger.warn(`File ${file.name} is not an image (${file.type}), skipping`);
          continue;
        }

        // Compress image if it exceeds size limit
        if (file.size > MAX_SIZE_BYTES) {
          logger.info(`Image ${file.name} is ${(file.size / 1024).toFixed(0)}KB, compressing...`);

          const compressionResult = await compressImage(file, 900, 2048);

          if (compressionResult.wasCompressed && compressionResult.newSize <= MAX_SIZE_BYTES) {
            logger.info(`Compressed ${file.name}: ${(compressionResult.originalSize / 1024).toFixed(0)}KB -> ${(compressionResult.newSize / 1024).toFixed(0)}KB`);
            file = compressionResult.file;
          } else {
            logger.warn(`Could not compress ${file.name} below 1MB (${(compressionResult.newSize / 1024).toFixed(0)}KB), skipping`);
            continue;
          }
        }

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        logger.debug(`Uploading image: ${file.name}, bytes length: ${bytes.length}`);
        logger.logApiRequest('POST', 'com.atproto.repo.uploadBlob', {
          fileName: file.name,
          fileType: file.type,
          fileSize: bytes.length
        });

        const result = await this.agent.uploadBlob(bytes, {
          encoding: file.type,
        });

        if (result.success) {
          logger.debug('Image upload successful', {
            meta: {
              blob: result.data.blob
            }
          });
          logger.logApiResponse('POST', 'com.atproto.repo.uploadBlob', 200, {
            blobRef: result.data.blob.ref.$link
          });
          processedImages.push(result.data.blob);
        } else {
          logger.error('Image upload failed without throwing an error');
        }
      } catch (error) {
        logger.error('Failed to upload image', error as Error);
        // Continue with other images even if one fails
      }
    }

    logger.info(`Processed ${processedImages.length} images successfully`);
    return processedImages.length > 0 ? processedImages : undefined;
  }

  async getListingsByLocation(
    state: string,
    county: string,
    locality?: string
  ): Promise<MarketplaceListing[]> {
    try {
      logger.info(`Fetching listings by location - state: ${state}, county: ${county}, locality: ${locality || 'any'}`);

      // Get all marketplace listings from the network using search API
      const allListings = await this.searchMarketplaceListings();

      // Filter listings by location
      const filteredListings = allListings.filter(listing => {
        const location = listing.location;

        if (!location) return false;

        const stateMatch = location.state.toLowerCase() === state.toLowerCase();
        const countyMatch = location.county.toLowerCase() === county.toLowerCase();

        if (locality) {
          const localityMatch = location.locality.toLowerCase() === locality.toLowerCase();
          return stateMatch && countyMatch && localityMatch;
        }

        return stateMatch && countyMatch;
      });

      logger.info(`Found ${filteredListings.length} listings matching location criteria`);

      return filteredListings;
    } catch (error) {
      logger.error('Failed to retrieve listings', error as Error);
      throw error;
    }
  }

  /**
   * Get all marketplace listings from known DIDs
   * This is the optimized approach - directly fetch from the DID registry
   */
  async getAllListings(): Promise<MarketplaceListing[]> {
    try {
      logger.info('Fetching all marketplace listings from known DIDs');

      const listings: (MarketplaceListing & {
        authorDid: string;
        authorHandle: string;
        uri: string;
        cid: string;
      })[] = [];

      if (!this.isLoggedIn || !this.agent.did) {
        logger.warn('User is not logged in');
        return [];
      }

      // Get known DIDs from registry, ensuring verified sellers are loaded
      await ensureVerifiedSellersLoaded();
      const knownMarketplaceDIDs = getKnownMarketplaceDIDs();
      logger.info(`Fetching from ${knownMarketplaceDIDs.length} known marketplace DIDs`);

      // Fetch from known DIDs with a concurrency limit to avoid bursting plc.directory
      // and PDS endpoints simultaneously (causes 429s under load)
      const CONCURRENCY = 5;
      const allListingsArrays: (typeof listings)[] = [];
      for (let i = 0; i < knownMarketplaceDIDs.length; i += CONCURRENCY) {
        const chunk = knownMarketplaceDIDs.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.all(
          chunk.map(async (did) => {
            try {
              logger.info(`Fetching listings from DID: ${did}`);
              const didListings = await this.getUserListings(did);
              logger.info(`Found ${didListings.length} listings from DID ${did}`);
              return didListings;
            } catch (error) {
              logger.warn(`Failed to fetch listings from DID ${did}`, error as Error);
              return [];
            }
          })
        );
        allListingsArrays.push(...chunkResults);
      }

      // Flatten and deduplicate
      allListingsArrays.forEach(didListings => {
        didListings.forEach(listing => {
          if (!listings.some(existing => existing.uri === listing.uri)) {
            listings.push(listing);
          }
        });
      });

      logger.info(`Total marketplace listings found: ${listings.length}`);

      // Add formatted image URLs for each listing
      const processedListings = listings.map(listing => {
        const formattedImages = generateImageUrls(listing.authorDid, listing.images);
        return {
          ...listing,
          formattedImages
        };
      });

      // Filter out listings that should be hidden from friends
      return await this.filterHiddenListings(processedListings);
    } catch (error) {
      logger.error('Failed to retrieve all listings', error as Error);
      throw error;
    }
  }

  /**
   * Resolve the PDS (Personal Data Server) for a given DID
   */
  private async resolvePDS(did: string): Promise<string | null> {
    try {
      let didDocUrl: string;
      if (did.startsWith('did:web:')) {
        const domain = did.slice('did:web:'.length);
        didDocUrl = `https://${domain}/.well-known/did.json`;
      } else {
        didDocUrl = `https://plc.directory/${did}`;
      }

      const response = await fetch(didDocUrl);
      if (!response.ok) return null;

      const didDoc = await response.json();
      const pdsService = didDoc.service?.find((s: any) =>
        s.type === 'AtprotoPersonalDataServer'
      );

      return pdsService?.serviceEndpoint || null;
    } catch (error) {
      logger.warn(`Could not resolve PDS for ${did}, using default agent`, error as Error);
      return null;
    }
  }

  /**
   * Get a user's own marketplace listings
   */
  async getUserListings(userDid?: string): Promise<(MarketplaceListing & {
    authorDid: string;
    authorHandle: string;
    uri: string;
    cid: string;
  })[]> {
    if (!this.isLoggedIn && !userDid) {
      return [];
    }

    try {
      const did = userDid || this.agent.accountDid;
      // Use the known handle for the logged-in user; for other DIDs use the DID itself
      // as a placeholder — the browse page enriches listings with real handles separately.
      const handle = userDid ? did : (this._handle ?? did);

      // If fetching from a different user, create a temporary agent with their PDS
      let agentToUse = this.agent;
      if (userDid && userDid !== this.agent.did) {
        const userPDS = await this.resolvePDS(userDid);
        if (userPDS) {
          logger.info(`Resolved PDS for ${userDid}: ${userPDS}`);
          agentToUse = new AtpAgent({ service: userPDS }) as Agent;
        } else {
          logger.warn(`Could not resolve PDS for ${userDid}, using default agent`);
        }
      }

      // Look for listings in the supported namespace
      const validTypes = [MARKETPLACE_COLLECTION];
      const allListings: (MarketplaceListing & {
        authorDid: string;
        authorHandle: string;
        uri: string;
        cid: string;
      })[] = [];

      // Get listings from the collection
      for (const collection of validTypes) {
        try {
          logger.logApiRequest('GET', 'com.atproto.repo.listRecords', {
            repo: did,
            collection
          });

          const result = await agentToUse.api.com.atproto.repo.listRecords({
            repo: did,
            collection,
            limit: 50
          });

          if (result.success && result.data.records.length > 0) {
            // Process the listings
            const typedListings = result.data.records.map(record => {
              return {
                ...record.value as MarketplaceListing,
                authorDid: did,
                authorHandle: handle,
                uri: record.uri,
                cid: record.cid,
              };
            });

            allListings.push(...typedListings);
          }
        } catch (error) {
          logger.warn(`Failed to fetch ${collection} listings for ${did}`, error as Error);
        }
      }

      // Add formatted image URLs for each listing
      const processedListings = allListings.map(listing => {
        const formattedImages = generateImageUrls(listing.authorDid, listing.images);
        return {
          ...listing,
          formattedImages
        };
      });

      return processedListings;
    } catch (error) {
      logger.error('Failed to get user listings', error as Error);
      return [];
    }
  }

  /**
   * Post the listing to the user's Bluesky feed
   */
  async shareListingOnBluesky(listingData: Record<string, any>, uri: string): Promise<void> {
    if (!this.isLoggedIn || !this.agent.did) {
      throw new Error('User must be logged in to share a listing');
    }

    try {
      logger.info(`Sharing listing to Bluesky feed: ${uri}`);
      logger.info(`Listing data images:`, { meta: { images: listingData.images } });

      // Construct the web URL for the listing
      // We use the encoded URI as the ID to ensure it can be resolved
      const listingUrl = `https://openmkt.app/listing/${encodeURIComponent(uri)}`;

      // Category to Hashtag Mapping
      const categoryHashtags: Record<string, string> = {
        'antiques': '#Antiques #Vintage',
        'apparel': '#Fashion #Thrifting',
        'auto': '#CarParts #ProjectCar',
        'baby': '#BabyGear #Parenting',
        'books': '#BookSky #Books',
        'business': '#SmallBiz #Office',
        'cameras': '#Photography #CameraGear',
        'cell_phones': '#Tech #Mobile',
        'collectibles': '#Collectibles #RareFinds',
        'computers': '#Tech #HomeLab',
        'electronics': '#Tech #Gadgets',
        'entertainment': '#BoardGames #Fun',
        'free': '#FreeStuff #Giving',
        'furniture': '#Furniture #InteriorDesign',
        'garden': '#Gardening #PlantSky',
        'health': '#Wellness #SelfCare',
        'hobbies': '#Hobbies #Crafts',
        'home_goods': '#HomeDecor #ThriftFinds',
        'home_improvement': '#DIY #Renovation',
        'kids': '#Kids #Toys',
        'musical': '#Musicians #GearTalk',
        'office': '#RemoteWork #Office',
        'pets': '#PetSky #Pets',
        'sporting': '#Sports #Outdoors',
        'video_games': '#Gaming #RetroGaming',
        'other': '#Misc'
      };

      // Get hashtags for the category
      const tags = ['#OpenMarket'];
      if (listingData.category && categoryHashtags[listingData.category]) {
        tags.push(categoryHashtags[listingData.category]);
      }

      // Handle Price and Text Logic
      const priceVal = parseFloat(listingData.price || '0');
      const isFree = !listingData.price || priceVal === 0;
      const isOnlineStore = listingData.location?.isOnlineStore === true;

      const formattedPrice = priceVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const priceStr = isFree ? "Free" : `$${formattedPrice}`;

      let text: string;
      let embedAction: string;

      if (isOnlineStore) {
        // Online store format
        embedAction = "Shop";
        text = `New in the shop: ${listingData.title} ✨\n\n${priceStr}\n\nAvailable now on my @openmkt.app storefront. 👇\n\n${tags.join(' ')}`;
      } else {
        // Personal listing format
        const askingLine = isFree ? "It's Free! 🎁" : `Asking ${priceStr}.`;
        const forSaleTag = isFree ? "" : "#ForSale";
        const introLine = isFree ? `Giving away my ${listingData.title} 🎁` : `Selling my ${listingData.title} 📦`;
        embedAction = isFree ? "Giving Away" : "Selling";

        if (forSaleTag) {
          tags.push(forSaleTag);
        }

        // Format:
        // {IntroLine}
        // {AskingLine}
        // Listed it on @openmkt.app for the community. Link below! 👇
        // {Hashtags} {ForSaleTag}

        text = `${introLine}\n\n${askingLine}\n\nListed it on @openmkt.app for the community. Link below! 👇\n\n${tags.join(' ')}`;
      }

      // Create RichText to handle facets (links, mentions, tags)
      const rt = new RichText({ text });
      // Automatically detect mentions (@openmkt.app) and links
      await rt.detectFacets(this.agent);

      // Prepare embed if images exist
      let embed;
      // listingData.images is already processed blobs from createRecord
      if (listingData.images && Array.isArray(listingData.images) && listingData.images.length > 0) {
        const thumbBlob = listingData.images[0];

        embed = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: listingUrl,
            title: `${embedAction}: ${listingData.title} - ${priceStr}`,
            description: listingData.description || 'Check out this item on Open Market',
            thumb: thumbBlob
          }
        };
      } else {
        // Text-only embed (just the link card without image)
        embed = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: listingUrl,
            title: `${embedAction}: ${listingData.title} - ${priceStr}`,
            description: listingData.description || 'Check out this item on Open Market',
          }
        };
      }

      const postResult = await this.agent.post({
        text: rt.text,
        facets: rt.facets,
        embed: embed as any,
        createdAt: new Date().toISOString()
      });

      logger.info('Successfully shared listing to Bluesky feed');

    } catch (error) {
      logger.error('Failed to share listing to Bluesky', error as Error);
      // We don't throw here to avoid failing the whole flow if just the social post fails
      // But we log it clearly
    }
  }

  /**
   * Get handle from DID using the public AppView (no auth needed)
   */
  private async getHandleFromDid(did: string): Promise<string> {
    try {
      const publicAgent = new AtpAgent({ service: 'https://api.bsky.app' });
      const result = await publicAgent.getProfile({ actor: did });
      return result.data.handle;
    } catch (error) {
      logger.error(`Failed to get handle for DID: ${did}`, error as Error);
      return did; // Fallback to DID if handle can't be retrieved
    }
  }

  /**
   * Search for marketplace listings with caching and rate limiting
   */
  private async searchMarketplaceListings(): Promise<(MarketplaceListing & {
    authorDid: string;
    authorHandle: string;
    uri: string;
    cid: string;
  })[]> {
    try {
      // Check if user is logged in before attempting to search
      if (!this.isLoggedIn || !this.agent.did) {
        logger.warn('User is not logged in, cannot search marketplace listings');
        return [];
      }

      // Check if we have a valid cache - if so, return the cached data
      if (this.listingsCache && this.listingsCache.isValid()) {
        logger.info('Returning cached marketplace listings');
        return this.listingsCache.data;
      }

      // Check if we need to wait for rate limiting
      const now = Date.now();
      const timeElapsed = now - this.lastApiCall;
      if (this.lastApiCall > 0 && timeElapsed < this.rateLimitInterval) {
        const waitTime = this.rateLimitInterval - timeElapsed;
        logger.warn(`Rate limit protection: Waiting ${waitTime}ms before making API call`);

        // If we have expired cached data, return it while waiting for the rate limit
        if (this.listingsCache) {
          logger.info('Returning stale cached data due to rate limiting');
          return this.listingsCache.data;
        }

        // Otherwise, wait for the rate limit to expire
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Update the last API call timestamp
      this.lastApiCall = Date.now();

      const allListings: (MarketplaceListing & {
        authorDid: string;
        authorHandle: string;
        uri: string;
        cid: string;
      })[] = [];

      // Use search API to find marketplace listings across the entire network
      // Search for common marketplace terms to discover listings
      const searchTerms = [
        'marketplace',
        'for sale',
        'selling',
        'price',
        '$',
        'condition'
      ];

      logger.info('Searching for marketplace listings via search API');

      for (const term of searchTerms) {
        try {
          logger.logApiRequest('GET', 'app.bsky.feed.searchPosts', { q: term, limit: 25 });

          const searchResults = await this.agent.api.app.bsky.feed.searchPosts({
            q: term,
            limit: 25 // Search fewer per term to avoid rate limits
          });

          if (searchResults.success && searchResults.data.posts) {
            // Filter for supported listing types
            const validTypes = [MARKETPLACE_COLLECTION];

            // Filter for actual marketplace listings
            const marketplaceListings = searchResults.data.posts
              .filter(post => {
                try {
                  const record = post.record as unknown as PostRecord;
                  return validTypes.includes(record.$type);
                } catch {
                  return false;
                }
              })
              .map(post => {
                const record = post.record as unknown;
                return {
                  ...record as MarketplaceListing,
                  authorDid: post.author.did,
                  authorHandle: post.author.handle,
                  uri: post.uri,
                  cid: post.cid,
                } as MarketplaceListing & { authorDid: string; authorHandle: string; uri: string; cid: string };
              });

            // Add unique listings (avoid duplicates from multiple search terms)
            marketplaceListings.forEach(listing => {
              if (!allListings.some(existing => existing.uri === listing.uri)) {
                allListings.push(listing);
                // Auto-register this DID
                if (listing.authorDid) {
                  addMarketplaceDID(listing.authorDid);
                }
              }
            });
          }

          // Add a small delay between searches to be respectful
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (searchError) {
          logger.warn(`Search failed for term '${term}':`, searchError as Error);
          // Continue with other search terms
        }
      }

      logger.info(`Found ${allListings.length} marketplace listings via search`);

      // Add formatted image URLs for each listing
      const processedListings = allListings.map(listing => {
        const formattedImages = generateImageUrls(listing.authorDid, listing.images);
        return {
          ...listing,
          formattedImages
        };
      });

      // Filter out listings that should be hidden from friends
      const filteredListings = await Promise.all(
        processedListings.map(async listing => {
          // If hideFromFriends is true, check if the current user follows the author
          if (listing.hideFromFriends) {
            // Don't filter out my own listings
            if (listing.authorDid === this.agent.did) {
              return listing;
            }

            try {
              const followDetails = await this.getFollowDetails(listing.authorDid);

              logger.info(`[Privacy Check] Listing ${listing.uri} by ${listing.authorDid}`, {
                meta: {
                  hideFromFriends: true,
                  viewerIsFollowing: followDetails.isFollowing,
                  followedAt: followDetails.followedAt,
                  listingCreatedAt: listing.createdAt
                }
              });

              // If not following at all, they can see it
              if (!followDetails.isFollowing) {
                logger.info(`[Privacy Check] Allowed: Viewer does not follow author.`);
                return listing;
              }

              // If specific timestamp availability is an issue, we default to hiding (conservative)
              // But if we have the timestamp, we check if they were friends BEFORE the listing
              if (followDetails.followedAt) {
                const followTime = new Date(followDetails.followedAt).getTime();
                const listingTime = new Date(listing.createdAt).getTime();

                logger.info(`[Privacy Check] Time comparison`, {
                  meta: {
                    followTimeISO: followDetails.followedAt,
                    listingTimeISO: listing.createdAt,
                    isFollowNewer: followTime > listingTime,
                    diffSeconds: (followTime - listingTime) / 1000
                  }
                });

                // If they followed AFTER the listing was created (e.g. for chat), let them see it
                // We add a small buffer (e.g. 1 hour) just in case
                if (followTime > listingTime) {
                  logger.info(`[Privacy Check] Allowed: Follow is newer than listing (Buyer Scenario).`);
                  return listing;
                }
              }

              // Otherwise (followed before listing), hide it
              logger.info(`[Privacy Check] HIDDEN: Viewer is an existing friend (followed at ${followDetails.followedAt}).`);
              return null;

            } catch (err) {
              logger.error(`[Privacy Check] Error checking privacy, allowing listing safe-fail.`, err as Error);
              // If we can't check follow status, include the listing to be safe
              return listing;
            }
          }

          return listing;
        })
      );

      // Remove any null values (filtered listings)
      const finalListings = filteredListings.filter(listing => listing !== null) as (MarketplaceListing & {
        authorDid: string;
        authorHandle: string;
        uri: string;
        cid: string;
      })[];

      // Update the cache with filtered listings
      this.listingsCache = {
        data: finalListings,
        timestamp: Date.now(),
        cacheTTL: this.cacheTTL,
        isValid: function () {
          return (Date.now() - this.timestamp) < this.cacheTTL;
        }
      };

      return finalListings;
    } catch (error) {
      // If we encounter a rate limit error (429), use cached data if available
      if (error instanceof Error && error.message.includes('429')) {
        logger.warn('Rate limit exceeded (429), using cached data if available');
        if (this.listingsCache) {
          return this.listingsCache.data;
        }
      }

      logger.error('Failed to search for marketplace listings', error as Error);
      return [];
    }
  }

  /**
   * Get a listing by its specific URI
   * This method works for both regular posts and marketplace listings
   */
  async getListingByUri(uri: string): Promise<MarketplaceListing | null> {
    try {
      logger.info(`Fetching listing by URI: ${uri}`);

      // First, try to fetch it as a record directly (works for marketplace listings)
      // URI format: at://did:plc:xxx/app.atprotomkt.marketplace.listing/rkey
      const uriParts = uri.replace('at://', '').split('/');
      if (uriParts.length === 3) {
        const [repo, collection, rkey] = uriParts;

        try {
          logger.logApiRequest('GET', 'com.atproto.repo.getRecord', { repo, collection, rkey });

          const result = await this.agent.api.com.atproto.repo.getRecord({
            repo,
            collection,
            rkey
          });

          if (result.success && result.data.value) {
            const record = result.data.value as MarketplaceListing;

            // Get the author's profile to fetch handle
            const handle = await this.getHandleFromDid(repo);

            const listing = {
              ...record,
              authorDid: repo,
              authorHandle: handle,
              uri: uri,
              cid: result.data.cid,
            } as MarketplaceListing;

            // Add formatted image URLs if the listing has images
            if (listing.images && listing.images.length > 0 && listing.authorDid) {
              const formattedImages = generateImageUrls(listing.authorDid, listing.images);
              listing.formattedImages = formattedImages;
            }

            logger.info(`Successfully fetched listing via getRecord: ${listing.title}`);
            return listing;
          }
        } catch (directFetchError) {
          logger.warn('Direct record fetch failed, trying feed API', directFetchError as Error);
        }
      }

      // Fallback: Try fetching via the feed API (works for posts)
      logger.logApiRequest('GET', 'app.bsky.feed.getPostThread', { uri });

      const result = await this.agent.api.app.bsky.feed.getPostThread({
        uri,
        depth: 0
      });

      if (!result.success) {
        logger.warn(`Listing not found for URI: ${uri}`);
        return null;
      }

      const thread = result.data.thread;
      const post = (thread as any).post;

      if (!post) {
        return null;
      }

      const record = post.record as PostRecord;

      // Check if this is actually a marketplace listing
      const validTypes = [MARKETPLACE_COLLECTION];
      if (!validTypes.includes(record.$type)) {
        logger.warn(`Post is not a marketplace listing: ${record.$type}`);
        return null;
      }

      // Create the listing with additional metadata
      const listing = {
        ...record as unknown as MarketplaceListing,
        authorDid: post.author.did,
        authorHandle: post.author.handle,
        uri: post.uri,
        cid: post.cid,
      } as MarketplaceListing;

      // Add formatted image URLs if the listing has images
      if (listing.images && listing.images.length > 0 && listing.authorDid) {
        const formattedImages = generateImageUrls(listing.authorDid, listing.images);
        listing.formattedImages = formattedImages;
      }

      return listing;
    } catch (error) {
      logger.error(`Failed to fetch listing by URI: ${uri}`, error as Error);
      return null;
    }
  }

  /**
   * Check if a user is following the authenticated user
   * Used for the "Hide from friends" feature
   */
  async isUserFollowingMe(userDid: string): Promise<boolean> {
    if (!this.isLoggedIn || !this.agent.did) {
      logger.warn('User is not logged in, cannot check follow status');
      return false;
    }

    try {
      logger.info(`Checking if user ${userDid} follows ${this.agent.accountDid}`);
      logger.logApiRequest('GET', 'app.bsky.graph.getFollows', {
        actor: userDid
      });

      // First get the user's follows
      const result = await this.agent.api.app.bsky.graph.getFollows({
        actor: userDid,
        limit: 100
      });

      if (!result.success) {
        logger.warn(`Failed to get follows for user ${userDid}`);
        return false;
      }

      // Check if any of the follows match the authenticated user's DID
      const isFollowing = result.data.follows.some(follow =>
        follow.did === this.agent.accountDid
      );

      return isFollowing;
    } catch (error) {
      logger.error(`Error checking if user ${userDid} follows authenticated user`, error as Error);
      return false;
    }
  }

  /**
   * Get details about the follow relationship with a target user
   * Returns whether we follow them, and when we started following
   */
  async getFollowDetails(targetDid: string): Promise<{ isFollowing: boolean; followedAt?: string }> {
    if (!this.isLoggedIn || !this.agent.did) {
      return { isFollowing: false };
    }

    try {
      // 1. Get profile to find the Follow URI
      const profile = await this.agent.getProfile({ actor: targetDid });
      const followUri = profile.data.viewer?.following;

      if (!followUri) {
        return { isFollowing: false };
      }

      // 2. Fetch the actual Follow record to get the timestamp
      // URI format: at://did:plc:xxx/app.bsky.graph.follow/rkey
      const uriParts = followUri.replace('at://', '').split('/');
      if (uriParts.length === 3) {
        const [repo, collection, rkey] = uriParts;

        try {
          // We use the agent to fetch the record from our own repo
          const result = await this.agent.api.com.atproto.repo.getRecord({
            repo: this.agent.accountDid, // The follow is in OUR repo
            collection: 'app.bsky.graph.follow',
            rkey
          });

          if (result.success && result.data.value) {
            const record = result.data.value as { createdAt: string };
            return {
              isFollowing: true,
              followedAt: record.createdAt
            };
          }
        } catch (e) {
          logger.warn(`Failed to fetch follow record details for ${targetDid}`, e as Error);
        }
      }

      // Fallback: we know we follow them, but couldn't get the date
      return { isFollowing: true };

    } catch (error) {
      logger.warn(`Error checking follow details for ${targetDid}`, error as Error);
      return { isFollowing: false };
    }
  }



  /**
   * Subscribe to real-time listing updates via Jetstream
   * @param callback Function to be called when a new listing is detected
   * @param onHistoricalReplayComplete Optional callback when historical replay is complete
   * @param cursor Optional unix microsecond timestamp to start replay from (defaults to 1 year ago)
   * @returns Unsubscribe function
   */
  subscribeToListings(
    callback: (listing: MarketplaceListing, isHistorical: boolean) => void,
    onHistoricalReplayComplete?: () => void,
    cursor?: number
  ): () => void {
    // Try the primary Jetstream endpoint (no cursor initially to test connection)
    let JETSTREAM_URL = `wss://jetstream1.us-east.bsky.network/subscribe?wantedCollections=${MARKETPLACE_COLLECTION}`;

    // Calculate default cursor (3 months ago) if not provided
    // This allows us to "replay" the history and discover existing listings without a seed seller
    // Note: Using a shorter time window to avoid potential timeout issues
    if (cursor === undefined) {
      const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
      const threeMonthsAgoMs = Date.now() - THREE_MONTHS_MS;
      // Convert to microseconds for Jetstream
      cursor = threeMonthsAgoMs * 1000;
      logger.info(`Using default replay cursor: ${cursor} (approx 3 months ago)`);
    }

    if (cursor && cursor > 0) {
      JETSTREAM_URL += `&cursor=${cursor}`;
    }

    logger.info(`Connecting to Jetstream: ${JETSTREAM_URL}`);

    const ws = new WebSocket(JETSTREAM_URL);
    let historicalReplayComplete = false;
    let receivedFirstMessage = false;
    const replayStartTime = Date.now();
    let lastMessageTime = Date.now();
    let replayTimeoutId: NodeJS.Timeout | null = null;

    // Set up a timeout to detect when replay is complete
    // If we haven't received a message in 3 seconds, assume replay is done
    const checkReplayComplete = () => {
      if (!historicalReplayComplete && receivedFirstMessage) {
        const timeSinceLastMessage = Date.now() - lastMessageTime;
        if (timeSinceLastMessage > 3000) {
          historicalReplayComplete = true;
          logger.info(`Historical replay complete (took ${Date.now() - replayStartTime}ms, timeout-based)`);
          onHistoricalReplayComplete?.();
          if (replayTimeoutId) {
            clearInterval(replayTimeoutId);
          }
        }
      }
    };

    ws.onopen = () => {
      logger.info('Jetstream connection established, replaying history...');
      // Start checking for replay completion every second
      replayTimeoutId = setInterval(checkReplayComplete, 1000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        receivedFirstMessage = true;
        lastMessageTime = Date.now();

        // Check if we've caught up to real-time based on timestamp
        if (!historicalReplayComplete && data.time_us) {
          const eventTimeMs = Math.floor(data.time_us / 1000);
          const nowMs = Date.now();

          // If the event is within the last 5 seconds, consider replay complete
          if (nowMs - eventTimeMs < 5000) {
            historicalReplayComplete = true;
            logger.info(`Historical replay complete (took ${Date.now() - replayStartTime}ms, timestamp-based)`);
            onHistoricalReplayComplete?.();
            if (replayTimeoutId) {
              clearInterval(replayTimeoutId);
            }
          }
        }

        // Check if it's a create or update operation (ignore deletes for now)
        if (data.commit && (data.commit.operation === 'create' || data.commit.operation === 'update')) {
          const record = data.commit.record;
          const did = data.did;

          // Validate that this is actually a marketplace listing
          if (data.commit.collection !== MARKETPLACE_COLLECTION) {
            return;
          }

          // Construct the listing object
          const listing = {
            ...record,
            authorDid: did,
            uri: `at://${did}/${data.commit.collection}/${data.commit.rkey}`,
            cid: data.commit.cid,
            // Format images if present
            formattedImages: record.images ? generateImageUrls(did, record.images) : undefined
          } as MarketplaceListing;

          // Auto-register this DID as a known marketplace participant
          addMarketplaceDID(did);

          // Call the callback with isHistorical flag
          callback(listing, !historicalReplayComplete);
        } else if (data.commit && data.commit.operation === 'delete') {
          // Handle deletions if needed in the future
          logger.info(`Listing deleted: at://${data.did}/${data.commit.collection}/${data.commit.rkey}`);
        }
      } catch (error) {
        console.error('Error parsing Jetstream message:', error);
      }
    };

    ws.onerror = (event) => {
      logger.error('Jetstream connection error', new Error('WebSocket error'));
      console.error('WebSocket error event:', event);
      if (replayTimeoutId) {
        clearInterval(replayTimeoutId);
      }
    };

    ws.onclose = () => {
      logger.info('Jetstream connection closed');
      if (replayTimeoutId) {
        clearInterval(replayTimeoutId);
      }
      // If connection closes before replay completes and we haven't received any messages,
      // call the completion callback to unblock the UI
      if (!historicalReplayComplete && !receivedFirstMessage) {
        logger.warn('Jetstream closed before receiving any messages');
        onHistoricalReplayComplete?.();
      }
    };

    return () => {
      logger.info('Closing Jetstream connection');
      if (replayTimeoutId) {
        clearInterval(replayTimeoutId);
      }
      ws.close();
    };
  }


  /**
   * Helper method to filter listings based on privacy settings
   */
  private async filterHiddenListings(listings: (MarketplaceListing & { authorDid: string; authorHandle: string; uri: string; cid: string })[]) {
    logger.info(`[Privacy Check] filtering ${listings.length} listings for privacy rules...`);

    const filteredListings = await Promise.all(
      listings.map(async listing => {
        // If hideFromFriends is true, check if the current user follows the author
        if (listing.hideFromFriends) {
          // Don't filter out my own listings
          if (listing.authorDid === this.agent.did) {
            return listing;
          }

          try {
            const followDetails = await this.getFollowDetails(listing.authorDid);

            logger.info(`[Privacy Check] Listing ${listing.uri} by ${listing.authorDid}`, {
              meta: {
                hideFromFriends: true,
                viewerIsFollowing: followDetails.isFollowing,
                followedAt: followDetails.followedAt,
                listingCreatedAt: listing.createdAt
              }
            });

            // If not following at all, they can see it
            if (!followDetails.isFollowing) {
              logger.info(`[Privacy Check] Allowed: Viewer does not follow author.`);
              return listing;
            }

            // check if they were friends BEFORE the listing
            if (followDetails.followedAt) {
              const followTime = new Date(followDetails.followedAt).getTime();
              const listingTime = new Date(listing.createdAt).getTime();

              logger.info(`[Privacy Check] Time comparison`, {
                meta: {
                  followTimeISO: followDetails.followedAt,
                  listingTimeISO: listing.createdAt,
                  isFollowNewer: followTime > listingTime,
                  diffSeconds: (followTime - listingTime) / 1000
                }
              });

              // If they followed AFTER the listing was created (e.g. for chat), let them see it
              if (followTime > listingTime) {
                logger.info(`[Privacy Check] Allowed: Follow is newer than listing (Buyer Scenario).`);
                return listing;
              }
            }

            // Otherwise (followed before listing), hide it
            logger.info(`[Privacy Check] HIDDEN: Viewer is an existing friend (followed at ${followDetails.followedAt}).`);
            return null;

          } catch (err) {
            logger.error(`[Privacy Check] Error checking privacy, allowing listing safe-fail.`, err as Error);
            return listing;
          }
        }

        return listing;
      })
    );

    return filteredListings.filter(listing => listing !== null) as (MarketplaceListing & {
      authorDid: string;
      authorHandle: string;
      uri: string;
      cid: string;
    })[];
  }
}

/**
 * Fetch public marketplace listings without requiring authentication.
 * The AT Protocol data is public, so we can read listings from known DIDs
 * without logging in.
 */
export async function fetchPublicListings(): Promise<(MarketplaceListing & {
  authorDid: string;
  authorHandle: string;
  uri: string;
  cid: string;
})[]> {
  logger.info('[Public] Fetching public listings');

  // Ensure verified sellers are loaded
  await ensureVerifiedSellersLoaded();
  const knownMarketplaceDIDs = getKnownMarketplaceDIDs();
  const listings: (MarketplaceListing & {
    authorDid: string;
    authorHandle: string;
    uri: string;
    cid: string;
  })[] = [];

  // Get known DIDs from registry
  logger.info(`[Public] Fetching from ${knownMarketplaceDIDs.length} known marketplace DIDs`);

  // Helper to resolve PDS for a DID
  const resolvePDS = async (did: string): Promise<string | null> => {
    try {
      let didDocUrl: string;
      if (did.startsWith('did:web:')) {
        const domain = did.slice('did:web:'.length);
        didDocUrl = `https://${domain}/.well-known/did.json`;
      } else {
        didDocUrl = `https://plc.directory/${did}`;
      }

      const response = await fetch(didDocUrl);
      if (!response.ok) return null;

      const didDoc = await response.json();
      const pdsService = didDoc.service?.find((s: any) =>
        s.type === 'AtprotoPersonalDataServer'
      );

      return pdsService?.serviceEndpoint || null;
    } catch {
      return null;
    }
  };

  // Helper to get handle from DID
  const getHandleFromDid = async (did: string): Promise<string> => {
    try {
      let didDocUrl: string;
      if (did.startsWith('did:web:')) {
        const domain = did.slice('did:web:'.length);
        didDocUrl = `https://${domain}/.well-known/did.json`;
      } else {
        didDocUrl = `https://plc.directory/${did}`;
      }

      const response = await fetch(didDocUrl);
      if (!response.ok) return did;

      const didDoc = await response.json();
      // The handle is usually in alsoKnownAs as "at://handle"
      const aka = didDoc.alsoKnownAs?.[0];
      if (aka && aka.startsWith('at://')) {
        return aka.replace('at://', '');
      }
      return did;
    } catch {
      return did;
    }
  };

  // Fetch from known DIDs in capped batches to avoid bursting plc.directory / PDS
  const PUBLIC_CONCURRENCY = 5;
  const allListingsArrays: (typeof listings)[] = [];
  for (let i = 0; i < knownMarketplaceDIDs.length; i += PUBLIC_CONCURRENCY) {
    const chunk = knownMarketplaceDIDs.slice(i, i + PUBLIC_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (did) => {
        try {
          // Resolve the PDS for this DID
          const pdsUrl = await resolvePDS(did);
          if (!pdsUrl) {
            logger.warn(`[Public] Could not resolve PDS for ${did}`);
            return [];
          }

          // Create a temporary unauthenticated agent for this PDS
          const agent = new AtpAgent({ service: pdsUrl });

          // Get the handle
          const handle = await getHandleFromDid(did);

          // Fetch listings from the marketplace collection
          const result = await agent.api.com.atproto.repo.listRecords({
            repo: did,
            collection: MARKETPLACE_COLLECTION,
            limit: 50
          });

          if (!result.success || !result.data.records.length) {
            return [];
          }

          // Process the listings
          return result.data.records.map(record => {
            const listingData = record.value as MarketplaceListing;
            const formattedImages = generateImageUrls(did, listingData.images);

            return {
              ...listingData,
              authorDid: did,
              authorHandle: handle,
              uri: record.uri,
              cid: record.cid,
              formattedImages
            };
          });
        } catch (error) {
          logger.warn(`[Public] Failed to fetch listings from DID ${did}`, error as Error);
          return [];
        }
      })
    );
    allListingsArrays.push(...chunkResults);
  }

  // Flatten and deduplicate
  allListingsArrays.forEach(didListings => {
    didListings.forEach(listing => {
      if (!listings.some(existing => existing.uri === listing.uri)) {
        listings.push(listing);
      }
    });
  });

  logger.info(`[Public] Total marketplace listings found: ${listings.length}`);

  return listings;
}

export default MarketplaceClient;
