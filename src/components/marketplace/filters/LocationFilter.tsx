'use client';

import React, { useState, useEffect } from 'react';

export interface LocationFilterValue {
  state?: string;
  county?: string;
  city?: string;
  zipCode?: string;
}

interface LocationFilterProps {
  initialValue?: LocationFilterValue;
  onFilterChange: (filter: LocationFilterValue) => void;
}

export default function LocationFilter({ 
  initialValue, 
  onFilterChange 
}: LocationFilterProps) {
  const [filter, setFilter] = useState<LocationFilterValue>(initialValue || {});
  
  // Sample location data - in a real app, this would come from an API
  const states = ['California', 'New York', 'Texas', 'Florida', 'Illinois'];
  
  // Sample counties based on selected state
  const getCounties = (state?: string) => {
    if (!state) return [];
    
    switch (state) {
      case 'California':
        return ['Los Angeles', 'San Francisco', 'San Diego', 'Orange', 'Santa Clara'];
      case 'New York':
        return ['New York', 'Kings', 'Queens', 'Bronx', 'Richmond'];
      case 'Texas':
        return ['Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis'];
      case 'Florida':
        return ['Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange'];
      case 'Illinois':
        return ['Cook', 'DuPage', 'Lake', 'Will', 'Kane'];
      default:
        return [];
    }
  };
  
  // Sample cities based on selected county
  const getCities = (state?: string, county?: string) => {
    if (!state || !county) return [];
    
    // This is just sample data - in a real app, you'd have a more comprehensive database
    if (state === 'California' && county === 'Los Angeles') {
      return ['Los Angeles', 'Long Beach', 'Pasadena', 'Santa Monica', 'Glendale'];
    } else if (state === 'New York' && county === 'New York') {
      return ['Manhattan', 'Financial District', 'Chelsea', 'Upper East Side', 'Greenwich Village'];
    }
    
    return ['City 1', 'City 2', 'City 3']; // Default placeholder
  };
  
  // Handle state selection
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setFilter({
      state: newState || undefined,
      county: undefined,
      city: undefined,
      zipCode: filter.zipCode
    });
  };
  
  // Handle county selection
  const handleCountyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCounty = e.target.value;
    setFilter({
      ...filter,
      county: newCounty || undefined,
      city: undefined
    });
  };
  
  // Handle city selection
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setFilter({
      ...filter,
      city: newCity || undefined
    });
  };
  
  // Handle zip code input
  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZipCode = e.target.value;
    setFilter({
      ...filter,
      zipCode: newZipCode || undefined
    });
  };
  
  // Notify parent component of filter changes
  useEffect(() => {
    onFilterChange(filter);
  }, [filter, onFilterChange]);
  
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
          State
        </label>
        <select
          id="state"
          value={filter.state || ''}
          onChange={handleStateChange}
          className="block w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="">Select a state</option>
          {states.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>
      
      {filter.state && (
        <div>
          <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-1">
            County
          </label>
          <select
            id="county"
            value={filter.county || ''}
            onChange={handleCountyChange}
            className="block w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select a county</option>
            {getCounties(filter.state).map(county => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>
        </div>
      )}
      
      {filter.state && filter.county && (
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <select
            id="city"
            value={filter.city || ''}
            onChange={handleCityChange}
            className="block w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select a city</option>
            {getCities(filter.state, filter.county).map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
          ZIP Code
        </label>
        <input
          type="text"
          id="zipCode"
          value={filter.zipCode || ''}
          onChange={handleZipCodeChange}
          placeholder="Enter ZIP code"
          className="block w-full p-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
}