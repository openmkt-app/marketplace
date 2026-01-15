'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavbarFilterProps {
  selectedCategory?: string;
  onSelectCategory: (category: string | undefined) => void;
  itemCount: number;
  onToggleFilters: () => void;
  showFilters: boolean;
  sortBy: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency';
  onSortChange: (sort: 'price_asc' | 'price_desc' | 'distance' | 'relevance' | 'recency') => void;
  viewMode: 'grid' | 'list' | 'map';
  resultsPerPage: number;
  onViewOptionsChange: (mode: 'grid' | 'list' | 'map', perPage: number) => void;
  hasActiveFilters: boolean;
}

interface NavbarFilterContextType {
  filterProps: NavbarFilterProps | null;
  setFilterProps: (props: NavbarFilterProps | null) => void;
}

const NavbarFilterContext = createContext<NavbarFilterContextType | undefined>(undefined);

export function NavbarFilterProvider({ children }: { children: ReactNode }) {
  const [filterProps, setFilterProps] = useState<NavbarFilterProps | null>(null);

  return (
    <NavbarFilterContext.Provider value={{ filterProps, setFilterProps }}>
      {children}
    </NavbarFilterContext.Provider>
  );
}

export function useNavbarFilter() {
  const context = useContext(NavbarFilterContext);
  if (context === undefined) {
    throw new Error('useNavbarFilter must be used within a NavbarFilterProvider');
  }
  return context;
}

export type { NavbarFilterProps };
