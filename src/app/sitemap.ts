import { MetadataRoute } from 'next';
import { BskyAgent } from '@atproto/api';
import { MARKETPLACE_COLLECTION } from '@/lib/constants';

const BASE_URL = 'https://openmkt.app';

// Fetch verified sellers from the bot's follows
async function getVerifiedSellers(): Promise<Array<{ did: string; handle: string }>> {
  try {
    const botHandle = process.env.BOT_HANDLE || 'openmkt.app';
    const botPassword = process.env.BOT_APP_PASSWORD;

    if (!botPassword) {
      console.warn('BOT_APP_PASSWORD not set, cannot fetch verified sellers for sitemap');
      return [];
    }

    const agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({
      identifier: botHandle,
      password: botPassword,
    });

    const response = await agent.getFollows({
      actor: agent.session?.did || botHandle,
      limit: 100,
    });

    return response.data.follows.map(profile => ({
      did: profile.did,
      handle: profile.handle,
    }));
  } catch (error) {
    console.error('Failed to fetch verified sellers for sitemap:', error);
    return [];
  }
}

// Fetch listings for a seller
async function getSellerListings(did: string): Promise<Array<{ uri: string; createdAt: string }>> {
  try {
    // Resolve PDS for the seller
    let pdsEndpoint = 'https://bsky.social';
    try {
      const didDoc = await fetch(`https://plc.directory/${did}`).then(r => r.json());
      const pdsService = didDoc.service?.find(
        (s: { id: string; type: string; serviceEndpoint: string }) =>
          s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
      );
      if (pdsService?.serviceEndpoint) {
        pdsEndpoint = pdsService.serviceEndpoint;
      }
    } catch {
      // Use default
    }

    const agent = new BskyAgent({ service: pdsEndpoint });
    const result = await agent.api.com.atproto.repo.listRecords({
      repo: did,
      collection: MARKETPLACE_COLLECTION,
      limit: 50,
    });

    if (result.success && result.data.records.length > 0) {
      return result.data.records.map(record => ({
        uri: record.uri,
        createdAt: (record.value as any).createdAt || new Date().toISOString(),
      }));
    }

    return [];
  } catch (error) {
    console.error(`Failed to fetch listings for ${did}:`, error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/browse`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/mall`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/community/safety`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/community/seller-guide`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Fetch verified sellers and their listings
  const sellers = await getVerifiedSellers();

  // Store pages for verified sellers
  const storeRoutes: MetadataRoute.Sitemap = sellers.map(seller => ({
    url: `${BASE_URL}/store/${seller.handle}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Fetch listings from all sellers (limit to recent ones for performance)
  const allListings: Array<{ uri: string; createdAt: string }> = [];

  // Fetch listings in parallel, but limit concurrency
  const BATCH_SIZE = 5;
  for (let i = 0; i < sellers.length; i += BATCH_SIZE) {
    const batch = sellers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(seller => getSellerListings(seller.did))
    );
    batchResults.forEach(listings => allListings.push(...listings));
  }

  // Sort by creation date (newest first) and limit to 200 most recent
  allListings.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentListings = allListings.slice(0, 200);

  // Listing pages
  const listingRoutes: MetadataRoute.Sitemap = recentListings.map(listing => ({
    url: `${BASE_URL}/listing/${encodeURIComponent(listing.uri)}`,
    lastModified: new Date(listing.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...storeRoutes, ...listingRoutes];
}
