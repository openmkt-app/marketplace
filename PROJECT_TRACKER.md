# Project Tracker

## Features to Implement

### High Priority
### High Priority
- [ ] **Global Header Search Integration**: Move the search bar to the global header/navigation to match the new design.
- [ ] **Filter Bar Refinement**: Clean up the `HorizontalFilterBar` layout to prevent merging of controls and implement proper spacing.
- [ ] **Browse Page Cleanup**: Remove the redundant "Browse Listings" header and green badge to align with the cleaner Google AI Studio design.
- [ ] **Mobile Responsiveness**: Ensure the new filter and header changes work well on mobile devices.

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
- **Color Scheme Update**: Implemented a consistent color scheme throughout the application.
  - Updated the global CSS with proper Tailwind color variables
  - Refactored all components to use the new color palette
  - Fixed conflicts between direct color styles and Tailwind's @apply rules
  - Updated background colors, text colors, and UI elements for consistency
  - References: `src/app/globals.css`, `tailwind.config.js`, `src/app/create-listing/page.tsx`, various component files

- **Category and Subcategory Display Format**: Implemented proper category and subcategory display in all listing views.
  - Created new utility functions in `src/lib/category-utils.ts` to format categories
  - Added subcategory extraction from listing descriptions
  - Updated ListingCard, ListingDetail, Browse page, and individual listing pages
  - References: `src/lib/category-utils.ts`, `src/components/marketplace/ListingCard.tsx`, `src/components/marketplace/ListingDetail/index.tsx`, `src/app/browse/page.tsx`, `src/app/listing/[id]/page.tsx`

- **Updated Category List**: Reorganized and optimized the category list.
  - Removed unnecessary categories: Vehicles, Property Rentals, Classifieds, Family, Home Sales
  - Added new categories and organized subcategories for better user experience
  - Fixed subcategory loading using React state management instead of DOM manipulation
  - References: `src/lib/categories.ts`, `src/components/marketplace/CreateListingForm.tsx` 