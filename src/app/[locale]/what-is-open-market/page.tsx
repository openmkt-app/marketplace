import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import WhatIsOpenMarketClient from './WhatIsOpenMarketClient';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'whatIsOpenMarket.metadata' });
    return {
        title: t('title'),
        description: t('description'),
    };
}

export default function WhatIsOpenMarketPage() {
    return <WhatIsOpenMarketClient />;
}
