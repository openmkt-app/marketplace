
import React from 'react';
import { EtsyListing } from '@/lib/etsy-types';
import { Check } from 'lucide-react';

interface ListingSelectorProps {
    listings: EtsyListing[];
    selectedIds: Set<number>;
    onToggle: (id: number) => void;
}

export default function ListingSelector({ listings, selectedIds, onToggle }: ListingSelectorProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => {
                const isSelected = selectedIds.has(listing.listing_id);
                // Try to find a valid image URL, falling back to full size if thumbnails missing
                const imageUrl = listing.images?.[0]?.url_570xN ||
                    listing.images?.[0]?.url_170x135 ||
                    listing.images?.[0]?.url_fullxfull;

                return (
                    <button
                        key={listing.listing_id}
                        onClick={() => onToggle(listing.listing_id)}
                        className={`
                group relative text-left rounded-xl overflow-hidden border transition-all duration-200 shadow-sm
                ${isSelected
                                ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                            }
            `}
                    >
                        {/* Image Aspect (Square-ish) */}
                        <div className="aspect-square bg-slate-100 relative w-full overflow-hidden">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={listing.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-50">
                                    No Image
                                </div>
                            )}

                            {/* Selection Indicator */}
                            <div className={`
                absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-sm
                ${isSelected ? 'bg-blue-600 text-white' : 'bg-white/80 text-transparent border border-slate-200'}
              `}>
                                <Check className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="p-3">
                            <h3 className="font-medium text-sm line-clamp-2 text-slate-700 mb-1 h-10 leading-tight">
                                {listing.title}
                            </h3>
                            <p className="text-slate-500 text-xs">
                                {listing.price.currency_code} {listing.price.amount}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
