'use client';

import React, { useState, useEffect } from 'react';

interface SortingOptionsProps {
  sortBy?: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency';
  onChange: (sortBy?: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency') => void;
}

export default function SortingOptions({ sortBy, onChange }: SortingOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>(sortBy || 'relevance');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Handle sort selection
  const handleSortChange = (sort: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency') => {
    setSelected(sort);
    onChange(sort);
    setIsOpen(false);
  };

  // Get display name for the selected sort
  const getDisplayName = (sort: string): string => {
    switch (sort) {
      case 'price_asc':
        return 'Price: Low to High';
      case 'price_desc':
        return 'Price: High to Low';
      case 'distance':
        return 'Distance';
      case 'recency':
        return 'Recently Listed';
      case 'relevance':
      default:
        return 'Relevance';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
      >
        <span>Sort: {getDisplayName(selected)}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 ml-1 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-md z-10">
          <div className="py-1">
            <button
              onClick={() => handleSortChange('relevance')}
              className={`block px-4 py-2 text-sm w-full text-left ${
                selected === 'relevance' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
            >
              Relevance
            </button>
            <button
              onClick={() => handleSortChange('recency')}
              className={`block px-4 py-2 text-sm w-full text-left ${
                selected === 'recency' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
            >
              Recently Listed
            </button>
            <button
              onClick={() => handleSortChange('price_asc')}
              className={`block px-4 py-2 text-sm w-full text-left ${
                selected === 'price_asc' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
            >
              Price: Low to High
            </button>
            <button
              onClick={() => handleSortChange('price_desc')}
              className={`block px-4 py-2 text-sm w-full text-left ${
                selected === 'price_desc' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
            >
              Price: High to Low
            </button>
            <button
              onClick={() => handleSortChange('distance')}
              className={`block px-4 py-2 text-sm w-full text-left ${
                selected === 'distance' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
            >
              Distance
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 