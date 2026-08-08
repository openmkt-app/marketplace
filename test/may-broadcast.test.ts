// Tests for the gate on posting as @openmkt.app.
//
// This guard already failed silently once. It was written against
// IS_PRODUCTION, which answers "which records am I working with", and every
// Netlify context — deploy previews included — is configured as production. So
// the check passed everywhere and protected nothing: opening a PR preview and
// creating a listing would have announced it to real followers.
//
// The table below is the whole contract, and the deploy-preview row is the one
// that matters.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mayBroadcast } from '../src/lib/constants.ts';

test('the live site broadcasts', () => {
  assert.equal(mayBroadcast('production', 'production'), true);
});

test('a deploy preview never broadcasts, however it is configured', () => {
  // This is the case the old guard let through: the env var says production
  // because it says production in every Netlify context.
  assert.equal(mayBroadcast('production', 'deploy-preview'), false);
  assert.equal(mayBroadcast('production', 'branch-deploy'), false);
  assert.equal(mayBroadcast('production', 'dev'), false);
});

test('a non-production instance never broadcasts, whatever the context', () => {
  assert.equal(mayBroadcast('development', 'production'), false);
  assert.equal(mayBroadcast(undefined, 'production'), false);
  assert.equal(mayBroadcast('', undefined), false);
});

test('a local machine is governed by .env.local alone', () => {
  // No Netlify, so no CONTEXT. Preserves the behaviour a developer already has:
  // pointing .env.local at production is a deliberate act.
  assert.equal(mayBroadcast('production', undefined), true);
  assert.equal(mayBroadcast('production', ''), true);
  assert.equal(mayBroadcast('development', undefined), false);
});

test('an unrecognised context is treated as unsafe', () => {
  // Netlify could add a context tomorrow. Anything not named is not the live
  // site, and the cost of guessing wrong is a real post to real followers.
  assert.equal(mayBroadcast('production', 'some-future-context'), false);
});
