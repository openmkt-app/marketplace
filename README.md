# Open Market

A decentralized marketplace built on the [AT Protocol](https://atproto.com) — the open protocol behind Bluesky. Buy and sell directly with your community, no fees, no middlemen.

Live at **[openmkt.app](https://openmkt.app)**

---

## What is this?

Open Market stores listings as AT Protocol records in each user's own repository. There is no central database — your listings live in your Bluesky PDS (Personal Data Server) under a custom lexicon. The app reads from verified sellers' repos server-side and presents them in a familiar marketplace UI.

Key sections:

- **Browse** — all listings, filterable by location, category, condition, price, and recency
- **The Mall** — verified sellers with external storefronts (Etsy, Shopify, etc.)
- **The Gallery** — curated artist commission listings
- **Feed** — a Bluesky feed generator that surfaces new listings in the Bluesky app

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| AT Protocol | `@atproto/api`, `@atproto/oauth-client-browser`, `@atproto/lexicon` |
| Storage | Netlify Blobs (feed index) |
| Auth | AT Protocol OAuth (Bluesky login) |

---

## Getting started

### Prerequisites

- Node.js 18+
- A Bluesky account
- A bot account on Bluesky (for seller verification and feed announcements)

### Installation

```bash
git clone https://github.com/openmkt-app/marketplace.git
cd marketplace
npm install
```

### Environment variables

Create a `.env.local` file:

```env
# Bot account used for seller verification and feed announcements
BOT_HANDLE=yourbot.bsky.social
BOT_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Feed index security (optional but recommended in production)
FEED_INDEX_SECRET=your-secret-here

# Switch between production and dev lexicon collections
# Production: app.openmkt.marketplace.listing
# Development: app.atprotomkt.marketplace.listing
NEXT_PUBLIC_MARKETPLACE_ENV=development

# Optional
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
ETSY_API_KEY=your-etsy-key
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How listings work

Listings are AT Protocol records stored in each seller's PDS under the `app.openmkt.marketplace.listing` collection. The schema (defined in [`lexicons/app/openmkt/marketplace/listing.json`](lexicons/app/openmkt/marketplace/listing.json)) includes:

```
title, price, currency, category, condition,
description, location, images, metadata, externalUrl, labels
```

**Seller verification** is handled by a bot account — when a user registers, the bot follows them. The app treats "bot follows" as the verified seller list and caches it server-side.

**Browsing** works entirely server-side to avoid CORS restrictions on direct PDS requests. The `/api/marketplace/listings` route fetches records from all verified sellers' PDSes and returns them as a single response, cached for 5 minutes. The cache is busted immediately when any seller posts a new listing.

---

## Feed generator

Open Market runs a Bluesky feed generator at `did:web:openmkt.app`, surfacing new listings in the Bluesky app.

- When a listing is created, `/api/feed/notify-new-listing` is called
- The bot creates an announcement post on Bluesky
- The post is indexed and included in the feed skeleton served at `/xrpc/app.bsky.feed.getFeedSkeleton`

To add the feed in Bluesky, search for `openmkt.app` feeds or use the URI:
```
at://did:plc:ma37sd3y64o4j7pl57mwn7lb/app.bsky.feed.generator/all
```

---

## Project structure

```
src/
├── app/
│   ├── browse/              # Main listings browse page
│   ├── create-listing/      # New listing form
│   ├── edit-listing/        # Edit existing listing
│   ├── gallery/             # The Gallery (artist commissions)
│   ├── listing/[id]/        # Listing detail page
│   ├── mall/                # The Mall (online storefronts)
│   ├── my-listings/         # Seller's own listings
│   ├── store/[handle]/      # Individual seller storefront
│   ├── profile/             # User profile
│   ├── login/               # OAuth login
│   └── api/
│       ├── marketplace/
│       │   ├── listings/    # Proxy: fetches listings server-side
│       │   ├── sellers/     # Verified seller list (cached)
│       │   └── register/    # New seller registration (bot follows)
│       ├── feed/            # Feed generator endpoints
│       ├── mall/            # Mall cache invalidation
│       └── admin/           # Moderation and banner management
├── lib/
│   ├── marketplace-client.ts  # AT Protocol listing operations
│   ├── marketplace-dids.ts    # Verified seller DID registry
│   ├── mall-cache.ts          # Server-side in-memory caches
│   ├── bot-client.ts          # Bot account agent
│   └── feed-index.ts          # Feed entry index
└── components/
    └── marketplace/           # Listing cards, filters, gallery tiles
lexicons/
├── app/openmkt/marketplace/listing.json  # v1 listing — read-only, being migrated away from
├── app/openmkt/commerce/                 # v2 commerce schemas
│   ├── defs.json                         #   shared types: pricing, location, specs, taxonomy
│   ├── listing.json                      #   product / service / digital listing
│   ├── productGroup.json                 #   variant grouping (not yet authored in-app)
│   ├── review.json                       #   product and seller reviews
│   └── shop.json                         #   commerce identity and policies
└── com/atproto/label/defs.json           # vendored, for validation only
```

---

## AT Protocol lexicon

The custom lexicon `app.openmkt.marketplace.listing` is what makes listings portable — any AT Protocol client can read and display them. Validate the lexicon with:

```bash
npm run lexicon:validate
```

---

## Contributing

PRs are welcome. Open an issue first for larger changes.

## License

MIT
