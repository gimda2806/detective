// 코퍼스 전체가 지금의 마스터 스키마에 얼마나 부합하는지 항목별로 센다.
//
// masterFormatWarnings는 "부합하는가"를 true/false로만 알려 준다. 272건이
// 안 된다는 것까지는 목록 헤더가 말해 주지만, 그중 무엇이 자동으로 고칠 수
// 있는 것이고 무엇이 손으로 써야 하는 것인지는 가려 주지 않는다. 이 검사가
// 그 갈림을 만든다 — 마이그레이션을 계획하려면 종류별 개수가 먼저다.
//
//   node scripts/audit-master-format.mjs           종류별 개수
//   node scripts/audit-master-format.mjs --list    사건 id까지
import fs from 'node:fs';
import path from 'node:path';
import { buildMasterIndex, masterFormatWarnings } from '../app/gm/master-index';
import { convertStructuredMaster } from '../app/gm/structured-master-converter';
import { getStringField, validateUploadedCase } from '../app/gm/case-envelope';
import {
  checkDiscoveryTimeWord,
  checkHerringClearance,
  checkOpeningCastRollcall,
  checkOpeningHearsayOnly,
  checkOpeningClaim,
  checkNeighborTwin,
  checkRangeTwin,
  checkRelationships,
  checkSelfMotiveDisclosure,
  checkStatementGating,
  pendingReworkWarnings,
} from './validate_master';

// masterFormatWarnings의 메시지를 짧은 코드로 접는다. 메시지 문면이 바뀌어도
// 이 검사가 같이 깨지지 않게 하려는 것이고, 종류별로 세려면 키가 필요하다.
const CODES: Array<[RegExp, string]> = [
  [/장소를 하나도 읽지 못했다/, 'NO_LOCATIONS'],
  [/인물을 하나도 읽지 못했다/, 'NO_CHARACTERS'],
  [/탐정 진입 시각이 없다/, 'NO_ENTRY_TIME'],
  [/인물 관계 데이터가 없다/, 'NO_RELATIONSHIPS'],
  [/대립 단계 키가 서술문이다/, 'PROSE_STAGE_KEY'],
];

function codeFor(message: string): string {
  for (const [pattern, code] of CODES) {
    if (pattern.test(message)) return code;
  }
  return 'OTHER';
}

const root = process.cwd();
const pendingDir = path.join(root, 'data', 'pending-cases');
const byCode = new Map<string, string[]>();
// 관계는 있는데 모양이 나쁜 사건. masterFormatWarnings는 "있는가"만 보므로
// 여기엔 안 걸리지만, 필드를 채우고 끝낼 일이 아니라서 따로 센다 —
// 마이그레이션이 한 번 훑고 지나간 뒤 남는 실제 backlog가 이것이다.
const shapeIssues = new Map<string, string[]>();
const combos = new Map<string, number>();
let ok = 0;
let total = 0;

