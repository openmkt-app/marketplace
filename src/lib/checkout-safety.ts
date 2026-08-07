// src/lib/checkout-safety.ts
//
// Judges how much a checkout link can be trusted before we send a buyer to it.
//
// Open Market never takes payment, so every sale ends on someone else's site.
// That is the same arrangement as linking to Etsy or Amazon, and it is fine —
// right up until a seller publishes a link to a page that only *looks* like a
// real checkout. Records are written by sellers, so nothing stops that.
//
// The obvious defence, an allow-list of payment domains, would break the
// product: most sellers link to their own shop, and blocking everything that
// is not Stripe would block them all. So instead of asking "is this host on a
// list", we ask "is this host pretending to be one". A plain unknown domain is
// ordinary and gets no warning. A domain one letter away from a known one is
// not ordinary, and that is where the interstitial earns its interruption.

import { AFFILIATE_CONFIG, detectPlatform } from './external-link-utils.ts';

/** Hosts that take money. Not an allow-list — a list of names worth imitating. */
const PAYMENT_HOSTS = [
  'stripe.com',
  'paypal.com',
  'paypal.me',
  'gumroad.com',
  'ko-fi.com',
  'buymeacoffee.com',
  'lemonsqueezy.com',
  'payhip.com',
  'patreon.com',
  'squareup.com',
  'square.link',
  'bigcartel.com',
  'bandcamp.com',
  'itch.io',
  'myshopify.com',
  'shopify.com',
];

/**
 * Names a buyer recognises. A familiar name sitting in front of somebody
 * else's domain (`checkout.stripe.com.pay-now.net`) is the most common form of
 * this attack — more common than misspellings — and it costs nothing to catch.
 *
 * Deliberately excludes short or ordinary words. "square" would flag
 * `square-deals.com`, which is just a shop with a normal name.
 */
const BRAND_TOKENS = [
  'stripe',
  'paypal',
  'etsy',
  'amazon',
  'ebay',
  'gumroad',
  'shopify',
  'mercari',
  'poshmark',
  'depop',
  'patreon',
  'bandcamp',
  'lemonsqueezy',
];

/**
 * Suffixes that take three labels to reach a registrable domain, so that
 * `shop.example.co.uk` resolves to `example.co.uk` and not `co.uk`. A full
 * public suffix list would be more correct; this covers the cases our sellers
 * actually use and degrades safely — a miss makes the domain look longer, not
 * more trusted.
 */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk',
  'com.au', 'net.au', 'org.au',
  'co.nz', 'co.za', 'co.jp', 'co.kr', 'co.in',
  'com.br', 'com.mx', 'com.ar', 'com.tr', 'com.sg',
  'com.hk', 'com.tw', 'com.pl', 'com.ua',
]);

export type SuspicionReason =
  /** One or two letters away from a host a buyer trusts. */
  | { kind: 'lookalike'; target: string }
  /** A trusted name appearing somewhere that is not that company's domain. */
  | { kind: 'brandElsewhere'; brand: string; domain: string }
  /** Non-Latin characters chosen to look like Latin ones. */
  | { kind: 'punycode' }
  /** Plain http. Card details on an unencrypted page are readable in transit. */
  | { kind: 'insecure' };

export type LinkTrust =
  /** A host we recognise: Etsy, Amazon, Stripe's own checkout. */
  | { level: 'platform'; host: string; url: string; platformName: string }
  /** The seller's handle proves they control this domain. */
  | { level: 'sellerDomain'; host: string; url: string; handle: string }
  /** Nobody we know, nothing wrong with it. The common case. */
  | { level: 'unknown'; host: string; url: string }
  /** Imitating something. Worth stopping the buyer for. */
  | { level: 'suspicious'; host: string; url: string; reasons: SuspicionReason[] }
  /** Not a usable web address at all. */
  | { level: 'invalid'; host: null; url: string };

