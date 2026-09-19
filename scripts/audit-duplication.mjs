// 코퍼스 전체에서 **문장이 그대로 겹치는 자리**를 센다.
//
// 과용 검사(수법·동기·무대·배경)는 「무엇을 쓰는가」를 비율로 본다. 이 검사는
// 「어떻게 쓰는가」를 본다 — 같은 계열을 써도 문장이 다르면 플레이어는 다른
// 사건으로 읽지만, 계열이 달라도 **문장이 같으면 같은 사건으로 읽힌다.**
//
// 실제로 그런 자리가 있었다(2026-09 실측): 엔딩의 「한지우가 어깨를 으쓱했다」
// 39건, 첫마디의 「기록을 점검하다 이상한 부분을 발견해서 캡처만 남겨뒀어요」
// 31건, 증거 카드의 「각자 드나든 시각이 남은 출입 기록이 확인된다」 47건.
// 어느 과용 검사에도 안 걸리는데, 연달아 플레이하면 이것이 가장 먼저 눈에 띈다.
//
// 인물 이름과 숫자를 지운 «뼈대»로 견준다 — 이름만 바꾼 같은 문장을 잡으려는
// 것이다. `npm run audit:duplication`.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/pending-cases';
const MIN_CASES = 3; // 몇 건 이상에서 같으면 셀 것인가
const MIN_LEN = 14; // 이보다 짧은 문장은 상투어라 세지 않는다

const cases = [];
for (const d of fs.readdirSync(DIR)) {
  const f = path.join(DIR, d, `${d}.master.json`);
  if (!fs.existsSync(f)) continue;
  cases.push({ id: d, m: JSON.parse(fs.readFileSync(f, 'utf8')) });
}

function skeleton(text, m) {
  let t = String(text);
  for (const c of m.characters ?? []) {
    if (c.name && c.name.length >= 2) t = t.split(c.name).join('○');
  }
  return t
    .replace(/[가-힣]{2,4}(씨|님)/g, '○$1')
    .replace(/\d+/g, '#')
    .replace(/[「」'"'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const sentences = (text) =>
  String(text)
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_LEN);

const FIELDS = [
  ['엔딩 서술', (c) => [c.m.ending_scene?.narrative]],
  ['오프닝 서술', (c) => [c.m.opening_scene?.narrative]],
  [
    '첫마디 initial_claims',
    (c) =>
      (c.m.characters ?? []).flatMap((x) =>
        (x.initial_claims ?? []).map((y) =>
          typeof y === 'string' ? y : y.content,
        ),
      ),
  ],
  [
    '장소 관찰 결과',
    (c) =>
      (c.m.locations ?? []).flatMap((l) =>
        (l.observation_rules ?? []).map((o) => o.result),
      ),
  ],
  ['증거 카드 content', (c) => (c.m.evidence ?? []).map((e) => e.content)],
  ['레드헤링 표면 의심', (c) => (c.m.red_herrings ?? []).map((r) => r.surface_suspicion)],
];

const all = new Map();
const perCase = new Map(cases.map((c) => [c.id, { dup: 0, tot: 0, worst: 0 }]));

function collect(label, get, record) {
  const bag = new Map();
  for (const c of cases) {
    for (const txt of get(c).filter(Boolean)) {
      for (const s of sentences(txt)) {
        const k = skeleton(s, c.m);
        if (k.replace(/[^가-힣]/g, '').length < 10) continue;
        if (!bag.has(k)) bag.set(k, new Set());
        bag.get(k).add(c.id);
        if (record) {
          if (!all.has(k)) all.set(k, new Set());
          all.get(k).add(c.id);
        }
      }
    }
  }
  return bag;
}

let grand = 0;
for (const [label, get] of FIELDS) {
  const bag = collect(label, get, true);
  const hits = [...bag.entries()]
    .filter(([, v]) => v.size >= MIN_CASES)
    .sort((a, b) => b[1].size - a[1].size);
  grand += hits.length;
  console.log(
    `\n══ ${String(label)} — ${MIN_CASES}건 이상에서 같은 문장: ${hits.length}종 ══`,
  );
  for (const [k, v] of hits.slice(0, 10)) {
    console.log(`  [${String(v.size).padStart(3)}건] ${k.slice(0, 84)}`);
    console.log(
      `          ${[...v].slice(0, 8).join(' ')}${v.size > 8 ? ' …' : ''}`,
    );
  }
}

for (const [, get] of FIELDS) {
  for (const c of cases) {
    for (const txt of get(c).filter(Boolean)) {
      for (const s of sentences(txt)) {
        const k = skeleton(s, c.m);
        if (k.replace(/[^가-힣]/g, '').length < 10) continue;
        const p = perCase.get(c.id);
        p.tot += 1;
        const n = all.get(k)?.size ?? 1;
        if (n >= MIN_CASES) {
          p.dup += 1;
          p.worst = Math.max(p.worst, n);
        }
      }
    }
  }
}

const rank = [...perCase.entries()]
  .map(([id, v]) => ({ id, ...v, r: v.tot ? v.dup / v.tot : 0 }))
  .filter((x) => x.tot >= 10)
  .sort((a, b) => b.r - a.r);

console.log('\n══ 사건별 겹치는 문장 비율 (상위 15) ══');
for (const x of rank.slice(0, 15)) {
  console.log(
    `  ${x.id}  ${String(x.dup).padStart(3)}/${String(x.tot).padEnd(3)} (${String(Math.round(x.r * 100)).padStart(3)}%)  최다 겹침 ${x.worst}건`,
  );
}

console.log('\n══ 번호 구간별 평균 ══');
const band = {};
for (const x of rank) {
  const b = Math.floor(Number(x.id.slice(4)) / 20) * 20;
  (band[b] ??= []).push(x.r);
}
for (const b of Object.keys(band)
  .map(Number)
  .sort((a, c) => a - c)) {
  const v = band[b];
  const avg = v.reduce((a, c) => a + c, 0) / v.length;
  console.log(
    `  CASE${String(b).padStart(3, '0')}~${String(b + 19).padStart(3, '0')}  ${String(Math.round(avg * 100)).padStart(3)}%  ${'█'.repeat(Math.round(avg * 40))} (${v.length}건)`,
  );
}

console.log('\n══ 제목 틀 ══');
const KEEP = /^(삼킨|감춘|남긴|지운|가린|멈춘|지킨|덮은|부른|잠근|놓친)$/;
const tb = {};
for (const c of cases) {
  const t = c.m.case_identity?.title ?? '';
  const k = t
    .split(/\s+/)
    .map((w) => {
      const mm = w.match(/^(.*?)(이|가|을|를|은|는|의|에서|에|와|과)$/);
      if (mm && mm[1].length >= 2) return `○${mm[2]}`;
      return KEEP.test(w) ? w : '○';
    })
    .join(' ');
  (tb[k] ??= []).push(c.m.case_identity?.title ?? '');
}
for (const [k, v] of Object.entries(tb)
  .sort((a, c) => c[1].length - a[1].length)
  .slice(0, 8)) {
  console.log(
    `  [${String(v.length).padStart(3)}건] ${k}   예: ${v.slice(0, 3).join(' / ')}`,
  );
}

console.log(`\n총 ${cases.length}건 / 겹치는 문장 ${grand}종`);
