// src/lib/server/jetstream.ts
//
// Our connection to Jetstream v2, used only by the reconcile job.
//
// v2 is the first version that can answer "what listings exist on the network?".
// v1 could only tail the live socket with a 36-hour lookback, and it silently
// clamped any cursor older than that — ask for ninety days and you get thirty-
// six hours with no error to tell you so. v2 adds Network Replay: a plan of
// sealed segments served over plain HTTP, which both goes back further than a
// day and a half and suits a scheduled function far better than a long-lived
// websocket ever did.
//
// Note the host has no digit in it. `jetstream1.us-east` is v1 and speaks a
// different wire; `jetstream.us-east` is v2. Their cursors are not
// interchangeable either — a v1 cursor is a microsecond timestamp, a v2 cursor
// is a sequence number — so the one stored here must never be replayed against
// a v1 host.

import { Jetstream } from '@bsky/jetstream';
import type { CursorStore } from '@bsky/jetstream';
import { readJson, writeJson } from './blob-json';

const JETSTREAM_SERVICE = process.env.JETSTREAM_SERVICE || 'https://jetstream.us-east.bsky.network';

const CURSOR_STORE = 'feed-index';
const CURSOR_KEY = 'reconcile-cursor';

/** Raised when the job is asked to run without an archive key configured. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('JETSTREAM_API_KEY is not set; the Jetstream archive cannot be read without it');
    this.name = 'MissingApiKeyError';
  }
}

/**
 * A Jetstream client authorized for archive reads.
 *
 * The live tail is free and unauthenticated, but every replay endpoint
 * (planSnapshot, getSegment, getBlock) requires an API key and returns 401
 * without one. We only ever use replay, so an absent key is fatal rather than
 * something to degrade past — a reconcile that silently did nothing would look
 * exactly like a reconcile that found nothing to do.
 */
export function getJetstream(): Jetstream {
  const apiKey = process.env.JETSTREAM_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  return new Jetstream({ service: JETSTREAM_SERVICE, apiKey });
}

export function hasApiKey(): boolean {
  return !!process.env.JETSTREAM_API_KEY;
}

/**
 * Whether a thrown error is Jetstream rejecting our key.
 *
 * Checks the status rather than the error class on purpose. The SDK throws
 * `XrpcAuthenticationError` from `@atproto/lex-client`, which reaches us only
 * as a transitive dependency — importing it directly would make our build
 * depend on a package we never asked for, and an `instanceof` against it breaks
 * the moment two copies end up in the tree. A 401 out of this client means one
 * thing regardless of which class carries it.
 */
export function isAuthError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 401;
}

/**
 * Where the last reconcile got to, as a v2 `seq`.
 *
 * Snapshot events arrive in seq order, so the last one fully processed is a
 * safe resume point: everything at or below it is done, and `afterSeq` is an
 * exclusive lower bound. Saving it after a partial run is not a compromise but
 * the intended design — the job is bounded by wall clock, so most runs are
 * partial and the next one picks up where this one stopped.
 */
export const reconcileCursor: CursorStore = {
  async load() {
    const stored = await readJson<{ seq?: number } | null>(CURSOR_STORE, CURSOR_KEY, null);
    return stored?.seq ?? undefined;
  },
  async save(seq: number) {
    await writeJson(CURSOR_STORE, CURSOR_KEY, { seq, updatedAt: new Date().toISOString() });
  },
};
