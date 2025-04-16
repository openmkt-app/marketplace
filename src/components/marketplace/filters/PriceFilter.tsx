'use client';

import React, { useState, useEffect } from 'react';

interface PriceFilterProps {
  initialValue?: {
    min?: number;
    max?: number;
    bracket?: string;
    deals?: boolean;
  };
  onChange: (price: {
    min?: number;
    max?: number;
    bracket?: string;
    deals?: boolean;
  }) => void;
}

export default function PriceFilter({ initialValue, onChange }: PriceFilterProps) {
  const [min, setMin] = useState<string>(initialValue?.min?.toString() || '');
  const [max, setMax] = useState<string>(initialValue?.max?.toString() || '');
  const [bracket, setBracket] = useState<string>(initialValue?.bracket || '');
  const [deals, setDeals] = useState<boolean>(initialValue?.deals || false);

  useEffect(() => {
    // Convert string inputs to numbers for the filter
    const minVal = min ? parseInt(min, 10) : undefined;
    const maxVal = max ? parseInt(max, 10) : undefined;
    
    const filterValue = {
      min: minVal,
      max: maxVal,
      bracket,
      deals
    };
    
    onChange(filterValue);
  }, [min, max, bracket, deals, onChange]);

  // Handle bracket change
  const handleBracketChange = (newBracket: string) => {
    setBracket(newBracket);
    
    // Clear min/max when selecting a bracket
    if (newBracket) {
      setMin('');
      setMax('');
    }
  };

  // Price brackets options
  const brackets = [
    { label: 'Any', value: '' },
    { label: 'Under $50', value: 'under_50' },
    { label: '$50 - $100', value: '50_100' },
    { label: '$100 - $250', value: '100_250' },
    { label: '$250 - $500', value: '250_500' },
    { label: '$500+', value: 'over_500' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-text-primary">Price Range</h3>
      
      {/* Price bracket selector */}
      <div className="grid grid-cols-3 gap-2">
        {brackets.map((option) => (
          <button
            key={option.value}
            onClick={() => handleBracketChange(option.value)}
            className={`py-2 px-3 text-sm rounded-md ${
              bracket === option.value
                ? 'bg-primary-color text-white'
                : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      {/* Min-Max price inputs */}
      <div className="flex space-x-2 items-center">
        <input
          type="number"
          value={min}
          onChange={(e) => {
            setMin(e.target.value);
            // Clear bracket when using min/max
            if (bracket) setBracket('');
          }}
          placeholder="Min"
          className="flex-1 p-2 border rounded-md"
          min="0"
        />
        <span className="text-text-secondary">to</span>
        <input
          type="number"
          value={max}
          onChange={(e) => {
            setMax(e.target.value);
            // Clear bracket when using min/max
            if (bracket) setBracket('');
          }}
          placeholder="Max"
          className="flex-1 p-2 border rounded-md"
          min="0"
        />
      </div>
      
      {/* Deals checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="deals"
          checked={deals}
          onChange={(e) => setDeals(e.target.checked)}
          className="h-4 w-4 text-primary-color rounded"
        />
        <label htmlFor="deals" className="ml-2 text-text-primary">
          Show deals only
        </label>
      </div>
    </div>
  );
} 