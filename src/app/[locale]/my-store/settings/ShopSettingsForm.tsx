'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { InsufficientScopeError } from '@/lib/marketplace-client';
import { CURRENCIES } from '@/lib/price-utils';
import type { Shop, ShopInput, ShopStatus } from '@/lib/commerce/types';
import { Loader2 } from 'lucide-react';

/**
 * The shop form.
 *
 * A shop record already exists for anyone who has saved a listing — it is
 * created automatically with just their handle, because a listing's shopRef is
 * required and has to point somewhere. This is where the rest gets filled in.
 *
 * `logo` and `banner` are in the lexicon but not offered here: store pages use
 * the seller's Bluesky avatar and banner, and a second pair of images to keep
 * in sync buys nothing today.
 */

/**
 * Bring a status message into view when it appears.
 *
 * The banners render at the top of a long form, so a save from the bottom of
 * the page showed "Saved." somewhere off screen and looked like nothing had
 * happened. Scrolling is the message; without it the message is not delivered.
 */
function useScrollToMessage(ref: React.RefObject<HTMLElement | null>, show: boolean) {
  useEffect(() => {
    if (show) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [ref, show]);
}

/** "USD" -> "US Dollar", in the viewer's language. Empty when Intl has no name. */
function currencyName(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(code);
    return name && name !== code ? name : '';
  } catch {
    return '';
  }
}

/** Comma or space separated, any case -> ["US", "CA"]. */
function parseCountryCodes(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map(c => c.trim().toUpperCase())
        .filter(c => /^[A-Z]{2}$/.test(c)),
    ),
  );
}

