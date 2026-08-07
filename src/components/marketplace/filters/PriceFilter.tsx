'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface PriceFilterProps {
  initialValue?: {
    min?: number;
    max?: number;
    bracket?: string;
    deals?: boolean;
  };
  onChange: (price: {
    min?: number;
    max?: number;
    bracket?: string;
    deals?: boolean;
  }) => void;
}

export default function PriceFilter({ initialValue, onChange }: PriceFilterProps) {
  const t = useTranslations('filters.priceFilter');
  const tGen = useTranslations('filters');
  const [min, setMin] = useState<string>(initialValue?.min?.toString() || '');
  const [max, setMax] = useState<string>(initialValue?.max?.toString() || '');
  const [bracket, setBracket] = useState<string>(initialValue?.bracket || '');
  const [deals, setDeals] = useState<boolean>(initialValue?.deals || false);
  const isFirstRender = useRef(true);

  // Track the last prop values to detect external changes
  const lastPropValues = useRef({
    min: initialValue?.min,
    max: initialValue?.max,
    bracket: initialValue?.bracket,
    deals: initialValue?.deals
  });

  // Sync local state when initialValue changes externally (e.g., from SmartFilterSummary clear)
  // Only run when initialValue prop reference changes
  useEffect(() => {
    const prevMin = lastPropValues.current.min;
    const prevMax = lastPropValues.current.max;
    const prevBracket = lastPropValues.current.bracket;
    const prevDeals = lastPropValues.current.deals;

    const newMin = initialValue?.min;
    const newMax = initialValue?.max;
    const newBracket = initialValue?.bracket;
    const newDeals = initialValue?.deals;

    // Update ref to current prop values
    lastPropValues.current = { min: newMin, max: newMax, bracket: newBracket, deals: newDeals };

    // Only sync if the prop actually changed (comparing with previous prop, not current state)
    if (prevMin !== newMin || prevMax !== newMax || prevBracket !== newBracket || prevDeals !== newDeals) {
      setMin(newMin?.toString() || '');
      setMax(newMax?.toString() || '');
      setBracket(newBracket || '');
      setDeals(newDeals || false);
    }
  }, [initialValue]);

  useEffect(() => {
    // Skip on first render to avoid triggering filter on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Convert string inputs to numbers for the filter
    const minVal = min ? parseInt(min, 10) : undefined;
    const maxVal = max ? parseInt(max, 10) : undefined;

    const filterValue = {
      min: minVal,
      max: maxVal,
      bracket: bracket || undefined,
      deals
    };

    onChange(filterValue);
  }, [min, max, bracket, deals, onChange]);

  // Handle bracket change
  const handleBracketChange = (newBracket: string) => {
    setBracket(newBracket);
    
    // Clear min/max when selecting a bracket
    if (newBracket) {
      setMin('');
      setMax('');
    }
  };

  // Price brackets options
  const brackets = [
    { label: t('any'), value: '' },
    // Free used to be a category. It is a price, so this is where it belongs —
    // and it is the one bracket people actually go looking for.
    { label: tGen('price_free'), value: 'free' },
    { label: tGen('price_under_50'), value: 'under_50' },
    { label: tGen('price_50_100'), value: '50_100' },
    { label: tGen('price_100_250'), value: '100_250' },
    { label: tGen('price_250_500'), value: '250_500' },
    { label: tGen('price_over_500'), value: 'over_500' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-text-primary">{t('priceRange')}</h3>
      
      {/* Price bracket selector */}
      <div className="grid grid-cols-3 gap-2">
        {brackets.map((option) => (
          <button
            key={option.value}
            onClick={() => handleBracketChange(option.value)}
            className={`py-2 px-3 text-sm rounded-md ${
              bracket === option.value
                ? 'bg-primary-color text-white'
                : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      {/* Min-Max price inputs */}
      <div className="flex space-x-2 items-center">
        <input
          type="number"
          value={min}
          onChange={(e) => {
            setMin(e.target.value);
            // Clear bracket when using min/max
            if (bracket) setBracket('');
          }}
          placeholder={t('minPlaceholder')}
          className="flex-1 p-2 border rounded-md"
          min="0"
        />
        <span className="text-text-secondary">{t('to')}</span>
        <input
          type="number"
          value={max}
          onChange={(e) => {
            setMax(e.target.value);
            // Clear bracket when using min/max
            if (bracket) setBracket('');
          }}
          placeholder={t('maxPlaceholder')}
          className="flex-1 p-2 border rounded-md"
          min="0"
        />
      </div>
      
      {/* Deals checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="deals"
          checked={deals}
          onChange={(e) => setDeals(e.target.checked)}
          className="h-4 w-4 text-primary-color rounded"
        />
        <label htmlFor="deals" className="ml-2 text-text-primary">
          {t('showDeals')}
        </label>
      </div>
    </div>
  );
} 