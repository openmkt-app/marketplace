export enum Condition {
  NEW = 'New',
  LIKE_NEW = 'Like New',
  GOOD = 'Good',
  FAIR = 'Fair',
  POOR = 'Poor'
}

export enum Category {
  ALL = 'All',
  ELECTRONICS = 'Electronics',
  GARDEN = 'Garden & Outdoor',
  HOME = 'Home',
  CLOTHING = 'Clothing',
  VEHICLES = 'Vehicles',
  OTHER = 'Other'
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  seller: {
    handle: string;
    avatar?: string;
    displayName: string;
  };
  location: string;
  category: Category;
  condition: Condition;
  postedAt: string;
  tags: string[];
}

export interface SearchFilters {
  query: string;
  minPrice?: number;
  maxPrice?: number;
  category: Category;
  location?: string;
}

// AI Service Types
export interface AISearchResponse {
  keywords: string;
  category: string; // Mapped to Category enum string
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  reasoning: string; // Why the AI chose these filters
}