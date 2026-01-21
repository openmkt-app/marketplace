
import { NextRequest, NextResponse } from 'next/server';

const ETSY_API_KEY = process.env.ETSY_API_KEY;

// Mock data for demonstration when API is inactive
const MOCK_LISTINGS = {
    count: 4,
    results: [
        {
            listing_id: 1001,
            title: "Vintage Film Camera (Demo)",
            description: "This is a mock listing shown because the Etsy API Key is currently pending approval. Once active, real listings will appear here.",
            price: { amount: 149.00, currency_code: "USD" },
            url: "https://etsy.com",
            tags: ["vintage", "camera", "photography"],
            images: [{ url_fullxfull: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80" }],
            creation_tsz: Date.now() / 1000
        },
        {
            listing_id: 1002,
            title: "Handmade Leather Bag (Demo)",
            description: "A beautiful handmade leather bag. Mock data for testing.",
            price: { amount: 85.50, currency_code: "USD" },
            url: "https://etsy.com",
            tags: ["handmade", "leather", "fashion"],
            images: [{ url_fullxfull: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80" }],
            creation_tsz: Date.now() / 1000
        },
        {
            listing_id: 1003,
            title: "Ceramic Vase Set (Demo)",
            description: "Minimalist ceramic vases.",
            price: { amount: 45.00, currency_code: "USD" },
            url: "https://etsy.com",
            tags: ["home", "decor", "ceramic"],
            images: [{ url_fullxfull: "https://images.unsplash.com/photo-1612196808214-b7723f03a677?w=800&q=80" }],
            creation_tsz: Date.now() / 1000
        }
    ]
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');
    const shopName = searchParams.get('shopName');

    if (!ETSY_API_KEY) {
        console.warn('ETSY_API_KEY is not set');
        // Return mock data if no key configured
        return NextResponse.json({
            ...MOCK_LISTINGS,
            warning: 'Configuration Missing: ETSY_API_KEY not set. Showing mock data.'
        });
    }

    try {
        let finalShopId = shopId;

        // If shopName is provided, resolve it to an ID first
        if (!finalShopId && shopName) {
            try {
                // Use findAllShops to find by name
                const findUrl = `https://openapi.etsy.com/v3/application/shops?shop_name=${encodeURIComponent(shopName)}&limit=1`;
                const findRes = await fetch(findUrl, {
                    headers: { 'x-api-key': ETSY_API_KEY }
                });

                if (findRes.ok) {
                    const findData = await findRes.json();
                    if (findData.results && findData.results.length > 0) {
                        finalShopId = findData.results[0].shop_id;
                    }
                } else {
                    // Check for 403 (Inactive Key) during name lookup
                    if (findRes.status === 403) {
                        return NextResponse.json({
                            ...MOCK_LISTINGS,
                            warning: 'Your Etsy API Key is pending approval. Showing mock data for testing.'
                        });
                    }
                }
            } catch (e) {
                console.warn("Failed to resolve shop name", e);
            }
        }

        if (!finalShopId) {
            // If we couldn't resolve the name (and it wasn't a 403), we can't proceed with real API
            // But if the user entered *something*, maybe we just return mock data if the key is likely the issue?
            // Let's rely on the shop listings call to be the definitive test
            if (shopName && !shopId) {
                // If name lookup failed silently (not 403), we might fail here.
                // Let's assume for Demo purposes if we fail to resolve, we just error out or mock?
                // Better to error if it's a real "Not Found".
            }
        }

        // Default to a dummy ID if we are forcing a check, but we need a real ID for the URL.
        // If we have no ID, we can't fetch.
        if (!finalShopId) {
            return NextResponse.json({ error: 'Could not resolve Shop Name to an ID. Please try entering the Shop ID directly.' }, { status: 400 });
        }

        const response = await fetch(
            `https://openapi.etsy.com/v3/application/shops/${finalShopId}/listings/active?limit=25&includes=Images`,
            {
                headers: {
                    'x-api-key': ETSY_API_KEY,
                },
            }
        );

        if (!response.ok) {
            // Handle Inactive Key specifically
            if (response.status === 403) {
                return NextResponse.json({
                    ...MOCK_LISTINGS,
                    warning: 'Your Etsy API Key is pending approval. Showing mock data for testing.'
                });
            }

            const errorText = await response.text();
            console.error('Etsy API Error:', response.status, errorText);
            return NextResponse.json({ error: `Etsy API responded with ${response.status}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching Etsy listings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
