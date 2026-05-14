// Homepage redirects to /browse via next.config.js (permanent 308 redirect).
// This file exists as a fallback and for TypeScript route completion.

import { redirect } from '@/i18n/navigation';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/browse', locale });
}
