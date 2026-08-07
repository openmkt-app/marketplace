'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useListingForm } from '../context';

/**
 * The cross-post choice and the submit button.
 *
 * Sharing is offered only when creating: an edit is not an announcement, and
 * a listing hidden from followers has nowhere to be shared to.
 */
export default function SubmitSection({ mode }: { mode: 'create' | 'edit' }) {
  const tCreate = useTranslations('createListing');
  const {
    postToBluesky, setPostToBluesky, hideFromFriends,
    isSubmitting, isFollowingBotState, isCheckingFollow,
  } = useListingForm();

  return (
    <>
      {/* Post to Bluesky Checkbox (Create Mode Only) */}
      {mode === 'create' && (
        <div className={`border p-4 rounded-lg flex items-start ${hideFromFriends ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex items-center h-5">
            <input
              id="postToBluesky"
              name="postToBluesky"
              type="checkbox"
              checked={postToBluesky && !hideFromFriends}
              disabled={hideFromFriends}
              onChange={(e) => setPostToBluesky(e.target.checked)}
              className="focus:ring-primary-500 h-4 w-4 text-primary-color border-gray-300 rounded disabled:opacity-50"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="postToBluesky" className={`font-medium ${hideFromFriends ? 'text-gray-500' : 'text-blue-900'}`}>
              {tCreate('shareToFeed')}
            </label>
            <p className={hideFromFriends ? 'text-gray-500' : 'text-blue-700'}>
              {hideFromFriends ? tCreate('shareBlockedByHide') : tCreate('shareToFeedDesc')}
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-sm text-text-secondary mb-4">
          {tCreate('legalWarning')}
        </p>

        <button
          type="submit"
          disabled={isSubmitting || (!isFollowingBotState && !isCheckingFollow)}
          className="w-full py-3 px-4 bg-primary-color hover:bg-primary-light text-white font-medium rounded-md focus:outline-none focus:ring-4 focus:ring-primary-light disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? (mode === 'edit' ? tCreate('submitLoading') : tCreate('submitLoading'))
            : (mode === 'edit' ? tCreate('submitEdit') : tCreate('submitCreate'))}
        </button>
      </div>
    </>
  );
}
