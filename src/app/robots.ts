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
        ],
      },
    ],
    sitemap: 'https://openmkt.app/sitemap.xml',
  };
}
