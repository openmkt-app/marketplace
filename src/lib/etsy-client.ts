
import { EtsyListing } from './etsy-types';
import { MarketplaceClient } from './marketplace-client';

export function mapEtsyListingToImport(etsyListing: EtsyListing) {
    let category = 'other';
    const tags = (etsyListing.tags || []).join(' ').toLowerCase();

    if (tags.includes('vintage')) category = 'vintage';
    else if (tags.includes('handmade')) category = 'handmade';
    else if (tags.includes('digital')) category = 'digital';
    else if (tags.includes('furniture')) category = 'furniture';
    else if (tags.includes('clothing') || tags.includes('apparel')) category = 'apparel';
    else if (tags.includes('art')) category = 'handmade';

    return {
        title: etsyListing.title.substring(0, 300),
        description: etsyListing.description.substring(0, 3000),
        price: (etsyListing.price.amount / (etsyListing.price.divisor || 1)).toFixed(2),
        currency: etsyListing.price.currency_code,
        category,
        condition: 'used',
        location: {
            state: 'Unknown',
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

    const imagesToProcess = (mapped.images || []).slice(0, 4);

    for (let i = 0; i < imagesToProcess.length; i++) {
        const url = imagesToProcess[i];
        try {
            let response = await fetch(url, { mode: 'cors' });
            if (!response.ok) {
                response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
            }
            if (response.ok) {
                const blob = await response.blob();
                imageFiles.push(new File([blob], `image-${i}.jpg`, { type: 'image/jpeg' }));
            }
        } catch (e) {
            try {
                const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const blob = await response.blob();
                    imageFiles.push(new File([blob], `image-${i}.jpg`, { type: 'image/jpeg' }));
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
