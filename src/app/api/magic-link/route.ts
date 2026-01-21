
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // No caching

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        // validate URL
        const targetUrl = new URL(url);

        // Fetch HTML
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(targetUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-User': '?1'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` }, { status: response.status });
        }

        const html = await response.text();

        // Helper to decode HTML entities (basic)
        const decodeHtml = (str: string | null | undefined) => {
            if (!str) return null;
            return str
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');
        };

        const getMetaContent = (prop: string) => {
            const regex = new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:|product:)?${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
            const match = html.match(regex);
            return decodeHtml(match ? match[1] : null);
        };

        const getTitle = () => {
            const rawTitle = getMetaContent('title') ||
                (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);

            if (!rawTitle) return null;

            let decodedTitle = decodeHtml(rawTitle);

            // Amazon cleanups
            if (decodedTitle?.startsWith('Amazon.com:')) {
                decodedTitle = decodedTitle.replace('Amazon.com:', '').trim();
            }
            if (decodedTitle?.startsWith('Amazon.com :')) {
                decodedTitle = decodedTitle.replace('Amazon.com :', '').trim();
            }

            return decodedTitle?.trim();
        };

        const title = getTitle();
        const description = getMetaContent('description')?.trim();

        let image = getMetaContent('image');
        let price = getMetaContent('price:amount') || getMetaContent('amount');

        // Amazon Image Logic
        if ((!image || image.includes('amazon_logo')) && (targetUrl.hostname.includes('amazon') || targetUrl.hostname.includes('amzn'))) {
            const oldHiresRegex = /data-old-hires=["']([^"']+)["']/i;
            const oldHiresMatch = html.match(oldHiresRegex);
            if (oldHiresMatch && oldHiresMatch[1]) image = oldHiresMatch[1];
            else {
                const dynImgRegex = /data-a-dynamic-image=["']([^"']+)["']/i;
                const dynImgMatch = html.match(dynImgRegex);
                if (dynImgMatch && dynImgMatch[1]) {
                    try {
                        const decodedJson = decodeHtml(dynImgMatch[1]);
                        if (decodedJson) {
                            const json = JSON.parse(decodedJson);
                            const urls = Object.keys(json);
                            if (urls.length > 0) image = urls[0];
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        }

        // ------------------------------------------------------------------
        // Strategy A: JSON-LD Parsing (Classic Shopify, Schema.org)
        // ------------------------------------------------------------------
        const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = jsonLdRegex.exec(html)) !== null) {
            try {
                const json = JSON.parse(match[1]);
                const data = Array.isArray(json) ? json : [json];
                const product = data.find((item: any) =>
                    item['@type'] === 'Product' || item['@type'] === 'http://schema.org/Product'
                );

                if (product) {
                    if (!image) {
                        if (typeof product.image === 'string') image = product.image;
                        else if (Array.isArray(product.image) && product.image.length > 0) {
                            const img = product.image[0];
                            image = typeof img === 'string' ? img : (img.url || img.contentUrl);
                        } else if (typeof product.image === 'object') {
                            image = product.image.url || product.image.contentUrl;
                        }
                    }

                    if (!price && product.offers) {
                        const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
                        const offer = offers[0];
                        if (offer) {
                            price = offer.price || offer.highPrice || offer.lowPrice;
                        }
                    }
                    break;
                }
            } catch (e) { /* ignore */ }
        }

        // ------------------------------------------------------------------
        // Strategy B1: Shopify Hydrogen/Remix Streaming Data
        // ------------------------------------------------------------------
        if (!price || !image) {
            try {
                // Look for price in stream: "price":{"amount":"325.0", ... }
                // Pattern matches escaped JSON within script strings
                if (!price) {
                    // match both "amount":"123" and "amount":123
                    const remixPriceRegex = /\\"price\\":\s*\{\s*\\"amount\\":\s*\\"?([\d\.]+)\\"?/;
                    const match = html.match(remixPriceRegex);
                    if (match && match[1]) {
                        price = match[1];
                    }
                }

                if (!image) {
                    // Look for high res image in stream
                    // \"url\":\"https://cdn.shopify...\" 
                    // We want to avoid small thumbnails, but getting any image is better than none
                    // Look for typical product image patterns
                    const remixImgRegex = /\\"url\\":\s*\\"(https:[^"]+cdn\.shopify\.com[^"]+?\.jpg[^"]*?)\\"/i;
                    const match = html.match(remixImgRegex);
                    if (match && match[1]) {
                        // Usually these urls have unicode escapes like \u0026 -> &
                        //JSON.parse will clean them if we wrap in quotes
                        try {
                            image = JSON.parse(`"${match[1]}"`);
                        } catch (e) {
                            image = match[1];
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        }

        // ------------------------------------------------------------------
        // Strategy B2: Shopify "meta" Variable (Legacy)
        // ------------------------------------------------------------------
        if (!price) {
            const shopifyMetaRegex = /var\s+meta\s*=\s*(\{[\s\S]*?\});/i;
            const metaMatch = html.match(shopifyMetaRegex);
            if (metaMatch) {
                try {
                    const metaJson = JSON.parse(metaMatch[1]);
                    if (metaJson.product && metaJson.product.variants && metaJson.product.variants.length > 0) {
                        let vPrice = metaJson.product.variants[0].price; // usually in cents
                        if (vPrice) {
                            price = (vPrice / 100).toFixed(2);
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        }

        // ------------------------------------------------------------------
        // Strategy C: Generic RegEx Scraper (Last Resort)
        // ------------------------------------------------------------------
        if (!price) {
            // Improved regex to handle nested elements inside 'price' classes
            // e.g. <div class="product-price"><div>$325.00</div></div>
            // Look for "price" class, then within next 100 chars, find currency/number
            const priceBlockRegex = /(?:class|id)=["'][^"']*(?:price|amount|cost|offer)[^"']*["'][^>]*>([\s\S]{0,150})/gi;
            let pMatch;
            while ((pMatch = priceBlockRegex.exec(html)) !== null) {
                // Check the captured content for a price-like string
                const content = pMatch[1];
                const priceValMatch = content.match(/[$£€]\s*([\d,]+\.?\d{0,2})/);
                if (priceValMatch) {
                    price = priceValMatch[1].replace(/,/g, ''); // clean commas
                    break;
                }
            }

            if (!price) {
                // Amazon fallback
                const amzPrice = html.match(/<span[^>]*class=["'][^"']*a-offscreen[^"']*["'][^>]*>\$([\d,]+\.?\d{0,2})<\/span>/i);
                if (amzPrice) price = amzPrice[1];
            }
        }

        if (!image) {
            const shopifyImgCdn = html.match(/https?:\/\/[^"'\s]+\.shopify\.com\/[^"'\s]+?\.(?:jpg|png|webp|jpeg)/i);
            if (shopifyImgCdn) image = shopifyImgCdn[0];
        }

        return NextResponse.json({
            title: title || undefined,
            description: description || undefined,
            image: image || undefined,
            price: price || undefined,
            url: targetUrl.toString()
        });

    } catch (error: any) {
        console.error('Magic Link Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process URL' }, { status: 500 });
    }
}
