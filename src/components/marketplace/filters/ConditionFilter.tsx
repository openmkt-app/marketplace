'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { CONDITIONS } from '@/lib/category-data';

interface ConditionFilterProps {
  selectedConditions?: string[];
  // Item age filtering - commented out for now, will revisit later
  // selectedAge?: string;
  onChange: (conditions?: string[], age?: string) => void;
}

// Map the previous condition IDs to the new ones for backwards compatibility
const mapOldToNewConditionId = (oldId: string): string => {
  const mapping: Record<string, string> = {
    'new': 'new',
    'open-box': 'openBox',
    'like-new': 'likeNew',
    'good': 'good',
    'fair': 'fair',
    'for-parts': 'forParts'
  };
  return mapping[oldId] || oldId;
};

export default function ConditionFilter({
  selectedConditions = [],
  // selectedAge, - commented out for now, will revisit later
  onChange
}: ConditionFilterProps) {
  const t = useTranslations('conditions');
  // Map any old-format IDs in the selectedConditions to the new format
  const mappedSelectedConditions = selectedConditions.map(mapOldToNewConditionId);
  const [conditions, setConditions] = useState<string[]>(mappedSelectedConditions);
  // const [age, setAge] = useState<string | undefined>(selectedAge); - commented out for now, will revisit later

  // Track if the change is from internal user action to avoid loops
  const isInternalChangeRef = useRef(false);

  // Toggle a condition selection
  const toggleCondition = (conditionId: string) => {
    isInternalChangeRef.current = true;
    setConditions(prev => {
      if (prev.includes(conditionId)) {
        return prev.filter(id => id !== conditionId);
      } else {
        return [...prev, conditionId];
      }
    });
  };

  // Update parent component when selections change (only for internal changes)
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      // Passing undefined for age parameter since it's commented out
      onChange(conditions.length > 0 ? conditions : undefined, undefined);
    }
  }, [conditions, onChange]);

  // Update local state if selectedConditions changes externally
  useEffect(() => {
    if (!isInternalChangeRef.current) {
      const mappedConditions = selectedConditions.map(mapOldToNewConditionId);
      // Only update if actually different to avoid unnecessary re-renders
      const sortedMapped = [...mappedConditions].sort().join(',');
      const sortedCurrent = [...conditions].sort().join(',');
      if (sortedMapped !== sortedCurrent) {
        setConditions(mappedConditions);
      }
    }
  }, [selectedConditions, conditions]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-text-primary mb-2">{t('conditionHeader')}</h3>
        <div className="space-y-2">
          {CONDITIONS.map((cond) => (
            <label key={cond.id} className="flex items-center">
              <input
                type="checkbox"
                checked={conditions.includes(cond.id)}
                onChange={() => toggleCondition(cond.id)}
                className="h-4 w-4 text-primary-color rounded"
              />
              <span className="ml-2 text-text-primary">{t(cond.id)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Item Age section - commented out for now, will revisit later
      <div>
        <h3 className="font-medium text-text-primary mb-2">Item Age</h3>
        <div className="space-y-1">
          {ageOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleAgeChange(option.id)}
              className={`w-full py-2 px-3 text-left text-sm rounded ${
                age === option.id
                  ? 'bg-primary-color text-white'
                  : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      */}
    </div>
  );
} 