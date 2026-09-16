#!/usr/bin/env node
// opening_scene.narrative에서 대사와 지문이 한 줄에 붙어 있는 것을 갈라 준다.
//
// 왜: 도입부는 CaseIntroContent가 `\n{2,}`로 블록을 나누고, 블록 전체가 대사인
// 것에만 .intro-dialogue 스타일을 붙인다(DetectiveApp.tsx). 지문과 대사가 한
// 줄에 섞여 있으면 그 줄은 대사로 인식되지 않아 스타일이 안 붙고, 화면에서
// 벽처럼 읽힌다. case_generation_prompt.md가 CASE120을 근거로 적어 둔 규칙이
// 바로 이것이다.
//
//   틀린 예: 한지우가 중얼거렸다. "이건 이상한데요." "나도 그래." 탐정이 답했다.
//   옳은 예: 한지우가 중얼거렸다.
//            "이건 이상한데요."
//            "나도 그래."
//            탐정이 답했다.
//
// 마스터의 줄 구분자가 `\n` 하나여도 상관없다 — 변환기의 normalizeParagraphs가
// 모든 단일 개행을 `\n\n`으로 바꿔 내보낸다. 여기서는 줄을 나누기만 한다.
//
// 짧은 인용(6자 미만이고 문장부호로 끝나지 않는 것)은 고유명사 표기로 보고
// 건드리지 않는다.
//
//   node scripts/normalize-opening-breaks.mjs CASE019
//   node scripts/normalize-opening-breaks.mjs --all [--dry]

import fs from 'node:fs';
import path from 'node:path';

const PENDING = path.join(process.cwd(), 'data', 'pending-cases');
const QUOTE = /[“”][^“”]*[“”]|"[^"]*"/g;

function splitLine(line) {
  const parts = [];
  let last = 0;
  for (const match of line.matchAll(QUOTE)) {
    const quoted = match[0];
    const inner = quoted.slice(1, -1).trim();
    if (inner.length < 6 && !/[.?!…]$/.test(inner)) continue;
    if (match.index > last) {
      const before = line.slice(last, match.index).trim();
      if (before) parts.push(before);
    }
    parts.push(quoted.trim());
    last = match.index + quoted.length;
  }
  const tail = line.slice(last).trim();
  if (tail) parts.push(tail);
  return parts.length > 1 ? parts : [line];
}

function normalize(narrative) {
  const separator = narrative.includes('\n\n') ? '\n\n' : '\n';
  return narrative
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap(splitLine)
    .join(separator);
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const dry = args.includes('--dry');
const ids = args.filter((a) => !a.startsWith('--'));
const targets = all
  ? fs.readdirSync(PENDING).filter((d) => /^CASE\d+$/.test(d)).sort()
  : ids;

if (targets.length === 0) {
  console.error('사용법: node scripts/normalize-opening-breaks.mjs <CASE_ID> | --all [--dry]');
  process.exit(1);
}

let changed = 0;
for (const id of targets) {
  const file = path.join(PENDING, id, `${id}.master.json`);
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf-8');
  const master = JSON.parse(raw);
  const before = master.opening_scene?.narrative;
  if (typeof before !== 'string') continue;
  const after = normalize(before);
  if (after === before) continue;
  changed += 1;
  if (!dry) {
    // 값 하나를 JSON 리터럴 단위로 바꿔 들여쓰기와 나머지 서식을 보존한다.
    fs.writeFileSync(
      file,
      raw.replace(JSON.stringify(before), JSON.stringify(after)),
      'utf-8',
    );
  }
}
console.log(`${dry ? '대상' : '수정'}: ${changed}건`);
