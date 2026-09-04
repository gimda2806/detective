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
  extractHiddenReleases,
  findDuplicateFactClaimDefinitions,
  findNpcNameMismatches,
  findTimelineActorMerges,
  findUndefinedIdReferences,
  repairReferencedIds,
  replaceTopSection,
  splitTopSections,
  TOP_LEVEL_SECTIONS,
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
check(
  'envelope opening_scene is a real location id',
  envelope.locations.some((l) => l.id === envelope.opening_scene),
);
check(
  'envelope master.raw_text preserves full text',
  envelope.master.raw_text === reference,
);

const missingStages = reference.replace(
  /\[C03\][\s\S]*?(?=\[RED_HERRINGS\])/,
  '',
);
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
const phantomMismatches = findNpcNameMismatches(
  splitTopSections(phantomNpcMaster),
);
check(
  'detects a CHARACTERS name that disagrees with FULL_TRUTH/CASE_COMPLETE',
  phantomMismatches.some(
    (m) =>
      m.characterId === 'CH04' &&
      m.registeredName === '박지호' &&
      m.mentionedName === '차유라',
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
const mergedTimelineMismatches = findTimelineActorMerges(
  splitTopSections(mergedTimelineMaster),
);
check(
  'detects two actors merged into one actual_action',
  mergedTimelineMismatches.some(
    (m) => m.id === 'T06' && m.field === 'actualAction',
  ),
);
const mergedTimelineResult = validateMasterText(mergedTimelineMaster);
check(
  'rejects a master with a merged multi-actor timeline entry',
  mergedTimelineResult.errors.some((e) =>
    e.includes('TIMELINE_NARRATIVE_STYLE'),
  ),
);

// A long single-actor sentence (T10, 차유라 alone) must not be flagged —
// this check is about how many *listed actors* are named, not sentence
// length, so it should never fire on a normal one-person action.
check(
  'does not flag a long single-actor timeline sentence as a false positive',
  !findTimelineActorMerges(splitTopSections(reference)).some(
    (m) => m.id === 'T10',
  ),
);

// The exact real-world failure this was written to fix: an id reference
// dropped its zero-padding (S-CH04-01 -> S-CH04-1) in the bulleted
// requires_heard_claim_ids list.
const idTypoBlock =
  'requires_heard_claim_ids:\n\n* S-CH04-01\nrequires_presented_evidence_ids:\n* E02\n* E04\nrequires_comparison:\nclaim_id: S-CH04-01\nevidence_ids: E02, E04\n';
const idTypoCorrupted = idTypoBlock
  .replace('* S-CH04-01\n', '* S-CH04-1\n')
  .replace('* E02\n', '* E2\n')
  .replace('claim_id: S-CH04-01\n', 'claim_id: S-CH04-1\n')
  .replace('evidence_ids: E02, E04\n', 'evidence_ids: E2, E04\n');
const idTypoMaster = reference.replace(idTypoBlock, idTypoCorrupted);
const idTypoRepaired = repairReferencedIds(idTypoMaster);
check(
  'repairReferencedIds zero-pads a bulleted claim id reference',
  idTypoRepaired.text.includes('* S-CH04-01\n'),
);
check(
  'repairReferencedIds zero-pads a bulleted evidence id reference',
  idTypoRepaired.text.includes('* E02\n'),
);
check(
  'repairReferencedIds zero-pads a flat claim_id reference',
  idTypoRepaired.text.includes('claim_id: S-CH04-01\n'),
);
check(
  'repairReferencedIds zero-pads ids inside a comma-separated evidence_ids line',
  idTypoRepaired.text.includes('evidence_ids: E02, E04\n'),
);
check(
  'repairReferencedIds fully restores the original reference text',
  idTypoRepaired.text === reference,
);
check(
  'repairReferencedIds reports a nonzero fix count',
  idTypoRepaired.fixCount > 0,
);

// A reference to an id that was never defined anywhere (not just
// mis-padded) must be left alone rather than guessed at.
const undefinedIdMaster = reference.replace('* S-CH04-01\n', '* S-CH04-9\n');
const undefinedIdRepaired = repairReferencedIds(undefinedIdMaster);
check(
  'repairReferencedIds does not touch a reference to a genuinely undefined id',
  undefinedIdRepaired.text === undefinedIdMaster &&
    undefinedIdRepaired.fixCount === 0,
);

// repairReferencedIds should be a no-op on an already-correct master.
const referenceRepaired = repairReferencedIds(reference);
check(
  'repairReferencedIds is a no-op on the already-correct reference',
  referenceRepaired.text === reference && referenceRepaired.fixCount === 0,
);

// hidden_until schema: release_prerequisite + release_trigger must both
// be present and distinct, structurally forcing a 2-step unlock (see the
// real rejection this replaced a free-text release_condition field for).
const hiddenReleases = extractHiddenReleases(splitTopSections(reference));
check(
  '6 hidden_until entries extracted from the reference (CH04 has two), each with a distinct prerequisite/trigger pair',
  hiddenReleases.length === 6 &&
    hiddenReleases.every(
      (item) =>
        item.prerequisite && item.trigger && item.prerequisite !== item.trigger,
    ),
);

const missingTrigger = reference.replace(
  'release_prerequisite: C01\nrelease_trigger: E03\n',
  'release_prerequisite: C01\n',
);
const missingTriggerResult = validateMasterText(missingTrigger);
check(
  'rejects a hidden_until entry missing release_trigger',
  missingTriggerResult.errors.some((e) => e.includes('HIDDEN_UNTIL_SCHEMA')),
);

const samePrereqAndTrigger = reference.replace(
  'release_prerequisite: C01\nrelease_trigger: E03\n',
  'release_prerequisite: C01\nrelease_trigger: C01\n',
);
const samePrereqAndTriggerResult = validateMasterText(samePrereqAndTrigger);
check(
  'rejects a hidden_until entry whose release_prerequisite equals its release_trigger',
  samePrereqAndTriggerResult.errors.some((e) =>
    e.includes('HIDDEN_UNTIL_SCHEMA'),
  ),
);

// findUndefinedIdReferences / findDuplicateFactClaimDefinitions: the
// structural checks that took over what buildQaInstructions' items 9,
// 10 and 13 used to ask an LLM to judge — real reference-position ids
// (bulleted lists, requires_comparison, hidden_until prerequisite/
// trigger) must resolve to something actually defined, and a fact/claim
// id's content must be minted in exactly one place.
check(
  'the real CASE901 reference has no undefined id references',
  findUndefinedIdReferences(reference).length === 0,
);
check(
  'the real CASE901 reference has no duplicate fact/claim id definitions',
  findDuplicateFactClaimDefinitions(splitTopSections(reference)).length === 0,
);

const undefinedReferenceMaster = reference.replace(
  '* S-CH04-01\n',
  '* S-CH04-99\n',
);
check(
  'detects a bulleted reference to an id that is never defined',
  findUndefinedIdReferences(undefinedReferenceMaster).some(
    (problem) => problem.id === 'S-CH04-99',
  ),
);
const undefinedReferenceResult = validateMasterText(undefinedReferenceMaster);
check(
  'rejects a master with an undefined id reference',
  undefinedReferenceResult.errors.some((e) =>
    e.includes('UNDEFINED_ID_REFERENCE'),
  ),
);

const undefinedPrerequisiteMaster = reference.replace(
  'release_prerequisite: C01\nrelease_trigger: E03\n',
  'release_prerequisite: F-GHOST-01\nrelease_trigger: E03\n',
);
check(
  'detects a hidden_until release_prerequisite pointing at an undefined id',
  findUndefinedIdReferences(undefinedPrerequisiteMaster).some(
    (problem) => problem.id === 'F-GHOST-01',
  ),
);

const duplicateFactIdMaster = reference.replace(
  '* fact_id: F-CH02-01',
  '* fact_id: F-CH01-01',
);
check(
  'detects the same fact_id minted under two different characters',
  findDuplicateFactClaimDefinitions(
    splitTopSections(duplicateFactIdMaster),
  ).includes('F-CH01-01'),
);
const duplicateFactIdResult = validateMasterText(duplicateFactIdMaster);
check(
  'rejects a master with a duplicate fact_id definition',
  duplicateFactIdResult.errors.some((e) =>
    e.includes('DUPLICATE_FACT_CLAIM_ID'),
  ),
);

// replaceTopSection: partial regeneration's splice primitive. Swapping
// one section must leave every other section byte-for-byte identical
// and preserve document order, and must report failure (null) for a
// section name that isn't present.
const originalSections = splitTopSections(reference);
const withReplacedRedHerrings = replaceTopSection(
  reference,
  'RED_HERRINGS',
  `${originalSections.RED_HERRINGS}\n\nTEST_MARKER`,
);
check(
  'replaceTopSection finds and replaces an existing section',
  withReplacedRedHerrings !== null &&
    withReplacedRedHerrings.includes('TEST_MARKER'),
);
const resections = withReplacedRedHerrings
  ? splitTopSections(withReplacedRedHerrings)
  : {};
check(
  'replaceTopSection leaves every other section untouched',
  TOP_LEVEL_SECTIONS.filter((name) => name !== 'RED_HERRINGS').every(
    (name) => resections[name] === originalSections[name],
  ),
);
check(
  'replaceTopSection returns null for a section that does not exist',
  replaceTopSection(reference, 'NOT_A_REAL_SECTION', 'x') === null,
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall checks passed');
