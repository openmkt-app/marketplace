# Amendment 3: a price that repeats has no way to say so

An addition to `PROPOSED-CHANGES.md`, found the same way as Amendments 1 and 2 — by running the schema against a real listing and finding the seller could not say a true thing.

---

## What is missing

`pricing` describes an amount and a currency. It cannot say the amount recurs.

`$69` and `$69 per year` produce the same record today. A reader has no way to tell a one-off purchase from a subscription, and the seller's only option is to write the schedule into the title or description, where nothing can read it.

## The problem

This is not a software problem, which is where we first hit it. It is a pricing problem, and it turns up wherever a price is a schedule rather than an amount:

- a software licence renewed annually
- a coffee or wine subscription
- a magazine
- a maintenance or support plan
- a membership

Four consequences, in rough order of how much they hurt:

- **Sorting and filtering lie.** A £9 monthly plan sorts below a £50 one-off item and looks nine times cheaper than a £79 annual one. Every price filter in every reader is comparing amounts that are not comparable.
- **The buyer is misled at the point that matters.** A card showing "$69" for something that charges $69 every year is not a display bug; it is the wrong number.
- **It cannot be fixed downstream.** Currency, tax treatment and sale windows are all in the record precisely because a reader cannot infer them. Recurrence is the same kind of fact.
- **Sellers work around it in free text.** "$69/yr" in the title is the recurring-pricing equivalent of "£0, make me an offer" — a person routing around a gap, and unmoderatable for the same reason.

## Prior art

- **Google Merchant Center** — `subscription_period` (`month`, `year`) plus `subscription_period_length`, required for any subscription product
- **Schema.org** — `UnitPriceSpecification.billingDuration` / `billingIncrement`
- **Stripe, Paddle, Lemon Squeezy** — interval plus interval count on every recurring price object
- **App Store, Play Store** — a fixed set of subscription periods a developer chooses from

Everyone models it. The only real disagreement is whether the period is one field or two.

## Proposed change

One field on `defs#pricing`:

```json
{
  "billingPeriod": {
    "type": "string",
    "knownValues": ["day", "week", "month", "quarter", "year"],
    "description": "How often the amounts recur. Absent means a one-off purchase."
  }
}
```

Absent means one-off, so every existing record stays valid and correct.

It applies to `regularPrice` and `salePrice` together, for the same reason `currency` does: a plan and its discounted rate cannot bill on different schedules, and letting them try only creates records two apps will read differently.

## Why one field and not two

Every payment processor models this as an interval plus a count, which would mean adding `billingInterval: 2` for "every two months". We propose not to, for now:

- The count is 1 in the overwhelming majority of real prices. The common set is monthly and annual, then weekly and quarterly.
- `quarter` as a named value covers the one multi-month schedule that is actually a convention, and it renders as a word rather than as arithmetic.
- A second field doubles the ways two readers can disagree — `{month, 12}` and `{year, 1}` are the same price written two ways, and the first client to sort on it has to normalise before it can compare.
- If "every 2 years" turns up in the wild, adding an optional integer later is additive and breaks nothing.

Every value here is one someone actually bills on. A period nobody charges is a value two apps have to agree on for nothing, so the bar for adding one is a real seller who needs it, not a gap in the sequence.

This is a deliberate trade of expressiveness for a schema that two independent apps will read the same way. Worth arguing about; easy to reverse.

## What we are not proposing

- **No unit pricing.** "Per hour", "per 100g", "per square metre" is a different fact — you pay once for a quantity, rather than repeatedly on a schedule. A commission artist charging by the hour needs it, and this field is the wrong home. Left for its own amendment.
- **No free trials, setup fees or minimum terms.** Each is a real part of a subscription offer and none of them is a price. They belong in an offer model, if we ever want one, not bolted onto `pricing`.
- **No renewal or subscription state.** Whether a particular buyer's subscription is active is a transaction record, not a catalogue one. Same line Amendment 2 drew around offers.
- **No auto-renew flag.** It describes the contract, not the price, and no reader can act on it.

## Companion change: `specification.value` becomes optional

`defs#specification` requires both `name` and `value`. That works for "Material: oak" and fails for a feature list — "Client dashboard", "Priority support", "White-label reports" — which is how every tiered product on the web states what a plan includes.

Currently a seller has to invent a value (`{name: "Client dashboard", value: "Included"}`), which reads as noise in any renderer and puts the same meaningless string in a thousand records.

Proposed: `required: ["name"]`. A specification with a value is a property; one without is a feature the listing includes. Both are things a listing says about itself, and splitting them into two arrays would mean a reader has to merge them back to render the panel.

Existing records are unaffected.

## Second companion change: what `externalUrl` is for

`listing.externalUrl` is described as "External URL for purchasing (e.g. Amazon, eBay link)".

That wording rules out the two cases where the link matters most. A free download — a font, a demo, an open-source tool — reaches its buyer only through a URL. So does a free consultation with a booking page. Neither is a purchase, and a reader that trusts the description will label both "Buy on Gumroad" underneath a price of zero.

Nothing structural changes. Proposed wording:

> External URL to reach the product — a shop listing, a download page, a booking page.

Named for what the link does rather than for buying. `checkoutUrl` already exists for the narrower case of going straight to a till, so `externalUrl` was never the purchase field anyway.

## Note on where this came from

A seller wanted to list software licence tiers — the ordinary four-column pricing page every SaaS has. Almost all of it was already expressible: the struck-through introductory price is `salePrice`, "Custom, contact sales" is `acceptingOffers` with no price (Amendment 2), the licence count is a `specification`, and the tiers themselves are what `productGroup` and its option axes are for.

Recurrence was the only thing with nowhere to go — and once found, it turned out not to be about software at all.
