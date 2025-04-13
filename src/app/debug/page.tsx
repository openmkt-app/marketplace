'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { decodeAtUri } from '@/lib/uri-utils';
import Link from 'next/link';

export default function DebugPage() {
  const [uri, setUri] = useState('at://did:plc:oyhgprn7edb3dpdaq4mlgfkv/app.atprotomkt.marketplace.listing/3lmntrgmudz2c');
  const [decodedUri, setDecodedUri] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { client } = useAuth();

  const handleDecode = () => {
    try {
      // Handle both raw and URL-encoded URIs
      let uriToDecode = uri;
      if (uri.startsWith('at%3A%2F%2F')) {
        uriToDecode = decodeAtUri(uri);
      }
      setDecodedUri(uriToDecode);
    } catch (err) {
      setError(`Failed to decode URI: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      if (!client) {
        throw new Error('Client not available. Please login first.');
      }
      
      // Use the decoded URI if available, otherwise use the raw URI
      const uriToFetch = decodedUri || uri;
      
      // Log the URI we're trying to fetch
      console.log('Attempting to fetch listing with URI:', uriToFetch);
      
      // First try direct approach
      try {
        console.log('Method 1: Using getListingByUri');
        const listing = await client.getListingByUri(uriToFetch);
        if (listing) {
          setResult({
            method: 'getListingByUri',
            data: listing
          });
          setIsLoading(false);
          return;
        }
      } catch (err1) {
        console.error('Method 1 failed:', err1);
      }
      
      // Try alternative approach with the Post Thread API
      try {
        console.log('Method 2: Using getPostThread API directly');
        const threadResult = await client.agent.api.app.bsky.feed.getPostThread({
          uri: uriToFetch,
          depth: 0
        });
        
        if (threadResult.success) {
          const thread = threadResult.data.thread;
          if (thread.type === 'post') {
            const post = thread.post;
            setResult({
              method: 'getPostThread',
              data: post
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (err2) {
        console.error('Method 2 failed:', err2);
      }
      
      // Try repo method
      try {
        console.log('Method 3: Parsing URI and using getRecord API');
        // Parse the URI
        const parsedUri = uriToFetch.split('/');
        if (parsedUri.length >= 4) {
          const did = parsedUri[2];
          const collection = parsedUri[3];
          const rkey = parsedUri[4];
          
          console.log(`Parsed URI - DID: ${did}, Collection: ${collection}, RKey: ${rkey}`);
          
          const recordResult = await client.agent.api.com.atproto.repo.getRecord({
            repo: did,
            collection: collection,
            rkey: rkey
          });
          
          if (recordResult.success) {
            setResult({
              method: 'getRecord',
              data: recordResult.data
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (err3) {
        console.error('Method 3 failed:', err3);
      }
      
      setError('Failed to fetch listing using all methods');
    } catch (err) {
      console.error('Debug process failed:', err);
      setError(`Debug process failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Listing Fetch</h1>
      
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
        <p className="font-bold">Debug Tool</p>
        <p>This page helps debug issues with fetching listings by URI.</p>
        <p className="mt-2">
          <Link href="/browse" className="text-blue-600 hover:underline">
            Return to Browse
          </Link>
        </p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">URI Decoder</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            className="flex-grow px-3 py-2 border rounded-md"
            placeholder="Enter URI to decode"
          />
          <button
            onClick={handleDecode}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md"
          >
            Decode
          </button>
        </div>
        
        {decodedUri && (
          <div className="mt-2 p-3 bg-gray-100 rounded">
            <p className="font-semibold">Decoded URI:</p>
            <p className="break-all">{decodedUri}</p>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Fetch Listing</h2>
        
        <button
          type="submit"
          disabled={isLoading || !client}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-gray-400"
        >
          {isLoading ? 'Fetching...' : 'Fetch Listing'}
        </button>
        
        {!client && (
          <p className="text-red-600 mt-2">
            You need to be logged in to use this tool.
          </p>
        )}
      </form>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Result (Method: {result.method})</h2>
          <div className="bg-gray-100 p-4 rounded-md overflow-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
