'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface CommuteRoute {
  name: string;
  startLocation: {
    name: string;
    lat?: number;
    lng?: number;
  };
  endLocation: {
    name: string;
    lat?: number;
    lng?: number;
  };
  maxDetourMiles: number;
}

interface CommuteFilterProps {
  onFilterChange: (route: CommuteRoute | null) => void;
}

export default function CommuteFilter({ onFilterChange }: CommuteFilterProps) {
  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true);
  
  // State for saved routes
  const [savedRoutes, setSavedRoutes] = useLocalStorage<CommuteRoute[]>('saved-commute-routes', []);
  const [selectedRoute, setSelectedRoute] = useState<CommuteRoute | null>(null);
  
  // State for creating new routes
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [newRoute, setNewRoute] = useState<Omit<CommuteRoute, 'maxDetourMiles'> & { maxDetourMiles: string }>({
    name: '',
    startLocation: { name: '' },
    endLocation: { name: '' },
    maxDetourMiles: '5'
  });

  // Effect to call onFilterChange when the selected route changes
  useEffect(() => {
    // Skip on first render to avoid an extra filter operation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Call the onChange handler
    onFilterChange(selectedRoute);
  }, [selectedRoute, onFilterChange]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('start')) {
      setNewRoute(prev => ({
        ...prev,
        startLocation: {
          ...prev.startLocation,
          name: name === 'startName' ? value : prev.startLocation.name
        }
      }));
    } else if (name.startsWith('end')) {
      setNewRoute(prev => ({
        ...prev,
        endLocation: {
          ...prev.endLocation,
          name: name === 'endName' ? value : prev.endLocation.name
        }
      }));
    } else {
      setNewRoute(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Save a new route
  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRoute.name || !newRoute.startLocation.name || !newRoute.endLocation.name) {
      return;
    }

    const routeToSave: CommuteRoute = {
      ...newRoute,
      maxDetourMiles: parseInt(newRoute.maxDetourMiles, 10) || 5
    };

    setSavedRoutes(prev => [...prev, routeToSave]);
    setNewRoute({
      name: '',
      startLocation: { name: '' },
      endLocation: { name: '' },
      maxDetourMiles: '5'
    });
    setShowRouteForm(false);
  };

  // Select a saved route
  const handleSelectRoute = (route: CommuteRoute) => {
    setSelectedRoute(route === selectedRoute ? null : route);
  };

  // Delete a saved route
  const handleDeleteRoute = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const routeToDelete = savedRoutes[index];
    
    // If the route being deleted is the selected one, clear selection
    if (selectedRoute && routeToDelete.name === selectedRoute.name) {
      setSelectedRoute(null);
    }
    
    setSavedRoutes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Commute-Friendly Filter</h2>
      
      {/* Saved Routes */}
      {savedRoutes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Your Commute Routes</h3>
          <div className="space-y-2">
            {savedRoutes.map((route, index) => (
              <div 
                key={index} 
                onClick={() => handleSelectRoute(route)}
                className={`p-3 rounded-md border cursor-pointer ${
                  selectedRoute?.name === route.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{route.name}</span>
                  <button
                    onClick={(e) => handleDeleteRoute(index, e)}
                    className="text-gray-500 hover:text-red-500"
                    aria-label={`Delete ${route.name}`}
                  >
                    ×
                  </button>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {route.startLocation.name} → {route.endLocation.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Max detour: {route.maxDetourMiles} miles
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Route Button & Form */}
      {!showRouteForm ? (
        <button
          type="button"
          onClick={() => setShowRouteForm(true)}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md w-full"
        >
          Add a Commute Route
        </button>
      ) : (
        <form onSubmit={handleSaveRoute} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Route Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newRoute.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. Home to Work"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startName" className="block text-sm font-medium mb-1">
                Start Location
              </label>
              <input
                type="text"
                id="startName"
                name="startName"
                value={newRoute.startLocation.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g. Home"
                required
              />
            </div>
            
            <div>
              <label htmlFor="endName" className="block text-sm font-medium mb-1">
                End Location
              </label>
              <input
                type="text"
                id="endName"
                name="endName"
                value={newRoute.endLocation.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g. Work"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="maxDetourMiles" className="block text-sm font-medium mb-1">
              Maximum Detour (miles)
            </label>
            <input
              type="number"
              id="maxDetourMiles"
              name="maxDetourMiles"
              value={newRoute.maxDetourMiles}
              onChange={handleInputChange}
              min="1"
              max="50"
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Save Route
            </button>
            <button
              type="button"
              onClick={() => setShowRouteForm(false)}
              className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      
      {/* Explanation Text */}
      <p className="text-sm text-gray-500 mt-4">
        This filter helps you find items along your common routes, so you can pick them up without going out of your way.
      </p>
    </div>
  );
}