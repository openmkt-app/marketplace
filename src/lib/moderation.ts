// src/lib/moderation.ts
// Simple file-based moderation store for NSFW-flagged listing URIs.
// In production, replace with a proper database.

import fs from 'fs';
import path from 'path';
import { ADMIN_HANDLE } from './constants';

const MODERATION_FILE = path.join(process.cwd(), 'data', 'moderation.json');

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

function ensureDataDir() {
  const dir = path.dirname(MODERATION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore(): ModerationEntry[] {
  ensureDataDir();
  if (!fs.existsSync(MODERATION_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(MODERATION_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeStore(entries: ModerationEntry[]) {
  ensureDataDir();
  fs.writeFileSync(MODERATION_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Flag a listing URI with an NSFW label.
 */
export function flagListing(uri: string, flaggedBy: string, label = 'nsfw'): void {
  const entries = readStore();
  // Don't duplicate
  if (entries.some(e => e.uri === uri && e.label === label)) return;
  entries.push({
    uri,
    label,
    flaggedAt: new Date().toISOString(),
    flaggedBy,
  });
  writeStore(entries);
}

/**
 * Remove a moderation flag from a listing URI.
 */
export function unflagListing(uri: string, label = 'nsfw'): void {
  const entries = readStore().filter(e => !(e.uri === uri && e.label === label));
  writeStore(entries);
}

/**
 * Check if a specific listing URI has been flagged.
 */
export function isListingFlagged(uri: string): boolean {
  return readStore().some(e => e.uri === uri);
}

/**
 * Get the full set of flagged URIs (for batch checking on the client).
 */
export function getFlaggedUris(): string[] {
  return readStore().map(e => e.uri);
}
