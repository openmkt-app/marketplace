import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform } from '@/lib/external-link-utils';

export const dynamic = 'force-dynamic';

/**
 * Detects the e-commerce platform for a given URL.
 * For URLs that don't match known domains (like custom Shopify domains),
 * it fetches the page and checks for platform signatures in headers/HTML.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const targetUrl = new URL(url);

        // First, check if we can detect platform from URL pattern alone
        const urlDetection = detectPlatform(url);
        if (urlDetection) {
            return NextResponse.json({
                platform: urlDetection.key,
                platformName: urlDetection.config.name,
                method: 'url_pattern',
                url: targetUrl.toString()
            });
        }

        // If URL doesn't match known patterns, fetch and analyze the page
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        // Use Googlebot user agent - most sites allow crawlers for SEO
        const response = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            signal: controller.signal,
            redirect: 'follow',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({
                platform: null,
                platformName: null,
                method: 'none',
                error: `Failed to fetch URL: ${response.status}`,
                url: targetUrl.toString()
            });
        }

        // Check HTTP headers for platform signatures
        const headers = response.headers;

        // Shopify header detection
        const shopifyHeaders = [
            'x-shopid',
            'x-shopify-stage',
            'x-sorting-hat-shopid',
            'x-storefront-renderer-rendered'
        ];

        for (const header of shopifyHeaders) {
            if (headers.get(header)) {
                return NextResponse.json({
                    platform: 'shopify',
                    platformName: 'Shopify',
                    method: 'http_header',
                    detectedHeader: header,
                    url: targetUrl.toString()
                });
            }
        }

        // Check HTML content for platform signatures
        const html = await response.text();

        // Shopify HTML signatures
        const shopifySignatures = [
            'cdn.shopify.com',
            'Shopify.theme',
            'shopify-section',
            'shopify-checkout-api-token',
            'myshopify.com',
            '"shopify"',
            'Shopify.cdnHost',
            '/apps/shopify'
        ];

        for (const signature of shopifySignatures) {
            if (html.includes(signature)) {
                return NextResponse.json({
                    platform: 'shopify',
                    platformName: 'Shopify',
                    method: 'html_signature',
                    detectedSignature: signature,
                    url: targetUrl.toString()
                });
            }
        }

        // WooCommerce detection
        const wooSignatures = [
            'woocommerce',
            'wc-blocks',
            '/wp-content/plugins/woocommerce',
            'is-woocommerce'
        ];

        for (const signature of wooSignatures) {
            if (html.toLowerCase().includes(signature.toLowerCase())) {
                return NextResponse.json({
                    platform: 'woocommerce',
                    platformName: 'WooCommerce',
                    method: 'html_signature',
                    detectedSignature: signature,
                    url: targetUrl.toString()
                });
            }
        }

        // BigCommerce detection
        const bigCommerceSignatures = [
            'bigcommerce.com',
            'data-stencil-',
            'bc-sf-filter',
            'BigCommerce'
        ];

        for (const signature of bigCommerceSignatures) {
            if (html.includes(signature)) {
                return NextResponse.json({
                    platform: 'bigcommerce',
                    platformName: 'BigCommerce',
                    method: 'html_signature',
                    detectedSignature: signature,
                    url: targetUrl.toString()
                });
            }
        }

        // Squarespace Commerce detection
        const squarespaceSignatures = [
            'squarespace.com',
            'static.squarespace.com',
            'squarespace-cdn.com',
            'data-squarespace-'
        ];

        for (const signature of squarespaceSignatures) {
            if (html.includes(signature)) {
                return NextResponse.json({
                    platform: 'squarespace',
                    platformName: 'Squarespace',
                    method: 'html_signature',
                    detectedSignature: signature,
                    url: targetUrl.toString()
                });
            }
        }

        // No platform detected
        return NextResponse.json({
            platform: null,
            platformName: null,
            method: 'none',
            url: targetUrl.toString()
        });

    } catch (error: any) {
        console.error('Platform Detection Error:', error);
        return NextResponse.json({
            platform: null,
            platformName: null,
            method: 'error',
            error: error.message || 'Failed to detect platform',
            url
        }, { status: 200 }); // Return 200 with null platform, not 500
    }
}
