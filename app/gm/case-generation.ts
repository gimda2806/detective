// Server-side port of scripts/generate-case.mjs so the site itself can
// generate a new CASE9xx-style master on demand, without going through the
// local-only Node pipeline. Reuses the same structural validator and
// envelope builder as the CLI script (scripts/lib/master-parser.mjs) so a
// case generated here and one generated locally are held to identical
// rules. Like the CLI script, this never returns the generated plot text
// to the caller — only pass/fail status and structural issue strings.

import { env } from 'cloudflare:workers';
import {
  buildUploadEnvelope,
  validateMasterText,
} from '../../scripts/lib/master-parser.mjs';
import CASE901_REFERENCE from '../../scripts/reference/CASE901.txt?raw';

const DEFAULT_MODEL = 'gpt-5';
const DEFAULT_MAX_ATTEMPTS = 2;

export function nextCaseId(usedIds: Set<string>): string {
  for (let n = 901; n <= 999; n += 1) {
    const id = `CASE${n}`;
    if (!usedIds.has(id)) return id;
  }
  throw new Error('CASE901-999 범위가 모두 사용 중입니다.');
}

async function callOpenAI({
  model,
  instructions,
  input,
  jsonSchema,
}: {
  model: string;
  instructions: string;
  input: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY가 설정되어 있지 않습니다.');
  }

  const body: Record<string, unknown> = { model, instructions, input };
  if (jsonSchema) {
    body.text = {
      format: { type: 'json_schema', strict: true, ...jsonSchema },
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
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

  const raw = (await response.json()) as {
    output?: { content?: { type: string; text?: string }[] }[];
  };
  const outputText = raw.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')?.text;

  if (!outputText)
    throw new Error(
      'OpenAI Responses API가 output_text를 반환하지 않았습니다.',
    );
  return outputText;
}

function buildGenerationInstructions(caseId: string) {
  return [
    '너는 한국어 미스터리 게임의 서버 전용 마스터(정답지)를 작성하는 시나리오 라이터다.',
    '아래 예시(CASE901)는 형식과 문체를 보여주기 위한 스타일 참고용일 뿐이다. 예시의 인물, 사건, 트릭, 장소, 대사는 절대 재사용하지 말고, 완전히 새로운 사건을 창작하라.',
    `이번에 만들 사건의 case_id는 반드시 "${caseId}"로 하라.`,
    '시드에 범행 수법(트릭)이 명시되어 있지 않다면, 되묻거나 뻔한 트릭으로 때우지 말고 장르/배경에 맞는 독창적인 트릭을 네가 전적으로 설계하라. 시드에 트릭이 이미 명시돼 있다면 그것을 존중해서 발전시켜라.',
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
    '- 각 CH0x의 이름은 문서 전체에서 완전히 동일해야 한다. [CHARACTERS]의 name: 필드와 [FULL_TRUTH]·[CASE_COMPLETE]에서 그 인물을 "CH04 이름" 형태로 부를 때의 이름이 한 글자도 다르면 안 된다. 초안을 쓰다가 인물 이름을 바꾸기로 했다면 CHARACTERS를 포함한 문서 전체에서 일괄로 바꿔라 — 한 곳이라도 예전 이름이 남으면 게임에서 존재하지 않는 인물이 등장하는 치명적 버그가 된다.',
    '- [ACTUAL_TIMELINE]의 각 T0x 항목은 한 시각에 한 인물이 한 행동을 하는 원자적(atomic) 사실 하나만 담아야 한다. actual_action과 world_fact 모두 "~하고", "~한 뒤", "~하고 나서"로 서로 다른 두 인물의 행동을 이어붙이지 마라. 같은 시각에 다른 인물이 다른 행동을 했다면 actors를 인물별로 나누고 별도 T0x 항목(예: 강도윤은 T06, 문예진은 T07)으로 분리하고, 그 사실을 참조하는 다른 인물의 knows/related_timeline과 EVIDENCE의 related_timeline도 올바른 새 T번호로 갱신하라.',
    '한국어로, 예시와 같은 분량과 밀도로 작성하라. 다른 설명이나 마크다운 코드펜스 없이 마스터 본문만 출력하라.',
  ].join('\n');
}

function buildRepairInstructions(baseInstructions: string, issues: string[]) {
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
    '7. ACTUAL_TIMELINE의 각 항목이 한 인물의 한 행동만 담고 있는가 (서로 다른 두 인물의 행동이 "~하고"로 한 항목에 섞여 있지 않은가).',
    '모두 통과하면 pass=true, issues=[]. 하나라도 문제가 있으면 pass=false와 함께 구체적으로 무엇을 고쳐야 하는지 issues 배열에 한국어 문장으로 적어라.',
  ].join('\n');
}

export type GenerateCaseResult =
  | { ok: true; caseId: string; masterText: string; attempts: number }
  | { ok: false; caseId: string; issues: string[]; attempts: number };

// Mirrors scripts/generate-case.mjs's main loop, minus file I/O: draft,
// structural validation, self-QA, repair-and-retry up to maxAttempts.
export async function generateCaseMaster(
  seed: string,
  usedIds: Set<string>,
  { model = DEFAULT_MODEL, maxAttempts = DEFAULT_MAX_ATTEMPTS } = {},
): Promise<GenerateCaseResult> {
  const caseId = nextCaseId(usedIds);
  const baseInstructions = buildGenerationInstructions(caseId);
  const seedInput = [
    `[STYLE REFERENCE ONLY — DO NOT REUSE PLOT] \n${CASE901_REFERENCE}`,
    '',
    '이제 아래 시드로 완전히 새로운 사건을 창작하라.',
    `시드: ${seed}`,
  ].join('\n');

  let instructions = baseInstructions;
  let masterText = '';
  let attempt = 0;
  let lastIssues: string[] = [];

  while (attempt < maxAttempts) {
    attempt += 1;
    masterText = await callOpenAI({ model, instructions, input: seedInput });

    const structural = validateMasterText(masterText);
    if (structural.errors.length) {
      lastIssues = structural.errors;
      instructions = buildRepairInstructions(baseInstructions, lastIssues);
      continue;
    }

    const qaRaw = await callOpenAI({
      model,
      instructions: buildQaInstructions(),
      input: masterText,
      jsonSchema: qaSchema,
    });
    const qa = JSON.parse(qaRaw) as { pass: boolean; issues: string[] };

    if (qa.pass) {
      return { ok: true, caseId, masterText, attempts: attempt };
    }

    lastIssues = qa.issues.length
      ? qa.issues
      : ['자체 QA에서 구체적 사유 없이 반려되었습니다.'];
    instructions = buildRepairInstructions(baseInstructions, lastIssues);
  }

  return { ok: false, caseId, issues: lastIssues, attempts: attempt };
}

export { buildUploadEnvelope };
