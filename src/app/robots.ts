import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/debug-dids',
          '/test-listing',
          '/my-listings',
          '/create-listing',
          '/edit-listing/',
          '/profile',
          // Prevent indexing filtered/parameterized versions of pages
          '/browse?*',
          '/mall?*',
          '/listing/*?*',
          '/store/*?*',
        ],
      },
    ],
    sitemap: 'https://openmkt.app/sitemap.xml',
  };
}
