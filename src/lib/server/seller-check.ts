// src/lib/server/seller-check.ts
//
// Whether a DID has actually published a listing on Open Market.
//
// This is the gate on the seller-registration endpoint, which makes the bot
// follow a DID. That endpoint cannot authenticate its caller — the call comes
// from the seller's own browser on login, which holds no secret — but it does
// not need to. The only way a repo contains a listing is if its owner wrote it
// with their own token, so "this repo has a listing" is itself a signed action.
// Gating the follow on it means the bot can only ever be made to follow genuine
// sellers, never an arbitrary DID flooded in to push real sellers out of the
// mall's follow window (the mall is the bot's first ~100 follows).

import { READ_COLLECTIONS } from '../commerce/collections.ts';

/**
 * The PDS a DID's records live on, resolved from its DID document.
 *
 * Falls back to bsky.social so a resolution hiccup fails toward the busiest
 * PDS rather than toward no answer; the caller treats a failed read as "no
 * listing", which is the safe direction for a gate.
 */
async function resolvePdsEndpoint(did: string): Promise<string> {
  try {
    const url = did.startsWith('did:web:')
      ? `https://${did.slice('did:web:'.length)}/.well-known/did.json`
      : `https://plc.directory/${encodeURIComponent(did)}`;
    const doc = await fetch(url, { signal: AbortSignal.timeout(5000) }).then((r) =>
      r.ok ? r.json() : null,
    );
    const pds = doc?.service?.find(
      (s: { type?: string; serviceEndpoint?: string }) => s.type === 'AtprotoPersonalDataServer',
    )?.serviceEndpoint;
    if (typeof pds === 'string' && pds.startsWith('https://')) return pds;
  } catch {
    // Fall through to the default.
  }
  return 'https://bsky.social';
}

/**
 * True if the DID's repo holds at least one listing, in any collection Open
 * Market reads. One record is enough — this is a yes/no gate, so every query
 * asks for a single record and stops at the first collection that has one.
 */
export async function hasPublishedListing(did: string): Promise<boolean> {
  const pds = await resolvePdsEndpoint(did);

  for (const collection of READ_COLLECTIONS) {
    try {
      const url =
        `${pds}/xrpc/com.atproto.repo.listRecords` +
        `?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data.records) && data.records.length > 0) return true;
    } catch {
      // Unreachable collection — try the next rather than failing the gate open.
    }
  }

  return false;
}
