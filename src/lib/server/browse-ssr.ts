// Listings for the server render of /browse.
//
// Separate from browse-feed because the constraints are different. The API
// route is allowed to wait — a visitor is already looking at a page while it
// runs. The server render is not: every millisecond here is time before the
// browser receives a single byte, so this trades completeness for latency and
// is happy to return nothing.

import { getIndexedFeed, fetchIndexedListings } from './browse-feed';
import { refreshAppViewInBackground, type PublicListing } from '@/lib/mall-cache';

/**
 * How long the page will wait on the index before giving up and rendering
 * without listings.
 *
 * A warm index answers in about 130ms; a cold tunnel to the NAS can take 2.7s.
 * This sits well below the cold case on purpose. Waiting longer would not
 * rescue it — it would just add the full delay to time-to-first-byte and still
 * fall through to the client fetch. The cost of being wrong is capped here.
 */
const SSR_BUDGET_MS = 800;

/**
 * How many listings to put in the HTML.
 *
 * The point is to fill the first screen, not the whole grid — every listing
 * here is bytes in the document, and the client fetch replaces this set within
 * a moment anyway. Two rows at the widest breakpoint.
 */
const SSR_LISTING_COUNT = 8;

/**
 * How long the index read behind this render may be reused for.
 *
 * Matches the revalidate on /browse, and has to be set to something: an
 * uncached fetch here opts the whole page out of being prerendered, which is
 * what kept /browse rendering per request for every crawler that touched it.
 */
const SSR_REVALIDATE_S = 60;

/**
 * Drop every image but the first.
 *
 * A card shows one photo, but listings carry up to ten, and the two image
 * arrays together were three quarters of the serialized seed — paid for on
 * every page load to describe images that are never rendered. The client fetch
 * restores the full record moments later, and the detail page loads its own.
 */
function trimToCardImage(listing: PublicListing): PublicListing {
    const images = listing.images?.slice(0, 1);
    const formattedImages = listing.formattedImages?.slice(0, 1);
    return { ...listing, ...(images ? { images } : {}), ...(formattedImages ? { formattedImages } : {}) };
}

/**
 * Listings to seed the browse page with, or an empty array.
 *
 * Never throws and never blocks for long: any failure means the page renders
 * exactly as it does today, with the client fetching after hydration.
 */
export async function getInitialBrowseListings(): Promise<PublicListing[]> {
    try {
        const feed = await getIndexedFeed(SSR_BUDGET_MS, SSR_REVALIDATE_S);
        if (!feed) {
            // Missing the budget usually means this instance started cold and
            // paid for the tunnel handshake. Warm the cache without a deadline
            // so the next render on this instance is served from memory rather
            // than racing the same clock again.
            refreshAppViewInBackground(() => fetchIndexedListings());
            return [];
        }

        // Listings marked hideFromFriends are withheld from the server render.
        //
        // Whether a viewer may see one depends on their follow graph, which is
        // only known to the logged-in client. Rather than resolve that here,
        // they are left out of the HTML entirely and are put back by the client
        // fetch, which applies the check in viewer-visibility.ts. A listing
        // showing up a moment late is recoverable; showing it to someone it was
        // hidden from is not.
        return feed.listings
            .filter(listing => !listing.hideFromFriends)
            .slice(0, SSR_LISTING_COUNT)
            .map(trimToCardImage);
    } catch {
        return [];
    }
}
