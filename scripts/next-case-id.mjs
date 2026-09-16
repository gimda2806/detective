#!/usr/bin/env node
// 다음 사건에 쓸 case_id를 고른다.
//
// 예전 규칙은 "기존 최댓값 + 1"이었다. 그러면 비워 둔 번호가 영영 비어 있다.
// 번호는 곧 플레이 순서라(sortCaseSummaries가 미착수 그룹을 번호순으로
// 정렬한다) 서로 너무 닮은 사건을 뒷번호로 옮기고 그 앞자리를 새 사건이
// 채우는 것이 이 프로젝트의 정리 방식인데, 최댓값+1로는 그게 성립하지 않는다.
//
// 그래서 "가장 작은 빈 번호, 없으면 최댓값 + 1"로 바꾼다. 다만 두 가지를
// 건너뛴다:
//   - case_registry.json에 있는 번호. 폴더가 없어도 한 번 쓰인 번호다
//     (CASE014가 그렇다 — 앱에 내장된 사건이라 pending-cases에는 없다).
//   - 시작 번호 아래. 코퍼스는 CASE005부터 시작한다.
//
// 같은 번호를 다른 사건이 물려받아도 옛 저장이 새 사건에 붙지는 않는다 —
// app/game.ts의 isStateForDifferentCase가 제목으로 갈라 버린다.
//
//   node scripts/next-case-id.mjs          다음 번호 하나
//   node scripts/next-case-id.mjs --gaps   비어 있는 번호 전부

import fs from 'node:fs';
import path from 'node:path';

const PENDING = path.join(process.cwd(), 'data', 'pending-cases');
const REGISTRY = path.join(process.cwd(), 'data', 'case_registry.json');

const used = new Set();
for (const entry of fs.readdirSync(PENDING)) {
  const match = /^CASE(\d+)$/.exec(entry);
  if (match) used.add(Number(match[1]));
}
try {
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
  for (const key of Object.keys(registry.cases ?? {})) {
    const match = /^CASE(\d+)$/.exec(key);
    if (match) used.add(Number(match[1]));
  }
} catch {
  // registry를 못 읽으면 폴더만 보고 고른다
}

const numbers = [...used].sort((a, b) => a - b);
const lowest = numbers[0] ?? 1;
const highest = numbers[numbers.length - 1] ?? 0;
const gaps = [];
for (let n = lowest; n < highest; n += 1) {
  if (!used.has(n)) gaps.push(n);
}

const pad = (n) => `CASE${String(n).padStart(3, '0')}`;
if (process.argv.includes('--gaps')) {
  console.log(gaps.length ? gaps.map(pad).join(' ') : '(빈 번호 없음)');
} else {
  console.log(pad(gaps.length ? gaps[0] : highest + 1));
}
