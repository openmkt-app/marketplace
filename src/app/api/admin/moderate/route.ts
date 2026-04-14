// src/app/api/admin/moderate/route.ts
// API route for admin moderation (flag/unflag listings as NSFW)

import { NextRequest, NextResponse } from 'next/server';
import { flagListing, unflagListing, isListingFlagged, ADMIN_HANDLE } from '@/lib/moderation';

export async function POST(req: NextRequest) {
  try {
    const { uri, action, handle } = await req.json();

    // Only the admin handle can moderate
    if (handle !== ADMIN_HANDLE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!uri || !action) {
      return NextResponse.json({ error: 'Missing uri or action' }, { status: 400 });
    }

    if (action === 'flag') {
      flagListing(uri, handle);
      return NextResponse.json({ success: true, flagged: true });
    } else if (action === 'unflag') {
      unflagListing(uri);
      return NextResponse.json({ success: true, flagged: false });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "flag" or "unflag".' }, { status: 400 });
    }
  } catch (error) {
    console.error('Moderation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get('uri');

  if (!uri) {
    return NextResponse.json({ error: 'Missing uri param' }, { status: 400 });
  }

  const flagged = isListingFlagged(uri);
  return NextResponse.json({ flagged });
}
