import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BlobRef, Lexicons } from '@atproto/lexicon';
import { CID } from 'multiformats/cid';
import { base32 } from 'multiformats/bases/base32';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const lexiconDir = path.join(root, 'lexicons');
const fixtureDir = path.join(root, 'test', 'fixtures');

function walkDir(dir) {
  let results = [];
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) results = results.concat(walkDir(filePath));
    else if (file.endsWith('.json')) results.push(filePath);
  }
  return results;
}

// Phase 1: register every Lexicon into ONE instance. The previous version built a
// fresh Lexicons() per file, so cross-file refs (app.openmkt.commerce.defs#pricing)
// could never resolve and a broken ref would pass silently.
const lexicons = new Lexicons();
const lexiconFiles = walkDir(lexiconDir);
let schemaErrors = 0;
console.log('--- Schema registration ---\n');
for (const file of lexiconFiles) {
  const rel = path.relative(lexiconDir, file);
  try {
    lexicons.add(JSON.parse(fs.readFileSync(file, 'utf8')));
    console.log(`  ✅ ${rel}`);
  } catch (e) {
    console.error(`  ❌ ${rel}\n     ${e.message}`);
    schemaErrors++;
  }
}

// Phase 2: validate sample records. Registration alone never exercises refs,
// unions, or required fields — only validating a real record does.
console.log('\n--- Record validation ---\n');
let recordErrors = 0;
let recordCount = 0;
if (!fs.existsSync(fixtureDir)) {
  console.error('  ❌ no test/fixtures/ directory — record validation cannot run');
  recordErrors++;
} else {
  const fixtures = fs.readdirSync(fixtureDir).filter((f) => f.endsWith('.json'));
  for (const file of fixtures) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), 'utf8'));
      const nsid = record.$type;
      if (!nsid) {
        console.error(`  ❌ ${file}: missing $type`);
        recordErrors++;
        continue;
      }
      lexicons.assertValidRecord(nsid.split('#')[0], record);
      console.log(`  ✅ ${file} (${nsid})`);
      recordCount++;
    } catch (e) {
      console.error(`  ❌ ${file}\n     ${e.message}`);
      recordErrors++;
    }
  }
  // A run that validated nothing is a failure, not a pass — otherwise deleting
  // the fixtures would turn this script into a no-op that still exits 0.
  if (recordCount === 0) {
    console.error('  ❌ no records validated — fixtures are required');
    recordErrors++;
  }
}

// Phase 3: validate what the app actually writes.
//
// Fixtures are hand-written, so they only prove the schema is coherent. This
// runs the real write path — the form's output through toListingInput and
// buildListingRecord — and validates the result, which is the thing that has to
// stay valid as either side changes.
console.log('\n--- Write-path records ---\n');
let writeErrors = 0;
process.env.NEXT_PUBLIC_MARKETPLACE_ENV = 'production';

try {
  const { toListingInput, buildSelfLabels } = await import('../src/lib/commerce/legacy-input.ts');
  const { buildListingRecord, buildShopRecord } = await import('../src/lib/commerce/serialize.ts');

  // Both ends of the shop form: the bare record created automatically on a
  // seller's first save, and one with every field the form can set.
  const shopCases = [
    ['auto-created shop', { name: 'alice.bsky.social' }],
    ['fully filled shop', {
      name: 'Acme Goods',
      description: 'Handmade widgets since 2019.',
      website: 'https://acme.example',
      handlingTime: '1-3 business days',
      defaultCurrency: 'USD',
      shipsTo: ['US', 'CA', 'GB'],
      location: { countryCode: 'US', region: 'Oregon', locality: 'Portland', isRemote: false },
      policies: {
        returns: '30 day returns, buyer pays postage',
        shipping: 'https://acme.example/shipping',
        terms: 'https://acme.example/terms',
        privacy: 'We keep nothing we do not need.',
      },
    }],
    // Everything optional left out — compact() must not emit empty objects.
    ['shop with empty policies', { name: 'Bare', policies: {}, shipsTo: [] }],
    ['shop on vacation', {
      name: 'Acme Goods',
      status: 'vacation',
      statusMessage: 'Back on the 20th',
      reopensAt: '2026-08-20T23:59:59.000Z',
    }],
    ['shop closed for good', { name: 'Acme Goods', status: 'closed', statusMessage: 'Thanks for six good years.' }],
  ];

  for (const [name, input] of shopCases) {
    try {
      const shop = buildShopRecord(input, '2025-03-11T10:04:00.000Z');
      lexicons.assertValidRecord(shop.$type, shop);
      console.log(`  ✅ ${name} (${shop.$type})`);
    } catch (e) {
      console.error(`  ❌ ${name}\n     ${e.message}`);
      writeErrors++;
    }
  }

  // A real BlobRef over a real CID, not the JSON shape: the lexicon validator
  // checks the class, and this is what uploadBlob hands the write path at
  // runtime. Built with the constructor because BlobRef.fromJsonRef calls
  // CID.parse without a base decoder, which cannot read base32 CIDs.
  const blob = new BlobRef(
    CID.parse('bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egm4mnii', base32),
    'image/jpeg',
    1234,
  );

  const cases = [
    ['physical goods', {
      title: 'Oak dining table',
      description: 'Solid oak, seats six.',
      price: '450.00',
      currency: 'USD',
      category: 'furniture',
      condition: 'used_good',
      location: { state: 'Oregon', county: 'Multnomah', locality: 'Portland', zipPrefix: '972' },
      metadata: { subcategory: 'Tables' },
      hideFromFriends: false,
    }],
    ['commission, NSFW, online-only', {
      title: 'Custom character portrait',
      description: 'Full colour, one character.',
      price: '85.00',
      currency: 'USD',
      category: 'digital_arts',
      condition: '',
      location: { state: 'Online', county: 'Online', locality: 'Online Store', isOnlineStore: true },
      metadata: { subcategory: 'Illustration', slotsAvailable: 2, turnaroundTime: '2 weeks', commissionStatus: 'open', externalPlatform: 'etsy' },
      externalUrl: 'https://www.etsy.com/listing/123',
      isNsfw: true,
    }],
    ['free item, zero-decimal currency', {
      title: 'Moving boxes',
      description: 'Come and get them.',
      price: '0',
      currency: 'JPY',
      category: 'free',
      condition: 'used_fair',
      location: { state: 'Tokyo', county: '', locality: 'Shibuya' },
    }],
  ];

  for (const [name, formOutput] of cases) {
    try {
      const record = buildListingRecord(
        { ...toListingInput(formOutput), shopRef: 'at://did:plc:seller/app.openmkt.commerce.shop/self', images: [blob] },
        { createdAt: '2025-03-11T10:04:00.000Z', labels: buildSelfLabels(formOutput.isNsfw) },
      );
      lexicons.assertValidRecord(record.$type, record);
      console.log(`  ✅ ${name} (${record.$type})`);
    } catch (e) {
      console.error(`  ❌ ${name}\n     ${e.message}`);
      writeErrors++;
    }
  }
} catch (e) {
  console.error(`  ❌ could not load the write path\n     ${e.message}`);
  writeErrors++;
}

console.log(`\nSchemas: ${lexiconFiles.length - schemaErrors}/${lexiconFiles.length} valid`);
console.log(`Records: ${recordCount} valid`);
const totalErrors = schemaErrors + recordErrors + writeErrors;
if (totalErrors > 0) {
  console.log(`\n${totalErrors} error(s) found.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
