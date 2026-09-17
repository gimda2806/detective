#!/usr/bin/env node
// 최근 N건에서 반복된 것을 뽑아, 새 사건이 피해야 할 목록으로 내놓는다.
//
// 왜 검사기가 아니라 이것인가: 검사기는 코퍼스 비율을 본다. 307건이 되면
// 같은 것을 또 써도 비율이 잘 안 움직여서 사실상 잠든다. 반면 "최근 N건과
// 겹치지 마라"는 코퍼스 크기와 무관하게 똑같이 듣는다.
//
// 근거가 코퍼스 안에 있다: detective_entry_type만 생성 지침이 명시적으로
// "최근 3건과 겹치지 않게"라고 지시받은 필드인데, 307건에서 최다값이 5%로
// 고르게 흩어져 있다. 반면 아무도 세지 않는 축은 25~48%까지 쏠렸다 —
// 제목 틀 「OO이 삼킨 △△」 25%, 배경 "…를 앞둔" 48%, 진범 CH01 53%,
// 밀폐·질식 수법 21%.
//
//   node scripts/recent-avoid.mjs        최근 10건
//   node scripts/recent-avoid.mjs 20     최근 20건

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PENDING = path.join(process.cwd(), 'data', 'pending-cases');
const COUNT = Number(process.argv[2]) || 10;

// full_truth.method와 genre를 함께 보고 수법 계열을 고른다. genre만으로는
// 안 된다 — 옛 형식 112건은 genre에 수법이 안 적혀 있다.
const METHOD_FAMILIES = [
  ['밀폐·질식', /질식|밀폐|가스가? (차|고이|정체)|증기|산소 농도|훈증|일산화탄소|이산화탄소|환기[구팬창]?\s*(차단|끄|꺼|막)/],
  ['추락·실족', /추락|실족|낙상|밀쳐 (넘어|떨어)|떨어뜨[려리]/],
  ['낙하물·압착', /낙하|깔[린려]|압착|끼이|무게추|트러스가? 떨어|붕괴|쏟아져/],
  ['타격·외상', /가격|둔기|부딪히게|강타|내리쳐/],
  ['감전', /감전|누전|접지선|전류/],
  ['중독(경구)', /섞어(두|둔|서| )|음독|마시게|먹게|복용|투여/],
  ['익사', /익사|물에 빠|수조 안으로|잠긴 채/],
  ['화재·폭발', /발화|폭발|불이 붙|연소/],
];

const TITLE_SHAPES = [
  ['「OO이/가 삼킨 △△」', /(이|가) 삼킨/],
  ['「…하지 않은/못한 △△」', /않은 |못한 /],
  ['「…에 남은/남긴 △△」', /남은 |남긴 /],
  ['「…이 감춘/숨긴 △△」', /감춘 |숨긴 |가린 /],
];

const SETTING_DEVICES = [
  ['"…를 앞둔" 마감 압박', /앞둔|앞두고/],
  ['현장에서 "쓰러진 채 발견"', /쓰러진 채 발견|숨진 채 발견/],
];

const OPENING_DEVICES = [
  ['비명으로 연다', /비명/],
  ['"쓰러진 채 발견"', /쓰러진 채|쓰러져 있/],
  ['119에 신고하는 장면', /119에 신고/],
  ['발견자가 소리쳐 부른다', /소리쳤|소리치/],
];

function tally(entries, rules, pick) {
  const counts = new Map();
  for (const entry of entries) {
    const text = pick(entry);
    for (const [label, pattern] of rules) {
      if (pattern.test(text)) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// 번호순으로 자르면 안 된다. case_id는 "가장 작은 빈 번호"로 고르므로(2026-09
// 결정) 번호가 큰 것이 최근에 쓰인 것이 아니다 — CASE078~082가 그렇게 이주됐고,
// 그때 이 스크립트는 상관없는 CASE311~320을 보고 피할 목록을 내놨다.
// 마스터 파일이 커밋에 처음 들어온 시각을 작성 시각으로 본다.
function idsByAddedTime() {
  const log = execFileSync(
    'git',
    ['log', '--diff-filter=A', '--format=:%ct', '--name-only', '--', 'data/pending-cases'],
    { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 },
  );
  const added = new Map(); // git log는 최신순이라 첫 등장이 가장 최근이다
  for (const line of log.split('\n')) {
    if (line.startsWith(':')) continue;
    const hit = /^data\/pending-cases\/(CASE\d+)\/\1\.master\.json$/.exec(line.trim());
    if (hit && !added.has(hit[1])) added.set(hit[1], true);
  }
  return [...added.keys()];
}

const onDisk = new Set(
  fs.readdirSync(PENDING).filter((d) => /^CASE\d+$/.test(d)),
);

let ids;
try {
  ids = idsByAddedTime().filter((id) => onDisk.has(id)).slice(0, COUNT);
} catch {
  ids = [];
}
if (!ids.length) {
  // git이 없거나 얕은 클론이면 번호순으로 물러선다 — 틀릴 수 있지만 없는 것보다 낫다
  ids = [...onDisk].sort((a, b) => Number(a.slice(4)) - Number(b.slice(4))).slice(-COUNT);
}

const cases = ids
  .map((id) => {
    const file = path.join(PENDING, id, `${id}.master.json`);
    if (!fs.existsSync(file)) return null;
    return { id, master: JSON.parse(fs.readFileSync(file, 'utf-8')) };
  })
  .filter(Boolean);

const show = (label, rows) => {
  if (!rows.length) return;
  const body = rows
    .filter(([, n]) => n >= 2) // 한 번뿐인 것은 아직 반복이 아니다
    .map(([k, n]) => `${k} ${n}`)
    .join(' · ');
  if (body) console.log(`  ${label.padEnd(10)} ${body}`);
};

console.log(
  `최근 ${cases.length}건(${cases.map((c) => c.id).join(', ')})에서 반복된 것 — 이번 사건은 피할 것\n`,
);
show('수법 계열', tally(cases, METHOD_FAMILIES, (c) =>
  `${c.master.full_truth?.method ?? ''} ${c.master.case_identity?.genre ?? ''}`));
show('제목 틀', tally(cases, TITLE_SHAPES, (c) => c.master.case_identity?.title ?? ''));
show('배경 장치', tally(cases, SETTING_DEVICES, (c) => c.master.case_identity?.setting ?? ''));
show('오프닝', tally(cases, OPENING_DEVICES, (c) => c.master.opening_scene?.narrative ?? ''));

const slots = new Map();
const entries = new Map();
for (const { master } of cases) {
  const slot = master.full_truth?.responsible_character_id ?? '?';
  slots.set(slot, (slots.get(slot) ?? 0) + 1);
  const type = master.case_identity?.detective_entry_type ?? '?';
  entries.set(type, (entries.get(type) ?? 0) + 1);
}
show('진범 위치', [...slots.entries()].sort((a, b) => b[1] - a[1]));
show('진입 경로', [...entries.entries()].sort((a, b) => b[1] - a[1]));
console.log(
  '\n인물 이름은 case_registry.json의 characters/key_figures 전체와 겹치지 않게 고를 것.',
);
