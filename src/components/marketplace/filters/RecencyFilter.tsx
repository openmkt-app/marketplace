'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface RecencyFilterProps {
  postedWithin?: string;
  recentlyViewed?: boolean;
  onChange: (postedWithin?: string, recentlyViewed?: boolean) => void;
}

// Time frame options updated to match market requirements
const timeFrames = [
  { id: 'day' },
  { id: 'week' },
  { id: 'month' },
  { id: 'quarter' },
  { id: 'older' }
];

export default function RecencyFilter({
  postedWithin,
  recentlyViewed = false,
  onChange
}: RecencyFilterProps) {
  const t = useTranslations('filters.recencyFilter');
  const tGen = useTranslations('filters');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string | undefined>(postedWithin);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState<boolean>(recentlyViewed);
  const isFirstRender = useRef(true);

  // Track the last prop values to detect external changes
  const lastPropValues = useRef({
    postedWithin,
    recentlyViewed
  });

  // Sync local state when props change externally (e.g., from SmartFilterSummary clear)
  useEffect(() => {
    const prevPostedWithin = lastPropValues.current.postedWithin;
    const prevRecentlyViewed = lastPropValues.current.recentlyViewed;

    // Update ref to current prop values
    lastPropValues.current = { postedWithin, recentlyViewed };

    // Only sync if the prop actually changed (comparing with previous prop, not current state)
    if (prevPostedWithin !== postedWithin) {
      setSelectedTimeFrame(postedWithin);
    }
    if (prevRecentlyViewed !== recentlyViewed) {
      setShowRecentlyViewed(recentlyViewed);
    }
  }, [postedWithin, recentlyViewed]);

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
        <h3 className="font-medium text-text-primary mb-2">{t('postedWithin')}</h3>
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
              {tGen(`time_${timeFrame.id}`)}
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
          <span className="ml-2 text-text-primary">{t('recentlyViewed')}</span>
        </label>
      </div>
    </div>
  );
} 