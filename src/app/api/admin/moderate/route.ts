// src/app/api/admin/moderate/route.ts
// API route for admin moderation (flag/unflag listings as NSFW)

import { NextRequest, NextResponse } from 'next/server';
import { flagListing, unflagListing, isListingFlagged } from '@/lib/moderation';
import { requireAdmin } from '@/lib/server/admin-auth';
import { ADMIN_HANDLE } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const denied = requireAdmin(req);
    if (denied) return denied;

    const { uri, action } = await req.json();

    if (!uri || !action) {
      return NextResponse.json({ error: 'Missing uri or action' }, { status: 400 });
    }

    if (action === 'flag') {
      await flagListing(uri, ADMIN_HANDLE);
      return NextResponse.json({ success: true, flagged: true });
    } else if (action === 'unflag') {
      await unflagListing(uri);
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

  const flagged = await isListingFlagged(uri);
  return NextResponse.json({ flagged });
}
