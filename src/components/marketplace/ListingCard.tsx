import React from 'react';
import Link from 'next/link';
import { type MarketplaceListing } from '@/lib/marketplace-client';

interface ListingCardProps {
  listing: MarketplaceListing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  // Format the date
  const formattedDate = new Date(listing.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Format the condition to be more readable
  const formatCondition = (condition: string): string => {
    switch (condition) {
      case 'new': return 'New';
      case 'likeNew': return 'Like New';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return condition;
    }
  };

  return (
    <Link href={`/listing/${listing.title.replace(/\s+/g, '-').toLowerCase()}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-[1.02]">
        {listing.images && listing.images.length > 0 ? (
          <div className="h-48 overflow-hidden">
            <img
              src="https://via.placeholder.com/400x300"
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
        )}

        <div className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold mb-1 text-gray-800">{listing.title}</h3>
            <span className="font-bold text-blue-600">{listing.price}</span>
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.description}</p>
          
          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-gray-500">
              {listing.location.locality}, {listing.location.state}
            </div>
            
            <div className="flex space-x-2">
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                {formatCondition(listing.condition)}
              </span>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                {listing.category}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            Posted {formattedDate}
          </div>
        </div>
      </div>
    </Link>
  );
}
