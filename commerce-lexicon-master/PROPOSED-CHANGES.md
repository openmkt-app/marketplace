# Proposed changes to the draft lexicon

Feedback on the `app.temp.commerce.*` draft. Each item shows what the draft has now, the problem it causes, and the suggested fix.

Where a gap is one that established commerce platforms already solved, we say so. Not to copy them, but because a problem several independent teams hit is usually real.

The test we applied throughout: **could a real shop describe its full catalogue in this schema without losing anything?**

The core design holds up. The productGroup and variant records, the type discriminator, and the review snapshot are all sound, and schema.org arrived at the same variant model independently. These are gaps to fill, not a redesign. The one field being replaced rather than extended is `price`.

---

## Pricing

### 1. One price field is doing three jobs

**Now**

```json
"price": { "amount": 2500, "currency": "EUR" }
```

Three problems in one field.

**Problem A: it does not say whether tax is in the number.**

A seller in Germany must show prices with VAT already in them. A seller in the US shows prices without tax and adds it at checkout. Both write `2500 EUR`. A buyer comparing them is comparing two different numbers.

A single shop can set this once in its settings. A federated marketplace has no shared settings, so the record has to say it. schema.org puts `valueAddedTaxIncluded` on every price for exactly this reason.

**Problem B: there is no sale price.**

Sale state drives "on sale" filters, price-drop alerts, and badges on cards. With one price field a discount can only be faked in the title. Every shop system stores the normal price and the sale price separately, plus the dates the sale runs.

**Problem C: "minor units" will be read as "divide by 100".**

That is wrong for Japanese yen (no decimals) and Kuwaiti dinar (three). Those bugs are silent and they corrupt data.

**Change**: replace the single price with one `pricing` object:

```json
"pricing": {
  "regularPrice": 3000,
  "salePrice": 2400,
  "currency": "USD",
  "taxInclusive": false,
  "saleStartsAt": "2026-08-01T00:00:00Z",
  "saleEndsAt":   "2026-08-14T00:00:00Z"
}
```

One currency covers both amounts, so a USD regular price with a EUR sale price is impossible to write. The current effective price is something the app works out, not something stored.

Keep `defs#price` as a separate small type for the places that need a standalone amount: shipping costs, a minimum spend on a promotion.

For problem C, say in the description that the number of decimals comes from ISO 4217 per currency, and name yen and dinar as the cases to watch. Platforms that use one global decimal setting for the whole shop get this wrong on multi-currency stores. Integers in minor units are the better call, they just need spelling out.

---

## Finding things

### 2. No standard product ID

**Problem**: two sellers list the same book on two different apps. Nothing connects those records. For a protocol whose whole point is that data is shared, that is a real loss.

**Change**: add a `gtin` field for the barcode number (GTIN, UPC, EAN, ISBN).

**Why**: this is the join key between marketplaces. It is also what product feeds run on, so it opens the door to sellers pushing their catalogue into Google Shopping and similar. Platforms that care about feed interop have all added a field like this.

---

### 3. Classification is four jobs and the draft does one and a half

**Now**: 21 fixed category slugs, plus a free-text `subcategory`.

**Problem**: a marketplace needs four different things and they get confused with each other constantly. Every large marketplace has all four:

| Layer | Job | Amazon | eBay | Etsy |
|---|---|---|---|---|
| **Category** | Coarse bucket you can build a browse menu from | Top-level departments | Top-level categories | Top-level categories |
| **Deep taxonomy** | Electronics › Cameras › Film Cameras | Browse nodes | Category tree | Taxonomy nodes |
| **Specifications** | Structured facets buyers filter on: Material, Lens Mount, Screen Size | Product attributes | **Item specifics**, many of them required, and they vary per category | **Attributes**, per-category, e.g. Primary Colour, Occasion |
| **Tags** | Search and long-tail discovery: "cottagecore", "y2k", "gift for dad" | | | **13 free tags per listing** |

The draft has the first layer and a free-text stand-in for the second. It has nothing for the third or fourth.

Note what eBay and Etsy do that is easy to miss: their structured attributes are *separate from* the category tree, and Etsy runs free tags **as well as** a full taxonomy. These are not alternatives to each other. A seller picks one category, fills in the attributes that category asks for, and then adds tags for the words buyers actually type.

**The trap to avoid**: the obvious fix is to grow the slug list until it looks like Amazon's. That fails for a reason specific to our situation.

