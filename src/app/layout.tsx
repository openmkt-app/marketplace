import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavbarFilterProvider } from '@/contexts/NavbarFilterContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  metadataBase: new URL('https://openmkt.app'),
  title: 'Open Market - Buy, Sell, and Trade Locally',
  description: 'Buy, sell, and trade locally without fees. Open Market is a community-owned marketplace built on the open web. Discover unique items from verified neighbors.',
  openGraph: {
    title: 'Open Market - Buy, Sell, and Trade Locally',
    description: 'Buy, sell, and trade locally without fees. Open Market is a community-owned marketplace built on the open web.',
    type: 'website',
    url: 'https://openmkt.app',
    images: ['https://openmkt.app/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className={`${inter.className} flex flex-col min-h-screen antialiased`}>
        <AuthProvider>
          <NavbarFilterProvider>
            <Suspense fallback={<div className="h-16 bg-white shadow-sm" />}>
              <Navbar />
            </Suspense>
            <main className="flex-grow w-full">
              {children}
            </main>
            <Footer />
          </NavbarFilterProvider>
        </AuthProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  )
}
