import { BskyAgent, RichText } from '@atproto/api';
import { MAY_BROADCAST } from './constants';
import { buildAnnouncement, type AnnouncementListing } from './bot-announcement.ts';
import { fetchListingById } from './server/fetch-listing';
import { renderListingCard } from './og/listing-card';
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

/**
 * The branded card: the listing drawn onto a 1200x800 image with its price,
 * category and a call to action, rather than the bare product photo.
 *
 * Rendering happens in-process rather than through the preview route, so the
 * announcement never depends on the site being able to call itself. Returns
 * undefined on any failure and the caller falls back to the raw photo — the
 * renderer needs a WebAssembly module in the deployed bundle, which is exactly
 * the kind of thing that works locally and not in production.
 */
async function uploadBrandedCard(agent: BskyAgent, listingUri: string): Promise<unknown | undefined> {
  try {
    const card = await renderListingCard(listingUri);
    if (card.byteLength === 0 || card.byteLength > MAX_THUMB_BYTES) return undefined;

    const upload = await agent.uploadBlob(card, { encoding: 'image/jpeg' });
    return upload.data.blob;
  } catch (err) {
    logger.warn('Card render failed — falling back to the product photo', {
      meta: { listingUri, error: (err as Error).message },
    });
    return undefined;
  }
}

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
 * Returns null when the record cannot be read, and the caller then posts
 * nothing. This used to fall back to the payload the caller supplied, on the
 * grounds that a plainer announcement beats none — which was true right up
 * until you notice that the caller is an unauthenticated HTTP request. Anyone
 * could hand this function a title and a price and have @openmkt.app read them
 * out to its followers. The record is the only trustworthy source here, because
 * it is the only one that had to be signed by the seller's own repo.
 */
async function resolveAnnouncementListing(
  listingUri: string,
): Promise<(AnnouncementListing & { imageUrls?: { thumbnail: string; fullsize: string } }) | null> {
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
          isOnlineStore: (full.location as { isOnlineStore?: boolean })?.isOnlineStore,
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

  return null;
}

/**
 * Posts a marketplace announcement on behalf of the bot account.
 *
 * Takes only the listing's AT URI. Everything the post says is read from the
 * record that URI names — nothing reaches a timeline because a caller asked for
 * it. Returns the AT URI of the created post, or null if it did not post.
 */
export async function createBotAnnouncementPost(listingUri: string): Promise<string | null> {
  // Only the live site announces. A deploy preview reaches the same real
  // followers the production site does, so the guard belongs here rather than
  // in the route, where a future caller could forget it.
  if (!MAY_BROADCAST) {
    logger.info('Skipped the bot announcement — this instance may not broadcast', {
      meta: { listingUri },
    });
    return null;
  }

  try {
    const agent = await getBotAgent();

    const resolved = await resolveAnnouncementListing(listingUri);
    if (!resolved) {
      logger.warn('Not announcing: the listing record could not be read', { meta: { listingUri } });
      return null;
    }

    const { imageUrls, ...listing } = resolved;
    const announcement = buildAnnouncement(listing);

    const listingUrl = `https://openmkt.app/listing/${encodeURIComponent(listingUri)}`;

    const rt = new RichText({ text: announcement.text });
    // Resolves the seller mention and the hashtags into facets. Without this
    // the tags are plain text and the post reaches no tag feed at all.
    await rt.detectFacets(agent);

    // The branded card first; the product photo only if drawing one failed.
    const thumb =
      (await uploadBrandedCard(agent, listingUri)) ??
      (imageUrls ? await uploadCardThumb(agent, imageUrls) : undefined);

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
