
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // No caching

// Different user agents for different strategies
const USER_AGENTS = {
    // Googlebot - most sites allow this for SEO
    googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    // Chrome browser
    chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    // Mobile Chrome - sometimes gets different treatment
    mobile: 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    // Slackbot - messaging bots are whitelisted by sites like Etsy for link preview generation
    slackbot: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
};

// Sites that block regular browsers but allow crawlers
const CRAWLER_PREFERRED_DOMAINS = ['poshmark.com', 'depop.com'];

// Sites that only respond to messaging bot UAs (e.g. Slackbot) — limited to OG data only
const MESSAGING_BOT_DOMAINS = ['etsy.com'];

// Sites that are very aggressive with rate limiting - use special handling
const AGGRESSIVE_RATE_LIMIT_DOMAINS: string[] = [];

function selectUserAgent(hostname: string): string {
    const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');

    // Use Googlebot for sites known to block regular requests
    if (CRAWLER_PREFERRED_DOMAINS.some(domain => normalizedHost.includes(domain))) {
        return USER_AGENTS.googlebot;
    }

    return USER_AGENTS.chrome;
}

function isAggressiveRateLimitSite(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
    return AGGRESSIVE_RATE_LIMIT_DOMAINS.some(domain => normalizedHost.includes(domain));
}

function isMessagingBotDomain(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
    return MESSAGING_BOT_DOMAINS.some(domain => normalizedHost.includes(domain));
}

// Helper to add random delay for rate-limited sites
function randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

