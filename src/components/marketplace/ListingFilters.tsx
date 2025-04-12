import React, { useState } from 'react';

interface LocationFilter {
  state?: string;
  county?: string;
  locality?: string;
}

interface ListingFiltersProps {
  onFilterChange: (filters: {
    location: LocationFilter;
    category?: string;
    condition?: string;
    priceRange?: { min?: number; max?: number };
  }) => void;
}

export default function ListingFilters({ onFilterChange }: ListingFiltersProps) {
  const [state, setState] = useState('');
  const [county, setCounty] = useState('');
  const [locality, setLocality] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filters = {
      location: {
        state: state || undefined,
        county: county || undefined,
        locality: locality || undefined,
      },
      category: category || undefined,
      condition: condition || undefined,
      priceRange: (priceMin || priceMax) 
        ? { 
            min: priceMin ? parseInt(priceMin, 10) : undefined,
            max: priceMax ? parseInt(priceMax, 10) : undefined,
          } 
        : undefined,
    };
    
    onFilterChange(filters);
  };
  
  const clearFilters = () => {
    setState('');
    setCounty('');
    setLocality('');
    setCategory('');
    setCondition('');
    setPriceMin('');
    setPriceMax('');
    
    onFilterChange({
      location: {},
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h3 className="font-medium text-sm mb-2">Location</h3>
          
          <div className="space-y-2">
            <input
              type="text"
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            
            <input
              type="text"
              placeholder="County"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            
            <input
              type="text"
              placeholder="City/Town/Village"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>
        
        <div>
          <h3 className="font-medium text-sm mb-2">Category</h3>
          
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Categories</option>
            <option value="furniture">Furniture</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="vehicles">Vehicles</option>
            <option value="toys">Toys & Games</option>
            <option value="sports">Sports Equipment</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <h3 className="font-medium text-sm mb-2">Condition</h3>
          
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Any Condition</option>
            <option value="new">New</option>
            <option value="likeNew">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        
        <div>
          <h3 className="font-medium text-sm mb-2">Price Range</h3>
          
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-1/2 px-3 py-2 border rounded-md text-sm"
              min="0"
            />
            
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-1/2 px-3 py-2 border rounded-md text-sm"
              min="0"
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm"
          >
            Apply Filters
          </button>
          
          <button
            type="button"
            onClick={clearFilters}
            className="py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
