import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ShopSettingsForm from './ShopSettingsForm';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shopSettings' });
  return {
    title: t('title'),
    // A seller's own settings page has nothing to offer a search engine, and
    // indexing it would surface a page that only ever redirects to login.
    robots: { index: false, follow: false },
  };
}

export default function ShopSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ShopSettingsForm />
    </div>
  );
}
