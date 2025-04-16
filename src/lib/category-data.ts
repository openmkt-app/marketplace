// src/lib/category-data.ts
// This file contains the shared category data to ensure consistency between
// the listing creation form and filters

export interface CategoryOption {
  id: string;
  name: string;
}

export interface SubcategoryOption {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  subcategories: SubcategoryOption[];
}

// Comprehensive category list for use throughout the application
export const CATEGORIES: Category[] = [
  { 
    id: 'antiques', 
    name: 'Antiques & Collectibles',
    subcategories: [
      { id: 'furniture', name: 'Antique Furniture' },
      { id: 'art', name: 'Art & Paintings' },
      { id: 'coins', name: 'Coins & Currency' },
      { id: 'memorabilia', name: 'Memorabilia' },
      { id: 'other_antiques', name: 'Other Antiques' }
    ]
  },
  { 
    id: 'arts', 
    name: 'Arts & Crafts',
    subcategories: [
      { id: 'supplies', name: 'Art Supplies' },
      { id: 'handmade', name: 'Handmade Items' },
      { id: 'fabric', name: 'Fabric & Sewing' },
      { id: 'scrapbooking', name: 'Scrapbooking' },
      { id: 'other_crafts', name: 'Other Crafts' }
    ]
  },
  { 
    id: 'auto', 
    name: 'Auto Parts & Accessories',
    subcategories: [
      { id: 'parts', name: 'Car Parts' },
      { id: 'accessories', name: 'Accessories' },
      { id: 'tools', name: 'Automotive Tools' },
      { id: 'tires', name: 'Tires & Wheels' },
      { id: 'other_auto', name: 'Other Auto' }
    ]
  },
  { 
    id: 'baby', 
    name: 'Baby Products',
    subcategories: [
      { id: 'clothing', name: 'Baby Clothing' },
      { id: 'toys', name: 'Baby Toys' },
      { id: 'gear', name: 'Strollers & Gear' },
      { id: 'furniture', name: 'Baby Furniture' },
      { id: 'other_baby', name: 'Other Baby Items' }
    ]
  },
  { 
    id: 'books', 
    name: 'Books, Movies & Music',
    subcategories: [
      { id: 'books', name: 'Books' },
      { id: 'magazines', name: 'Magazines' },
      { id: 'movies', name: 'Movies & TV' },
      { id: 'music', name: 'Music & CDs' },
      { id: 'vinyl', name: 'Vinyl Records' }
    ]
  },
  { 
    id: 'business', 
    name: 'Business Equipment',
    subcategories: [
      { id: 'office', name: 'Office Equipment' },
      { id: 'furniture', name: 'Office Furniture' },
      { id: 'supplies', name: 'Business Supplies' },
      { id: 'retail', name: 'Retail Equipment' },
      { id: 'other_business', name: 'Other Business Items' }
    ]
  },
  { 
    id: 'cameras', 
    name: 'Cameras',
    subcategories: [
      { id: 'digital', name: 'Digital Cameras' },
      { id: 'film', name: 'Film Cameras' },
      { id: 'lenses', name: 'Lenses & Filters' },
      { id: 'accessories', name: 'Camera Accessories' },
      { id: 'other_cameras', name: 'Other Camera Equipment' }
    ]
  },
  { 
    id: 'cell_phones', 
    name: 'Cell Phones & Accessories',
    subcategories: [
      { id: 'smartphones', name: 'Smartphones' },
      { id: 'cases', name: 'Cases & Covers' },
      { id: 'chargers', name: 'Chargers & Cables' },
      { id: 'parts', name: 'Phone Parts' },
      { id: 'other_phones', name: 'Other Phone Items' }
    ]
  },
  { 
    id: 'clothing', 
    name: 'Clothing & Shoes',
    subcategories: [
      { id: 'mens', name: 'Men\'s Clothing' },
      { id: 'womens', name: 'Women\'s Clothing' },
      { id: 'kids', name: 'Kids Clothing' },
      { id: 'shoes', name: 'Shoes' },
      { id: 'accessories', name: 'Accessories & Jewelry' }
    ]
  },
  { 
    id: 'collectibles', 
    name: 'Collectibles',
    subcategories: [
      { id: 'trading_cards', name: 'Trading Cards' },
      { id: 'figurines', name: 'Figurines' },
      { id: 'comics', name: 'Comics' },
      { id: 'stamps', name: 'Stamps' },
      { id: 'other_collectibles', name: 'Other Collectibles' }
    ]
  },
  { 
    id: 'computers', 
    name: 'Computers',
    subcategories: [
      { id: 'laptops', name: 'Laptops' },
      { id: 'desktops', name: 'Desktop PCs' },
      { id: 'components', name: 'Computer Parts' },
      { id: 'peripherals', name: 'Monitors & Peripherals' },
      { id: 'other_computers', name: 'Other Computer Items' }
    ]
  },
  { 
    id: 'electronics', 
    name: 'Electronics',
    subcategories: [
      { id: 'tvs', name: 'TVs & Displays' },
      { id: 'audio', name: 'Audio Equipment' },
      { id: 'gaming', name: 'Gaming Consoles' },
      { id: 'home_electronics', name: 'Home Electronics' },
      { id: 'other_electronics', name: 'Other Electronics' }
    ]
  },
  { 
    id: 'free', 
    name: 'Free Stuff',
    subcategories: [
      { id: 'furniture', name: 'Free Furniture' },
      { id: 'clothing', name: 'Free Clothing' },
      { id: 'electronics', name: 'Free Electronics' },
      { id: 'household', name: 'Free Household' },
      { id: 'other_free', name: 'Other Free Items' }
    ]
  },
  { 
    id: 'furniture', 
    name: 'Furniture',
    subcategories: [
      { id: 'sofas', name: 'Sofas & Couches' },
      { id: 'tables', name: 'Tables' },
      { id: 'chairs', name: 'Chairs' },
      { id: 'beds', name: 'Beds & Mattresses' },
      { id: 'storage', name: 'Storage & Organization' }
    ]
  },
  { 
    id: 'health', 
    name: 'Health & Beauty',
    subcategories: [
      { id: 'skincare', name: 'Skincare' },
      { id: 'makeup', name: 'Makeup' },
      { id: 'haircare', name: 'Hair Care' },
      { id: 'fitness', name: 'Fitness Equipment' },
      { id: 'other_health', name: 'Other Health Items' }
    ]
  },
  { 
    id: 'home_garden', 
    name: 'Home & Garden',
    subcategories: [
      { id: 'gardening', name: 'Gardening & Plants' },
      { id: 'decor', name: 'Home Décor' },
      { id: 'kitchen', name: 'Kitchen & Dining' },
      { id: 'tools', name: 'Tools' },
      { id: 'other_home', name: 'Other Home Items' }
    ]
  },
  { 
    id: 'household', 
    name: 'Household',
    subcategories: [
      { id: 'appliances', name: 'Appliances' },
      { id: 'cleaning', name: 'Cleaning Supplies' },
      { id: 'bathroom', name: 'Bathroom' },
      { id: 'bedroom', name: 'Bedroom' },
      { id: 'other_household', name: 'Other Household Items' }
    ]
  },
  { 
    id: 'jewelry', 
    name: 'Jewelry & Watches',
    subcategories: [
      { id: 'necklaces', name: 'Necklaces' },
      { id: 'rings', name: 'Rings' },
      { id: 'watches', name: 'Watches' },
      { id: 'earrings', name: 'Earrings' },
      { id: 'other_jewelry', name: 'Other Jewelry' }
    ]
  },
  { 
    id: 'misc', 
    name: 'Miscellaneous',
    subcategories: [
      { id: 'misc_items', name: 'Miscellaneous Items' }
    ]
  },
  { 
    id: 'musical', 
    name: 'Musical Instruments',
    subcategories: [
      { id: 'guitars', name: 'Guitars' },
      { id: 'keyboards', name: 'Keyboards & Pianos' },
      { id: 'drums', name: 'Drums & Percussion' },
      { id: 'band', name: 'Band Instruments' },
      { id: 'other_instruments', name: 'Other Instruments' }
    ]
  },
  { 
    id: 'office', 
    name: 'Office Supplies',
    subcategories: [
      { id: 'stationery', name: 'Stationery' },
      { id: 'supplies', name: 'Office Supplies' },
      { id: 'furniture', name: 'Office Furniture' },
      { id: 'printers', name: 'Printers & Scanners' },
      { id: 'other_office', name: 'Other Office Items' }
    ]
  },
  { 
    id: 'pets', 
    name: 'Pet Supplies',
    subcategories: [
      { id: 'dog', name: 'Dog Supplies' },
      { id: 'cat', name: 'Cat Supplies' },
      { id: 'fish', name: 'Fish Supplies' },
      { id: 'small_pets', name: 'Small Pet Supplies' },
      { id: 'other_pets', name: 'Other Pet Items' }
    ]
  },
  { 
    id: 'sporting', 
    name: 'Sporting Goods',
    subcategories: [
      { id: 'exercise', name: 'Exercise Equipment' },
      { id: 'outdoor', name: 'Outdoor Recreation' },
      { id: 'team_sports', name: 'Team Sports' },
      { id: 'water_sports', name: 'Water Sports' },
      { id: 'other_sports', name: 'Other Sports Items' }
    ]
  },
  { 
    id: 'toys', 
    name: 'Toys & Games',
    subcategories: [
      { id: 'action_figures', name: 'Action Figures' },
      { id: 'board_games', name: 'Board Games' },
      { id: 'dolls', name: 'Dolls & Stuffed Toys' },
      { id: 'outdoor_toys', name: 'Outdoor Toys' },
      { id: 'other_toys', name: 'Other Toys & Games' }
    ]
  },
  { 
    id: 'vehicles', 
    name: 'Vehicles',
    subcategories: [
      { id: 'cars', name: 'Cars & Trucks' },
      { id: 'motorcycles', name: 'Motorcycles' },
      { id: 'rvs', name: 'RVs & Campers' },
      { id: 'boats', name: 'Boats & Watercraft' },
      { id: 'other_vehicles', name: 'Other Vehicles' }
    ]
  }
];

// Condition options for listings
export const CONDITIONS: CategoryOption[] = [
  { id: 'new', name: 'New' },
  { id: 'likeNew', name: 'Like New' },
  { id: 'good', name: 'Good' },
  { id: 'fair', name: 'Fair' },
  { id: 'poor', name: 'Poor' }
];

// Helper function to get a flat list of all categories for simple dropdowns
export function getCategoryOptions(): CategoryOption[] {
  return CATEGORIES.map(category => ({
    id: category.id,
    name: category.name
  }));
}

// Helper function to get subcategories for a specific category
export function getSubcategories(categoryId: string): SubcategoryOption[] {
  const category = CATEGORIES.find(c => c.id === categoryId);
  return category ? category.subcategories : [];
} 