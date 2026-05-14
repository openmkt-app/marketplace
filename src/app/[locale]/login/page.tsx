import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LoginPageClient from './LoginPageClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login.metadata' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/login' },
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary-color border-t-transparent rounded-full"></div>
      </div>
    }>
      <LoginPageClient />
    </Suspense>
  );
}
