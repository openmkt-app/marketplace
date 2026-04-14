// src/app/api/admin/moderate/flagged/route.ts
// Returns the full list of flagged URIs for client-side blur checks

import { NextResponse } from 'next/server';
import { getFlaggedUris } from '@/lib/moderation';

export async function GET() {
  const uris = getFlaggedUris();
  return NextResponse.json({ uris });
}
