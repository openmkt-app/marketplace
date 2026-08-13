/**
 * Next merges metadata shallowly: a route that declares its own `openGraph`
 * replaces the parent's whole object rather than filling in around it. So the
 * moment a page or layout sets an og title, it drops the root layout's
 * og:image too — and a card with no image is what Bluesky and every other
 * unfurler then draw. Any route that declares `openGraph` has to restate the
 * image, and this is the one copy of it.
 */
export const SITE_OG_IMAGE = {
  url: 'https://openmkt.app/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Open Market - Buy, Sell, and Trade Locally',
} as const;

/** Ready to spread into `openGraph.images`. */
export const defaultOgImages = [SITE_OG_IMAGE];

/** Ready to spread into `twitter.images`, which takes bare URLs. */
export const defaultTwitterImages = [SITE_OG_IMAGE.url];
