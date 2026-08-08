// src/app/api/og/listing/route.tsx
//
// Preview endpoint for the announcement card. The bot does not go through
// here — it calls renderListingCard directly, so a card is never one HTTP hop
// away from the post that needs it. This exists so the layout can be looked at
// in a browser while it is being worked on.

import { NextRequest } from 'next/server';
import { renderListingCard } from '@/lib/og/listing-card';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get('uri');
  if (!uri) return new Response('uri required', { status: 400 });

  try {
    const card = await renderListingCard(uri);
    return new Response(card as BodyInit, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[og/listing] failed:', err);
    return new Response('could not render', { status: 500 });
  }
}
