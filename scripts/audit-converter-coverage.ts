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
  {
    path: 'evidence[].related_timeline[]',
    why: '위와 같은 이유로 안 보낸다 — 카드와 타임라인 항목의 연결을 쓰는 런타임 규칙이 없다. AI 경로는 모델이 매 턴 timeline_id를 직접 고르고, 오프라인은 「기록」 탭 자체를 두지 않는다(수첩 메모장은 AI 즉흥을 붙잡아 두려던 기능이라 마스터에 다 적혀 있는 오프라인에는 붙잡을 것이 없다 — OfflineDetectiveApp 머리주석). 이 연결로 오프라인에 시간축을 그려 보자는 생각이 한 번 나왔는데(2026-09), 그건 오프라인에서 일부러 없앤 밑줄·돋보기 표식을 시간 쪽에 다시 들이는 것이라 접었다 — 빈칸이 뜨면 플레이어가 시각을 맞춰 보는 대신 칸을 채우러 다니고, 그게 CLAUDE.md가 경계하는 「방이 체크리스트가 된다」와 같은 일이다',
  },
  // ── 마스터를 쓰기 위한 재료. case_identity.setting / full_truth 산문과 같은
  //    부류로, 런타임이 읽을 값이 아니라 작성자가 빠짐을 막으려고 적는 칸이다.
  {
    path: 'evidence[].presentation_effect[]',
    why: '이 카드가 어느 대립 단계와 엮이는지 작성자가 보는 칸. 런타임 판정은 requires_presented_evidence_ids가 하고 그쪽은 AND다(적힌 카드를 전부 내밀어야 단계가 열린다) — 이 칸은 요구가 아니라 관련 표시라 둘이 달라도 정상이고, 실제로 837쌍 중 70쌍이 다르다. 그 차이를 정방향에 옮기면 요구가 늘어 더 어려워지고 못 얻는 카드가 끼면 완주가 막히므로 옮기지 않기로 했다(2026-09 사용자 결정). 지우지도 않는다 — docs/novels/ 34편이 「이 카드는 presentation_effect가 비어 있다 = 낼 데가 없다」로 인용하고 scripts/case-dossier.html이 「제시 효과」로 뿌린다',
  },
  {
    path: 'evidence[].mismatch',
    why: '그 카드가 품은 어긋남을 한 줄로 적어 두는 작성용 칸. 내보낼 자리가 없다 — content가 그 어긋남을 이미 서술하고 reaction 두 줄이 그 자리에서 그것을 말하므로, 세 번째로 읽어 주면 한 턴에 같은 말이 셋이 된다',
  },
  {
    path: 'case_identity.background.background_archetypes[]',
    why: '배경 상황을 마스터가 선언하는 칸. 런타임이 아니라 validate_master 의 BACKGROUND_ARCHETYPE_OVERUSE / BACKGROUND_FAMILY_OVERUSE 가 읽는다 — case_identity 는 애초에 raw_text 로 나가지 않는다',
  },
  {
    path: 'case_identity.background.background_phrasing[]',
    why: '배경을 어떤 문장 꼴로 들여놓았는지 적는 칸. BACKGROUND_PHRASING_OVERUSE 가 읽는다',
  },
  {
    path: 'case_identity.background.background_intensity',
    why: '배경과 사건이 얼마나 붙어 있는지 적는 칸. BACKGROUND_INTENSITY_UNSUPPORTED 가 full_truth 와 대조한다',
  },
  {
    path: 'case_identity.location_archetypes[]',
    why: '사건의 무대 계열을 마스터가 직접 선언하는 칸. method_archetypes / motive_archetypes 와 같은 자리로, 런타임이 아니라 validate_master 의 LOCATION_ARCHETYPE_OVERUSE / LOCATION_FAMILY_OVERUSE 가 읽는다 — case_identity 는 애초에 raw_text 로 나가지 않는다',
  },
  {
    path: 'full_truth.cover_up_target[]',
    why: '은폐가 무엇을 감추는지 마스터가 선언하는 칸. 런타임이 아니라 validate_master 의 COVER_UP_TARGET_OVERUSE 가 읽는다 — full_truth 는 responsible_character_id 말고는 raw_text 로 나가지 않는다',
  },
  {
    path: 'full_truth.cover_up_method[]',
    why: '은폐를 어떻게 했는지 선언하는 칸. COVER_UP_METHOD_OVERUSE 와 COVER_UP_PAIR_OVERUSE 가 읽는다',
  },
  {
    path: 'full_truth.motive_archetypes[]',
    why: '동기 계열을 마스터가 직접 선언하는 칸. method_archetypes 와 같은 자리로, 런타임이 아니라 validate_master 가 읽는다',
  },
  {
    path: 'full_truth.method_archetypes[]',
    why: '수법 계열을 마스터가 직접 선언하는 칸. 런타임이 아니라 validate_master 가 읽는다 — METHOD_ARCHETYPE_OVERUSE 와 NEIGHBOR_TWIN 이 문장을 정규식으로 추측하던 것을 대신한다. 화면에 나갈 말은 full_truth.method 가 이미 담고 있다',
  },
  {
    path: 'red_herrings[].weight.opportunity',
    why: 'surface_suspicion을 동기·기회·수단으로 쪼개 적어 세 박자가 다 있는지 작성자가 확인하는 칸. 런타임에 나가는 문장은 surface_suspicion과 suspicion_deepener 쪽이다',
  },
  {
    path: 'red_herrings[].weight.means_first_reading',
    why: '수단 카드가 처음에 어떻게 읽히는지를 적어 두는 작성용 칸. 단서의 이중 의미는 카드 본문(content)이 져야 하는 것이지 따로 읽어 주는 해설이 아니다',
  },
  {
    path: 'evidence[].reread_by',
    why: '이 카드를 다시 읽게 만드는 다른 카드. 작성 시 순서를 잡는 메모이고, 런타임은 발견 순서를 discovery_condition/requires 로만 본다',
  },
];

const ALLOWED_PATHS = new Set(ALLOWED_ABSENT.map((item) => item.path));

// 짧은 값은 대조에서 뺀다. id("E01")나 한 낱말 열거값("open", "lie")은
// 다른 문장 안에 우연히 포함되기 쉬워, 있는지 없는지를 이 방식으로는
// 판정할 수 없다. 그런 값들은 어차피 구조가 통째로 방출되거나 안 되거나다.
//
// **그 전제는 절반만 맞다**(2026-09 확인). id 만 담는 칸은 이 검사에
// 구조적으로 안 보이므로, 방출되지 않아도 0건으로 나온다 —
// evidence[].presentation_effect(250건)와 evidence[].related_timeline(244건)이
// 그렇게 아무에게도 안 읽힌 채 쌓였다. 그래서 아래 ALLOWED_ABSENT 에 그 둘을
// **동작이 아니라 기록으로** 올려 뒀다: 지금은 어차피 안 걸리지만, 이 길이
// 문턱을 없애거나 구조 방출 여부로 판정을 바꾸는 날 그 둘이 갑자기 터지지
// 않게 하려는 것이고, 그전까지는 「왜 이 칸이 안 읽히는가」를 적어 두는
// 자리가 된다. 같은 이유로 id 칸을 새로 만들 때는 여기 같이 적을 것.
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