for (const entry of fs.readdirSync(pendingDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(pendingDir, entry.name, `${entry.name}.master.json`);
  if (!fs.existsSync(file)) continue;
  total += 1;

  const converted = convertStructuredMaster(
    JSON.parse(fs.readFileSync(file, 'utf8')),
  );
  if (!converted) {
    byCode.set('NOT_STRUCTURED', [
      ...(byCode.get('NOT_STRUCTURED') || []),
      entry.name,
    ]);
    continue;
  }
  const validated = validateUploadedCase(converted);
  if (!validated.caseData) {
    byCode.set('INVALID', [...(byCode.get('INVALID') || []), entry.name]);
    continue;
  }

  // registry 등록 여부와 무관하게 코드만 본다 — 여기서는 심각도가 아니라
  // "고칠 것이 남았는가"를 세는 것이 목적이다.
  const parsedForShape = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const issue of [
    ...checkRelationships(parsedForShape, true),
    ...checkHerringClearance(parsedForShape, true),
    ...checkStatementGating(parsedForShape, true),
    ...checkOpeningClaim(parsedForShape, true),
    ...checkSelfMotiveDisclosure(parsedForShape, true),
    ...checkDiscoveryTimeWord(parsedForShape, true),
  ]) {
    if (
      issue.code === 'RELATIONSHIPS_CULPRIT_HUB' ||
      issue.code === 'RELATIONSHIPS_ORPHAN_CHARACTER' ||
      issue.code === 'RELATIONSHIPS_SAYS_BROKEN' ||
      issue.code === 'HERRING_CLEAR_NO_ID' ||
      issue.code === 'HERRING_CLEAR_SELF_ONLY' ||
      // 관계의 균열이 오프라인에서 새어 나오려면 surfaces_when 이 id 를
      // 불러야 한다(offline-engine.ts 의 strainReady). 683개 중 274개가
      // 아직 자연어뿐이고, 30개는 옮겨 간 관찰 id 를 그대로 물고 있다.
      issue.code === 'RELATIONSHIPS_SURFACES_NO_ID' ||
      issue.code === 'RELATIONSHIPS_SURFACES_UNKNOWN_ID' ||
      issue.code === 'RELATIONSHIPS_STRAIN_NO_SUBJECT' ||
      // 면담 한 번에 아는 것이 다 나오는 인물. 관계와 달리 필드가 비어
      // 있는 것이 아니라 사건을 읽고 순서를 정해야 하는 일이다.
      issue.code === 'KNOWS_UNGATED_FLOOD' ||
      // 첫 대면에 알리바이 말고 할 말이 없는 인물. 진술 한 줄을 새로 써야
      // 하므로 필드를 채우는 일이 아니라 읽고 쓰는 일이다.
      issue.code === 'CLAIMS_ALIBI_ONLY' ||
      // 자기 동기·자기 변호가 본인 입에서 잠금 없이 먼저 나오는 사건. 여기서
      // 세기만 하고 pendingReworkWarnings 에는 넣지 않는다 — 그 목록은 사건을
      // 열 때 화면에 뜨는 경고라, 이주 루틴이 아직 손대지 않는 축을 거기
      // 올리면 114건에 읽을 사람 없는 줄이 하나씩 더 붙는다.
      issue.code === 'MOTIVE_SELF_DISCLOSURE' ||
      // 발견 문장의 시간대 말이 실제 발견 시각과 어긋나는 사건. 대개 죽은 때와
      // 발견된 때를 한 시각으로 뭉갠 문장이라, 그 문장을 다시 쓰는 일이다.
      issue.code === 'DISCOVERY_TIME_WORD_MISMATCH'
    ) {
      shapeIssues.set(issue.code, [
        ...(shapeIssues.get(issue.code) || []),
        entry.name,
      ]);
    }
  }

  // 오프닝이 등장인물 명부가 된 사건. 관계와 달리 이건 "필드가 비었다"가 아니라
  // 다시 써야 하는 것이라 이주 루틴의 별도 축이다.
  for (const issue of [
    ...checkOpeningCastRollcall(
      JSON.parse(fs.readFileSync(file, 'utf8')),
      true,
    ),
    ...checkOpeningHearsayOnly(JSON.parse(fs.readFileSync(file, 'utf8')), true),
  ]) {
    const listed = shapeIssues.get(issue.code) || [];
    if (!listed.includes(entry.name)) {
      shapeIssues.set(issue.code, [...listed, entry.name]);
    }
  }

  // says 는 없어도 검사기가 아무 말 하지 않는다(relationships 자체가 아직
  // 없는 사건이 많아 warn 을 더 얹으면 신호가 묻힌다). 그래서 밀린 양은
  // 여기서만 보인다 — 면담할 수 있는 인물이 낀 관계인데 그 사람의 한 마디가
  // 없으면 그 인물은 아직 해설자의 목소리로 말한다.
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    relationships?: Array<{
      between?: string[];
      says?: Record<string, string>;
    }>;
    characters?: Array<{ id?: string }>;
  };
  const speakerIds = new Set((parsed.characters || []).map((c) => c.id));
  const needsSays = (parsed.relationships || []).some((rel) =>
    (rel.between || [])
      .filter((id) => speakerIds.has(id))
      .some((id) => !(rel.says?.[id] || '').trim()),
  );
  if (needsSays) {
    shapeIssues.set('RELATIONSHIPS_NO_SAYS', [
      ...(shapeIssues.get('RELATIONSHIPS_NO_SAYS') || []),
      entry.name,
    ]);
  }

  const warnings = masterFormatWarnings(
    buildMasterIndex(getStringField(validated.caseData.master, 'raw_text')),
  );
  // 부합 = 손볼 것이 하나도 남지 않았다. 목록의 '수사 가능' 라벨이 보는
  // 것과 같은 판정이라야 한다 — 여기서 159건이라고 하는데 화면이 24건만
  // 수사 가능이라고 하면 어느 쪽이 밀린 양인지 알 수 없다. 아래 종류별
  // 개수는 그대로 masterFormatWarnings 쪽 코드만 센다.
  if (!warnings.length && !pendingReworkWarnings(parsedForShape).length) {
    ok += 1;
    continue;
  }
  if (!warnings.length) continue;
  const codes = warnings.map((message) => codeFor(message)).sort();
  for (const code of codes) {
    byCode.set(code, [...(byCode.get(code) || []), entry.name]);
  }
  const combo = codes.join(' + ');
  combos.set(combo, (combos.get(combo) || 0) + 1);
}

