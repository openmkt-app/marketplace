'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';
import PriceFields from './PriceFields';

/**
 * The price tab: a card around the price fields.
 *
 * PriceFields used to render inside the details card. It is the same fields in
 * the same order — only the box around them changed, now that price is a tab of
 * its own rather than the middle of a longer form.
 */
export default function PriceSection() {
  const tCreate = useTranslations('createListing');
  const { isService } = useListingForm();

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">
        {isService ? tCreate('labelPriceCommission') : tCreate('labelPrice')}
      </h2>
      <PriceFields />
    </div>
  );
}
