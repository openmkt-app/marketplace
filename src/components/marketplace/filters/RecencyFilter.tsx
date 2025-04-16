'use client';

import React, { useState, useEffect } from 'react';

interface RecencyFilterProps {
  postedWithin?: string;
  recentlyViewed?: boolean;
  onChange: (postedWithin?: string, recentlyViewed?: boolean) => void;
}

// Time frame options
const timeFrames = [
  { id: 'day', label: 'Last 24 hours' },
  { id: 'week', label: 'Last week' },
  { id: 'month', label: 'Last month' },
  { id: 'quarter', label: 'Last 3 months' },
  { id: 'year', label: 'Last year' }
];

export default function RecencyFilter({ 
  postedWithin, 
  recentlyViewed = false,
  onChange 
}: RecencyFilterProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string | undefined>(postedWithin);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState<boolean>(recentlyViewed);

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
    onChange(selectedTimeFrame, showRecentlyViewed);
  }, [selectedTimeFrame, showRecentlyViewed, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Posted Within</h3>
        <div className="space-y-1">
          {timeFrames.map(timeFrame => (
            <button
              key={timeFrame.id}
              onClick={() => handleTimeFrameChange(timeFrame.id)}
              className={`w-full py-2 px-3 text-left text-sm rounded ${
                selectedTimeFrame === timeFrame.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="ml-2 text-gray-700">Show recently viewed first</span>
        </label>
      </div>
    </div>
  );
} 