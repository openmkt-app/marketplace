'use client';

import { useState, useEffect } from 'react';
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

export default function AlertBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/admin/banner')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.banner) setBanner(data.banner);
      })
      .catch(() => {});
  }, []);

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
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
