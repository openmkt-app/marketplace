import React from 'react';
import { Category } from '../types';
import { Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';

interface FilterBarProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  itemCount: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ selectedCategory, onSelectCategory, itemCount }) => {
  return (
    <div className="sticky top-16 z-40 bg-white border-b border-gray-100 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Categories - Scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            {Object.values(Category).map((cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-md transform scale-105'
                    : 'bg-white text-slate-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Utilities */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-sm">
            <span className="text-gray-500 hidden sm:inline-block">
                Showing {itemCount} items
            </span>
            
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                <button className="flex items-center gap-1 text-slate-700 hover:text-brand-600 font-medium">
                    Filters <Filter size={16} />
                </button>
                <button className="flex items-center gap-1 text-slate-700 hover:text-brand-600 font-medium">
                    Sort <ChevronDown size={16} />
                </button>
            </div>
            
             <div className="flex bg-gray-100 rounded-lg p-1">
                <button className="p-1.5 bg-white rounded-md shadow-sm text-slate-900">
                    <LayoutGrid size={16} />
                </button>
                <button className="p-1.5 text-gray-500 hover:text-slate-900">
                    <List size={16} />
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FilterBar;