#!/usr/bin/env node
// actual_timeline[].world_fact의 대명사를 실제 이름으로 바꾼다.
//
// 왜: world_fact는 런타임이 actual_action과 떼어 내 단독으로 GM에게 넘긴다
// (filterSafeTimelineFacts → current_timeline_facts는 {id, time, world_fact}만
// 싣는다). 그래서 "그의 앞치마 주머니에서…"는 그 문장만 받아 든 모델에게
// 누구 얘기인지 알 수 없는 문장이 된다. validate_master의
// WORLD_FACT_VAGUE_SUBJECT가 잡는 게 이것이다.
//
// 주어는 actors에서 고른다. 한 명이면 그 사람, 여러 명이면 actual_action에
// 이름이 나오는 사람(행동의 주어)을 쓴다. 둘 다 아니면 건드리지 않는다.
//
// 조사는 받침에 따라 바꿔 붙인다 — "그를"이 "탁이현를"이 되면 안 된다.
//
//   node scripts/normalize-world-fact-subject.mjs CASE017
//   node scripts/normalize-world-fact-subject.mjs --all [--dry]

import fs from 'node:fs';
import path from 'node:path';

const PENDING = path.join(process.cwd(), 'data', 'pending-cases');
// 앞이 한글이면 낱말 안쪽이다 — "로그가"의 "그가", "태그가"의 "그가"를
// 대명사로 읽지 않도록 왼쪽 경계를 준다.
const PRONOUN = /(?<![가-힣])(그|그녀)(는|가|를|의|에게|와|도)(?=\s|$)/g;

function hasFinalConsonant(name) {
  const last = name.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false; // 한글 음절이 아니면 모음 취급
  return code % 28 !== 0;
}

// 받침 있는 이름 뒤에서 형태가 바뀌는 조사만 적는다.
const PARTICLE_AFTER_CONSONANT = { 는: '은', 가: '이', 를: '을', 와: '과' };

function replaceIn(worldFact, name) {
  const closed = hasFinalConsonant(name);
  return worldFact.replace(PRONOUN, (_whole, _pronoun, particle) => {
    const fixed = closed ? (PARTICLE_AFTER_CONSONANT[particle] ?? particle) : particle;
    return `${name}${fixed}`;
  });
}

function subjectFor(entry, nameById, worldFact) {
  const actors = (entry.actors ?? [])
    .map((id) => nameById.get(id))
    .filter(Boolean);
  if (actors.length === 1) return actors[0];
  // 둘 중 한쪽 이름이 이미 문장에 있으면 대명사는 나머지 한쪽이다
  // ("반유경은 … 그녀의 불안한 기색만 기억한다" → 그녀 = 신다경).
  const absent = actors.filter((name) => !worldFact.includes(name));
  if (absent.length === 1) return absent[0];
  // 둘 다 문장에 없으면 행동의 주어를 쓴다.
  const action = entry.actual_action ?? '';
  const inAction = actors.filter((name) => action.includes(name));
  return inAction.length === 1 ? inAction[0] : null;
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const dry = args.includes('--dry');
const ids = args.filter((a) => !a.startsWith('--'));
const targets = all
  ? fs.readdirSync(PENDING).filter((d) => /^CASE\d+$/.test(d)).sort()
  : ids;

if (targets.length === 0) {
  console.error('사용법: node scripts/normalize-world-fact-subject.mjs <CASE_ID> | --all [--dry]');
  process.exit(1);
}

let changedCases = 0;
let changedFacts = 0;
const skipped = [];
for (const id of targets) {
  const file = path.join(PENDING, id, `${id}.master.json`);
  if (!fs.existsSync(file)) continue;
  let raw = fs.readFileSync(file, 'utf-8');
  const master = JSON.parse(raw);
  const nameById = new Map();
  for (const ch of master.characters ?? []) nameById.set(ch.id, ch.name);
  for (const kf of master.key_figures ?? []) nameById.set(kf.id, kf.name);

  let touched = false;
  for (const entry of master.actual_timeline ?? []) {
    const worldFact = (entry.world_fact ?? '').trim();
    if (!worldFact) continue;
    PRONOUN.lastIndex = 0;
    if (!PRONOUN.test(worldFact)) continue;
    const name = subjectFor(entry, nameById, worldFact);
    if (!name) {
      skipped.push(`${id} ${entry.id}`);
      continue;
    }
    // 이미 이름이 있는 문장은 대명사가 다른 사람을 가리킬 수 있다 — 건드리지 않는다.
    if (worldFact.includes(name)) continue;
    const next = replaceIn(worldFact, name);
    if (next === worldFact) continue;
    // 값 하나를 JSON 리터럴 단위로 바꿔 서식을 보존한다.
    raw = raw.replace(JSON.stringify(entry.world_fact), JSON.stringify(next));
    changedFacts += 1;
    touched = true;
  }
  if (touched) {
    changedCases += 1;
    if (!dry) fs.writeFileSync(file, raw, 'utf-8');
  }
}
console.log(`${dry ? '대상' : '수정'}: ${changedCases}건 / 문장 ${changedFacts}개`);
if (skipped.length) {
  console.log(`주어를 못 고른 항목 ${skipped.length}개: ${skipped.join(', ')}`);
}
