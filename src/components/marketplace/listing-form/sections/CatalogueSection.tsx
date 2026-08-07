'use client';

import { useTranslations } from 'next-intl';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useListingForm } from '../context';
import { FIELD_CLASS } from '../state';

/**
 * Catalogue detail: identifiers, tags, specifications, stock and package size.
 *
 * All optional, all folded away. Someone selling one used chair needs none of
 * it, and a form that opens with twelve empty boxes reads as twelve things you
 * are expected to fill in.
 */

/** Move one row up or down, returning a new array. Out-of-range is a no-op. */
function moveRow<T>(rows: T[], from: number, delta: number): T[] {
  const to = from + delta;
  if (to < 0 || to >= rows.length) return rows;
  const next = [...rows];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export default function CatalogueSection() {
  const tCreate = useTranslations('createListing');
  const {
    showMoreDetails, setShowMoreDetails,
    sku, setSku, gtin, setGtin, brand, setBrand,
    tagsInput, setTagsInput, specs, setSpecs,
    manageStock, setManageStock, quantity, setQuantity,
    lowStockThreshold, setLowStockThreshold, soldIndividually, setSoldIndividually,
  } = useListingForm();
  const detailField = FIELD_CLASS;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <button
        type="button"
        onClick={() => setShowMoreDetails(v => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{tCreate('moreDetailsHeader')}</h2>
          <p className="text-sm text-text-secondary">{tCreate('moreDetailsDesc')}</p>
        </div>
        <span className="text-text-secondary text-sm">{showMoreDetails ? '−' : '+'}</span>
      </button>

      {showMoreDetails && (
        <div className="mt-5 space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-text-secondary mb-1">{tCreate('labelBrand')}</label>
              <input id="brand" value={brand} onChange={e => setBrand(e.target.value)} className={detailField} />
            </div>
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-text-secondary mb-1">{tCreate('labelSku')}</label>
              <input id="sku" value={sku} onChange={e => setSku(e.target.value)} className={detailField} />
            </div>
            <div>
              <label htmlFor="gtin" className="block text-sm font-medium text-text-secondary mb-1">{tCreate('labelGtin')}</label>
              <input id="gtin" value={gtin} onChange={e => setGtin(e.target.value)} className={detailField} placeholder="01234567890128" />
            </div>
          </div>
          <p className="text-xs text-text-secondary -mt-3">{tCreate('hintGtin')}</p>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-text-secondary mb-1">{tCreate('labelTags')}</label>
            <input id="tags" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className={detailField} placeholder={tCreate('placeholderTags')} />
            <p className="text-xs text-text-secondary mt-1">{tCreate('hintTags')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{tCreate('labelSpecs')}</label>
            <div className="space-y-2">
              {/* Order is meaningful — a feature list is read top to
                  bottom — and it is not the order things occur to
                  you. Buttons rather than drag: they work on a phone,
                  with a keyboard, and with a screen reader. */}
              {specs.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={row.name}
                    onChange={e => setSpecs(specs.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                    placeholder={tCreate('placeholderSpecName')}
                    className={`${detailField} flex-1`}
                  />
                  <input
                    value={row.value}
                    onChange={e => setSpecs(specs.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                    placeholder={tCreate('placeholderSpecValue')}
                    className={`${detailField} flex-1`}
                  />
                  <div className="flex flex-shrink-0">
                    <button type="button" onClick={() => setSpecs(moveRow(specs, i, -1))} disabled={i === 0}
                      className="px-1.5 text-text-secondary hover:text-primary-color disabled:opacity-25 disabled:hover:text-text-secondary"
                      aria-label={tCreate('moveSpecUp')}>
                      <ChevronUp size={16} />
                    </button>
                    <button type="button" onClick={() => setSpecs(moveRow(specs, i, 1))} disabled={i === specs.length - 1}
                      className="px-1.5 text-text-secondary hover:text-primary-color disabled:opacity-25 disabled:hover:text-text-secondary"
                      aria-label={tCreate('moveSpecDown')}>
                      <ChevronDown size={16} />
                    </button>
                    <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
                      className="px-2 text-text-secondary hover:text-red-600" aria-label={tCreate('removeSpec')}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setSpecs([...specs, { name: '', value: '' }])}
              className="mt-2 text-sm text-primary-color hover:underline">{tCreate('addSpec')}</button>
          </div>

          <div className="pt-4 border-t border-neutral-light">
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <input type="checkbox" checked={manageStock} onChange={e => setManageStock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-color" />
              {tCreate('labelManageStock')}
            </label>
            {manageStock && (
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-text-secondary mb-1">{tCreate('labelQuantity')}</label>
                  <input id="quantity" type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className={detailField} />
                </div>
                <div>
                  <label htmlFor="lowStock" className="block text-sm font-medium text-text-secondary mb-1">{tCreate('labelLowStock')}</label>
                  <input id="lowStock" type="number" min="0" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)} className={detailField} />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mt-3">
              <input type="checkbox" checked={soldIndividually} onChange={e => setSoldIndividually(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-color" />
              {tCreate('labelSoldIndividually')}
            </label>
          </div>

        </div>
      )}
    </div>
  );
}
