import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { assessCheckoutLink } from '@/lib/checkout-safety';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'leaving.metadata' });
  return {
    title: t('title'),
    description: t('description'),
    // A warning page has nothing to offer a search index, and we would rather
    // it never appeared in results carrying a scammer's domain in the URL.
    robots: { index: false, follow: false },
  };
}

/**
 * The warning shown before a buyer follows a checkout link that is imitating
 * something. Ordinary links never reach this page — they go straight out — so
 * arriving here is meant to be worth reading.
 *
 * The link is assessed again here rather than trusted from the query string.
 * Anyone can construct a `/leaving?to=...` URL, so this page decides for
 * itself what the destination is and whether it is safe to render as a link.
 */
export default async function LeavingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ to?: string | string[] }>;
}) {
  const { locale } = await params;
  const { to } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'leaving' });

  const target = Array.isArray(to) ? to[0] : to;
  const trust = assessCheckoutLink(target ?? '');

  // Never render an anchor for something that is not an http(s) address —
  // `javascript:` and friends stop here.
  if (trust.level === 'invalid') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={24} />
            <div>
              <h1 className="text-xl font-bold text-red-900">{t('invalidTitle')}</h1>
              <p className="mt-2 text-red-800">{t('invalidBody')}</p>
            </div>
          </div>
        </div>
        <Link
          href="/"
          className="mt-6 inline-block px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
        >
          {t('back')}
        </Link>
      </main>
    );
  }

  const reasons = trust.level === 'suspicious' ? trust.reasons : [];

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-start gap-3 mb-6">
        <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="mt-2 text-slate-600">{t('lead')}</p>
        </div>
      </div>

      {/* The hostname, on its own, large. The single most useful thing on the
          page is the address the buyer is actually about to visit. */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{t('destinationLabel')}</p>
        <p className="mt-1 text-xl font-mono font-semibold text-slate-900 break-all">{trust.host}</p>
      </div>

      {reasons.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            {t('whatWeFound')}
          </h2>
          <ul className="space-y-3">
            {reasons.map((reason, index) => (
              <li
                key={index}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
              >
                {reason.kind === 'lookalike' && t('lookalike', { target: reason.target })}
                {reason.kind === 'brandElsewhere' &&
                  t('brandElsewhere', { brand: reason.brand, domain: reason.domain })}
                {reason.kind === 'punycode' && t('punycode', { host: trust.host })}
                {reason.kind === 'insecure' && t('insecure')}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">{t('adviceTitle')}</h2>
        <ul className="space-y-2 text-slate-700 list-disc pl-5">
          <li>{t('advice1')}</li>
          <li>{t('advice2')}</li>
          <li>{t('advice3')}</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">{t('notEndorsed')}</p>
      </section>

      {/* Leaving is quieter than going back. The buyer can still continue —
          we are not the arbiter of where they shop — but the safe choice is
          the one that looks like the button. */}
      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
        <a
          href={trust.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-sm text-slate-500 hover:bg-slate-50 transition-colors break-all"
        >
          <span>{t('continue', { host: trust.host })}</span>
          <ArrowRight size={16} className="shrink-0" />
        </a>
        <Link
          href="/"
          className="sm:ml-auto inline-flex items-center justify-center whitespace-nowrap px-8 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
        >
          {t('back')}
        </Link>
      </div>
    </main>
  );
}
