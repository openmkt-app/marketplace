'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';
import PriceFields from './PriceFields';
import { CATEGORIES, CONDITIONS } from '@/lib/category-data';
import { processExternalLink, getPlatformDisplayName } from '@/lib/external-link-utils';

/**
 * The listing itself: what it is called, what it costs, where it belongs, what
 * condition it is in, and how it is described.
 *
 * Commission fields live here too, shown only for a service — slots and a
 * turnaround are part of describing the offer, not a separate subject.
 */
export default function DetailsSection({ mode }: { mode: 'create' | 'edit' }) {
  const tCreate = useTranslations('createListing');
  const tCats = useTranslations('categories');
  const tSubs = useTranslations('subcategories');
  const tConds = useTranslations('conditions');
  const {
    title, setTitle,
    description, setDescription,
    condition, setCondition,
    priceInput,
    selectedCategory, setSelectedCategory,
    selectedSubcategory, setSelectedSubcategory,
    subcategories, setSubcategories,
    externalUrl, setExternalUrl,
    externalUrlError, setExternalUrlError,
    detectedPlatform, setDetectedPlatform,
    slotsAvailable, setSlotsAvailable,
    turnaroundTime, setTurnaroundTime,
    commissionOpen, setCommissionOpen,
    setIsOnlineStore, setIsLocationExpanded,
    isService, isPhysical,
  } = useListingForm();

  const isPriceZero =
    parseFloat(priceInput) === 0 || priceInput === '0' || priceInput === '0.0' || priceInput === '0.00';

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;

    setSelectedCategory(categoryId);
    // Reset subcategory when category changes
    setSelectedSubcategory('');

    // Auto-configure for digital arts commissions
    if (categoryId === 'digital_arts') {
      setIsOnlineStore(true);
      setIsLocationExpanded(false);
    }
  };

  // Handle Free category confirmation

  // Handle external URL changes
  const handleExternalUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setExternalUrl(url);
    setExternalUrlError(null);

    if (url.trim()) {
      const result = processExternalLink(url);
      if (!result.isValid) {
        setExternalUrlError(result.error || 'Invalid URL');
        setDetectedPlatform(null);
      } else {
        // First set platform from URL pattern (synchronous)
        setDetectedPlatform(result.platformName);

        // If no platform detected from URL, try async detection (for Shopify, etc.)
        if (!result.platformName) {
          try {
            const platformRes = await fetch(`/api/detect-platform?url=${encodeURIComponent(url)}`);
            const platformData = await platformRes.json();
            if (platformData.platformName) {
              setDetectedPlatform(platformData.platformName);
            }
          } catch (e) {
            // Non-blocking - just won't show platform badge
          }
        }
      }
    } else {
      setDetectedPlatform(null);
    }
  };

  // Handle Magic Link Auto-Fill

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">
        {isService ? tCreate('detailsHeaderCommission') : tCreate('detailsHeader')}
      </h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1">
            {isService ? tCreate('labelTitleCommission') : tCreate('labelTitle')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isService ? tCreate('placeholderTitleCommission') : tCreate('placeholderTitle')}
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>

        <PriceFields />

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('labelCategory')} <span className="text-red-500">*</span>
            {isPriceZero && priceInput !== '' && (
              <span className="ml-2 text-xs text-primary-color">
                {tCreate('labelCategoryFreeInfo')}
              </span>
            )}
          </label>
          <select
            id="category"
            name="category"
            required
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            <option value="">{tCreate('selectCategory')}</option>
            {/* "Free Stuff" is no longer offered: it duplicated the
                whole taxonomy and cost a free sofa its place under
                Furniture. Still listed for a record that already has
                it, so editing one does not silently reassign it. */}
            {CATEGORIES.filter(c => c.id !== 'free' || selectedCategory === 'free').map(category => (
              <option
                key={category.id}
                value={category.id}
              >
                {tCats(category.id)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subcategory" className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('labelSubcategory')}
          </label>
          <select
            id="subcategory"
            name="subcategory"
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            <option value="">{tCreate('selectSubcategory')}</option>
            {subcategories.map(subcategory => (
              <option key={subcategory.id} value={subcategory.id}>
                {tSubs(`${selectedCategory}.${subcategory.id}`)}
              </option>
            ))}
          </select>
        </div>

        {isService && (
          <div className="space-y-4 p-4 bg-rose-50 border border-rose-100 rounded-lg">
            <p className="text-sm font-semibold text-rose-800">{tCreate('commissionSettings')}</p>
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
        )}

        {isPhysical && (
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('labelCondition')} <span className="text-red-500">*</span>
          </label>
          <select
            id="condition"
            name="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            <option value="">{tCreate('selectCondition')}</option>
            {CONDITIONS.map(condition => (
              <option key={condition.id} value={condition.id}>
                {tConds(condition.id)}
              </option>
            ))}
          </select>
        </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
            {isService ? tCreate('labelDescriptionCommission') : tCreate('labelDescription')} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder={isService
              ? tCreate('placeholderDescriptionCommission')
              : tCreate('placeholderDescription')}
            className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>

        <div>
          <label htmlFor="externalUrl" className="block text-sm font-medium text-text-secondary mb-1">
            {tCreate('externalLink')}
          </label>
          <input
            type="url"
            id="externalUrl"
            name="externalUrl"
            value={externalUrl}
            onChange={handleExternalUrlChange}
            placeholder="https://amazon.com/dp/..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light ${externalUrlError ? 'border-red-400' : 'border-neutral-light'
              }`}
          />
          {externalUrlError && (
            <p className="text-sm text-red-500 mt-1">{externalUrlError}</p>
          )}
          {detectedPlatform && !externalUrlError && (
            <p className="text-sm text-green-600 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {tCreate('detectedPlatform', { platform: detectedPlatform })}
            </p>
          )}
          <p className="text-xs text-text-secondary mt-1">
            {tCreate('externalLinkDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
