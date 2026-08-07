'use client';

import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';

/**
 * Who can see this listing: the follower filter and the NSFW self-label.
 *
 * Lifted out of CreateListingForm unchanged. Reads its two switches from the
 * form context rather than a closure, which is the whole point of the split.
 */
export default function VisibilitySection() {
  const tCreate = useTranslations('createListing');
  const { hideFromFriends, setHideFromFriends, isNsfw, setIsNsfw } = useListingForm();

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('visibilityHeader')}</h2>

      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-text-secondary">{tCreate('hideFromFriends')}</span>
          <p className="text-sm text-text-secondary">{tCreate('hideFromFriendsDesc')}</p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={hideFromFriends}
            onChange={() => setHideFromFriends(!hideFromFriends)}
          />
          <div className="relative w-11 h-6 bg-neutral-light peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-color"></div>
        </label>
      </div>

      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
        <div>
          <span className="font-medium text-text-secondary items-center flex gap-2">
            {tCreate('markNsfw')}
          </span>
          <p className="text-sm text-text-secondary max-w-[85%]">
            {tCreate('markNsfwDesc')}
          </p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isNsfw}
            onChange={() => setIsNsfw(!isNsfw)}
          />
          <div className="relative w-11 h-6 bg-neutral-light peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
        </label>
      </div>
    </div>
  );
}
