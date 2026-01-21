
export interface EtsyListingImage {
    listing_image_id: number;
    hex_code: string | null;
    red: number | null;
    green: number | null;
    blue: number | null;
    hue: number | null;
    saturation: number | null;
    brightness: number | null;
    is_black_and_white: boolean | null;
    creation_tsz: number;
    listing_id: number;
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
    user_id: number;
    shop_id: number;
    title: string;
    description: string;
    state: string;
    creation_tsz: number;
    ending_tsz: number;
    original_creation_tsz: number;
    last_modified_tsz: number;
    price: {
        amount: number;
        divisor: number;
        currency_code: string;
    };
    currency_code: string;
    quantity: number;
    sku: string[];
    tags: string[];
    materials: string[];
    shop_section_id: number | null;
    featured_rank: number | null;
    url: string;
    num_favorers: number;
    non_taxable: boolean;
    is_taxable: boolean;
    is_customizable: boolean;
    is_personalizable: boolean;
    personalization_is_required: boolean;
    personalization_char_count_max: number | null;
    personalization_instructions: string | null;
    listing_type: boolean;
    has_variations: boolean;
    should_auto_renew: boolean;
    language: string;
    images?: EtsyListingImage[];
}

export interface EtsyShop {
    shop_id: number;
    shop_name: string;
    user_id: number;
    creation_tsz: number;
    title: string | null;
    announcement: string | null;
    currency_code: string;
    is_vacation: boolean;
    vacation_message: string | null;
    sale_message: string | null;
    digital_sale_message: string | null;
    last_updated_tsz: number;
    listing_active_count: number;
    digital_listing_count: number;
    login_name: string;
    accepts_custom_requests: boolean;
    policy_welcome: string | null;
    policy_payment: string | null;
    policy_shipping: string | null;
    policy_refunds: string | null;
    policy_additional: string | null;
    policy_seller_info: string | null;
    policy_updated_tsz: number;
    vacation_autoreply: string | null;
    url: string;
    image_url_760x100: string | null;
    num_favorers: number;
    languages: string[];
    icon_url_fullxfull: string | null;
    is_using_structured_policies: boolean;
    has_onboarded_structured_policies: boolean;
    include_dispute_form_link: boolean;
}
