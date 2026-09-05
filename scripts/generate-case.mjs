#!/usr/bin/env node
// Generates a new case master (in the CASE901-reference style — see
// scripts/reference/CASE901.txt) from a one-line seed, validates it
// structurally, runs a self-QA pass, and writes the result to
// generated-cases/ — without ever printing the case content to stdout.
// Only pass/fail status and structural error messages (never plot content)
// reach the terminal, so the person running this never has to see the
// mystery before playing it.
//
// Case ids are assigned sequentially starting at CASE001 (see nextCaseId
// below), independent of the CASE901.txt reference file's own name (that
// file is a style example, never itself assigned to a real case).
//
// Usage:
//   node --env-file=.env.local scripts/generate-case.mjs \
//     --seed "폐쇄된 스키 리조트, 사망 원인" \
//     [--case-id CASE005] [--max-attempts 3] [--model gpt-5]
//
// --seed only needs a genre/setting/motive hint — leave the trick (범행
// 수법) unspecified and the model designs one itself; see
// buildGenerationInstructions() below.
//
// If every attempt is exhausted, the last draft is saved to
// generated-cases/failed/<CASE_ID>.attempt<N>.txt (plus a sibling
// .issues.json with the last rejection reasons). Pass that .txt path back
// via --resume to keep repairing it on the next run instead of starting
// over from the seed:
//   node --env-file=.env.local scripts/generate-case.mjs --seed "..." \
//     --resume generated-cases/failed/CASE005.attempt3.txt
//
// Requires OPENAI_API_KEY in the environment.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  validateMasterText,
  buildUploadEnvelope,
  normalizeCaseId,
  repairReferencedIds,
  replaceTopSection,
  splitTopSections,
  TOP_LEVEL_SECTIONS,
} from './lib/master-parser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

function parseArgs(argv) {
  const args = { maxAttempts: 3, outDir: join(repoRoot, 'generated-cases') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--seed') args.seed = argv[++i];
    else if (arg === '--case-id') args.caseId = argv[++i];
    else if (arg === '--max-attempts') args.maxAttempts = Number(argv[++i]);
    else if (arg === '--model') args.model = argv[++i];
    else if (arg === '--out-dir') args.outDir = join(repoRoot, argv[++i]);
    else if (arg === '--resume') args.resume = argv[++i];
  }
  return args;
}

// Loads a previously exhausted run's last draft (and its last rejection
// reasons, if the sidecar file is present) so this run repairs it instead
// of drafting fresh from the seed. caseId is recovered from the filename
// (<CASE_ID>.attempt<N>.txt) rather than requiring --case-id again.
function loadResume(resumePath) {
  const absolute = join(repoRoot, resumePath);
  const masterText = readFileSync(absolute, 'utf8');
  const match = /(CASE\d+)\.attempt\d+\.txt$/.exec(absolute);
  if (!match) {
    throw new Error(
      `--resume 경로는 <CASE_ID>.attempt<N>.txt 형식이어야 합니다: ${resumePath}`,
    );
  }
  const issuesPath = absolute.replace(/\.txt$/, '.issues.json');
  const issues = existsSync(issuesPath)
    ? JSON.parse(readFileSync(issuesPath, 'utf8'))
    : [];
  return { caseId: match[1], masterText, issues };
}

function collectUsedCaseIds(outDir) {
  const used = new Set();
  const indexPath = join(repoRoot, 'data/cases/index.json');
  if (existsSync(indexPath)) {
    for (const item of JSON.parse(readFileSync(indexPath, 'utf8'))) {
      if (item.id) used.add(item.id.toUpperCase());
    }
  }
  if (existsSync(outDir)) {
    for (const file of readdirSync(outDir)) {
      const match = file.match(/^(CASE\d+)\./);
      if (match) used.add(match[1]);
    }
  }
  return used;
}

function nextCaseId(outDir) {
  const used = collectUsedCaseIds(outDir);
  for (let n = 1; n <= 999; n += 1) {
    const id = `CASE${String(n).padStart(3, '0')}`;
    if (!used.has(id)) return id;
  }
  throw new Error('CASE001-999 범위가 모두 사용 중입니다.');
}

