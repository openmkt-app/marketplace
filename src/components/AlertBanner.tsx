'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

type BannerType = 'warning' | 'error' | 'info';

type BannerData = {
  message: string;
  type: BannerType;
  setAt: string;
};

const STYLES: Record<BannerType, { bg: string; text: string; icon: React.ReactNode }> = {
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-900',
    icon: <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />,
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-900',
    icon: <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />,
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-900',
    icon: <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />,
  },
};

/**
 * The banner arrives as a prop from the layout, which already has it.
 *
 * It used to fetch /api/admin/banner from here, which meant every visitor on
 * every page spent a function invocation to be told, almost always, that there
 * is no banner. The layout is a server component and reads the same store for
 * free, so the only thing this needs to stay a client component for is the
 * dismiss button.
 */
export default function AlertBanner({ banner }: { banner: BannerData | null }) {
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations('common');

  if (!banner || dismissed) return null;

  const { bg, text, icon } = STYLES[banner.type] ?? STYLES.warning;

  return (
    <div className={`w-full border-b ${bg} px-4 py-2.5`}>
      <div className="max-w-6xl mx-auto flex items-start gap-2.5">
        {icon}
        <p className={`flex-1 text-sm font-medium ${text}`}>{banner.message}</p>
        <button
          onClick={() => setDismissed(true)}
          className={`${text} opacity-60 hover:opacity-100 transition-opacity`}
          aria-label={t('dismiss')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