export default function ShopSettingsForm() {
  const t = useTranslations('shopSettings');
  const locale = useLocale();
  const router = useRouter();
  const { client, user, isLoggedIn, isLoading: authLoading, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [saved, setSaved] = useState(false);

  const messageRef = useRef<HTMLDivElement>(null);
  useScrollToMessage(messageRef, saved || !!error || needsReauth);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [handlingTime, setHandlingTime] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [shipsTo, setShipsTo] = useState('');
  const [returns, setReturns] = useState('');
  const [shipping, setShipping] = useState('');
  const [terms, setTerms] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [status, setStatus] = useState<ShopStatus>('open');
  const [statusMessage, setStatusMessage] = useState('');
  const [reopensAt, setReopensAt] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace('/login?redirect=/my-store/settings');
      return;
    }
    if (!client) return;

    let cancelled = false;
    client.getShop().then((shop: Shop | null) => {
      if (cancelled) return;
      if (shop) {
        // A name equal to the handle is the one the record was created with,
        // not one the seller chose, so the field reads as empty and the
        // placeholder shows what the store is actually called today.
        setName(shop.name && shop.name !== user?.handle ? shop.name : '');
        setDescription(shop.description || '');
        setWebsite(shop.website || '');
        setHandlingTime(shop.handlingTime || '');
        setDefaultCurrency(shop.defaultCurrency || 'USD');
        setShipsTo((shop.shipsTo || []).join(', '));
        setReturns(shop.policies?.returns || '');
        setShipping(shop.policies?.shipping || '');
        setTerms(shop.policies?.terms || '');
        setPrivacy(shop.policies?.privacy || '');
        setStatus(shop.status || 'open');
        setStatusMessage(shop.statusMessage || '');
        // <input type="date"> wants YYYY-MM-DD, the record holds a datetime.
        setReopensAt(shop.reopensAt ? shop.reopensAt.slice(0, 10) : '');
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [authLoading, isLoggedIn, client, user?.handle, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const policies = {
      returns: returns.trim() || undefined,
      shipping: shipping.trim() || undefined,
      terms: terms.trim() || undefined,
      privacy: privacy.trim() || undefined,
    };

    const input: ShopInput = {
      // The lexicon requires a name, so an empty field writes the handle.
      // getStoreName treats that as "not chosen" and the store falls back to
      // the seller's Bluesky display name — clearing the field reverts rather
      // than erroring.
      name: name.trim() || user?.handle || '',
      description: description.trim() || undefined,
      website: website.trim() || undefined,
      handlingTime: handlingTime.trim() || undefined,
      defaultCurrency: defaultCurrency || undefined,
      shipsTo: parseCountryCodes(shipsTo),
      status,
      statusMessage: statusMessage.trim() || undefined,
      // End of the chosen day, so "back on the 20th" includes the 20th.
      reopensAt: reopensAt ? new Date(`${reopensAt}T23:59:59Z`).toISOString() : undefined,
      policies: Object.values(policies).some(Boolean) ? policies : undefined,
    };

    try {
      await client.updateShop(input);
      setSaved(true);
    } catch (err) {
      if (err instanceof InsufficientScopeError) {
        setNeedsReauth(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-color" size={32} />
      </div>
    );
  }

  const field = 'w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light';
  const label = 'block text-sm font-medium text-text-secondary mb-1';
  const hint = 'text-xs text-text-secondary mt-1';

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-sm text-text-secondary mt-1">{t('subtitle')}</p>
      </div>

      <div ref={messageRef}>
      {needsReauth && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded">
          <p className="font-semibold mb-1">{t('reauthTitle')}</p>
          <p className="mb-3 text-sm">{t('reauthBody')}</p>
          <button type="button" onClick={() => logout()} className="px-4 py-2 bg-primary-color hover:bg-primary-light text-white rounded-md text-sm">
            {t('reauthAction')}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded flex items-center justify-between gap-4">
          <span>{t('saved')}</span>
          {user?.handle && (
            <button type="button" onClick={() => router.push(`/store/${user.handle}`)} className="text-sm font-medium underline">
              {t('viewStore')}
            </button>
          )}
        </div>
      )}

      </div>

      <section className="bg-white p-6 rounded-lg border border-neutral-light space-y-4">
        <div>
          <label htmlFor="name" className={label}>{t('labelName')}</label>
          <input
            id="name"
            className={field}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={200}
            placeholder={user?.displayName || user?.handle || ''}
          />
          <p className={hint}>{t('hintName')}</p>
        </div>
        <div>
          <label htmlFor="description" className={label}>{t('labelDescription')}</label>
          <textarea id="description" className={field} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          <p className={hint}>{t('hintDescription')}</p>
        </div>
        <div>
          <label htmlFor="website" className={label}>{t('labelWebsite')}</label>
          <input id="website" type="url" className={field} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg border border-neutral-light space-y-4">
        <h2 className="font-semibold text-text-primary">{t('statusHeader')}</h2>
        <p className={hint}>{t('statusDesc')}</p>
        <div className="flex flex-wrap gap-2">
          {(['open', 'vacation', 'closed'] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                status === value
                  ? 'border-primary-color bg-primary-color text-white'
                  : 'border-neutral-light bg-white text-text-secondary hover:border-primary-light'
              }`}
            >
              {t(`status_${value}`)}
            </button>
          ))}
        </div>

        {/* Only asked once the shop is not open — an open shop has nothing to
            explain and no date to come back on. */}
        {status !== 'open' && (
          <>
            <div>
              <label htmlFor="statusMessage" className={label}>{t('labelStatusMessage')}</label>
              <input
                id="statusMessage"
                className={field}
                value={statusMessage}
                onChange={e => setStatusMessage(e.target.value)}
                maxLength={300}
                placeholder={t('placeholderStatusMessage')}
              />
            </div>
            {status === 'vacation' && (
              <div>
                <label htmlFor="reopensAt" className={label}>{t('labelReopensAt')}</label>
                <input id="reopensAt" type="date" className={field} value={reopensAt} onChange={e => setReopensAt(e.target.value)} />
                <p className={hint}>{t('hintReopensAt')}</p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-white p-6 rounded-lg border border-neutral-light space-y-4">
        <h2 className="font-semibold text-text-primary">{t('shippingHeader')}</h2>
        <div>
          <label htmlFor="handlingTime" className={label}>{t('labelHandlingTime')}</label>
          <input id="handlingTime" className={field} value={handlingTime} onChange={e => setHandlingTime(e.target.value)} placeholder={t('placeholderHandlingTime')} />
        </div>
        <div>
          <label htmlFor="shipsTo" className={label}>{t('labelShipsTo')}</label>
          <input id="shipsTo" className={field} value={shipsTo} onChange={e => setShipsTo(e.target.value)} placeholder="US, CA, GB" />
          <p className={hint}>{t('hintShipsTo')}</p>
        </div>
        <div>
          <label htmlFor="defaultCurrency" className={label}>{t('labelCurrency')}</label>
          <select id="defaultCurrency" className={field} value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)}>
            {CURRENCIES.map(code => (
              <option key={code} value={code}>{code}{currencyName(code, locale) ? ` — ${currencyName(code, locale)}` : ''}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg border border-neutral-light space-y-4">
        <h2 className="font-semibold text-text-primary">{t('policiesHeader')}</h2>
        <p className={hint}>{t('hintPolicies')}</p>
        {([
          ['returns', returns, setReturns],
          ['shipping', shipping, setShipping],
          ['terms', terms, setTerms],
          ['privacy', privacy, setPrivacy],
        ] as const).map(([key, value, setter]) => (
          <div key={key}>
            <label htmlFor={key} className={label}>{t(`labelPolicy_${key}`)}</label>
            <textarea id={key} className={field} rows={2} value={value} onChange={e => setter(e.target.value)} />
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="px-6 py-2 bg-primary-color hover:bg-primary-light text-white rounded-md disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 className="animate-spin" size={16} />}
          {saving ? t('saving') : t('save')}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-neutral-light rounded-md hover:bg-neutral-light/50">
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
