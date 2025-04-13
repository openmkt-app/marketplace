'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { decodeAtUri, getAtProtocolBrowserLink } from '@/lib/uri-utils';

const categoryIcons: Record<string, string> = {
  furniture: '🪑',
  electronics: '📱',
  clothing: '👕',
  vehicles: '🚗',
  toys: '🧸',
  sports: '⚽️',
  other: '📦'
};

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-green-100 text-green-800' },
  likeNew: { label: 'Like New', color: 'bg-emerald-100 text-emerald-800' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
  poor: { label: 'Poor', color: 'bg-red-100 text-red-800' }
};

// Demo listings for fallback
const demoListings = [
  {
    title: 'Vintage Mid-Century Desk',
    description: 'Beautiful solid wood desk in excellent condition. Perfect for a home office or study area. Features three drawers for storage and a spacious work surface. The legs are tapered in the classic mid-century modern style. Minor wear consistent with age, but overall in great shape. Dimensions: 48" W x 24" D x 30" H.',
    price: '$125',
    location: {
      state: 'California',
      county: 'Los Angeles',
      locality: 'Pasadena',
      zipPrefix: '910'
    },
    category: 'furniture',
    condition: 'good',
    createdAt: new Date().toISOString()
  },
  {
    title: 'iPhone 13 Pro - 256GB',
    description: 'Lightly used iPhone 13 Pro in perfect working condition. Includes original box, charger, and case. Battery health at 92%. No scratches or dents. Color is Sierra Blue. Unlocked and ready for any carrier. AppleCare+ valid through December 2023. Reason for selling: upgraded to newer model.',
    price: '$650',
    location: {
      state: 'California',
      county: 'Orange',
      locality: 'Irvine',
    },
    category: 'electronics',
    condition: 'likeNew',
    createdAt: new Date().toISOString()
  },
  // More demo listings...
];

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { client, isLoggedIn } = useAuth();
  const [listing, setListing] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if the ID might be a URI (for real AT Protocol listings)
        if (typeof id === 'string' && (id.startsWith('at://') || id.includes('app.bsky.feed.post'))) {
          // This is a real AT Protocol URI - might be encoded
          let uriToFetch = decodeAtUri(id);
          
          if (client) {
            try {
              console.log('Fetching real listing with URI:', uriToFetch);
              const realListing = await client.getListingByUri(uriToFetch);
              
              if (realListing) {
                console.log('Found real listing:', realListing);
                setListing({
                  ...realListing,
                  isRealListing: true,
                  isOwnListing: client.agent.session?.did === realListing.authorDid
                });
                setIsLoading(false);
                return;
              } else {
                console.log('Listing not found for URI:', uriToFetch);
              }
            } catch (apiError) {
              console.error('Error fetching real listing:', apiError);
              setError(`Could not load listing: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
              setIsLoading(false);
              return;
            }
          } else {
            console.log('Client not available for fetching listing');
          }
        } else {
          // This might be a demo listing index
          const demoIndex = Number(id);
          if (!isNaN(demoIndex) && demoIndex >= 0 && demoIndex < demoListings.length) {
            setListing({
              ...demoListings[demoIndex],
              isRealListing: false,
              isOwnListing: false
            });
            setIsLoading(false);
            return;
          }
        }
        
        // If we got here, we couldn't find the listing
        setError('Listing not found');
      } catch (err) {
        console.error('Failed to fetch listing:', err);
        setError(`Failed to fetch listing: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchListing();
  }, [id, client, isLoggedIn]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error || 'Listing not found'}
        </div>
        <Link href="/browse" className="text-indigo-600 hover:text-indigo-800 font-medium">
          ← Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <Link href="/browse" className="text-indigo-600 hover:text-indigo-800 font-medium">
          ← Back to Browse
        </Link>
      </div>
      
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Status labels */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          {listing.isRealListing ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {listing.isOwnListing ? 'Your Listing' : 'AT Protocol Listing'}
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Demo Listing
            </span>
          )}
          
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${conditionLabels[listing.condition]?.color || 'bg-gray-100 text-gray-800'}`}>
            {conditionLabels[listing.condition]?.label || listing.condition}
          </span>
        </div>
        
        {/* Main content */}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row">
            {/* Image or placeholder */}
            <div className="lg:w-1/2 lg:pr-6 mb-6 lg:mb-0">
              <div className="bg-gray-100 rounded-lg h-80 flex items-center justify-center text-6xl">
                {categoryIcons[listing.category] || '📦'}
              </div>
              
              {/* Image thumbnails would go here if images were available */}
              {listing.images && listing.images.length > 0 && (
                <div className="mt-4 flex space-x-2 overflow-x-auto">
                  {listing.images.map((image: any, index: number) => (
                    <div key={index} className="w-20 h-20 bg-gray-200 rounded flex-shrink-0">
                      {/* Thumbnail image would go here */}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Details */}
            <div className="lg:w-1/2">
              <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
              <div className="text-2xl text-indigo-600 font-bold mb-4">{listing.price}</div>
              
              <div className="mb-6">
                <span className="inline-block mr-2 px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full capitalize">
                  {listing.category}
                </span>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Location</h2>
                <p className="text-gray-700">
                  {listing.location.locality}, {listing.location.county}, {listing.location.state}
                  {listing.location.zipPrefix && ` ${listing.location.zipPrefix}xx`}
                </p>
              </div>
              
              <div className="mb-6 text-sm text-gray-500">
                <div className="flex items-center mb-1">
                  <span className="mr-2">📅</span>
                  <span>Listed on {formatDate(listing.createdAt)}</span>
                </div>
                {listing.authorHandle && (
                  <div className="flex items-center">
                    <span className="mr-2">👤</span>
                    <span>Posted by @{listing.authorHandle}</span>
                  </div>
                )}
                {listing.uri && (
                <div className="flex items-start mt-1">
                <span className="mr-2">🔗</span>
                <span className="break-all">
                <a 
                href={getAtProtocolBrowserLink(listing.uri) || `https://atproto-browser.vercel.app/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800"
                >
                View on AT Protocol Browser
                </a>
                </span>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact seller button */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          {listing.isOwnListing ? (
            <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 p-4 rounded mb-4">
              This is your own listing. You cannot contact yourself.
            </div>
          ) : (
            <button
              className="w-full sm:w-auto py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
              onClick={() => {
                if (!isLoggedIn) {
                  router.push('/login');
                } else {
                  // In a real app, this would open a message composer or similar
                  alert('In a real app, this would allow you to contact the seller.');
                }
              }}
            >
              Contact Seller
            </button>
          )}
          
          {/* Additional buttons for editing/deleting own listings would go here */}
          {listing.isOwnListing && listing.isRealListing && (
            <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                className="py-2 px-4 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium rounded-md"
                onClick={() => {
                  // In a real app, this would open the edit form
                  alert('Edit functionality would be implemented in a real app.');
                }}
              >
                Edit Listing
              </button>
              <button
                className="py-2 px-4 border border-red-600 text-red-600 hover:bg-red-50 font-medium rounded-md"
                onClick={() => {
                  // In a real app, this would show a confirmation dialog
                  alert('Delete functionality would be implemented in a real app.');
                }}
              >
                Delete Listing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
