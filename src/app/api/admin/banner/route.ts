import { NextRequest, NextResponse } from 'next/server';
import { getBanner, setBanner, clearBanner } from '@/lib/banner';
import { ADMIN_HANDLE } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const banner = await getBanner();
  return NextResponse.json({ banner });
}

export async function POST(req: NextRequest) {
  try {
    const { message, type, handle } = await req.json();

    if (handle !== ADMIN_HANDLE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    await setBanner({
      message: message.trim(),
      type: type ?? 'warning',
      setAt: new Date().toISOString(),
      setBy: handle,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { handle } = await req.json();
    if (handle !== ADMIN_HANDLE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await clearBanner();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
