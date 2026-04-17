import { BskyAgent, RichText } from '@atproto/api';

const BOT_HANDLE = process.env.BOT_HANDLE;
const BOT_APP_PASSWORD = process.env.BOT_APP_PASSWORD;

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

type ListingData = {
  title: string;
  price: string;
  category: string;
  location: { state: string; county: string; locality: string; isOnlineStore?: boolean };
  description?: string;
};

// Posts a brief marketplace announcement on behalf of the bot account.
// Returns the AT URI of the created post, or null on failure.
export async function createBotAnnouncementPost(
  listingData: ListingData,
  listingUri: string
): Promise<string | null> {
  try {
    const agent = await getBotAgent();

    const priceVal = parseFloat(listingData.price || '0');
    const isFree = !listingData.price || priceVal === 0;
    const priceStr = isFree
      ? 'Free 🎁'
      : `$${priceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const locationLabel = listingData.location?.isOnlineStore
      ? 'Online'
      : [listingData.location?.locality, listingData.location?.state]
          .filter(Boolean)
          .join(', ') || listingData.location?.state || '';

    const listingUrl = `https://openmkt.app/listing/${encodeURIComponent(listingUri)}`;

    const text = locationLabel
      ? `📦 New listing on Open Market: ${listingData.title} — ${priceStr} (${locationLabel})\n\n${listingUrl}`
      : `📦 New listing on Open Market: ${listingData.title} — ${priceStr}\n\n${listingUrl}`;

    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    const result = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });

    return result.uri;
  } catch (err) {
    console.error('[bot-client] createBotAnnouncementPost failed:', err);
    return null;
  }
}