async function callOpenAI({ model, instructions, input, jsonSchema }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되어 있지 않습니다.');
  }

  // No `temperature` here: reasoning models (gpt-5 and friends, the
  // default below) reject it outright, and app/game.ts's own GM calls
  // only set it for the older gpt-4.1-mini default. Pass --model to
  // opt into a model that does accept it if you want more variance.
  const body = {
    model,
    instructions,
    input,
  };
  if (jsonSchema) {
    body.text = {
      format: { type: 'json_schema', strict: true, ...jsonSchema },
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error ${response.status}: ${errorText.slice(0, 300)}`,
    );
  }

  const raw = await response.json();
  const outputText = raw.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')?.text;

  if (!outputText)
    throw new Error(
      'OpenAI Responses API가 output_text를 반환하지 않았습니다.',
    );
  return outputText;
}

function buildGenerationInstructions(caseId) {
  return [
    '너는 한국어 미스터리 게임의 서버 전용 마스터(정답지)를 작성하는 시나리오 라이터다.',
    '아래 예시(CASE901)는 형식과 문체를 보여주기 위한 스타일 참고용일 뿐이다. 예시의 인물, 사건, 트릭, 장소, 대사는 절대 재사용하지 말고, 완전히 새로운 사건을 창작하라.',
    `이번에 만들 사건의 case_id는 반드시 "${caseId}"로 하라.`,
    '시드에 범행 수법(트릭)이 명시되어 있지 않다면, 되묻거나 뻔한 트릭으로 때우지 말고 장르/배경에 맞는 독창적인 트릭을 네가 전적으로 설계하라. 시드에 트릭이 이미 명시돼 있다면 그것을 존중해서 발전시켜라.',
    '출력 형식 규칙 (반드시 지킬 것):',
    '- 최상위 섹션은 [SECTION_NAME] 형태의 줄로만 구분한다. 닫는 태그([/SECTION_NAME])는 절대 쓰지 않는다.',
    '- 섹션 순서와 이름은 예시와 동일하게: CASE_IDENTITY, OPENING_SCENE, SURFACE_INCIDENT, FULL_TRUTH, ACTUAL_TIMELINE, CHARACTERS, LOCATIONS, EVIDENCE, CONTRADICTION_STAGES, RED_HERRINGS, CASE_COMPLETE, FINAL_DEDUCTION, ENDING_EXPLANATION.',
    '- CHARACTERS 섹션 안의 각 인물은 [CH01], [CH02]... 형태의 하위 블록으로 쓰고 name/role/present_location/knows/initial_claims/initial_interview_range/hidden_until/knowledge_limits 필드를 예시와 같은 구조로 채운다.',
    '- hidden_until의 각 fact_or_claim_id 항목에는 반드시 release_prerequisite와 release_trigger 두 필드를 쓴다 (자유 문장인 release_condition은 쓰지 않는다). release_prerequisite는 이미 플레이어가 확보/확인했어야 하는 선행 ID(예: 이전 CONTRADICTION_STAGES C0x, 다른 fact/claim id, 증거 E0x)이고, release_trigger는 그 상태에서 실제로 제시하거나 캐물어야 풀리는 대상 ID(증거 E0x, claim S-CHxx-xx 등)다. 반드시 서로 다른 두 ID를 써서 최소 2단계 진행을 강제하라 — 하나만 쓰거나 같은 ID를 두 번 쓰면 안 된다. 예: release_prerequisite: C01 / release_trigger: E03. release_trigger는 그 사실을 실제로 드러내는 데 필연적으로 필요한 가장 이른 단계/증거를 골라라 — 내용상 상관없는 더 늦은 CONTRADICTION_STAGES(예: 최종 단계 C03)에 억지로 묶어 정보 공개를 불필요하게 지연시키지 마라.',
    '- LOCATIONS는 [L01]... 형태, EVIDENCE는 [E01]... 형태, CONTRADICTION_STAGES는 [C01]... 형태, RED_HERRINGS는 [R01]... 형태, ACTUAL_TIMELINE은 [T01]... 형태의 하위 블록을 쓴다.',
    '반드시 지켜야 할 페이싱 규칙:',
    '- 각 인물의 hidden_until은 release_prerequisite만으로는 아직 안 풀리고, 그 뒤에 release_trigger까지 제시/추궁해야 비로소 풀리도록 설계하라. 한 번의 직접 질문으로 바로 풀리는 인상을 주는 조합(예: release_prerequisite가 이미 항상 참인 사소한 것)은 피하라.',
    '- RED_HERRINGS(조기에 배제될 수 있는 용의자)는 최소 2개 이상 포함하고, 각각 how_to_clear로 해소되더라도 최소 1개의 미해결 서브플롯(가족 갈등, 숨긴 실수, 별개의 비밀 등)을 남겨야 한다. must_not_imply로 플레이어가 성급히 결론 내리면 안 되는 지점을 명시하라.',
    '- CONTRADICTION_STAGES는 최소 3단계를 포함하고, 각 단계(C01, C02, C03...)는 서로 다른 requires_presented_evidence_ids 조합을 요구해야 한다 (같은 증거 조합을 재사용하지 마라).',
    '- 책임자(FULL_TRUTH의 책임자)는 CONTRADICTION_STAGES의 target_character와 일치해야 하며, 최종 단계에서만 F-CHxx-xx(진짜 결정적 사실)가 release 되어야 한다.',
    '- 각 CH0x의 이름은 문서 전체에서 완전히 동일해야 한다. [CHARACTERS]의 name: 필드와 [FULL_TRUTH]·[CASE_COMPLETE]에서 그 인물을 "CH04 이름" 형태로 부를 때의 이름이 한 글자도 다르면 안 된다. 초안을 쓰다가 인물 이름을 바꾸기로 했다면 CHARACTERS를 포함한 문서 전체에서 일괄로 바꿔라 — 한 곳이라도 예전 이름이 남으면 게임에서 존재하지 않는 인물이 등장하는 치명적 버그가 된다.',
    '- [ACTUAL_TIMELINE]의 각 T0x 항목은 목적이 하나인 행동 하나만 담는 원자적(atomic) 사실이어야 한다. 이 규칙은 두 가지 경우 모두에 적용된다: (1) 서로 다른 두 인물의 행동을 "~하고", "~한 뒤", "~하고 나서"로 한 항목에 섞는 것, (2) 같은 한 인물이라도 목적이 다른 두 작업을 한 항목에 이어 붙이는 것 — 예: "카트리지를 교체하고 환기구를 테이프로 막았다", "망사 팩을 휴지통에 버리고 컴퓨터 로그를 삭제하려 했다" 둘 다 위반이다 (전자는 청소/은폐 두 작업, 후자는 물증 폐기와 디지털 흔적 삭제라는 별개 목적). 위반 시 T0x를 목적별로 분리하라(예: T03a 카트리지 교체 / T03b 환기구 테이핑). 분리 후에는 그 사실을 참조하는 다른 인물의 knows/related_timeline과 EVIDENCE의 related_timeline도 올바른 새 T번호로 갱신하라. 다만 "문을 열고 들어간다"처럼 물리적으로 이어지는 한 동작을 묘사하는 것은 분리 대상이 아니다 — 서로 다른 목적/결과를 갖는 두 작업만 분리하라.',
    '반드시 지켜야 할 정합성 규칙 (아래를 어기면 초안이 반려된다):',
    '- [OPENING_SCENE]에서 묘사하는 인물의 위치, 행동, 소지품, 소리 등 모든 디테일은 [ACTUAL_TIMELINE]의 해당 시각 T0x 항목과 정확히 일치해야 한다. 초안을 다 쓴 뒤 오프닝의 문장 하나하나를 타임라인과 대조해서, 근거 없는 디테일(그 시각에 실제로 없었던 인물이나 사건)이 없는지 확인하라. 소리나 목격담처럼 출처가 필요한 묘사는 그 원인이 되는 T0x 사실을 반드시 함께 설계하라.',
    '- requires_presented_evidence_ids, requires_heard_claim_ids 등 다른 섹션의 ID를 참조하는 모든 필드는, 그 ID가 정의된 곳([E01], [S-CH04-01] 등)의 표기와 하이픈·자릿수까지 완전히 동일한 문자열이어야 한다. 정의되지 않은 ID를 임의로 만들어 참조하지 마라.',
    '- LOCATIONS에 접근 제약(승인 필요, 특정 인물만 가능 등)을 적어놓고 ACTUAL_TIMELINE이나 CHARACTERS의 knows에서 다른 인물이 그 장소/설비를 예외적으로 쓴다면, 그 정당한 사유(임시 허가, 문이 열려 있었음, 행사 중 예외 등)를 LOCATIONS나 관련 CH0x에 명시하라. 설명 없는 예외를 만들지 마라.',
    '- 어떤 물건이나 장소 상태가 이야기 중 변화한다면(사라짐, 파손, 위치 이동 등) 그 변화의 시점과 원인을 ACTUAL_TIMELINE의 world_fact나 관련 섹션에 명시적으로 남겨라. 설명 없이 상태만 바뀌지 않게 하라.',
    '- EVIDENCE 각 항목의 found_at은 그 증거가 실제로 발견되는 유일한 장소여야 한다. OPENING_SCENE, LOCATIONS의 base_description, FULL_TRUTH/ACTUAL_TIMELINE의 서술이 그 증거(또는 같은 것으로 보이는 물건)를 found_at과 다른 장소에도 있는 것처럼 묘사하면 안 된다. 범인이 물건을 다른 곳으로 옮기거나 버렸다면, 그 이동 자체를 별도 T0x 항목(예: "L03에서 회수해 L05로 옮겨 버림")으로 명시하고, found_at은 최종적으로 발견되는 장소로 맞춰라. "같은 라벨의 다른 개체"처럼 얼버무리지 말고, 하나의 물건이면 하나의 위치 서사로 끝까지 일관되게 추적하라.',
    '- F-CHxx-xx/S-CHxx-xx 같은 fact/claim ID는 문서 전체에서 정확히 하나의 사실만 가리켜야 한다. knows의 fact_id로 먼저 등장한 사실을 hidden_until의 fact_or_claim_id나 CONTRADICTION_STAGES release의 claim_or_fact_id로 "승격"시키는 것은 정상이지만(같은 사실을 그대로 재참조), 그 자리에 다른 내용의 사실을 새로 쓰지 마라. 이미 쓰인 번호에 다른 사실을 담고 싶다면 반드시 새 번호(예: F-CH04-03)를 발급하라.',
    '- [OPENING_SCENE]은 결정적 순간을 현재진행형으로 단정해 묘사하지 마라 ("~하느라 버튼을 누르고 있었다" 같은 표현은 그 행동이 오프닝 시점에 실제로 벌어지는 중이라는 뜻이 된다). 그 행동의 정확한 시각이 [ACTUAL_TIMELINE]의 특정 T0x와 다르다면, 오프닝은 그 행동을 시도/준비하는 모습이나 이미 끝난 결과로 서술하고, 탐정이 그 장면을 목격한 시각이 해당 T0x 이후임을 자연스럽게 알 수 있게 써라.',
    '- [CHARACTERS] 각 인물의 present_location은 [OPENING_SCENE]에서 그 인물을 묘사한 위치, 그리고 [ACTUAL_TIMELINE]상 오프닝(발견) 시점 직전 그 인물의 마지막 행적, 이 세 곳이 전부 정확히 같은 위치를 가리켜야 한다. 초안을 다 쓴 뒤 CHARACTERS의 present_location마다 오프닝 문장과 그 인물이 등장하는 가장 늦은 T0x를 나란히 대조하라. 이동 중인 인물이라면 "L01에서 L03로 이동 중"처럼 세 곳 모두 같은 이동 상태로 통일해서 써라 — 한쪽은 도착 완료로, 다른 한쪽은 아직 이동 중으로 쓰면 반려된다.',
    '한국어로, 예시와 같은 분량과 밀도로 작성하라. 다른 설명이나 마크다운 코드펜스 없이 마스터 본문만 출력하라.',
  ].join('\n');
}

// Used only when a rejection's issues can't be safely narrowed to a
// section subset (see buildPendingPatch). Unlike the very first draft,
// this is a repair pass on the *existing* masterText, not a fresh
// redraft from the seed — the model gets the actual current document
// as input, so an attempt that fixed 5 of 6 problems doesn't get
// discarded just because the 6th needs a whole-document fix.
function buildFullRepairInstructions(baseInstructions, issues) {
  return [
    baseInstructions,
    '',
    '지금은 시드로부터 새로 쓰는 게 아니라, 입력으로 주어지는 기존 마스터 전체 문서를 수정하는 작업이다. 이미 올바른 부분은 최대한 그대로 유지하고, 아래 문제만 정확히 고쳐서 마스터 전체를 다시 출력하라. 문제와 무관한 내용을 임의로 바꾸지 마라:',
    ...issues.map((issue) => `- ${issue}`),
  ].join('\n');
}

// Instead of always redrafting the whole document on a rejection, a
// section-local repair pass rewrites only the sections an issue set
// actually implicates (see buildPendingPatch below) — cheaper and less
// likely to introduce a fresh mistake in an already-correct section.
function buildSectionRepairInstructions(baseInstructions, sections) {
  return [
    baseInstructions,
    '',
    `지금은 전체 마스터를 새로 쓰는 게 아니라, 기존 마스터 중 문제가 있는 섹션만 고치는 부분 수정 작업이다. 입력으로 주어지는 전체 마스터 문서를 참고해서, 아래 대상 섹션(${sections.join(', ')})의 새 본문만 다시 써라.`,
    '출력 형식: 대상 섹션마다 "[SECTION_NAME]" 헤더 줄 다음 새 본문만 쓰고, 대상이 아닌 다른 섹션은 절대 출력하지 마라 (원본 마스터 전체를 다시 출력하지 마라). 헤더 줄도 정확히 "[SECTION_NAME]" 형태로 포함해야 한다.',
    '문서의 나머지 부분(인물 이름, 이미 정의된 ID, 사실관계, 트릭)과 반드시 일치시키고 새로운 모순을 만들지 마라.',
  ].join('\n');
}

function buildSectionRepairInput(masterText, sections, issuesBySection) {
  const issueLines = sections.flatMap((section) =>
    (issuesBySection.get(section) || []).map(
      (message) => `- [${section}] ${message}`,
    ),
  );
  return [
    '아래는 지금까지 작성된 마스터 전체 문서다 (참고용 컨텍스트 — 대상 섹션 외에는 그대로 유지된다):',
    '---MASTER START---',
    masterText,
    '---MASTER END---',
    '',
    `대상 섹션: ${sections.join(', ')}`,
    '문제 목록:',
    ...issueLines,
  ].join('\n');
}

// Applies a section-repair response back into the full document. Returns
// null (triggering a full-redraft fallback) if the model didn't return
// every requested section under its exact header.
function applySectionPatch(masterText, patchText, sections) {
  const patchSections = splitTopSections(patchText);
  let result = masterText;
  for (const section of sections) {
    const body = patchSections[section];
    if (!body) return null;
    const spliced = replaceTopSection(result, section, body);
    if (!spliced) return null;
    result = spliced;
  }
  return result;
}

// A structural validateMasterText error message maps to exactly the
// section its fix lives in, based on the fixed set of message templates
// that function produces (see scripts/lib/master-parser.mjs). Two
// categories are deliberately left unmapped (null, forcing a full
// redraft): NPC_NAME_MISMATCH can legitimately be fixed by renaming
// either side (CHARACTERS or the section quoting it), and
// TIMELINE_NARRATIVE_STYLE's fix (splitting a T0x entry) ripples into
// other characters' related_timeline and EVIDENCE's related_timeline —
// both need cross-section judgment a single-section patch can't give.
function mapStructuralErrorToSection(message) {
  if (
    message.includes('[CASE_IDENTITY]') ||
    message.startsWith('case_id') ||
    message.startsWith('title_ko')
  ) {
    return 'CASE_IDENTITY';
  }
  if (message.includes('[OPENING_SCENE]')) return 'OPENING_SCENE';
  if (message.includes('[LOCATIONS]') || message.includes('모든 location')) {
    return 'LOCATIONS';
  }
  if (
    message.startsWith('HIDDEN_UNTIL_SCHEMA') ||
    message.includes('[CHARACTERS]') ||
    message.includes('모든 캐릭터에는')
  ) {
    return 'CHARACTERS';
  }
  if (message.includes('[EVIDENCE]') || message.includes('모든 증거에는')) {
    return 'EVIDENCE';
  }
  if (message.includes('[FULL_TRUTH]')) return 'FULL_TRUTH';
  if (message.includes('[FINAL_DEDUCTION]')) return 'FINAL_DEDUCTION';
  if (
    message.includes('[CONTRADICTION_STAGES]') ||
    message.startsWith('CONTRADICTION_STAGES')
  ) {
    return 'CONTRADICTION_STAGES';
  }
  if (
    message.includes('[RED_HERRINGS]') ||
    message.includes('RED_HERRINGS 항목')
  ) {
    return 'RED_HERRINGS';
  }
  // Both duplicate fact/claim ids are minted inside CHARACTERS (see
  // findDuplicateFactClaimDefinitions), so the fix — renumbering one of
  // the two — lives there. An undefined id reference, though, could be a
  // typo at the reference site (any section) or a missing definition
  // (also any section) — left unmapped like NPC_NAME_MISMATCH, forcing a
  // full-document repair rather than guessing which side to fix.
  if (message.startsWith('DUPLICATE_FACT_CLAIM_ID')) return 'CHARACTERS';
  return null;
}

// Builds a partial-repair plan from a set of localized issues, or null
// when partial repair isn't safe/useful: any issue without a confident
// section (including QA's own "MULTIPLE"), or the implicated sections
// covering the whole document anyway.
function buildPendingPatch(localized) {
  if (localized.some((issue) => !issue.section)) return null;

  const sections = [...new Set(localized.map((issue) => issue.section))];
  if (sections.length === 0 || sections.length >= TOP_LEVEL_SECTIONS.length) {
    return null;
  }

  const issuesBySection = new Map();
  for (const issue of localized) {
    const list = issuesBySection.get(issue.section) || [];
    list.push(issue.description);
    issuesBySection.set(issue.section, list);
  }
  return { sections, issuesBySection };
}

const qaSchema = {
  name: 'case_master_qa',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['pass', 'issues'],
    properties: {
      pass: { type: 'boolean' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['section', 'description', 'severity'],
          properties: {
            section: {
              type: 'string',
              enum: [...TOP_LEVEL_SECTIONS, 'MULTIPLE'],
            },
            description: { type: 'string' },
            // critical: the case is actually broken (world-state
            // contradiction a player would hit) — blocks acceptance.
            // advisory: a design-quality nicety (weak red herring,
            // slightly-off pacing) — recorded but never blocks. See
            // buildQaInstructions for which checklist items are which.
            severity: { type: 'string', enum: ['critical', 'advisory'] },
          },
        },
      },
    },
  },
};

function buildQaInstructions() {
  return [
    '너는 한국어 미스터리 게임 마스터(정답지)를 심사하는 QA 리뷰어다.',
    '아래 체크리스트의 각 항목에는 [필수] 또는 [경고] 표시가 있다. [필수]는 그 문제가 있으면 실제로 게임이 망가지거나(정답지 자체가 논리적으로 모순돼 플레이가 불가능해짐) 플레이어가 막다른 곳에 갇히는 경우다. [경고]는 있으면 아쉽지만 플레이 자체는 가능한 완성도 문제(느슨한 페이싱, 약한 서브플롯 등)다.',
    '1. [경고] hidden_until의 release_prerequisite가 사소하거나 사실상 항상 참인 조건이 아니어서, release_trigger 하나만으로 사실상 즉시 풀리는 셈이 되지 않는가 (진짜 2단계 진행을 요구하는가).',
    '2. [경고] RED_HERRINGS가 해소된 뒤에도 최소 1개의 미해결 서브플롯이 남는가.',
    '3. [필수] ACTUAL_TIMELINE의 시간/장소/인물 동선이 서로 모순되지 않는가 (같은 시각 한 인물이 두 곳에 있는 등, 정답지 자체가 성립하지 않는 모순).',
    '4. [필수] FINAL_DEDUCTION과 FULL_TRUTH가 CONTRADICTION_STAGES의 마지막 단계에서 풀리는 사실과 일치하는가 (불일치하면 결말이 논리적으로 연결되지 않는다).',
    '5. [경고] 트릭이 공정한 추리로 풀 수 있는가 (플레이어가 얻을 수 없는 정보에만 의존하지 않는가).',
    '6. [경고] ACTUAL_TIMELINE의 각 항목이 목적이 하나인 행동만 담고 있는가 — 서로 다른 두 인물의 행동이 섞인 경우뿐 아니라, 같은 한 인물이 목적이 다른 두 작업을 "~하고"로 이어 붙인 경우(예: 카트리지 교체 + 환기 테이핑)도 위반이다 (물리적으로 이어지는 한 동작 묘사는 예외).',
    '7. [필수] OPENING_SCENE의 모든 디테일(위치, 소지품, 소리, 목격담)이 ACTUAL_TIMELINE의 해당 시각 사실과 정확히 일치하는가 (불일치하면 플레이어가 처음부터 근거 없는 정보를 받는다).',
    '8. [경고] LOCATIONS의 접근 제약과 실제 사용 장면이 모순 없이 설명되는가 (예외적 사용에 정당한 사유가 명시됐는가).',
    '9. [필수] 상태가 변화하는 물건/장소(사라짐, 파손 등)의 시점과 원인이 명시됐는가. 각 EVIDENCE의 found_at이 OPENING_SCENE/LOCATIONS/FULL_TRUTH/ACTUAL_TIMELINE의 서술과 모순 없이 하나의 위치로 일관되는가 (같은 물건이 서로 다른 두 장소에 있는 것처럼 그려지면 플레이어가 실제로 발견할 수 없는 증거가 생긴다).',
    '10. [경고] release_prerequisite → release_trigger의 순서가 실제 추리 흐름상 자연스러운가 — 너무 이르게 즉시 풀리지도, 내용상 상관없는 더 늦은 단계에 억지로 묶여 불필요하게 지연되지도 않는, 개연성 있는 2단계 진행인가.',
    '11. [필수] CHARACTERS 각 인물의 present_location이 OPENING_SCENE에서 그 인물을 묘사한 위치, 그리고 ACTUAL_TIMELINE상 오프닝(발견) 시점 직전 그 인물의 마지막 행적과 세 곳 모두 정확히 일치하는가 (불일치하면 정답지 속 인물이 동시에 두 곳에 있는 모순이 된다).',
    '아래 네 항목은 정합성이 아니라 재미를 심사한다 — 사건이 논리적으로 성립해도 이 넷을 통과하지 못하면 추리게임으로서 실패다:',
    '12. [필수] 진상(FULL_TRUTH)이 밝혀진 뒤 플레이어가 되짚어볼 수 있는 복선(당시엔 무심코 지나쳤지만 진상과 연결되는 단서)이 EVIDENCE·ACTUAL_TIMELINE·인물 진술 등에 최소 3개 심어져 있는가.',
    '13. [필수] RED_HERRINGS 중 최소 1명은 중간 시점까지 플레이어가 유력한 용의자로 오인할 만큼 설득력 있는 동기·기회·수상한 행동을 갖추고 있는가 (반전이 반전으로 느껴지려면 그럴듯한 오답이 있어야 한다).',
    '14. [필수] 진범이 초반부터 마지막 CONTRADICTION_STAGES 단계 직전까지 다른 용의자들보다 의심을 덜 받도록 설계돼 있는가 (너무 이른 단서로 지목되지 않는가).',
    '15. [필수] 트릭이 플레이어가 게임 안에서 실제로 얻을 수 있는 정보(EVIDENCE, 진술, 관찰)만으로 풀리는가 — 얻을 수 없는 정보에 의존하지 않는가.',
    '(ID 표기 일치, 미정의 ID 참조, 같은 fact/claim ID의 중복 정의, CONTRADICTION_STAGES 단계 수·증거 중복은 이미 구조 검증(validateMasterText)이 기계적으로 걸러내므로 여기서 다시 심사하지 않는다.)',
    '심사 결과: issues 배열에는 발견한 모든 문제를 [필수]/[경고] 구분 없이 다 적어라 — 각 항목을 {section, description, severity} 형태로 쓰고, severity는 그 항목이 [필수]면 "critical", [경고]면 "advisory"로 표시한다. description은 구체적으로 무엇을 고쳐야 하는지 한국어 문장으로 쓴다.',
    'pass는 severity가 "critical"인 항목이 하나도 없을 때만 true로 하라 — "advisory" 항목만 있다면 그것들을 issues에 전부 적더라도 pass=true여야 한다. "critical" 항목이 하나라도 있으면 pass=false다.',
    'section은 그 문제를 고치기 위해 실제로 수정해야 하는 단 하나의 최상위 섹션 이름(CASE_IDENTITY, OPENING_SCENE, SURFACE_INCIDENT, FULL_TRUTH, ACTUAL_TIMELINE, CHARACTERS, LOCATIONS, EVIDENCE, CONTRADICTION_STAGES, RED_HERRINGS, CASE_COMPLETE, FINAL_DEDUCTION, ENDING_EXPLANATION 중 하나)여야 한다. 문제를 고치려면 두 섹션 이상을 함께 수정해야 하거나(예: 오프닝-타임라인 불일치, 증거 위치가 다른 섹션과 모순) 어느 섹션 하나로 좁힐 수 없다면 section에 "MULTIPLE"이라고 적어라 — 추측으로 하나만 고르지 마라.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.seed) {
    console.error('[fail] --seed "장르/배경/트릭 힌트"가 필요합니다.');
    process.exit(1);
  }

  mkdirSync(args.outDir, { recursive: true });
  mkdirSync(join(args.outDir, 'failed'), { recursive: true });

  const resume = args.resume ? loadResume(args.resume) : null;

  // A user-typed --case-id is checked for duplicates up front — before
  // spending an API call — rather than silently colliding with an
  // existing case. Ignored when resuming: a resumed run's id comes from
  // its own prior attempt, not this flag.
  let requestedCaseId;
  if (args.caseId && !resume) {
    const normalized = normalizeCaseId(args.caseId);
    if (!/^CASE[0-9A-Z_-]{1,24}$/.test(normalized)) {
      console.error(
        `[fail] "${args.caseId}"는 올바른 케이스 번호 형식이 아닙니다 (예: CASE005).`,
      );
      process.exit(1);
    }
    if (collectUsedCaseIds(args.outDir).has(normalized)) {
      console.error(
        `[fail] ${normalized}은(는) 이미 사용 중인 케이스 번호입니다.`,
      );
      process.exit(1);
    }
    requestedCaseId = normalized;
  }

  const caseId = resume?.caseId || requestedCaseId || nextCaseId(args.outDir);
  const model = args.model || process.env.CASE_GEN_MODEL || 'gpt-5';
  const reference = readFileSync(join(here, 'reference/CASE901.txt'), 'utf8');

  const baseInstructions = buildGenerationInstructions(caseId);
  const seedInput = [
    `[STYLE REFERENCE ONLY — DO NOT REUSE PLOT] \n${reference}`,
    '',
    `이제 아래 시드로 완전히 새로운 사건을 창작하라.`,
    `시드: ${args.seed}`,
  ].join('\n');

  let masterText = resume?.masterText || '';
  let attempt = 0;
  let ok = false;
  let lastIssues = resume?.issues || [];
  let pendingPatch = null;
  let warnings = [];

  while (attempt < args.maxAttempts && !ok) {
    attempt += 1;

    if (attempt === 1 && !resume) {
      // Only the very first draft starts from the seed. Every retry after
      // this repairs the actual masterText from the previous attempt —
      // never redrafts from scratch — so fixes that already landed are
      // never thrown away just because one remaining issue needs a
      // whole-document repair pass.
      console.error(
        `[..] ${caseId} 생성 요청 중 (시도 ${attempt}/${args.maxAttempts}, 모델 ${model}) — 추론 모델은 1~3분 걸릴 수 있습니다.`,
      );
      masterText = await callOpenAI({
        model,
        instructions: baseInstructions,
        input: seedInput,
      });
    } else if (pendingPatch) {
      console.error(
        `[..] ${caseId} 부분 수정 요청 중 (시도 ${attempt}/${args.maxAttempts}, 대상 섹션: ${pendingPatch.sections.join(', ')})`,
      );
      const patchRaw = await callOpenAI({
        model,
        instructions: buildSectionRepairInstructions(
          baseInstructions,
          pendingPatch.sections,
        ),
        input: buildSectionRepairInput(
          masterText,
          pendingPatch.sections,
          pendingPatch.issuesBySection,
        ),
      });
      const patched = applySectionPatch(
        masterText,
        patchRaw,
        pendingPatch.sections,
      );
      if (patched) {
        masterText = patched;
      } else {
        console.error(`[..] 부분 수정 응답 파싱 실패, 전체 수정으로 대체...`);
        masterText = await callOpenAI({
          model,
          instructions: buildFullRepairInstructions(
            baseInstructions,
            lastIssues,
          ),
          input: masterText,
        });
      }
    } else {
      console.error(
        `[..] ${caseId} 전체 수정 요청 중 (시도 ${attempt}/${args.maxAttempts})`,
      );
      masterText = await callOpenAI({
        model,
        instructions: buildFullRepairInstructions(baseInstructions, lastIssues),
        input: masterText,
      });
    }
    masterText = repairReferencedIds(masterText).text;
    pendingPatch = null;
    console.error(`[..] 초안 수신, 구조 검증 중...`);

    const structural = validateMasterText(masterText);
    if (structural.errors.length) {
      lastIssues = structural.errors;
      console.error(`[..] 구조 검증 실패, 재시도 준비 중...`);
      pendingPatch = buildPendingPatch(
        lastIssues.map((message) => ({
          section: mapStructuralErrorToSection(message),
          description: message,
        })),
      );
      continue;
    }

    console.error(`[..] 구조 검증 통과, 자체 QA 검토 요청 중...`);
    const qaRaw = await callOpenAI({
      model,
      instructions: buildQaInstructions(),
      input: masterText,
      jsonSchema: qaSchema,
    });
    const qa = JSON.parse(qaRaw);

    // Trust our own count over the model's raw `pass` boolean: only a
    // "critical" issue (the world-state itself contradicts, per
    // buildQaInstructions) blocks acceptance. "advisory" findings are
    // recorded but never retried.
    const criticalIssues = qa.issues.filter(
      (issue) => issue.severity === 'critical',
    );
    if (criticalIssues.length === 0) {
      ok = true;
      warnings = qa.issues.map((issue) => issue.description);
      break;
    }

    console.error(`[..] 자체 QA 반려(필수 항목), 재시도 준비 중...`);
    lastIssues = criticalIssues.map((issue) => issue.description);
    pendingPatch = buildPendingPatch(
      criticalIssues.map((issue) => ({
        section: issue.section === 'MULTIPLE' ? null : issue.section,
        description: issue.description,
      })),
    );
  }

  if (!ok) {
    const failPath = join(
      args.outDir,
      'failed',
      `${caseId}.attempt${attempt}.txt`,
    );
    writeFileSync(failPath, masterText, 'utf8');
    writeFileSync(
      failPath.replace(/\.txt$/, '.issues.json'),
      JSON.stringify(lastIssues, null, 2),
      'utf8',
    );
    console.error(
      `[fail] ${caseId} 생성 실패 (${attempt}/${args.maxAttempts}회 시도). 마지막 문제:`,
    );
    for (const issue of lastIssues) console.error(`  - ${issue}`);
    console.error(`(내용은 출력하지 않음. 초안은 ${failPath}에 저장됨)`);
    console.error(
      `(이어서 재시도하려면: --seed 동일하게 주고 --resume ${failPath.replace(repoRoot + '/', '')})`,
    );
    process.exit(1);
  }

  const envelope = buildUploadEnvelope(masterText);
  const masterPath = join(args.outDir, `${caseId}.master.txt`);
  const uploadPath = join(args.outDir, `${caseId}.upload.json`);
  writeFileSync(masterPath, masterText, 'utf8');
  writeFileSync(uploadPath, JSON.stringify(envelope, null, 2), 'utf8');

  console.log(
    `[ok] ${caseId} 생성 및 자체 QA 통과 (시도 ${attempt}/${args.maxAttempts}${warnings.length ? `, 경고 ${warnings.length}건` : ''})`,
  );
  console.log(`  master: ${masterPath}`);
  console.log(`  upload-ready JSON: ${uploadPath}`);
  console.log(
    '  (내용은 출력하지 않음 — 업로드는 scripts/ingest-case.mjs로 자동화 가능)',
  );
  for (const warning of warnings) console.error(`  [경고] ${warning}`);
}

main().catch((error) => {
  console.error(`[fail] ${error.message}`);
  process.exit(1);
});
