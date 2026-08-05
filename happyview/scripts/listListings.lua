-- app.openmkt.commerce.listListings
--
-- Merges the v2 commerce collection with the legacy v1 marketplace collection
-- and normalizes both into one shape, so the app never sees two record formats.
--
-- This is the spike's central question: if this works, dual-read lives here
-- instead of in ~15 client call sites.

local V2 = "app.openmkt.commerce.listing"
local V1 = "app.openmkt.marketplace.listing"

-- ISO 4217 minor-unit exponents. Not always 2 — this is the bug the app has
-- today, where formatPrice hardcodes 2 decimals while the currency list
-- already includes JPY and KWD.
local ZERO_DECIMAL = {
  BIF=true, CLP=true, DJF=true, GNF=true, ISK=true, JPY=true, KMF=true,
  KRW=true, PYG=true, RWF=true, UGX=true, UYI=true, VND=true, VUV=true,
  XAF=true, XOF=true, XPF=true,
}
local THREE_DECIMAL = {
  BHD=true, IQD=true, JOD=true, KWD=true, LYD=true, OMR=true, TND=true,
}

local function exponent(currency)
  if not currency then return 2 end
  local c = string.upper(currency)
  if ZERO_DECIMAL[c] then return 0 end
  if THREE_DECIMAL[c] then return 3 end
  return 2
end

-- "1250.00" USD -> 125000 ; "1000" JPY -> 1000 ; "1.500" KWD -> 1500
local function to_minor_units(price, currency)
  if price == nil then return nil end
  local s = tostring(price):gsub("[^%d%.%-]", "")
  local n = tonumber(s)
  if n == nil then return nil end
  local mult = 10 ^ exponent(currency)
  return math.floor(n * mult + 0.5)
end

-- v1 has no listing type. digital_arts was the de-facto services category and
-- is what artist-store detection keys on today.
local function infer_type(category)
  if category == "digital_arts" then return "service" end
  return "goods"
end

local function normalize_location(loc)
  if type(loc) ~= "table" then return nil end
  -- v1 wrote literal "Online" sentinels into state/county/locality for online
  -- stores. Drop them rather than carry them through as real place names.
  if loc.isOnlineStore then
    return { isRemote = true }
  end
  return {
    region = loc.state,
    locality = loc.locality,
    postalPrefix = loc.zipPrefix,
    isRemote = false,
    -- v1 predates countryCode and was US-only in practice. Left unset rather
    -- than assumed, so a wrong country never enters the index.
    legacyCounty = loc.county,
  }
end

local function normalize_v1(rec)
  local meta = rec.metadata or {}
  local listing_type = infer_type(rec.category)

  local out = {
    uri = rec.uri,
    cid = rec.cid,
    schemaVersion = 1,
    type = listing_type,
    title = rec.title,
    description = rec.description,
    category = rec.category,
    subcategory = meta.subcategory,
    condition = rec.condition,
    images = rec.images,
    externalUrl = rec.externalUrl,
    hideFromFriends = rec.hideFromFriends,
    labels = rec.labels,
    createdAt = rec.createdAt,
    location = normalize_location(rec.location),
    pricing = {
      regularPrice = to_minor_units(rec.price, rec.currency),
      currency = rec.currency or "USD",
      -- v1 never recorded this. Absent means unknown, which is honest —
      -- defaulting to false would misprice every EU seller.
      taxInclusive = nil,
    },
  }

  if listing_type == "service" then
    out.serviceDetails = {
      slotsAvailable = meta.slotsAvailable,
      turnaroundTime = meta.turnaroundTime,
      commissionStatus = meta.commissionStatus,
    }
  end

  if meta.externalPlatform then
    out.externalPlatform = meta.externalPlatform
  end

  return out
end

local function normalize_v2(rec)
  -- Already canonical; pass through with provenance so the app can tell them
  -- apart when it needs to (e.g. showing an "update your listing" nudge).
  rec.schemaVersion = 2
  return rec
end

local function sort_by_created_desc(rows)
  table.sort(rows, function(a, b)
    local ac = a.createdAt or ""
    local bc = b.createdAt or ""
    if ac == bc then
      return (a.uri or "") > (b.uri or "")
    end
    return ac > bc
  end)
  return rows
end

function handle()
  local limit = tonumber(params.limit) or 20
  if limit > 100 then limit = 100 end

  -- Over-fetch from both collections so the merge has enough to fill a page
  -- after interleaving. Proper merged pagination needs a composite cursor
  -- holding a position in each collection; for the spike this is deliberately
  -- first-page-only and the cursor is not threaded through.
  local fetch = limit * 2

  local v2 = db.query({ collection = V2, did = params.did, limit = fetch })
  local v1 = db.query({ collection = V1, did = params.did, limit = fetch })

  local merged = {}
  for _, rec in ipairs(v2.records or {}) do
    table.insert(merged, normalize_v2(rec))
  end
  for _, rec in ipairs(v1.records or {}) do
    table.insert(merged, normalize_v1(rec))
  end

  sort_by_created_desc(merged)

  local page = {}
  for i = 1, math.min(limit, #merged) do
    table.insert(page, merged[i])
  end

  return { records = toarray(page) }
end
