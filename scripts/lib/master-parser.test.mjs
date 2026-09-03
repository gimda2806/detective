// Quick self-test: run with `node scripts/lib/master-parser.test.mjs`.
// Validates the parser/validator against the real CASE901 reference
// (should pass with 3 contradiction stages, 3 red herrings, distinct
// evidence per stage) and against a couple of deliberately broken
// variants (should fail with the expected error).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  validateMasterText,
  buildUploadEnvelope,
  findNpcNameMismatches,
  findTimelineActorMerges,
  splitTopSections,
} from './master-parser.mjs';

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

// Simulates the real bug: CHARACTERS still has an earlier draft's name
// for CH04, while FULL_TRUTH/CASE_COMPLETE consistently call that
// character by her real name — this is what let a phantom NPC speak
// mid-interview in production, since conversationTarget() reads the
// name straight off the public npc list (from CHARACTERS).
const phantomNpcMaster = reference.replace(
  '[CH04]\nname: 차유라',
  '[CH04]\nname: 박지호',
);
const phantomMismatches = findNpcNameMismatches(splitTopSections(phantomNpcMaster));
check(
  'detects a CHARACTERS name that disagrees with FULL_TRUTH/CASE_COMPLETE',
  phantomMismatches.some(
    (m) => m.characterId === 'CH04' && m.registeredName === '박지호' && m.mentionedName === '차유라',
  ),
);
const phantomNpcResult = validateMasterText(phantomNpcMaster);
check(
  'rejects a master with a mismatched NPC name',
  phantomNpcResult.errors.some((e) => e.includes('NPC_NAME_MISMATCH')),
);
check(
  'the real CASE901 reference has no NPC name mismatches',
  findNpcNameMismatches(splitTopSections(reference)).length === 0,
);

check(
  'the real CASE901 reference has no timeline actor merges (T06/T07 were split to fix this)',
  findTimelineActorMerges(splitTopSections(reference)).length === 0,
);

// Re-merges T06/T07 back into one narrative-style entry naming both
// actors, the exact anti-pattern this was written to catch.
const mergedTimelineMaster = reference.replace(
  '[T06]\ntime: 21:10\nlocation: L02\nactors: CH02\nactual_action: 강도윤이 무대 위에서 후원 발표를 시작한다.\nworld_fact: 발표는 21:13까지 진행된다.\n[T07]\ntime: 21:10\nlocation: L02\nactors: CH03\nactual_action: 문예진이 무대 뒤에서 발표 자료를 조작한다.\nworld_fact: 문예진은 발표가 끝나는 21:13까지 무대 뒤를 벗어나지 않는다.\n',
  '[T06]\ntime: 21:10\nlocation: L02\nactors: CH02, CH03\nactual_action: 강도윤이 무대 위에서 후원 발표를 시작한 뒤, 문예진이 무대 뒤에서 발표 자료를 조작하고 나서 자리를 지킨다.\nworld_fact: 발표는 21:13까지 진행된다.\n',
);
const mergedTimelineMismatches = findTimelineActorMerges(splitTopSections(mergedTimelineMaster));
check(
  'detects two actors merged into one actual_action',
  mergedTimelineMismatches.some((m) => m.id === 'T06' && m.field === 'actualAction'),
);
const mergedTimelineResult = validateMasterText(mergedTimelineMaster);
check(
  'rejects a master with a merged multi-actor timeline entry',
  mergedTimelineResult.errors.some((e) => e.includes('TIMELINE_NARRATIVE_STYLE')),
);

// A long single-actor sentence (T10, 차유라 alone) must not be flagged —
// this check is about how many *listed actors* are named, not sentence
// length, so it should never fire on a normal one-person action.
check(
  'does not flag a long single-actor timeline sentence as a false positive',
  !findTimelineActorMerges(splitTopSections(reference)).some((m) => m.id === 'T10'),
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall checks passed');
