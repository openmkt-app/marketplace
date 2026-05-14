import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip API/XRPC routes, OAuth, well-known endpoints, Next internals, and
  // static files. Static-file detection requires the dot to be in the FINAL
  // segment (e.g. /sitemap.xml, /favicon.ico) — at:// listing URIs contain
  // literal dots inside the encoded path (app.openmkt.marketplace.listing),
  // so a generic ".*\\..*" exclusion would wrongly skip them.
  matcher: [
    '/((?!api|xrpc|oauth|oauth-client-metadata\\.json|\\.well-known|_next|_vercel|.*\\.[a-zA-Z0-9]+$).*)',
  ],
};
