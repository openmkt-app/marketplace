# Project Tracker

## Features to Implement

### High Priority
- ...

### Medium Priority
- **Implement CommuteFilter functionality**: Enable users to filter listings based on commute routes with specified start/end locations and maximum commute time.
  - The CommuteFilter component has been created but is currently commented out in the FilterPanel
  - Need to implement proper geolocation services and commute time calculation
  - Test with real location data
  - References: `src/components/marketplace/filters/CommuteFilter.tsx`, `src/lib/location-utils.ts`

- **Implement Item Age filtering**: Allow users to filter listings based on how old the items are.
  - The Item Age section in the ConditionFilter component has been created but is currently commented out
  - Need to add age metadata to the listing schema
  - Implement proper date filtering logic
  - References: `src/components/marketplace/filters/ConditionFilter.tsx`, `src/app/browse/page.tsx`

### Low Priority
- ...

## Bugs to Fix

## Completed 