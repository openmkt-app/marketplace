/**
 * Next merges metadata shallowly: a route that declares its own `openGraph`
 * replaces the parent's whole object rather than filling in around it. So the
 * moment a page or layout sets an og title, it drops the root layout's
 * og:image too — and a card with no image is what Bluesky and every other
 * unfurler then draw. Any route that declares `openGraph` has to restate the
 * image, and this is the one copy of it.
 */
// 1200x630, the ratio every unfurler crops to. The predecessor, og-image.png,
// was 912x1024 portrait declared as 1200x630, so Bluesky cut away half of it
// and drew a bare stock photo with none of the branding on it. This is that
// same artwork letterboxed onto a landscape canvas in the navy of its own
// frame, so nothing is cropped. It is a new filename rather than a replacement
// because the card services cache by URL, and og-image.png is still the one
// already-published posts point at.
export const SITE_OG_IMAGE = {
  url: 'https://openmkt.app/og-card.png',
  width: 1200,
  height: 630,
  alt: 'Open Market - Buy, Sell, and Trade Locally',
} as const;

/** Ready to spread into `openGraph.images`. */
export const defaultOgImages = [SITE_OG_IMAGE];

/** Ready to spread into `twitter.images`, which takes bare URLs. */
export const defaultTwitterImages = [SITE_OG_IMAGE.url];
