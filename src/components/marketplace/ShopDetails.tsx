'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Clock, Globe, Truck, Undo2, FileText, ShieldCheck, Moon } from 'lucide-react';
import { linkifyText } from '@/lib/linkify';
import type { Shop } from '@/lib/commerce/types';

/**
 * The seller's shop: handling time, where they ship, and their policies.
 *
 * Renders nothing unless the shop record carries something worth showing. A
 * shop is created automatically the first time a seller saves a listing, so
 * most of them hold only a name until the seller fills the rest in — an empty
 * panel of blank headings would be worse than no panel.
 */

/** "US" -> "United States", in the viewer's language. */
function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/** A policy may be a URL or a paragraph of text; both are common. */
function PolicyBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const isUrl = /^https?:\/\//i.test(value.trim());
  return (
    <div className="flex gap-3">
      <div className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        {isUrl ? (
          <a
            href={value.trim()}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sm text-sky-600 hover:underline break-all"
          >
            {value.trim()}
          </a>
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{linkifyText(value)}</p>
        )}
      </div>
    </div>
  );
}

/** The banner a shop shows while it is not trading. Exported so the store page
 *  can put it above the fold rather than down with the policies. */
export function ShopStatusBanner({ shop }: { shop: Shop | null }) {
  const t = useTranslations('shop');
  const locale = useLocale();

  if (!shop?.status || shop.status === 'open') return null;

  const reopens =
    shop.status === 'vacation' && shop.reopensAt
      ? new Date(shop.reopensAt).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
      : null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
      <Moon size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold text-amber-900">
          {shop.status === 'closed' ? t('statusClosedTitle') : t('statusVacationTitle')}
        </p>
        {shop.statusMessage && <p className="text-sm text-amber-900 mt-0.5">{shop.statusMessage}</p>}
        {reopens && <p className="text-sm text-amber-800 mt-0.5">{t('statusBackOn', { date: reopens })}</p>}
      </div>
    </div>
  );
}

export default function ShopDetails({ shop }: { shop: Shop | null }) {
  const t = useTranslations('shop');
  const locale = useLocale();

  if (!shop) return null;

  const { policies, handlingTime, shipsTo, website } = shop;
  const hasPolicies = !!(policies?.returns || policies?.shipping || policies?.terms || policies?.privacy);
  const hasFacts = !!(handlingTime || shipsTo?.length || website);
  if (!hasPolicies && !hasFacts) return null;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('detailsHeader')}</h2>

      {hasFacts && (
        <div className="flex flex-wrap gap-x-8 gap-y-3 mb-4 text-sm">
          {handlingTime && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={16} className="text-gray-400" />
              <span>{t('handlingTime', { time: handlingTime })}</span>
            </div>
          )}
          {shipsTo && shipsTo.length > 0 && (
            <div className="flex items-center gap-2 text-gray-700">
              <Truck size={16} className="text-gray-400" />
              <span>
                {/* Listing every country is unreadable past a handful. */}
                {shipsTo.length > 6
                  ? t('shipsToCount', { count: shipsTo.length })
                  : t('shipsTo', { places: shipsTo.map(c => countryName(c, locale)).join(', ') })}
              </span>
            </div>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2 text-sky-600 hover:underline"
            >
              <Globe size={16} />
              <span className="break-all">{website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
      )}

      {hasPolicies && (
        <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-gray-100">
          {policies?.returns && (
            <PolicyBlock icon={<Undo2 size={16} />} label={t('policyReturns')} value={policies.returns} />
          )}
          {policies?.shipping && (
            <PolicyBlock icon={<Truck size={16} />} label={t('policyShipping')} value={policies.shipping} />
          )}
          {policies?.terms && (
            <PolicyBlock icon={<FileText size={16} />} label={t('policyTerms')} value={policies.terms} />
          )}
          {policies?.privacy && (
            <PolicyBlock icon={<ShieldCheck size={16} />} label={t('policyPrivacy')} value={policies.privacy} />
          )}
        </div>
      )}
    </section>
  );
}
