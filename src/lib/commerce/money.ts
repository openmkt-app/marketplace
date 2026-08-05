// Money handling for the commerce lexicon.
//
// Amounts are integers in minor currency units. The number of minor units per
// major unit comes from ISO 4217 and is NOT always 100 — JPY has no minor unit,
// KWD and BHD have three. `price-utils.ts` hardcodes 2 decimal places while
// CURRENCIES already lists JPY and KWD, so ¥1000 currently renders "¥1,000.00".
//
// NOTE: happyview/scripts/listListings.lua implements the same conversion for
// records read through the AppView. The two must agree — if you edit the tables
// below, edit the Lua too.

/** Currencies with no minor unit: the integer amount IS the major amount. */
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/** Currencies with three minor digits: 1000 units = 1.000 major. */
const THREE_DECIMAL = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND',
]);

export const DEFAULT_CURRENCY = 'USD';

/** ISO 4217 minor-unit exponent. Defaults to 2 for unknown codes. */
export function exponentFor(currency?: string): number {
  if (!currency) return 2;
  const code = currency.trim().toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/**
 * Convert a human amount to minor units.
 *
 * Accepts the messy v1 strings ("$1,250.00", "1250", "1.250,00" is NOT handled —
 * v1 always wrote a plain decimal). Returns null when nothing numeric is present
 * so callers can distinguish "no price" from "free".
 */
export function toMinorUnits(value: string | number | null | undefined, currency?: string): number | null {
  if (value === null || value === undefined || value === '') return null;

  const cleaned = typeof value === 'number' ? String(value) : value.replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;

  return Math.round(parsed * 10 ** exponentFor(currency));
}

/** Convert minor units back to a major-unit number. */
export function fromMinorUnits(amount: number, currency?: string): number {
  return amount / 10 ** exponentFor(currency);
}

/**
 * Format an amount in minor units for display.
 *
 * Unlike the legacy formatPrice, the fraction digits follow the currency rather
 * than being pinned to 2, so JPY renders "¥1,000" and KWD "KWD 1.500".
 */
export function formatMinorUnits(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  locale: string = 'en-US',
  freeLabel: string = 'Free',
): string {
  if (amount === null || amount === undefined) return '';
  if (amount === 0) return freeLabel;

  const digits = exponentFor(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(fromMinorUnits(amount, currency));
  } catch {
    // Unknown currency code — Intl throws rather than degrading.
    return `${fromMinorUnits(amount, currency).toFixed(digits)} ${currency}`;
  }
}

/** The amount a buyer pays right now, accounting for an active sale window. */
export function effectiveAmount(
  pricing: { regularPrice: number | null; salePrice?: number | null; saleStartsAt?: string; saleEndsAt?: string },
  now: Date = new Date(),
): number | null {
  if (pricing.salePrice === null || pricing.salePrice === undefined) return pricing.regularPrice;

  const started = !pricing.saleStartsAt || new Date(pricing.saleStartsAt) <= now;
  const notEnded = !pricing.saleEndsAt || new Date(pricing.saleEndsAt) > now;

  return started && notEnded ? pricing.salePrice : pricing.regularPrice;
}

export function isOnSale(
  pricing: { regularPrice: number | null; salePrice?: number | null; saleStartsAt?: string; saleEndsAt?: string },
  now: Date = new Date(),
): boolean {
  const effective = effectiveAmount(pricing, now);
  return effective !== null && effective !== pricing.regularPrice;
}
