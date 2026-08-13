import { Inter } from 'next/font/google'
import './globals.css'
import { GoogleAnalytics } from '@next/third-parties/google'
import { defaultOgImages, defaultTwitterImages } from '@/lib/site-metadata'

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
    images: defaultOgImages,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Market - Buy, Sell, and Trade Locally',
    description: 'Buy, sell, and trade locally without fees. Open Market is a community-owned marketplace built on the open web.',
    images: defaultTwitterImages,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // suppressHydrationWarning below covers the <html> element's own attributes
  // only, not its children. Privacy extensions stamp attributes onto <html>
  // before React loads — a Google Analytics opt-out adds
  // data-google-analytics-opt-out — and React reports that as a hydration
  // mismatch we can neither prevent nor fix. Real mismatches anywhere inside
  // the app are still reported.
  return (
    <html
      lang="en"
      className="h-full scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${inter.className} flex flex-col min-h-screen antialiased`}>
        {children}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  )
}
