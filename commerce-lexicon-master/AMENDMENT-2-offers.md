# Amendment 2: a seller who does not have a price has nowhere to put that

An addition to `PROPOSED-CHANGES.md`, found the same way as Amendment 1 — by running the schema in a real marketplace and watching what sellers do with it.

---

## What is missing

`pricing.regularPrice` is required. Every listing must name a number, including the ones whose seller genuinely does not know what the thing is worth.

There is also no way to say "I will consider offers".

## The problem

These two gaps combine into a specific, well-known failure. A seller with no price still has to enter one, so they enter **0** and write "make me an offer, not really free" in the description.

That is not a hypothetical. It is endemic on Facebook Marketplace, and it is corrosive for three reasons:

- **Zero sorts first.** Cheapest-first is the most-used sort on a second-hand marketplace, so a fake-free listing takes the top slot from every honest one.
- **Free filters stop working.** Anyone looking for genuinely free things wades through items that are not.
- **It cannot be moderated.** With no honest alternative, "£0 and make me an offer" is a reasonable thing for an ordinary person to do. You cannot fairly act against a user for working around a gap in the schema.

The last point is the one that matters most. A rule is only enforceable when the person breaking it had a legitimate option and chose not to use it.

Stores do not hit this — a shop knows its prices. It is squarely a peer-to-peer problem, and a schema meant to cover both has to hold both.

## Prior art

- **eBay** — Best Offer, alongside a Buy It Now price
- **Facebook Marketplace** — Make an offer, and, tellingly, an explicit "Free" toggle separate from the price field
- **Craigslist, Gumtree** — long-standing conventions for "offers", "OBO", "price negotiable"

Facebook's split is the interesting one. Having both a Free toggle *and* an offers flow is an admission that "price = 0" is doing two unrelated jobs.

## Proposed change

**1. `acceptingOffers` on `listing`**

```json
{
  "acceptingOffers": {
    "type": "boolean",
    "description": "The seller will consider offers. The price, if present, is a guide rather than a fixed ask."
  }
}
```

**2. `regularPrice` becomes optional in `defs#pricing`**

Currently `required: ["regularPrice", "currency"]`. Proposed: `required: ["currency"]`.

Absent means the seller has not named a price. A reader should show "make an offer" rather than "free" or "0". `currency` stays required, because an offer still has to be denominated in something.

A lexicon cannot express "required unless another field is set", so this is left to the writer: a listing that is neither free nor accepting offers should carry a price, and one that names no price should set `acceptingOffers`.

## Why this closes the loophole rather than moving it

With both fields, zero and no-price stop being interchangeable:

| the seller means | how they say it |
|---|---|
| this is genuinely free | `regularPrice: 0` |
| I want offers, roughly this much | price set, `acceptingOffers: true` |
| I have no idea what it is worth | no `regularPrice`, `acceptingOffers: true` |

A client can then refuse the combination that carries the lie — `regularPrice: 0` together with `acceptingOffers: true` — and a listing at zero that asks for offers in its description becomes unambiguous abuse rather than a person routing around a missing feature.

## What we are not proposing

- **No offer records.** Making and accepting offers is a messaging flow, and modelling it would drag negotiation state into a catalogue schema. `acceptingOffers` is a fact about the listing, not a transaction.
- **No minimum or reserve.** A floor the buyer cannot see is an invitation to waste their time, and one they can see is just the price.
- **No "or best offer" as a price type.** It is a flag on the listing, not a third kind of amount, so nothing that reads `pricing` needs to change.

## Note on the pivot behind this

Open Market began as a peer-to-peer marketplace — people listing things they own — and later grew to cover shops and commissions. The schema needs to serve both, and this gap only shows up on the peer-to-peer side. It is worth checking any pricing decision against a person selling one used bookshelf, not only against a shop with a catalogue.
