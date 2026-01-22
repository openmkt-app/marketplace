// src/lib/marketplace-client.ts
import { BskyAgent, RichText } from '@atproto/api';
import type { AtpSessionData } from '@atproto/api';
import { generateImageUrls, compressImage } from './image-utils';
import logger from './logger';
import { getKnownMarketplaceDIDs, addMarketplaceDID, ensureVerifiedSellersLoaded } from './marketplace-dids';

import { MARKETPLACE_COLLECTION } from './constants';
import { createRequestDPoPProof, OAuthTokens } from './oauth-client';

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
  private oauthTokens: OAuthTokens | null = null;

  constructor(serviceUrl: string = 'https://bsky.social') {
    // enhanced fetch handler to support DPoP
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // If we have DPoP tokens, we need to sign the request
      if (this.oauthTokens && (this.oauthTokens.token_type === 'DPoP' || this.oauthTokens.token_type === 'dpop')) {
        try {
          const method = init?.method || (input instanceof Request ? input.method : 'GET');
          let url: string;
          if (input instanceof Request) {
            url = input.url;
          } else if (input instanceof URL) {
            url = input.toString();
          } else {
            url = input as string;
          }

          // Helper to perform the request, optionally with a nonce
          const performRequest = async (nonce?: string) => {
            // Generate DPoP proof
            const proof = await createRequestDPoPProof(method, url, nonce);

            // Clone init to avoid mutating original
            const newInit = { ...init } as any;
            newInit.headers = new Headers(newInit.headers);

            // Add DPoP header
            newInit.headers.set('DPoP', proof);

            // Fix Authorization header if needed (Agent sets 'Bearer', we need 'DPoP')
            const auth = newInit.headers.get('Authorization');
            if (auth && auth.startsWith('Bearer ')) {
              newInit.headers.set('Authorization', `DPoP ${auth.slice(7)}`);
            }

            return fetch(input, newInit);
          };

          // Initial request
          let response = await performRequest();

          // Handle DPoP nonce error (use_dpop_nonce)
          if (response.status === 401) {
            const checkResponse = response.clone();
            try {
              // Try to parse error to see if it's a DPoP nonce error
              const errorHeader = checkResponse.headers.get('WWW-Authenticate');
              const errorJson = await checkResponse.json().catch(() => ({}));

              const isNonceError = errorJson.error === 'use_dpop_nonce' ||
                (errorHeader && errorHeader.includes('use_dpop_nonce'));

              if (isNonceError) {
                const nonce = response.headers.get('DPoP-Nonce');
                if (nonce) {
                  // logger.debug('Retrying request with new DPoP nonce');
                  response = await performRequest(nonce);
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }

          return response;
        } catch (error) {
          console.error('Error generating DPoP proof:', error);
          // Fallback to normal fetch if proof generation fails
          return fetch(input, init);
        }
      }

      return fetch(input, init);
    };

    // Initialize agent with custom fetch
    // Note: BskyAgent constructor might not expose 'fetch' in all versions, 
    // but AtpBaseClient (base) does. We cast config to any to bypass strict type check if needed.
    this.agent = new BskyAgent({
      service: serviceUrl,
      fetch: customFetch
    } as any);

    this.isLoggedIn = false;
    // Initialize cache and rate limit properties
    this.listingsCache = null;
    this.lastApiCall = 0;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache TTL
    this.rateLimitInterval = 30 * 1000; // 30 seconds between API calls
  }

  private async resolvePdsEndpoint(handle: string): Promise<string | null> {
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    try {
      const resolved = await this.agent.resolveHandle({ handle: cleanHandle });
      const did = resolved.data.did;
      const didDocResponse = await this.agent.com.atproto.identity.resolveDid({ did });
      const didDoc = (didDocResponse.data as any).didDoc;
      const services = Array.isArray(didDoc?.service) ? didDoc.service : [];
      const pdsService = services.find(
        (service: any) => service.id === '#atproto_pds' || service.type === 'AtprotoPersonalDataServer'
      );

      if (pdsService?.serviceEndpoint) {
        return pdsService.serviceEndpoint as string;
      }
    } catch (error) {
      logger.warn('Failed to resolve PDS endpoint for handle', error as Error);
    }

    return null;
  }

  async login(username: string, password: string): Promise<SessionData> {
    try {
      const resolvedPds = await this.resolvePdsEndpoint(username);
      if (resolvedPds && this.agent.serviceUrl.toString() !== resolvedPds) {
        this.agent = new BskyAgent({ service: resolvedPds });
      }

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

  async resumeOAuthSession(tokens: OAuthTokens, pdsUrl?: string): Promise<{ success: boolean; data?: Record<string, unknown>; error?: Error }> {
    try {
      logger.info('Attempting to resume OAuth session', { meta: { did: tokens.sub, tokenType: tokens.token_type } });
      console.log('[OAuth Resume] Starting with DID:', tokens.sub, 'Token type:', tokens.token_type);

      // Resolve the user's PDS (always resolve from DID for reliability)
      const serviceUrl = await this.resolvePDS(tokens.sub) || 'https://bsky.social';
      console.log('[OAuth Resume] Resolved PDS:', serviceUrl);
      logger.info(`Resolved PDS for OAuth session: ${serviceUrl}`);

      // Recreate agent with custom fetch handler for the correct PDS
      const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (this.oauthTokens && (this.oauthTokens.token_type === 'DPoP' || this.oauthTokens.token_type === 'dpop')) {
          try {
            const method = init?.method || (input instanceof Request ? input.method : 'GET');
            let url: string;
            if (input instanceof Request) {
              url = input.url;
            } else if (input instanceof URL) {
              url = input.toString();
            } else {
              url = input as string;
            }

            const performRequest = async (nonce?: string) => {
              const proof = await createRequestDPoPProof(method, url, nonce);
              const newInit = { ...init } as any;
              newInit.headers = new Headers(newInit.headers);
              newInit.headers.set('DPoP', proof);
              const auth = newInit.headers.get('Authorization');
              if (auth && auth.startsWith('Bearer ')) {
                newInit.headers.set('Authorization', `DPoP ${auth.slice(7)}`);
              }
              return fetch(input, newInit);
            };

            let response = await performRequest();

            if (response.status === 401) {
              const checkResponse = response.clone();
              try {
                const errorHeader = checkResponse.headers.get('WWW-Authenticate');
                const errorJson = await checkResponse.json().catch(() => ({}));
                const isNonceError = errorJson.error === 'use_dpop_nonce' ||
                  (errorHeader && errorHeader.includes('use_dpop_nonce'));
                if (isNonceError) {
                  const nonce = response.headers.get('DPoP-Nonce');
                  if (nonce) {
                    response = await performRequest(nonce);
                  }
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }

            return response;
          } catch (error) {
            console.error('Error generating DPoP proof:', error);
            return fetch(input, init);
          }
        }
        return fetch(input, init);
      };

      // Create new agent pointed at the user's PDS
      this.agent = new BskyAgent({
        service: serviceUrl,
        fetch: customFetch
      } as any);

      this.oauthTokens = tokens;

      // Construct session data for the agent
      const sessionData: SessionData = {
        accessJwt: tokens.access_token,
        refreshJwt: tokens.refresh_token,
        handle: 'loading...', // We don't have handle yet, will resolve
        did: tokens.sub,
        email: undefined,
        active: true
      };

      // Set the session on the agent
      await this.agent.resumeSession(sessionData);

      // Verify session and get profile (which also gets the real handle)
      try {
        console.log('[OAuth Resume] Fetching profile for:', tokens.sub);
        const result = await this.agent.getProfile({
          actor: tokens.sub,
        });

        this.isLoggedIn = true;
        // Update handle in session
        if (this.agent.session) {
          this.agent.session.handle = result.data.handle;
        }

        console.log('[OAuth Resume] Success! Handle:', result.data.handle);
        logger.info('OAuth session resumed successfully');
        return { success: true, data: { user: result.data } };
      } catch (error) {
        console.error('[OAuth Resume] Profile fetch failed:', error);
        logger.error('Failed to verify OAuth session', error as Error);
        this.isLoggedIn = false;
        this.oauthTokens = null;
        return { success: false, error: error as Error };
      }
    } catch (error) {
      console.error('[OAuth Resume] General error:', error);
      logger.error('Error resuming OAuth session', error as Error);
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
        collection: MARKETPLACE_COLLECTION,
        imageCount: processedImages ? processedImages.length : 0,
        hideFromFriends: listingDataWithoutImages.hideFromFriends || false
      });

      // Construct the record with ONLY the fields defined in the lexicon
      // This prevents 'authorHandle' or other hydrated fields from polluting the PDS record
      const recordToCreate = {
        title: listingDataWithoutImages.title,
        price: listingDataWithoutImages.price,
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

      const result = await this.agent.api.com.atproto.repo.createRecord({
        repo: this.agent.session.did,
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
    if (!this.isLoggedIn || !this.agent.session) {
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
      if (repo !== this.agent.session.did) {
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
    if (!this.isLoggedIn || !this.agent.session) {
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
      if (repo !== this.agent.session.did) {
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

      // Construct the record with ONLY the fields defined in the lexicon
      const recordToUpdate = {
        title: listingDataWithoutImages.title,
        price: listingDataWithoutImages.price,
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

      if (!this.isLoggedIn || !this.agent.session) {
        logger.warn('User is not logged in');
        return [];
      }

      // Get known DIDs from registry, ensuring verified sellers are loaded
      await ensureVerifiedSellersLoaded();
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
    if (!this.isLoggedIn || !this.agent.session) {
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
        'other': '#Misc #OpenMarket'
      };

      // Get hashtags for the category, fallback to generic if not found
      const categoryTag = listingData.category ? categoryHashtags[listingData.category] : '#OpenMarket';

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
        text = `New in the shop: ${listingData.title} ✨\n\n${priceStr}\n\nAvailable now on my @openmkt.app storefront. 👇\n\n#OpenMarket ${categoryTag}`.trim();
      } else {
        // Personal listing format
        const askingLine = isFree ? "It's Free! 🎁" : `Asking ${priceStr}.`;
        const forSaleTag = isFree ? "" : "#ForSale";
        const introLine = isFree ? `Giving away my ${listingData.title} 🎁` : `Selling my ${listingData.title} 📦`;
        embedAction = isFree ? "Giving Away" : "Selling";

        // Format:
        // {IntroLine}
        // {AskingLine}
        // Listed it on @openmkt.app for the community. Link below! 👇
        // {Hashtags} {ForSaleTag}

        text = `${introLine}\n\n${askingLine}\n\nListed it on @openmkt.app for the community. Link below! 👇\n\n${categoryTag} ${forSaleTag}`.trim();
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
            if (listing.authorDid === this.agent.session?.did) {
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
   * Get details about the follow relationship with a target user
   * Returns whether we follow them, and when we started following
   */
  async getFollowDetails(targetDid: string): Promise<{ isFollowing: boolean; followedAt?: string }> {
    if (!this.isLoggedIn || !this.agent.session) {
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
            repo: this.agent.session.did, // The follow is in OUR repo
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
          if (listing.authorDid === this.agent.session?.did) {
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
      const response = await fetch(`https://plc.directory/${did}`);
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
      const response = await fetch(`https://plc.directory/${did}`);
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

  // Fetch from all known DIDs in parallel
  const fetchPromises = knownMarketplaceDIDs.map(async (did) => {
    try {
      // Resolve the PDS for this DID
      const pdsUrl = await resolvePDS(did);
      if (!pdsUrl) {
        logger.warn(`[Public] Could not resolve PDS for ${did}`);
        return [];
      }

      // Create a temporary unauthenticated agent for this PDS
      const agent = new BskyAgent({ service: pdsUrl });

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

  logger.info(`[Public] Total marketplace listings found: ${listings.length}`);

  return listings;
}

export default MarketplaceClient;
