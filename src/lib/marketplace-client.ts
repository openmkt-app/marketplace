// src/lib/marketplace-client.ts
import { BskyAgent } from '@atproto/api';
import type { AtpSessionEvent, AtpSessionData } from '@atproto/api';
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
};

export type CreateListingParams = Omit<MarketplaceListing, 'createdAt'>;

export type SessionData = {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
};

export class MarketplaceClient {
  agent: BskyAgent;
  isLoggedIn: boolean;

  constructor(serviceUrl: string = 'https://bsky.social') {
    this.agent = new BskyAgent({
      service: serviceUrl,
    });
    this.isLoggedIn = false;
  }

  async login(username: string, password: string): Promise<{ success: boolean; data?: any; error?: Error }> {
    try {
      logger.info(`Attempting login for user: ${username}`);
      logger.logApiRequest('POST', 'login', { identifier: username });
      
      const result = await this.agent.login({
        identifier: username,
        password: password,
      });
      
      this.isLoggedIn = true;
      logger.info(`Login successful for user: ${username}`);
      logger.logApiResponse('POST', 'login', 200, { did: result.data.did, handle: result.data.handle });
      
      console.log('Login response data:', result.data);
      
      // Ensure we're returning the data in the expected format
      return { 
        success: true, 
        data: {
          did: result.data.did,
          handle: result.data.handle,
          accessJwt: result.data.accessJwt,
          refreshJwt: result.data.refreshJwt
        } 
      };
    } catch (error) {
      logger.error(`Login failed for user: ${username}`, error as Error);
      return { success: false, error: error as Error };
    }
  }

  async resumeSession(sessionData: SessionData): Promise<{ success: boolean; data?: any; error?: Error }> {
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

  async createListing(listingData: CreateListingParams): Promise<any> {
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
        images: _images, // Extract and ignore the original images
        ...listingDataWithoutImages
      } = listingData;
      
      // Create the listing record
      logger.info('Creating listing', {
        meta: {
          title: listingDataWithoutImages.title,
          category: listingDataWithoutImages.category,
          imageCount: processedImages ? processedImages.length : 0,
        }
      });
      
      logger.logApiRequest('POST', 'com.atproto.repo.createRecord', {
        collection: 'app.atprotomkt.marketplace.listing',
        imageCount: processedImages ? processedImages.length : 0,
      });
      
      const result = await this.agent.api.com.atproto.repo.createRecord({
        repo: this.agent.session.did,
        collection: 'app.atprotomkt.marketplace.listing',
        record: {
          ...listingDataWithoutImages,
          images: processedImages, // Add the processed images
          createdAt: new Date().toISOString(),
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
          const record = item.post.record as any;
          return validTypes.includes(record.$type);
        })
        .filter(item => {
          const record = item.post.record as any;
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
        .map(item => (item.post.record as any) as MarketplaceListing);
      
      logger.info(`Found ${listings.length} listings matching location criteria`);
      return listings;
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
      logger.logApiRequest('GET', 'app.bsky.feed.getTimeline', { limit: 100 });
      
      // Get the timeline which will include recent posts
      const results = await this.agent.api.app.bsky.feed.getTimeline({
        limit: 100,
      });
      
      // Look for both old and new namespace to support existing listings
      const validTypes = ['com.example.marketplace.listing', 'app.atprotomkt.marketplace.listing'];
      
      // Filter for marketplace listings
      const listings = results.data.feed
        .filter(item => {
          const record = item.post.record as any;
          return validTypes.includes(record.$type);
        })
        .map(item => {
          const record = item.post.record as any;
          return {
            ...record,
            authorDid: item.post.author.did,
            authorHandle: item.post.author.handle,
            uri: item.post.uri,
            cid: item.post.cid,
          } as MarketplaceListing & { authorDid: string; authorHandle: string; uri: string; cid: string };
        });
      
      logger.info(`Found ${listings.length} marketplace listings`);
      return listings;
    } catch (error) {
      logger.error('Failed to retrieve all listings', error as Error);
      throw error;
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
      const record = post.record as any;
      
      // Check if this is actually a marketplace listing
      const validTypes = ['com.example.marketplace.listing', 'app.atprotomkt.marketplace.listing'];
      if (!validTypes.includes(record.$type)) {
        logger.warn(`Post is not a marketplace listing: ${record.$type}`);
        return null;
      }
      
      // Return the listing with additional metadata
      return {
        ...record,
        authorDid: post.author.did,
        authorHandle: post.author.handle,
        uri: post.uri,
        cid: post.cid,
      } as MarketplaceListing & { authorDid: string; authorHandle: string; uri: string; cid: string };
    } catch (error) {
      logger.error(`Failed to fetch listing by URI: ${uri}`, error as Error);
      return null;
    }
  }
  
  // Additional helper methods would go here
  // For example: methods to delete listings, update listings, etc.
}

export default MarketplaceClient;