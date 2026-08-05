# HappyView spike

Timeboxed test of whether an AppView can replace Open Market's fan-out reads.

**The question:** can one indexed query serve a browse page containing *both* legacy
`app.openmkt.marketplace.listing` records and new `app.openmkt.commerce.listing`
records, normalized into one shape?

If yes, dual-read stops being a client-side problem across ~15 call sites and
becomes one Lua script. If no, we fall back to a codec in `src/lib/commerce/`.

## Contents

| Path | What it is |
|---|---|
| `lexicons/*.json` | Query lexicons. Deliberately minimal — HappyView generates `GET /xrpc/{nsid}` from these and the Lua does the work |
| `scripts/listListings.lua` | **The thing being tested.** Reads both collections, normalizes v1 into the v2 shape, merges, sorts |
| `scripts/getListing.lua` | Single record by AT URI, same normalization |
| `setup.mjs` | Pushes lexicons, scripts, and backfill jobs via the admin API. Idempotent |

Record lexicons are read from the main `lexicons/` tree, so there is one source
of truth shared with `npm run lexicon:validate` and `scripts/publish-lexicon.js`.

## Running it

HappyView is self-hosted (Rust + Postgres or SQLite). Source:
<https://tangled.org/gamesgamesgamesgames.games/happyview>

1. Start Docker, then bring up HappyView with `DATABASE_URL=sqlite://…` and
   `PUBLIC_URL=http://127.0.0.1:3000`. Those two are the only required vars.
2. Open `http://127.0.0.1:3000` and log in with the openmkt handle. **The first
   user becomes super user**, so do this before anyone else can reach it.
3. Create an API key in the dashboard (`hv_…`).
4. Push everything:

```bash
HAPPYVIEW_URL=http://127.0.0.1:3000 HAPPYVIEW_KEY=hv_... node happyview/setup.mjs
```

Check what it would send first with `node happyview/setup.mjs --dry-run`.

## What to look for

Backfill discovers repos via the relay's `com.atproto.sync.listReposByCollection`,
so it should find **every** seller on the network with these records — not only
the ones the openmkt bot follows.

```bash
curl -H "Authorization: Bearer $HAPPYVIEW_KEY" http://127.0.0.1:3000/admin/backfill/status
curl "http://127.0.0.1:3000/xrpc/app.openmkt.commerce.listListings?limit=5"
```

Spike passes if:

- [ ] Backfill finds sellers the bot does **not** follow
- [ ] `listListings` returns v1 and v2 records together, both with a `pricing` object
- [ ] `schemaVersion` correctly marks which is which
- [ ] A JPY or KWD listing has the right `regularPrice` (not silently × 100)
- [ ] `digital_arts` records come back as `type: "service"` with `serviceDetails`
- [ ] Blobs arrive with the promised `url` field — if so we can delete the three
      regex CID scrapers in `src/lib/server/` rather than port them

## Known gaps, deliberate for a spike

- **Pagination is first-page only.** Merging two collections properly needs a
  composite cursor holding a position in each. The script over-fetches and sorts
  instead. Fine for proving the merge, not shippable.
- **The normalizer is duplicated** between the two scripts. If HappyView supports
  shared Lua modules, extract it — two copies of the currency exponent table is
  exactly how silent mispricing happens.
- **`taxInclusive` is left unset for v1**, because v1 never recorded it. Absent
  means unknown, which is honest; defaulting to `false` would misprice every
  seller who priced VAT-inclusive.
- **`countryCode` is left unset for v1.** The old location model was US-only in
  practice but never said so, and guessing puts wrong data in the index.
- **`legacyCounty`** carries v1's `county` field, which has no home in the new
  location model. Drop it once v1 records are gone.
