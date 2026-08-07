'use client';

import { useTranslations } from 'next-intl';

/**
 * The form's tab bar.
 *
 * Tabs rather than steps because editing is a first-class use: a seller
 * changing one price should not click through four screens to reach it, and
 * the live preview only means something when the whole listing exists. Submit
 * stays visible from every tab for the same reason — this is one object being
 * shaped, not a queue of questions.
 *
 * A tab carrying an unfilled required field is marked, so a failed save points
 * at where the problem is instead of leaving the seller to hunt for it.
 */

export type TabId = 'basics' | 'price' | 'availability' | 'delivery' | 'more';

export type TabDef = {
  id: TabId;
  /** Key under `createListing.tabs`. */
  labelKey: string;
  /** True when this tab is holding something the seller still has to fill in. */
  incomplete?: boolean;
};

export default function Tabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: TabDef[];
  active: TabId;
  onSelect: (id: TabId) => void;
}) {
  const t = useTranslations('createListing.tabs');

  return (
    <div
      role="tablist"
      aria-label={t('label')}
      // Scrolls rather than wraps: on a phone the five tabs are wider than the
      // screen, and a wrapped second row reads as a different control.
      className="flex gap-1 overflow-x-auto border-b border-neutral-light -mx-1 px-1"
    >
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-primary-color text-primary-color'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-neutral-light'
            }`}
          >
            {t(tab.labelKey)}
            {tab.incomplete && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1 h-1.5 w-1.5 rounded-full bg-amber-500"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
