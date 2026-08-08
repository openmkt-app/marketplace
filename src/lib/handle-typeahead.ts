// src/lib/handle-typeahead.ts
//
// Handle suggestions for the login field, from the public Bluesky appview.
//
// Typing a full handle from memory is the first thing Open Market asks of
// anyone, and `.bsky.social` is easy to get wrong. The appview's typeahead
// index answers unauthenticated, which is what makes this usable on a login
// page — there is no session yet to authenticate with.
//
// Suggestions are a convenience and never a gate. The index only covers
// accounts the Bluesky appview knows about, so a seller elsewhere in the
// network may return nothing and must still be able to type their handle and
// sign in. Nothing here may block submission.

const APPVIEW = 'https://public.api.bsky.app';

export interface HandleSuggestion {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

/** What the user typed, reduced to what the appview wants to search on. */
export function normalizeHandleQuery(input: string): string {
  const trimmed = input.trim();
  return (trimmed.startsWith('@') ? trimmed.slice(1) : trimmed).toLowerCase();
}

/**
 * Whether a query is worth a request. Guards the obvious waste — a single
 * character matches most of the network — and the case where the user is
 * plainly typing an email, which the form rejects anyway.
 */
export function shouldSearchHandles(input: string): boolean {
  const query = normalizeHandleQuery(input);
  if (query.length < 2) return false;
  if (/\s/.test(query)) return false;
  // A remaining `@` means something like `name@example.com`; the leading one
  // has already been stripped.
  if (query.includes('@')) return false;
  return true;
}

/** Defensive: this is third-party JSON and the field set drifts over time. */
function toSuggestion(actor: unknown): HandleSuggestion | null {
  if (!actor || typeof actor !== 'object') return null;
  const record = actor as Record<string, unknown>;
  if (typeof record.did !== 'string' || typeof record.handle !== 'string') return null;
  return {
    did: record.did,
    handle: record.handle,
    displayName: typeof record.displayName === 'string' ? record.displayName : undefined,
    avatar: typeof record.avatar === 'string' ? record.avatar : undefined,
  };
}

/**
 * The appview's typeahead is a people search: it matches display names word by
 * word, so typing a full handle it has never indexed comes back with whatever
 * shares a word with it. `zzqx-not-indexed.eurosky.social` returned five
 * strangers whose names contain "not".
 *
 * On a login field that is noise. Someone signing in is recalling their own
 * handle, not browsing for an account, so a suggestion is only worth showing
 * when it is a handle they could be part-way through typing.
 */
function matchesHandle(suggestion: HandleSuggestion, query: string): boolean {
  return suggestion.handle.toLowerCase().includes(query);
}

/**
 * Look up handles matching `input`. Returns an empty list rather than throwing
 * on any failure — a login page must not surface an error because a suggestion
 * lookup went wrong, when typing the handle by hand still works perfectly.
 */
export async function searchHandles(
  input: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<HandleSuggestion[]> {
  if (!shouldSearchHandles(input)) return [];

  const url = new URL('/xrpc/app.bsky.actor.searchActorsTypeahead', APPVIEW);
  url.searchParams.set('q', normalizeHandleQuery(input));
  url.searchParams.set('limit', String(options.limit ?? 5));

  try {
    const response = await fetch(url, { signal: options.signal, headers: { accept: 'application/json' } });
    if (!response.ok) return [];
    const body = (await response.json()) as { actors?: unknown };
    if (!Array.isArray(body.actors)) return [];
    return body.actors
      .map(toSuggestion)
      .filter((suggestion): suggestion is HandleSuggestion => suggestion !== null)
      .filter((suggestion) => matchesHandle(suggestion, normalizeHandleQuery(input)));
  } catch {
    // Includes the abort that every keystroke triggers on the previous request.
    return [];
  }
}
