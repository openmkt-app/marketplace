'use client';

import React, { useState, useEffect } from 'react';

interface ConditionFilterProps {
  selectedConditions?: string[];
  selectedAge?: string;
  onChange: (conditions?: string[], age?: string) => void;
}

// Available conditions
const conditionOptions = [
  { id: 'new', label: 'New' },
  { id: 'like-new', label: 'Like New' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'poor', label: 'Poor/For Parts' }
];

// Available age options
const ageOptions = [
  { id: 'any', label: 'Any age' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-6-months', label: 'Last 6 months' },
  { id: 'last-year', label: 'Last year' },
  { id: 'over-1-year', label: 'Over 1 year' }
];

export default function ConditionFilter({ 
  selectedConditions = [], 
  selectedAge,
  onChange 
}: ConditionFilterProps) {
  const [conditions, setConditions] = useState<string[]>(selectedConditions);
  const [age, setAge] = useState<string | undefined>(selectedAge);

  // Toggle a condition selection
  const toggleCondition = (conditionId: string) => {
    setConditions(prev => {
      if (prev.includes(conditionId)) {
        return prev.filter(id => id !== conditionId);
      } else {
        return [...prev, conditionId];
      }
    });
  };

  // Set age selection
  const handleAgeChange = (ageId: string) => {
    if (age === ageId) {
      setAge(undefined);
    } else {
      setAge(ageId);
    }
  };

  // Update parent component when selections change
  useEffect(() => {
    onChange(conditions.length > 0 ? conditions : undefined, age);
  }, [conditions, age, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-text-primary mb-2">Condition</h3>
        <div className="space-y-2">
          {conditionOptions.map((cond) => (
            <label key={cond.id} className="flex items-center">
              <input
                type="checkbox"
                checked={conditions.includes(cond.id)}
                onChange={() => toggleCondition(cond.id)}
                className="h-4 w-4 text-primary-color rounded"
              />
              <span className="ml-2 text-text-primary">{cond.label}</span>
            </label>
          ))}
        </div>
      </div>

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
    </div>
  );
} 