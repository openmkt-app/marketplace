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
      this.agent.session = {
        did: sessionData.did,
        handle: sessionData.handle,
        accessJwt: sessionData.accessJwt,
        refreshJwt: sessionData.refreshJwt,
      };
      
      // Verify the session is valid
      const result = await this.agent.getProfile({
        actor: sessionData.did,
      });
      
      this.isLoggedIn = true;
      return { success: true, data: { user: result.data } };
    } catch (error) {
      console.error('Resume session failed:', error);
      this.agent.session = undefined;
      return { success: false, error: error as Error };
    }
  }

  logout(): void {
    this.agent.session = undefined;
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
        collection: 'com.example.marketplace.listing',
        imageCount: processedImages ? processedImages.length : 0,
      });
      
      const result = await this.agent.api.com.atproto.repo.createRecord({
        repo: this.agent.session.did,
        collection: 'com.example.marketplace.listing',
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
      // This is a simplified implementation
      // In a real app, you would need to implement this based on AT Protocol's
      // search and discovery capabilities
      
      // For now, we're using a generic search approach
      // You might need to adapt this based on how AT Protocol evolves
      const queryParams: Record<string, string> = {
        collection: 'com.example.marketplace.listing',
      };
      
      // There's no direct location search in the current AT Protocol
      // This would need to be adapted based on the available APIs
      
      // Placeholder implementation
      const results = await this.agent.api.app.bsky.feed.getTimeline({
        limit: 100,
      });
      
      // Filter for marketplace listings and then by location
      // This is inefficient but demonstrates the concept
      const listings = results.data.feed
        .filter(item => {
          const record = item.post.record as any;
          return record.$type === 'com.example.marketplace.listing';
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
      
      return listings;
    } catch (error) {
      console.error('Failed to retrieve listings:', error);
      throw error;
    }
  }

  // Additional helper methods would go here
  // For example: methods to delete listings, update listings, etc.
}

export default MarketplaceClient;