// src/lib/marketplace-client.ts
import { BskyAgent } from '@atproto/api';
import type { AtpSessionData } from '@atproto/api';
import { generateImageUrls } from './image-utils';
import logger from './logger';

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

export type MarketplaceListing = {
  title: string;
  description: string;
  price: string;
  images?: ListingImage[];
  location: ListingLocation;
  category: string;
  condition: string;
  createdAt: string;
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
      });
      
      // Verify the session is valid
      const result = await this.agent.getProfile({
        actor: sessionData.did,
      });
      
      this.isLoggedIn = true;
      logger.info('Session resumed successfully');
      
      return { success: true, data: { user: result.data } };
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
        processedImages = await this.processImages(listingData.images);
      }
      
      // Create a copy of the listing data without the images property
      // This prevents issues with the original File objects being passed to the API
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        images: _,
        ...listingDataWithoutImages
      } = listingData;
      
      // Create the listing record
      logger.info('Creating listing', {
        meta: {
          title: listingDataWithoutImages.title,
          category: listingDataWithoutImages.category,
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
          hideFromFriends: listingDataWithoutImages.hideFromFriends || false
        },
      });
      
      return result;
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
      
      // Get all public listings by querying the firehose
      logger.logApiRequest('GET', 'app.bsky.feed.getTimeline', { limit: 100 });
      
      // Get the timeline which will include recent posts
      const results = await this.agent.api.app.bsky.feed.getTimeline({
        limit: 100,
      });
      
      // Look for both old and new namespace to support existing listings
      const validTypes = ['com.example.marketplace.listing', 'app.atprotomkt.marketplace.listing'];
      
      // Filter for marketplace listings and then by location
      // This is inefficient but demonstrates the concept
      const listings = results.data.feed
        .filter(item => {
          const record = item.post.record as PostRecord;
          return validTypes.includes(record.$type);
        })
        .filter(item => {
          const record = item.post.record as PostRecord;
          const location = record.location;
          
          if (!location) return false;
          
          const stateMatch = location.state.toLowerCase() === state.toLowerCase();
          const countyMatch = location.county.toLowerCase() === county.toLowerCase();
          
          if (locality) {
            const localityMatch = location.locality.toLowerCase() === locality.toLowerCase();
            return stateMatch && countyMatch && localityMatch;
          }
          
          return stateMatch && countyMatch;
        })
        .map(item => (item.post.record as unknown) as MarketplaceListing);
      
      logger.info(`Found ${listings.length} listings matching location criteria`);
      
      // Process listings to add image URLs
      return listings.map(listing => {
        // Extract the seller DID from the post (from the results.data.feed entries)
        const feedItem = results.data.feed.find(item => {
          const record = item.post.record as PostRecord;
          return validTypes.includes(record.$type);
        });
        
        const sellerDid = feedItem?.post.author.did || '';
        
        // Generate formatted image URLs
        const formattedImages = generateImageUrls(sellerDid, listing.images);
        
        return {
          ...listing,
          formattedImages,
          sellerDid
        };
      });
    } catch (error) {
      logger.error('Failed to retrieve listings', error as Error);
      throw error;
    }
  }

  /**
   * Get all marketplace listings regardless of location
   */
  async getAllListings(): Promise<MarketplaceListing[]> {
    try {
      logger.info('Fetching all marketplace listings');
      
      const listings: (MarketplaceListing & { 
        authorDid: string; 
        authorHandle: string; 
        uri: string; 
        cid: string;
      })[] = [];
      
      // First, try to get the user's own listings directly
      if (this.isLoggedIn && this.agent.session) {
        try {
          const userDid = this.agent.session.did;
          logger.info(`Fetching listings from user's repository: ${userDid}`);
          
          // Get all marketplace listings from the user's repository
          const userListings = await this.getUserListings(userDid);
          
          if (userListings.length > 0) {
            listings.push(...userListings);
            logger.info(`Found ${userListings.length} listings in user's repository`);
          }
        } catch (error) {
          logger.error('Failed to fetch user listings', error as Error);
        }
        
        // Only try to search for marketplace listings if the user is logged in
        try {
          const searchResults = await this.searchMarketplaceListings();
          if (searchResults.length > 0) {
            // Filter out duplicates (in case user's own listings appear in search results)
            const newListings = searchResults.filter(searchListing => {
              return !listings.some(existing => existing.uri === searchListing.uri);
            });
            
            listings.push(...newListings);
            logger.info(`Found ${newListings.length} additional listings from search`);
          }
        } catch (error) {
          logger.error('Failed to search for marketplace listings', error as Error);
        }
      } else {
        logger.warn('User is not logged in, skipping marketplace listings search');
      }
      
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
      
      // Look for both old and new namespace to support existing listings
      const validTypes = ['com.example.marketplace.listing', 'app.atprotomkt.marketplace.listing'];
      const allListings: (MarketplaceListing & { 
        authorDid: string; 
        authorHandle: string;
        uri: string; 
        cid: string;
      })[] = [];
      
      // Try to get listings for each namespace
      for (const collection of validTypes) {
        try {
          logger.logApiRequest('GET', 'com.atproto.repo.listRecords', { 
            repo: did,
            collection 
          });
          
          const result = await this.agent.api.com.atproto.repo.listRecords({
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
      // Check if user is logged in before attempting to fetch timeline
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

      // Option 1: Use the firehose approach to find recent marketplace listings
      // This isn't a real search but will find recent activity across the network
      logger.info('Searching for marketplace listings via global feed');
      logger.logApiRequest('GET', 'app.bsky.feed.getTimeline', { limit: 100 });
      
      // The global timeline/feed includes recent posts from across the network
      const results = await this.agent.api.app.bsky.feed.getTimeline({
        limit: 100,
      });
      
      // Look for both old and new namespace to support existing listings
      const validTypes = ['com.example.marketplace.listing', 'app.atprotomkt.marketplace.listing'];
      
      // Filter for marketplace listings
      const listings = results.data.feed
        .filter(item => {
          try {
            const record = item.post.record as PostRecord;
            return validTypes.includes(record.$type);
          } catch {
            return false;
          }
        })
        .map(item => {
          const record = item.post.record as unknown;
          return {
            ...record as MarketplaceListing,
            authorDid: item.post.author.did,
            authorHandle: item.post.author.handle,
            uri: item.post.uri,
            cid: item.post.cid,
          } as MarketplaceListing & { authorDid: string; authorHandle: string; uri: string; cid: string };
        });
      
      logger.info(`Found ${listings.length} marketplace listings in global feed`);
      
      // Add formatted image URLs for each listing
      const processedListings = listings.map(listing => {
        // Pass the correct type of images to generateImageUrls or handle conversion
        const formattedImages = generateImageUrls(listing.authorDid, listing.images);
        return {
          ...listing,
          formattedImages
        };
      });
      
      // Filter out listings that should be hidden from friends
      // If the listing has hideFromFriends set to true and the current user follows the author,
      // don't include it in the results
      const authenticatedUserDid = this.agent.session.did;
      
      // Create a filter to check hideFromFriends flag
      const filteredListings = await Promise.all(
        processedListings.map(async listing => {
          // If hideFromFriends is true, check if the current user follows the author
          if (listing.hideFromFriends) {
            // Check if the listing author follows the authenticated user (they are friends)
            const isFollowing = await this.isUserFollowingMe(listing.authorDid);
            
            // If they're following the current user (friends), hide the listing
            if (isFollowing) {
              logger.info(`Filtering out listing ${listing.uri} as it's hidden from friends`);
              return null;
            }
          }
          
          // Otherwise, include the listing
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
        isValid: function() {
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
   */
  async getListingByUri(uri: string): Promise<MarketplaceListing | null> {
    try {
      logger.info(`Fetching listing by URI: ${uri}`);
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
      if (thread.type !== 'post') {
        logger.warn(`Thread is not a post type for URI: ${uri}`);
        return null;
      }
      
      const post = thread.post;
      const record = post.record as PostRecord;
      
      // Check if this is actually a marketplace listing
      const validTypes = ['com.example.marketplace.listing', 'app.atprotomkt.marketplace.listing'];
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
      } as MarketplaceListing & { authorDid: string; authorHandle: string; uri: string; cid: string };
      
      // Add formatted image URLs if the listing has images
      if (listing.images && listing.images.length > 0) {
        try {
          // Generate the formatted image URLs
          const formattedImages = generateImageUrls(listing.authorDid, listing.images);
          listing.formattedImages = formattedImages;
        } catch (error) {
          console.error('Error generating image URLs:', error);
        }
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
  
  // Additional helper methods would go here
  // For example: methods to delete listings, update listings, etc.
}

export default MarketplaceClient;