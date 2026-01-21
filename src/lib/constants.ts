// src/lib/constants.ts
// Centralized constants for the marketplace application

// Production uses app.openmkt.marketplace.listing
// Development uses app.atprotomkt.marketplace.listing (to keep test data separate)
const PRODUCTION_COLLECTION = 'app.openmkt.marketplace.listing';
const DEVELOPMENT_COLLECTION = 'app.atprotomkt.marketplace.listing';

// Use NEXT_PUBLIC_MARKETPLACE_ENV to switch between collections
// Set to 'production' in production, anything else (or unset) uses development
export const MARKETPLACE_COLLECTION =
  process.env.NEXT_PUBLIC_MARKETPLACE_ENV === 'production'
    ? PRODUCTION_COLLECTION
    : DEVELOPMENT_COLLECTION;
