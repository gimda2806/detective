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
import { checkRelationships } from './validate_master';

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
  for (const issue of checkRelationships(
    JSON.parse(fs.readFileSync(file, 'utf8')),
    true,
  )) {
    if (
      issue.code === 'RELATIONSHIPS_CULPRIT_HUB' ||
      issue.code === 'RELATIONSHIPS_ORPHAN_CHARACTER'
    ) {
      shapeIssues.set(issue.code, [
        ...(shapeIssues.get(issue.code) || []),
        entry.name,
      ]);
    }
  }

  const warnings = masterFormatWarnings(
    buildMasterIndex(getStringField(validated.caseData.master, 'raw_text')),
  );
  if (!warnings.length) {
    ok += 1;
    continue;
  }
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
  console.log('\n관계는 있는데 모양이 나쁜 사건 (필드를 채운 뒤에 남는 것):');
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
