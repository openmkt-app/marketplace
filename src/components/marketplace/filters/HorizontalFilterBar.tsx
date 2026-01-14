'use client';

import React from 'react';
import { Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { CATEGORIES } from '@/lib/category-data';
import SortingOptions from './SortingOptions';
import ViewOptions from './ViewOptions';

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
    return (
        <div className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Two rows layout */}
                <div className="flex flex-col gap-3 py-3">

                    {/* Row 1: Categories - Scrollable */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
                        <button
                            onClick={() => onSelectCategory(undefined)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 ${!selectedCategory
                                ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                : 'bg-white text-slate-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            All
                        </button>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 ${selectedCategory === cat.id
                                    ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                    : 'bg-white text-slate-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Row 2: Utilities */}
                    <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-4">
                            <span className="text-gray-500 text-sm hidden sm:inline-block">
                                Showing <span className="font-medium text-slate-900">{itemCount}</span> items
                            </span>

                            {hasActiveFilters && (
                                <button
                                    onClick={onResetFilters}
                                    className="text-primary-color hover:text-primary-dark font-medium text-sm flex items-center gap-1 transition-colors"
                                >
                                    <span className="text-xs bg-primary-light/10 p-1 rounded-full">✕</span>
                                    Reset Filters
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={onToggleFilters}
                                className={`flex items-center gap-1 font-medium transition-colors ${showFilters ? 'text-primary-color' : 'text-slate-700 hover:text-primary-color'
                                    }`}
                            >
                                Filters <Filter size={16} />
                            </button>

                            <div className="relative">
                                <SortingOptions
                                    sortBy={sortBy}
                                    onChange={(sort) => {
                                        if (sort) onSortChange(sort);
                                    }}
                                />
                            </div>

                            <div className="flex items-center">
                                <ViewOptions
                                    viewMode={viewMode}
                                    resultsPerPage={resultsPerPage}
                                    onChange={(mode, count) => onViewOptionsChange(mode || 'grid', count || 12)}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HorizontalFilterBar;
