'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavbarFilter, NavbarFilterProps } from '@/contexts/NavbarFilterContext';
import SearchBar from '../marketplace/filters/SearchBar';
import { generateAvatarUrl } from '@/lib/image-utils';
import { Bell, Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { CATEGORIES } from '@/lib/category-data';

// Featured categories for quick access pills
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

// Filter row component for browse page
const NavbarFilterRow = ({
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
  hasActiveFilters
}: NavbarFilterProps) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Check if selected category is in featured list
  const isSelectedInFeatured = !selectedCategory || FEATURED_CATEGORIES.some(c => c.id === selectedCategory);

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-t border-gray-50">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {/* All Button */}
        <button
          onClick={() => onSelectCategory(undefined)}
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 flex-shrink-0 ${!selectedCategory
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
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 flex-shrink-0 ${selectedCategory === cat.id
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
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 flex-shrink-0 flex items-center gap-1 ${!isSelectedInFeatured
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
          >
            {!isSelectedInFeatured
              ? CATEGORIES.find(c => c.id === selectedCategory)?.name || 'More'
              : 'More'
            }
            <ChevronDown size={12} className={`transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
          </button>

          {showAllCategories && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAllCategories(false)}
              />
              <div className="absolute top-full left-0 mt-1.5 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-50 min-w-[180px] max-h-[280px] overflow-y-auto">
                {CATEGORIES.filter(cat => !FEATURED_CATEGORIES.some(fc => fc.id === cat.id)).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setShowAllCategories(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${selectedCategory === cat.id ? 'text-sky-600 font-medium' : 'text-gray-700'
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
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-gray-400 text-[13px] hidden sm:inline-block">
          Showing <span className="font-medium text-gray-700">{itemCount}</span> items
        </span>

        {/* Filters Button */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-1 px-2.5 py-1 text-[13px] font-medium transition-colors ${showFilters || hasActiveFilters
              ? 'text-sky-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 bg-sky-600 rounded-full" />
          )}
        </button>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1 px-2.5 py-1 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
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
                    className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${sortBy === option.value ? 'text-sky-600 font-medium' : 'text-gray-700'
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
        <div className="flex items-center bg-gray-100 rounded p-0.5">
          <button
            onClick={() => onViewOptionsChange('grid', resultsPerPage)}
            className={`p-1 rounded transition-colors ${viewMode === 'grid'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
              }`}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewOptionsChange('list', resultsPerPage)}
            className={`p-1 rounded transition-colors ${viewMode === 'list'
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
  );
};

// Wrapper for search param usage
const NavbarContent = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const { filterProps } = useNavbarFilter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';

  // Handle search - only navigate when user actively searches, not on passive state changes
  const handleSearch = useCallback((query?: string) => {
    // Only handle search navigation when we're on the browse page
    // This prevents redirecting back to browse when navigating away
    if (pathname !== '/browse') {
      return;
    }

    // Normalize queries to handle undefined vs empty string
    const currentQ = searchParams.get('q') || '';
    const newQ = query || '';

    // Avoid redundant updates
    if (currentQ === newQ) {
      return;
    }

    const newParams = new URLSearchParams(searchParams.toString());

    if (query) {
      newParams.set('q', query);
    } else {
      newParams.delete('q');
    }

    const url = `/browse?${newParams.toString()}`;
    router.replace(url); // Replace history to avoid back-button hell for every keystroke
  }, [pathname, router, searchParams]);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav
      className={`sticky top-0 z-50 bg-white border-b border-gray-100 transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer group flex-shrink-0">
            <div className="bg-primary-color text-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              AT <span className="text-primary-color">Market</span>
            </span>
          </Link>

          {/* Search Bar - Centered */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <SearchBar
              initialValue={currentQuery}
              onSearchChange={handleSearch}
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn && (
              <button
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {/* Notification dot - uncomment when needed */}
                {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
              </button>
            )}

            <Link
              href="/create-listing"
              className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <span className="text-sm font-medium">Sell Item</span>
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700 hidden md:block"
                >
                  Log Out
                </button>
                {user?.did && user?.avatarCid ? (
                  <div className="h-9 w-9 rounded-full border-2 border-gray-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-color transition-all relative">
                    <Image
                      src={generateAvatarUrl(user.did, user.avatarCid) || ''}
                      alt={user.displayName || user.handle || 'User'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full bg-blue-100 border-2 border-gray-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-color transition-all flex items-center justify-center text-blue-600 font-semibold">
                    {user?.handle ? user.handle.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-primary-color text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-light transition-colors"
              >
                Log In
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Filter Row - Only shown on browse page when filterProps provided */}
        {filterProps && <NavbarFilterRow {...filterProps} />}

        {/* Mobile Search (visible only on small screens) */}
        <div className="md:hidden pb-4">
          <SearchBar
            initialValue={currentQuery}
            onSearchChange={handleSearch}
          />
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/"
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') ? 'bg-primary-color/10 text-primary-color' : 'text-slate-600 hover:bg-gray-50'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/browse"
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/browse') ? 'bg-primary-color/10 text-primary-color' : 'text-slate-600 hover:bg-gray-50'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Browse Listings
            </Link>
            <Link
              href="/create-listing"
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/create-listing') ? 'bg-primary-color/10 text-primary-color' : 'text-slate-600 hover:bg-gray-50'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Sell Item
            </Link>

            {isLoggedIn ? (
              <>
                <div className="px-4 py-3 mt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 mt-2 border-t border-gray-100">
                <Link
                  href="/login"
                  className="block w-full text-center bg-primary-color text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-light transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default function Navbar() {
  return (
    <Suspense fallback={<nav className="h-16 bg-white border-b border-gray-100"></nav>}>
      <NavbarContent />
    </Suspense>
  );
}
