// Tests for the seller gate on the registration endpoint.
//
// hasPublishedListing is what stands in for authentication when the bot is
// asked to follow a DID: it answers "does this repo actually contain a
// listing?" by resolving the DID's PDS and reading its records. The network is
// stubbed here so the decision logic — found, not found, unreachable — is
// pinned down without hitting a real PDS.

import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';

import { hasPublishedListing } from '../src/lib/server/seller-check.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const DID = 'did:plc:examplerepo';

/**
 * Stub fetch: a DID-document response that points at a PDS, then a listRecords
 * response driven by `records` (an array to return, or 'error' to reject).
 */
function stubNetwork(records: unknown[] | 'error') {
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);

    if (url.includes('plc.directory')) {
      return new Response(
        JSON.stringify({
          service: [
            {
              id: '#atproto_pds',
              type: 'AtprotoPersonalDataServer',
              serviceEndpoint: 'https://pds.example.com',
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url.includes('listRecords')) {
      if (records === 'error') throw new Error('PDS unreachable');
      return new Response(JSON.stringify({ records }), { status: 200 });
    }

    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

test('a repo with a listing registers', async () => {
  stubNetwork([{ uri: `at://${DID}/app.openmkt.marketplace.listing/abc`, value: {} }]);
  assert.equal(await hasPublishedListing(DID), true);
});

test('a repo with no listings does not', async () => {
  stubNetwork([]);
  assert.equal(await hasPublishedListing(DID), false);
});

test('an unreachable PDS is treated as "no listing", never as a pass', async () => {
  // A failed read must not open the gate — the safe direction for a guard.
  stubNetwork('error');
  assert.equal(await hasPublishedListing(DID), false);
});
