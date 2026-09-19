// 작업자 모드가 내보낸 대사 수정을 저장소에 반영한다.
//
//   node scripts/apply-line-edits.mjs line-edits-2026-09-19.txt
//   node scripts/apply-line-edits.mjs line-edits.txt --dry
//
// **화면에 찍힌 원문이 곧 주소다.** 오프라인 엔진은 문자열만 내보내고 그것이
// 어느 필드에서 나왔는지는 들고 있지 않다. 대신 그 문장이 마스터
// (data/pending-cases/*/*.master.json) 아니면 엔진 대사 풀
// (app/gm/offline-engine.ts) 어딘가에 글자 그대로 들어 있으므로, 같은
// 문자열을 찾아 갈아 끼우면 된다. 사건 id 가 같이 적혀 오므로 마스터는 그
// 파일부터 본다.
//
// 못 찾거나 여러 군데에서 찾은 것은 **건드리지 않고 목록으로 낸다.** 엔진이
// 따옴표를 씌우거나(asQuote) 조사를 붙이거나(withTopic) 틀을 채워서
// (fill) 내보낸 줄은 원본과 글자가 다르기 때문이다 — 그건 사람이 어디를
// 고칠지 정해야 한다.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const file = process.argv[2];
const dry = process.argv.includes('--dry');
if (!file) {
  console.error('usage: node scripts/apply-line-edits.mjs <내보낸 파일> [--dry]');
  process.exit(2);
}

const ROOT = process.cwd();
const PENDING = join(ROOT, 'data', 'pending-cases');
const ENGINE = join(ROOT, 'app', 'gm', 'offline-engine.ts');

// 내보내기 형식: `--- <CASE> · <시각}` / `[before]` / 원문 / `[after]` / 고친 것
function parse(text) {
  const out = [];
  const blocks = text.split(/^--- /m).slice(1);
  for (const block of blocks) {
    const [head, ...rest] = block.split('\n');
    const body = rest.join('\n');
    const before = body.indexOf('[before]');
    const after = body.indexOf('[after]');
    if (before < 0 || after < 0 || after < before) continue;
    out.push({
      caseId: (head.split('·')[0] || '').trim(),
      original: body.slice(before + '[before]'.length, after).trim(),
      edited: body.slice(after + '[after]'.length).trim(),
    });
  }
  return out;
}

// 따옴표는 엔진이 씌우기도 한다. 원문 그대로 → 껍데기 벗긴 것 순으로 본다.
function candidates(text) {
  const bare = text.replace(/^["“]\s*/, '').replace(/\s*["”]$/, '').trim();
  return bare && bare !== text ? [text, bare] : [text];
}

function jsonEscape(text) {
  return JSON.stringify(text).slice(1, -1);
}

const targets = [];
for (const dir of readdirSync(PENDING, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const path = join(PENDING, dir.name, `${dir.name}.master.json`);
  if (existsSync(path)) targets.push({ id: dir.name, path });
}
if (existsSync(ENGINE)) targets.push({ id: 'ENGINE', path: ENGINE });

const cache = new Map();
const read = (path) => {
  if (!cache.has(path)) cache.set(path, readFileSync(path, 'utf8'));
  return cache.get(path);
};

const edits = parse(readFileSync(file, 'utf8'));
const applied = [];
const missed = [];

for (const edit of edits) {
  // 그 사건 마스터 → 엔진 → 나머지 마스터 순으로 본다.
  const ordered = [
    ...targets.filter((t) => t.id === edit.caseId),
    ...targets.filter((t) => t.id === 'ENGINE'),
    ...targets.filter((t) => t.id !== edit.caseId && t.id !== 'ENGINE'),
  ];
  let done = false;
  for (const target of ordered) {
    const body = read(target.path);
    for (const form of candidates(edit.original)) {
      const needle = target.path.endsWith('.json') ? jsonEscape(form) : form;
      const hits = body.split(needle).length - 1;
      if (hits !== 1) continue;
      const replacement = target.path.endsWith('.json')
        ? jsonEscape(
            candidates(edit.original).length > 1 && form !== edit.original
              ? edit.edited.replace(/^["“]\s*/, '').replace(/\s*["”]$/, '').trim()
              : edit.edited,
          )
        : edit.edited;
      cache.set(target.path, body.split(needle).join(replacement));
      applied.push({ ...edit, where: target.id });
      done = true;
      break;
    }
    if (done) break;
  }
  if (!done) missed.push(edit);
}

if (!dry) {
  for (const [path, body] of cache) {
    if (body !== readFileSync(path, 'utf8')) writeFileSync(path, body);
  }
}

console.log(`수정 ${edits.length}건 — 반영 ${applied.length}, 못 찾음 ${missed.length}${dry ? ' (dry run)' : ''}`);
for (const a of applied) console.log(`  [${a.where}] ${a.original.slice(0, 40)} → ${a.edited.slice(0, 40)}`);
if (missed.length) {
  console.log('\n글자 그대로 한 군데에서 찾지 못한 것 — 엔진이 따옴표·조사·틀을 채워 내보낸 줄일 수 있다:');
  for (const m of missed) console.log(`  [${m.caseId}] ${m.original}`);
}
process.exit(missed.length ? 1 : 0);
