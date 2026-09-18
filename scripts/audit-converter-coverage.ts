// 마스터 JSON에 적힌 값이 실제로 런타임까지 도달하는지 검사한다.
//
// 왜 있는가: 같은 사고가 네 번 반복됐다. 스키마에 필드를 추가하고,
// 마스터가 그 필드를 성실히 채우고, 그런데 structured-master-converter가
// raw_text에 싣는 것을 잊어서 master-index가 읽지 못하고, GM은 그 값을
// 본 적이 없는 채로 몇 달을 돈다. 실제로 그렇게 죽어 있던 것들:
//
//   pressure_responses  — 같은 주제를 다시 캐물을 때의 부인 변주
//   comic_tell          — 인물의 반복되는 버릇
//   voice_profile       — 인물의 말투/압박 시 반응/말버릇 (289건 중 258건)
//   knows[].source      — 직접 본 것인가 전해 들은 것인가 (289건 중 287건)
//
// 마지막 것은 특히 나빴다. 프롬프트 규칙이 문면에 "(see knows[].source)"라고
// 필드 이름까지 적어 두고 있었는데, 그 값이 컨텍스트에 들어간 적이 없었다.
// 어느 경우에도 에러는 나지 않았다 — 값이 없으면 그냥 조용히 없을 뿐이다.
//
// 그래서 문법이 아니라 값 자체를 본다: 마스터의 모든 문자열 잎값을 꺼내
// 변환된 raw_text 안에 실제로 그 문자열이 있는지 대조한다. 변환기가 무엇을
// 어떻게 방출하든 상관없이, 빠진 것은 빠진 것으로 드러난다.
//
// app/ import가 확장자 없는 형태라 node로 바로 못 돌린다. check-case.mjs가
// tsc로 옮긴 뒤 실행한다:
//
//   node scripts/audit-converter-coverage.js <master.json> [...]

import { readFileSync } from 'node:fs';
import { convertStructuredMaster } from '../app/gm/structured-master-converter';

// raw_text에 없는 것이 정상인 경로. 각 항목은 "어디로 대신 가는가" 또는
// "왜 일부러 안 보내는가"를 반드시 달아 둔다 — 이유 없는 등록은 다음 사람이
// 진짜 누락을 여기에 묻어 버리는 길이 된다.
const ALLOWED_ABSENT: Array<{ path: string; why: string }> = [
  // ── CaseData 구조 필드로 따로 간다 (raw_text를 거치지 않는다)
  { path: 'case_identity.english_title', why: '표시용 메타. GM은 쓰지 않는다' },
  {
    path: 'case_identity.detective_entry_type',
    why: '생성 단계에서 중복을 피하려고 쓰는 분류값. 플레이 중에는 쓰이지 않는다',
  },
  {
    path: 'case_identity.tags[]',
    why: 'deriveCaseTags가 CaseData.master_tags로 넘긴다(사건 목록 해시태그)',
  },
  {
    path: 'evidence[].reaction.jiwoo',
    why: 'CaseData.cards[].reaction으로 직접 넘어간다(오프라인 엔진 전용). AI 경로에는 일부러 안 싣는다 — 2026-09 사용자 결정',
  },
  {
    path: 'evidence[].reaction.detective',
    why: 'CaseData.cards[].reaction으로 직접 넘어간다(오프라인 엔진 전용). AI 경로에는 일부러 안 싣는다 — 2026-09 사용자 결정',
  },
  {
    path: 'locations[].access_level',
    why: 'CaseData.locations[].access_level로 직접 넘어간다',
  },
  // ── 의도적으로 GM에게 보내지 않는 것
  {
    path: 'characters[].initial_claims[].reason_for_limit_or_lie',
    why: '인물 블록에서 스포일러 밀도가 가장 높다("동기를 숨기려고 한다" = 숨은 동기의 존재를 명시). 실행에 필요한 지시는 truth_status: lie가 이미 전달한다',
  },
  {
    path: 'characters[].knows[].related_timeline[]',
    why: '타임라인 사실은 current_timeline_facts로 따로 간다. 이 연결을 쓰는 런타임 규칙이 없다',
  },
];

const ALLOWED_PATHS = new Set(ALLOWED_ABSENT.map((item) => item.path));

// 짧은 값은 대조에서 뺀다. id("E01")나 한 낱말 열거값("open", "lie")은
// 다른 문장 안에 우연히 포함되기 쉬워, 있는지 없는지를 이 방식으로는
// 판정할 수 없다. 그런 값들은 어차피 구조가 통째로 방출되거나 안 되거나다.
const MIN_LENGTH = 6;

function* leaves(
  value: unknown,
  path = '',
): Generator<{ path: string; value: string }> {
  if (Array.isArray(value)) {
    for (const item of value) yield* leaves(item, `${path}[]`);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      yield* leaves(child, path ? `${path}.${key}` : key);
    }
    return;
  }
  if (typeof value === 'string' && value.trim()) yield { path, value };
}

const squash = (text: string) => text.replace(/\s+/g, '');

export type CoverageFinding = {
  path: string;
  sample: string;
};

export function auditConverterCoverage(master: unknown): CoverageFinding[] {
  const converted = convertStructuredMaster(master) as {
    master?: { raw_text?: string };
  } | null;
  if (!converted?.master?.raw_text) {
    return [{ path: '(전체)', sample: 'convertStructuredMaster가 null을 반환' }];
  }
  const rawText = squash(converted.master.raw_text);
  const found = new Map<string, string>();
  for (const { path, value } of leaves(master)) {
    if (ALLOWED_PATHS.has(path)) continue;
    const needle = squash(value);
    if (needle.length < MIN_LENGTH) continue;
    if (rawText.includes(needle)) continue;
    if (!found.has(path)) found.set(path, value);
  }
  return [...found].map(([path, sample]) => ({ path, sample }));
}

function main() {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error('usage: node audit-converter-coverage.js <master.json> ...');
    process.exit(2);
  }
  let failed = false;
  for (const path of paths) {
    const master = JSON.parse(readFileSync(path, 'utf8'));
    const findings = auditConverterCoverage(master);
    if (!findings.length) continue;
    failed = true;
    console.log(`\n${path}`);
    for (const finding of findings) {
      console.log(`  [MISSING] ${finding.path}`);
      console.log(`    값이 raw_text에 없음: "${finding.sample.slice(0, 70)}"`);
    }
  }
  if (failed) {
    console.log(
      '\n마스터에 적힌 값이 raw_text까지 오지 못했다. master-index가 읽지 못하므로 GM에게도 가지 않는다.',
    );
    console.log(
      '고치는 법: app/gm/structured-master-converter.ts의 해당 build*Block에 방출을 추가하고,',
    );
    console.log(
      '이어서 app/gm/master-index.ts가 그 라벨을 읽게 한 뒤, 그 값을 쓰는 쪽(buildActionScopedMaster 등)까지 연결할 것.',
    );
    console.log(
      '일부러 안 보내는 값이라면 이 파일의 ALLOWED_ABSENT에 이유와 함께 등록한다 — 이유 없는 등록은 금지.',
    );
    process.exit(1);
  }
  console.log(
    `converter coverage: ${paths.length}건 모두 통과 — 마스터에 적힌 값이 전부 raw_text까지 도달한다.`,
  );
}

main();
