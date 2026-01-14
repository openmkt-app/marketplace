import React from 'react';
import { MapPin, Tag } from 'lucide-react';
import { Listing } from '../types';

interface ListingCardProps {
  listing: Listing;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={listing.images[0]}
          alt={listing.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
            {listing.condition}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <button className="w-full bg-white text-slate-900 py-2 rounded-lg font-medium text-sm hover:bg-gray-50">
                Quick View
             </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
           <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {listing.title}
          </h3>
        </div>
       
        <p className="text-xl font-bold text-slate-900 mb-2">
          ${listing.price.toFixed(2)}
        </p>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-grow">
          {listing.description}
        </p>

        {/* Footer Info */}
        <div className="mt-auto space-y-2">
            <div className="flex items-center text-xs text-slate-400">
                <MapPin size={12} className="mr-1" />
                <span className="truncate">{listing.location}</span>
            </div>
            
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {listing.seller.avatar ? (
                        <img src={listing.seller.avatar} alt="seller" className="w-5 h-5 rounded-full" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[10px] text-brand-600 font-bold">
                            {listing.seller.displayName.charAt(0)}
                        </div>
                    )}
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
                        {listing.seller.displayName}
                    </span>
                </div>
                <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                    {new Date(listing.postedAt).toLocaleDateString()}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;