// 대립 단계가 내주는 id 에 **본문이 없는** 자리를 센다.
//
//   npm run audit:stage-release            전체를 사건별로
//   npm run audit:stage-release CASE040    한 사건의 재료(release.scope)까지
//
// **무엇이 문제인가.** `contradiction_stages[].release.claim_or_fact_id` 가
// 가리키는 진술(S-)·사실(F-)이 그 인물의 `initial_claims`·`knows` 어디에도
// 없는 경우다. 교차참조 검사는 이것을 통과시킨다 — `collectIds` 가 단계가
// 내주는 id 를 「이후 정의되는 사실」로 먼저 등록하기 때문이다
// (`validate_master.ts` 의 그 주석). 완주도 된다: 엔진이 돌파 턴에 그 id 를
// 넣어 주므로 사슬은 이어진다. **끊기는 것은 본문이다** — 수첩에 id 만
// 꽂히고 그 사람이 무슨 말을 했는지가 없다.
//
// **고치는 법은 CLAUDE.md ① 에 있다**: 「단계가 진술(S-)을 직접 내주는 모양도
// 된다(**그 id 로 본문을 쓴다**)」. 재료는 이미 있다 — 같은 단계의
// `release.scope` 지문이 그 사실을 문장으로 적어 두었다. 그것을 그 인물의
// 말로 옮겨 적고, 그 진술을 `hidden_until` 로 그 단계에 잠근다.
//
// **판정은 검사기 것을 그대로 쓴다** — `STAGE_RELEASE_NO_BODY` 를 내는
// `stageReleasesWithoutBody()` 를 불러온다. 여기서 같은 규칙을 다시 짜면
// 계수와 검사가 갈린다(그 사고를 네 번 냈다).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const out = mkdtempSync(join(tmpdir(), 'stage-release-'));
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
const { stageReleasesWithoutBody } = await import(join(out, 'scripts/validate_master.js'));

const DIR = 'data/pending-cases';
const only = process.argv[2];
const rows = [];

for (const dir of readdirSync(DIR).sort()) {
  const file = join(DIR, dir, `${dir}.master.json`);
  if (!existsSync(file)) continue;
  if (only && dir !== only) continue;
  const missing = stageReleasesWithoutBody(JSON.parse(readFileSync(file, 'utf8')));
  if (missing.length) rows.push({ id: dir, missing });
}

const total = rows.reduce((sum, row) => sum + row.missing.length, 0);
const kinds = rows.flatMap((r) => r.missing).reduce((acc, m) => {
  acc[m.id.startsWith('F-') ? 'F-' : 'S-'] = (acc[m.id.startsWith('F-') ? 'F-' : 'S-'] ?? 0) + 1;
  return acc;
}, {});
console.log(`본문 없는 release id ${total}곳 · 사건 ${rows.length}건  (S- ${kinds['S-'] ?? 0} · F- ${kinds['F-'] ?? 0})\n`);

for (const row of rows) {
  console.log(`${row.id}  ${row.missing.map((m) => `${m.stage}→${m.id}`).join(' · ')}`);
  if (!only) continue;
  for (const m of row.missing) {
    console.log(`\n  ${m.stage} 가 ${m.target} 에게 내주는 ${m.id} — 본문이 없다.`);
    console.log(`  재료(release.scope): ${m.scope}`);
  }
}
if (!total) console.log('없다 — 이 축은 비었다.');
