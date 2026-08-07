// Collapsing a product's variants into one card.
//
// Four tiers of the same product are four listings, and a grid that shows all
// four is four times as much of one product and a quarter as much of everything
// else. Browse shows one card per product; the chooser on the listing page is
// where the options live.
//
// Works from `partOf` alone, which every variant listing carries, so no group
// record has to be fetched to do this.

type Collapsible = {
  uri?: string;
  partOf?: string;
  price?: string;
  noPrice?: boolean;
  /** Set by this function: how many listings the card stands for. */
  variantCount?: number;
};

/**
 * Which of a product's variants a grid should show.
 *
 * The cheapest one, so "from $69" is true rather than aspirational. A variant
 * with no price sorts last: "make an offer" as the headline price of a product
 * that also has real prices tells the buyer nothing.
 */
function isCheaper(candidate: Collapsible, current: Collapsible): boolean {
  if (candidate.noPrice) return false;
  if (current.noPrice) return true;

  const a = Number.parseFloat(candidate.price ?? '');
  const b = Number.parseFloat(current.price ?? '');
  if (!Number.isFinite(a)) return false;
  if (!Number.isFinite(b)) return true;
  return a < b;
}

/**
 * One entry per product, keeping every ungrouped listing as it is.
 *
 * Order is preserved: a collapsed product sits where its first variant was, so
 * a newest-first grid stays newest-first rather than reshuffling around
 * whichever variant happened to be cheapest.
 */
export function collapseVariants<T extends Collapsible>(listings: T[]): T[] {
  // Nothing to do for the overwhelmingly common case, and worth checking
  // because this runs on every render of every grid.
  if (!listings.some(listing => listing.partOf)) return listings;

  const positions = new Map<string, number>();
  const out: T[] = [];

  for (const listing of listings) {
    if (!listing.partOf) {
      out.push(listing);
      continue;
    }

    const seenAt = positions.get(listing.partOf);
    if (seenAt === undefined) {
      positions.set(listing.partOf, out.length);
      out.push({ ...listing, variantCount: 1 });
      continue;
    }

    const current = out[seenAt];
    const count = (current.variantCount ?? 1) + 1;
    // The representative may change, the position never does.
    out[seenAt] = isCheaper(listing, current)
      ? { ...listing, variantCount: count }
      : { ...current, variantCount: count };
  }

  return out;
}