// Fetch with retry logic for rate-limited sites
async function fetchWithRetry(
    url: URL,
    maxRetries: number = 3
): Promise<{ response: Response | null; error: string | null }> {
    // Etsy and similar sites only allow messaging bot UAs — use Slackbot directly, no retry cycling
    if (isMessagingBotDomain(url.hostname)) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': USER_AGENTS.slackbot,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                signal: controller.signal,
                redirect: 'follow',
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                return { response: null, error: `Failed to fetch URL: ${response.status} ${response.statusText}` };
            }
            return { response, error: null };
        } catch (err: any) {
            clearTimeout(timeoutId);
            return { response: null, error: err.message || 'Request failed' };
        }
    }

    const isAggressiveSite = isAggressiveRateLimitSite(url.hostname);
    const userAgents = isAggressiveSite
        ? [USER_AGENTS.mobile, USER_AGENTS.chrome, USER_AGENTS.googlebot] // Try different UAs
        : [selectUserAgent(url.hostname)];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Add delay between retries, longer for aggressive sites
        if (attempt > 0) {
            const baseDelay = isAggressiveSite ? 2000 : 500;
            await randomDelay(baseDelay * attempt, baseDelay * attempt * 2);
        }

        const userAgent = userAgents[attempt % userAgents.length];
        const isGooglebot = userAgent.includes('Googlebot');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const headers: Record<string, string> = isGooglebot
            ? {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            : {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': userAgent.includes('Mobile') ? '?1' : '?0',
                'Sec-Ch-Ua-Platform': userAgent.includes('Android') ? '"Android"' : '"macOS"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
            };

        try {
            const response = await fetch(url.toString(), {
                headers,
                signal: controller.signal,
                redirect: 'follow',
            });

            clearTimeout(timeoutId);

            // If rate limited, retry with backoff
            if (response.status === 429 || response.status === 403) {
                console.log(`Attempt ${attempt + 1} failed with ${response.status}, retrying...`);
                continue;
            }

            if (!response.ok) {
                return { response: null, error: `Failed to fetch URL: ${response.status} ${response.statusText}` };
            }

            return { response, error: null };
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (attempt === maxRetries - 1) {
                return { response: null, error: err.message || 'Request failed' };
            }
        }
    }

    return { response: null, error: 'Max retries exceeded - site may be blocking requests' };
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        // validate URL
        const targetUrl = new URL(url);

        // Fetch with retry logic
        const { response, error } = await fetchWithRetry(targetUrl);

        if (error || !response) {
            return NextResponse.json({ error: error || 'Failed to fetch URL' }, { status: 400 });
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

            // Etsy appends " - Etsy" to titles
            if (decodedTitle?.endsWith(' - Etsy')) {
                decodedTitle = decodedTitle.slice(0, -' - Etsy'.length).trim();
            }

            return decodedTitle?.trim();
        };

        const isEtsyUrl = isMessagingBotDomain(targetUrl.hostname);

        const title = getTitle();
        // Etsy's og:description is generic metadata (favorites, location, date) — not the product description
        const description = isEtsyUrl ? undefined : getMetaContent('description')?.trim();

        const images = new Set<string>();

        // Get all matching meta content
        const getAllMetaContent = (prop: string) => {
            const regex = new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:|product:)?${prop}["'][^>]+content=["']([^"']+)["']`, 'gi');
            const matches: string[] = [];
            let match;
            while ((match = regex.exec(html)) !== null) {
                const decoded = decodeHtml(match[1]);
                if (decoded) matches.push(decoded);
            }
            return matches;
        };

        const imageMatches = getAllMetaContent('image');
        imageMatches.forEach(img => images.add(img));
        
        let image = imageMatches[0];
        let price = getMetaContent('price:amount') || getMetaContent('amount');

        // Amazon Image Logic — extract full product gallery (incl. hidden images)
        if (targetUrl.hostname.includes('amazon') || targetUrl.hostname.includes('amzn')) {
            // Strategy 1: colorImages JS variable — contains ALL product images including hidden ones
            const colorImagesIdx = html.indexOf("'colorImages'");
            if (colorImagesIdx !== -1) {
                const blockStart = html.indexOf('[', colorImagesIdx);
                if (blockStart !== -1) {
                    // Walk the array to find its end
                    let depth = 0, i = blockStart, inStr = false, escape = false;
                    for (; i < html.length; i++) {
                        const ch = html[i];
                        if (escape) { escape = false; continue; }
                        if (ch === '\\') { escape = true; continue; }
                        if (ch === '"' && !inStr) inStr = true;
                        else if (ch === '"' && inStr) inStr = false;
                        if (!inStr) {
                            if (ch === '[') depth++;
                            if (ch === ']') { depth--; if (depth === 0) break; }
                        }
                    }
                    try {
                        const arr = JSON.parse(html.substring(blockStart, i + 1)) as { hiRes?: string; large?: string }[];
                        arr.forEach(item => {
                            const url = item.hiRes || item.large;
                            if (url) images.add(url);
                        });
                    } catch (e) { /* ignore */ }
                }
            }

            // Strategy 2 (fallback): data-old-hires — only on visible gallery items
            if (images.size === 0) {
                const oldHiresRegex = /data-old-hires=["']([^"']+)["']/gi;
                let hiresMatch;
                while ((hiresMatch = oldHiresRegex.exec(html)) !== null) {
                    if (hiresMatch[1]) images.add(hiresMatch[1]);
                }
            }

            // Strategy 3 (last resort): data-a-dynamic-image, m.media-amazon.com only
            if (images.size === 0) {
                const dynImgRegex = /data-a-dynamic-image=["']([^"']+)["']/gi;
                let extMatch;
                while ((extMatch = dynImgRegex.exec(html)) !== null) {
                    try {
                        const decodedJson = decodeHtml(extMatch[1]);
                        if (decodedJson && decodedJson.startsWith('{')) {
                            const json = JSON.parse(decodedJson) as Record<string, number[]>;
                            const urls = Object.keys(json).filter(u => u.includes('m.media-amazon.com/images/I/'));
                            if (urls.length > 0) {
                                urls.sort((a,b) => (json[b][0] || 0) - (json[a][0] || 0));
                                let bigImage = urls[0];
                                bigImage = bigImage.replace(/\._[A-Za-z0-9_,]+_\./, '.');
                                images.add(bigImage);
                            }
                        }
                    } catch (e) { /* ignore */ }
                }
            }

            // Update the primary image if needed
            if (images.size > 0 && (!image || image.includes('amazon_logo') || image.includes('_.jpg'))) {
                image = Array.from(images)[0];
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
                let products: any[] = [];
                const targetVariant = targetUrl.searchParams.get('variant');

                data.forEach((item: any) => {
                    if (item['@type'] === 'Product' || item['@type'] === 'http://schema.org/Product') {
                        if (targetVariant) {
                            if ((item['@id'] && item['@id'].includes(`variant=${targetVariant}`)) ||
                                (item.offers && item.offers.url && item.offers.url.includes(`variant=${targetVariant}`))) {
                                products.push(item);
                            }
                        } else {
                            products.push(item);
                        }
                    } else if (item['@type'] === 'ProductGroup' || item['@type'] === 'http://schema.org/ProductGroup') {
                        if (targetVariant) {
                            if (Array.isArray(item.hasVariant)) {
                                const variant = item.hasVariant.find((v: any) => 
                                    (v['@id'] && v['@id'].includes(`variant=${targetVariant}`)) ||
                                    (v.offers && v.offers.url && v.offers.url.includes(`variant=${targetVariant}`))
                                );
                                if (variant) products.push(variant);
                            }
                        } else {
                            products.push(item);
                            if (Array.isArray(item.hasVariant)) {
                                products.push(...item.hasVariant);
                            }
                        }
                    }
                });

                if (products.length > 0) {
                    products.forEach(product => {
                        if (Array.isArray(product.image)) {
                            product.image.forEach((img: any) => {
                                const url = typeof img === 'string' ? img : (img.url || img.contentUrl);
                                if (url) images.add(url);
                            });
                        } else if (typeof product.image === 'string') {
                            images.add(product.image);
                        } else if (typeof product.image === 'object' && product.image !== null) {
                            const url = product.image.url || product.image.contentUrl;
                            if (url) images.add(url);
                        }
                    });
                    
                    if (!image && images.size > 0) image = Array.from(images)[0];

                    if (!price) {
                        // Find first valid price among all products/variants
                        for (const product of products) {
                            if (product.offers) {
                                const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
                                const offer = offers[0];
                                if (offer && (offer.price || offer.highPrice || offer.lowPrice)) {
                                    price = offer.price || offer.highPrice || offer.lowPrice;
                                    break;
                                }
                            }
                        }
                    }
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
                            const urlStr = JSON.parse(`"${match[1]}"`);
                            images.add(urlStr);
                            if (!image) image = urlStr;
                        } catch (e) {
                            images.add(match[1]);
                            if (!image) image = match[1];
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

        // Fix duplicate identical images by stripping query params & forcing https
        const cleanImageUrl = (url: string) => {
            let clean = url.startsWith('//') ? 'https:' + url : url.replace(/^http:/, 'https:');
            clean = clean.split('?')[0]; // Strip ?v=... and &width=...
            // Remove sizing heuristics like _100x100
            clean = clean.replace(/_[0-9]+x[0-9]*[a-zA-Z_]*(\.(?:jpg|png|webp|jpeg))/i, '$1');
            clean = clean.replace(/_(?:small|medium|large|grande|master|pico|icon|thumb|1024x1024|2048x2048)(\.(?:jpg|png|webp|jpeg))/i, '$1');
            return clean;
        };

        // Aggressively capture any Shopify base images if we want to get the FULL gallery!
        // This captures everything from the raw DOM, including unassigned gallery images
        const targetVariant = targetUrl.searchParams.get('variant');
        if (!targetVariant) {
            // Unescape HTML (convert \/ back to / for robust regex matching)
            const normalizedHtml = html.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
            const cdnRegex = /(?:https?:)?\/\/[^"'\s<>]+?(?:\.shopify\.com|\/cdn\/shop\/)[^"'\s<>;\\]+?\.(?:jpg|png|webp|jpeg)/gi;
            
            let match;
            while ((match = cdnRegex.exec(normalizedHtml)) !== null) {
                const url = cleanImageUrl(match[0]);
                if (!url.includes('/assets/') && (url.includes('/files/') || url.includes('/products/'))) {
                    images.add(url);
                }
            }
        }

        // Lastly, clean any existing images in the Set to ensure no duplicates!
        const finalImages = new Set<string>();
        images.forEach(img => finalImages.add(cleanImageUrl(img)));
        if (!image && finalImages.size > 0) image = Array.from(finalImages)[0];

        return NextResponse.json({
            title: title || undefined,
            description: description || undefined,
            image: image || undefined,
            images: Array.from(finalImages), // Return deduplicated, filtered images
            price: price || undefined,
            url: targetUrl.toString(),
            ...(isEtsyUrl && { note: 'Etsy limits importing to 1 image (platform restriction)' }),
        });

    } catch (error: any) {
        console.error('Magic Link Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process URL' }, { status: 500 });
    }
}
