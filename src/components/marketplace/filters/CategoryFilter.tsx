'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '@/lib/category-data';

interface CategoryFilterProps {
  selectedCategory?: string;
  selectedSubcategory?: string;
  onChange: (category?: string, subcategory?: string) => void;
}

export default function CategoryFilter({
  selectedCategory,
  selectedSubcategory,
  onChange
}: CategoryFilterProps) {
  const [category, setCategory] = useState<string | undefined>(selectedCategory);
  const [subcategory, setSubcategory] = useState<string | undefined>(selectedSubcategory);
  const isFirstRender = useRef(true);

  // Get selected category object
  const selectedCategoryObj = CATEGORIES.find(c => c.id === category);

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    if (category === categoryId) {
      // Clicking the same category again deselects it
      setCategory(undefined);
      setSubcategory(undefined);
    } else {
      setCategory(categoryId);
      setSubcategory(undefined);
    }
  };

  // Handle subcategory selection
  const handleSubcategoryChange = (subId: string) => {
    if (subcategory === subId) {
      // Clicking the same subcategory again deselects it
      setSubcategory(undefined);
    } else {
      setSubcategory(subId);
    }
  };

  // Update parent component when selections change
  useEffect(() => {
    // Skip on first render to avoid triggering filter on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    onChange(category, subcategory);
  }, [category, subcategory, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-text-primary mb-2">Categories</h3>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`py-2 px-3 text-left text-sm rounded ${
                category === cat.id
                  ? 'bg-primary-color text-white'
                  : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Show subcategories if a category is selected */}
      {selectedCategoryObj && (
        <div>
          <h3 className="font-medium text-text-primary mb-2">Subcategories</h3>
          <div className="grid grid-cols-2 gap-2">
            {selectedCategoryObj.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubcategoryChange(sub.id)}
                className={`py-2 px-3 text-left text-sm rounded ${
                  subcategory === sub.id
                    ? 'bg-primary-color text-white'
                    : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 