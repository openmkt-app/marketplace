'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';
import type { SavedLocation } from '../state';
import { formatZipPrefix } from '@/lib/location-utils';
import { useSaveLocation } from '../useSaveLocation';

/**
 * Where the thing is — or that it is nowhere, for an online store.
 *
 * An accordion because most sellers list from the same place every time, so
 * the saved location is filled in and the panel stays shut. Marking it online
 * hides the fields entirely rather than asking for a town that will never be
 * shown.
 */
export default function LocationSection() {
  const tCreate = useTranslations('createListing');
  const {
    isLocationExpanded, setIsLocationExpanded,
    isOnlineStore, setIsOnlineStore,
    locationState, setLocationState,
    locationCounty, setLocationCounty,
    locationLocality, setLocationLocality,
    locationZip, setLocationZip,
    savedLocations, setSavedLocations,
    selectedLocation, setSelectedLocation,
    isGeolocating, setIsGeolocating,
    geoSuccess, setGeoSuccess,
    locationSaved, setLocationSaved,
    setError,
    isService,
  } = useListingForm();
  const saveCurrentLocation = useSaveLocation();

  const handleSelectLocation = (location: SavedLocation) => {
    setSelectedLocation(location);

    // Update Online Store state
    const isOnline = location.isOnlineStore === true ||
      (location.locality === 'Online Store' && location.state === 'Online');

    setIsOnlineStore(isOnline);

    // Update form fields directly
    const form = document.getElementById('listing-form') as HTMLFormElement;
    if (form) {
      const stateInput = form.elements.namedItem('state') as HTMLInputElement;
      const countyInput = form.elements.namedItem('county') as HTMLInputElement;
      const localityInput = form.elements.namedItem('locality') as HTMLInputElement;
      const zipPrefixInput = form.elements.namedItem('zipPrefix') as HTMLInputElement;

      if (stateInput) stateInput.value = location.state || '';
      if (countyInput) countyInput.value = location.county || '';
      if (localityInput) localityInput.value = location.locality || '';
      if (zipPrefixInput) zipPrefixInput.value = location.zipPrefix || '';

      // Update state for preview
      setLocationState(location.state || '');
      setLocationCounty(location.county || '');
      setLocationLocality(location.locality || '');
      setLocationZip(location.zipPrefix || '');
    }

    // Save this location as the most recently used location
    localStorage.setItem('last-used-location', JSON.stringify(location));

    // Close the accordion after selecting a location
    setIsLocationExpanded(false);
  };

  // Add accordion toggle function
  const toggleLocationAccordion = () => {
    setIsLocationExpanded(!isLocationExpanded);
  };

  // Get user's current location using browser geolocation API
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError(tCreate('errors.geoNotSupported'));
      return;
    }

    // Check permissions first to give a better error message if already denied
    try {
      if (navigator.permissions && navigator.permissions.query) {
        // Cast to any to avoid TypeScript issues if PermissionName doesn't include 'geolocation' in some envs
        const result = await navigator.permissions.query({ name: 'geolocation' as any });
        if (result.state === 'denied') {
          setError(tCreate('errors.geoBlocked'));
          return;
        }
      }
    } catch (e) {
      // Ignore errors if permission API is not supported or behaves unexpectedly
      console.error("Error checking permissions:", e);
    }

    setIsGeolocating(true);
    setGeoSuccess(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Fetch location details from coordinates using a reverse geocoding service
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10`
          );

          if (!response.ok) {
            throw new Error("Failed to get location details");
          }

          const data = await response.json();

          // Extract location data from OpenStreetMap response
          // Format may vary, so we need to handle different response structures
          const state = data.address.state || data.address.region || '';
          const county = data.address.county || '';
          const locality = data.address.city || data.address.town || data.address.village || data.address.hamlet || '';
          const postalCode = data.address.postcode || '';
          const zipPrefix = postalCode.substring(0, 3);

          // Create location data object
          const locationData = {
            state,
            county,
            locality,
            zipPrefix
          };

          // Update form fields
          const form = document.getElementById('listing-form') as HTMLFormElement;
          if (form) {
            const stateInput = form.elements.namedItem('state') as HTMLInputElement;
            const countyInput = form.elements.namedItem('county') as HTMLInputElement;
            const localityInput = form.elements.namedItem('locality') as HTMLInputElement;
            const zipPrefixInput = form.elements.namedItem('zipPrefix') as HTMLInputElement;

            if (stateInput) stateInput.value = state;
            if (countyInput) countyInput.value = county;
            if (localityInput) localityInput.value = locality;
            if (zipPrefixInput) zipPrefixInput.value = zipPrefix;

            // Update state for preview
            setLocationState(state);
            setLocationCounty(county);
            setLocationLocality(locality);
            setLocationZip(zipPrefix);
          }

          // Save the location to localStorage for future use
          saveCurrentLocation(locationData);

          setGeoSuccess(true);

          // Save this as the currently selected location
          const newLocation = {
            name: `${locality}, ${state}`,
            ...locationData
          };

          setSelectedLocation(newLocation);

          // Close the accordion after location is detected
          setIsLocationExpanded(false);

        } catch (err) {
          console.error("Error getting location details:", err);
          setError(tCreate('errors.geoDetails'));
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
            setError(tCreate('errors.geoDenied'));
            break;
          case error.POSITION_UNAVAILABLE:
            setError(tCreate('errors.geoUnavailable'));
            break;
          case error.TIMEOUT:
            setError(tCreate('errors.geoTimeout'));
            break;
          default:
            setError(tCreate('errors.geoUnknown'));
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  // Format price to always have two decimal places

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-light overflow-hidden">
      <div
        onClick={toggleLocationAccordion}
        className="p-6 cursor-pointer flex justify-between items-center hover:bg-neutral-light/10 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-text-primary">
              {isService ? tCreate('locationHeaderCommission') : tCreate('locationHeader')}
            </h2>
            {locationSaved && (
              <span className="ml-3 animate-pulse text-sm text-green-600 bg-green-50 rounded-full px-3 py-0.5">
                {tCreate('locationSaved')}
              </span>
            )}
          </div>
          {isOnlineStore ? (
            <p className="text-sm text-text-secondary mt-1">
              <span className="font-medium text-blue-600">
                {isService ? 'Global / Remote Work' : tCreate('onlineStoreToggle')}
              </span>
            </p>
          ) : selectedLocation && (
            <p className="text-sm text-text-secondary mt-1">
              <span className="font-medium">{selectedLocation.name}</span>
              {selectedLocation.zipPrefix && (
                <span> ({tCreate('zipAreaInfo', { area: formatZipPrefix(selectedLocation.zipPrefix) })})</span>
              )}
            </p>
          )}
        </div>
        <div className="text-text-secondary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 transition-transform ${isLocationExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isLocationExpanded && (
        <div className="p-6 border-t border-neutral-light">
          {/* Online Store Toggle */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="onlineStore"
                checked={isOnlineStore}
                onChange={(e) => setIsOnlineStore(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-color border-gray-300 rounded focus:ring-primary-light"
              />
              <div className="flex-1">
                <label htmlFor="onlineStore" className="font-medium text-blue-900 cursor-pointer">
                  {tCreate('onlineStoreToggle')}
                </label>
                <p className="text-sm text-blue-700 mt-1">
                  {tCreate('onlineStoreDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Local location fields - only shown if not online store */}
          {!isOnlineStore && (
            <>
              {/* Geolocation Button - add more padding at the top */}
              <div className="mb-4 mt-3">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGeolocating}
                    className="flex items-center px-4 py-2 bg-primary-color hover:bg-primary-light text-white rounded-md transition-colors"
                  >
                    {isGeolocating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {tCreate('detectingLocation')}
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {tCreate('detectLocation')}
                      </>
                    )}
                  </button>

                  {geoSuccess === true && (
                    <p className="text-sm text-green-600 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {tCreate('locationDetected')}
                    </p>
                  )}
                </div>

              {/* Saved Locations */}
              {savedLocations.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {tCreate('savedLocationsHeader')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {savedLocations.map((location, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectLocation(location)}
                        className={`px-3 py-1 rounded-full text-sm ${selectedLocation?.name === location.name
                          ? 'bg-primary-color text-white'
                          : 'bg-neutral-light hover:bg-neutral-light text-text-secondary'
                          }`}
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-text-secondary mb-1">
                    {tCreate('labelState')}
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    required
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value)}
                    placeholder="e.g. California"
                    className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div>
                  <label htmlFor="county" className="block text-sm font-medium text-text-secondary mb-1">
                    {tCreate('labelCounty')}
                  </label>
                  <input
                    type="text"
                    id="county"
                    name="county"
                    value={locationCounty}
                    onChange={(e) => setLocationCounty(e.target.value)}
                    placeholder="e.g. Los Angeles County"
                    className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div>
                  <label htmlFor="locality" className="block text-sm font-medium text-text-secondary mb-1">
                    {tCreate('labelLocality')}
                  </label>
                  <input
                    type="text"
                    id="locality"
                    name="locality"
                    required
                    value={locationLocality}
                    onChange={(e) => setLocationLocality(e.target.value)}
                    placeholder="e.g. Los Angeles"
                    className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div>
                  <label htmlFor="zipPrefix" className="block text-sm font-medium text-text-secondary mb-1">
                    {tCreate('labelZip')}
                  </label>
                  <input
                    type="text"
                    id="zipPrefix"
                    name="zipPrefix"
                    maxLength={3}
                    pattern="[0-9]{3}"
                    value={locationZip}
                    onChange={(e) => setLocationZip(e.target.value)}
                    placeholder="e.g. 900"
                    className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                  {selectedLocation?.zipPrefix && (
                    <p className="text-xs text-text-secondary mt-1">
                    {tCreate('zipAreaInfo', { area: formatZipPrefix(selectedLocation.zipPrefix) })}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-text-secondary mt-3">
                {tCreate('locationHelp')}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
