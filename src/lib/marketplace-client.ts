// src/lib/marketplace-client.ts
import { BskyAgent } from '@atproto/api';
import type { AtpSessionEvent, AtpSessionData } from '@atproto/api';

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
      const result = await this.agent.login({
        identifier: username,
        password: password,
      });
      this.isLoggedIn = true;
      return { success: true, data: result };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error as Error };
    }
  }

  async createListing(listingData: CreateListingParams): Promise<any> {
    if (!this.isLoggedIn) {
      throw new Error('User must be logged in to create a listing');
    }

    try {
      // Upload images first if they exist
      const processedImages = await this.processImages(listingData.images);

      // Create the listing record
      const result = await this.agent.api.com.atproto.repo.createRecord({
        repo: this.agent.session!.did,
        collection: 'com.example.marketplace.listing',
        record: {
          ...listingData,
          images: processedImages,
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
        const arrayBuffer = await file.arrayBuffer();
        const result = await this.agent.uploadBlob(new Uint8Array(arrayBuffer), {
          encoding: file.type,
        });

        if (result.success) {
          processedImages.push(result.data.blob);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Continue with other images even if one fails
      }
    }

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