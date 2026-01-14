/**
 * Helper utility to fetch a specific marketplace listing directly by DID
 * This bypasses Jetstream and search APIs to directly query a user's repository
 */

import { BskyAgent } from '@atproto/api';
import type { MarketplaceListing } from './marketplace-client';
import { generateImageUrls } from './image-utils';

/**
 * Resolve the PDS (Personal Data Server) for a given DID
 */
async function resolvePDS(did: string): Promise<string | null> {
  try {
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
    console.warn(`Failed to resolve PDS for ${did}:`, error);
    return null;
  }
}

/**
 * Fetch all marketplace listings from a specific user's DID
 * @param did The DID of the user whose listings to fetch
 * @param serviceUrl Optional override for the service URL (if not provided, will be resolved from DID)
 */
export async function fetchListingsFromDID(
  did: string,
  serviceUrl?: string
): Promise<MarketplaceListing[]> {
  // Resolve the user's PDS if no service URL provided
  if (!serviceUrl) {
    const resolvedPDS = await resolvePDS(did);
    if (!resolvedPDS) {
      console.error(`Could not resolve PDS for ${did}`);
      return [];
    }
    serviceUrl = resolvedPDS;
    console.log(`Resolved PDS for ${did}: ${serviceUrl}`);
  }

  const agent = new BskyAgent({ service: serviceUrl });

  try {
    console.log(`Fetching marketplace listings from DID: ${did}`);

    const result = await agent.api.com.atproto.repo.listRecords({
      repo: did,
      collection: 'app.atprotomkt.marketplace.listing',
      limit: 100
    });

    if (result.success && result.data.records.length > 0) {
      console.log(`Found ${result.data.records.length} listings from ${did}`);

      // Get the user's profile for handle
      let handle = did;
      try {
        const profile = await agent.api.com.atproto.repo.getRecord({
          repo: did,
          collection: 'app.bsky.actor.profile',
          rkey: 'self'
        });
        if (profile.data?.value && typeof (profile.data.value as any).handle === 'string') {
          handle = (profile.data.value as any).handle;
        }
      } catch {
        // If we can't get the handle, just use the DID
      }

      // Convert records to MarketplaceListing objects
      const listings: MarketplaceListing[] = result.data.records.map(record => {
        const listing = {
          ...record.value as MarketplaceListing,
          authorDid: did,
          authorHandle: handle,
          uri: record.uri,
          cid: record.cid,
        };

        // Add formatted image URLs
        if (listing.images && listing.images.length > 0) {
          listing.formattedImages = generateImageUrls(did, listing.images);
        }

        return listing;
      });

      return listings;
    }

    console.log(`No listings found for DID: ${did}`);
    return [];
  } catch (error) {
    console.error(`Error fetching listings from DID ${did}:`, error);
    return [];
  }
}

/**
 * Fetch marketplace listings from multiple DIDs
 * Useful when you know the DIDs of users who have listings
 * Each DID's PDS will be automatically resolved
 */
export async function fetchListingsFromMultipleDIDs(
  dids: string[]
): Promise<MarketplaceListing[]> {
  console.log(`Fetching listings from ${dids.length} DIDs...`);

  const allListingsPromises = dids.map(did => fetchListingsFromDID(did));
  const allListingsArrays = await Promise.all(allListingsPromises);

  // Flatten the array of arrays
  const allListings = allListingsArrays.flat();

  console.log(`Total listings found: ${allListings.length}`);
  return allListings;
}
