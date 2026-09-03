// Quick self-test: run with `node scripts/lib/master-parser.test.mjs`.
// Validates the parser/validator against the real CASE901 reference
// (should pass with 3 contradiction stages, 3 red herrings, distinct
// evidence per stage) and against a couple of deliberately broken
// variants (should fail with the expected error).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateMasterText, buildUploadEnvelope } from './master-parser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const reference = readFileSync(join(here, '../reference/CASE901.txt'), 'utf8');

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`ok - ${label}`);
  } else {
    console.log(`NOT OK - ${label}`);
    failures += 1;
  }
}

const result = validateMasterText(reference);
check('CASE901 reference parses with no errors', result.errors.length === 0);
check('case_id extracted as CASE901', result.caseId === 'CASE901');
check('5 locations extracted', result.locations.length === 5);
check('5 npcs extracted', result.npcs.length === 5);
check('6 evidence cards extracted', result.cards.length === 6);

const envelope = buildUploadEnvelope(reference);
check('envelope opening_scene is a real location id', envelope.locations.some((l) => l.id === envelope.opening_scene));
check('envelope master.raw_text preserves full text', envelope.master.raw_text === reference);

const missingStages = reference.replace(/\[C03\][\s\S]*?(?=\[RED_HERRINGS\])/, '');
const brokenStagesResult = validateMasterText(missingStages);
check(
  'rejects a master with fewer than 3 contradiction stages',
  brokenStagesResult.errors.some((e) => e.includes('CONTRADICTION_STAGES')),
);

const noCaseId = reference
  .replace('case_no: 901\n', '')
  .replace('case_id: CASE901\n', '');
const brokenIdResult = validateMasterText(noCaseId);
check(
  'rejects a master missing case_id',
  brokenIdResult.errors.some((e) => e.includes('case_id')),
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall checks passed');
