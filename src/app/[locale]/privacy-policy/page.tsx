import { Link } from '@/i18n/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'privacyPolicy.metadata' });
    return {
        title: t('title'),
        description: t('description'),
        alternates: {
            canonical: '/privacy-policy',
        },
    };
}

const EFFECTIVE_DATE = 'April 21, 2025';

export default async function PrivacyPolicyPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'privacyPolicy' });

    const sections = [
        {
            number: '01',
            title: t('sections.intro.title'),
            content: <p>{t('sections.intro.body')}</p>,
        },
        {
            number: '02',
            title: t('sections.collection.title'),
            content: (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                            <p className="text-sm font-semibold text-red-700 mb-2">{t('sections.collection.notCollected')}</p>
                            <p className="text-sm text-text-secondary">{t('sections.collection.notCollectedItems')}</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <p className="text-sm font-semibold text-green-700 mb-2">{t('sections.collection.collected')}</p>
                            <p className="text-sm text-text-secondary">{t('sections.collection.collectedItems')}</p>
                        </div>
                    </div>

                    <h3 className="font-semibold text-text-primary mb-2">{t('sections.collection.identity')}</h3>
                    <p className="mb-4">{t('sections.collection.identityBody')}</p>

                    <h3 className="font-semibold text-text-primary mb-2">{t('sections.collection.listings')}</h3>
                    <p className="mb-4">{t('sections.collection.listingsBody')}</p>

                    <h3 className="font-semibold text-text-primary mb-2">{t('sections.collection.analytics')}</h3>
                    <p>{t('sections.collection.analyticsBody')}</p>
                </>
            ),
        },
        {
            number: '03',
            title: t('sections.usage.title'),
            content: (
                <div className="space-y-4">
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.usage.operating')}</p>
                        <p>{t('sections.usage.operatingBody')}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.usage.improvement')}</p>
                        <p>{t('sections.usage.improvementBody')}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.usage.support')}</p>
                        <p>{t('sections.usage.supportBody')}</p>
                    </div>
                </div>
            ),
        },
        {
            number: '04',
            title: t('sections.storage.title'),
            content: (
                <div className="space-y-4">
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.storage.listings')}</p>
                        <p>{t('sections.storage.listingsBody')}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.storage.sessions')}</p>
                        <p>{t('sections.storage.sessionsBody')}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.storage.operational')}</p>
                        <p>{t('sections.storage.operationalBody')}</p>
                    </div>
                </div>
            ),
        },
        {
            number: '05',
            title: t('sections.rights.title'),
            content: (
                <div className="space-y-4">
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.rights.access')}</p>
                        <p>{t('sections.rights.accessBody')}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary mb-1">{t('sections.rights.revoke')}</p>
                        <p>{t('sections.rights.revokeBody')}</p>
                    </div>
                </div>
            ),
        },
        {
            number: '06',
            title: t('sections.cookies.title'),
            content: <p>{t('sections.cookies.body')}</p>,
        },
        {
            number: '07',
            title: t('sections.association.title'),
            content: <p>{t('sections.association.body')}</p>,
        },
        {
            number: '08',
            title: t('sections.changes.title'),
            content: <p>{t('sections.changes.body')}</p>,
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
                    <div className="mt-5 bg-blue-50 border border-blue-100 rounded-lg p-5">
                        <p className="font-semibold text-text-primary mb-1">{t('introBoxTitle')}</p>
                        <p className="text-text-secondary text-sm">
                            {t('introBoxBody')}
                        </p>
                    </div>
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
                    <Link href="/terms-of-service" className="text-sm font-medium text-primary-color hover:text-primary-light">
                        {t('readTerms')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

