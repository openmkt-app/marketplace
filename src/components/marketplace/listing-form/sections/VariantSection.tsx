'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';
import { NEW_GROUP, FIELD_CLASS } from '../state';

/**
 * Options and variants: which product this listing is one option of.
 *
 * Sits at the top of the form because choosing an existing product fills in
 * what the options share — asking for it after the seller has typed the
 * description means typing it twice. Folded away by default: most listings are
 * one thing, and a form that opens asking "which tier is this?" invites people
 * to invent a product structure they do not have.
 */
export default function VariantSection() {
  const tCreate = useTranslations('createListing');
  const {
    isVariant, setIsVariant,
    groups, groupUri, setGroupUri,
    groupTitle, setGroupTitle,
    axisName, setAxisName,
    optionValue, setOptionValue,
  } = useListingForm();
  const detailField = FIELD_CLASS;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isVariant}
          onChange={e => setIsVariant(e.target.checked)}
          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary-color"
        />
        <span>
          <span className="text-sm font-medium text-text-primary">{tCreate('labelIsVariant')}</span>
          <span className="block text-xs text-text-secondary">{tCreate('hintIsVariant')}</span>
        </span>
      </label>

      {isVariant && (
        <div className="mt-4 space-y-3 pl-6">
          <div>
            <label htmlFor="groupUri" className="block text-sm font-medium text-text-secondary mb-1">
              {tCreate('labelProduct')}
            </label>
            <select
              id="groupUri"
              value={groupUri}
              onChange={e => setGroupUri(e.target.value)}
              className={detailField}
            >
              <option value={NEW_GROUP}>{tCreate('newProduct')}</option>
              {groups.map(group => (
                <option key={group.uri} value={group.uri}>{group.title}</option>
              ))}
              {/* The product this listing already belongs to, when
                  the list has not arrived yet or did not load. Without
                  it the select would silently show a different
                  product than the one about to be saved. */}
              {groupUri !== NEW_GROUP && !groups.some(g => g.uri === groupUri) && (
                <option value={groupUri}>{tCreate('currentProduct')}</option>
              )}
            </select>
          </div>

          {/* Only for a new product. Joining an existing one adopts
              its name and what its options are called — letting a
              second listing rename either would split the product. */}
          {groupUri === NEW_GROUP && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="groupTitle" className="block text-sm font-medium text-text-secondary mb-1">
                  {tCreate('labelProductName')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="groupTitle"
                  type="text"
                  value={groupTitle}
                  onChange={e => setGroupTitle(e.target.value)}
                  placeholder={tCreate('placeholderProductName')}
                  className={detailField}
                />
              </div>
              <div>
                <label htmlFor="axisName" className="block text-sm font-medium text-text-secondary mb-1">
                  {tCreate('labelAxisName')}
                </label>
                <input
                  id="axisName"
                  type="text"
                  value={axisName}
                  onChange={e => setAxisName(e.target.value)}
                  placeholder={tCreate('variantAxisDefault')}
                  className={detailField}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="optionValue" className="block text-sm font-medium text-text-secondary mb-1">
              {tCreate('labelOptionValue', { axis: axisName.trim() || tCreate('variantAxisDefault') })}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="optionValue"
              type="text"
              value={optionValue}
              onChange={e => setOptionValue(e.target.value)}
              placeholder={tCreate('placeholderOptionValue')}
              className={detailField}
            />
            <p className="mt-1 text-xs text-text-secondary">{tCreate('hintOptionValue')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
