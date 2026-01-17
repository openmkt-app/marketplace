'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceListing } from '@/lib/marketplace-client';
import ListingImageDisplay from '@/components/marketplace/ListingImageDisplay';
import { Trash2, ExternalLink, AlertCircle, Edit } from 'lucide-react';
import { formatPrice } from '@/lib/price-utils';
import ConfirmationModal from '@/components/common/ConfirmationModal';

export default function MyListingsPage() {
  const { user, client, isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<(MarketplaceListing & { uri: string; cid: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<{ uri: string; title: string } | null>(null);

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !isLoggedIn) {
      router.push('/login?redirect=/my-listings');
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    const fetchListings = async () => {
      if (!user?.did || !client) return;

      try {
        setLoading(true);
        // Fetch only current user's listings
        const userListings = await client.getUserListings(user.did);
        setListings(userListings);
      } catch (err) {
        console.error('Failed to fetch user listings:', err);
        setError('Failed to load your listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn && user) {
      fetchListings();
    }
  }, [isLoggedIn, user, client]);

  const initiateDelete = (uri: string, title: string) => {
    setListingToDelete({ uri, title });
    setIsModalOpen(true);
  };

  const cancelDelete = () => {
    setIsModalOpen(false);
    setListingToDelete(null);
  };

  const confirmDelete = async () => {
    if (!client || !listingToDelete) return;

    try {
      setDeletingId(listingToDelete.uri);

      await client.deleteListing(listingToDelete.uri);

      // Remove from local state
      setListings(prev => prev.filter(l => l.uri !== listingToDelete.uri));
      setIsModalOpen(false);
      setListingToDelete(null);
    } catch (err) {
      console.error('Failed to delete listing:', err);
      // Close modal and show error alert or toast
      setIsModalOpen(false);
      alert('Failed to delete listing. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || (isLoggedIn && loading)) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
          <p className="text-gray-500 mt-1">Manage your items for sale</p>
        </div>
        <Link
          href="/create-listing"
          className="bg-primary-color text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-light transition-colors shadow-sm"
        >
          Create New Listing
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-2 mb-6">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="mx-auto h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No listings yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You haven't listed any items for sale. Start selling today to reach buyers across the AT Protocol network.
          </p>
          <Link
            href="/create-listing"
            className="text-primary-color font-medium hover:text-primary-light hover:underline"
          >
            Create your first listing &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div
              key={listing.uri}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
            >
              {/* Image Area */}
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                <ListingImageDisplay
                  listing={listing}
                  size="thumbnail"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {listing.hideFromFriends && (
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                    Hidden from Friends
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1" title={listing.title}>
                    {listing.title}
                  </h3>
                  <span className="font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg text-sm whitespace-nowrap">
                    {formatPrice(listing.price)}
                  </span>
                </div>

                <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                  {listing.description}
                </p>

                <div className="pt-4 border-t border-gray-50 flex items-center gap-2">
                  <Link
                    href={`/listing/${encodeURIComponent(listing.uri || '')}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gray-50 text-gray-700 font-medium text-sm hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink size={14} />
                    View
                  </Link>
                  <Link
                    href={`/edit-listing?uri=${encodeURIComponent(listing.uri || '')}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Edit size={14} />
                    Edit
                  </Link>
                  <button
                    onClick={() => initiateDelete(listing.uri, listing.title)}
                    disabled={deletingId === listing.uri}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-100 text-red-600 font-medium text-sm hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === listing.uri ? (
                      <span className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {deletingId === listing.uri ? 'Del...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Listing"
        message={`Are you sure you want to delete "${listingToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={!!deletingId}
      />
    </div>
  );
}
