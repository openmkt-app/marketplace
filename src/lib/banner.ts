// src/lib/banner.ts
// Site-wide alert banner store.
// Production: Netlify Blobs (persistent across function invocations)
// Development: local file in data/banner.json

export type BannerEntry = {
  message: string;
  type: 'warning' | 'error' | 'info';
  setAt: string;
  setBy: string;
};

const BLOB_KEY = 'site-banner';

// --- Netlify Blobs (production) ---

async function getBlobStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore('admin');
}

async function getBannerFromBlobs(): Promise<BannerEntry | null> {
  try {
    const store = await getBlobStore();
    const data = await store.get(BLOB_KEY, { type: 'json' });
    return data ?? null;
  } catch {
    return null;
  }
}

async function setBannerInBlobs(entry: BannerEntry): Promise<void> {
  const store = await getBlobStore();
  await store.setJSON(BLOB_KEY, entry);
}

async function clearBannerInBlobs(): Promise<void> {
  try {
    const store = await getBlobStore();
    await store.delete(BLOB_KEY);
  } catch { /* already gone */ }
}

// --- File-based fallback (local dev) ---

async function getBannerFromFile(): Promise<BannerEntry | null> {
  const fs = await import('fs');
  const path = await import('path');
  const file = path.join(process.cwd(), 'data', 'banner.json');
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

async function setBannerInFile(entry: BannerEntry): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const file = path.join(process.cwd(), 'data', 'banner.json');
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf-8');
}

async function clearBannerInFile(): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const file = path.join(process.cwd(), 'data', 'banner.json');
  try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
}

// --- Public API ---

const isProduction = process.env.NODE_ENV === 'production';

export async function getBanner(): Promise<BannerEntry | null> {
  return isProduction ? getBannerFromBlobs() : getBannerFromFile();
}

export async function setBanner(entry: BannerEntry): Promise<void> {
  return isProduction ? setBannerInBlobs(entry) : setBannerInFile(entry);
}

export async function clearBanner(): Promise<void> {
  return isProduction ? clearBannerInBlobs() : clearBannerInFile();
}
