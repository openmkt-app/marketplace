import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip API/XRPC routes, OAuth, well-known endpoints, Next internals, and
  // static files. Static-file detection uses an explicit extension list —
  // a generic `\.[a-z0-9]+$` would wrongly skip Bluesky handles
  // (e.g. `/store/auad.bsky.social`) and at:// listing URIs that contain
  // literal dots in the path (`app.openmkt.marketplace.listing`).
  matcher: [
    '/((?!api|xrpc|oauth|oauth-client-metadata\\.json|\\.well-known|_next|_vercel|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|css|js|mjs|map|json|xml|txt|html|woff|woff2|ttf|otf|eot|pdf|mp4|webm|avif)$).*)',
  ],
};
