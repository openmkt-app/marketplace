'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import LocationFilter, { LocationFilterValue } from './LocationFilter';
import PriceFilter from './PriceFilter';
import CategoryFilter from './CategoryFilter';
import ConditionFilter from './ConditionFilter';
// Sorting and View options moved to HorizontalFilterBar
// import SortingOptions from './SortingOptions';
import SearchBar from './SearchBar';
import RecencyFilter from './RecencyFilter';
// import ViewOptions from './ViewOptions';
// Import commented out for now - will revisit later
// import CommuteFilter, { CommuteRoute } from './CommuteFilter';

export interface FilterValues {
  // Search
  searchQuery?: string;

  // Location filtering
  location?: LocationFilterValue;

  // Commute filtering - commented out for now, will revisit later
  // commuteRoute?: CommuteRoute;

  // Category filtering
  category?: string;
  subcategory?: string;

  // Price filtering
  price?: {
    min?: number;
    max?: number;
    bracket?: string;
    deals?: boolean;
  };

  // Condition filtering
  condition?: string[];
  // Item age filtering - commented out for now, will revisit later
  // age?: string;

  // Recency filtering
  postedWithin?: string;
  recentlyViewed?: boolean;

  // Advanced attributes
  attributes?: Record<string, string | number | boolean | string[]>;
  tags?: string[];

  // Sorting
  sortBy?: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency';

  // View options
  viewMode?: 'grid' | 'list' | 'map';
  resultsPerPage?: number;
}

interface FilterPanelProps {
  initialValues?: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  savedFilters?: Array<{ name: string, filter: FilterValues }>;
  onSaveFilter?: (name: string, filter: FilterValues) => void;
}

