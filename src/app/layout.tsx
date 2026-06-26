import { Inter } from 'next/font/google'
import './globals.css'
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const viewport = {
  themeColor: '#0B6FA7',
}

export const metadata = {
  metadataBase: new URL('https://openmkt.app'),
  title: 'Open Market - Buy, Sell, and Trade Locally',
  description: 'Buy, sell, and trade locally without fees. Open Market is a community-owned marketplace built on the open web. Discover unique items from verified neighbors.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Open Market',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Open Market - Buy, Sell, and Trade Locally',
    description: 'Buy, sell, and trade locally without fees. Open Market is a community-owned marketplace built on the open web.',
    type: 'website',
    url: 'https://openmkt.app',
    images: [
      {
        url: 'https://openmkt.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Open Market - Buy, Sell, and Trade Locally',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Market - Buy, Sell, and Trade Locally',
    description: 'Buy, sell, and trade locally without fees. Open Market is a community-owned marketplace built on the open web.',
    images: ['https://openmkt.app/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.className} flex flex-col min-h-screen antialiased`}>
        {children}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  )
}
