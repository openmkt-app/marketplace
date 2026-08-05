import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Lexicons } from '@atproto/lexicon';

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

// Phase 1: register all lexicons (vendor + project) into one instance.
const lexicons = new Lexicons();
const lexiconFiles = walkDir(lexiconDir);
let schemaErrors = 0;
console.log('--- Schema registration ---\n');
for (const file of lexiconFiles) {
  const rel = path.relative(lexiconDir, file);
  try { lexicons.add(JSON.parse(fs.readFileSync(file, 'utf8'))); console.log(`  ✅ ${rel}`); }
  catch (e) { console.error(`  ❌ ${rel}\n     ${e.message}`); schemaErrors++; }
}

// Phase 2: validate sample records. A run with zero records is a FAILURE,
// not a pass — record-level checks are the only thing that exercises refs
// like the labels union and the type-specific detail unions.
console.log('\n--- Record validation ---\n');
let recordErrors = 0;
let recordCount = 0;
if (!fs.existsSync(fixtureDir)) {
  console.error('  ❌ no test/fixtures/ directory — record validation cannot run');
  recordErrors++;
} else {
  const fixtures = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.json'));
  for (const file of fixtures) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), 'utf8'));
      const nsid = record.$type;
      if (!nsid) { console.error(`  ❌ ${file}: missing $type`); recordErrors++; continue; }
      lexicons.assertValidRecord(nsid.split('#')[0], record);
      console.log(`  ✅ ${file} (${nsid})`); recordCount++;
    } catch (e) { console.error(`  ❌ ${file}\n     ${e.message}`); recordErrors++; }
  }
  if (recordCount === 0) { console.error('  ❌ no records validated — fixtures are required'); recordErrors++; }
}

console.log(`\nSchemas: ${lexiconFiles.length - schemaErrors}/${lexiconFiles.length} valid`);
console.log(`Records: ${recordCount} valid`);
const totalErrors = schemaErrors + recordErrors;
if (totalErrors > 0) { console.log(`\n${totalErrors} error(s) found.`); process.exit(1); }
console.log('\nAll checks passed.');
