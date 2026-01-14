'use client';

import React from 'react';
import { LocationFilterValue } from './LocationFilter';

interface LocationMapProps {
  location: LocationFilterValue;
}

export default function LocationMap({ location }: LocationMapProps) {
  // In a real implementation, this would be a map component using a library like Leaflet, Google Maps, or Mapbox
  // For this demo, we'll just create a simple visual representation

  const radius = location.radius || 25; // Use the radius from location filter
  const locationName = location.locationName || 'No location selected';

  return (
    <div className="bg-gray-100 border rounded-md overflow-hidden">
      <div className="bg-blue-50 p-4 relative h-48">
        {/* Circle representing the radius */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-500"
          style={{ 
            width: `${Math.min(100, radius * 5)}%`, 
            height: `${Math.min(100, radius * 5)}%`,
            opacity: 0.3,
            backgroundColor: '#3b82f6'
          }}
        ></div>
        
        {/* Center point marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-blue-600 rounded-full shadow-md"></div>
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-white p-1 rounded shadow-md whitespace-nowrap text-xs">
            {locationName || 'Selected Location'}
          </div>
        </div>
        
        {/* Radius visualization */}
        {[5, 20, 50].map((r) => (
          <div 
            key={r}
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-400 ${
              radius >= r ? 'opacity-30' : 'opacity-10'
            }`}
            style={{ 
              width: `${Math.min(100, r * 5)}%`, 
              height: `${Math.min(100, r * 5)}%`,
            }}
          >
            {radius >= r && (
              <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-1/2 bg-white text-xs px-1 rounded">
                {r} mi
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-white">
        <p className="text-sm font-medium">Search Radius: {radius} miles</p>
        <p className="text-xs text-gray-600">{locationName}</p>
      </div>
    </div>
  );
}