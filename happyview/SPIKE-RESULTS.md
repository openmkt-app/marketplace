# AppView spike results

Run 2026-08-05 against a local HappyView instance (SQLite, Cloudflare quick tunnel),
indexing live production data from the network.

**Verdict: the AppView approach works. Proceed.**

## The question it had to answer

> Can one indexed query serve a browse page containing both legacy
> `app.openmkt.marketplace.listing` records and new
> `app.openmkt.commerce.listing` records, normalized into one shape?

**Yes.** A single Lua script reads both collections, normalizes, merges and sorts.
Dual-read does not need to live in ~15 client call sites.

## What happened

Backfill discovered **9 repos / 32 records** for the legacy collection with no seed
list, via the relay's `com.atproto.sync.listReposByCollection`. All 32 came back
through `listListings` normalized:

| Check | Result |
|---|---|
| v1 records return a `pricing` object | ✅ 32/32 |
| Price strings parsed to minor units | ✅ 0 failures — `"5.00"` USD → `500` |
| `schemaVersion` marks provenance | ✅ all tagged `1` |
| `digital_arts` → `type: "service"` | ✅ with `serviceDetails` intact |
| Online-store sentinel → `isRemote` | ✅ `"Online"/"Online"/"Online Store"` → `{isRemote: true}` |
| `metadata.subcategory` lifted out | ✅ |
| Single-record endpoint normalizes identically | ✅ |

The one service listing came back with
`{commissionStatus: "waitlist", slotsAvailable: 0, turnaroundTime: "3-5 weeks"}` —
so the undeclared `metadata` fields survive the move into `serviceDetails`.

## Corrections to the plan's assumptions

**Blobs are NOT auto-enriched with a `url` field.** The docs promise this, but our
Lua builds the response object by hand and so bypasses whatever the default handler
does. Blobs come back as raw `{$type, mimeType, ref, size}`.

Consequence: the three regex CID scrapers in `src/lib/server/` cannot simply be
deleted. Either the Lua must construct CDN URLs itself, or the app keeps doing it —
but it should parse the `images` array properly rather than regexing the whole
stringified record, which is the actual bug.

**Open discovery found no additional sellers.** All 8 sellers with listings are
already among the 70 accounts the bot follows, because `registerWithBot`
(`AuthContext.tsx:94-109`) fires automatically on every login. The plan claimed
discovery was "a manual allowlist" losing sellers — mechanically true, but nobody
is being lost today.

The forward-looking argument still holds: a seller using a *different* client that
writes the same collection is invisible under follow-graph discovery and visible
under relay discovery. That is a real benefit, just not a present-day gap.

## Admin API shapes (undocumented, discovered by probing)

```
POST /admin/lexicons   { lexicon_json: <doc>, target_collection?: nsid, backfill?: bool }
POST /admin/scripts    { id: "<trigger>", body: "<lua source>" }
POST /admin/backfill   { collection: nsid }
```

Script triggers are keyed, not named after the lexicon:

```
record.{index,create,update,delete}:<nsid>
xrpc.{query,procedure}:<nsid>
labeler.apply:<nsid|_actor>
job.run:<type>
```

Ordering matters — a backfill job for a collection with no registered record
lexicon fails immediately with `no record-type lexicon registered`.

## Still unproven

- **JPY / KWD exponents.** No zero- or three-decimal currency exists in the live
  data (31 USD, 1 EUR), so that branch ran but was never exercised against a real
  record. Worth a synthetic fixture before trusting it.
- **Pagination.** Deliberately first-page-only; merging two collections properly
  needs a composite cursor. `cursor` is absent from responses today.
- **Write path.** The spike is read-only. OAuth proxy writes and the re-consent
  problem are untouched.
- **Scale.** 32 records is not a load test.

## Incidental findings

- One `free`-category record exists in production, confirming the taxonomy cleanup
  in Phase 5 has real data behind it.
- 9 repos were backfilled but only 8 have listings in the index — one repo's records
  did not land. Worth checking before trusting record counts.
