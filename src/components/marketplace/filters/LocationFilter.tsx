'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import LocationMap from './LocationMap';

export interface LocationFilterValue {
  state: string;
  county: string;
  locality: string;
  zipPrefix?: string;
  radius?: number;
  savedLocationName?: string;
}

export interface SavedLocation extends LocationFilterValue {
  name: string;
}

interface LocationFilterProps {
  initialValue?: LocationFilterValue;
  onFilterChange: (filter: LocationFilterValue) => void;
}

export default function LocationFilter({ initialValue, onFilterChange }: LocationFilterProps) {
  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true);
  
  // State for current filter values
  const [filter, setFilter] = useState<LocationFilterValue>(
    initialValue || {
      state: '',
      county: '',
      locality: '',
      zipPrefix: '',
      radius: 5
    }
  );

  // State for saved locations
  const [savedLocations, setSavedLocations] = useLocalStorage<SavedLocation[]>('saved-locations', []);
  const [showSaveLocationForm, setShowSaveLocationForm] = useState(false);
  const [locationName, setLocationName] = useState('');
  
  // State for showing the map
  const [showMap, setShowMap] = useState(false);

  // Update filter state if initialValue changes
  useEffect(() => {
    if (!initialValue) return;
    if (JSON.stringify(initialValue) === JSON.stringify(filter)) return;
    setFilter(initialValue);
  }, [initialValue]);

  // Effect to call onFilterChange when the filter changes
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Call the onChange handler
    onFilterChange(filter);
  }, [filter, onFilterChange]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle radius slider change
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFilter(prev => ({
      ...prev,
      radius: value
    }));
  };

  // Save current location
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) return;

    const newLocation: SavedLocation = {
      ...filter,
      name: locationName
    };

    setSavedLocations(prev => [...prev, newLocation]);
    setLocationName('');
    setShowSaveLocationForm(false);
  };

  // Load a saved location
  const handleLoadLocation = (location: SavedLocation) => {
    setFilter({
      ...location,
      savedLocationName: location.name
    });
  };

  // Delete a saved location
  const handleDeleteLocation = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the location selection
    setSavedLocations(prev => prev.filter((_, i) => i !== index));
  };

  // Format radius for display
  const formatRadius = (radius: number) => {
    if (radius === 1) return "Within 1 mile";
    if (radius <= 5) return `1-${radius} miles`;
    if (radius <= 20) return `5-${radius} miles`;
    return `Up to ${radius} miles`;
  };

  // Toggle the map display
  const toggleMap = () => {
    setShowMap(prev => !prev);
  };

  // Check if we have enough location data to show a map
  const hasLocationData = Boolean(filter.state && (filter.county || filter.locality));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Find Items Near You</h2>
      
      {/* Saved Locations */}
      {savedLocations.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {savedLocations.map((location, index) => (
              <div 
                key={index} 
                className={`px-3 py-1 rounded-full text-sm cursor-pointer flex items-center ${
                  filter.savedLocationName === location.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <span 
                  onClick={() => handleLoadLocation(location)}
                  className="mr-1"
                >
                  {location.name}
                </span>
                <button
                  onClick={(e) => handleDeleteLocation(index, e)}
                  className="ml-1 text-xs hover:text-red-500"
                  aria-label={`Delete ${location.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="state" className="block text-sm font-medium mb-1">
            State
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={filter.state}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g. California"
          />
        </div>
        
        <div>
          <label htmlFor="county" className="block text-sm font-medium mb-1">
            County
          </label>
          <input
            type="text"
            id="county"
            name="county"
            value={filter.county}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g. Los Angeles"
          />
        </div>
        
        <div>
          <label htmlFor="locality" className="block text-sm font-medium mb-1">
            City/Town
          </label>
          <input
            type="text"
            id="locality"
            name="locality"
            value={filter.locality}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g. Pasadena"
          />
        </div>
        
        <div>
          <label htmlFor="zipPrefix" className="block text-sm font-medium mb-1">
            ZIP Code (first 3 digits)
          </label>
          <input
            type="text"
            id="zipPrefix"
            name="zipPrefix"
            value={filter.zipPrefix || ''}
            onChange={handleInputChange}
            maxLength={3}
            pattern="[0-9]{3}"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g. 910"
          />
        </div>
      </div>

      {/* Nearby Now Slider */}
      <div className="mb-4">
        <label htmlFor="radius" className="block text-sm font-medium mb-1">
          {formatRadius(filter.radius || 5)}
        </label>
        <input
          type="range"
          id="radius"
          name="radius"
          min="1"
          max="50"
          step="1"
          value={filter.radius || 5}
          onChange={handleRadiusChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 mile</span>
          <span>5 miles</span>
          <span>20 miles</span>
          <span>50 miles</span>
        </div>
      </div>

      {/* Map toggle */}
      {hasLocationData && (
        <div className="mb-4">
          <button
            type="button"
            onClick={toggleMap}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={showMap ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} 
              />
            </svg>
            {showMap ? "Hide Map" : "Show Map"}
          </button>
          
          {/* Map visualization */}
          {showMap && (
            <div className="mt-2">
              <LocationMap location={filter} />
            </div>
          )}
        </div>
      )}

      {/* Save Location Button & Form */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!showSaveLocationForm ? (
          <button
            type="button"
            onClick={() => setShowSaveLocationForm(true)}
            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md text-sm"
          >
            Save This Location
          </button>
        ) : (
          <form onSubmit={handleSaveLocation} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Location name"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <button
              type="submit"
              className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowSaveLocationForm(false)}
              className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md text-sm"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}