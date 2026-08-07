// src/lib/marketplace-client.ts
import { Agent, AtpAgent, RichText } from '@atproto/api';
import { generateImageUrls, compressImage } from './image-utils';
import logger from './logger';
import { getKnownMarketplaceDIDs, addMarketplaceDID, ensureVerifiedSellersLoaded, getKnownPDS } from './marketplace-dids';

import { MARKETPLACE_COLLECTION } from './constants';
import {
  COMMERCE_COLLECTION,
  LEGACY_COLLECTION,
  READ_COLLECTIONS,
  SHOP_COLLECTION,
  SHOP_RKEY,
} from './commerce/collections';
import { buildListingRecord, buildShopRecord } from './commerce/serialize';
import { buildSelfLabels, toListingInput } from './commerce/legacy-input';
import { normalizeAndHydrate, normalizeListings } from './commerce/hydrate';
import { normalizeShop } from './commerce/normalize';
import type { Shop, ShopInput } from './commerce/types';
import { toLegacyListing } from './commerce/legacy';
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

export type CommissionStatus = 'open' | 'waitlist' | 'closed';

export type ListingMetadata = {
  subcategory?: string;
  externalPlatform?: string;
  slotsAvailable?: number;
  turnaroundTime?: string;
  commissionStatus?: CommissionStatus;
  [key: string]: any;
};

