'use client';

import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  initialValue?: string;
  onSearchChange: (query?: string) => void;
}

export default function SearchBar({ initialValue = '', onSearchChange }: SearchBarProps) {
  const [query, setQuery] = useState<string>(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialValue);

  // Set up debouncing for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Notify parent component when search changes
  useEffect(() => {
    onSearchChange(debouncedQuery || undefined);
  }, [debouncedQuery, onSearchChange]);

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Handle search form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query);
  };

  // Clear search input
  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-neutral-medium" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search listings..."
          className="w-full pl-10 pr-12 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-10 flex items-center pr-3"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-neutral-medium hover:text-text-secondary" 
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
          className="absolute inset-y-0 right-0 flex items-center px-3 bg-primary-color rounded-r-lg hover:bg-primary-light text-white"
        >
          Search
        </button>
      </div>
    </form>
  );
} 