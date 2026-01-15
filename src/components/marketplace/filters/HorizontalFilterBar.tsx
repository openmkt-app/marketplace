'use client';

import React, { useState } from 'react';
import { Filter, ChevronDown, LayoutGrid, List, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/category-data';

interface HorizontalFilterBarProps {
    selectedCategory: string | undefined;
    onSelectCategory: (category: string | undefined) => void;
    itemCount: number;
    onToggleFilters: () => void;
    showFilters: boolean;
    sortBy: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency';
    onSortChange: (sort: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency') => void;
    viewMode: 'grid' | 'list' | 'map';
    resultsPerPage: number;
    onViewOptionsChange: (mode: 'grid' | 'list' | 'map', perPage: number) => void;
    onResetFilters: () => void;
    hasActiveFilters: boolean;
}

// Simplified category list for the main pills - show only most common categories
const FEATURED_CATEGORIES = [
    { id: 'electronics', name: 'Electronics' },
    { id: 'garden', name: 'Garden & Outdoor' },
    { id: 'home', name: 'Home' },
    { id: 'apparel', name: 'Clothing' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'other', name: 'Other' },
];

const SORT_OPTIONS = [
    { value: 'recency', label: 'Recently Listed' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'distance', label: 'Distance' },
];

const HorizontalFilterBar: React.FC<HorizontalFilterBarProps> = ({
    selectedCategory,
    onSelectCategory,
    itemCount,
    onToggleFilters,
    showFilters,
    sortBy,
    onSortChange,
    viewMode,
    resultsPerPage,
    onViewOptionsChange,
    onResetFilters,
    hasActiveFilters
}) => {
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);

    const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Sort';

    // Check if selected category is in featured list
    const isSelectedInFeatured = !selectedCategory || FEATURED_CATEGORIES.some(c => c.id === selectedCategory);

    return (
        <div className="bg-white border-b border-gray-100">
            {/* Category Pills Row */}
            <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {/* All Button */}
                    <button
                        onClick={() => onSelectCategory(undefined)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                            !selectedCategory
                                ? 'bg-gray-900 text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        All
                    </button>

                    {/* Featured Categories */}
                    {FEATURED_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                                selectedCategory === cat.id
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}

                    {/* More Categories Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAllCategories(!showAllCategories)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 flex items-center gap-1 ${
                                !isSelectedInFeatured
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {!isSelectedInFeatured
                                ? CATEGORIES.find(c => c.id === selectedCategory)?.name || 'More'
                                : 'More'
                            }
                            <ChevronDown size={14} className={`transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
                        </button>

                        {showAllCategories && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowAllCategories(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                                    {CATEGORIES.filter(cat => !FEATURED_CATEGORIES.some(fc => fc.id === cat.id)).map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                onSelectCategory(cat.id);
                                                setShowAllCategories(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                                selectedCategory === cat.id ? 'text-blue-600 font-medium' : 'text-gray-700'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right side - Item count and controls */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-gray-500 text-sm hidden sm:inline-block">
                        Showing <span className="font-medium text-gray-900">{itemCount}</span> items
                    </span>

                    {/* Filters Button */}
                    <button
                        onClick={onToggleFilters}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            showFilters || hasActiveFilters
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Filter size={16} />
                        Filters
                        {hasActiveFilters && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                    </button>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Sort
                            <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showSortDropdown && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowSortDropdown(false)}
                                />
                                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[180px]">
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                onSortChange(option.value as typeof sortBy);
                                                setShowSortDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                                sortBy === option.value ? 'text-blue-600 font-medium' : 'text-gray-700'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => onViewOptionsChange('grid', resultsPerPage)}
                            className={`p-1.5 rounded transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="Grid view"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => onViewOptionsChange('list', resultsPerPage)}
                            className={`p-1.5 rounded transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="List view"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Filters / Reset */}
            {hasActiveFilters && (
                <div className="pb-3">
                    <button
                        onClick={onResetFilters}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-full transition-colors"
                    >
                        <X size={14} />
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default HorizontalFilterBar;
