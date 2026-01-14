'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceListing } from '@/lib/marketplace-client';
import { fetchListingsFromDID } from '@/lib/fetch-specific-listing';

export default function TestListingPage() {
  const auth = useAuth();
  const [uri, setUri] = useState('at://did:plc:oyhgprn7edb3dpdaq4mlgfkv/app.atprotomkt.marketplace.listing');
  const [did, setDid] = useState('did:plc:oyhgprn7edb3dpdaq4mlgfkv');
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [didListings, setDidListings] = useState<MarketplaceListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jetstreamListings, setJetstreamListings] = useState<MarketplaceListing[]>([]);
  const [jetstreamConnected, setJetstreamConnected] = useState(false);

  const fetchListing = async () => {
    if (!auth.client) {
      setError('Not logged in');
      return;
    }

    setLoading(true);
    setError(null);
    setListing(null);

    try {
      const result = await auth.client.getListingByUri(uri);
      if (result) {
        setListing(result);
        console.log('Fetched listing:', result);
      } else {
        setError('Listing not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Error fetching listing:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromDID = async () => {
    setLoading(true);
    setError(null);
    setDidListings([]);

    try {
      const listings = await fetchListingsFromDID(did);
      setDidListings(listings);
      console.log('Fetched listings from DID:', listings);
      if (listings.length === 0) {
        setError('No listings found for this DID');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Error fetching from DID:', err);
    } finally {
      setLoading(false);
    }
  };

  const startJetstreamTest = () => {
    if (!auth.client) {
      setError('Not logged in');
      return;
    }

    setJetstreamListings([]);
    setJetstreamConnected(false);
    setError(null);

    console.log('Starting Jetstream test...');

    const unsubscribe = auth.client.subscribeToListings(
      (listing, isHistorical) => {
        console.log('Received listing via Jetstream:', {
          uri: listing.uri,
          isHistorical,
          title: listing.title
        });
        setJetstreamListings(prev => [...prev, listing]);
        setJetstreamConnected(true);
      },
      () => {
        console.log('Jetstream replay complete');
      }
    );

    // Cleanup after 30 seconds
    setTimeout(() => {
      console.log('Stopping Jetstream test');
      unsubscribe();
    }, 30000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Test Listing Fetch</h1>

      {!auth.isLoggedIn ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="font-bold">Not logged in</p>
          <p>Please log in to test listing fetch</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-2 btn-primary"
          >
            Log In
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Fetch by DID test */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Fetch All Listings from DID</h2>
            <p className="text-sm text-gray-600 mb-4">
              Directly fetch all marketplace listings from a specific user's DID.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">DID:</label>
              <input
                type="text"
                value={did}
                onChange={(e) => setDid(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="did:plc:xxx"
              />
            </div>
            <button
              onClick={fetchFromDID}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Fetching...' : 'Fetch from DID'}
            </button>

            {didListings.length > 0 && (
              <div className="mt-4">
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  Found {didListings.length} listing(s)
                </div>
                <div className="space-y-3">
                  {didListings.map((listing, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{listing.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Price:</strong> {listing.price}</div>
                        <div><strong>Condition:</strong> {listing.condition}</div>
                        <div><strong>Category:</strong> {listing.category}</div>
                        <div><strong>Location:</strong> {listing.location.locality}, {listing.location.state}</div>
                        <div className="col-span-2"><strong>URI:</strong> <span className="text-xs">{listing.uri}</span></div>
                        <div><strong>Images:</strong> {listing.images?.length || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Direct fetch test */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Fetch Single Listing by URI</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Listing URI:</label>
              <input
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="at://did:plc:xxx/app.atprotomkt.marketplace.listing/rkey"
              />
            </div>
            <button
              onClick={fetchListing}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Fetching...' : 'Fetch Listing'}
            </button>

            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {listing && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{listing.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Price:</strong> {listing.price}</div>
                  <div><strong>Condition:</strong> {listing.condition}</div>
                  <div><strong>Category:</strong> {listing.category}</div>
                  <div><strong>Location:</strong> {listing.location.locality}, {listing.location.state}</div>
                  <div><strong>Author DID:</strong> {listing.authorDid}</div>
                  <div><strong>Author Handle:</strong> {listing.authorHandle}</div>
                  <div><strong>URI:</strong> {listing.uri}</div>
                  <div><strong>Images:</strong> {listing.images?.length || 0}</div>
                </div>
              </div>
            )}
          </div>

          {/* Jetstream test */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Jetstream Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will subscribe to Jetstream and show all marketplace listings received in the last year.
              Will run for 30 seconds.
            </p>
            <button
              onClick={startJetstreamTest}
              className="btn-primary"
            >
              Start Jetstream Test
            </button>

            {jetstreamConnected && (
              <div className="mt-4">
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
                  Connected to Jetstream! Found {jetstreamListings.length} listings
                </div>

                {jetstreamListings.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {jetstreamListings.map((listing, index) => (
                      <div key={index} className="bg-gray-50 border rounded p-3 text-sm">
                        <div className="font-semibold">{listing.title}</div>
                        <div className="text-gray-600 text-xs">{listing.uri}</div>
                        <div className="text-gray-600 text-xs">Author: {listing.authorDid}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
