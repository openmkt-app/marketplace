'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// Using the types from marketplace-client
type MarketplaceListing = {
  title: string;
  description: string;
  price: string;
  images?: any[];
  location: {
    state: string;
    county: string;
    locality: string;
    zipPrefix?: string;
  };
  category: string;
  condition: string;
  createdAt: string;
};

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

// Placeholder data for demo purposes
const demoListings: MarketplaceListing[] = [
  {
    title: 'Vintage Mid-Century Desk',
    description: 'Beautiful solid wood desk in excellent condition. Perfect for a home office or study area. Features three drawers for storage and a spacious work surface. The legs have the classic mid-century tapered design. This piece has been well-maintained and shows only minor signs of use. Dimensions: 48" W x 24" D x 30" H.',
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
    description: 'Lightly used iPhone 13 Pro in perfect working condition. Includes original box, charger, and case. The phone is unlocked and works with all carriers. Battery health is at 92%. No scratches or dents. Color: Sierra Blue. Selling because I upgraded to the latest model.',
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
  {
    title: 'Mountain Bike - Trek X-Caliber',
    description: 'Trek X-Caliber 8 mountain bike, size large. Great condition with recent tune-up. Perfect for trails and off-road riding. Features hydraulic disc brakes, 29" wheels, and a lightweight aluminum frame. The bike has been well-maintained and regularly serviced. Includes a bottle holder and basic toolkit.',
    price: '$450',
    location: {
      state: 'California',
      county: 'Los Angeles',
      locality: 'Santa Monica',
    },
    category: 'sports',
    condition: 'good',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Designer Leather Jacket',
    description: 'Genuine leather jacket, size medium. Only worn a few times, looks brand new. Classic design with zippered front and two side pockets. Premium quality leather that will last for years. Color: Dark Brown. Perfect for fall and winter. Originally purchased for $450.',
    price: '$200',
    location: {
      state: 'California',
      county: 'San Diego',
      locality: 'La Jolla',
    },
    category: 'clothing',
    condition: 'likeNew',
    createdAt: new Date().toISOString()
  },
  {
    title: 'Antique Writing Desk',
    description: 'Beautiful mahogany writing desk from the 1940s. Some wear but excellent condition overall. Features intricate carvings and a leather writing surface. Includes three drawers for storage and a small hidden compartment. A true piece of history that adds character to any room. Dimensions: 42" W x 22" D x 30" H.',
    price: '$375',
    location: {
      state: 'California',
      county: 'Los Angeles',
      locality: 'Pasadena',
    },
    category: 'furniture',
    condition: 'fair',
    createdAt: new Date().toISOString()
  },
  {
    title: 'LEGO Star Wars Collection',
    description: 'Collection of Star Wars LEGO sets. Includes Millennium Falcon, X-Wing, and TIE Fighter. All sets are complete with all pieces and instruction manuals. The Millennium Falcon is the 75257 model with 1,351 pieces. The X-Wing is model 75301 with 474 pieces. The TIE Fighter is model 75300 with 432 pieces. Great condition, from a smoke-free home.',
    price: '$150',
    location: {
      state: 'California',
      county: 'Orange',
      locality: 'Anaheim',
    },
    category: 'toys',
    condition: 'good',
    createdAt: new Date().toISOString()
  }
];

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactFormVisible, setIsContactFormVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isMessageSent, setIsMessageSent] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real app, we'd fetch from the API
        // For demo purposes, use the ID from the URL to get a demo listing
        const id = typeof params.id === 'string' ? parseInt(params.id) : 0;
        
        if (isNaN(id) || id < 0 || id >= demoListings.length) {
          throw new Error('Listing not found');
        }
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setListing(demoListings[id]);
      } catch (err) {
        console.error('Failed to fetch listing:', err);
        setError(`Failed to fetch listing: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchListing();
  }, [params.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate sending a message
    setIsLoading(true);
    
    try {
      // In a real app, this would send a message to the seller
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsMessageSent(true);
      setContactMessage('');
      
      // Hide the form after 2 seconds
      setTimeout(() => {
        setIsContactFormVisible(false);
        setIsMessageSent(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center w-full max-w-4xl">
          <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 w-full bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error || !listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Listing not found'}
        </div>
        <Link
          href="/browse"
          className="text-indigo-600 hover:text-indigo-500 font-medium"
        >
          ← Back to listings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link
          href="/browse"
          className="text-indigo-600 hover:text-indigo-500 font-medium flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to listings
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 bg-gray-200 flex items-center justify-center text-8xl p-12">
            {categoryIcons[listing.category] || '📦'}
          </div>
          
          <div className="md:w-1/2 p-6 md:p-8">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl md:text-3xl font-bold">{listing.title}</h1>
              <span className="text-2xl font-semibold text-indigo-600">{listing.price}</span>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${conditionLabels[listing.condition]?.color || 'bg-gray-100 text-gray-800'}`}>
                {conditionLabels[listing.condition]?.label || listing.condition}
              </span>
              <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-800 capitalize">
                {listing.category}
              </span>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Location</h2>
              <p className="text-gray-700">
                📍 {listing.location.locality}, {listing.location.county}, {listing.location.state}
                {listing.location.zipPrefix && ` ${listing.location.zipPrefix}xx`}
              </p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Listed</h2>
              <p className="text-gray-700">
                📅 {formatDate(listing.createdAt)}
              </p>
            </div>
            
            {isLoggedIn ? (
              <div>
                {isContactFormVisible ? (
                  <div>
                    {isMessageSent ? (
                      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        Message sent successfully!
                      </div>
                    ) : (
                      <form onSubmit={handleContactSubmit} className="mb-4">
                        <div className="mb-4">
                          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                            Message to Seller
                          </label>
                          <textarea
                            id="message"
                            value={contactMessage}
                            onChange={(e) => setContactMessage(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="I'm interested in your item. Is it still available?"
                            required
                          ></textarea>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
                          >
                            {isLoading ? 'Sending...' : 'Send Message'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setIsContactFormVisible(false)}
                            className="py-2 px-4 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium rounded-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setIsContactFormVisible(true)}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
                  >
                    Contact Seller
                  </button>
                )}
              </div>
            ) : (
              <div>
                <Link
                  href="/login"
                  className="block w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md text-center"
                >
                  Sign In to Contact Seller
                </Link>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
        </div>
      </div>
    </div>
  );
}
