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
  checkHerringClearance,
  checkOpeningCastRollcall,
  checkOpeningHearsayOnly,
  checkRelationships,
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
      issue.code === 'KNOWS_UNGATED_FLOOD'
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
