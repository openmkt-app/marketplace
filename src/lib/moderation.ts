// src/lib/moderation.ts
// Store for NSFW-flagged listing URIs.
//
// Production: Netlify Blobs. Development: local file in data/moderation.json.
// Same split as banner.ts, for the same reason — a function's filesystem is
// read-only and does not survive the invocation, so the file version threw on
// every production request and took the flagged-URI endpoint down with it.

import { ADMIN_HANDLE } from './constants';

const BLOB_KEY = 'moderation';

// Admin handle that is allowed to moderate. Re-exported so the many server
// routes importing it from here keep working; the value lives in constants.ts,
// which a client bundle can also reach.
export { ADMIN_HANDLE };

export type ModerationEntry = {
  uri: string;
  label: string;
  flaggedAt: string;
  flaggedBy: string;
};

// --- Netlify Blobs (production) ---

async function getBlobStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore('admin');
}

async function readFromBlobs(): Promise<ModerationEntry[]> {
  try {
    const store = await getBlobStore();
    const data = await store.get(BLOB_KEY, { type: 'json' });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeToBlobs(entries: ModerationEntry[]): Promise<void> {
  const store = await getBlobStore();
  await store.setJSON(BLOB_KEY, entries);
}

// --- File-based fallback (local dev) ---

async function moderationFile() {
  const path = await import('path');
  return path.join(process.cwd(), 'data', 'moderation.json');
}

async function readFromFile(): Promise<ModerationEntry[]> {
  const fs = await import('fs');
  const file = await moderationFile();
  try {
    if (!fs.existsSync(file)) return [];
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeToFile(entries: ModerationEntry[]): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const file = await moderationFile();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), 'utf-8');
}

// --- Public API ---

const isProduction = process.env.NODE_ENV === 'production';

async function readStore(): Promise<ModerationEntry[]> {
  return isProduction ? readFromBlobs() : readFromFile();
}

async function writeStore(entries: ModerationEntry[]): Promise<void> {
  return isProduction ? writeToBlobs(entries) : writeToFile(entries);
}

/**
 * Flag a listing URI with an NSFW label.
 */
export async function flagListing(uri: string, flaggedBy: string, label = 'nsfw'): Promise<void> {
  const entries = await readStore();
  // Don't duplicate
  if (entries.some(e => e.uri === uri && e.label === label)) return;
  entries.push({
    uri,
    label,
    flaggedAt: new Date().toISOString(),
    flaggedBy,
  });
  await writeStore(entries);
}

/**
 * Remove a moderation flag from a listing URI.
 */
export async function unflagListing(uri: string, label = 'nsfw'): Promise<void> {
  const entries = (await readStore()).filter(e => !(e.uri === uri && e.label === label));
  await writeStore(entries);
}

/**
 * Check if a specific listing URI has been flagged.
 */
export async function isListingFlagged(uri: string): Promise<boolean> {
  return (await readStore()).some(e => e.uri === uri);
}

/**
 * Get the full set of flagged URIs (for batch checking on the client).
 */
export async function getFlaggedUris(): Promise<string[]> {
  return (await readStore()).map(e => e.uri);
}
