'use client';

import { useMemo, useState } from 'react';
import { X, Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { CATEGORIES, CONDITIONS } from '@/lib/category-data';

interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface SmartFilterSummaryProps {
  // Core filter state
  itemCount: number;
  searchQuery?: string;
  selectedCategory?: string;
  locationName?: string;
  locationRadius?: number; // in miles

  // Secondary filters for chips
  priceRange?: { min?: number; max?: number; bracket?: string };
  conditions?: string[];
  postedWithin?: string;

  // Callbacks
  onClearSearch?: () => void;
  onClearCategory?: () => void;
  onClearLocation?: () => void;
  onClearPrice?: () => void;
  onClearCondition?: (conditionId: string) => void;
  onClearPostedWithin?: () => void;
  onClearAllFilters?: () => void;

  // Control buttons
  onToggleFilters: () => void;
  showFilters: boolean;
  hasActiveFilters: boolean;

  // Sort
  sortBy: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency';
  onSortChange: (sort: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency') => void;

  // View mode
  viewMode: 'grid' | 'list' | 'map';
  resultsPerPage: number;
  onViewOptionsChange: (mode: 'grid' | 'list' | 'map', perPage: number) => void;
}

const SORT_OPTIONS = [
  { value: 'recency', label: 'Recently Listed' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'distance', label: 'Distance' },
];

const PRICE_BRACKET_LABELS: Record<string, string> = {
  'under_50': 'Under $50',
  '50_100': '$50 - $100',
  '100_250': '$100 - $250',
  '250_500': '$250 - $500',
  'over_500': 'Over $500',
};

const POSTED_WITHIN_LABELS: Record<string, string> = {
  'day': 'Last 24 hours',
  'week': 'Last week',
  'month': 'Last month',
  'quarter': 'Last 3 months',
  'older': 'Older listings',
};

export default function SmartFilterSummary({
  itemCount,
  searchQuery,
  selectedCategory,
  locationName,
  locationRadius,
  priceRange,
  conditions,
  postedWithin,
  onClearSearch,
  onClearCategory,
  onClearLocation,
  onClearPrice,
  onClearCondition,
  onClearPostedWithin,
  onClearAllFilters,
  onToggleFilters,
  showFilters,
  hasActiveFilters,
  sortBy,
  onSortChange,
  viewMode,
  resultsPerPage,
  onViewOptionsChange,
}: SmartFilterSummaryProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Build natural language summary (count, search query, and location)
  const summaryText = useMemo(() => {
    const parts: string[] = [];

    // Result count
    parts.push(`Showing ${itemCount} ${itemCount === 1 ? 'result' : 'results'}`);

    // Search query
    if (searchQuery) {
      parts.push(`for "${searchQuery}"`);
    }

    // Location with radius (reads naturally in the summary)
    if (locationName && locationRadius) {
      parts.push(`within ${locationRadius} mi of ${locationName}`);
    } else if (locationName) {
      parts.push(`near ${locationName}`);
    }

    return parts.join(' ');
  }, [itemCount, searchQuery, locationName, locationRadius]);

  // Build filter chips for all active filters
  const filterChips = useMemo(() => {
    const chips: FilterChip[] = [];

    // Category chip
    if (selectedCategory && onClearCategory) {
      const categoryName = CATEGORIES.find(c => c.id === selectedCategory)?.name;
      if (categoryName) {
        chips.push({
          id: 'category',
          label: categoryName,
          onRemove: onClearCategory,
        });
      }
    }

    // Price filter chip
    if (priceRange) {
      let priceLabel = '';
      if (priceRange.bracket) {
        priceLabel = PRICE_BRACKET_LABELS[priceRange.bracket] || priceRange.bracket;
      } else if (priceRange.min !== undefined && priceRange.max !== undefined) {
        priceLabel = `$${priceRange.min} - $${priceRange.max}`;
      } else if (priceRange.min !== undefined) {
        priceLabel = `Min $${priceRange.min}`;
      } else if (priceRange.max !== undefined) {
        priceLabel = `Max $${priceRange.max}`;
      }

      if (priceLabel && onClearPrice) {
        chips.push({
          id: 'price',
          label: priceLabel,
          onRemove: onClearPrice,
        });
      }
    }

    // Condition filter chips
    if (conditions && conditions.length > 0 && onClearCondition) {
      conditions.forEach(conditionId => {
        const condition = CONDITIONS.find(c => c.id === conditionId);
        if (condition) {
          chips.push({
            id: `condition-${conditionId}`,
            label: condition.name,
            onRemove: () => onClearCondition(conditionId),
          });
        }
      });
    }

    // Posted within chip
    if (postedWithin && onClearPostedWithin) {
      const label = POSTED_WITHIN_LABELS[postedWithin] || postedWithin;
      chips.push({
        id: 'postedWithin',
        label: label,
        onRemove: onClearPostedWithin,
      });
    }

    return chips;
  }, [selectedCategory, priceRange, conditions, postedWithin, onClearCategory, onClearPrice, onClearCondition, onClearPostedWithin]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Summary text and filter chips */}
        <div className="flex-1 min-w-0">
          {/* Summary text */}
          <p className="text-gray-900 font-medium text-sm">
            {summaryText}
          </p>

          {/* Filter chips */}
          {filterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors group"
                >
                  {chip.label}
                  <X size={12} className="text-sky-500 group-hover:text-sky-700" />
                </button>
              ))}

              {/* Clear all button - only show if multiple chips */}
              {filterChips.length > 1 && onClearAllFilters && (
                <button
                  onClick={onClearAllFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filters Button */}
          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-sky-50 text-sky-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={14} />
            Filters
            {hasActiveFilters && !showFilters && (
              <span className="w-1.5 h-1.5 bg-sky-600 rounded-full" />
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sort
              <ChevronDown size={12} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className="absolute top-full right-0 mt-1.5 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-50 min-w-[160px]">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSortChange(option.value as typeof sortBy);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${
                        sortBy === option.value ? 'text-sky-600 font-medium' : 'text-gray-700'
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
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => onViewOptionsChange('grid', resultsPerPage)}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => onViewOptionsChange('list', resultsPerPage)}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