export type MarketplaceListing = {
  title: string;
  /**
   * goods / service / digital. Set by the commerce normalizer for both record
   * formats — a v1 record has no such field, so it is inferred from the
   * category there. Read this instead of guessing from `category`.
   */
  type?: 'goods' | 'service' | 'digital';
  description: string;
  /** What the buyer pays today: the sale price while a sale is running. */
  price: string;
  /** The struck-through price. Only set while a sale is actually running. */
  originalPrice?: string;
  isOnSale?: boolean;
  /** Undefined means the seller never said whether tax is included. */
  taxInclusive?: boolean;
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

/** What updateListing reports back, so the caller knows where the record ended up. */
export type UpdateListingResult = {
  /** The listing's URI after the update. Differs from the old one after an upgrade. */
  uri: string;
  cid?: string;
  /** True when the record moved from the v1 collection to the commerce one. */
  migrated: boolean;
};

/**
 * The session's OAuth grant does not cover the collection we tried to write.
 *
 * Granular scopes name the collection, so every seller who authorized before
 * the commerce NSID was added to the scope string has to approve it once. This
 * is a normal, expected state — not a bug — so it gets its own type and the UI
 * offers a sign-in instead of showing a raw OAuth error.
 */
export class InsufficientScopeError extends Error {
  readonly collection: string;

  constructor(collection: string, cause?: unknown) {
    super(`Session is not authorized to write ${collection}`);
    this.name = 'InsufficientScopeError';
    this.collection = collection;
    if (cause !== undefined) (this as any).cause = cause;
  }
}

/**
 * Decide whether a failed write was a permission problem.
 *
 * The PDS says "Bad token scope" today, but that wording has changed before, so
 * a 403 on a write we are otherwise authenticated for is also treated as a
 * scope problem — being wrong here costs one unnecessary sign-in prompt, while
 * missing it leaves the seller staring at an unexplained failure.
 */
function isScopeError(error: unknown): boolean {
  const err = error as { status?: number; statusCode?: number; message?: unknown; error?: unknown } | null;
  if (!err) return false;

  const text = `${String(err.message ?? '')} ${String(err.error ?? '')}`;
  if (/scope/i.test(text)) return true;

  const status = err.status ?? err.statusCode;
  return status === 403;
}

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

const publicAgent = new Agent({ service: 'https://public.api.bsky.app' });

export class MarketplaceClient {
  agent: Agent;
  isLoggedIn: boolean;
  private _handle: string | undefined;
  // Cache and rate limit tracking
  private listingsCache: ListingsCache | null;
  private lastApiCall: number;
  private cacheTTL: number;
  private rateLimitInterval: number;
  /** Memoized shop-record lookup, so a session resolves it at most once. */
  private shopUriPromise: Promise<string> | null;

  constructor() {
    // Start with an unauthenticated agent; replaced by setOAuthSession() after login
    this.agent = new AtpAgent({ service: 'https://bsky.social' }) as Agent;
    this.isLoggedIn = false;
    this._handle = undefined;
    this.listingsCache = null;
    this.lastApiCall = 0;
    this.cacheTTL = 5 * 60 * 1000;
    this.rateLimitInterval = 30 * 1000;
    this.shopUriPromise = null;
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
    this.shopUriPromise = null; // Belongs to the previous account
    logger.info('OAuth session configured', { meta: { did, handle } });
  }

  logout(): void {
    this.isLoggedIn = false;
    this._handle = undefined;
    this.shopUriPromise = null;
  }

  /**
   * Return the AT URI of the seller's shop record, creating it if there is none.
   *
   * A listing's `shopRef` is required by the lexicon, so there is no way to
   * write a listing without a shop to point at. Phase 6 gives the shop a UI
   * where the seller can set a real name, policies and shipping; until then it
   * is created with just their handle, which is enough to be valid and is
   * theirs to edit later.
   */
  private async ensureShopRecord(): Promise<string> {
    if (this.shopUriPromise) return this.shopUriPromise;

    const repo = this.agent.accountDid;

    this.shopUriPromise = (async () => {
      try {
        const existing = await this.agent.api.com.atproto.repo.getRecord({
          repo,
          collection: SHOP_COLLECTION,
          rkey: SHOP_RKEY,
        });
        if (existing.data?.uri) return existing.data.uri;
      } catch {
        // No shop record yet. Any other read failure lands here too, and the
        // write below is a putRecord at a fixed rkey, so retrying is harmless.
      }

      const created = await this.agent.api.com.atproto.repo.putRecord({
        repo,
        collection: SHOP_COLLECTION,
        rkey: SHOP_RKEY,
        record: buildShopRecord({ name: this._handle || repo }),
      });

      logger.info('Created a shop record', { meta: { uri: created.data.uri } });
      return created.data.uri;
    })().catch((error) => {
      // Do not cache a failure: the next save should try again.
      this.shopUriPromise = null;
      throw error;
    });

    return this.shopUriPromise;
  }

  /**
   * Read the signed-in seller's shop record.
   *
   * Returns null when there is none, which is the state of any seller who has
   * never saved a listing — creating one on a read would put a record in their
   * repo just for opening a settings page.
   */
  async getShop(): Promise<Shop | null> {
    if (!this.isLoggedIn || !this.agent.did) return null;

    const repo = this.agent.accountDid;
    try {
      const res = await this.agent.api.com.atproto.repo.getRecord({
        repo,
        collection: SHOP_COLLECTION,
        rkey: SHOP_RKEY,
      });
      if (!res.data?.value) return null;
      return normalizeShop(res.data.value as Record<string, any>, {
        uri: res.data.uri,
        cid: res.data.cid,
        authorDid: repo,
      });
    } catch {
      return null;
    }
  }

  /**
   * Save the seller's shop.
   *
   * putRecord at a fixed rkey, so this both creates and updates. The original
   * createdAt is preserved for the same reason listings preserve theirs: it is
   * the date the shop opened, not the date its policies were last edited.
   */
  async updateShop(input: ShopInput): Promise<Shop> {
    if (!this.isLoggedIn || !this.agent.did) {
      throw new Error('User must be logged in to update a shop');
    }

    const repo = this.agent.accountDid;
    try {
      const existing = await this.getShop();
      const record = buildShopRecord(input, existing?.createdAt);

      const res = await this.agent.api.com.atproto.repo.putRecord({
        repo,
        collection: SHOP_COLLECTION,
        rkey: SHOP_RKEY,
        record,
      });

      // The shop URI never changes, but a first save creates it — let the
      // memoized lookup pick it up rather than going stale at null.
      this.shopUriPromise = Promise.resolve(res.data.uri);

      return normalizeShop(record, { uri: res.data.uri, cid: res.data.cid, authorDid: repo });
    } catch (error) {
      if (isScopeError(error)) {
        throw new InsufficientScopeError(SHOP_COLLECTION, error);
      }
      logger.error('Failed to update shop', error as Error);
      throw error;
    }
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
        collection: COMMERCE_COLLECTION,
        imageCount: processedImages ? processedImages.length : 0,
        hideFromFriends: listingDataWithoutImages.hideFromFriends || false
      });

      // New records are always the commerce shape. serialize.ts keeps the
      // whitelist that stops hydrated UI fields (authorHandle, formattedImages)
      // from reaching the repo; the field list lives there now rather than being
      // spelled out inline at each write site.
      const shopRef = await this.ensureShopRecord();

      const recordToCreate = buildListingRecord(
        { ...toListingInput(listingDataWithoutImages), shopRef, images: processedImages },
        { labels: buildSelfLabels(listingDataWithoutImages.isNsfw) }
      );

      const result = await this.agent.api.com.atproto.repo.createRecord({
        repo: this.agent.accountDid,
        collection: COMMERCE_COLLECTION,
        record: recordToCreate,
      });

      // Handle standard AT Proto response shape { data: { uri, cid }, success: boolean }
      const recordData = result.data ? result.data : result;

      // Notify the feed indexer — fire-and-forget, must not break listing
      // creation. It is fed from the form's own values rather than the record,
      // because the index still speaks v1 (flat price, US location object).
      const listingUri = (recordData as any).uri as string | undefined;
      if (listingUri) {
        this.notifyFeedIndex(listingUri, listingDataWithoutImages);
      }

      return {
        ...(recordData as unknown as Record<string, unknown>),
        images: processedImages // Return the blobs so we can use them for sharing
      };
    } catch (error) {
      if (isScopeError(error)) {
        throw new InsufficientScopeError(COMMERCE_COLLECTION, error);
      }
      console.error('Failed to create listing:', error);
      throw error;
    }
  }

  /**
   * Tell the feed index about a listing. Fire-and-forget by design: the index
   * is a cache of what is in the repos, so a failed notification costs a slower
   * appearance, never the write itself.
   */
  private notifyFeedIndex(
    listingUri: string,
    listingData: Partial<MarketplaceListing>,
    action?: 'delete',
  ): void {
    fetch('/api/feed/notify-new-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingUri,
        ...(action ? { action } : {}),
        listingData: {
          title: listingData.title || '',
          price: listingData.price || '',
          category: listingData.category || '',
          location: listingData.location || { state: '', county: '', locality: '' },
          description: listingData.description,
          // The announcement decision is made server-side, so the flag has to
          // travel with the notification.
          hideFromFriends: listingData.hideFromFriends || false,
        },
      }),
    }).catch(() => {});
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

      // Remove from feed index — fire-and-forget
      this.notifyFeedIndex(uri, {}, 'delete');

      // Invalidate cache
      this.listingsCache = null;

    } catch (error) {
      logger.error('Failed to delete listing', error as Error);
      throw error;
    }
  }

  /**
   * Update an existing listing.
   *
   * A v1 record cannot be edited in place any more: writes go to the commerce
   * collection, and putRecord cannot move a record between collections. So
   * editing an old listing creates the new record and deletes the old one, and
   * the listing's URI changes — which is why this returns where it ended up
   * instead of void.
   */
  async updateListing(
    uri: string,
    listingData: CreateListingParams & { images?: (File | ListingImage)[] },
  ): Promise<UpdateListingResult> {
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

      // Read the record we are replacing, for two reasons.
      //
      // Its createdAt has to survive the edit. The old code wrote `new Date()`
      // here and called it "bumps to top of feed", which would silently reorder
      // the whole browse page the first time every seller edits an old listing.
      //
      // It also proves the record is there before we create its replacement,
      // so the upgrade path below never leaves a duplicate behind a record that
      // was already gone.
      const existing = await this.agent.api.com.atproto.repo.getRecord({
        repo,
        collection,
        rkey,
      });

      const existingValue = (existing.data?.value ?? {}) as Record<string, any>;
      const createdAt: string = existingValue.createdAt || new Date().toISOString();

      logger.info('Updating listing record', {
        meta: {
          uri,
          title: listingDataWithoutImages.title,
          imageCount: finalImages ? finalImages.length : 0,
          migrating: collection === LEGACY_COLLECTION
        }
      });

      // Keep the shop the record already pointed at, if it had one — an edit
      // should not silently repoint a listing at a different shop.
      const shopRef = existingValue.shopRef || (await this.ensureShopRecord());

      const record = buildListingRecord(
        { ...toListingInput(listingDataWithoutImages), shopRef, images: finalImages },
        { createdAt, labels: buildSelfLabels(listingDataWithoutImages.isNsfw) }
      );

      // Already in the commerce collection: a plain overwrite.
      if (collection === COMMERCE_COLLECTION) {
        await this.agent.api.com.atproto.repo.putRecord({
          repo,
          collection,
          rkey,
          record
        });

        this.listingsCache = null;
        return { uri, cid: existing.data?.cid, migrated: false };
      }

      // Upgrade path: create the new record first, then delete the old one.
      //
      // The order matters and the failure modes are not symmetric. Create-first
      // means a failed delete leaves a duplicate — visible in my-listings and
      // removable in one click. Delete-first would mean a failed create loses
      // the seller's listing outright, with the edit they just typed. A
      // duplicate is the cheaper thing to be wrong about.
      //
      // It also keeps the images. Both records point at the same blobs, and the
      // PDS reference-counts them — creating first means the count never drops
      // to zero, so nothing can be swept between the two calls.
      const created = await this.agent.api.com.atproto.repo.createRecord({
        repo,
        collection: COMMERCE_COLLECTION,
        record,
      });

      const newUri = created.data?.uri;
      if (!newUri) {
        throw new Error('Upgrade failed: the new record was not created');
      }

      try {
        await this.agent.api.com.atproto.repo.deleteRecord({ repo, collection, rkey });
      } catch (deleteError) {
        // The edit is saved. Say plainly what is left over rather than failing
        // an update that actually succeeded.
        logger.error('Upgraded a listing but could not delete the old record', deleteError as Error);
        this.listingsCache = null;
        throw new Error(
          'Your changes were saved, but the old copy of this listing could not be removed. ' +
          'You should see it twice — delete the older one from My Listings.'
        );
      }

      logger.info(`Upgraded listing to the commerce collection: ${uri} -> ${newUri}`);

      // Point the index at the new URI. Order matters here too: add first, so
      // the listing is never missing from the feed in between.
      this.notifyFeedIndex(newUri, listingDataWithoutImages);
      this.notifyFeedIndex(uri, {}, 'delete');

      this.listingsCache = null;
      return { uri: newUri, cid: created.data?.cid, migrated: true };

    } catch (error) {
      if (isScopeError(error)) {
        throw new InsufficientScopeError(COMMERCE_COLLECTION, error);
      }
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
  /**
   * All listings for the browse page.
   *
   * Prefers the indexed API, which is a single same-origin request. The old
   * behaviour — fanning out from the browser to every seller's PDS at
   * concurrency 5 — is kept as a fallback but is dramatically slower: it
   * resolves a PDS and calls listRecords per seller, serially in batches, so
   * first paint waited on the whole network round trip. Measured at ~13s
   * against ~0.2s for the indexed path.
   *
   * The privacy filter still runs client-side either way. hideFromFriends needs
   * the viewer's own follow graph, which the server does not have.
   */
  async getAllListings(): Promise<MarketplaceListing[]> {
    try {
      const indexed = await fetchPublicListings();
      if (indexed.length > 0) {
        logger.info(`Fetched ${indexed.length} listings via the indexed API`);
        return indexed as any;
      }
      logger.warn('Indexed API returned nothing; falling back to per-DID fan-out');
    } catch (error) {
      logger.warn('Indexed API failed; falling back to per-DID fan-out', error as Error);
    }

    return this.getAllListingsByFanOut();
  }

  /** Original per-seller fan-out. Fallback only — see getAllListings. */
  private async getAllListingsByFanOut(): Promise<MarketplaceListing[]> {
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

      // Both collections. A seller's own storefront is the one place that must
      // never miss a listing: this is the read behind my-listings and the
      // post-save redirect, so a v1-only scan would hide every listing the
      // seller has edited since the write path moved.
      const rawRecords: Array<{ record: Record<string, any>; uri: string; cid: string }> = [];

      for (const collection of READ_COLLECTIONS) {
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
            rawRecords.push(...result.data.records.map(record => ({
              record: record.value as Record<string, any>,
              uri: record.uri,
              cid: record.cid,
            })));
          }
        } catch (error) {
          // A collection the seller has never written to returns an error on
          // some PDS implementations. That is not a failure worth surfacing.
          logger.warn(`Failed to fetch ${collection} listings for ${did}`, error as Error);
        }
      }

      // Normalize whichever shape each record is in, then hand the UI the shape
      // it already understands. Image URLs come from the `images` array here
      // rather than being generated separately below.
      const processedListings = normalizeListings(
        rawRecords.map(row => ({ ...row, authorDid: did }))
      ).map(listing => ({
        ...(toLegacyListing(listing) as any),
        authorDid: did,
        authorHandle: handle,
        uri: listing.uri,
        cid: listing.cid,
      }));

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

      // Index the user's own share post — replaces any existing bot post for this listing
      fetch('/api/feed/notify-new-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingUri: uri,
          postUri: postResult.uri,
          source: 'user',
          listingData: {
            title: listingData.title,
            price: listingData.price,
            category: listingData.category,
            location: listingData.location,
            description: listingData.description,
          },
        }),
      }).catch(() => {});

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

          const searchResults = await publicAgent.api.app.bsky.feed.searchPosts({
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

      // "Hide from friends" is no longer applied here. It lived in three
      // places — twice inline and once in filterHiddenListings — each with its
      // own idea of the rule, and only one of them learned that the openmkt.app
      // account is exempt. That is how a flagged listing stayed invisible to
      // moderation after the exemption was added. The single implementation is
      // src/lib/viewer-visibility.ts, applied by the pages that render
      // listings.

      const finalListings = processedListings;


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
            // Get the author's profile to fetch handle
            const handle = await this.getHandleFromDid(repo);

            // This is what feeds the edit form, so the record has to be
            // normalized rather than spread: a commerce record has `pricing`
            // and no `price`, and spreading it would hand the form an empty
            // price field and silently wipe the listing on save.
            const listing = {
              ...(toLegacyListing(
                normalizeAndHydrate(result.data.value as Record<string, any>, {
                  uri,
                  cid: result.data.cid,
                  authorDid: repo,
                })
              ) as any),
              authorDid: repo,
              authorHandle: handle,
              uri: uri,
              cid: result.data.cid,
            } as MarketplaceListing;

            logger.info(`Successfully fetched listing via getRecord: ${listing.title}`);
            return listing;
          }
        } catch (directFetchError) {
          logger.warn('Direct record fetch failed, trying feed API', directFetchError as Error);
        }
      }

      // Fallback: Try fetching via the feed API (works for posts)
      logger.logApiRequest('GET', 'app.bsky.feed.getPostThread', { uri });

      const result = await publicAgent.api.app.bsky.feed.getPostThread({
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
      const result = await publicAgent.api.app.bsky.graph.getFollows({
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


}

/**
 * Fetch public marketplace listings without requiring authentication.
 * Proxied through the Next.js API to avoid CORS issues with direct PDS requests.
 */
export async function fetchPublicListings(): Promise<(MarketplaceListing & {
  authorDid: string;
  authorHandle: string;
  uri: string;
  cid: string;
})[]> {
  logger.info('[Public] Fetching public listings via API proxy');

  try {
    const response = await fetch('/api/marketplace/listings');
    if (!response.ok) {
      logger.warn(`[Public] Listings API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const listings: (MarketplaceListing & {
      authorDid: string;
      authorHandle: string;
      uri: string;
      cid: string;
    })[] = (data.listings ?? []).map((listing: any) => ({
      ...listing,
      formattedImages: generateImageUrls(listing.authorDid, listing.images),
    }));

    logger.info(`[Public] Total marketplace listings found: ${listings.length}`);
    return listings;
  } catch (error) {
    logger.error('[Public] Failed to fetch listings', error as Error);
    return [];
  }
}

export default MarketplaceClient;
