// The other options of a product, for a listing that is one variant of it.
//
// A variant is a listing in its own right — its own URL, images, price and
// metadata — and grouping is a fact recorded on it (`partOf`), not a wrapper
// around it. So there is no product page to build: the listing page it already
// had grows a chooser for its siblings.
//
// Only runs for a listing that actually declares `partOf`, which is nearly none
// of them. A plain listing pays nothing for this.

import { BskyAgent } from '@atproto/api';
import { COMMERCE_COLLECTION, collectionFromUri, rkeyFromUri } from '../commerce/collections';
import { normalizeListing, normalizeProductGroup } from '../commerce/normalize';
import { effectiveAmount } from '../commerce/money';

/** One selectable option, flattened for the client. */
export type VariantOption = {
  uri: string;
  title: string;
  /** This variant's value on the group's first axis, e.g. "Professional". */
  value: string;
  /** Minor units. Null means no price was named — "make an offer". */
  amount: number | null;
  currency: string;
  billingPeriod?: string;
  /** The seller's preselected option, e.g. the tier they push. */
  isDefault: boolean;
};

export type VariantGroup = {
  uri: string;
  title: string;
  /** What the choice is called: "Tier", "Size", "Plan". */
  axisName: string;
  options: VariantOption[];
};

/**
 * Read a listing's group and its siblings.
 *
 * Returns null whenever the answer would not be useful — no group, an
 * unreadable group, or a group with fewer than two options. A chooser with one
 * choice is worse than no chooser, because it implies there are others.
 */
export async function fetchVariantGroup(
  pdsEndpoint: string,
  did: string,
  partOf: string,
): Promise<VariantGroup | null> {
  const rkey = rkeyFromUri(partOf);
  const groupCollection = collectionFromUri(partOf);
  if (!rkey || !groupCollection) return null;

  try {
    const agent = new BskyAgent({ service: pdsEndpoint });

    // The group names the axis; the siblings are the options on it. Neither
    // depends on the other, so they overlap rather than queueing.
    const [groupRes, listingsRes] = await Promise.all([
      agent.api.com.atproto.repo
        // Read from the collection the URI names, not the one we would write.
        // A record's own URI is the authority on where it lives, and dev and
        // production use different NSIDs.
        .getRecord({ repo: did, collection: groupCollection, rkey })
        .catch(() => null),
      agent.api.com.atproto.repo
        .listRecords({ repo: did, collection: COMMERCE_COLLECTION, limit: 100 })
        .catch(() => null),
    ]);

    if (!groupRes?.data?.value || !listingsRes?.data) return null;

    const group = normalizeProductGroup(groupRes.data.value as Record<string, any>, {
      uri: groupRes.data.uri,
      cid: groupRes.data.cid,
      authorDid: did,
    });

    const axis = group.optionAxes[0];
    if (!axis) return null;

    const defaultValue = group.defaultVariant?.find(v => v.axis === axis.name)?.value;

    const siblings = listingsRes.data.records
      .map(record =>
        normalizeListing(record.value as Record<string, any>, {
          uri: record.uri,
          cid: record.cid,
          authorDid: did,
        }),
      )
      .filter(listing => listing.partOf === partOf);

    const options: VariantOption[] = siblings.map(listing => ({
      uri: listing.uri,
      title: listing.title,
      // Falling back to the title keeps a mislabelled variant selectable rather
      // than rendering a blank button the buyer cannot identify.
      value: listing.variantProperties?.find(v => v.axis === axis.name)?.value || listing.title,
      amount: effectiveAmount(listing.pricing),
      currency: listing.pricing.currency,
      billingPeriod: listing.pricing.billingPeriod,
      isDefault: !!defaultValue &&
        listing.variantProperties?.some(v => v.axis === axis.name && v.value === defaultValue) === true,
    }));

    if (options.length < 2) return null;

    // The axis's own order, not the order records happen to come back in. A
    // seller writes tiers cheapest-first for a reason, and record order is the
    // order they were created, which is not the same thing.
    const rank = new Map(axis.values.map((v, i) => [v, i]));
    options.sort((a, b) => (rank.get(a.value) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.value) ?? Number.MAX_SAFE_INTEGER));

    return { uri: group.uri, title: group.title, axisName: axis.name, options };
  } catch {
    // A listing page must render without its siblings. This is an enhancement,
    // not a dependency.
    return null;
  }
}
