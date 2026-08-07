'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';
import { FIELD_CLASS } from '../state';

/**
 * How big and heavy the package is.
 *
 * Sits with delivery rather than with the catalogue identifiers it used to be
 * filed under: weight and size are facts about posting the thing, not about
 * cataloguing it. Only asked for something physical — neither a commission nor
 * a download has a package.
 */
export default function ShippingFields() {
  const tCreate = useTranslations('createListing');
  const { shippingWeight, setShippingWeight, dimL, setDimL, dimW, setDimW, dimH, setDimH, isPhysical } =
    useListingForm();
  const detailField = FIELD_CLASS;

  if (!isPhysical) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('shippingDetailsHeader')}</h2>
      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <label htmlFor="weight" className="block text-xs text-text-secondary mb-1">{tCreate('labelWeight')}</label>
          <input id="weight" type="number" min="0" step="any" value={shippingWeight} onChange={e => setShippingWeight(e.target.value)} className={detailField} />
        </div>
        <div>
          <label htmlFor="dimL" className="block text-xs text-text-secondary mb-1">{tCreate('labelLength')}</label>
          <input id="dimL" type="number" min="0" step="any" value={dimL} onChange={e => setDimL(e.target.value)} className={detailField} />
        </div>
        <div>
          <label htmlFor="dimW" className="block text-xs text-text-secondary mb-1">{tCreate('labelWidth')}</label>
          <input id="dimW" type="number" min="0" step="any" value={dimW} onChange={e => setDimW(e.target.value)} className={detailField} />
        </div>
        <div>
          <label htmlFor="dimH" className="block text-xs text-text-secondary mb-1">{tCreate('labelHeight')}</label>
          <input id="dimH" type="number" min="0" step="any" value={dimH} onChange={e => setDimH(e.target.value)} className={detailField} />
        </div>
      </div>
      <p className="text-xs text-text-secondary mt-1">{tCreate('hintShippingUnits')}</p>
    </div>
  );
}
