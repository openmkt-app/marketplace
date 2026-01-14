'use client';

import React, { useState, useEffect } from 'react';

interface ViewOptionsProps {
  viewMode?: 'grid' | 'list' | 'map';
  resultsPerPage?: number;
  onChange: (viewMode?: 'grid' | 'list' | 'map', resultsPerPage?: number) => void;
}

export default function ViewOptions({
  viewMode = 'grid',
  resultsPerPage = 12,
  onChange
}: ViewOptionsProps) {
  const [mode, setMode] = useState<'grid' | 'list' | 'map'>(viewMode);
  const [perPage, setPerPage] = useState<number>(resultsPerPage);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Handle view mode change
  const handleModeChange = (newMode: 'grid' | 'list' | 'map') => {
    setMode(newMode);
    onChange(newMode, perPage);
  };

  // Handle results per page change
  const handlePerPageChange = (count: number) => {
    setPerPage(count);
    onChange(mode, count);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex items-center space-x-2">
      {/* View mode toggle buttons */}
      <div className="flex border rounded-md overflow-hidden">
        <button
          onClick={() => handleModeChange('grid')}
          className={`p-2 ${mode === 'grid'
            ? 'bg-primary-color text-white'
            : 'bg-white text-text-primary hover:bg-neutral-light'
            }`}
          title="Grid view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => handleModeChange('list')}
          className={`p-2 ${mode === 'list'
            ? 'bg-primary-color text-white'
            : 'bg-white text-text-primary hover:bg-neutral-light'
            }`}
          title="List view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        {/* Map view button hidden for future implementation */}
        {/* <button
          onClick={() => handleModeChange('map')}
          className={`p-2 ${mode === 'map'
              ? 'bg-primary-color text-white'
              : 'bg-white text-text-primary hover:bg-neutral-light'
            }`}
          title="Map view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button> */}
      </div>

      {/* Results per page dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center py-2 px-3 text-sm border rounded-md hover:bg-neutral-light"
        >
          <span>{perPage} per page</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ml-1 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white shadow-lg rounded-md z-10">
            <div className="py-1">
              {[12, 24, 48, 96].map((count) => (
                <button
                  key={count}
                  onClick={() => handlePerPageChange(count)}
                  className={`block w-full text-left px-4 py-2 text-sm ${perPage === count
                    ? 'bg-primary-light/20 text-primary-color'
                    : 'hover:bg-neutral-light'
                    }`}
                >
                  {count} per page
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 