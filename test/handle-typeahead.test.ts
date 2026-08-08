// Tests for login handle suggestions.
//
// The important half is what must NOT happen: a suggestion lookup can never
// stop someone signing in. The appview index only covers accounts Bluesky
// knows about, so a seller hosted elsewhere gets no suggestions and still has
// to be able to type their handle and submit.

import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

import {
  normalizeHandleQuery,
  shouldSearchHandles,
  searchHandles,
} from '../src/lib/handle-typeahead.ts';

// --- query shaping -----------------------------------------------------

test('the leading @ people type is not part of the query', () => {
  assert.equal(normalizeHandleQuery('@openmkt.app'), 'openmkt.app');
  assert.equal(normalizeHandleQuery('  openmkt.app  '), 'openmkt.app');
  assert.equal(normalizeHandleQuery('OpenMkt.App'), 'openmkt.app');
});

test('a query too short or too odd is not worth a request', () => {
  assert.equal(shouldSearchHandles(''), false);
  assert.equal(shouldSearchHandles('o'), false);
  assert.equal(shouldSearchHandles('@o'), false, 'the @ does not count as a character');
  assert.equal(shouldSearchHandles('open mkt'), false, 'handles have no spaces');
  assert.equal(shouldSearchHandles('me@example.com'), false, 'that is an email, not a handle');
});

test('a plausible handle is searched', () => {
  assert.equal(shouldSearchHandles('op'), true);
  assert.equal(shouldSearchHandles('openmkt'), true);
  assert.equal(shouldSearchHandles('@openmkt.app'), true);
});

// --- the request -------------------------------------------------------

const withFetch = async (impl: typeof fetch, run: () => Promise<void>) => {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('actors come back as suggestions', async () => {
  await withFetch(
    async () =>
      jsonResponse({
        actors: [
          {
            did: 'did:plc:ma37sd3y64o4j7pl57mwn7lb',
            handle: 'openmkt.app',
            displayName: 'Open Market | Your ATProto Marketplace',
            avatar: 'https://cdn.bsky.app/img/avatar/plain/x/y.jpeg',
          },
        ],
      }),
    async () => {
      const results = await searchHandles('openmkt');
      assert.equal(results.length, 1);
      assert.equal(results[0].handle, 'openmkt.app');
      assert.equal(results[0].displayName, 'Open Market | Your ATProto Marketplace');
    },
  );
});

test('the query reaches the appview stripped and limited', async () => {
  let seen: string | undefined;
  await withFetch(
    async (input) => {
      seen = String(input);
      return jsonResponse({ actors: [] });
    },
    async () => {
      await searchHandles('  @OpenMkt  ');
    },
  );
  assert.match(seen!, /app\.bsky\.actor\.searchActorsTypeahead/);
  assert.match(seen!, /[?&]q=openmkt(&|$)/, 'trimmed, unprefixed and lowercased');
  assert.match(seen!, /[?&]limit=5(&|$)/);
});

test('a query not worth searching makes no request at all', async () => {
  const fetchMock = mock.fn(async () => jsonResponse({ actors: [] }));
  await withFetch(fetchMock as unknown as typeof fetch, async () => {
    assert.deepEqual(await searchHandles('o'), []);
    assert.deepEqual(await searchHandles('me@example.com'), []);
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

// --- suggestions must be about what was typed --------------------------

test('actors that only match a display name word are dropped', async () => {
  // What the live appview actually returns for an unindexed handle: it splits
  // the query into words and matches "not" against display names.
  await withFetch(
    async () =>
      jsonResponse({
        actors: [
          { did: 'did:plc:a', handle: 'lunydoobles.bsky.social', displayName: "Lun's not so SUPER SECRET ACCOUNT!" },
          { did: 'did:plc:b', handle: 'hopenothate.org.uk', displayName: 'HOPE not hate' },
          { did: 'did:plc:c', handle: 'kellylink.bsky.social', displayName: 'Will Not Standstil' },
        ],
      }),
    async () => {
      const results = await searchHandles('zzqx-not-indexed.eurosky.social');
      assert.deepEqual(results, [], 'none of these is the handle being typed');
    },
  );
});

test('a handle the user is part-way through typing still matches', async () => {
  await withFetch(
    async () =>
      jsonResponse({
        actors: [
          { did: 'did:plc:a', handle: 'openmkt.app', displayName: 'Open Market' },
          { did: 'did:plc:b', handle: 'someoneelse.bsky.social', displayName: 'Open for commissions' },
        ],
      }),
    async () => {
      assert.deepEqual((await searchHandles('openmkt')).map((s) => s.handle), ['openmkt.app']);
      assert.deepEqual((await searchHandles('openmkt.a')).map((s) => s.handle), ['openmkt.app']);
      assert.deepEqual((await searchHandles('@OPENMKT')).map((s) => s.handle), ['openmkt.app']);
      // Matching mid-handle is still useful: "mkt" finds openmkt.app.
      assert.deepEqual((await searchHandles('mkt')).map((s) => s.handle), ['openmkt.app']);
    },
  );
});

// --- failure must stay invisible ---------------------------------------

test('an appview error yields no suggestions rather than an error', async () => {
  await withFetch(async () => jsonResponse({ error: 'RateLimitExceeded' }, 429), async () => {
    assert.deepEqual(await searchHandles('openmkt'), []);
  });
});

test('a network failure yields no suggestions rather than an error', async () => {
  await withFetch(
    async () => {
      throw new TypeError('network down');
    },
    async () => {
      assert.deepEqual(await searchHandles('openmkt'), []);
    },
  );
});

test('an aborted request yields no suggestions rather than an error', async () => {
  const controller = new AbortController();
  controller.abort();
  await withFetch(
    async (_input, init) => {
      (init?.signal as AbortSignal)?.throwIfAborted();
      return jsonResponse({ actors: [] });
    },
    async () => {
      assert.deepEqual(await searchHandles('openmkt', { signal: controller.signal }), []);
    },
  );
});

test('junk in the response is dropped, not rendered', async () => {
  await withFetch(
    async () =>
      jsonResponse({
        actors: [
          { handle: 'openmkt-no-did.example' },
          { did: 'did:plc:nohandle' },
          null,
          'nonsense',
          { did: 'did:plc:ok', handle: 'openmkt.app', displayName: 42 },
        ],
      }),
    async () => {
      const results = await searchHandles('openmkt');
      assert.equal(results.length, 1, 'only the well-formed actor survives');
      assert.equal(results[0].handle, 'openmkt.app');
      assert.equal(results[0].displayName, undefined, 'a non-string display name is dropped');
    },
  );
});

test('a response with no actors array is not fatal', async () => {
  await withFetch(async () => jsonResponse({}), async () => {
    assert.deepEqual(await searchHandles('openmkt'), []);
  });
});
