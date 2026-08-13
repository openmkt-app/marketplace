// src/lib/server/blob-json.ts
//
// One JSON value, stored in Netlify Blobs in production and in a file under
// data/ in development. feed-index.ts hand-rolls this same split for the feed;
// the reconcile job needs two more of them (a cursor and a seller registry),
// so the third copy became a helper instead.
//
// Reads never throw. A missing key, an unreachable store and unparseable JSON
// all return the fallback, because every caller's honest answer to "I could not
// read this" is the same as its answer to "there is nothing here yet": start
// from empty. Writes do throw — silently failing to persist a cursor would make
// the reconcile job repeat the same work forever without saying why.

const isProduction = process.env.NODE_ENV === 'production';

async function getBlobStore(store: string) {
  const { getStore } = await import('@netlify/blobs');
  return getStore(store);
}

async function devFilePath(name: string): Promise<string> {
  const path = await import('path');
  return path.join(process.cwd(), 'data', `${name}.json`);
}

export async function readJson<T>(store: string, key: string, fallback: T): Promise<T> {
  try {
    if (isProduction) {
      const blobs = await getBlobStore(store);
      const data = await blobs.get(key, { type: 'json' });
      return (data as T) ?? fallback;
    }
    const fs = await import('fs');
    const file = await devFilePath(`${store}-${key}`);
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(store: string, key: string, value: unknown): Promise<void> {
  if (isProduction) {
    const blobs = await getBlobStore(store);
    await blobs.setJSON(key, value);
    return;
  }
  const fs = await import('fs');
  const path = await import('path');
  const file = await devFilePath(`${store}-${key}`);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}
