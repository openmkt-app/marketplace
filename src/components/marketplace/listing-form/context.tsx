'use client';

import { createContext, useContext } from 'react';
import type { ListingFormState } from './state';

/**
 * The form's state, shared with its sections.
 *
 * A context rather than props because the sections are about to be rearranged
 * into tabs, and a parent that hands fifteen props to each of ten sections is
 * the same wall of text we are trying to get rid of — just moved.
 *
 * Re-render cost is not a regression: the whole form was one component, so
 * every keystroke already re-rendered all of it.
 */
const ListingFormContext = createContext<ListingFormState | null>(null);

export const ListingFormProvider = ListingFormContext.Provider;

export function useListingForm(): ListingFormState {
  const state = useContext(ListingFormContext);
  if (!state) {
    throw new Error('useListingForm must be used inside a ListingFormProvider');
  }
  return state;
}
