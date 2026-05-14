import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { ShieldCheck, MapPin, Users } from 'lucide-react';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'safety.metadata' });
    return {
        title: t('title'),
        description: t('description'),
    };
}

export default async function SafetyTipsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'safety' });
    const common = await getTranslations({ locale, namespace: 'common' });

    return (
        <div className="container-custom py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-text-secondary hover:text-primary-color text-sm mb-4 inline-block">
                        {common('backHome')}
                    </Link>
                    <h1 className="text-3xl font-bold text-primary-color mb-4">{t('title')}</h1>
                    <p className="text-text-secondary text-lg">
                        {t('intro')}
                    </p>
                </div>

                <div className="space-y-8">
                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-blue-50 p-3 rounded-full mr-4 text-primary-color">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">{t('tip1Title')}</h2>
                                <p className="text-text-secondary">{t('tip1Body')}</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-blue-50 p-3 rounded-full mr-4 text-primary-color">
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">{t('tip2Title')}</h2>
                                <p className="text-text-secondary">{t('tip2Body')}</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-blue-50 p-3 rounded-full mr-4 text-primary-color">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">{t('tip3Title')}</h2>
                                <p className="text-text-secondary">{t('tip3Body')}</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
                        <div className="flex items-start">
                            <div className="bg-yellow-50 p-3 rounded-full mr-4 text-yellow-600">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary mb-2">{t('tip4Title')}</h2>
                                <p className="text-text-secondary">{t('tip4Body')}</p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-12 p-6 bg-neutral-50 rounded-lg text-center">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">{t('reportTitle')}</h3>
                    <p className="text-text-secondary mb-4">{t('reportBody')}</p>
                    <a
                        href="mailto:support@openmkt.app?subject=Safety Report: [Issue Title]"
                        className="inline-block bg-white text-primary-color border border-neutral-light px-6 py-2 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                    >
                        {t('reportCta')}
                    </a>
                </div>
            </div>
        </div>
    );
}
