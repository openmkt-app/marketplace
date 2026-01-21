
import { NextRequest, NextResponse } from 'next/server';

// Disable caching for this route to prevent stale images in Magic Link imports
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const imageRes = await fetch(url, {
            headers: {
                // Mimic a browser to avoid 403s on Amazon/other images
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });
        if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);

        const blob = await imageRes.blob();
        const headers = new Headers();
        headers.set('Content-Type', blob.type);
        // Disable caching to prevent stale images in Magic Link imports
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('Expires', '0');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
}
