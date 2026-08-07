'use client';

import { useListingForm } from './context';
import type { ListingFormState, SavedLocation } from './state';

type LocationInput = {
  state: string;
  county: string;
  locality: string;
  zipPrefix?: string;
  isOnlineStore?: boolean;
};

/**
 * Remember where the seller listed from, for next time.
 *
 * Called from two places: the location panel's save button, and the submit
 * handler after a successful write. The handler lives in CreateListingForm,
 * which sits outside its own provider and so cannot call a hook — hence a
 * plain function that takes the state it needs, plus the hook below for
 * anything rendered underneath.
 */
export function saveLocation(
  form: Pick<
    ListingFormState,
    'savedLocations' | 'setSavedLocations' | 'setSelectedLocation' | 'setLocationSaved'
  >,
  locationData: LocationInput,
) {
  const { savedLocations, setSavedLocations, setLocationSaved } = form;

  const locationToSave: SavedLocation = {
    name: locationData.isOnlineStore
      ? 'Online Store, Online'
      : `${locationData.locality}, ${locationData.state}`,
    state: locationData.state,
    county: locationData.county,
    locality: locationData.locality,
    zipPrefix: locationData.zipPrefix,
    isOnlineStore: locationData.isOnlineStore,
  };

  localStorage.setItem('last-used-location', JSON.stringify(locationToSave));

  // Only added once. The list is a shortcut menu, and the same town appearing
  // six times is not a shortcut.
  const locationExists = savedLocations.some(loc => loc.name === locationToSave.name);
  if (!locationExists) {
    setSavedLocations([...savedLocations, locationToSave]);
  }

  setLocationSaved(true);
  setTimeout(() => setLocationSaved(false), 3000);
}

export function useSaveLocation() {
  const form = useListingForm();
  return (locationData: LocationInput) => saveLocation(form, locationData);
}
