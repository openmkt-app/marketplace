import { MetadataRoute } from 'next';

/**
 * Crawlers that take the whole catalogue and give nothing back.
 *
 * Search engines are deliberately not in here — being findable is the point of
 * a marketplace. These are the training-data and SEO-tooling crawlers, which
 * sweep every listing and store page one URL at a time. Those two routes are
 * still rendered per request, so a sweep is paid for in function invocations.
 */
const UNWELCOME_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'FacebookBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'Diffbot',
  'Timpibot',
  'Omgilibot',
  'SemrushBot',
  'AhrefsBot',
  'DotBot',
  'MJ12bot',
  'DataForSeoBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...UNWELCOME_CRAWLERS.map((userAgent) => ({ userAgent, disallow: '/' })),
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
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