export default function FilterPanel({
  initialValues,
  onFilterChange,
  savedFilters = [],
  onSaveFilter
}: FilterPanelProps) {
  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true);
  // Use a ref to track if changes are from internal state updates
  const isInternalChange = useRef(false);

  const [filterValues, setFilterValues] = useState<FilterValues>(
    initialValues || {
      viewMode: 'grid',
      resultsPerPage: 12
    }
  );

  // Sync local state with initialValues when they change (e.g. from HorizontalFilterBar)
  // but only for changes from external sources (not from our own updates)
  useEffect(() => {
    // Skip if this is an internal change (we updated our own state)
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (initialValues) {
      setFilterValues(prev => ({
        ...prev,
        ...initialValues
      }));
    }
  }, [initialValues]);

  const [activeTab, setActiveTab] = useState<string>("location");
  const [filterName, setFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Handle location filter changes
  const handleLocationFilterChange = useCallback((locationFilter: LocationFilterValue) => {
    setFilterValues(prev => ({
      ...prev,
      location: locationFilter
    }));
  }, []);

  // Handle price filter changes
  const handlePriceFilterChange = useCallback((price: FilterValues['price']) => {
    setFilterValues(prev => ({
      ...prev,
      price
    }));
  }, []);

  // Handle category filter changes
  const handleCategoryFilterChange = useCallback((category?: string, subcategory?: string) => {
    setFilterValues(prev => ({
      ...prev,
      category,
      subcategory
    }));
  }, []);

  // Handle condition filter changes
  const handleConditionFilterChange = useCallback((condition?: string[], age?: string) => {
    setFilterValues(prev => ({
      ...prev,
      condition,
      // age field commented out for now, will revisit later
      // age
    }));
  }, []);

  // Handle recency filter changes
  const handleRecencyFilterChange = useCallback((postedWithin?: string, recentlyViewed?: boolean) => {
    setFilterValues(prev => ({
      ...prev,
      postedWithin,
      recentlyViewed
    }));
  }, []);

  // Handle search query changes
  const handleSearchQueryChange = useCallback((searchQuery?: string) => {
    setFilterValues(prev => ({
      ...prev,
      searchQuery
    }));
  }, []);

  // Handle sort by changes
  const handleSortByChange = useCallback((sortBy?: FilterValues['sortBy']) => {
    setFilterValues(prev => ({
      ...prev,
      sortBy
    }));
  }, []);

  // Handle view options changes
  const handleViewOptionsChange = useCallback((viewMode?: 'grid' | 'list' | 'map', resultsPerPage?: number) => {
    setFilterValues(prev => ({
      ...prev,
      viewMode,
      resultsPerPage
    }));
  }, []);

  // Handle commute filter changes - commented out for now, will revisit later
  /*
  const handleCommuteFilterChange = useCallback((commuteRoute: CommuteRoute | null) => {
    setFilterValues(prev => ({
      ...prev,
      commuteRoute: commuteRoute || undefined
    }));
  }, []);
  */

  // Handle save filter
  const handleSaveFilter = () => {
    if (filterName && onSaveFilter) {
      onSaveFilter(filterName, filterValues);
      setFilterName("");
      setShowSaveDialog(false);
    }
  };

  // Handle load saved filter
  const handleLoadFilter = (filter: FilterValues) => {
    setFilterValues(filter);
  };

  // Only call onFilterChange when filterValues changes
  useEffect(() => {
    // Skip on first render to avoid an extra filter operation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Mark this as an internal change so we don't sync back from initialValues
    isInternalChange.current = true;

    // Call the parent's filter change handler
    onFilterChange(filterValues);
  }, [filterValues, onFilterChange]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Advanced Filters Header */}
      <div className="px-4 py-2 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Advanced Filters</h3>
      </div>

      {/* Filter Sections */}
      <div className="border-b">
        {/* Filter Tabs */}
        <div className="flex border-b overflow-x-auto">
          {['location', 'price', 'category', 'condition', 'recency'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-center font-medium whitespace-nowrap ${activeTab === tab
                ? 'text-primary-color border-b-2 border-primary-color'
                : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

          {/* Filter Content */}
          <div className="p-4">
            {activeTab === 'location' && (
              <LocationFilter
                initialValue={filterValues.location}
                onFilterChange={handleLocationFilterChange}
              />
            )}

            {/* CommuteFilter commented out for now - will revisit later
            {activeTab === 'commute' && (
              <CommuteFilter 
                initialRoute={filterValues.commuteRoute}
                onFilterChange={handleCommuteFilterChange}
              />
            )}
            */}

            {activeTab === 'price' && (
              <PriceFilter
                initialValue={filterValues.price}
                onChange={handlePriceFilterChange}
              />
            )}

            {activeTab === 'category' && (
              <CategoryFilter
                selectedCategory={filterValues.category}
                selectedSubcategory={filterValues.subcategory}
                onChange={handleCategoryFilterChange}
              />
            )}

            {activeTab === 'condition' && (
              <ConditionFilter
                selectedConditions={filterValues.condition}
                // selectedAge field commented out for now, will revisit later
                // selectedAge={filterValues.age}
                onChange={handleConditionFilterChange}
              />
            )}

            {activeTab === 'recency' && (
              <RecencyFilter
                postedWithin={filterValues.postedWithin}
                recentlyViewed={filterValues.recentlyViewed}
                onChange={handleRecencyFilterChange}
              />
            )}
        </div>

        {/* Saved Filters and Save Button */}
        <div className="p-4 bg-neutral-light/50 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-text-primary">Saved Filters:</span>
            <div className="flex space-x-2">
              {savedFilters.length > 0 ? (
                savedFilters.map((savedFilter, index) => (
                  <button
                    key={index}
                    onClick={() => handleLoadFilter(savedFilter.filter)}
                    className="text-sm bg-white hover:bg-neutral-light px-3 py-1 rounded-full shadow-sm"
                  >
                    {savedFilter.name}
                  </button>
                ))
              ) : (
                <span className="text-sm text-text-secondary">None saved</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="text-primary-color hover:text-primary-light text-sm font-medium"
          >
            Save Current Filter
          </button>
        </div>

        {/* Save Filter Dialog */}
        {showSaveDialog && (
          <div className="p-4 bg-primary-light/10 border-t border-primary-light/20">
            <div className="flex space-x-2">
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Filter name"
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-color"
              />
              <button
                onClick={handleSaveFilter}
                disabled={!filterName}
                className={`px-4 py-2 rounded-md ${!filterName
                  ? 'bg-neutral-medium text-text-secondary'
                  : 'bg-primary-color text-white hover:bg-primary-light'
                  }`}
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-neutral-light text-text-primary hover:bg-neutral-medium rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}