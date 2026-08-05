#!/usr/bin/env node
//
// Pushes lexicons, Lua scripts, and backfill jobs to a HappyView instance.
// Idempotent — safe to re-run as the spike iterates.
//
//   HAPPYVIEW_URL=http://127.0.0.1:3000 HAPPYVIEW_KEY=hv_... node happyview/setup.mjs
//   node happyview/setup.mjs --dry-run
//   node happyview/setup.mjs --skip-backfill
//
// The API key comes from the HappyView dashboard after the first OAuth login
// (first user becomes super user).

import fs from 'fs';
import path from 'path';
import dns from 'node:dns';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// Optional DNS pin: HAPPYVIEW_RESOLVE=<ip>
//
// After a nameserver change, resolvers hold the old delegation until the NS
// TTL expires — so the host is live but unreachable from a machine whose cache
// is stale. Pinning the address lets the push run anyway. TLS is unaffected:
// the hostname is still used for SNI and certificate validation, only the
// address lookup is short-circuited.
const pinnedIp = process.env.HAPPYVIEW_RESOLVE;
if (pinnedIp) {
  const pinnedHost = new URL(process.env.HAPPYVIEW_URL || 'http://127.0.0.1:3000').hostname;
  const originalLookup = dns.lookup;
  dns.lookup = (hostname, options, callback) => {
    if (hostname === pinnedHost) {
      const cb = typeof options === 'function' ? options : callback;
      const opts = typeof options === 'function' ? {} : options || {};
      if (opts.all) return cb(null, [{ address: pinnedIp, family: 4 }]);
      return cb(null, pinnedIp, 4);
    }
    return originalLookup(hostname, options, callback);
  };
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipBackfill = args.includes('--skip-backfill');

const BASE = (process.env.HAPPYVIEW_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const KEY = process.env.HAPPYVIEW_KEY;

// Record lexicons come from the main lexicons/ tree — the same files the app
// validates and publishes, so there is one source of truth.
const RECORD_LEXICONS = [
  'lexicons/app/openmkt/commerce/defs.json',
  'lexicons/app/openmkt/commerce/shop.json',
  'lexicons/app/openmkt/commerce/productGroup.json',
  'lexicons/app/openmkt/commerce/listing.json',
  'lexicons/app/openmkt/commerce/review.json',
  // v1 is indexed read-only so the merge query has something legacy to read.
  'lexicons/app/openmkt/marketplace/listing.json',
];

// Query lexicons + the Lua that backs them. target_collection tells HappyView
// which record collection the endpoint operates on.
const QUERIES = [
  {
    lexicon: 'happyview/lexicons/app.openmkt.commerce.listListings.json',
    script: 'happyview/scripts/listListings.lua',
    targetCollection: 'app.openmkt.commerce.listing',
  },
  {
    lexicon: 'happyview/lexicons/app.openmkt.commerce.getListing.json',
    script: 'happyview/scripts/getListing.lua',
    targetCollection: 'app.openmkt.commerce.listing',
  },
];

// Collections to backfill from the network. This is what delivers open
// discovery — the relay's listReposByCollection finds every repo holding
// these records, not just sellers the bot follows.
const BACKFILL_COLLECTIONS = [
  'app.openmkt.marketplace.listing',
  'app.openmkt.commerce.listing',
  'app.openmkt.commerce.shop',
];

function readJson(rel) {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) throw new Error(`missing file: ${rel}`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function readText(rel) {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) throw new Error(`missing file: ${rel}`);
  return fs.readFileSync(full, 'utf8');
}

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const detail = typeof parsed === 'string' ? parsed : parsed?.error || JSON.stringify(parsed);
    const err = new Error(`${method} ${endpoint} -> ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return parsed;
}

// The admin API has no documented upsert, so replace-then-create is the
// idempotent path. A 404 on delete just means it was not there yet.
async function replace(kind, id, payload) {
  try {
    await api('DELETE', `/admin/${kind}/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  return api('POST', `/admin/${kind}`, payload);
}

// Scripts avoid DELETE entirely: create, and fall back to updating in place if
// the trigger already exists. That keeps the required permission set to
// scripts:manage alone — deleting to re-create needed a delete grant that is
// easy to leave off a key, and produced a 403 halfway through a run.
async function upsertScript(id, payload) {
  try {
    return await api('POST', '/admin/scripts', payload);
  } catch (e) {
    const alreadyExists = e.status === 409 || /exist|conflict|unique/i.test(e.message);
    if (!alreadyExists) throw e;
    return api('PATCH', `/admin/scripts/${encodeURIComponent(id)}`, payload);
  }
}

async function main() {
  console.log(`HappyView: ${BASE}${dryRun ? '  (dry run)' : ''}\n`);

  if (!dryRun && !KEY) {
    console.error('HAPPYVIEW_KEY is required (get an hv_... key from the dashboard).');
    console.error('Run with --dry-run to check the files without contacting a server.');
    process.exit(1);
  }

  console.log('Record lexicons:');
  const records = RECORD_LEXICONS.map((rel) => ({ rel, doc: readJson(rel) }));
  for (const { rel, doc } of records) {
    console.log(`  ${doc.id}  (${rel})`);
  }

  console.log('\nQuery lexicons + scripts:');
  const queries = QUERIES.map((q) => ({
    ...q,
    doc: readJson(q.lexicon),
    lua: readText(q.script),
  }));
  for (const q of queries) {
    console.log(`  ${q.doc.id}  ->  ${q.targetCollection}  (${path.basename(q.script)}, ${q.lua.length}B)`);
  }

  console.log('\nBackfill collections:');
  for (const c of BACKFILL_COLLECTIONS) console.log(`  ${c}`);

  if (dryRun) {
    console.log('\n--dry-run: nothing sent.');
    return;
  }

  console.log('\n--- Uploading record lexicons ---');
  for (const { doc } of records) {
    // backfill:false here — jobs are created explicitly below so the spike can
    // control ordering and watch them individually.
    await replace('lexicons', doc.id, { lexicon_json: doc, backfill: false });
    console.log(`  ✅ ${doc.id}`);
  }

  console.log('\n--- Uploading query lexicons ---');
  for (const q of queries) {
    await replace('lexicons', q.doc.id, {
      lexicon_json: q.doc,
      target_collection: q.targetCollection,
    });
    console.log(`  ✅ ${q.doc.id}`);
  }

  // Scripts are keyed by a trigger id, not by lexicon name:
  //   record.{index,create,update,delete}:<nsid>
  //   xrpc.{query,procedure}:<nsid>
  //   labeler.apply:<nsid|_actor>
  //   job.run:<type>
  console.log('\n--- Uploading Lua scripts ---');
  for (const q of queries) {
    const trigger = `xrpc.query:${q.doc.id}`;
    await upsertScript(trigger, { id: trigger, body: q.lua });
    console.log(`  ✅ ${path.basename(q.script)} -> ${trigger}`);
  }

  if (skipBackfill) {
    console.log('\n--skip-backfill: no jobs created.');
  } else {
    console.log('\n--- Starting backfill ---');
    for (const collection of BACKFILL_COLLECTIONS) {
      const job = await api('POST', '/admin/backfill', { collection });
      console.log(`  ✅ ${collection}  job=${job?.id ?? '?'}`);
    }
    console.log('\nWatch progress:');
    console.log(`  curl -H "Authorization: Bearer $HAPPYVIEW_KEY" ${BASE}/admin/backfill/status`);
  }

  console.log('\nTry the endpoint once backfill has records:');
  console.log(`  curl "${BASE}/xrpc/app.openmkt.commerce.listListings?limit=5"`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
