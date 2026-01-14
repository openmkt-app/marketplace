'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  initialValue?: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  initialValue,
  onSearchChange,
  placeholder = "Search...",
  className = ""
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue || '');

  const isFirstRender = useRef(true);
  // Track the last initialValue we synced from to detect external changes
  const lastInitialValueRef = useRef(initialValue);

  // Set up debouncing for search input - notify parent after delay
  useEffect(() => {
    // Skip the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onSearchChange(query);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [query, onSearchChange]);

  // Sync internal state only when initialValue changes externally
  // This handles cases like browser back/forward or URL changes from other components
  useEffect(() => {
    // Only sync if the initialValue actually changed (not just on every render)
    if (initialValue !== lastInitialValueRef.current) {
      lastInitialValueRef.current = initialValue;
      setQuery(initialValue || '');
    }
  }, [initialValue]);

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Handle search form submission - trigger immediate search
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(query);
  };

  // Clear search input
  const handleClear = () => {
    setQuery('');
    onSearchChange('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative group w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400 group-focus-within:text-primary-color transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search listings..."
          className="block w-full pl-10 pr-24 py-2.5 border border-gray-200 rounded-full leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-color/20 focus:border-primary-color transition-all duration-300 shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-24 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <button
          type="submit"
          className="absolute inset-y-1 right-1 bg-primary-color text-white px-5 rounded-full text-sm font-medium hover:bg-primary-light transition-colors shadow-sm"
        >
          Search
        </button>
      </div>
    </form>
  );
} 