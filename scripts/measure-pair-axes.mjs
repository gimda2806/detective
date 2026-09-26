// 붙은 쌍 축의 실측기. `PAIR_AXES` 에 축을 더하거나 뺄지 정할 때 돌린다.
//
//   npm run measure:pairs
//
// **이 파일이 있는 이유.** `validate_master.ts` 는 `pairSharedAxes` 를 「실측
// 스크립트가 같은 판정을 쓰기 위해」 내보내는데, 정작 그 스크립트가 저장소에
// 없었다(2026-09-26). 그래서 축을 잴 때마다 사람이 그 자리에서 대리 지표를
// 손으로 짰고, 그 손 계산이 이 저장소에서 네 번 틀렸다 — 「11편이 검사 안
// 돈다」(실제 5편) · 「14편 지우면 된다」(실제 16편) · 「빈 쪽지 5장」(실제
// 1장) · 「체크박스가 새어 들었다」(실제 0개). 전부 **출하된 코드를 안 부르고
// 비슷해 보이는 것을 새로 짜서** 났다. 축 하나를 재자고 스크립트를 새로 짜는
// 일이 다시는 없게, 판정은 검사기에서만 온다.
//
// 배수의 뜻: 번호가 붙은 쌍에서 켜지는 비율 ÷ 먼 쌍에서 켜지는 비율. 1배는
// 무작위다. 지금 쓰는 축의 실측 배수는 `validate_master.ts` 의 `PAIR_AXES`
// 주석에 축마다 적혀 있다.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// `app/` 의 확장자 없는 import 때문에 node 로 바로 못 돌린다 — check-case.mjs 와 같은 절차다.
const out = mkdtempSync(join(tmpdir(), 'pair-axes-'));
execFileSync(
  'npx',
  ['tsc', 'scripts/validate_master.ts', '--outDir', out, '--module', 'esnext',
   '--target', 'es2022', '--moduleResolution', 'bundler', '--esModuleInterop', '--skipLibCheck'],
  { stdio: 'inherit' },
);
const addJsExtensions = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) addJsExtensions(path);
    else if (entry.name.endsWith('.js'))
      writeFileSync(path, readFileSync(path, 'utf8').replace(
        /from '(\.\.?\/[^']+)'/g, (whole, t) => (t.endsWith('.js') ? whole : `from '${t}.js'`)));
  }
};
addJsExtensions(out);
const { pairSharedAxes } = await import(join(out, 'scripts/validate_master.js'));

const ROOT = 'data/pending-cases';
const cases = [];
for (const dir of readdirSync(ROOT).sort()) {
  try {
    cases.push({
      id: dir,
      n: Number(dir.slice(4)),
      master: JSON.parse(readFileSync(join(ROOT, dir, `${dir}.master.json`), 'utf8')),
    });
  } catch {
    // 마스터가 없는 폴더(판본만 있는 곳 등)는 건너뛴다.
  }
}

// `checkPairTwin` 과 같은 값이어야 한다 — 바뀌면 여기도 같이 고친다.
const WINDOW = 2;
const MIN_AXES = 3;
const REQUIRED = '단계 사슬 골격';

// 후보 축: 정확히 같은 `verbal_tic` 문자열. 아직 `PAIR_AXES` 에 없다(2026-09-26,
// 사용자 결정 대기 — `docs/decisions-log.md` 같은 날 절).
const tics = (m) => new Set((m.characters ?? [])
  .map((c) => String(c.voice_profile?.verbal_tic ?? '').trim())
  .filter((s) => s.length > 0));
const CANDIDATES = [
  ['말버릇 1개 이상', (a, b) => sharedTicCount(a, b) >= 1],
  ['말버릇 2개 이상', (a, b) => sharedTicCount(a, b) >= 2],
];
function sharedTicCount(a, b) {
  const B = tics(b);
  return [...tics(a)].filter((t) => B.has(t)).length;
}

const near = { total: 0, byLabel: new Map() };
const far = { total: 0, byLabel: new Map() };
const bump = (bucket, label) => bucket.byLabel.set(label, (bucket.byLabel.get(label) ?? 0) + 1);
const twinPairs = [];

for (let i = 0; i < cases.length; i++) {
  for (let j = i + 1; j < cases.length; j++) {
    const a = cases[i];
    const b = cases[j];
    const bucket = Math.abs(a.n - b.n) <= WINDOW ? near : far;
    bucket.total++;
    const axes = pairSharedAxes(a.master, b.master);
    for (const label of axes) bump(bucket, label);
    for (const [label, test] of CANDIDATES) if (test(a.master, b.master)) bump(bucket, label);
    if (bucket === near && axes.length >= MIN_AXES && axes.includes(REQUIRED))
      twinPairs.push(`${a.id}↔${b.id} — ${axes.join(' / ')}`);
  }
}

const labels = [...new Set([...near.byLabel.keys(), ...far.byLabel.keys()])];
const pct = (x, n) => ((100 * x) / n).toFixed(2) + '%';
console.log(`\n코퍼스 ${cases.length}건 · 붙은 쌍(Δ≤${WINDOW}) ${near.total} · 먼 쌍 ${far.total}\n`);
console.log('축'.padEnd(22) + '붙은 쌍'.padStart(16) + '먼 쌍'.padStart(18) + '배수'.padStart(10));
for (const label of labels) {
  const nx = near.byLabel.get(label) ?? 0;
  const fx = far.byLabel.get(label) ?? 0;
  const ratio = fx === 0 ? '∞' : ((nx / near.total) / (fx / far.total)).toFixed(1) + '배';
  const mark = CANDIDATES.some(([l]) => l === label) ? ' (후보)' : '';
  console.log(
    (label + mark).padEnd(22) +
      `${nx} (${pct(nx, near.total)})`.padStart(16) +
      `${fx} (${pct(fx, far.total)})`.padStart(18) +
      ratio.padStart(10),
  );
}
console.log(`\nPAIR_TWIN 이 지금 내는 쌍: ${twinPairs.length}`);
for (const line of twinPairs) console.log('  ' + line);
