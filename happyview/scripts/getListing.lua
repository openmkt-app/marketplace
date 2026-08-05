-- app.openmkt.commerce.getListing
--
-- Single listing by AT URI, from either collection, normalized to the same
-- shape listListings returns.
--
-- NOTE: the normalization below is duplicated from listListings.lua. If
-- HappyView supports shared Lua modules, extract it — having two copies of the
-- currency table is exactly the kind of drift that causes silent mispricing.

local V1 = "app.openmkt.marketplace.listing"

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

local function to_minor_units(price, currency)
  if price == nil then return nil end
  local s = tostring(price):gsub("[^%d%.%-]", "")
  local n = tonumber(s)
  if n == nil then return nil end
  return math.floor(n * (10 ^ exponent(currency)) + 0.5)
end

local function collection_of(uri)
  -- at://did:plc:xxx/<collection>/<rkey>
  return string.match(uri or "", "^at://[^/]+/([^/]+)/")
end

local function normalize_v1(rec)
  local meta = rec.metadata or {}
  local listing_type = (rec.category == "digital_arts") and "service" or "goods"
  local loc = rec.location or {}

  local location
  if loc.isOnlineStore then
    location = { isRemote = true }
  else
    location = {
      region = loc.state,
      locality = loc.locality,
      postalPrefix = loc.zipPrefix,
      isRemote = false,
      legacyCounty = loc.county,
    }
  end

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
    location = location,
    pricing = {
      regularPrice = to_minor_units(rec.price, rec.currency),
      currency = rec.currency or "USD",
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

function handle()
  if not params.uri then
    error("uri parameter is required")
  end

  local record = db.get(params.uri)
  if not record then
    error("record not found")
  end

  if collection_of(params.uri) == V1 then
    return { record = normalize_v1(record) }
  end

  record.schemaVersion = 2
  return { record = record }
end
