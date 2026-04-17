// src/lib/feed-index.ts
// Feed index for the Bluesky custom feed generator.
// Stores post URIs indexed newest-first so the skeleton endpoint can serve them.
// Production: Netlify Blobs (store: 'feed-index')
// Development: local file at data/feed-index.json

export type FeedEntry = {
  postUri: string;     // at://did:.../app.bsky.feed.post/rkey
  listingUri: string;  // at://did:.../app.openmkt.marketplace.listing/rkey
  sellerDid: string;
  indexedAt: string;   // ISO timestamp — used for cursor pagination
  source: 'bot' | 'user' | 'curated';
  note?: string; // optional curator note (e.g. "spotted on Bluesky, great couch")
};

type FeedIndex = {
  entries: FeedEntry[];
  updatedAt: string;
};

type IndexerCursor = {
  cursor: number; // Unix microseconds (Jetstream time_us)
  updatedAt: string;
};

const BLOB_STORE = 'feed-index';
const FEED_ALL_KEY = 'feed:all';
const CURSOR_KEY = 'indexer-cursor';
const MAX_ENTRIES = 2000;

// --- Netlify Blobs (production) ---

async function getBlobStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore(BLOB_STORE);
}

async function readIndexFromBlobs(): Promise<FeedIndex> {
  try {
    const store = await getBlobStore();
    const data = await store.get(FEED_ALL_KEY, { type: 'json' });
    return data ?? { entries: [], updatedAt: new Date().toISOString() };
  } catch {
    return { entries: [], updatedAt: new Date().toISOString() };
  }
}

async function writeIndexToBlobs(index: FeedIndex): Promise<void> {
  const store = await getBlobStore();
  await store.setJSON(FEED_ALL_KEY, index);
}

async function readCursorFromBlobs(): Promise<number> {
  try {
    const store = await getBlobStore();
    const data: IndexerCursor | null = await store.get(CURSOR_KEY, { type: 'json' });
    return data?.cursor ?? 0;
  } catch {
    return 0;
  }
}

async function writeCursorToBlobs(cursor: number): Promise<void> {
  const store = await getBlobStore();
  await store.setJSON(CURSOR_KEY, { cursor, updatedAt: new Date().toISOString() });
}

// --- File-based fallback (local dev) ---

async function getDevFilePath(name: string): Promise<string> {
  const path = await import('path');
  return path.join(process.cwd(), 'data', `${name}.json`);
}

async function readIndexFromFile(): Promise<FeedIndex> {
  const fs = await import('fs');
  const file = await getDevFilePath('feed-index');
  try {
    if (!fs.existsSync(file)) return { entries: [], updatedAt: new Date().toISOString() };
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { entries: [], updatedAt: new Date().toISOString() };
  }
}

async function writeIndexToFile(index: FeedIndex): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const file = await getDevFilePath('feed-index');
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(index, null, 2), 'utf-8');
}

async function readCursorFromFile(): Promise<number> {
  const fs = await import('fs');
  const file = await getDevFilePath('feed-cursor');
  try {
    if (!fs.existsSync(file)) return 0;
    const data: IndexerCursor = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return data.cursor ?? 0;
  } catch {
    return 0;
  }
}

async function writeCursorToFile(cursor: number): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const file = await getDevFilePath('feed-cursor');
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ cursor, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
}

// --- Public API ---

const isProduction = process.env.NODE_ENV === 'production';

async function readIndex(): Promise<FeedIndex> {
  return isProduction ? readIndexFromBlobs() : readIndexFromFile();
}

async function writeIndex(index: FeedIndex): Promise<void> {
  return isProduction ? writeIndexToBlobs(index) : writeIndexToFile(index);
}

export async function addToFeedIndex(entry: FeedEntry): Promise<void> {
  const index = await readIndex();

  // If an entry for this listingUri already exists (e.g. from bot), replace it
  // when we get a user share post (prefer user's own post)
  const existing = index.entries.findIndex((e) => e.listingUri === entry.listingUri);
  if (existing !== -1) {
    if (entry.source === 'user' || index.entries[existing].source !== 'user') {
      index.entries.splice(existing, 1);
    } else {
      // Keep existing user post, skip bot duplicate
      return;
    }
  }

  // Prepend newest entry, cap at MAX_ENTRIES
  index.entries = [entry, ...index.entries].slice(0, MAX_ENTRIES);
  index.updatedAt = new Date().toISOString();
  await writeIndex(index);
}

export async function removeFromFeedIndex(listingUri: string): Promise<void> {
  const index = await readIndex();
  const before = index.entries.length;
  index.entries = index.entries.filter((e) => e.listingUri !== listingUri);
  if (index.entries.length !== before) {
    index.updatedAt = new Date().toISOString();
    await writeIndex(index);
  }
}

export async function getFeedPage(
  cursor: string | undefined,
  limit: number
): Promise<{ entries: FeedEntry[]; nextCursor?: string }> {
  const index = await readIndex();
  const entries = index.entries;

  let startIdx = 0;
  if (cursor) {
    try {
      const cursorTime = Buffer.from(cursor, 'base64').toString('utf-8');
      const idx = entries.findIndex((e) => e.indexedAt <= cursorTime);
      startIdx = idx === -1 ? entries.length : idx;
    } catch {
      startIdx = 0;
    }
  }

  const page = entries.slice(startIdx, startIdx + limit);
  const nextCursor =
    page.length === limit && startIdx + limit < entries.length
      ? Buffer.from(page[page.length - 1].indexedAt).toString('base64')
      : undefined;

  return { entries: page, nextCursor };
}

export async function getIndexerCursor(): Promise<number> {
  return isProduction ? readCursorFromBlobs() : readCursorFromFile();
}

export async function setIndexerCursor(cursor: number): Promise<void> {
  return isProduction ? writeCursorToBlobs(cursor) : writeCursorToFile(cursor);
}

export async function getFeedStats(): Promise<{ count: number; updatedAt: string }> {
  const index = await readIndex();
  return { count: index.entries.length, updatedAt: index.updatedAt };
}
