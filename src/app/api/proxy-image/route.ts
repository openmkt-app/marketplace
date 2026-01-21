
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const imageRes = await fetch(url);
        if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);

        const blob = await imageRes.blob();
        const headers = new Headers();
        headers.set('Content-Type', blob.type);
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
}
