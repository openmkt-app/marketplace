# AT Protocol Commerce Lexicon (Draft)

Draft Lexicon schemas for commerce on AT Protocol, developed as a synthesis of [Niizuki's proposal (discussion #4862)](https://github.com/bluesky-social/atproto/discussions/4862) and the production [Open Market](https://github.com/openmkt-app/marketplace) implementation.

Namespace is `app.temp.commerce.*` during development, intended to migrate to `lexicon-community` once stable.

## Records

| Record | Key | Purpose |
|---|---|---|
| **shop** | `self` | Commerce identity (one per account), separate from the Bluesky social profile |
| **productGroup** | `tid` | Optional grouping for variant products — declares option axes and is the source of truth for `category` and `type` |
| **listing** | `tid` | Polymorphic product/service/digital listing with structured pricing and inventory |
| **review** | `tid` | Product-level review with a denormalized variant snapshot |
| **defs** | — | Shared types: `pricing`, `price`, `location`, `variantProperty`, `optionAxis`, `specification`, `dimensions`, `groupedItem`, `taxonomyRef`, `categorySlug` |

## Key design decisions

- **Variants are addressable records**, not inline arrays. A standalone listing with no group is the default (zero ceremony for casual sellers). A `productGroup` appears only when variation exists; variant listings reference it via `partOf`.
- **Variant listings keep `title`, `category`, and `type` as required fields** even when `partOf` is set. These are denormalized mirrors — the group is source of truth. Same approach as the review variant snapshot: denormalize for resilience. Every listing is self-describing without fetching its group.
- **Inheritance is explicit.** A mirrored field may hold the literal string `"parent"` to mean "use the group's value". This gives three distinguishable states instead of two — a real value is a deliberate override, `"parent"` is inheritance, absent is unset — so a drifted copy can be told apart from an intentional difference.
- **Pricing** is one object: `{regularPrice, salePrice, currency, taxInclusive, saleStartsAt, saleEndsAt}`. Amounts are integers in minor currency units — no floats, no bare strings. A single `currency` covers both amounts so they can never disagree. **The minor-unit exponent is per-currency per ISO 4217 and is not always 100** (JPY has none, KWD and BHD have three). `taxInclusive` is required for cross-border comparison: a federated marketplace has no shared store setting to fall back on. `defs#price` remains as a standalone amount type for anything that is not a listing price.
- **`productGroup` carries no price.** A group's price is a range computed from its children, and apps own that aggregation. This is deliberate, not an omission.
- **Classification is four separate layers**, and only the coarsest lives in the Lexicon. `category` is a small fixed slug list every app can build a browse menu from. `taxonomy` points into an externally maintained tree (Google Product Taxonomy and similar) for real depth. `specifications` are the structured facets buyers filter on — eBay calls these item specifics, Etsy calls them attributes. `tags` are free text for the words buyers actually type. Every large marketplace runs all four; Etsy notably has free tags *and* a full taxonomy, not one or the other.
- **The slug list stays small on purpose.** Amazon can run tens of thousands of category nodes because one company owns the catalogue. A `knownValues` list in a shared Lexicon is the opposite — every added slug is a change independent apps must agree on. Putting depth in `taxonomy` means adding a category is not a Lexicon change. Some self-hosted platforms reach the same conclusion from the other direction and ship no predefined categories at all.
- **Location** is internationalized: `{countryCode, region, locality, postalPrefix, isRemote}` replacing the US-centric model.
- **Polymorphism** via a `type` discriminator (`goods | service | digital`) with type-specific detail unions.
- **Reviews anchor to the product group** (durable), carrying a `variantSnapshot` of the variant properties at review time. The snapshot is self-contained — not anchored to any live variant listing. If variants are restructured, reviews stay valid and filterable.
- **The slug vocabulary** is defined once in `defs#categorySlug` and referenced by both `listing` and `productGroup`, so there is a single source of truth. It is an open/advisory `knownValues` set — records with unknown slugs stay protocol-valid. The list is an editorial pass on Open Market's original: `antiques` merged into `collectibles`; `cameras`, `cell_phones`, `computers` collapsed into `electronics`; `digital_arts` dropped (format is expressed by `type`, content by the category); `Free Stuff` removed (a price state, `amount: 0`, not a category).
- **A record describes the item, never the cost of transacting.** Tax and shipping appear only as *classification* — `taxStatus`, `taxCategory`, `shippingClass`, weight, dimensions. Rate tables, shipping zones, and tax calculation depend on the buyer's location and the current law, so they cannot live in a record the seller wrote once and strangers read from anywhere.
- **Items sold together use `groupedItems`** — an array of `{item, quantity, title}` on the listing. The listing states its own price, so no app ever computes a total from records held elsewhere. Whether the buyer must take everything or may pick and choose is a checkout question, not a schema one, which is why a single field covers every version of this.
- **Transactions, payments, and fulfillment** are explicitly out of scope — bridged via `externalUrl` / `checkoutUrl`.
- **Discounts are out of scope for now.** A coupon is mostly enforcement state (`usageCount`, per-user limits, who redeemed it). None of that survives in a public, seller-writable record, and publishing a redeemer list would leak buyer identities. If discounts arrive later, the safe shape is a promotion record that only *advertises* — code, amount, expiry, scope — with redemption staying at the seller's checkout.
- **Aggregate ratings are not stored.** A rating the seller writes into their own record means nothing. Apps count reviews themselves.

## App-level invariants

The following constraints are real design requirements but **cannot be enforced by the Lexicon schema**. Implementing apps must enforce them. Cite them by name rather than number, so references stay valid as the list grows.

- **Type/details consistency.** A listing with `type: "goods"` should carry `goodsDetails` in its `details` union, not `serviceDetails`.
- **Variant axis consistency.** A variant listing's `variantProperties` axes should be a subset of its group's declared `optionAxes`.
- **Denormalized field consistency.** When `partOf` is set, `title`, `category`, and `type` should mirror the productGroup — unless the field holds `"parent"`, which states inheritance outright. Fields that use `"parent"` cannot drift at all, so this constraint only has to cover records that chose to copy.
- **Parent target type.** The `partOf` AT URI should reference an `app.temp.commerce.productGroup` record.
- **Category/taxonomy agreement.** When both `category` and `taxonomy` are set, they should describe the same thing — a `taxonomy` node under Electronics alongside `category: "apparel"` is a seller error the schema cannot catch.

## Validation

```bash
npm install
npm run validate
```

The validator does two things:

1. **Schema registration** — loads all Lexicons (including the vendored `com.atproto.label.defs` at `lexicons/com/atproto/label/defs.json`) into a single `Lexicons` instance, confirming structural validity and cross-file ref resolution.
2. **Record validation** — validates sample records in `test/fixtures/` against the registered schemas, exercising the `labels` union, `details` union, variant properties, and all required fields. **A run with zero validated records is a failure (exit 1)**, so a missing `test/fixtures/` directory or empty fixture set cannot masquerade as success.

## Status

Draft — not yet proposed to `lexicon-community`. See [PROPOSED-CHANGES.md](PROPOSED-CHANGES.md) for the reasoning behind the current field set.

Open questions:

- **Schema evolution strategy** — document how fields are added without breaking existing apps.
- **Verified purchase** — the `verified` boolean was removed. On a record the reviewer writes, any client could set it to `true` and apps would render a checkmark, which is worse than having no field. It returns when there is a real receipt token to back it.
- **One `type` or two axes?** `type` (`goods | service | digital`) currently describes delivery, not structure, so there is no way to say "variable *and* digital". The alternative is splitting into `type` (`simple | variable | grouped | external`) and `fulfillment` (`physical | digital | service`). Related: `external` — the buy button pointing at an existing storefront — is arguably the most common case in practice and today is only an optional `externalUrl`.
- **Grouped item availability** — when items in a group sell out, is the group's own `availability` authoritative, or do apps check each item? Currently the group's own value wins, which is simple but can go stale.
- **Namespace** — `app.temp.commerce.*` is planned to move to `lexicon-community`; `site.standard.commerce.*` is an alternative worth weighing.
