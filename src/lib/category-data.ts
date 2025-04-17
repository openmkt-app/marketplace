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
      { id: 'art', name: 'Art & Paintings' },
      { id: 'coins', name: 'Coins & Currency' },
      { id: 'furniture', name: 'Antique Furniture' },
      { id: 'memorabilia', name: 'Memorabilia' },
      { id: 'vintage', name: 'Vintage Items' },
      { id: 'other_antiques', name: 'Other Antiques' }
    ]
  },
  { 
    id: 'apparel', 
    name: 'Apparel',
    subcategories: [
      { id: 'accessories', name: 'Accessories' },
      { id: 'bags', name: 'Bags & Purses' },
      { id: 'jewelry', name: 'Jewelry' },
      { id: 'kids', name: 'Kids Clothing' },
      { id: 'mens', name: 'Men\'s Clothing' },
      { id: 'shoes', name: 'Shoes' },
      { id: 'watches', name: 'Watches' },
      { id: 'womens', name: 'Women\'s Clothing' }
    ]
  },
  { 
    id: 'auto', 
    name: 'Auto Parts & Accessories',
    subcategories: [
      { id: 'accessories', name: 'Accessories' },
      { id: 'audio', name: 'Car Audio' },
      { id: 'parts', name: 'Car Parts' },
      { id: 'tires', name: 'Tires & Wheels' },
      { id: 'tools', name: 'Automotive Tools' },
      { id: 'other_auto', name: 'Other Auto' }
    ]
  },
  { 
    id: 'baby', 
    name: 'Baby Products',
    subcategories: [
      { id: 'clothing', name: 'Baby Clothing' },
      { id: 'feeding', name: 'Feeding Supplies' },
      { id: 'furniture', name: 'Baby Furniture' },
      { id: 'gear', name: 'Strollers & Gear' },
      { id: 'safety', name: 'Baby Safety' },
      { id: 'toys', name: 'Baby Toys' },
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
      { id: 'textbooks', name: 'Textbooks' },
      { id: 'vinyl', name: 'Vinyl Records' },
      { id: 'other_media', name: 'Other Media Items' }
    ]
  },
  { 
    id: 'business', 
    name: 'Business Equipment',
    subcategories: [
      { id: 'commercial', name: 'Commercial Equipment' },
      { id: 'office', name: 'Office Equipment' },
      { id: 'printers', name: 'Printers & Scanners' },
      { id: 'retail', name: 'Retail Equipment' },
      { id: 'supplies', name: 'Business Supplies' },
      { id: 'other_business', name: 'Other Business Items' }
    ]
  },
  { 
    id: 'cameras', 
    name: 'Cameras & Photography',
    subcategories: [
      { id: 'accessories', name: 'Camera Accessories' },
      { id: 'digital', name: 'Digital Cameras' },
      { id: 'film', name: 'Film Cameras' },
      { id: 'lenses', name: 'Lenses & Filters' },
      { id: 'lighting', name: 'Lighting Equipment' },
      { id: 'tripods', name: 'Tripods & Stands' },
      { id: 'other_cameras', name: 'Other Camera Equipment' }
    ]
  },
  { 
    id: 'cell_phones', 
    name: 'Cell Phones & Accessories',
    subcategories: [
      { id: 'basic_phones', name: 'Basic Phones' },
      { id: 'cases', name: 'Cases & Covers' },
      { id: 'chargers', name: 'Chargers & Cables' },
      { id: 'headphones', name: 'Headphones & Earbuds' },
      { id: 'parts', name: 'Phone Parts' },
      { id: 'smartphones', name: 'Smartphones' },
      { id: 'other_phones', name: 'Other Phone Items' }
    ]
  },
  { 
    id: 'collectibles', 
    name: 'Collectibles',
    subcategories: [
      { id: 'comics', name: 'Comics' },
      { id: 'figurines', name: 'Figurines' },
      { id: 'limited', name: 'Limited Editions' },
      { id: 'sports', name: 'Sports Memorabilia' },
      { id: 'stamps', name: 'Stamps' },
      { id: 'trading_cards', name: 'Trading Cards' },
      { id: 'other_collectibles', name: 'Other Collectibles' }
    ]
  },
  { 
    id: 'computers', 
    name: 'Computers & Tech',
    subcategories: [
      { id: 'accessories', name: 'Computer Accessories' },
      { id: 'components', name: 'Computer Parts' },
      { id: 'desktops', name: 'Desktop PCs' },
      { id: 'laptops', name: 'Laptops' },
      { id: 'networking', name: 'Networking Equipment' },
      { id: 'peripherals', name: 'Monitors & Peripherals' },
      { id: 'tablets', name: 'Tablets & E-readers' },
      { id: 'other_computers', name: 'Other Computer Items' }
    ]
  },
  { 
    id: 'electronics', 
    name: 'Electronics',
    subcategories: [
      { id: 'audio', name: 'Audio Equipment' },
      { id: 'home_electronics', name: 'Home Electronics' },
      { id: 'smart_home', name: 'Smart Home Devices' },
      { id: 'tvs', name: 'TVs & Displays' },
      { id: 'wearables', name: 'Wearable Tech' },
      { id: 'other_electronics', name: 'Other Electronics' }
    ]
  },
  { 
    id: 'entertainment', 
    name: 'Entertainment',
    subcategories: [
      { id: 'board_games', name: 'Board Games' },
      { id: 'card_games', name: 'Card Games' },
      { id: 'outdoor_games', name: 'Outdoor Games' },
      { id: 'party_supplies', name: 'Party Supplies' },
      { id: 'puzzles', name: 'Puzzles' },
      { id: 'other_entertainment', name: 'Other Entertainment Items' }
    ]
  },
  { 
    id: 'free', 
    name: 'Free Stuff',
    subcategories: [
      { id: 'clothing', name: 'Free Clothing' },
      { id: 'electronics', name: 'Free Electronics' },
      { id: 'furniture', name: 'Free Furniture' },
      { id: 'household', name: 'Free Household' },
      { id: 'toys', name: 'Free Toys & Games' },
      { id: 'other_free', name: 'Other Free Items' }
    ]
  },
  { 
    id: 'furniture', 
    name: 'Furniture',
    subcategories: [
      { id: 'beds', name: 'Beds & Mattresses' },
      { id: 'chairs', name: 'Chairs' },
      { id: 'dining', name: 'Dining Furniture' },
      { id: 'office', name: 'Office Furniture' },
      { id: 'outdoor', name: 'Outdoor Furniture' },
      { id: 'sofas', name: 'Sofas & Couches' },
      { id: 'storage', name: 'Storage & Organization' },
      { id: 'tables', name: 'Tables' }
    ]
  },
  { 
    id: 'garden', 
    name: 'Garden & Outdoor',
    subcategories: [
      { id: 'grills', name: 'Grills & Outdoor Cooking' },
      { id: 'outdoor_decor', name: 'Outdoor Décor' },
      { id: 'patio', name: 'Patio Furniture' },
      { id: 'plants', name: 'Plants & Seeds' },
      { id: 'pools', name: 'Pools & Spas' },
      { id: 'tools', name: 'Garden Tools' },
      { id: 'other_garden', name: 'Other Garden Items' }
    ]
  },
  { 
    id: 'health', 
    name: 'Health & Beauty',
    subcategories: [
      { id: 'bath', name: 'Bath & Body' },
      { id: 'fitness', name: 'Fitness Equipment' },
      { id: 'fragrance', name: 'Fragrances' },
      { id: 'haircare', name: 'Hair Care' },
      { id: 'makeup', name: 'Makeup' },
      { id: 'skincare', name: 'Skincare' },
      { id: 'wellness', name: 'Wellness Products' },
      { id: 'other_health', name: 'Other Health Items' }
    ]
  },
  { 
    id: 'hobbies', 
    name: 'Hobbies',
    subcategories: [
      { id: 'art_supplies', name: 'Art Supplies' },
      { id: 'collecting', name: 'Collecting Supplies' },
      { id: 'crafts', name: 'Crafting Supplies' },
      { id: 'models', name: 'Models & Kits' },
      { id: 'music_hobby', name: 'Music-Related Hobbies' },
      { id: 'sewing', name: 'Sewing & Fabric' },
      { id: 'other_hobbies', name: 'Other Hobby Items' }
    ]
  },
  { 
    id: 'home_goods', 
    name: 'Home Goods',
    subcategories: [
      { id: 'bathroom', name: 'Bathroom Accessories' },
      { id: 'bedding', name: 'Bedding & Linens' },
      { id: 'decor', name: 'Home Décor' },
      { id: 'kitchenware', name: 'Kitchenware' },
      { id: 'lighting', name: 'Lighting & Lamps' },
      { id: 'rugs', name: 'Rugs & Carpets' },
      { id: 'seasonal', name: 'Seasonal Décor' },
      { id: 'other_home', name: 'Other Home Items' }
    ]
  },
  { 
    id: 'home_improvement', 
    name: 'Home Improvement Supplies',
    subcategories: [
      { id: 'building', name: 'Building Materials' },
      { id: 'electrical', name: 'Electrical' },
      { id: 'flooring', name: 'Flooring & Tiles' },
      { id: 'hardware', name: 'Hardware' },
      { id: 'paint', name: 'Paint & Supplies' },
      { id: 'plumbing', name: 'Plumbing' },
      { id: 'tools', name: 'Tools & Equipment' },
      { id: 'other_improvement', name: 'Other Improvement Items' }
    ]
  },
  { 
    id: 'kids', 
    name: 'Kids & Toys',
    subcategories: [
      { id: 'action_figures', name: 'Action Figures' },
      { id: 'dolls', name: 'Dolls & Stuffed Animals' },
      { id: 'educational', name: 'Educational Toys' },
      { id: 'games', name: 'Games & Puzzles' },
      { id: 'lego', name: 'LEGO & Building Blocks' },
      { id: 'outdoor_toys', name: 'Outdoor Toys' },
      { id: 'ride_on', name: 'Ride-On Toys' },
      { id: 'other_kids', name: 'Other Kids Items' }
    ]
  },
  { 
    id: 'musical', 
    name: 'Musical Instruments',
    subcategories: [
      { id: 'accessories', name: 'Instrument Accessories' },
      { id: 'amps', name: 'Amplifiers & Effects' },
      { id: 'band', name: 'Band & Orchestra Instruments' },
      { id: 'dj', name: 'DJ & Production Equipment' },
      { id: 'drums', name: 'Drums & Percussion' },
      { id: 'guitars', name: 'Guitars & String Instruments' },
      { id: 'keyboards', name: 'Keyboards & Pianos' },
      { id: 'other_musical', name: 'Other Instruments' }
    ]
  },
  { 
    id: 'office', 
    name: 'Office Supplies',
    subcategories: [
      { id: 'desk_accessories', name: 'Desk Accessories' },
      { id: 'office_tech', name: 'Office Technology' },
      { id: 'organization', name: 'Organization & Storage' },
      { id: 'school', name: 'School Supplies' },
      { id: 'stationery', name: 'Stationery' },
      { id: 'supplies', name: 'Office Supplies' },
      { id: 'other_office', name: 'Other Office Items' }
    ]
  },
  { 
    id: 'pets', 
    name: 'Pet Supplies',
    subcategories: [
      { id: 'bird', name: 'Bird Supplies' },
      { id: 'cat', name: 'Cat Supplies' },
      { id: 'dog', name: 'Dog Supplies' },
      { id: 'feeders', name: 'Pet Feeders & Waterers' },
      { id: 'fish', name: 'Fish & Aquarium Supplies' },
      { id: 'reptile', name: 'Reptile Supplies' },
      { id: 'small_pets', name: 'Small Pet Supplies' },
      { id: 'other_pets', name: 'Other Pet Items' }
    ]
  },
  { 
    id: 'sporting', 
    name: 'Sporting Goods',
    subcategories: [
      { id: 'camping', name: 'Camping & Hiking' },
      { id: 'cycling', name: 'Cycling' },
      { id: 'exercise', name: 'Exercise & Fitness' },
      { id: 'outdoor', name: 'Outdoor Recreation' },
      { id: 'team_sports', name: 'Team Sports' },
      { id: 'water_sports', name: 'Water Sports' },
      { id: 'winter_sports', name: 'Winter Sports' },
      { id: 'other_sports', name: 'Other Sports Items' }
    ]
  },
  {
    id: 'video_games',
    name: 'Video Games',
    subcategories: [
      { id: 'accessories', name: 'Gaming Accessories' },
      { id: 'consoles', name: 'Gaming Consoles' },
      { id: 'games', name: 'Video Games' },
      { id: 'gaming_merch', name: 'Gaming Merchandise' },
      { id: 'pc_gaming', name: 'PC Gaming' },
      { id: 'retro_gaming', name: 'Retro Gaming' },
      { id: 'vr', name: 'Virtual Reality' },
      { id: 'other_gaming', name: 'Other Gaming Items' }
    ]
  },
  {
    id: 'other',
    name: 'Other Items',
    subcategories: [
      { id: 'handmade', name: 'Handmade Items' },
      { id: 'specialty', name: 'Specialty Items' },
      { id: 'vintage_misc', name: 'Vintage Miscellaneous' },
      { id: 'seasonal', name: 'Seasonal Items' },
      { id: 'commercial', name: 'Commercial Items' },
      { id: 'unique', name: 'Unique One-of-a-Kind' },
      { id: 'uncategorized', name: 'Uncategorized Items' }
    ]
  }
];

// Condition options for listings
export const CONDITIONS: CategoryOption[] = [
  { id: 'new', name: 'New' },
  { id: 'likeNew', name: 'Like New' },
  { id: 'good', name: 'Good' },
  { id: 'fair', name: 'Fair' }
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