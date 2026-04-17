import { BskyAgent } from '@atproto/api';
import { isSellerExcluded } from '@/lib/excluded-sellers';
import { MARKETPLACE_COLLECTION } from '@/lib/constants';
import { generateImageUrls } from '@/lib/image-utils';
import type { SellerWithListings } from '@/components/marketplace/StoreCard';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import { isSellerCachedEmpty, markSellerEmpty, invalidateSeller } from '@/lib/mall-cache';

function isOnlineStoreListing(listing: MarketplaceListing): boolean {
  return listing.location?.isOnlineStore === true;
}

export async function getVerifiedSellers(): Promise<SellerWithListings[]> {
  try {
    const botHandle = process.env.BOT_HANDLE || 'openmkt.app';
    const botPassword = process.env.BOT_APP_PASSWORD;

    if (!botPassword) {
      console.warn('BOT_APP_PASSWORD not set, cannot fetch verified sellers');
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

    const followProfiles = response.data.follows.filter(
      p => !isSellerExcluded(p.handle)
    );

    const fullProfileMap = new Map<string, { banner?: string; followersCount?: number }>();
    const chunkSize = 25;
    for (let i = 0; i < followProfiles.length; i += chunkSize) {
      const chunk = followProfiles.slice(i, i + chunkSize).map(p => p.did);
      try {
        const res = await agent.getProfiles({ actors: chunk });
        for (const p of res.data.profiles) {
          fullProfileMap.set(p.did, { banner: p.banner, followersCount: p.followersCount });
        }
      } catch {
        // Non-fatal — banner just won't show for this chunk
      }
    }

    const sellerResults = await Promise.allSettled(
      followProfiles.map(async (followProfile) => {
        if (isSellerCachedEmpty(followProfile.did)) {
          return null;
        }

        const fullProfile = followProfile;
        const detailedProfile = fullProfileMap.get(followProfile.did);
        const listings = await (async (): Promise<MarketplaceListing[]> => {
          try {
            let pdsEndpoint = 'https://bsky.social';
            try {
              const didDoc = await fetch(`https://plc.directory/${followProfile.did}`).then(r => r.json());
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

            const pdsAgent = new BskyAgent({ service: pdsEndpoint });
            const listingsResult = await pdsAgent.api.com.atproto.repo.listRecords({
              repo: followProfile.did,
              collection: MARKETPLACE_COLLECTION,
              limit: 50,
              reverse: true,
            });

            if (!listingsResult.success) return [];

            return listingsResult.data.records.map(record => {
              const listing = record.value as MarketplaceListing;
              const formattedImages = generateImageUrls(followProfile.did, listing.images);
              const { images, ...sanitizedListing } = listing;
              return {
                ...sanitizedListing,
                uri: record.uri,
                cid: record.cid,
                sellerDid: followProfile.did,
                formattedImages,
              };
            });
          } catch (e) {
            console.warn(`Could not fetch listings for ${followProfile.handle}:`, e);
            return [];
          }
        })();

        const onlineStoreListings = listings.filter(isOnlineStoreListing);
        if (onlineStoreListings.length === 0) {
          markSellerEmpty(followProfile.did);
          return null;
        }

        invalidateSeller(followProfile.did);

        return {
          did: followProfile.did,
          handle: followProfile.handle,
          displayName: fullProfile.displayName,
          description: fullProfile.description,
          avatar: fullProfile.avatar,
          banner: detailedProfile?.banner,
          followersCount: detailedProfile?.followersCount,
          listingsCount: onlineStoreListings.length,
          listings: onlineStoreListings,
        } as SellerWithListings;
      })
    );

    const sellers: SellerWithListings[] = sellerResults
      .filter((r): r is PromiseFulfilledResult<SellerWithListings | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((s): s is SellerWithListings => s !== null);

    sellers.sort((a, b) => {
      const aIsDemo = a.displayName?.includes('(Demo Store)') || a.handle.includes('demo');
      const bIsDemo = b.displayName?.includes('(Demo Store)') || b.handle.includes('demo');

      if (aIsDemo && !bIsDemo) return 1;
      if (!aIsDemo && bIsDemo) return -1;

      const aLatest = a.listings?.[0]?.createdAt || '';
      const bLatest = b.listings?.[0]?.createdAt || '';

      if (aLatest !== bLatest) {
        return bLatest.localeCompare(aLatest);
      }

      if (b.listingsCount !== a.listingsCount) {
        return b.listingsCount - a.listingsCount;
      }
      return (b.followersCount || 0) - (a.followersCount || 0);
    });

    return sellers;
  } catch (error) {
    console.error('Failed to fetch verified sellers:', error);
    return [];
  }
}
