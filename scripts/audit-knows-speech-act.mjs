// `knows[].content` 가 **말하는 행위**로 끝나는 자리를 센다.
//
//   npm run audit:knows-act            전체를 사건별로
//   npm run audit:knows-act CASE026    한 사건의 본문까지
//
// **무엇이 문제인가.** `knows[].content` 는 그 인물이 **아는 사실**을 적고
// 플레이어 수첩에 그대로 실리는 자리다. 거기에 「…라고 둘러댄다」처럼 **말하는
// 행위 자체**를 적으면, 엔진(`offline-engine.ts` 의 `reportedFact`)이 3인칭 사실을
// 「…다고 한다」로 옮기는 과정에서 **「…둘러댄다고 한다」**가 된다 — 「그가
// 둘러댄다고 그가 말한다」 꼴이다. 끝맺음만 보는 `checkOfflineSpeech` 의 두 판정은
// 「둘러댄다」가 「다」로 끝나므로 통과시킨다.
//
// **2026-09-27 에 두 쪽을 고쳤다** — 엔진은 이런 값을 감싸지 않고 그대로 내보내고
// (화면은 이제 정상이다), 검사기는 `OFFLINE_SPEECH_SHAPE` 로 **미등록 원본과
// 판본**에서 error 를 낸다(새 사건의 입구를 막는다). 등록된 옛 원본에는 안 돌아
// 이 목록이 남았다.
//
// **고치는 법.** 그 사람이 **무엇을 했고 무엇이 사실인지**로 적는다 —
// 「…뿐이라고 둘러댄다」 → 「…뿐이라고 했다」 · 「…계획적으로 저지른 일이라고
// 인정한다」 → 「…계획적으로 저지른 일이었다」. 말하는 행위를 적어 두는 자리는
// **같은 단계의 `release.scope`** 이고 그쪽은 그대로 둔다(작성자가 읽는 재료다).
// 진상은 바뀌지 않는다 — 같은 내용을 사실로 다시 적는 것뿐이다.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ACT = /(?:둘러댄다|인정한다|부인한다|시인한다|주장한다|털어놓는다|자백한다|변명한다|발뺌한다|얼버무린다)[.。]?$/;
const DIR = 'data/pending-cases';
const only = process.argv[2];
const rows = [];

for (const dir of readdirSync(DIR).sort()) {
  const file = join(DIR, dir, `${dir}.master.json`);
  if (!existsSync(file)) continue;
  if (only && dir !== only) continue;
  const master = JSON.parse(readFileSync(file, 'utf8'));
  const released = new Set(
    (master.contradiction_stages ?? []).map((s) => s.release?.claim_or_fact_id).filter(Boolean),
  );
  const hits = [];
  for (const ch of master.characters ?? []) {
    for (const fact of ch.knows ?? []) {
      const text = (fact.content ?? '').trim();
      if (!ACT.test(text)) continue;
      hits.push({ ch: ch.id, name: ch.name, id: fact.fact_id, text, staged: released.has(fact.fact_id) });
    }
  }
  if (hits.length) rows.push({ id: dir, hits });
}

const total = rows.reduce((n, r) => n + r.hits.length, 0);
const staged = rows.reduce((n, r) => n + r.hits.filter((h) => h.staged).length, 0);
console.log(
  `말하는 행위로 끝나는 knows ${total}곳 · 사건 ${rows.length}건 ` +
    `(그중 대립 단계가 내주는 것 ${staged}곳 — 단계를 깨는 턴에 그대로 화면에 나간다)\n`,
);
for (const row of rows) {
  const mark = row.hits.filter((h) => h.staged).length;
  console.log(`${row.id}  ${row.hits.length}곳${mark ? ` (단계 ${mark})` : ''}  ${row.hits.map((h) => h.id).join(' · ')}`);
  if (!only) continue;
  for (const h of row.hits) {
    console.log(`\n  ${h.ch} ${h.name ?? ''} ${h.id}${h.staged ? ' — 단계가 내준다' : ''}`);
    console.log(`  ${h.text}`);
  }
}
if (!total) console.log('없다 — 이 축은 비었다.');
