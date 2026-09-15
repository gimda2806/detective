#!/usr/bin/env node
// 마스터의 시각 표기를 24시간제로 통일한다. "저녁 7시" → "19시".
//
// 왜: 시각이 곧 단서다. 플레이어는 두 진술의 시각을 눈으로 맞춰 보고 모순을
// 찾는데, 한쪽이 "오후 8시"고 다른 쪽이 "20:00"이면 그 대조가 한 단계
// 어려워진다. CLAUDE.md가 "시각은 아라비아 숫자로 쓴다"고 정한 것과 같은
// 이유를 끝까지 민 것이다(2026-09 사용자 결정).
//
// opening_scene.narrative와 ending_scene.narrative는 건드리지 않는다.
// 거기서 접두어를 떼면 한국어가 깨진다 — "이른 아침 7시"는 한 덩어리라
// "아침"만 뜯어내면 "이른 7시"가 된다. 플레이어가 맞춰 보는 것은 증거와
// 진술의 시각이지 오프닝의 분위기 문장이 아니므로, 산문 15곳은 그대로 둔다.
//
// 접두어가 붙었지만 이미 24시간 표기인 것도 있다("밤 21시", "오후 15시",
// 모순인 "오전 13시" 하나). 그런 것은 접두어만 뗀다.
// "정오"/"자정"은 낱말이라 건드리지 않는다.
//
//   node scripts/normalize-case-times.mjs CASE302
//   node scripts/normalize-case-times.mjs --all [--dry]

import fs from 'node:fs';
import path from 'node:path';

const PENDING = path.join(process.cwd(), 'data', 'pending-cases');
// "이른/늦은/깊은"이 접두어 앞에 붙으면 함께 뗀다. 접두어만 떼면 수식어가
// 갈 곳을 잃는다.
const PATTERN = /(?:(이른|늦은|깊은)\s*)?(오전|오후|새벽|아침|저녁|밤|낮)\s*(\d{1,2})\s*시/g;
// 미리 쓰여 있는 그대로 플레이어에게 나가는 자리 — 여기는 건드리지 않는다
// (2026-09 사용자 결정). 오프닝·엔딩 산문이 그렇고, 사건 종료 화면도
// 그렇다. submitMessage의 case_close 분기가 [FINAL_DEDUCTION]과
// [ENDING_EXPLANATION]을 모델을 거치지 않고 그대로 읽어 보여준다.
const PROSE_PATHS = new Set([
  'opening_scene.narrative',
  'ending_scene.narrative',
  'ending_explanation[]',
  'final_deduction.responsible',
  'final_deduction.method',
  'final_deduction.motive',
  'final_deduction.key_connection',
]);

function toHour24(prefix, hour) {
  if (hour >= 13) return hour; // 이미 24시간제 — 접두어만 뗀다
  switch (prefix) {
    case '오전':
    case '새벽':
    case '아침':
      return hour === 12 ? 0 : hour;
    case '오후':
    case '낮':
      return hour === 12 ? 12 : hour + 12;
    case '저녁':
      return hour + 12;
    case '밤':
      // 밤 12시는 자정, 밤 1~4시는 이미 새벽 쪽 숫자다.
      if (hour === 12) return 0;
      return hour <= 4 ? hour : hour + 12;
    default:
      return hour;
  }
}

function normalize(text) {
  return text.replace(PATTERN, (whole, _modifier, prefix, digits) => {
    const hour = Number(digits);
    if (!Number.isFinite(hour) || hour > 23) return whole;
    return `${toHour24(prefix, hour)}시`;
  });
}

// 바꿀 문자열을 경로와 함께 모은다. 산문 경로는 건너뛴다.
function collect(node, pathText, out) {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, `${pathText}[]`, out);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      collect(value, pathText ? `${pathText}.${key}` : key, out);
    }
    return;
  }
  if (typeof node !== 'string' || PROSE_PATHS.has(pathText)) return;
  const next = normalize(node);
  if (next !== node) out.set(node, next);
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const dry = args.includes('--dry');
const ids = args.filter((a) => !a.startsWith('--'));
const targets = all
  ? fs.readdirSync(PENDING).filter((d) => /^CASE\d+$/.test(d)).sort()
  : ids;

if (targets.length === 0) {
  console.error('사용법: node scripts/normalize-case-times.mjs <CASE_ID> | --all [--dry]');
  process.exit(1);
}

let changedFiles = 0;
let changedValues = 0;
for (const id of targets) {
  const file = path.join(PENDING, id, `${id}.master.json`);
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf-8');
  const edits = new Map();
  collect(JSON.parse(raw), '', edits);
  if (edits.size === 0) continue;
  // 값 하나를 통째로(JSON 리터럴 단위로) 바꾼다. 부분 문자열로 치환하면
  // 같은 표현이 들어 있는 산문까지 함께 바뀐다.
  let next = raw;
  for (const [before, after] of edits) {
    next = next.split(JSON.stringify(before)).join(JSON.stringify(after));
  }
  changedFiles += 1;
  changedValues += edits.size;
  if (!dry) fs.writeFileSync(file, next, 'utf-8');
}
console.log(`${dry ? '대상' : '수정'}: ${changedFiles}개 파일 / 값 ${changedValues}개`);
