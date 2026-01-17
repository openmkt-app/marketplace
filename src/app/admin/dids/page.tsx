'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getKnownMarketplaceDIDs, addMarketplaceDID } from '@/lib/marketplace-dids';
import { fetchListingsFromDID } from '@/lib/fetch-specific-listing';

export default function ManageDIDsPage() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  /* State for verified vs local DIDs */
  const [localDids, setLocalDids] = useState<string[]>([]);
  const [verifiedDids, setVerifiedDids] = useState<string[]>([]);

  /* Form State */
  const [newDid, setNewDid] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // If loading, wait
    if (isLoading) return;

    // Check if logged in and is admin
    const adminHandle = 'openmkt.app'; // Harcoded for verification

    if (!isLoggedIn || !user || user.handle !== adminHandle) {
      router.push('/');
      return;
    }

    loadDIDs();
  }, [isLoggedIn, user, isLoading, router]);

  const loadDIDs = async () => {
    // 1. Get verified sellers from API
    try {
      const { fetchVerifiedSellers } = await import('@/lib/marketplace-dids');
      const verified = await fetchVerifiedSellers();
      setVerifiedDids(verified);
    } catch (e) {
      console.error('Failed to load verified sellers', e);
    }

    // 2. Get local DIDs
    const knownDIDs = getKnownMarketplaceDIDs();
    // Filter out verified ones for the "Local" list to avoid duplication in display
    // or just show them all?
    // Let's show "Local Only" in the local list.
    // Actually getKnownMarketplaceDIDs now returns merged list.
    // We need a way to get *just* local ones if we want to separate them?
    // marketplace-dids export 'KNOWN_MARKETPLACE_DIDS' array which is the local one?
    // Yes, but it might have been merged if we modified it. 
    // In my previous edit I made getKnownMarketplaceDIDs return merged.
    // But KNOWN_MARKETPLACE_DIDS export is the array.

    // We can infer local ones by filtering knownDIDs where !verified.includes(did)
    const all = getKnownMarketplaceDIDs();
    // We'll set verified in state, then filter 'all' locally

    // Wait, fetchVerifiedSellers is async.
    // Let's just use the result we got.
  };

  // Re-run this separation when verifiedDids updates
  useEffect(() => {
    const all = getKnownMarketplaceDIDs();
    // Local = All minus Verified
    const local = all.filter(d => !verifiedDids.includes(d));
    setLocalDids(local);
  }, [verifiedDids]);

  const handleAddDID = async () => {
    setError(null);
    setSuccess(null);

    if (!newDid.trim()) {
      setError('Please enter a DID');
      return;
    }

    if (!newDid.startsWith('did:')) {
      setError('DID must start with "did:"');
      return;
    }

    if (localDids.includes(newDid) || verifiedDids.includes(newDid)) {
      setError('This DID is already in the list');
      return;
    }

    setVerifying(true);

    try {
      // Try to fetch listings from this DID to verify it exists
      const listings = await fetchListingsFromDID(newDid);

      // Add the DID regardless of whether it has listings
      addMarketplaceDID(newDid);

      // Update local state
      const all = getKnownMarketplaceDIDs();
      setLocalDids(all.filter(d => !verifiedDids.includes(d)));

      setNewDid('');

      if (listings.length > 0) {
        setSuccess(`Added DID successfully! Found ${listings.length} listing(s).`);
      } else {
        setSuccess('Added DID successfully! No listings found yet, but they can be created later.');
      }
    } catch (err) {
      setError(`Failed to verify DID: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleClearStorage = () => {
    if (confirm('Are you sure you want to clear the stored DIDs? This will only remove locally added DIDs.')) {
      localStorage.removeItem('marketplace-dids');
      window.location.reload();
    }
  };

  const handleResetBotRegistration = () => {
    if (confirm('Reset bot registration status? This will make the app attempt to "Auto-Follow" you again on next login.')) {
      // Clear all keys starting with bot-registered-
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('bot-registered-')) {
          localStorage.removeItem(key);
        }
      });
      alert('Registration status reset. Please log out and log back in (or refresh).');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Marketplace DIDs</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="font-bold">What are Marketplace DIDs?</p>
        <p className="text-sm text-gray-700 mt-2">
          This is a list of AT Protocol DIDs (Decentralized Identifiers) for users who have created marketplace listings.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-bold text-green-700">Verified Sellers</h3>
            <p className="text-xs text-gray-600">Following the @openmkt.app bot. Discovered automatically by all users.</p>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-bold text-gray-700">Local Sellers</h3>
            <p className="text-xs text-gray-600">Manually added. Only visible to this browser unless they become verified.</p>
          </div>
        </div>
      </div>

      {/* Add new DID */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New DID</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDid}
            onChange={(e) => setNewDid(e.target.value)}
            placeholder="did:plc:xxx"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            disabled={verifying}
          />
          <button
            onClick={handleAddDID}
            disabled={verifying}
            className="btn-primary"
          >
            {verifying ? 'Verifying...' : 'Add DID'}
          </button>
        </div>
        {error && <div className="mt-4 bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>}
        {success && <div className="mt-4 bg-green-100 text-green-700 px-4 py-3 rounded">{success}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verified DIDs list */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-green-700 flex items-center gap-2">
              Verified Registry
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{verifiedDids.length}</span>
            </h2>
          </div>
          {verifiedDids.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No verified sellers found.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {verifiedDids.map((did, index) => (
                <div key={index} className="bg-green-50 border border-green-100 rounded p-2 text-xs font-mono break-all flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  {did}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local DIDs list */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
              Local Storage
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">{localDids.length}</span>
            </h2>
            <button onClick={handleClearStorage} className="text-xs text-red-500 hover:text-red-700 underline">
              Clear
            </button>
          </div>
          {localDids.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No local overrides.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {localDids.map((did, index) => (
                <div key={index} className="bg-gray-50 border border-gray-100 rounded p-2 text-xs font-mono break-all">
                  {did}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Debug Tools</h3>
        <button
          onClick={handleResetBotRegistration}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors border border-gray-300"
        >
          Reset "Auto-Follow" Status
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Click this if you want to re-trigger the "Bot Follows User" flow on your next login.
        </p>
      </div>
    </div >
  );
}
