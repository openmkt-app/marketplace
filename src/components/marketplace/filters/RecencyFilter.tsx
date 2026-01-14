'use client';

import React, { useState, useEffect, useRef } from 'react';

interface RecencyFilterProps {
  postedWithin?: string;
  recentlyViewed?: boolean;
  onChange: (postedWithin?: string, recentlyViewed?: boolean) => void;
}

// Time frame options updated to match market requirements
const timeFrames = [
  { id: 'day', label: 'Last 24 hours' },
  { id: 'week', label: 'Last week' },
  { id: 'month', label: 'Last month' },
  { id: 'quarter', label: 'Last 3 months' },
  { id: 'older', label: 'Older listings' }
];

export default function RecencyFilter({
  postedWithin,
  recentlyViewed = false,
  onChange
}: RecencyFilterProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string | undefined>(postedWithin);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState<boolean>(recentlyViewed);
  const isFirstRender = useRef(true);

  // Handle time frame selection
  const handleTimeFrameChange = (timeFrame: string) => {
    // Toggle selection if the same time frame is clicked again
    if (selectedTimeFrame === timeFrame) {
      setSelectedTimeFrame(undefined);
    } else {
      setSelectedTimeFrame(timeFrame);
    }
  };

  // Handle recently viewed toggle
  const handleRecentlyViewedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowRecentlyViewed(e.target.checked);
  };

  // Update parent component when selections change
  useEffect(() => {
    // Skip on first render to avoid triggering filter on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    onChange(selectedTimeFrame, showRecentlyViewed);
  }, [selectedTimeFrame, showRecentlyViewed, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-text-primary mb-2">Posted Within</h3>
        <div className="space-y-1">
          {timeFrames.map(timeFrame => (
            <button
              key={timeFrame.id}
              onClick={() => handleTimeFrameChange(timeFrame.id)}
              className={`w-full py-2 px-3 text-left text-sm rounded ${
                selectedTimeFrame === timeFrame.id
                  ? 'bg-primary-color text-white'
                  : 'bg-neutral-light text-text-primary hover:bg-neutral-medium'
              }`}
            >
              {timeFrame.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showRecentlyViewed}
            onChange={handleRecentlyViewedChange}
            className="h-4 w-4 text-primary-color rounded"
          />
          <span className="ml-2 text-text-primary">Show recently viewed first</span>
        </label>
      </div>
    </div>
  );
} 