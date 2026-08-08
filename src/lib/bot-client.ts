import { BskyAgent, RichText } from '@atproto/api';
import { IS_PRODUCTION } from './constants';
import { buildAnnouncement, type AnnouncementListing } from './bot-announcement.ts';
import { fetchListingById } from './server/fetch-listing';
import logger from './logger';

const BOT_HANDLE = process.env.BOT_HANDLE;
const BOT_APP_PASSWORD = process.env.BOT_APP_PASSWORD;

/** bsky.social rejects a blob over 1MB; leave room for multipart overhead. */
const MAX_THUMB_BYTES = 950_000;

let botAgent: BskyAgent | null = null;

export async function getBotAgent() {
  // Re-authenticate if the cached agent has no active session
  // (Netlify cold-starts give us a fresh process, so the cache is empty)
  if (botAgent?.session) return botAgent;

  if (!BOT_HANDLE || !BOT_APP_PASSWORD) {
    throw new Error('Bot credentials not configured');
  }

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  await agent.login({ identifier: BOT_HANDLE, password: BOT_APP_PASSWORD });
  botAgent = agent;
  return agent;
}

/** The thin payload the create-listing form sends, used only if the read fails. */
type ListingData = {
  title: string;
  price: string;
  category: string;
  location: { state: string; county: string; locality: string; isOnlineStore?: boolean };
  description?: string;
};

/**
 * Copy the listing's first photo into the bot's own repo.
 *
 * A blob lives in the repo it was uploaded to, so the seller's photo cannot be
 * referenced from a post in the bot's repo — the bytes have to be re-uploaded.
 * They come from the CDN rather than the seller's PDS because the CDN already
 * serves a resized JPEG, which is reliably under the blob limit; the original
 * may not be.
 *
 * Returns undefined on any failure. A card without a thumbnail is still a card.
 */
async function uploadCardThumb(
  agent: BskyAgent,
  imageUrls: { thumbnail: string; fullsize: string },
): Promise<unknown | undefined> {
  // Fullsize first because the card image is rendered wide; the thumbnail is
  // the fallback for a photo that is somehow still too heavy.
  for (const url of [imageUrls.fullsize, imageUrls.thumbnail]) {
    if (!url || !url.startsWith('http')) continue;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_THUMB_BYTES) continue;

      const upload = await agent.uploadBlob(bytes, {
        encoding: res.headers.get('content-type') || 'image/jpeg',
      });
      return upload.data.blob;
    } catch {
      // Try the next size, then give up on the thumbnail.
    }
  }

  return undefined;
}

/**
 * Read the listing back from the seller's PDS so the announcement can describe
 * it properly.
 *
 * The form's own payload knows a title, a price and a location. The record
 * knows the seller's handle, the sale price, the condition and the photos —
 * all of which the post is better for. Falls back to the payload if the read
 * fails, because a plainer announcement beats none.
 */
async function resolveAnnouncementListing(
  listingUri: string,
  fallback: ListingData,
): Promise<AnnouncementListing & { imageUrls?: { thumbnail: string; fullsize: string } }> {
  try {
    const listing = await fetchListingById(listingUri);

    if (listing && listing !== 'removed') {
      const full = listing as typeof listing & {
        noPrice?: boolean;
        acceptingOffers?: boolean;
        billingPeriod?: string;
        condition?: string;
      };

      return {
        title: full.title,
        description: full.description,
        price: full.price,
        originalPrice: full.originalPrice,
        isOnSale: full.isOnSale,
        noPrice: full.noPrice,
        acceptingOffers: full.acceptingOffers,
        billingPeriod: full.billingPeriod,
        currency: full.currency,
        type: full.type,
        category: full.category,
        condition: full.condition,
        location: {
          ...full.location,
          // fetchListingById drops through the commerce layer, which spells the
          // flag differently on the way out depending on the record version.
          isOnlineStore:
            (full.location as { isOnlineStore?: boolean })?.isOnlineStore ??
            fallback.location?.isOnlineStore,
        },
        // `handle.invalid` is what the network reports for an account whose
        // handle no longer resolves. Printing it would give the post a mention
        // that resolves to nothing and reads as a broken link.
        sellerHandle: full.authorHandle?.endsWith('.invalid') ? undefined : full.authorHandle,
        imageUrls: full.formattedImages?.[0],
      };
    }
  } catch (err) {
    logger.warn('Could not read the listing back for the announcement', {
      meta: { listingUri, error: (err as Error).message },
    });
  }

  return {
    title: fallback.title,
    description: fallback.description,
    price: fallback.price,
    category: fallback.category,
    location: fallback.location,
  };
}

// Posts a marketplace announcement on behalf of the bot account.
// Returns the AT URI of the created post, or null on failure.
export async function createBotAnnouncementPost(
  listingData: ListingData,
  listingUri: string
): Promise<string | null> {
  // A development instance writes its listings to a collection nobody reads,
  // but the announcement went to the real Bluesky regardless — @openmkt.app
  // telling its followers about a listing that cannot be opened. The guard
  // belongs here rather than in the route so any future caller inherits it.
  if (!IS_PRODUCTION) {
    logger.info('Skipped the bot announcement — not a production instance', {
      meta: { listingUri, title: listingData.title },
    });
    return null;
  }

  try {
    const agent = await getBotAgent();

    const { imageUrls, ...listing } = await resolveAnnouncementListing(listingUri, listingData);
    const announcement = buildAnnouncement(listing);

    const listingUrl = `https://openmkt.app/listing/${encodeURIComponent(listingUri)}`;

    const rt = new RichText({ text: announcement.text });
    // Resolves the seller mention and the hashtags into facets. Without this
    // the tags are plain text and the post reaches no tag feed at all.
    await rt.detectFacets(agent);

    const thumb = imageUrls ? await uploadCardThumb(agent, imageUrls) : undefined;

    const result = await agent.post({
      text: rt.text,
      facets: rt.facets,
      embed: {
        $type: 'app.bsky.embed.external',
        external: {
          uri: listingUrl,
          title: announcement.cardTitle,
          description: announcement.cardDescription,
          ...(thumb ? { thumb } : {}),
        },
      } as never,
      createdAt: new Date().toISOString(),
    });

    return result.uri;
  } catch (err) {
    console.error('[bot-client] createBotAnnouncementPost failed:', err);
    return null;
  }
}
