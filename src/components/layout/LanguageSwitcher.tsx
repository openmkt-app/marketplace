'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Globe, Check } from 'lucide-react';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('languageSwitcher');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (nextLocale: Locale) => {
    setIsOpen(false);
    if (nextLocale === locale) return;
    const qs = searchParams.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href, { locale: nextLocale });
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('label')}
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Globe size={16} />
        <span className="uppercase">{locale}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
        >
          {routing.locales.map((l) => {
            const isCurrent = l === locale;
            return (
              <button
                key={l}
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={() => handleSelect(l)}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                  isCurrent
                    ? 'text-primary-color font-medium bg-primary-color/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{LOCALE_LABELS[l]}</span>
                {isCurrent && <Check size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
