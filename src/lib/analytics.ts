import { sendGAEvent } from '@next/third-parties/google';

export function trackLogin(method: string = 'bluesky') {
    sendGAEvent('event', 'login', { method });
}

export function trackListingView(listing: {
    uri?: string;
    title: string;
    category: string;
    price: string;
    authorDid?: string;
}) {
    sendGAEvent('event', 'view_item', {
        currency: 'USD',
        value: parseFloat(listing.price),
        items: [
            {
                item_id: listing.uri,
                item_name: listing.title,
                item_category: listing.category,
                price: parseFloat(listing.price),
                item_brand: listing.authorDid // Seller as brand
            }
        ]
    });
}

export function trackCreateListing(listing: {
    title: string;
    category: string;
    price: string;
}) {
    sendGAEvent('event', 'create_listing', {
        event_category: 'engagement',
        event_label: listing.category,
        value: parseFloat(listing.price)
    });
}

export function trackInterest(listing: {
    uri?: string;
    title: string;
    category: string;
    price: string;
    sellerDid?: string;
}) {
    sendGAEvent('event', 'generate_lead', {
        currency: 'USD',
        value: parseFloat(listing.price),
        event_category: 'lead',
        event_label: 'show_interest',
        items: [
            {
                item_id: listing.uri,
                item_name: listing.title,
                item_category: listing.category,
                price: parseFloat(listing.price)
            }
        ]
    });
}
