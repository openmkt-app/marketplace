import { Category, Condition, Listing } from './types';

export const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    title: 'Kia Card for Home Assistant',
    description: 'Brand New Kia Card for Home Assistant integration. Perfect for automating your smart home setup with your vehicle.',
    price: 1.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/kia/800/600'],
    seller: {
      handle: 'al_auad.bsky.social',
      displayName: 'Al Auad',
      avatar: 'https://picsum.photos/seed/user1/100/100'
    },
    location: 'Village of Garden City, NY',
    category: Category.ELECTRONICS,
    condition: Condition.NEW,
    postedAt: '2023-10-25T10:00:00Z',
    tags: ['Auto Parts', 'Accessories']
  },
  {
    id: '2',
    title: 'Lean-in Greenhouse',
    description: 'Compact lean-in greenhouse perfect for small spaces. Attaches to exterior walls to extend your growing season.',
    price: 300.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/greenhouse1/800/800'],
    seller: {
      handle: 'gardener_joe.bsky.social',
      displayName: 'Joe Green',
    },
    location: 'Village of Garden City, NY',
    category: Category.GARDEN,
    condition: Condition.NEW,
    postedAt: '2023-10-24T14:30:00Z',
    tags: ['Garden', 'Outdoor']
  },
  {
    id: '3',
    title: 'Walk-in Greenhouse',
    description: 'Spacious walk-in greenhouse. Heavy duty frame, UV protected cover. Great condition, used for one season.',
    price: 150.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/greenhouse2/800/600'],
    seller: {
      handle: 'al_auad.bsky.social',
      displayName: 'Al Auad',
    },
    location: 'Garden City, NY',
    category: Category.GARDEN,
    condition: Condition.GOOD,
    postedAt: '2023-10-24T09:15:00Z',
    tags: ['Garden', 'Tools']
  },
  {
    id: '4',
    title: 'Vintage Comic Collection',
    description: 'Testing 5 Photos! Several items, testing 11 photos! Several items... A collection of classic comics from the 90s.',
    price: 963.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/comics/600/800'],
    seller: {
      handle: 'collector_guy.bsky.social',
      displayName: 'Collector Guy',
    },
    location: 'Mineola, NY',
    category: Category.OTHER,
    condition: Condition.POOR,
    postedAt: '2023-10-23T11:00:00Z',
    tags: ['Jewelry', 'Comics'] // Keeping original tags from prompt for fidelity
  },
  {
    id: '5',
    title: 'Modern Coffee Table',
    description: 'Minimalist coffee table, oak finish. Has a small scratch on the side but otherwise sturdy.',
    price: 63.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/table/800/500'],
    seller: {
      handle: 'al_auad.bsky.social',
      displayName: 'Al Auad',
    },
    location: 'Mineola, NY',
    category: Category.HOME,
    condition: Condition.GOOD,
    postedAt: '2023-10-22T16:20:00Z',
    tags: ['Free Stuff', 'Furniture']
  },
  {
    id: '6',
    title: 'Gaming Monitor 27"',
    description: '144Hz refresh rate, 1ms response time. Upgrading to a larger screen.',
    price: 200.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/monitor/800/600'],
    seller: {
      handle: 'gamer_pro.bsky.social',
      displayName: 'Gamer Pro',
    },
    location: 'Brooklyn, NY',
    category: Category.ELECTRONICS,
    condition: Condition.LIKE_NEW,
    postedAt: '2023-10-21T10:00:00Z',
    tags: ['Tech', 'Gaming']
  },
  {
    id: '7',
    title: 'Mountain Bike',
    description: 'Solid mountain bike, needs a tune-up but frame is excellent.',
    price: 120.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/bike/800/600'],
    seller: {
      handle: 'outdoorsy.bsky.social',
      displayName: 'Sarah H.',
    },
    location: 'Queens, NY',
    category: Category.VEHICLES,
    condition: Condition.FAIR,
    postedAt: '2023-10-26T08:00:00Z',
    tags: ['Sports', 'Bikes']
  },
  {
    id: '8',
    title: 'Winter Jacket',
    description: 'North Face jacket, size L. Very warm, worn twice.',
    price: 85.00,
    currency: 'USD',
    images: ['https://picsum.photos/seed/jacket/600/800'],
    seller: {
      handle: 'fashionista.bsky.social',
      displayName: 'Jenna',
    },
    location: 'Manhattan, NY',
    category: Category.CLOTHING,
    condition: Condition.LIKE_NEW,
    postedAt: '2023-10-26T12:00:00Z',
    tags: ['Clothing', 'Winter']
  }
];