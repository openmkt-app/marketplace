'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface LocationFilterValue {
  latitude?: number;
  longitude?: number;
  radius?: number; // in miles
  locationName?: string;
}

interface LocationFilterProps {
  initialValue?: LocationFilterValue;
  onFilterChange: (filter: LocationFilterValue) => void;
}

export default function LocationFilter({
  initialValue,
  onFilterChange
}: LocationFilterProps) {
  const [filter, setFilter] = useState<LocationFilterValue>(initialValue || { radius: undefined });
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoSuccess, setGeoSuccess] = useState<boolean | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const hasRestored = useRef(false);

  // Radius options in miles
  const radiusOptions = [5, 10, 25, 50, 100, 250];

  // Track initial latitude to avoid re-running mount effect
  const initialLatitudeRef = useRef(initialValue?.latitude);

  // Load saved location on mount ONLY
  useEffect(() => {
    if (hasRestored.current) return;

    const savedLocationJson = localStorage.getItem('last-used-location');
    // Only restore if we don't have an initial value passed
    if (savedLocationJson && !initialLatitudeRef.current) {
      try {
        const savedLocation = JSON.parse(savedLocationJson);
        if (savedLocation.latitude && savedLocation.longitude) {
          setFilter({
            latitude: savedLocation.latitude,
            longitude: savedLocation.longitude,
            radius: savedLocation.radius, // Can be undefined now
            locationName: savedLocation.locationName
          });
          // Mark as restored so we don't override explicit resets later
          hasRestored.current = true;
        }
      } catch (e) {
        console.error('Error parsing saved location:', e);
      }
    } else {
      // If we didn't restore (e.g. had initial value or no saved data), still mark as 'checked'
      hasRestored.current = true;
    }
  }, []); // Run only on mount

  // Sync with parent changes (e.g. Reset toggle)
  useEffect(() => {
    // If initialValue changes (and we've already handled mount restoration), sync local state
    if (!hasRestored.current) return;

    // Simple comparison to avoid loops - if initialValue is undefined/empty, reset local
    if (!initialValue?.latitude && filter.latitude) {
      setFilter({ radius: undefined });
    }
    // If parent passes a specific value (e.g. from URL or saved filter load), update local
    else if (initialValue?.latitude && (initialValue.latitude !== filter.latitude || initialValue.longitude !== filter.longitude)) {
      setFilter(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue?.latitude, initialValue?.longitude]);

  // Get user's current location using browser geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    setIsGeolocating(true);
    setGeoSuccess(null);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          // Fetch location name from coordinates using a reverse geocoding service
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );

          if (!response.ok) {
            throw new Error("Failed to get location details");
          }

          const data = await response.json();

          // Extract location name from OpenStreetMap response
          const city = data.address.city || data.address.town || data.address.village || '';
          const state = data.address.state || data.address.region || '';
          const locationName = city && state ? `${city}, ${state}` : 'Current Location';

          // Update filter with detected location
          const newFilter = {
            latitude,
            longitude,
            radius: filter.radius, // Keep existing radius or undefined
            locationName
          };

          setFilter(newFilter);
          setGeoSuccess(true);

          // Save the location for future use
          localStorage.setItem('last-used-location', JSON.stringify(newFilter));

        } catch (err) {
          console.error("Error getting location details:", err);
          setGeoError("Could not determine your location. Please try again.");
          setGeoSuccess(false);
        } finally {
          setIsGeolocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsGeolocating(false);
        setGeoSuccess(false);

        // Provide user-friendly error messages
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location access was denied. Please allow location access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information is unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out. Please try again.");
            break;
          default:
            setGeoError("An unknown error occurred while getting your location.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle radius change
  const handleRadiusChange = (newRadius: number) => {
    // Toggle logic: if clicking the active radius, deselect it (set to undefined)
    const updatedRadius = filter.radius === newRadius ? undefined : newRadius;

    const newFilter = {
      ...filter,
      radius: updatedRadius
    };
    setFilter(newFilter);

    // Update saved location if exists
    if (filter.latitude && filter.longitude) {
      localStorage.setItem('last-used-location', JSON.stringify(newFilter));
    }
  };

  // Notify parent component of filter changes
  useEffect(() => {
    // Skip on first render to avoid triggering filter on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    onFilterChange(filter);
  }, [filter, onFilterChange]);

  return (
    <div className="space-y-4">
      {/* Geolocation Button or Active Status */}
      <div>
        {filter.latitude && filter.longitude && !isGeolocating ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-green-600 block">Current Location</span>
                <span className="font-medium block">{filter.locationName || 'Detected Location'}</span>
              </div>
            </div>
            <button
              onClick={getCurrentLocation}
              className="text-xs font-medium text-green-600 hover:text-green-800 underline px-2 py-1"
            >
              Update
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGeolocating}
            className="w-full flex items-center justify-center px-4 py-3 bg-primary-color hover:bg-primary-light text-white rounded-lg transition-colors disabled:bg-primary-light/70"
          >
            {isGeolocating ? (
              <>
                <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                Detecting location...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use my current location
              </>
            )}
          </button>
        )}

        {geoError && (
          <p className="text-sm text-red-600 mt-2 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {geoError}
          </p>
        )}
      </div>

      {/* Radius Selector */}
      {filter.latitude && filter.longitude && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Search Radius
          </label>
          <div className="grid grid-cols-3 gap-2">
            {radiusOptions.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => handleRadiusChange(radius)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter.radius === radius
                  ? 'bg-primary-color text-white'
                  : 'bg-neutral-light text-text-secondary hover:bg-neutral-medium'
                  }`}
              >
                {radius} mi
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
