import React, { useState, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import ListingCard from './components/ListingCard';
import Footer from './components/Footer';
import { MOCK_LISTINGS } from './constants';
import { Category, AISearchResponse, Listing } from './types';
import { Sparkles, X } from 'lucide-react';

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>(Category.ALL);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiFilter, setAiFilter] = useState<AISearchResponse | null>(null);

  // Logic to filter listings
  const filteredListings = useMemo(() => {
    let result = MOCK_LISTINGS;

    // 1. Apply Category
    // If AI sets a category, it overrides manual selection unless AI says "All"
    const categoryToUse = aiFilter && aiFilter.category !== 'All'
      ? (Object.values(Category).find(c => c === aiFilter.category) || Category.ALL)
      : activeCategory;

    if (categoryToUse !== Category.ALL) {
      result = result.filter(item => item.category === categoryToUse);
    }

    // 2. Apply Search Terms
    // Use AI keywords if available, otherwise manual search
    const term = aiFilter ? aiFilter.keywords : searchTerm;

    if (term) {
      const lowerTerm = term.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(lowerTerm) ||
        item.description.toLowerCase().includes(lowerTerm) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerTerm))
      );
    }

    // 3. Apply AI Price/Location Filters if they exist
    if (aiFilter) {
      if (aiFilter.minPrice) {
        result = result.filter(item => item.price >= aiFilter.minPrice!);
      }
      if (aiFilter.maxPrice) {
        result = result.filter(item => item.price <= aiFilter.maxPrice!);
      }
      if (aiFilter.location) {
        // Simple partial match for location mock
        result = result.filter(item => item.location.toLowerCase().includes(aiFilter.location!.toLowerCase()));
      }
    }

    return result;
  }, [activeCategory, searchTerm, aiFilter]);

  const handleManualSearch = (term: string) => {
    setSearchTerm(term);
    setAiFilter(null); // Clear AI filter if user manually searches
  };

  const handleAiResult = (result: AISearchResponse) => {
    setAiFilter(result);
    setSearchTerm(''); // Clear manual search term

    // Sync category UI if AI picked one
    const matchedCategory = Object.values(Category).find(c => c === result.category);
    if (matchedCategory) {
      setActiveCategory(matchedCategory);
    }
  };

  const clearAiFilter = () => {
    setAiFilter(null);
    setActiveCategory(Category.ALL);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 flex flex-col">
      <Navbar onSearch={handleManualSearch} onAISearchResult={handleAiResult} />

      {/* AI Context Banner */}
      {aiFilter && (
        <div className="bg-brand-50 border-b border-brand-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-900 text-sm">
              <Sparkles size={16} className="text-brand-600" />
              <span>
                <strong>Smart Filter Active:</strong> {aiFilter.reasoning}
              </span>
            </div>
            <button
              onClick={clearAiFilter}
              className="text-brand-700 hover:text-brand-900 text-xs font-semibold flex items-center gap-1"
            >
              Clear AI Filters <X size={14} />
            </button>
          </div>
        </div>
      )}

      <FilterBar
        selectedCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          if (aiFilter) setAiFilter(null); // Reset AI if user manually clicks a category
        }}
        itemCount={filteredListings.length}
      />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Browse Listings</h1>
            <p className="text-gray-500">Discover what the community is selling.</p>
          </div>

          {/* Grid */}
          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
              <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                <Sparkles size={48} strokeWidth={1} />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No matches found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setAiFilter(null);
                  setActiveCategory(Category.ALL);
                }}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;