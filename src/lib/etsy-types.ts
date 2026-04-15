
export interface EtsyListingImage {
    listing_image_id: number;
    rank: number | null;
    url_75x75: string;
    url_170x135: string;
    url_570xN: string;
    url_fullxfull: string;
    full_height: number | null;
    full_width: number | null;
}

export interface EtsyListing {
    listing_id: number;
    title: string;
    description: string;
    state: string;
    price: {
        amount: number;
        divisor: number;
        currency_code: string;
    };
    quantity: number;
    tags: string[];
    url: string;
    images?: EtsyListingImage[];
}
