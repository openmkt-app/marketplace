'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';
import { CURRENCIES } from '@/lib/price-utils';
import type { BillingPeriod } from '@/lib/commerce/types';

/**
 * Everything about what the buyer pays: the price, offers, a sale, how often
 * it recurs, and whether tax is already included.
 *
 * Rendered inside the details card rather than as a card of its own, so this
 * is a straight lift and the DOM is unchanged. It is a separate file because
 * price is about to become its own tab.
 */
export default function PriceFields() {
  const tCreate = useTranslations('createListing');
  const {
    currency, setCurrency,
    priceInput, setPriceInput,
    acceptingOffers, setAcceptingOffers,
    showSaleFields, setShowSaleFields,
    salePriceInput, setSalePriceInput,
    saleStartsAt, setSaleStartsAt,
    saleEndsAt, setSaleEndsAt,
    taxInclusive, setTaxInclusive,
    billingPeriod, setBillingPeriod,
    isService,
  } = useListingForm();

  // Handle price input changes with formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the input value without dollar sign
    const value = e.target.value.replace(/^\$/, '');

    // Remove any non-numeric characters except for decimal point
    // and only allow one decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

    // Split the value into whole and decimal parts
    const parts = sanitizedValue.split('.');
    let wholePart = parts[0];
    const decimalPart = parts[1];

    // Limit the whole part to 7 digits
    if (wholePart.length > 7) {
      wholePart = wholePart.substring(0, 7);
    }

    // Limit the decimal part to 2 digits if it exists
    let formattedValue = wholePart;
    if (decimalPart !== undefined) {
      formattedValue = `${wholePart}.${decimalPart.substring(0, 2)}`;
    }

    // Store the sanitized value
    setPriceInput(formattedValue);

    // The price no longer touches the category. Typing 0 used to move the
    // listing to "Free Stuff", and typing a price again wiped the category the
    // seller had chosen. Free is a price, not a kind of thing.
  };

  // Check if price is zero (for category locking)
  const isPriceZero = parseFloat(priceInput) === 0 || priceInput === '0' || priceInput === '0.0' || priceInput === '0.00';

  // Handle category selection changes

  return (
    <div>
      <label htmlFor="price" className="block text-sm font-medium text-text-secondary mb-1">
        {isService ? tCreate('labelPriceCommission') : tCreate('labelPrice')} <span className="text-red-500">*</span>
      </label>
      <div className="flex rounded-md shadow-sm">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-24 pl-3 pr-2 py-2 bg-neutral-light/30 border border-neutral-light border-r-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-light text-sm text-text-secondary cursor-pointer"
        >
          {CURRENCIES.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        <input
          type="text"
          id="price"
          name="price"
          required={!acceptingOffers}
          placeholder={acceptingOffers ? tCreate('placeholderPriceOffers') : '0.00'}
          value={priceInput}
          onChange={handlePriceChange}
          className="flex-1 w-full pl-3 pr-3 py-2 border border-neutral-light rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
      </div>

      {/* The honest answer to "I do not know what it is worth".
          Without it, sellers put 0 and explain in the
          description — which sorts first and ruins free
          filters for everyone. */}
      <label className="flex items-start gap-2 mt-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptingOffers}
          onChange={e => setAcceptingOffers(e.target.checked)}
          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary-color"
        />
        <span>
          <span className="text-sm font-medium text-text-secondary">{tCreate('labelAcceptingOffers')}</span>
          <span className="block text-xs text-text-secondary">
            {acceptingOffers ? tCreate('hintAcceptingOffersOn') : tCreate('hintAcceptingOffers')}
          </span>
        </span>
      </label>

      {/* Said plainly at the moment it applies, so nobody meets
          the rule for the first time as a rejection. */}
      {isPriceZero && priceInput.trim() !== '' && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          {tCreate('freeMeansFree')}
        </p>
      )}

      {/* A price that repeats is a different price. Without this
          the seller writes "$69/yr" in the title, where no filter
          or sort can read it and every comparison is wrong. */}
      {!isPriceZero && (
        <div className="mt-3">
          <label htmlFor="billingPeriod" className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('labelBillingPeriod')}
          </label>
          <select
            id="billingPeriod"
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value as '' | BillingPeriod)}
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            {/* Shortest first. A list that runs week, month,
                quarter, year, day reads as an accident. */}
            <option value="">{tCreate('billingOneOff')}</option>
            <option value="day">{tCreate('billingDay')}</option>
            <option value="week">{tCreate('billingWeek')}</option>
            <option value="month">{tCreate('billingMonth')}</option>
            <option value="quarter">{tCreate('billingQuarter')}</option>
            <option value="year">{tCreate('billingYear')}</option>
          </select>
          {billingPeriod && (
            <p className="mt-1 text-xs text-text-secondary">{tCreate('hintBillingPeriod')}</p>
          )}
        </div>
      )}

      {/* Sales are the exception, so the fields stay folded away
          until asked for — an always-visible sale price invites
          people to fill it in for no reason. */}
      {!isPriceZero && (
        <div className="mt-3">
          {!showSaleFields ? (
            <button
              type="button"
              onClick={() => setShowSaleFields(true)}
              className="text-sm text-primary-color hover:underline"
            >
              {tCreate('addSalePrice')}
            </button>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="salePrice" className="text-sm font-medium text-text-secondary">
                  {tCreate('labelSalePrice')}
                </label>
                <button
                  type="button"
                  onClick={() => { setShowSaleFields(false); setSalePriceInput(''); setSaleStartsAt(''); setSaleEndsAt(''); }}
                  className="text-xs text-text-secondary hover:underline"
                >
                  {tCreate('removeSalePrice')}
                </button>
              </div>
              <input
                type="text"
                id="salePrice"
                placeholder="0.00"
                value={salePriceInput}
                onChange={(e) => setSalePriceInput(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              <p className="text-xs text-text-secondary">{tCreate('hintSalePrice')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="saleStartsAt" className="block text-xs font-medium text-text-secondary mb-1">
                    {tCreate('labelSaleStarts')}
                  </label>
                  <input type="date" id="saleStartsAt" value={saleStartsAt} onChange={(e) => setSaleStartsAt(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light" />
                </div>
                <div>
                  <label htmlFor="saleEndsAt" className="block text-xs font-medium text-text-secondary mb-1">
                    {tCreate('labelSaleEnds')}
                  </label>
                  <input type="date" id="saleEndsAt" value={saleEndsAt} onChange={(e) => setSaleEndsAt(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light" />
                </div>
              </div>
              <p className="text-xs text-text-secondary">{tCreate('hintSaleDates')}</p>
            </div>
          )}
        </div>
      )}

      {/* Three states, not two: "not said" is the honest default
          and must survive a save, or every seller silently claims
          one tax treatment or the other. */}
      {!isPriceZero && (
        <div className="mt-3">
          <label htmlFor="taxInclusive" className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('labelTaxInclusive')}
          </label>
          <select
            id="taxInclusive"
            value={taxInclusive === undefined ? '' : taxInclusive ? 'yes' : 'no'}
            onChange={(e) => setTaxInclusive(e.target.value === '' ? undefined : e.target.value === 'yes')}
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            <option value="">{tCreate('taxNotSaid')}</option>
            <option value="yes">{tCreate('taxIncluded')}</option>
            <option value="no">{tCreate('taxExcluded')}</option>
          </select>
        </div>
      )}
    </div>
  );
}