Amazon can run tens of thousands of category nodes because Amazon owns the catalogue. One company, one database, and they reshuffle the tree whenever they want. A `knownValues` list in a shared Lexicon is the opposite: every new slug is a change several independent apps have to agree on. We have already lived this, in the 25 → 21 edit, `antiques` folded into `collectibles`, `digital_arts` cut. That argument happened over a first draft.

Worth knowing: some self-hosted platforms ship **no predefined categories at all** and let every store build its own tree. They reached the same conclusion from the other direction. One catalogue can have a canonical tree; many independent catalogues cannot share one everybody is happy with.

**Change**: cover all four layers, and let only the first one live inside the Lexicon.

1. **Keep the 21 slugs** as a required field. They are the right level for a marketplace this size and they give every app a working browse menu on day one.

2. **Add an optional pointer to an external taxonomy** for depth:

```json
"taxonomy": { "scheme": "google", "version": "2021-09-21", "id": "499954" }
```

Google publishes a versioned product taxonomy of a few thousand categories that the whole product-feed industry already maps to. A seller who has a deep category can carry it, an app that wants deep browse can use it, and an app that does not can ignore it and fall back to the slug.

The point of doing it this way: **adding a category stops being a Lexicon change.** The tree lives outside, versioned, maintained by people whose job it is.

3. **`specifications`**: covered in section 7 below. This is eBay's item specifics and Etsy's attributes.

4. **`tags`**: an array of free strings, cap around 20. Not a replacement for categories. Tags are for the words buyers type that no taxonomy will ever contain.

---

### 4. A few small display and control fields

- `shortDescription`, for cards and feeds. Otherwise every app truncates the long description badly and they all do it differently.
- `brand`, a main filter on any marketplace.
- `catalogVisibility` (`visible` / `catalog` / `search` / `hidden`). This is different from `hideFromFriends`. That one is social privacy: keep it away from people who follow me. This one is browse and search: keep it out of the listings page but let the link work.
- `reviewsAllowed`, lets a seller turn reviews off. Ties into the review record.
- `soldIndividually`, max one per order. One boolean, real constraint.

One field to keep **out**: average rating and review count. If the seller writes their own rating into their own record, it means nothing. The app has to count those.

---

## Variants

### 5. A variant cannot say "any size"

**Now**: `defs#variantProperty` needs both `axis` and `value`.

**Problem**: a real product, "Red, any size, £20" next to "Blue, XL, £25". There is no way to write the first one.

**Change**: make `value` optional. Missing means "any value on this axis".

Platforms that support this leave the value empty to mean the same thing, and it comes up constantly.

---

### 6. No way to tell a copied field from a deliberate override

**Now**: a variant must repeat `title`, `category`, and `type` from its group. The README lists "keep these in sync" as something apps have to police by hand.

**Problem**: if a variant's title differs from its group's title, nobody can tell whether the seller meant to override it or whether the copy went stale. That is the exact worry raised in the README's own open question about copied fields.

**Change**: let a field hold the literal string `"parent"` to mean "use the group's value". Now there are three clear states instead of two:

- a real value → the seller meant to override
- `"parent"` → inherit
- missing → not set

**Why**: this is a solved problem elsewhere. Platforms with variant products use a literal `parent` value on exactly these fields: title, sku, stock, weight, dimensions, tax class, shipping class, image. That list has proven stable over many years, which is a good sign it is the right set.

This is what the README's **Denormalized field consistency** invariant is currently asking apps to police by hand. With an explicit inherit value the drift cannot happen in the first place, so the rule only has to cover records that chose to copy instead.

---

### 7. Nowhere to put product specs

**Problem**: Material, Model, Fabric, Compatible With, Screen Size. None of these vary between variants, so they are not option axes, but buyers filter on them constantly. Right now they can only go in the description as prose, where no app can read them.

**Change**: add a `specifications` array of `{name, value}`.

**Why**: platforms typically model one attribute type with two flags, one marking it as driving variant choice, the other as showing in the spec table. The draft only modelled the first. This adds the second.

---

### 8. productGroup: two small things

- **`defaultVariant`**: which variant is selected when the page opens. No way to say it today.
- **Price is a range, and that is on purpose.** The group has no price field, and it should not get one. It is worked out from the children as a min and max. Worth stating in the README so it reads as a decision rather than an oversight, and so app builders know they own that calculation.

---

## Stock

### 9. Cannot tell "unlimited" from "unknown"

**Now**: `quantity` is optional.

**Problem**: a missing quantity might mean the seller does not track stock (print on demand, digital, services) or it might mean they just did not fill it in. Those need different handling.

