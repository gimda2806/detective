#!/usr/bin/env node
// Generates a new CASE9xx-style master (see scripts/reference/CASE901.txt)
// from a one-line seed, validates it structurally, runs a self-QA pass,
// and writes the result to generated-cases/ — without ever printing the
// case content to stdout. Only pass/fail status and structural error
// messages (never plot content) reach the terminal, so the person running
// this never has to see the mystery before playing it.
//
// Usage:
//   node --env-file=.env.local scripts/generate-case.mjs \
//     --seed "폐쇄된 스키 리조트, 사망 원인, 눈사태 경보 조작" \
//     [--case-id CASE905] [--max-attempts 3] [--model gpt-5]
//
// Requires OPENAI_API_KEY in the environment.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateMasterText, buildUploadEnvelope } from './lib/master-parser.mjs';

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
  }
  return args;
}

function nextCaseId(outDir) {
  const used = new Set();
  const indexPath = join(repoRoot, 'data/cases/index.json');
  if (existsSync(indexPath)) {
    for (const item of JSON.parse(readFileSync(indexPath, 'utf8'))) {
      if (item.id) used.add(item.id.toUpperCase());
    }
  }
  if (existsSync(outDir)) {
    for (const file of readdirSync(outDir)) {
      const match = file.match(/^(CASE9\d\d)\./);
      if (match) used.add(match[1]);
    }
  }
  for (let n = 901; n <= 999; n += 1) {
    const id = `CASE${n}`;
    if (!used.has(id)) return id;
  }
  throw new Error('CASE901-999 범위가 모두 사용 중입니다.');
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
    body.text = { format: { type: 'json_schema', strict: true, ...jsonSchema } };
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
    throw new Error(`OpenAI API error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const raw = await response.json();
  const outputText = raw.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')?.text;

  if (!outputText) throw new Error('OpenAI Responses API가 output_text를 반환하지 않았습니다.');
  return outputText;
}

function buildGenerationInstructions(caseId) {
  return [
    '너는 한국어 미스터리 게임의 서버 전용 마스터(정답지)를 작성하는 시나리오 라이터다.',
    '아래 예시(CASE901)는 형식과 문체를 보여주기 위한 스타일 참고용일 뿐이다. 예시의 인물, 사건, 트릭, 장소, 대사는 절대 재사용하지 말고, 완전히 새로운 사건을 창작하라.',
    `이번에 만들 사건의 case_id는 반드시 "${caseId}"로 하라.`,
    '출력 형식 규칙 (반드시 지킬 것):',
    '- 최상위 섹션은 [SECTION_NAME] 형태의 줄로만 구분한다. 닫는 태그([/SECTION_NAME])는 절대 쓰지 않는다.',
    '- 섹션 순서와 이름은 예시와 동일하게: CASE_IDENTITY, OPENING_SCENE, SURFACE_INCIDENT, FULL_TRUTH, ACTUAL_TIMELINE, CHARACTERS, LOCATIONS, EVIDENCE, CONTRADICTION_STAGES, RED_HERRINGS, CASE_COMPLETE, FINAL_DEDUCTION, ENDING_EXPLANATION.',
    '- CHARACTERS 섹션 안의 각 인물은 [CH01], [CH02]... 형태의 하위 블록으로 쓰고 name/role/present_location/knows/initial_claims/initial_interview_range/hidden_until/knowledge_limits 필드를 예시와 같은 구조로 채운다.',
    '- LOCATIONS는 [L01]... 형태, EVIDENCE는 [E01]... 형태, CONTRADICTION_STAGES는 [C01]... 형태, RED_HERRINGS는 [R01]... 형태, ACTUAL_TIMELINE은 [T01]... 형태의 하위 블록을 쓴다.',
    '반드시 지켜야 할 페이싱 규칙:',
    '- 각 인물의 hidden_until.release_condition은 최소 2단계 이상의 간접 질문이나 증거 제시를 거쳐야 풀리도록 설계하라. 한 번의 직접 질문으로 바로 풀리게 하지 마라.',
    '- RED_HERRINGS(조기에 배제될 수 있는 용의자)는 최소 2개 이상 포함하고, 각각 how_to_clear로 해소되더라도 최소 1개의 미해결 서브플롯(가족 갈등, 숨긴 실수, 별개의 비밀 등)을 남겨야 한다. must_not_imply로 플레이어가 성급히 결론 내리면 안 되는 지점을 명시하라.',
    '- CONTRADICTION_STAGES는 최소 3단계를 포함하고, 각 단계(C01, C02, C03...)는 서로 다른 requires_presented_evidence_ids 조합을 요구해야 한다 (같은 증거 조합을 재사용하지 마라).',
    '- 책임자(FULL_TRUTH의 책임자)는 CONTRADICTION_STAGES의 target_character와 일치해야 하며, 최종 단계에서만 F-CHxx-xx(진짜 결정적 사실)가 release 되어야 한다.',
    '한국어로, 예시와 같은 분량과 밀도로 작성하라. 다른 설명이나 마크다운 코드펜스 없이 마스터 본문만 출력하라.',
  ].join('\n');
}

function buildRepairInstructions(baseInstructions, issues) {
  return [
    baseInstructions,
    '',
    '이전 시도가 다음 문제로 반려되었다. 같은 사건 설정을 유지하되 아래 문제를 모두 고쳐서 전체 마스터를 처음부터 다시 출력하라:',
    ...issues.map((issue) => `- ${issue}`),
  ].join('\n');
}

const qaSchema = {
  name: 'case_master_qa',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['pass', 'issues'],
    properties: {
      pass: { type: 'boolean' },
      issues: { type: 'array', items: { type: 'string' } },
    },
  },
};

function buildQaInstructions() {
  return [
    '너는 한국어 미스터리 게임 마스터(정답지)를 심사하는 엄격한 QA 리뷰어다.',
    '아래 체크리스트를 기준으로 판정하라:',
    '1. hidden_until.release_condition이 한 번의 직접 질문만으로 즉시 풀리지 않고, 최소 2단계 이상의 간접 접근을 요구하는가.',
    '2. RED_HERRINGS가 해소된 뒤에도 최소 1개의 미해결 서브플롯이 남는가.',
    '3. CONTRADICTION_STAGES가 3단계 이상이고, 각 단계가 서로 다른 증거 조합을 요구하는가.',
    '4. ACTUAL_TIMELINE의 시간/장소/인물 동선이 서로 모순되지 않는가.',
    '5. FINAL_DEDUCTION과 FULL_TRUTH가 CONTRADICTION_STAGES의 마지막 단계에서 풀리는 사실과 일치하는가.',
    '6. 트릭이 공정한 추리로 풀 수 있는가 (플레이어가 얻을 수 없는 정보에만 의존하지 않는가).',
    '모두 통과하면 pass=true, issues=[]. 하나라도 문제가 있으면 pass=false와 함께 구체적으로 무엇을 고쳐야 하는지 issues 배열에 한국어 문장으로 적어라.',
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

  const caseId = args.caseId || nextCaseId(args.outDir);
  const model = args.model || process.env.CASE_GEN_MODEL || 'gpt-5';
  const reference = readFileSync(join(here, 'reference/CASE901.txt'), 'utf8');

  const baseInstructions = buildGenerationInstructions(caseId);
  const seedInput = [
    `[STYLE REFERENCE ONLY — DO NOT REUSE PLOT] \n${reference}`,
    '',
    `이제 아래 시드로 완전히 새로운 사건을 창작하라.`,
    `시드: ${args.seed}`,
  ].join('\n');

  let instructions = baseInstructions;
  let masterText = '';
  let attempt = 0;
  let ok = false;
  let lastIssues = [];

  while (attempt < args.maxAttempts && !ok) {
    attempt += 1;
    console.error(`[..] ${caseId} 생성 요청 중 (시도 ${attempt}/${args.maxAttempts}, 모델 ${model}) — 추론 모델은 1~3분 걸릴 수 있습니다.`);
    masterText = await callOpenAI({ model, instructions, input: seedInput });
    console.error(`[..] 초안 수신, 구조 검증 중...`);

    const structural = validateMasterText(masterText);
    if (structural.errors.length) {
      lastIssues = structural.errors;
      console.error(`[..] 구조 검증 실패, 재시도 준비 중...`);
      instructions = buildRepairInstructions(baseInstructions, lastIssues);
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

    if (qa.pass) {
      ok = true;
      break;
    }

    console.error(`[..] 자체 QA 반려, 재시도 준비 중...`);
    lastIssues = qa.issues.length ? qa.issues : ['자체 QA에서 구체적 사유 없이 반려되었습니다.'];
    instructions = buildRepairInstructions(baseInstructions, lastIssues);
  }

  if (!ok) {
    const failPath = join(args.outDir, 'failed', `${caseId}.attempt${attempt}.txt`);
    writeFileSync(failPath, masterText, 'utf8');
    console.error(`[fail] ${caseId} 생성 실패 (${attempt}/${args.maxAttempts}회 시도). 마지막 문제:`);
    for (const issue of lastIssues) console.error(`  - ${issue}`);
    console.error(`(내용은 출력하지 않음. 초안은 ${failPath}에 저장됨)`);
    process.exit(1);
  }

  const envelope = buildUploadEnvelope(masterText);
  const masterPath = join(args.outDir, `${caseId}.master.txt`);
  const uploadPath = join(args.outDir, `${caseId}.upload.json`);
  writeFileSync(masterPath, masterText, 'utf8');
  writeFileSync(uploadPath, JSON.stringify(envelope, null, 2), 'utf8');

  console.log(`[ok] ${caseId} 생성 및 자체 QA 통과 (시도 ${attempt}/${args.maxAttempts})`);
  console.log(`  master: ${masterPath}`);
  console.log(`  upload-ready JSON: ${uploadPath}`);
  console.log('  (내용은 출력하지 않음 — 업로드는 scripts/ingest-case.mjs로 자동화 가능)');
}

main().catch((error) => {
  console.error(`[fail] ${error.message}`);
  process.exit(1);
});
