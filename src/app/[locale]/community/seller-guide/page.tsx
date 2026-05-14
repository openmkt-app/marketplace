import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { Camera, Edit3, MessageCircle, DollarSign } from 'lucide-react';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'sellerGuide.metadata' });
    return {
        title: t('title'),
        description: t('description'),
    };
}

export default async function SellerGuidePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'sellerGuide' });
    const common = await getTranslations({ locale, namespace: 'common' });

    const sections = [
        {
            title: t('photosTitle'),
            tips: [t('photosTip1'), t('photosTip2'), t('photosTip3'), t('photosTip4')],
            icon: Camera,
        },
        {
            title: t('descTitle'),
            tips: [t('descTip1'), t('descTip2'), t('descTip3'), t('descTip4')],
            icon: Edit3,
        },
        {
            title: t('priceTitle'),
            tips: [t('priceTip1'), t('priceTip2'), t('priceTip3'), t('priceTip4')],
            icon: DollarSign,
        },
        {
            title: t('commTitle'),
            tips: [t('commTip1'), t('commTip2'), t('commTip3'), t('commTip4')],
            icon: MessageCircle,
        },
    ];

    return (
        <div className="container-custom py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-text-secondary hover:text-primary-color text-sm mb-4 inline-block">
                        {common('backHome')}
                    </Link>
                    <h1 className="text-3xl font-bold text-primary-color mb-4">{t('title')}</h1>
                    <p className="text-text-secondary text-lg">{t('intro')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {sections.map(({ title, tips, icon: Icon }) => (
                        <div key={title} className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                            <div className="bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg mb-4 text-primary-color">
                                <Icon size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-text-primary mb-3">{title}</h2>
                            <ul className="text-text-secondary space-y-2 text-sm list-disc pl-5">
                                {tips.map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-50 rounded-xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-primary-color mb-4">{t('ctaTitle')}</h2>
                    <p className="text-text-secondary mb-6 max-w-lg mx-auto">{t('ctaBody')}</p>
                    <Link href="/create-listing" className="inline-block bg-primary-color text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-light hover:text-white transition-colors shadow-sm">
                        {t('ctaButton')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
