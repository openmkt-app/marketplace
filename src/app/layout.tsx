import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'AT Protocol Marketplace',
  description: 'A local marketplace built on the AT Protocol',
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
          <Suspense fallback={<div className="h-16 bg-white shadow-sm" />}>
            <Navbar />
          </Suspense>
          <main className="flex-grow container-custom pt-6 pb-12 md:pt-8 md:pb-16 w-full">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
