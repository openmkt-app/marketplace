// src/lib/banner.ts
// File-based store for the site-wide alert banner.

import fs from 'fs';
import path from 'path';

// In production (Vercel, Netlify, etc.) the project root is read-only.
// /tmp is the only writable directory available in serverless runtimes.
const BANNER_FILE = process.env.NODE_ENV === 'production'
  ? '/tmp/banner.json'
  : path.join(process.cwd(), 'data', 'banner.json');

export type BannerEntry = {
  message: string;
  type: 'warning' | 'error' | 'info';
  setAt: string;
  setBy: string;
};

function ensureDataDir() {
  if (process.env.NODE_ENV === 'production') return; // /tmp always exists
  const dir = path.dirname(BANNER_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getBanner(): BannerEntry | null {
  ensureDataDir();
  if (!fs.existsSync(BANNER_FILE)) return null;
  try {
    const raw = fs.readFileSync(BANNER_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setBanner(entry: BannerEntry): void {
  ensureDataDir();
  fs.writeFileSync(BANNER_FILE, JSON.stringify(entry, null, 2), 'utf-8');
}

export function clearBanner(): void {
  if (fs.existsSync(BANNER_FILE)) {
    fs.unlinkSync(BANNER_FILE);
  }
}
