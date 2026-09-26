// 은폐 선언이 문장보다 좁은 마스터를 센다 — 「은폐 문장을 쓴 뒤 동사를 센다」
// (생성 스펙 「은폐」 절)의 기계 보조. 판정은 `cover-up-tables.ts`의
// `coverUpDeclarationGaps`이고 `COVER_UP_DECLARATION_NARROW`(등록 warn · 새 사건 error)와
// 같다. 검사기는 한 사건씩만 보므로 코퍼스 전체의 목록은 여기서 찍는다.
//
// 읽는 사람: 생성 루틴 2단계(선언을 적은 뒤 자기 사건 한 번), 이주 루틴(등록된
// 사건의 warn 부채를 번호순으로 정리할 때). 정밀도는 75~80%(2026-09-26 실측) —
// 걸린 낱말이 은폐가 아니면 선언을 더하지 말고 갭 문서에 낱말을 적는다.
//
//   node --experimental-strip-types scripts/audit-cover-up-declaration.mjs            요약 + 걸린 번호 전부
//   node --experimental-strip-types scripts/audit-cover-up-declaration.mjs CASE022    한 사건: 선언 · 더 잡는 칸 · 문장
import fs from 'node:fs';
import path from 'node:path';
import { coverUpDeclarationGaps } from './cover-up-tables.ts';

const root = 'data/pending-cases';
const registry = (() => {
  try {
    return new Set(Object.keys(JSON.parse(fs.readFileSync('data/case_registry.json', 'utf8')).cases ?? {}));
  } catch {
    return new Set();
  }
})();

function load(id) {
  const file = path.join(root, id, `${id}.master.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const arg = process.argv[2];
if (arg) {
  if (!/^CASE\d+$/.test(arg)) {
    console.error('usage: node --experimental-strip-types scripts/audit-cover-up-declaration.mjs [CASE###]');
    process.exit(2);
  }
  const master = load(arg);
  if (!master) {
    console.error(`no such master: ${arg}`);
    process.exit(2);
  }
  const ft = master.full_truth ?? {};
  const gaps = coverUpDeclarationGaps(ft);
  console.log(`${arg}${registry.has(arg) ? ' (등록됨 → warn)' : ' (미등록 → error)'}`);
  console.log(`  선언: ${Array.isArray(ft.cover_up_method) ? ft.cover_up_method.join(', ') : '(없음 — 폴백이 센다)'}`);
  console.log(`  문장: ${ft.cover_up ?? '(없음)'}`);
  if (gaps.length === 0) console.log('  폴백이 더 잡는 칸: 없음');
  else for (const g of gaps) console.log(`  더 잡음: ${g.key} (${g.label}) ← 「${g.matched}」`);
  process.exit(0);
}

const ids = fs.readdirSync(root).filter((n) => /^CASE\d+$/.test(n)).sort();
let declared = 0;
const hits = [];
const byLabel = new Map();
for (const id of ids) {
  const master = load(id);
  if (!master) continue;
  const ft = master.full_truth ?? {};
  if (!Array.isArray(ft.cover_up_method) || ft.cover_up_method.length === 0) continue;
  declared += 1;
  const gaps = coverUpDeclarationGaps(ft);
  if (gaps.length === 0) continue;
  hits.push({ id, gaps, registered: registry.has(id) });
  for (const g of gaps) byLabel.set(g.key, (byLabel.get(g.key) ?? 0) + 1);
}
const reg = hits.filter((h) => h.registered).length;
console.log(`마스터 ${ids.length}건 · 선언 있는 것 ${declared}건 · 선언이 문장보다 좁은 것 ${hits.length}건 (${((100 * hits.length) / Math.max(declared, 1)).toFixed(1)}%) — 등록 ${reg}(warn) · 미등록 ${hits.length - reg}(error)`);
console.log('폴백이 더 잡는 칸별(건): ' + [...byLabel].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('');
for (const h of hits) console.log(`  ${h.id}${h.registered ? '' : ' *미등록'}: ${h.gaps.map((g) => `${g.key}「${g.matched}」`).join(' · ')}`);