**Change**: add `manageStock` (boolean). False means stock is not tracked and quantity should be ignored.

---

### 10. Pre-order and backorder are not the same thing

**Now**: `availability` has `pre_order` but nothing for backorder.

- **Pre-order**: not released yet, ships on a known date.
- **Backorder**: out of stock, still orderable, ships when restocked.

**Change**: add `backorder` to the list. schema.org has `BackOrder` as a separate value too.

Optional extra: `lowStockThreshold`, which is what drives "only 2 left" messages.

---

## Shipping and tax

The rule both of these follow: **the record describes the item, not the cost.**

A shipping rate depends on where the buyer is. A tax rate depends on their country and state and changes without warning. Neither can sit in a record the seller wrote once and strangers read from anywhere. Platforms keep rates in separate configuration and store only the item's *classification* on the product. We should do the same and say so.

### 11. Shipping facts are thin

**Now**: `goodsDetails` has only `shippingWeight` in grams.

**Change**: add

- `dimensions: { length, width, height }` in millimetres. Fix the unit in the lexicon like weight already does, rather than carrying a unit field.
- `shippingClass`, the seller's own grouping, like "bulky" or "fragile". Their rate table keys on it.
- `shippingRequired`, a boolean, so it does not have to be guessed from `type`.

### 12. No tax classification

**Change**: add two fields to the listing:

- `taxStatus`: `taxable` / `shipping` / `none`
- `taxCategory`: a label like `standard`, `reduced`, `zero`

Then say clearly in the README that rate tables and tax calculation are out of scope, same as payments.

### 13. Location is only on the shop

**Now**: `shop` has a location. `listing` does not.

**Problem**: Open Market's current model puts location on the listing, and it needs to. A seller with one shop can have a pickup-only sofa in one city and ship everything else. Local pickup is a first-class shipping method in every shop system.

**Change**: add an optional `location` to `listing`, falling back to the shop's.

---

## Digital goods

### 14. The terms of sale are missing

**Now**: `digitalDetails` has `fileFormat` and `deliveryMethod` as free text.

**Change**

- `downloadLimit` (how many downloads, -1 for unlimited) and `downloadExpiryDays` (-1 for never). These are terms the buyer needs *before* buying, so they belong in the listing.
- `fileFormats` as an array instead of one string. A design asset pack is PNG and SVG and AI.
- `fileSize`.

**Do not** add the file URL. The record is public, so publishing the file gives the product away.

---

## Shop record

### 15. Nothing about policies

**Now**: name, description, logo, website, location.

**Problem**: a buyer lands on a shop they have never heard of, on a server they have never heard of. Returns policy and shipping policy are the only things they have to go on. Right now the record cannot carry them.

**Change**: add `policies` with returns, shipping, terms, and privacy (URL or text), plus `handlingTime`, `banner`, `defaultCurrency`, and `shipsTo`.

---

## Reviews

### 16. `verified` can be set by anyone

**Now**: a boolean on a record the reviewer writes, marked in the README as a placeholder.

**Problem**: any client can set it to `true`, and apps will render a checkmark next to it. A trust mark that anyone can award themselves is worse than no field at all.

**Change**: drop it for now, or rename it so it cannot be mistaken for a checked claim.

**The path forward exists.** Agent-driven checkout specs with a defined order lifecycle are shipping now across the industry. A receipt issued at the end of one of those is exactly the token a real verified flag would need. Worth naming that in the README as the direction instead of leaving the field undefined.

### 17. Only products can be reviewed

**Now**: `subject` points at a productGroup or listing.

**Problem**: portable seller reputation was the whole reason the original proposal was written. Right now a seller's reputation is only the sum of their product reviews, and it disappears if they relist.

**Change**: `subject` is already an AT URI, so it can point at a shop record. Just say so in the description and give apps permission to treat it as a seller review.

Also worth adding: `images` on the review. Photo reviews carry a lot of weight now.

---

### 18. No way to sell things together

**Problem**: a seller puts together a "Home Office Tech Starter Pack", a keyboard and a webcam, listed as one thing customers can buy in one go. Today each product is its own listing and nothing can say they belong together.

**Change**: add `groupedItems` to the listing, an array of `{item, quantity, title}`, where `item` is the AT URI of another listing.

```json
"groupedItems": [
  { "item": "at://did:plc:abc/app.temp.commerce.listing/kb01",
    "quantity": 1, "title": "Custom Mechanical Keyboard" },
  { "item": "at://did:plc:abc/app.temp.commerce.listing/cam01",
    "quantity": 1, "title": "1080p HD Pro Webcam" }
]
```

