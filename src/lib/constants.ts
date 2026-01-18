/**
 * Application Constants
 */

// Determine if we are in production
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Lexicon Collection IDs
// Use the new domain for production, legacy for development
export const MARKETPLACE_COLLECTION = IS_PRODUCTION
    ? 'app.openmkt.marketplace'
    : 'app.atprotomkt.marketplace.listing';



// Other global constants can go here
