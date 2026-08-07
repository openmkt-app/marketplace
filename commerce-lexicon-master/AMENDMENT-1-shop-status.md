# Amendment 1: a shop needs to be able to say it is not trading

An addition to `PROPOSED-CHANGES.md`, found while building the schema into a working marketplace.

The main proposal was written by reading the draft against what shop software already does. This one comes from the other direction: we shipped the schema, a real seller used it, and a gap showed up that reading alone did not surface.

---

## What is missing

A shop can describe itself — name, policies, handling time, where it ships — but it cannot say whether it is open for business right now.

## The problem

A seller goes on holiday for two weeks. They are not going to ship anything and they are not taking commissions. There is nothing in the shop record that says so.

The only way to express it today is to edit every listing one at a time and set `availability` to `out_of_stock`, then come back and undo it. For a seller with forty listings that is eighty edits to take a holiday. Worse, it destroys information: after they reverse it, the difference between "this one was genuinely sold out" and "this one was only paused because I was away" is gone.

This is not the same fact as `listing.availability`. Those two answer different questions:

- `listing.availability` — *is this particular thing available?* One item is sold out; one commission type is booked solid while another is still open.
- shop status — *is this seller trading at all?*

A commission artist can be full on large pieces and still taking small ones. That is per-listing. "I am away until the 20th" is not.

## Prior art

Every shop platform we looked at has this, and all of them put it on the shop rather than on the product.

- **Etsy** — Vacation Mode, with a custom message shown to buyers and an optional auto-reply
- **WooCommerce** — catalog mode / store notice, widely used for exactly this
- **Shopify** — pause-and-build, which keeps the storefront visible but stops checkout

Three independent teams reached for a shop-level switch. That is usually a sign the fact belongs at the shop level.

## Proposed change

Add to `shop`:

```json
{
  "status": {
    "type": "string",
    "knownValues": ["open", "vacation", "closed"],
    "description": "Whether the shop is trading. Absent means open."
  },
  "statusMessage": {
    "type": "string",
    "maxGraphemes": 300,
    "description": "What buyers are told while the shop is not open, e.g. 'Back on the 20th'."
  },
  "reopensAt": {
    "type": "string",
    "format": "datetime",
    "description": "When the seller expects to trade again. Only meaningful with status 'vacation'."
  }
}
```

Three values rather than a boolean, because "away for a fortnight" and "this shop has wound down" are different things to show a buyer, and a reader that only understands `open` can treat everything else as not-open.

Absent means open. That keeps every existing record valid and means no seller has to set a field to carry on as they are.

## How it interacts with `listing.availability`

The shop is the coarser signal and wins:

- shop `open` — listings mean what they say
- shop `vacation` or `closed` — the whole catalogue reads as unavailable, whatever the individual listings say

Nothing is written to the listings. Their `availability` is left exactly as the seller set it, so when the shop reopens every item goes back to what it was. That is the property the per-listing workaround loses.

## What we are not proposing

- **No auto-reply.** Etsy has one; it is a messaging feature, not a schema one.
- **No scheduled reopening.** `reopensAt` is what the seller tells buyers, not an instruction to any server to flip the field. Nothing in the network is in a position to act on it.
- **No effect on visibility.** A shop on holiday still has a store page and its listings still resolve. `catalogVisibility` already covers hiding things, and conflating the two would mean a seller could not say "still here, back soon".

## Note on scope

One consumer cannot make this work alone. The signal is only useful if readers honour it, which means a client showing a listing needs the shop record too. Worth deciding together whether that is acceptable, or whether the same fact should also be reflected somewhere cheaper to read.

Open Market's own read path has this limitation right now: its store pages have the shop record and honour the status, but its cross-seller browse does not fetch a shop per listing and so cannot.
