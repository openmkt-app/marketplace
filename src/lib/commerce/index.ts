// Commerce codec — the boundary between PDS records and the app.
//
// Read:  normalizeListings / normalizeAndHydrate  (hydrate.ts — adds image URLs)
//        normalizeListing                          (normalize.ts — pure transform)
// Write: buildListingRecord
// Money: toMinorUnits / formatMinorUnits / effectiveAmount
//
// Nothing outside this directory should reference a record field name directly.

export * from './collections.ts';
export * from './hydrate.ts';
export * from './money.ts';
export * from './normalize.ts';
export * from './serialize.ts';
export * from './types.ts';
