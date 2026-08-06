import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev server binds dual-stack, so Next sees a request to 127.0.0.1 as
  // coming from a different host than the one it serves and blocks its own dev
  // resources — which silently kills hydration. 127.0.0.1 is not optional here:
  // the AT Protocol OAuth loopback redirect must use it rather than localhost.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.bsky.app',
        pathname: '/img/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/browse',
        permanent: true,
      },
      {
        source: '/:locale(es|pt)',
        destination: '/:locale/browse',
        permanent: true,
      },
      {
        source: '/%5Byour-handle%5D',
        destination: '/en/my-store',
        permanent: false,
      },
      {
        source: '/[your-handle]',
        destination: '/en/my-store',
        permanent: false,
      },
      {
        source: '/your-handle',
        destination: '/en/my-store',
        permanent: false,
      },
      {
        source: '/pt/o-que-e-o-open-market',
        destination: '/pt/what-is-open-market',
        permanent: true,
      },
      {
        source: '/es/que-es-open-market',
        destination: '/es/what-is-open-market',
        permanent: true,
      },
    ];
  },
}

export default withNextIntl(nextConfig);
