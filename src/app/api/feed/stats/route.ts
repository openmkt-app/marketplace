import { NextResponse } from 'next/server';
import { getFeedStats } from '@/lib/feed-index';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getFeedStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ count: 0, updatedAt: new Date().toISOString() });
  }
}
