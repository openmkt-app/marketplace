'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

type Seller = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  listingCount: number;
};

const PAGE_SIZE = 48;

export default function ManageDIDsPage() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn || !user || user.handle !== 'openmkt.app') {
      router.push('/');
      return;
    }
    loadSellers();
  }, [isLoggedIn, user, isLoading, router]);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/sellers');
      if (res.ok) {
        const data = await res.json();
        setSellers(data.sellers || []);
      }
    } catch (e) {
      console.error('Failed to load sellers', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sellers.filter(s =>
    !search ||
    s.handle.toLowerCase().includes(search.toLowerCase()) ||
    (s.displayName?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalListings = sellers.reduce((sum, s) => sum + s.listingCount, 0);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Seller Registry</h1>
        <p className="text-slate-500 mt-1">Everyone who has registered on Open Market</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-500">Total Sellers</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{sellers.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-500">Total Listings</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{totalListings}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-500">Avg Listings / Seller</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {sellers.length ? (totalListings / sellers.length).toFixed(1) : '—'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by handle or name..."
          className="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-color/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          Loading sellers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          No sellers found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map(seller => (
              <div key={seller.did} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden relative">
                  {seller.avatar ? (
                    <Image
                      src={seller.avatar}
                      alt={seller.handle}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                      {(seller.displayName || seller.handle).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {seller.displayName || seller.handle}
                  </p>
                  <p className="text-xs text-slate-400 truncate">@{seller.handle}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className={`font-semibold ${seller.listingCount === 0 ? 'text-slate-400' : 'text-primary-color'}`}>
                      {seller.listingCount}
                    </span>{' '}
                    {seller.listingCount === 1 ? 'listing' : 'listings'}
                  </p>
                </div>

                {/* Actions */}
                <a
                  href={`/store/${seller.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Store
                </a>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page + 1} of {totalPages} &middot; {filtered.length} sellers
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Debug Tools */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Debug Tools</h3>
        <button
          onClick={() => {
            if (confirm('Reset bot registration status? This will re-trigger the "Auto-Follow" flow on next login.')) {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('bot-registered-')) localStorage.removeItem(key);
              });
              alert('Registration status reset.');
            }
          }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-300"
        >
          Reset "Auto-Follow" Status
        </button>
      </div>
    </div>
  );
}
