'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import LocationFilter, { LocationFilterValue } from './LocationFilter';
import CommuteFilter, { CommuteRoute } from './CommuteFilter';
import PriceFilter from './PriceFilter';
import CategoryFilter from './CategoryFilter';
import ConditionFilter from './ConditionFilter';
import SortingOptions from './SortingOptions';
import SearchBar from './SearchBar';
import SellerFilter from './SellerFilter';
import RecencyFilter from './RecencyFilter';
import ViewOptions from './ViewOptions';

export interface FilterValues {
  // Search
  searchQuery?: string;
  
  // Location filtering
  locationType: 'basic' | 'commute' | 'radius';
  location?: LocationFilterValue;
  commuteRoute?: CommuteRoute;
  
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
  age?: string;
  
  // Seller filtering
  sellerVerified?: boolean;
  sellerNetwork?: boolean;
  
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
  savedFilters?: Array<{name: string, filter: FilterValues}>;
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
  
  const [filterValues, setFilterValues] = useState<FilterValues>(
    initialValues || {
      locationType: 'basic',
      viewMode: 'grid',
      resultsPerPage: 12
    }
  );

  const [activeTab, setActiveTab] = useState<string>("search");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Handle location filter changes
  const handleLocationFilterChange = useCallback((locationFilter: LocationFilterValue) => {
    setFilterValues(prev => ({
      ...prev,
      locationType: 'basic',
      location: locationFilter,
      commuteRoute: undefined
    }));
  }, []);

  // Handle commute filter changes
  const handleCommuteFilterChange = useCallback((commuteRoute: CommuteRoute | null) => {
    setFilterValues(prev => ({
      ...prev,
      locationType: 'commute',
      commuteRoute: commuteRoute || undefined,
      location: undefined
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
      age
    }));
  }, []);

  // Handle seller filter changes
  const handleSellerFilterChange = useCallback((sellerVerified?: boolean, sellerNetwork?: boolean) => {
    setFilterValues(prev => ({
      ...prev,
      sellerVerified,
      sellerNetwork
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
    
    // Call the parent's filter change handler
    onFilterChange(filterValues);
  }, [filterValues, onFilterChange]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Search Bar - Always visible at the top */}
      <div className="p-4 border-b">
        <SearchBar 
          initialValue={filterValues.searchQuery} 
          onSearchChange={handleSearchQueryChange}
        />
      </div>
      
      {/* Filter Toggle Button */}
      <div className="px-4 py-2 border-b flex justify-between items-center">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="text-primary-color font-medium flex items-center"
        >
          {filtersExpanded ? 'Hide Filters' : 'Show Advanced Filters'}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-1 transition-transform ${filtersExpanded ? 'transform rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-2">
          <ViewOptions 
            viewMode={filterValues.viewMode}
            resultsPerPage={filterValues.resultsPerPage}
            onChange={handleViewOptionsChange}
          />
          
          <SortingOptions 
            sortBy={filterValues.sortBy} 
            onChange={handleSortByChange}
          />
        </div>
      </div>

      {/* Collapsible Filter Sections */}
      {filtersExpanded && (
        <div className="border-b">
          {/* Filter Tabs */}
          <div className="flex border-b overflow-x-auto">
            {['location', 'price', 'category', 'condition', 'seller', 'recency'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 text-center font-medium whitespace-nowrap ${
                  activeTab === tab
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
              <div className="space-y-4">
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setFilterValues(prev => ({ ...prev, locationType: 'basic' }))}
                    className={`flex-1 py-2 px-3 text-center rounded ${
                      filterValues.locationType === 'basic'
                        ? 'bg-primary-color text-white'
                        : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
                    }`}
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => setFilterValues(prev => ({ ...prev, locationType: 'commute' }))}
                    className={`flex-1 py-2 px-3 text-center rounded ${
                      filterValues.locationType === 'commute'
                        ? 'bg-primary-color text-white'
                        : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
                    }`}
                  >
                    Commute
                  </button>
                </div>
                {filterValues.locationType === 'basic' ? (
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
            )}
            
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
                selectedAge={filterValues.age}
                onChange={handleConditionFilterChange}
              />
            )}
            
            {activeTab === 'seller' && (
              <SellerFilter 
                verified={filterValues.sellerVerified}
                network={filterValues.sellerNetwork}
                onChange={handleSellerFilterChange}
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
                  className={`px-4 py-2 rounded-md ${
                    !filterName
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
      )}
    </div>
  );
}