The listing already carries its own `pricing`, so the seller states the group's price directly. Whether the buyer must take everything or can pick and choose is a checkout question, and checkout is not ours.

`title` is denormalized on purpose, same as the review variant snapshot: the group still renders if an item is deleted or its server is unreachable.

One field covers every version of this: a starter pack, a matching set, a "shop the look". Without a cart, the differences between them live entirely at checkout, so there is nothing left for the schema to distinguish.

---

## Things to deliberately leave out

### Coupons

Tempting, but most of a coupon is the part that cannot work here. Half the fields on a real coupon are running totals that the shop's server has to own: `usageCount`, `usageLimitPerUser`, `usedBy`, and `emailRestrictions`.

A PDS record is public and the seller can edit it, so "one per customer" cannot be enforced. And `usedBy` would publish a list of who bought what.

If we want discounts later, the safe version is a **promotion record that only advertises**: code, amount, expiry, minimum spend, which items it covers. Redeeming it stays at the seller's checkout. Same line the lexicon already draws around payments.

### Per-item discount rules

Grouping itself is in (see section 18). What stays out is the rule that prices a group by reference.

A tempting design puts a discount on each item:

```json
"bundledItems": [
  { "itemRef": "at://…/lens-50mm", "quantity": 1,
    "discountOverride": { "type": "percentage", "value": 15 } }
]
```

That makes every app compute a total from prices held in other records, possibly on other servers, possibly changed since. Two apps showing the same group can show different totals and both be following the spec. In a system with no cart and no checkout, nothing can settle the disagreement.

A grouped listing publishes its own price instead. The seller already knows what they are charging.

---

## Three things to decide together

**1. Should `type` be split in two?**

Today `type` is `goods | service | digital`. That is really describing *delivery*, not structure. Platforms that have run into this keep the two apart: a product type (`simple`, `variable`, `grouped`, `external`) and separate flags for whether it needs shipping and whether it has files.

The part that matters for Open Market is `external`, "the buy button goes somewhere else". That is our main mode, and today it is only an optional `externalUrl` on an otherwise normal listing. Platforms that treat it as a real type also store a `buttonText` with it, so the button can say "Buy on Etsy" instead of something generic.

Options: keep one `type` and add delivery flags next to it, or split into `type` (structure) and `fulfillment` (physical / digital / service).

**2. Do we add the advertise-only promotion record in v1, or leave discounts out entirely?**

**3. When items in a group sell out, whose availability wins?** Right now the group states its own, which is simple but can go stale. The alternative is apps checking every item, which costs a fetch each.

One more to raise with Niizuki: the namespace. The plan is `app.temp.commerce.*` moving to `lexicon-community`. A `site.standard.commerce.*` namespace is also in play, since the WordPress side of the AT Proto world already writes `site.standard.document` records.

---

## Summary of new fields

| Record | Add |
|---|---|
| `listing` | replace `price` with a `pricing` object: `regularPrice`, `salePrice`, `currency`, `taxInclusive`, `saleStartsAt`, `saleEndsAt` |
| `defs#price` | keep as a standalone amount type for shipping costs and minimum spends |
| `defs#variantProperty` | make `value` optional |
| `listing` | `groupedItems`, `taxonomy`, `gtin`, `brand`, `tags`, `shortDescription`, `specifications`, `taxStatus`, `taxCategory`, `manageStock`, `lowStockThreshold`, `soldIndividually`, `catalogVisibility`, `reviewsAllowed`, `location` |
| `listing.availability` | add `backorder` |
| `goodsDetails` | `dimensions`, `shippingClass`, `shippingRequired` |
| `digitalDetails` | `downloadLimit`, `downloadExpiryDays`, `fileFormats`, `fileSize` |
| `productGroup` | `defaultVariant` |
| `shop` | `policies`, `handlingTime`, `banner`, `defaultCurrency`, `shipsTo` |
| `review` | `images`; resolve `verified`; document shop as a valid subject |
| all | `"parent"` as an inherit value on fields a variant copies from its group |

---

## Deliberately not in scope yet

Importing from existing shop software is a later job, and it should not steer the schema. The fields above stand on their own merits: a person listing one handmade bag needs `salePrice` and `taxInclusive` just as much as a store with 5,000 products does.

The one thing worth revisiting once an import path is real: images are `blob` only. That is right for someone photographing a used bike on their phone, and it may be wrong for a catalog whose images are already hosted elsewhere. Not a reason to change anything now.
