// Tests for outbound checkout link assessment.
//
// The contract has two halves and the second one matters more. Catching
// `strlpe.com` is easy; the risk is warning about `migro.dev` and teaching
// buyers that the warning means nothing. Every ordinary shop link below must
// come back clean.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assessCheckoutLink,
  checkoutDestinationLabel,
  checkoutHref,
  needsWarning,
  registrableDomain,
} from '../src/lib/checkout-safety.ts';

const levelOf = (url: string, handle?: string) =>
  assessCheckoutLink(url, { sellerHandle: handle }).level;

const reasonKinds = (url: string) => {
  const trust = assessCheckoutLink(url);
  return trust.level === 'suspicious' ? trust.reasons.map((r) => r.kind) : [];
};

// --- registrable domain ------------------------------------------------

test('registrable domain stops at the part someone had to register', () => {
  assert.equal(registrableDomain('migro.dev'), 'migro.dev');
  assert.equal(registrableDomain('shop.migro.dev'), 'migro.dev');
  assert.equal(registrableDomain('www.migro.dev'), 'migro.dev');
  assert.equal(registrableDomain('a.b.c.migro.dev'), 'migro.dev');
});

test('registrable domain understands multi-part suffixes', () => {
  assert.equal(registrableDomain('shop.example.co.uk'), 'example.co.uk');
  assert.equal(registrableDomain('loja.exemplo.com.br'), 'exemplo.com.br');
});

// --- links that must NOT warn ------------------------------------------

test('known platforms pass straight through', () => {
  assert.equal(levelOf('https://www.etsy.com/listing/123/thing'), 'platform');
  assert.equal(levelOf('https://www.amazon.com/dp/B000'), 'platform');
  assert.equal(levelOf('https://buy.stripe.com/eVa00xabc'), 'platform');
  assert.equal(levelOf('https://checkout.stripe.com/c/pay/cs_live_abc'), 'platform');
});

test("an ordinary shop on its own domain is not suspicious", () => {
  assert.equal(levelOf('https://migro.dev/pricing'), 'unknown');
  assert.equal(levelOf('https://shop.someartist.com/prints'), 'unknown');
  assert.equal(levelOf('https://boutique.example.co.uk/checkout'), 'unknown');
});

test('short unrelated domains are not mistaken for typos', () => {
  // Two edits from etsy.com, and a completely ordinary word.
  assert.equal(levelOf('https://easy.com/buy'), 'unknown');
  assert.equal(levelOf('https://ebony.com/shop'), 'unknown');
});

test('a familiar word inside an ordinary name does not flag', () => {
  // Contains "amazon" only as a substring, not as a word.
  assert.equal(levelOf('https://amazonasleather.com/bag'), 'unknown');
  assert.equal(levelOf('https://square-deals.com/item'), 'unknown');
});

test('plain http on an ordinary shop is untidy, not a trap', () => {
  assert.equal(levelOf('http://someshop.com/item'), 'unknown');
});

// --- the seller's own domain -------------------------------------------

test("a handle on a domain proves the seller controls it", () => {
  const trust = assessCheckoutLink('https://migro.dev/buy', { sellerHandle: 'migro.dev' });
  assert.equal(trust.level, 'sellerDomain');
  assert.equal(trust.level === 'sellerDomain' && trust.handle, 'migro.dev');
});

test('a subdomain handle still proves the registrable domain', () => {
  assert.equal(levelOf('https://shop.migro.dev/buy', 'www.migro.dev'), 'sellerDomain');
});

test('a bsky.social handle proves nothing about anyone else', () => {
  assert.equal(levelOf('https://someshop.com/buy', 'alice.bsky.social'), 'unknown');
  // The pathological case: a handle on the shared host must never make
  // bsky.social itself look like the seller's verified domain.
  assert.equal(levelOf('https://bsky.social/pay', 'alice.bsky.social'), 'unknown');
});

test('the seller domain signal does not apply to a different domain', () => {
  assert.equal(levelOf('https://buy.stripe.com/abc', 'migro.dev'), 'platform');
  assert.equal(levelOf('https://otherplace.com/buy', 'migro.dev'), 'unknown');
});

// --- links that MUST warn ----------------------------------------------

