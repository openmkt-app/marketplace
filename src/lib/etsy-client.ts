
import { EtsyListing } from './etsy-types';
import { MarketplaceClient } from './marketplace-client';

export interface EtsyFetchResult {
    results: EtsyListing[];
    warning?: string;
}

export async function fetchEtsyListings(shopIdentifier: string): Promise<EtsyFetchResult> {
    // Determine if input is numeric ID or Name
    const isNumeric = /^\d+$/.test(shopIdentifier);
    const param = isNumeric ? `shopId=${shopIdentifier}` : `shopName=${encodeURIComponent(shopIdentifier)}`;

    const response = await fetch(`/api/etsy/listings?${param}`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch listings');
    }

    const data = await response.json();
    return {
        results: data.results || [],
        warning: data.warning
    };
}

export function mapEtsyListingToImport(etsyListing: EtsyListing) {
    // Map Etsy category (taxonomy_id) or tags to our categories if possible
    // For now, simple mapping
    let category = 'other';
    const tags = (etsyListing.tags || []).join(' ').toLowerCase();

    if (tags.includes('vintage')) category = 'vintage';
    else if (tags.includes('handmade')) category = 'handmade';
    else if (tags.includes('digital')) category = 'digital';
    else if (tags.includes('furniture')) category = 'furniture';
    else if (tags.includes('clothing') || tags.includes('apparel')) category = 'apparel';
    else if (tags.includes('art')) category = 'handmade'; // approximate

    return {
        title: etsyListing.title.substring(0, 300),
        description: etsyListing.description.substring(0, 3000),
        price: etsyListing.price.amount.toString(),
        currency: etsyListing.price.currency_code,
        category: category,
        condition: 'used', // Default to used for imported items
        location: {
            state: 'Unknown', // We'd need to fetch shop details or ask user
            county: 'Online',
            locality: 'Etsy Import',
            isOnlineStore: true
        },
        externalUrl: etsyListing.url,
        images: etsyListing.images?.map(img => img.url_fullxfull) || [],
        hideFromFriends: false
    };
}

export async function importListing(client: MarketplaceClient, etsyListing: EtsyListing) {
    const mapped = mapEtsyListingToImport(etsyListing);
    const imageFiles: File[] = [];

    // Fetch images and convert to Files
    // Limit to 4 images to save bandwidth/time
    const imagesToProcess = (mapped.images || []).slice(0, 4);

    for (let i = 0; i < imagesToProcess.length; i++) {
        const url = imagesToProcess[i];
        try {
            // Try direct fetch first
            let response = await fetch(url, { mode: 'cors' });

            // If direct fetch fails (e.g. CORS or 403), try our proxy
            if (!response.ok) {
                console.warn(`Direct fetch failed for ${url}, trying proxy...`);
                response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
            }

            if (response.ok) {
                const blob = await response.blob();
                const file = new File([blob], `image-${i}.jpg`, { type: 'image/jpeg' }); // simplified type assumption
                imageFiles.push(file);
            } else {
                console.warn(`Failed to fetch image ${url} even via proxy`);
            }
        } catch (e) {
            console.warn(`Direct fetch exception for ${url}, trying proxy...`, e);
            try {
                const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const blob = await response.blob();
                    const file = new File([blob], `image-${i}.jpg`, { type: 'image/jpeg' });
                    imageFiles.push(file);
                }
            } catch (proxyErr) {
                console.error(`Final image fetch failure for ${url}`, proxyErr);
            }
        }
    }

    return await client.createListing({
        ...mapped,
        images: imageFiles as any
    });
}
