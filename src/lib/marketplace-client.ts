// src/lib/marketplace-client.ts
import { BskyAgent } from '@atproto/api';
import type { AtpSessionData } from '@atproto/api';
import { generateImageUrls } from './image-utils';
import logger from './logger';
import { getKnownMarketplaceDIDs, addMarketplaceDID } from './marketplace-dids';

// Define types for our marketplace listings
export type ListingLocation = {
  state: string;
  county: string;
  locality: string;
  zipPrefix?: string;
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
  images?: ListingImage[];
  location: ListingLocation;
  category: string;
  condition: string;
  createdAt: string;
  // Added for listing metadata, like subcategory
  metadata?: ListingMetadata;
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
};

export type CreateListingParams = Omit<MarketplaceListing, 'createdAt'>;

// Define a session data interface compatible with AtpSessionData
export type SessionData = AtpSessionData;

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
  agent: BskyAgent;
  isLoggedIn: boolean;
  // Add cache and rate limit tracking properties
  private listingsCache: ListingsCache | null;
  private lastApiCall: number;
  private cacheTTL: number; // cache time-to-live in milliseconds
  private rateLimitInterval: number; // minimum time between API calls in milliseconds

  constructor(serviceUrl: string = 'https://bsky.social') {
    this.agent = new BskyAgent({
      service: serviceUrl,
    });
    this.isLoggedIn = false;
    // Initialize cache and rate limit properties
    this.listingsCache = null;
    this.lastApiCall = 0;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache TTL
    this.rateLimitInterval = 30 * 1000; // 30 seconds between API calls
  }

  async login(username: string, password: string): Promise<SessionData> {
    try {
      logger.info(`Attempting to login user: ${username}`);
      logger.logApiRequest('POST', 'com.atproto.server.createSession', { identifier: username });
      const response = await this.agent.login({
        identifier: username,
        password: password,
      });

      this.isLoggedIn = true;
      logger.info(`Login successful for user: ${username}`);

      // Return the full session data that the UI might need
      return response.data as SessionData;
    } catch (error) {
      logger.error('Login failed', error as Error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  async resumeSession(sessionData: SessionData): Promise<{ success: boolean; data?: Record<string, unknown>; error?: Error }> {
    try {
      logger.info('Attempting to resume session');

      // Instead of directly setting the session property, use the agent's resumeSession method
      await this.agent.resumeSession({
        did: sessionData.did,
        handle: sessionData.handle,
        accessJwt: sessionData.accessJwt,
        refreshJwt: sessionData.refreshJwt,
        active: true, // Add required property
      });

      // Try to verify the session is valid, but don't fail if profile fetch fails
      try {
        const result = await this.agent.getProfile({
          actor: sessionData.did,
        });

        this.isLoggedIn = true;
        logger.info('Session resumed successfully with profile verification');

        return { success: true, data: { user: result.data } };
      } catch (profileError) {
        // Profile fetch failed, but session might still be valid
        logger.warn('Profile verification failed during session resume, but session appears valid:', profileError);

        // Check if we can at least validate the session by making a simple authenticated call
        try {
          // Try a simple authenticated call to verify the session works
          await this.agent.api.com.atproto.server.getSession();

          this.isLoggedIn = true;
          logger.info('Session resumed successfully (profile verification failed but session is valid)');

          return { success: true, data: { user: { did: sessionData.did, handle: sessionData.handle } } };
        } catch (sessionError) {
          // If even basic session validation fails, then the session is truly invalid
          logger.error('Session validation failed completely:', sessionError as unknown as Error);
          this.isLoggedIn = false;
          return { success: false, error: sessionError as unknown as Error };
        }
      }
    } catch (error) {
      logger.error('Resume session failed', error as Error);
      this.isLoggedIn = false;
      return { success: false, error: error as Error };
    }
  }

  logout(): void {
    // The AT Protocol client should handle session cleanup internally
    this.isLoggedIn = false;
  }

  async createListing(listingData: CreateListingParams): Promise<Record<string, unknown>> {
    if (!this.isLoggedIn || !this.agent.session) {
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
        collection: 'app.atprotomkt.marketplace.listing',
        imageCount: processedImages ? processedImages.length : 0,
        hideFromFriends: listingDataWithoutImages.hideFromFriends || false
      });

      const result = await this.agent.api.com.atproto.repo.createRecord({
        repo: this.agent.session.did,
        collection: 'app.atprotomkt.marketplace.listing',
        record: {
          ...listingDataWithoutImages,
          images: processedImages, // Add the processed images
          createdAt: new Date().toISOString(),
          hideFromFriends: listingDataWithoutImages.hideFromFriends || false,
          metadata: listingDataWithoutImages.metadata || {} // Include metadata with subcategory
        },
      });

      // Add this DID to known marketplace participants for future discovery
      addMarketplaceDID(this.agent.session.did);

      return result as unknown as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to create listing:', error);
      throw error;
    }
  }

  private async processImages(imageFiles?: File[]): Promise<ListingImage[] | undefined> {
    if (!imageFiles || imageFiles.length === 0) {
      return undefined;
    }

    const processedImages: ListingImage[] = [];

    for (const file of imageFiles) {
      try {
        logger.debug(`Processing image: ${file.name}`, {
          meta: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        });

        // Check file size to prevent errors
        if (file.size > 980000) { // Slightly below 1MB to be safe
          logger.warn(`Image ${file.name} is too large (${file.size} bytes), skipping`);
          continue;
        }

        // Check file type to ensure it's an image
        if (!file.type.startsWith('image/')) {
          logger.warn(`File ${file.name} is not an image (${file.type}), skipping`);
          continue;
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

      if (!this.isLoggedIn || !this.agent.session) {
        logger.warn('User is not logged in');
        return [];
      }

      // Get known DIDs from registry
      const knownMarketplaceDIDs = getKnownMarketplaceDIDs();
      logger.info(`Fetching from ${knownMarketplaceDIDs.length} known marketplace DIDs`);

      // Fetch from all known DIDs in parallel for speed
      const fetchPromises = knownMarketplaceDIDs.map(async (did) => {
        try {
          logger.info(`Fetching listings from DID: ${did}`);
          const didListings = await this.getUserListings(did);
          logger.info(`Found ${didListings.length} listings from DID ${did}`);
          return didListings;
        } catch (error) {
          logger.warn(`Failed to fetch listings from DID ${did}`, error as Error);
          return [];
        }
      });

      // Wait for all fetches to complete
      const allListingsArrays = await Promise.all(fetchPromises);

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

      return processedListings;
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
      // Use the DID PLC directory to resolve the PDS
      const response = await fetch(`https://plc.directory/${did}`);
      if (!response.ok) {
        return null;
      }

      const didDoc = await response.json();

      // Find the PDS service endpoint
      const pdsService = didDoc.service?.find((s: any) =>
        s.type === 'AtprotoPersonalDataServer'
      );

      if (pdsService?.serviceEndpoint) {
        return pdsService.serviceEndpoint;
      }

      return null;
    } catch (error) {
      logger.warn(`Failed to resolve PDS for ${did}`, error as Error);
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
      const did = userDid || this.agent.session!.did;
      const handle = userDid ? await this.getHandleFromDid(did) : this.agent.session!.handle;

      // If fetching from a different user, create a temporary agent with their PDS
      let agentToUse = this.agent;
      if (userDid && userDid !== this.agent.session?.did) {
        const userPDS = await this.resolvePDS(userDid);
        if (userPDS) {
          logger.info(`Resolved PDS for ${userDid}: ${userPDS}`);
          agentToUse = new BskyAgent({ service: userPDS });
        } else {
          logger.warn(`Could not resolve PDS for ${userDid}, using default agent`);
        }
      }

      // Look for listings in the supported namespace
      const validTypes = ['app.atprotomkt.marketplace.listing'];
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
   * Get handle from DID
   */
  private async getHandleFromDid(did: string): Promise<string> {
    try {
      const result = await this.agent.getProfile({ actor: did });
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
      if (!this.isLoggedIn || !this.agent.session) {
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
            const validTypes = ['app.atprotomkt.marketplace.listing'];

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
      // const authenticatedUserDid = this.agent.session.did;

      const filteredListings = await Promise.all(
        processedListings.map(async listing => {
          // If hideFromFriends is true, check if the current user follows the author
          if (listing.hideFromFriends) {
            try {
              const isFollowing = await this.isUserFollowingMe(listing.authorDid);
              if (isFollowing) {
                logger.info(`Filtering out listing ${listing.uri} as it's hidden from friends`);
                return null;
              }
            } catch {
              // If we can't check follow status, include the listing
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
      const validTypes = ['app.atprotomkt.marketplace.listing'];
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
    if (!this.isLoggedIn || !this.agent.session) {
      logger.warn('User is not logged in, cannot check follow status');
      return false;
    }

    try {
      // Use the getFollows endpoint to check if the provided user follows the authenticated user
      logger.info(`Checking if user ${userDid} follows ${this.agent.session.did}`);
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
        follow.did === this.agent.session!.did
      );

      return isFollowing;
    } catch (error) {
      logger.error(`Error checking if user ${userDid} follows authenticated user`, error as Error);
      return false;
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
    let JETSTREAM_URL = 'wss://jetstream1.us-east.bsky.network/subscribe?wantedCollections=app.atprotomkt.marketplace.listing';

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
          if (data.commit.collection !== 'app.atprotomkt.marketplace.listing') {
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
}

export default MarketplaceClient;