test('a one-letter misspelling of a payment host is caught', () => {
  assert.equal(levelOf('https://checkout.strlpe.com/pay'), 'suspicious');
  assert.deepEqual(reasonKinds('https://checkout.strlpe.com/pay'), ['lookalike']);
});

test('the imitated host is named so the warning can explain itself', () => {
  const trust = assessCheckoutLink('https://strlpe.com/pay');
  assert.equal(trust.level, 'suspicious');
  const lookalike = trust.level === 'suspicious'
    ? trust.reasons.find((r) => r.kind === 'lookalike')
    : undefined;
  assert.equal(lookalike?.kind === 'lookalike' && lookalike.target, 'stripe.com');
});

test('a trusted name in front of somebody else s domain is caught', () => {
  // The most common real attack: reads as Stripe, resolves to pay-now.net.
  const trust = assessCheckoutLink('https://checkout.stripe.com.pay-now.net/c/pay');
  assert.equal(trust.level, 'suspicious');
  const borrowed = trust.level === 'suspicious'
    ? trust.reasons.find((r) => r.kind === 'brandElsewhere')
    : undefined;
  assert.equal(borrowed?.kind === 'brandElsewhere' && borrowed.domain, 'pay-now.net');
});

test('a doubled or dropped letter is caught', () => {
  assert.equal(levelOf('https://stripee.com/pay'), 'suspicious');
  assert.equal(levelOf('https://stipe.com/pay'), 'suspicious');
});

test('two letters swapped round is caught', () => {
  assert.equal(levelOf('https://esty.com/listing/1'), 'suspicious');
});

test('a visible substitution is left alone', () => {
  // One edit from stripe.com, but "stripa" and "stripe" do not look alike.
  assert.equal(levelOf('https://stripa.com/pay'), 'unknown');
});

test('a hyphenated brand name is caught too', () => {
  assert.ok(reasonKinds('https://stripe-secure-checkout.com/pay').includes('brandElsewhere'));
  assert.ok(reasonKinds('https://www.paypal-verify.net/login').includes('brandElsewhere'));
});

test('a unicode lookalike hostname is caught', () => {
  // Cyrillic "а" in place of the Latin one; the URL parser gives us xn--.
  assert.ok(reasonKinds('https://www.аmazon.com/dp/B000').includes('punycode'));
});

test('http is called out once a link is already suspect', () => {
  assert.ok(reasonKinds('http://checkout.strlpe.com/pay').includes('insecure'));
});

test('http on a real payment host is called out', () => {
  assert.ok(reasonKinds('http://buy.stripe.com/abc').includes('insecure'));
});

test('imitation outranks the seller owning the domain', () => {
  // Owning the forgery does not reduce the buyer's risk.
  assert.equal(levelOf('https://strlpe.com/pay', 'strlpe.com'), 'suspicious');
});

// --- unusable input ----------------------------------------------------

test('anything that is not an http url is invalid', () => {
  assert.equal(levelOf('javascript:alert(1)'), 'invalid');
  assert.equal(levelOf('not a url'), 'invalid');
  assert.equal(levelOf(''), 'invalid');
});

// --- what the UI reads -------------------------------------------------

test('the button names the platform, or failing that the host', () => {
  assert.equal(checkoutDestinationLabel(assessCheckoutLink('https://www.etsy.com/x')), 'Etsy');
  assert.equal(checkoutDestinationLabel(assessCheckoutLink('https://migro.dev/x')), 'migro.dev');
});

test('only suspect links are routed through the warning page', () => {
  const ordinary = assessCheckoutLink('https://migro.dev/buy');
  assert.equal(needsWarning(ordinary), false);
  assert.equal(checkoutHref(ordinary), 'https://migro.dev/buy');

  const suspect = assessCheckoutLink('https://strlpe.com/pay');
  assert.equal(needsWarning(suspect), true);
  assert.match(checkoutHref(suspect), /^\/leaving\?to=https%3A%2F%2Fstrlpe\.com%2Fpay$/);
});

test('an invalid url never reaches the buyer as a link', () => {
  assert.equal(needsWarning(assessCheckoutLink('javascript:alert(1)')), true);
});
