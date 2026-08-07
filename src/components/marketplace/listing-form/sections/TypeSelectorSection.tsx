'use client';

import { useTranslations } from 'next-intl';
import { Package, Palette, Download } from 'lucide-react';
import { useListingForm } from '../context';

/**
 * What the seller is offering: a physical thing, a commission, or a download.
 *
 * The listing's own type, not a guess from its category. Gallery and Mall
 * routing key on this, so a seller can offer a service without being forced
 * into one particular category.
 */
export default function TypeSelectorSection() {
  const tCreate = useTranslations('createListing');
  const {
    listingType, setListingType, isService, isDigital,
    setSelectedCategory, setSelectedSubcategory,
    setIsOnlineStore, setIsLocationExpanded,
  } = useListingForm();

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('sellingHeader')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              if (listingType !== 'goods') {
                setListingType('goods');
                setSelectedCategory('');
                setSelectedSubcategory('');
                setIsOnlineStore(false);
              }
            }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
              listingType === 'goods'
                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                : 'border-neutral-light bg-white text-text-secondary hover:border-slate-300'
            }`}
          >
            <Package size={24} />
            <span className="font-semibold text-sm">{tCreate('physicalProduct')}</span>
            <span className={`text-xs text-center leading-tight ${listingType === 'goods' ? 'text-slate-300' : 'text-text-secondary'}`}>
              {tCreate('physicalProductDesc')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isService) {
                setListingType('service');
                // Seeded, not forced: the category can be changed
                // afterwards without the listing stopping being a
                // service, which is the whole point of the split.
                setSelectedCategory('digital_arts');
                setSelectedSubcategory('');
                setIsOnlineStore(true);
                setIsLocationExpanded(false);
              }
            }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
              isService
                ? 'border-rose-600 bg-rose-600 text-white shadow-md'
                : 'border-neutral-light bg-white text-text-secondary hover:border-rose-300'
            }`}
          >
            <Palette size={24} />
            <span className="font-semibold text-sm">{tCreate('digitalArts')}</span>
            <span className={`text-xs text-center leading-tight ${isService ? 'text-rose-200' : 'text-text-secondary'}`}>
              {tCreate('digitalArtsDesc')}
            </span>
          </button>
          {/* A licence or a download: nothing is posted, and the buyer
              gets it wherever the seller sends them. Separate from a
              commission, which is work done for one person. */}
          <button
            type="button"
            onClick={() => {
              if (!isDigital) {
                setListingType('digital');
                setSelectedCategory('digital');
                setSelectedSubcategory('');
                setIsOnlineStore(true);
                setIsLocationExpanded(false);
              }
            }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
              isDigital
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                : 'border-neutral-light bg-white text-text-secondary hover:border-indigo-300'
            }`}
          >
            <Download size={24} />
            <span className="font-semibold text-sm">{tCreate('digitalProduct')}</span>
            <span className={`text-xs text-center leading-tight ${isDigital ? 'text-indigo-200' : 'text-text-secondary'}`}>
              {tCreate('digitalProductDesc')}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
