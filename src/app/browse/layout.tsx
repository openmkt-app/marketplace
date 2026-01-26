import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Listings | Open Market',
  description: 'Browse local listings on Open Market. Find great deals on items for sale in your area without fees or middlemen.',
  // alternates: {
  //   canonical: 'https://openmkt.app/browse',
  // },
  openGraph: {
    title: 'Browse Listings | Open Market',
    description: 'Browse local listings on Open Market. Find great deals on items for sale in your area.',
    type: 'website',
    url: 'https://openmkt.app/browse',
    siteName: 'Open Market',
  },
  robots: {
    index: true,
    follow: true,
    // Don't index URL variations with query parameters
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
