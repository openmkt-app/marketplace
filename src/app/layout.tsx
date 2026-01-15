import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavbarFilterProvider } from '@/contexts/NavbarFilterContext'
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
      </body>
    </html>
  )
}
