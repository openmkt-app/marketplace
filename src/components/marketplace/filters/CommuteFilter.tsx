'use client';

import React, { useState, useEffect } from 'react';

export interface CommuteRoute {
  startLocation: string;
  endLocation: string;
  maxTime: number; // in minutes
}

interface CommuteFilterProps {
  initialRoute?: CommuteRoute;
  onFilterChange: (route: CommuteRoute | null) => void;
}

export default function CommuteFilter({ 
  initialRoute, 
  onFilterChange 
}: CommuteFilterProps) {
  const [startLocation, setStartLocation] = useState<string>(initialRoute?.startLocation || '');
  const [endLocation, setEndLocation] = useState<string>(initialRoute?.endLocation || '');
  const [maxTime, setMaxTime] = useState<number>(initialRoute?.maxTime || 30);
  
  // Update the filter when values change
  useEffect(() => {
    if (startLocation && endLocation) {
      onFilterChange({
        startLocation,
        endLocation,
        maxTime
      });
    } else {
      onFilterChange(null);
    }
  }, [startLocation, endLocation, maxTime, onFilterChange]);
  
  // Handle clear filter
  const handleClear = () => {
    setStartLocation('');
    setEndLocation('');
    setMaxTime(30);
    onFilterChange(null);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="startLocation" className="block text-sm font-medium text-text-primary mb-1">
          Start Location
        </label>
        <input
          type="text"
          id="startLocation"
          value={startLocation}
          onChange={(e) => setStartLocation(e.target.value)}
          placeholder="Enter a starting point"
          className="w-full p-2 border rounded-md"
        />
      </div>
      
      <div>
        <label htmlFor="endLocation" className="block text-sm font-medium text-text-primary mb-1">
          End Location
        </label>
        <input
          type="text"
          id="endLocation"
          value={endLocation}
          onChange={(e) => setEndLocation(e.target.value)}
          placeholder="Enter a destination"
          className="w-full p-2 border rounded-md"
        />
      </div>
      
      <div>
        <label htmlFor="commuteTime" className="block text-sm font-medium text-text-primary mb-1">
          Maximum Commute Time: {maxTime} minutes
        </label>
        <input
          type="range"
          id="commuteTime"
          min="5"
          max="120"
          step="5"
          value={maxTime}
          onChange={(e) => setMaxTime(parseInt(e.target.value, 10))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>5 min</span>
          <span>30 min</span>
          <span>60 min</span>
          <span>120 min</span>
        </div>
      </div>
      
      {(startLocation || endLocation) && (
        <button
          onClick={handleClear}
          className="text-sm text-primary-color hover:text-primary-light"
        >
          Clear commute filter
        </button>
      )}
      
      <div className="mt-2 p-3 bg-primary-light/10 rounded-md">
        <p className="text-sm text-primary-color">
          Enter your commute details to find listings within your preferred commute time.
        </p>
      </div>
    </div>
  );
}