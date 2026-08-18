// src/app/api/admin/moderate/flagged/route.ts
// Returns the full list of flagged URIs for client-side blur checks

import { NextResponse } from 'next/server';
import { getFlaggedUris } from '@/lib/moderation';

export async function GET() {
  const uris = await getFlaggedUris();
  return NextResponse.json(
    { uris },
    {
      headers: {
        // Every browse, mall and store view asks for this list, and it changes
        // only when the admin flags something. Serving it from the edge for a
        // few minutes turns a per-visitor function call into a per-window one.
        // The list is public either way: it is what the client blurs against.
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
      },
    }
  );
}