/** Every host worth imitating, drawn from both lists. */
function knownHosts(): string[] {
  const fromAffiliates = Object.values(AFFILIATE_CONFIG)
    .flatMap((config) => config.domains)
    // `facebook.com/marketplace` carries a path; we only compare hostnames.
    .map((domain) => domain.split('/')[0]);
  const all = [...fromAffiliates, ...PAYMENT_HOSTS].filter(Boolean);
  return all.filter((domain, index) => all.indexOf(domain) === index);
}

/** `www.` is noise to a buyer reading a hostname, and to every check here. */
export function displayHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

/** The part of a hostname that someone had to register. */
export function registrableDomain(hostname: string): string {
  const parts = displayHost(hostname).split('.');
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

/** True when `host` is the domain itself or sits underneath it. */
function isAtOrUnder(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

/**
 * Characters a reader's eye slides over. Nobody types these links — a seller
 * published it and a buyer clicked it — so the only question that matters is
 * whether the difference is *visible*, not whether it is a plausible typo.
 *
 * Raw edit distance answers the wrong question and answers it badly:
 * `easy.com` is one edit from `etsy.com` and deceives no one. A warning that
 * fires on ordinary domains is a warning buyers learn to click through, which
 * is worse than no warning at all.
 */
const CONFUSABLE_PAIRS = [
  'il', 'i1', 'l1', 'o0', 's5', 'b8', 'g9', 'gq', 'z2', 'mn', 'uv',
];

function isConfusable(a: string, b: string): boolean {
  return CONFUSABLE_PAIRS.some((pair) => pair.includes(a) && pair.includes(b) && a !== b);
}

/** True when `long` is `short` with exactly one extra character inserted. */
function isSingleInsertion(short: string, long: string): boolean {
  if (long.length !== short.length + 1) return false;
  let i = 0;
  let skipped = false;
  for (let j = 0; j < long.length; j++) {
    if (i < short.length && short[i] === long[j]) {
      i++;
    } else if (skipped) {
      return false;
    } else {
      skipped = true;
    }
  }
  return i === short.length;
}

/**
 * How many deceptive edits separate two domains, or null when the difference
 * is one a buyer would actually notice.
 */
function deceptiveDistance(domain: string, target: string): number | null {
  if (domain === target) return 0;

  if (domain.length === target.length) {
    const diffs: number[] = [];
    for (let i = 0; i < domain.length; i++) {
      if (domain[i] !== target[i]) diffs.push(i);
    }
    if (diffs.length === 1) {
      return isConfusable(domain[diffs[0]], target[diffs[0]]) ? 1 : null;
    }
    if (diffs.length === 2) {
      const [a, b] = diffs;
      // Two letters swapped round: etsy / esty.
      if (b === a + 1 && domain[a] === target[b] && domain[b] === target[a]) return 1;
      const bothConfusable =
        isConfusable(domain[a], target[a]) && isConfusable(domain[b], target[b]);
      return bothConfusable ? 2 : null;
    }
    return null;
  }

  // A doubled or dropped letter: stripee.com, stipe.com.
  if (Math.abs(domain.length - target.length) === 1) {
    const [short, long] = domain.length < target.length ? [domain, target] : [target, domain];
    return isSingleInsertion(short, long) ? 1 : null;
  }

  return null;
}

/** Longer names hide a second alteration; short ones do not. */
function lookalikeThreshold(target: string): number {
  return target.length >= 10 ? 2 : 1;
}

function findLookalike(domain: string, known: string[]): string | null {
  let best: { target: string; distance: number } | null = null;
  for (const target of known) {
    if (domain === target) return null; // exact matches are handled elsewhere
    const distance = deceptiveDistance(domain, target);
    if (distance === null || distance === 0) continue;
    if (distance > lookalikeThreshold(target)) continue;
    if (!best || distance < best.distance) best = { target, distance };
  }
  return best?.target ?? null;
}

/** A brand name worn by a domain that does not belong to that brand. */
function findBorrowedBrand(host: string, known: string[]): string | null {
  const words = host.split('.').flatMap((label) => label.split(/[^a-z0-9]+/i));
  for (const brand of BRAND_TOKENS) {
    if (!words.includes(brand)) continue;
    // The brand's own domains are legitimate users of their own name.
    const ownsIt = known.some(
      (domain) => registrableDomain(domain).split('.')[0] === brand && isAtOrUnder(host, domain),
    );
    if (!ownsIt) return brand;
  }
  return null;
}

/**
 * A handle on a domain proves DNS control of that domain — that is how AT
 * Protocol handle verification works. So a seller whose handle is `migro.dev`
 * linking to `migro.dev` has already proved the connection, with no badge for
 * us to award or revoke. Handles on shared hosts prove nothing about the host.
 */
const SHARED_HANDLE_HOSTS = ['bsky.social', 'bsky.network'];

function handleProvesDomain(handle: string | undefined, host: string): boolean {
  if (!handle || !handle.includes('.')) return false;
  const normalized = displayHost(handle);
  if (SHARED_HANDLE_HOSTS.some((shared) => isAtOrUnder(normalized, shared))) return false;
  return registrableDomain(normalized) === registrableDomain(host);
}

export interface AssessOptions {
  /** The seller's AT Protocol handle, used to recognise their own domain. */
  sellerHandle?: string;
}

/**
 * Decide what to tell a buyer about an outbound checkout link.
 *
 * Order matters: imitation outranks everything. A seller whose own handle sits
 * on a Stripe-lookalike domain still gets the warning, because the buyer's risk
 * does not change just because the seller owns the forgery.
 */
export function assessCheckoutLink(rawUrl: string, options: AssessOptions = {}): LinkTrust {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { level: 'invalid', host: null, url: rawUrl };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { level: 'invalid', host: null, url: rawUrl };
  }

  const url = parsed.toString();
  const host = displayHost(parsed.hostname);
  const known = knownHosts();
  const reasons: SuspicionReason[] = [];

  // Punycode is never innocent on a checkout link. `xn--` means the hostname
  // held characters outside ASCII, which is how a Cyrillic "а" passes for "a".
  if (host.split('.').some((label) => label.startsWith('xn--'))) {
    reasons.push({ kind: 'punycode' });
  }

  const onKnownHost = known.some((domain) => isAtOrUnder(host, domain));

  if (!onKnownHost) {
    const borrowed = findBorrowedBrand(host, known);
    if (borrowed) {
      reasons.push({ kind: 'brandElsewhere', brand: borrowed, domain: registrableDomain(host) });
    }
    const lookalike = findLookalike(registrableDomain(host), known);
    if (lookalike) {
      reasons.push({ kind: 'lookalike', target: lookalike });
    }
  }

  // Only worth raising once something else is already wrong, or when money is
  // clearly involved — plain http on an ordinary shop link is untidy, not a trap.
  if (parsed.protocol === 'http:' && (reasons.length > 0 || onKnownHost)) {
    reasons.push({ kind: 'insecure' });
  }

  if (reasons.length > 0) {
    return { level: 'suspicious', host, url, reasons };
  }

  const platform = detectPlatform(url);
  if (platform) {
    return { level: 'platform', host, url, platformName: platform.config.name };
  }
  if (onKnownHost) {
    return { level: 'platform', host, url, platformName: registrableDomain(host) };
  }
  if (handleProvesDomain(options.sellerHandle, host)) {
    return { level: 'sellerDomain', host, url, handle: displayHost(options.sellerHandle!) };
  }
  return { level: 'unknown', host, url };
}

/** Whether this link should go through the warning page rather than straight out. */
export function needsWarning(trust: LinkTrust): boolean {
  return trust.level === 'suspicious' || trust.level === 'invalid';
}

/**
 * What to print on the buy button. A recognised platform gets its name; anyone
 * else gets their actual hostname, because "Buy on Website" hides the one
 * detail a buyer needs to judge where they are going.
 */
export function checkoutDestinationLabel(trust: LinkTrust): string {
  if (trust.level === 'platform') return trust.platformName;
  return trust.host ?? '';
}

/** Route a link through the interstitial when it deserves one. */
export function checkoutHref(trust: LinkTrust): string {
  if (!needsWarning(trust)) return trust.url;
  return `/leaving?to=${encodeURIComponent(trust.url)}`;
}
