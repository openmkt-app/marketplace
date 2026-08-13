import { Suspense } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavbarFilterProvider } from '@/contexts/NavbarFilterContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AlertBanner from '@/components/AlertBanner'
import { defaultOgImages, defaultTwitterImages } from '@/lib/site-metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('ogDescription'),
      type: 'website',
      url: 'https://openmkt.app',
      siteName: 'Open Market',
      images: defaultOgImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('ogDescription'),
      images: defaultTwitterImages,
    },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? '/' : `/${l}`]),
      ),
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  return (
    <NextIntlClientProvider>
      <AuthProvider>
        <NavbarFilterProvider>
          <AlertBanner />
          <Suspense fallback={<div className="h-16 bg-white shadow-sm" />}>
            <Navbar />
          </Suspense>
          <main className="flex-grow w-full">
            {children}
          </main>
          <Footer />
        </NavbarFilterProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
