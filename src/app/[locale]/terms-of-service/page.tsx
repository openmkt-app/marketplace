import { Link } from '@/i18n/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'termsOfService.metadata' });
    return {
        title: t('title'),
        description: t('description'),
        alternates: {
            canonical: '/terms-of-service',
        },
    };
}

const EFFECTIVE_DATE = 'April 21, 2025';

export default async function TermsOfServicePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'termsOfService' });

    const sections = [
        {
            number: '01',
            title: t('sections.acceptance.title'),
            content: <p>{t('sections.acceptance.body')}</p>,
        },
        {
            number: '02',
            title: t('sections.description.title'),
            content: <p>{t('sections.description.body')}</p>,
        },
        {
            number: '03',
            title: t('sections.eligibility.title'),
            content: <p>{t('sections.eligibility.body')}</p>,
        },
        {
            number: '04',
            title: t('sections.listings.title'),
            content: <p>{t('sections.listings.body')}</p>,
        },
        {
            number: '05',
            title: t('sections.transactions.title'),
            content: <p>{t('sections.transactions.body')}</p>,
        },
        {
            number: '06',
            title: t('sections.dependency.title'),
            content: <p>{t('sections.dependency.body')}</p>,
        },
        {
            number: '07',
            title: t('sections.conduct.title'),
            content: <p>{t('sections.conduct.body')}</p>,
        },
        {
            number: '08',
            title: t('sections.liability.title'),
            content: <p className="uppercase text-xs">{t('sections.liability.body')}</p>,
        },
        {
            number: '09',
            title: t('sections.termination.title'),
            content: <p>{t('sections.termination.body')}</p>,
        },
    ];

    return (
        <div className="container-custom py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-10">
                    <Link href="/" className="text-text-secondary hover:text-primary-color text-sm mb-4 inline-block">
                        {t('backHome')}
                    </Link>
                    <h1 className="text-3xl font-bold text-primary-color mb-3">{t('title')}</h1>
                    <p className="text-text-secondary text-sm">{t('effectiveDate', { date: EFFECTIVE_DATE })}</p>
                    <p className="text-text-secondary text-lg mt-4">
                        {t('introBody')}
                    </p>
                </div>

                <div className="space-y-4">
                    {sections.map((section) => (
                        <section
                            key={section.number}
                            className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl font-bold text-primary-color/30 leading-none mt-0.5 shrink-0 w-8">
                                    {section.number}
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold text-text-primary mb-3">{section.title}</h2>
                                    <div className="text-text-secondary text-sm leading-relaxed">
                                        {section.content}
                                    </div>
                                </div>
                            </div>
                        </section>
                    ))}
                </div>

                <div className="mt-10 p-6 bg-blue-50 rounded-lg text-center">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">{t('questionsTitle')}</h3>
                    <p className="text-text-secondary text-sm mb-4">
                        {t('questionsBody')}
                    </p>
                    <a
                        href="mailto:support@openmkt.app"
                        className="inline-block bg-white text-primary-color border border-neutral-light px-6 py-2 rounded-lg font-medium hover:bg-neutral-50 transition-colors text-sm"
                    >
                        {t('contactBtn')}
                    </a>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/privacy-policy" className="text-sm font-medium text-primary-color hover:text-primary-light">
                        {t('readPrivacy')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

