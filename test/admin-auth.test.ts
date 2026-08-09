// Tests for the admin bearer-secret gate.
//
// This replaces a check that compared a request-body `handle` against a public
// string — no authentication at all. The properties that matter: it fails
// closed when unconfigured, it accepts only the exact secret, and it compares
// in a way that does not leak the secret a byte at a time.

import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';

import { isAdminRequest, requireAdmin } from '../src/lib/server/admin-auth.ts';

const SECRET = 'correct-horse-battery-staple';

/** A stand-in for NextRequest — the guard only ever reads one header. */
function reqWith(authorization?: string) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'authorization' ? (authorization ?? null) : null,
    },
  } as unknown as Parameters<typeof isAdminRequest>[0];
}

afterEach(() => {
  delete process.env.ADMIN_API_SECRET;
});

test('fails closed when no secret is configured', () => {
  delete process.env.ADMIN_API_SECRET;
  // Even a caller sending "Bearer undefined" or an empty bearer is refused.
  assert.equal(isAdminRequest(reqWith(`Bearer ${SECRET}`)), false);
  assert.equal(isAdminRequest(reqWith('Bearer ')), false);
});

test('accepts the exact secret as a bearer token', () => {
  process.env.ADMIN_API_SECRET = SECRET;
  assert.equal(isAdminRequest(reqWith(`Bearer ${SECRET}`)), true);
});

test('rejects a wrong secret', () => {
  process.env.ADMIN_API_SECRET = SECRET;
  assert.equal(isAdminRequest(reqWith('Bearer wrong')), false);
  assert.equal(isAdminRequest(reqWith(`Bearer ${SECRET}x`)), false);
  assert.equal(isAdminRequest(reqWith(`Bearer ${SECRET.slice(0, -1)}`)), false);
});

test('rejects a missing or malformed header', () => {
  process.env.ADMIN_API_SECRET = SECRET;
  assert.equal(isAdminRequest(reqWith(undefined)), false);
  assert.equal(isAdminRequest(reqWith(SECRET)), false); // no "Bearer " scheme
  assert.equal(isAdminRequest(reqWith(`bearer ${SECRET}`)), false); // wrong case scheme
  assert.equal(isAdminRequest(reqWith(`Basic ${SECRET}`)), false);
});

test('requireAdmin returns a 401 to short-circuit, or null to proceed', () => {
  process.env.ADMIN_API_SECRET = SECRET;

  assert.equal(requireAdmin(reqWith(`Bearer ${SECRET}`)), null);

  const denied = requireAdmin(reqWith('Bearer nope'));
  assert.ok(denied, 'a bad key must produce a response');
  assert.equal(denied!.status, 401);
});
