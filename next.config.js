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
    ];
  },
}

export default withNextIntl(nextConfig);
