import { Suspense } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavbarFilterProvider } from '@/contexts/NavbarFilterContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AlertBanner from '@/components/AlertBanner'
import { getBanner } from '@/lib/banner'
import { defaultOgImages, defaultTwitterImages } from '@/lib/site-metadata'

/**
 * Everything under this layout is prerendered, so the alert banner read below
 * is baked into the cached HTML. This is the ceiling on how long a banner can
 * take to appear on a page that has no revalidate of its own — without it,
 * "things went down really bad" would never reach a static page at all.
 *
 * Pages that need to be fresher set a lower value; the smallest in the tree is
 * the one that applies.
 */
export const revalidate = 300

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

  // Pages under this layout can only be prerendered if the locale comes from
  // the route rather than from a request header. generateStaticParams below
  // has no effect without it.
  setRequestLocale(locale)

  // Read here rather than from the client. The layout renders on every page
  // anyway, so this is one blob read on a request that was already happening,
  // instead of a second function invocation per visitor per page.
  const banner = await getBanner()

  return (
    <NextIntlClientProvider>
      <AuthProvider>
        <NavbarFilterProvider>
          <AlertBanner banner={banner} />
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
