'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Check } from 'lucide-react';
import { formatMinorUnits } from '@/lib/commerce/money';
import type { VariantGroup } from '@/lib/server/fetch-variants';

/**
 * The other options of a product: tiers, sizes, colours.
 *
 * Each option is a separate listing with its own page, so these are links
 * rather than form controls. That is deliberate — a variant has its own
 * images, description and URL to share, and collapsing them into one page with
 * client-side state would throw all three away.
 *
 * Renders nothing unless there are at least two options, which the server
 * helper already guarantees. A chooser with one choice implies others exist.
 */
export default function VariantChooser({
  group,
  currentUri,
}: {
  group: VariantGroup | null | undefined;
  currentUri?: string;
}) {
  const t = useTranslations('listingDetail');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  if (!group || group.options.length < 2) return null;

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{group.axisName}</p>
        <p className="text-xs text-gray-400">{group.title}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {group.options.map(option => {
          const isCurrent = option.uri === currentUri;
          const price =
            option.amount === null
              ? t('makeAnOffer')
              : formatMinorUnits(option.amount, option.currency, locale, tCommon('free'));

          const body = (
            <>
              <span className="flex items-center gap-1 font-semibold text-sm">
                {option.value}
                {/* The seller's own pick, not ours. Absent unless they set one. */}
                {option.isDefault && !isCurrent && (
                  <span className="text-[10px] uppercase tracking-wide font-bold text-blue-600">
                    {t('variantPopular')}
                  </span>
                )}
                {isCurrent && <Check size={13} className="text-white" />}
              </span>
              <span className={`text-xs ${isCurrent ? 'text-blue-100' : 'text-gray-500'}`}>
                {price}
                {option.amount !== null && option.billingPeriod &&
                  tCommon(`billingPeriod.${option.billingPeriod}`)}
              </span>
            </>
          );

          const shape =
            'flex flex-col gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors';

          return isCurrent ? (
            <div
              key={option.uri}
              aria-current="true"
              className={`${shape} border-blue-600 bg-blue-600 text-white`}
            >
              {body}
            </div>
          ) : (
            <Link
              key={option.uri}
              href={`/listing/${encodeURIComponent(option.uri)}`}
              className={`${shape} border-gray-200 bg-white text-gray-900 hover:border-blue-400 hover:bg-blue-50`}
            >
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
