'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';

/**
 * Whether the seller is taking this work on, and how much of it.
 *
 * Its own tab, and only for a service. For a commission artist these are the
 * fields that decide whether a buyer gets in touch at all — buried under
 * "details" they read as an afterthought.
 */
export default function AvailabilitySection({ mode }: { mode: 'create' | 'edit' }) {
  const tCreate = useTranslations('createListing');
  const {
    slotsAvailable, setSlotsAvailable,
    turnaroundTime, setTurnaroundTime,
    commissionOpen, setCommissionOpen,
  } = useListingForm();

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('commissionSettings')}</h2>
      <div className="space-y-4">
        {/* Edit only. A listing is never published closed, so on
            create this is a question with one sensible answer —
            it just adds noise. Sellers close commissions later,
            when they are full or away. */}
        {mode === 'edit' && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('commissionAvailability')}
          </label>
          <div className="flex gap-2">
            {(['open', 'closed'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setCommissionOpen(value)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  commissionOpen === value
                    ? 'border-rose-600 bg-rose-600 text-white'
                    : 'border-neutral-light bg-white text-text-secondary hover:border-rose-300'
                }`}
              >
                {tCreate(value === 'open' ? 'commissionOpenLabel' : 'commissionClosedLabel')}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-1">{tCreate('commissionAvailabilityDesc')}</p>
        </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('openSlots')}{' '}
            <span className="text-xs font-normal text-text-secondary">{tCreate('openSlotsDesc')}</span>
          </label>
          <input
            type="number"
            min="0"
            value={slotsAvailable}
            onChange={(e) => setSlotsAvailable(e.target.value)}
            placeholder="e.g. 3"
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
          {slotsAvailable !== '' && parseInt(slotsAvailable, 10) === 0 && (
            <p className="text-xs text-amber-600 mt-1">{tCreate('waitlistNote')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('turnaroundTime')}{' '}
            <span className="text-xs font-normal text-text-secondary">{tCreate('openSlotsDesc')}</span>
          </label>
          <input
            type="text"
            value={turnaroundTime}
            onChange={(e) => setTurnaroundTime(e.target.value)}
            placeholder={tCreate('turnaroundTimePlaceholder')}
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>
      </div>
    </div>
  );
}
