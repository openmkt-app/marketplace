import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Globe, MapPin } from 'lucide-react';
import { MarketplaceListing } from '@/lib/marketplace-client';
import { formatLocationShort, isOnlineStore } from '@/lib/location-utils';
import { detectPlatform, AFFILIATE_CONFIG } from '@/lib/external-link-utils';

export type SellerWithListings = {
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    banner?: string;
    followersCount?: number;
    listingsCount: number;
    listings?: MarketplaceListing[];
};

interface StoreCardProps {
    seller: SellerWithListings;
}

// Platform badge configuration with colors and display letters
const PLATFORM_BADGES: Record<string, { letter: string; color: string; bgColor: string }> = {
    etsy: { letter: 'E', color: '#F56400', bgColor: '#FEF3E7' },
    amazon: { letter: 'A', color: '#FF9900', bgColor: '#FFF8E7' },
    ebay: { letter: 'e', color: '#E53238', bgColor: '#FDECEC' },
    shopify: { letter: 'S', color: '#96BF48', bgColor: '#F4F9EC' },
    mercari: { letter: 'M', color: '#4A9BDB', bgColor: '#EDF5FB' },
    poshmark: { letter: 'P', color: '#7F0353', bgColor: '#F8ECF3' },
    depop: { letter: 'D', color: '#FF2300', bgColor: '#FFEBE7' },
};

// Detect external platforms from seller's listings and description
function detectSellerPlatforms(seller: SellerWithListings): string[] {
    const platforms = new Set<string>();

    // Check listings for external URLs
    seller.listings?.forEach(listing => {
        if (listing.externalUrl) {
            const detected = detectPlatform(listing.externalUrl);
            if (detected) platforms.add(detected.key);
        }
        // Also check description for platform links
        if (listing.description) {
            for (const [key, config] of Object.entries(AFFILIATE_CONFIG)) {
                if (config.domains.some(domain => listing.description?.toLowerCase().includes(domain))) {
                    platforms.add(key);
                }
            }
        }
    });

    // Check seller description for platform links
    if (seller.description) {
        for (const [key, config] of Object.entries(AFFILIATE_CONFIG)) {
            if (config.domains.some(domain => seller.description?.toLowerCase().includes(domain))) {
                platforms.add(key);
            }
        }
    }

    return Array.from(platforms);
}

export default function StoreCard({ seller }: StoreCardProps) {
    const displayName = seller.displayName || seller.handle;
    const shortHandle = seller.handle.replace('.bsky.social', '');

    // Detect which external platforms this seller uses
    const detectedPlatforms = detectSellerPlatforms(seller);

    // Get location from first listing if available
    const firstListingLocation = seller.listings?.[0]?.location;
    const location = firstListingLocation ? formatLocationShort(firstListingLocation) : null;
    const isOnline = firstListingLocation ? isOnlineStore(firstListingLocation) : false;

    // Bluesky follow intent URL - opens Bluesky app/web to follow the user
    const followUrl = `https://bsky.app/intent/follow?uri=at://${seller.did}`;

    // Banner image is just the seller banner. Fallback is handled by the container background.
    const bannerImage = seller.banner;

    const storeUrl = `/store/${seller.handle}`;

    return (
        <Link href={storeUrl} className="group flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            {/* Cover Image Area - Compact Height */}
            <div className="relative h-32 w-full shrink-0 bg-slate-100">
                {bannerImage && (
                    <Image
                        src={bannerImage}
                        alt={`${displayName}'s banner`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                )}
                {/* Gradient overlay only if there is an image, or maybe just remove it for the plain background? 
                    Actually, if it's just gray, we probably don't want the dark gradient overlay. 
                    Let's only show the overlay if there is an image.
                */}
                {bannerImage && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                )}
            </div>

            {/* Content Container */}
            <div className="flex flex-col flex-grow relative">
                <div className="px-5 relative flex-grow">
                    {/* Header Row: Avatar + Follow Button */}
                    <div className="absolute -top-10 left-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl border-[4px] border-white bg-white shadow-md overflow-hidden relative z-10">
                                {seller.avatar ? (
                                    <Image
                                        src={seller.avatar}
                                        alt={displayName}
                                        width={80}
                                        height={80}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-slate-400">
                                            {displayName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>



                    {/* Seller Info */}
                    <div className="mt-12 mb-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">
                                {displayName}
                            </h3>
                            {/* Platform badges - Bluesky donut style */}
                            {detectedPlatforms.slice(0, 3).map(platform => {
                                const badge = PLATFORM_BADGES[platform];
                                if (!badge) return null;
                                const platformName = AFFILIATE_CONFIG[platform]?.name || platform;
                                return (
                                    <span
                                        key={platform}
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm"
                                        style={{ backgroundColor: badge.color, color: 'white' }}
                                        title={`Sells on ${platformName}`}
                                    >
                                        {badge.letter}
                                    </span>
                                );
                            })}
                        </div>
                        <p className="text-sm text-slate-400 font-medium truncate">@{shortHandle}</p>
                    </div>

                    {seller.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-4 h-8">
                            {seller.description}
                        </p>
                    )}

                    {/* Meta Info */}
                    {location && (
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-4">
                            <div className="flex items-center gap-1">
                                {isOnline ? (
                                    <Globe size={12} className="text-blue-400" />
                                ) : (
                                    <MapPin size={12} className="text-slate-400" />
                                )}
                                <span className="truncate max-w-[150px]">{location}</span>
                            </div>
                        </div>
                    )}

                    {/* Latest Arrivals Section */}
                    <div className="border-t border-gray-50 pt-3 pb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Latest Arrivals
                        </p>

                        {seller.listings && seller.listings.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {seller.listings.slice(0, 3).map((listing, idx) => {
                                    const thumbnail = listing.formattedImages?.[0]?.thumbnail;
                                    return (
                                        <div key={`${listing.uri}-${idx}`} className="aspect-square rounded-lg bg-gray-100 overflow-hidden relative group/item">
                                            {thumbnail ? (
                                                <Image
                                                    src={thumbnail}
                                                    alt={listing.title}
                                                    fill
                                                    className="object-cover hover:opacity-80 transition-opacity cursor-pointer"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ShoppingBag size={14} className="text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {/* Fill empty spots */}
                                {seller.listings.length < 3 && Array.from({ length: 3 - seller.listings.length }).map((_, idx) => (
                                    <div key={`empty-${idx}`} className="aspect-square rounded-lg bg-gray-50" />
                                ))}
                            </div>
                        ) : (
                            <div className="h-16 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                                No active listings
                            </div>
                        )}
                    </div>
                </div>

                {/* Visit Store Button */}
                <div className="bg-gray-50 p-3 border-t border-gray-100 group-hover:bg-blue-50/50 transition-colors mt-auto">
                    <span className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                        Visit Store
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </span>
                </div>
            </div>
        </Link>
    );
}