// 번호 구간이 한 틀인 사건(RANGE_TWIN). 다른 항목과 달리 사건 하나만 읽어서는
// 판정할 수 없어 코퍼스를 다 모은 뒤에 센다. 한 생성 회차가 같은 사슬·같은
// 진입 시각·같은 타임라인을 돌려 쓴 자국이라, 그 구간을 다시 쓰는 루틴이
// 「어느 둘을 갈라야 가장 싼지」를 볼 때의 밀린 양이다(CLAUDE.md NEIGHBOR_TWIN 항목).
{
  const corpus: Array<{ caseId: string; master: Parameters<typeof checkRangeTwin>[1] }> = [];
  for (const entry of fs.readdirSync(pendingDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(pendingDir, entry.name, `${entry.name}.master.json`);
    if (!fs.existsSync(file)) continue;
    corpus.push({ caseId: entry.name, master: JSON.parse(fs.readFileSync(file, 'utf8')) });
  }
  for (const c of corpus) {
    if (checkRangeTwin(c.caseId, c.master, corpus, true).length === 0) continue;
    shapeIssues.set('RANGE_TWIN', [...(shapeIssues.get('RANGE_TWIN') || []), c.caseId]);
  }
  // 이웃 쌍인데 **축 하나를 잴 수가 없어서** 문턱을 못 넘은 것
  // (NEIGHBOR_TWIN_UNJUDGED). 고치는 일이 「사건을 다시 쓴다」가 아니라
  // 「두 사건에 분류 코드를 선언한다」라 다른 항목과 성격이 다르지만, 안 세면
  // 아무도 안 본다 — 검사가 조용히 지나가는 것이 이 코드의 존재 이유다.
  for (const c of corpus) {
    const others = corpus.filter((o) => o.caseId !== c.caseId);
    const unjudged = checkNeighborTwin(c.caseId, c.master, others, true).filter(
      (issue) => issue.code === 'NEIGHBOR_TWIN_UNJUDGED',
    );
    if (unjudged.length === 0) continue;
    shapeIssues.set('NEIGHBOR_TWIN_UNJUDGED', [
      ...(shapeIssues.get('NEIGHBOR_TWIN_UNJUDGED') || []),
      c.caseId,
    ]);
  }
}

const wantsList = process.argv.includes('--list');
console.log(`마스터 ${total}건 — 부합 ${ok}건, 미달 ${total - ok}건\n`);
console.log('걸리는 항목별 (한 사건이 여러 항목에 걸릴 수 있다):');
for (const [code, ids] of [...byCode].sort(
  (a, b) => b[1].length - a[1].length,
)) {
  console.log(`  ${code.padEnd(18)} ${String(ids.length).padStart(3)}건`);
  if (wantsList) console.log(`      ${ids.join(' ')}`);
}
if (shapeIssues.size) {
  console.log(
    '\n읽고 다시 써야 남는 것 (필드를 채우는 것만으로는 안 되는 항목):',
  );
  for (const [code, ids] of [...shapeIssues].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    console.log(`  ${code.padEnd(32)} ${String(ids.length).padStart(3)}건`);
    if (wantsList) console.log(`      ${ids.join(' ')}`);
  }
}

console.log('\n조합별 (이 사건을 고치려면 무엇을 다 해야 하는가):');
for (const [combo, count] of [...combos].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}건  ${combo}`);
}
