'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import LocationFilter, { LocationFilterValue } from './LocationFilter';
import CommuteFilter, { CommuteRoute } from './CommuteFilter';

export interface FilterValues {
  locationType: 'basic' | 'commute';
  location?: LocationFilterValue;
  commuteRoute?: CommuteRoute;
}

interface FilterPanelProps {
  initialValues?: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
}

export default function FilterPanel({ initialValues, onFilterChange }: FilterPanelProps) {
  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true);
  
  const [filterValues, setFilterValues] = useState<FilterValues>(
    initialValues || {
      locationType: 'basic',
    }
  );

  const [activeTab, setActiveTab] = useState<'basic' | 'commute'>(
    initialValues?.locationType || 'basic'
  );

  // Handle location filter changes - using useCallback to prevent recreating on every render
  const handleLocationFilterChange = useCallback((locationFilter: LocationFilterValue) => {
    setFilterValues(prev => ({
      ...prev,
      locationType: 'basic',
      location: locationFilter,
      // Clear commute route when switching to basic location
      commuteRoute: undefined
    }));
  }, []);

  // Handle commute filter changes - using useCallback to prevent recreating on every render
  const handleCommuteFilterChange = useCallback((commuteRoute: CommuteRoute | null) => {
    setFilterValues(prev => ({
      ...prev,
      locationType: 'commute',
      commuteRoute: commuteRoute || undefined,
      // Clear basic location when switching to commute
      location: undefined
    }));
  }, []);

  // Switch between filter types
  const handleTabChange = useCallback((tab: 'basic' | 'commute') => {
    setActiveTab(tab);
    
    // Update the filter type but don't reset previous values
    // This allows switching back and forth without losing settings
    setFilterValues(prev => ({
      ...prev,
      locationType: tab
    }));
  }, []);

  // Only call onFilterChange when filterValues changes
  useEffect(() => {
    // Skip on first render to avoid an extra filter operation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Call the parent's filter change handler
    onFilterChange(filterValues);
  }, [filterValues, onFilterChange]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Filter Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => handleTabChange('basic')}
          className={`flex-1 py-3 px-4 text-center font-medium ${
            activeTab === 'basic'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Location Search
        </button>
        <button
          onClick={() => handleTabChange('commute')}
          className={`flex-1 py-3 px-4 text-center font-medium ${
            activeTab === 'commute'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Commute Route
        </button>
      </div>

      {/* Filter Content */}
      <div className="p-1">
        {activeTab === 'basic' ? (
          <LocationFilter 
            initialValue={filterValues.location}
            onFilterChange={handleLocationFilterChange}
          />
        ) : (
          <CommuteFilter 
            onFilterChange={handleCommuteFilterChange}
          />
        )}
      </div>
    </div>
  );
}