// netlify/functions/reconcile.mts
//
// The clock for the archive reconcile. It holds no logic of its own — it calls
// /api/feed/reconcile with the admin secret, so a scheduled run and a manual
// one go down exactly the same path and there is only one place where the job
// can be wrong.
//
// Hourly. The archive is sealed segments billed by compressed bytes downloaded,
// and after the first backfill each run only covers the seq range since the
// last one, so a quiet collection costs very little per run. The push path
// still handles new listings within seconds; this is the slower correction
// underneath it, and nothing it fixes is urgent to the minute.

import type { Config } from '@netlify/functions';

export default async () => {
  const base = process.env.URL;
  const secret = process.env.ADMIN_API_SECRET;

  // Both are set by Netlify or by us in production. Failing loudly here beats a
  // schedule that appears healthy while every run 401s.
  if (!base) return new Response('URL is not set', { status: 500 });
  if (!secret) return new Response('ADMIN_API_SECRET is not set', { status: 500 });

  const res = await fetch(`${base}/api/feed/reconcile`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`reconcile: ${res.status} ${body}`);
    return new Response(body, { status: res.status });
  }

  console.log(`reconcile: ${body}`);
  return new Response(body, { status: 200 });
};

export const config: Config = {
  schedule: '@hourly',
};
