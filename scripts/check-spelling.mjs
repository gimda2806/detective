// 띄어쓰기·맞춤법 검수를 코퍼스 전체와 엔진 대사 풀에 한 번 돌린다.
//
//   npm run check:spelling
//
// 고치지 않는다 — 어디가 걸리는지만 센다. 규칙은 scripts/lib/korean-proofread.mjs
// 에 있고 정확도 우선이라, 여기 나온 것은 거의 다 진짜다.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proofread } from './lib/korean-proofread.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POOLS = [
  'app/gm/offline-engine.ts',
  'app/gm/jiwoo-examples.ts',
  'app/interludes.ts',
];

const hits = [];

function walk(value, path, file) {
  if (typeof value === 'string') {
    for (const hit of proofread(value)) {
      hits.push({ file, where: path, ...hit, text: value });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${path}[${i}]`, file));
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) walk(value[key], `${path}.${key}`, file);
  }
}

let cases = 0;
for (const dir of readdirSync(join(ROOT, 'data', 'pending-cases'))) {
  const file = join(ROOT, 'data', 'pending-cases', dir, `${dir}.master.json`);
  try {
    walk(JSON.parse(readFileSync(file, 'utf8')), '', dir);
    cases += 1;
  } catch {
    // 마스터가 아닌 폴더는 건너뛴다.
  }
}

// 대사 풀은 소스라 문자열 리터럴만 본다. 템플릿 리터럴은 `${...}` 가 섞여
// 있어 조각난 문장이 들어오므로 뺀다 — 삼항 연산자의 `? `가 「문장부호 앞
// 빈칸」으로 걸린다.
for (const rel of POOLS) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    for (const literal of line.match(/'[^']*'|"[^"]*"/g) || []) {
      if (literal.includes('${')) continue;
      for (const hit of proofread(literal)) {
        hits.push({ file: rel, where: `:${i + 1}`, ...hit, text: literal });
      }
    }
  });
}

const byRule = new Map();
for (const hit of hits) byRule.set(hit.why, [...(byRule.get(hit.why) || []), hit]);

console.log(`마스터 ${cases}건 + 대사 풀 ${POOLS.length}개 — 걸린 곳 ${hits.length}`);
for (const [why, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${list.length}\t${why}`);
  for (const hit of list.slice(0, 12)) {
    const around = hit.text.slice(Math.max(0, hit.at - 16), hit.at + 16);
    console.log(`  ${hit.file}${hit.where}  「${hit.found}」 → 「${hit.suggest}」  …${around}…`);
  }
  if (list.length > 12) console.log(`  … 외 ${list.length - 12}곳`);
}

process.exit(hits.length ? 1 : 0);
