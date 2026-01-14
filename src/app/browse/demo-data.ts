// src/app/browse/demo-data.ts
import type { MarketplaceListing } from '@/lib/marketplace-client';

// Demo listings data for showcase purposes
export const demoListingsData: MarketplaceListing[] = [
  {
    title: 'Vintage Mid-Century Chair',
    description: 'Beautiful wooden chair from the 1960s in excellent condition.',
    price: '$75',
    images: [
      {
        ref: {
          $link: 'demo-furniture.svg'
        },
        mimeType: 'image/svg+xml',
        size: 1024
      }
    ],
    location: {
      state: 'California',
      county: 'Los Angeles',
      locality: 'Pasadena',
      zipPrefix: '910'
    },
    category: 'furniture',
    condition: 'good',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Living Room'
    },
    authorHandle: 'vintagefinder.bsky.social',
    authorDid: 'did:plc:demo1',
    sellerDid: 'did:plc:demo1',
    uri: 'demo-listing-1',
    cid: 'demo-cid-1'
  },
  {
    title: 'Mountain Bike',
    description: 'Trek mountain bike, barely used. Great for trails.',
    price: '$350',
    images: [
      {
        ref: {
          $link: 'demo-sports.svg'
        },
        mimeType: 'image/svg+xml',
        size: 1024
      }
    ],
    location: {
      state: 'Oregon',
      county: 'Multnomah',
      locality: 'Portland',
      zipPrefix: '972'
    },
    category: 'sports',
    condition: 'likeNew',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Bicycles'
    },
    authorHandle: 'bikeenthusiast.bsky.social',
    authorDid: 'did:plc:demo2',
    sellerDid: 'did:plc:demo2',
    uri: 'demo-listing-2',
    cid: 'demo-cid-2'
  },
  {
    title: 'iPhone 13',
    description: 'Used iPhone 13, 128GB. Battery health at 92%.',
    price: '$450',
    images: [
      {
        ref: {
          $link: 'demo-electronics.svg'
        },
        mimeType: 'image/svg+xml',
        size: 1024
      }
    ],
    location: {
      state: 'New York',
      county: 'Kings',
      locality: 'Brooklyn',
      zipPrefix: '112'
    },
    category: 'electronics',
    condition: 'good',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Mobile Phones'
    },
    authorHandle: 'techseller.bsky.social',
    authorDid: 'did:plc:demo3',
    sellerDid: 'did:plc:demo3',
    uri: 'demo-listing-3',
    cid: 'demo-cid-3'
  },
  // Additional listings to test filtering
  {
    title: 'Dining Table Set',
    description: 'Solid wood dining table with 6 chairs.',
    price: '$250',
    location: {
      state: 'New Jersey',
      county: 'Essex',
      locality: 'Newark',
      zipPrefix: '071'
    },
    category: 'furniture',
    condition: 'good',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Dining Room'
    }
  },
  {
    title: 'Gaming Laptop',
    description: 'Alienware m15, 32GB RAM, RTX 3080.',
    price: '$1200',
    location: {
      state: 'Nevada',
      county: 'Clark',
      locality: 'Las Vegas',
      zipPrefix: '891'
    },
    category: 'electronics',
    condition: 'likeNew',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Laptops'
    }
  },
  {
    title: 'MacBook Pro',
    description: 'M1 Pro, 16-inch, 512GB SSD, 16GB RAM.',
    price: '$1500',
    location: {
      state: 'New York',
      county: 'New York',
      locality: 'Manhattan',
      zipPrefix: '100'
    },
    category: 'electronics',
    condition: 'good',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Laptops'
    }
  },
  {
    title: 'Leather Sofa',
    description: 'Genuine leather sofa, 3-seater, dark brown.',
    price: '$600',
    location: {
      state: 'New Hampshire',
      county: 'Hillsborough',
      locality: 'Manchester',
      zipPrefix: '031'
    },
    category: 'furniture',
    condition: 'good',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Living Room'
    }
  },
  {
    title: 'Electric Guitar',
    description: 'Fender Stratocaster, sunburst finish, with case.',
    price: '$750',
    location: {
      state: 'New Mexico',
      county: 'Bernalillo',
      locality: 'Albuquerque',
      zipPrefix: '871'
    },
    category: 'other',
    condition: 'likeNew',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Musical Instruments'
    },
    uri: 'demo-listing-5',
    cid: 'demo-cid-5'
  },
  {
    title: 'Road Bike',
    description: 'Specialized Tarmac SL7, carbon frame, Shimano Ultegra.',
    price: '$1800',
    location: {
      state: 'New York',
      county: 'Monroe',
      locality: 'Rochester',
      zipPrefix: '146'
    },
    category: 'sports',
    condition: 'likeNew',
    createdAt: new Date().toISOString(),
    metadata: {
      subcategory: 'Bicycles'
    }
  }
];