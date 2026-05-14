import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
        destination: '/my-store',
        permanent: false,
      },
      {
        source: '/your-handle',
        destination: '/my-store',
        permanent: false,
      },
      {
        source: '/my-store',
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
