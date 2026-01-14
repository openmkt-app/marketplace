'use client';

import { useState, useEffect } from 'react';
import { getKnownMarketplaceDIDs, addMarketplaceDID } from '@/lib/marketplace-dids';
import { fetchListingsFromDID } from '@/lib/fetch-specific-listing';

export default function ManageDIDsPage() {
  const [dids, setDids] = useState<string[]>([]);
  const [newDid, setNewDid] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDIDs();
  }, []);

  const loadDIDs = () => {
    const knownDIDs = getKnownMarketplaceDIDs();
    setDids(knownDIDs);
  };

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

    if (dids.includes(newDid)) {
      setError('This DID is already in the list');
      return;
    }

    setVerifying(true);

    try {
      // Try to fetch listings from this DID to verify it exists
      const listings = await fetchListingsFromDID(newDid);

      // Add the DID regardless of whether it has listings
      addMarketplaceDID(newDid);
      loadDIDs();
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
    if (confirm('Are you sure you want to clear the stored DIDs? This will reset to the default list.')) {
      localStorage.removeItem('marketplace-dids');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Marketplace DIDs</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="font-bold">What are Marketplace DIDs?</p>
        <p className="text-sm text-gray-700 mt-2">
          This is a list of AT Protocol DIDs (Decentralized Identifiers) for users who have created marketplace listings.
          The app uses this list to discover listings across the network until proper discovery mechanisms (like Jetstream) are working.
        </p>
        <p className="text-sm text-gray-700 mt-2">
          DIDs are automatically added when:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-700 ml-4">
          <li>A user creates a new listing</li>
          <li>A listing is discovered via Jetstream</li>
          <li>A listing is found via search</li>
          <li>You manually add one here</li>
        </ul>
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

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
      </div>

      {/* Current DIDs list */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Known Marketplace DIDs ({dids.length})</h2>
          <button
            onClick={handleClearStorage}
            className="btn-outline text-sm"
          >
            Reset to Default
          </button>
        </div>

        {dids.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No DIDs registered yet.</p>
        ) : (
          <div className="space-y-2">
            {dids.map((did, index) => (
              <div
                key={index}
                className="bg-gray-50 border rounded p-3 text-sm font-mono break-all"
              >
                {did}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <p className="font-bold">Note:</p>
        <p className="text-sm text-gray-700 mt-2">
          These DIDs are stored in your browser's localStorage. They persist across sessions but are local to this browser.
          For production use, consider implementing a backend service to maintain a shared registry of marketplace participants.
        </p>
      </div>
    </div>
  );
}
