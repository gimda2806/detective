// 코퍼스 전체에서 **문장이 그대로 겹치는 자리**를 센다.
//
// 과용 검사(수법·동기·무대·배경)는 「무엇을 쓰는가」를 비율로 본다. 이 검사는
// 「어떻게 쓰는가」를 본다 — 같은 계열을 써도 문장이 다르면 플레이어는 다른
// 사건으로 읽지만, 계열이 달라도 **문장이 같으면 같은 사건으로 읽힌다.**
//
// ## 왜 필드 목록을 들고 있지 않은가 (2026-09 사용자 결정)
//
// 처음에는 볼 필드 **여섯 개를 적어 둔 허용 목록**이었다. 그 구조가 조용히
// 실패한다 — **목록에 없는 칸은 안 세어지고, 안 세어진다는 사실 자체가 안
// 보인다.** 스키마에 필드가 늘어도 목록은 그대로라 새 칸은 태어나는 순간부터
// 사각지대다. 실제로 그렇게 쌓였다(2026-09 실측):
//
//   characters[].pressure_responses[]        21.6%  「저도 그때 얼마나 놀랐는지 몰라요.」 41건
//   characters[].voice_profile.*             17~20%
//   locations[].access                       26.1%  「열쇠 또는 담당자 동행이 필요한 통제구역」 52건
//   surface_incident[]                       10.0%  「외부인의 침입 흔적은 확인되지 않았다.」 65건
//
// 마지막 것이 **코퍼스 전체 최다 중복**인데, 여섯 칸 목록에 없어서 아무도
// 몰랐다(그전까지 「최다」로 알려져 있던 것은 47건짜리였다).
//
// 그래서 **기본값을 뒤집었다.** 마스터의 모든 문자열을 세고, 안 셀 것만
// 아래에 이유와 함께 적는다. 새 필드는 생기는 날부터 세어진다.
//
// ## enum·id·상태 키는 왜 목록에 없나
//
// 따로 뺄 필요가 없다 — **한글 10자 필터가 그 일을 한다.** `admits_dispute`·
// `staging_cover_up`·`E07`·`CH02` 같은 값은 한글이 0자라 애초에 안 걸린다.
// 「겹치라고 만든 값」을 손으로 나열하다 빠뜨리는 길을 아예 없앤 것이다.
// 단계 이름이 겹치는 것은 이 검사가 아니라 `NEIGHBOR_TWIN`이 볼 축이다.
//
// 인물·장소 이름과 숫자를 지운 «뼈대»로 견준다 — 이름만 바꾼 같은 문장을 잡으려는
// 것이다. **무엇을 안 지우면 그만큼이 통째로 안 보인다** — 피해자(`key_figures`)와
// 장소·상호가 각각 그렇게 새고 있었다. `npm run audit:duplication`.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/pending-cases';
const MIN_CASES = 3; // 몇 건 이상에서 같으면 셀 것인가
const MIN_LEN = 14; // 이보다 짧은 문장은 상투어라 세지 않는다
const MIN_HANGUL = 10; // 한글이 이보다 적으면 enum·id·상태 키다 (위 주석)
const MIN_SAMPLE = 150; // 이보다 표본이 적은 칸은 비율이 흔들려 순위에 안 낸다
const MIN_TAIL_TOKENS = 4; // 뒷부분 무리: 꼬리가 이보다 짧으면 칸의 문법이지 문장이 아니다
const TAIL_RATIO = 0.5; // 뒷부분 무리: 꼬리가 문장 토큰의 이 비율 이상이어야 「같은 문장」이다

// 세지 않는 칸. **비어 있는 것이 기본이 아니다** — 여기 적는 것은 「겹쳐도
// 플레이어에게 닿지 않는다」가 증명된 칸뿐이고, 이유를 같이 적는다.
const EXCLUDE = new Map([
  [
    'characters[].initial_claims[].reason_for_limit_or_lie',
    '런타임이 파싱하지 않는다 — 변환기도 master-index도 읽지 않아 아무에게도 안 보인다',
  ],
]);

// 플레이어가 읽지 않고 GM·작성자만 보는 칸. 세기는 세되 따로 낸다 —
// 같은 20%라도 화면에 나오는 문장과 지시문은 무게가 다르다.
const GM_ONLY = new Set([
  'red_herrings[].must_not_imply',
  'evidence[].does_not_prove[]',
  'actual_timeline[].world_fact',
  'actual_timeline[].actual_action',
  'characters[].knowledge_limits[]',
  'contradiction_stages[].must_not_release[]',
  'case_complete.accusation_requirements.method_fact',
  'case_complete.accusation_requirements.motive_fact',
  'final_deduction.method',
  'final_deduction.motive',
  'final_deduction.key_connection',
  // case_identity 의 이 넷과 full_truth 산문은 런타임이 한 번도 읽지 않는다
  // (CLAUDE.md 「build:source」 참고). 마스터를 쓰기 위한 재료다.
  'case_identity.setting',
  'case_identity.tone',
  'case_identity.genre',
  'case_identity.detective_entry',
  'full_truth.method',
  'full_truth.motive',
  'full_truth.cover_up',
  'full_truth.key_time_location',
]);

const cases = [];
for (const d of fs.readdirSync(DIR)) {
  const f = path.join(DIR, d, `${d}.master.json`);
  if (!fs.existsSync(f)) continue;
  cases.push({ id: d, m: JSON.parse(fs.readFileSync(f, 'utf8')) });
}

function skeleton(text, m) {
  let t = String(text);
  // 피해자(`key_figures`)도 같이 지운다 — 한동안 `characters` 만 지우고 있어서
  // **피해자 이름이 든 문장은 전부 서로 다른 문장으로 세어지고 있었다.**
  // 「어젯밤엔 ○와 딱 한 번, 잠깐 마주쳤을 뿐이에요」가 26건인데 0건으로 보이던
  // 것이 그 예다(2026-09, CASE093~097 회차에서 확인).
  for (const c of [...(m.characters ?? []), ...(m.key_figures ?? [])]) {
    if (c.name && c.name.length >= 2) t = t.split(c.name).join('○');
  }
  // **장소 이름과 상호도 지운다**(2026-09). 사람 이름만 지우던 것과 같은 구멍이다 —
  // 무대 이름만 바꾼 같은 문장이 전부 서로 다른 문장으로 세어지고 있었다.
  // 「□에서 정확히 무슨 일이 있었는지는 전혀 모른다」가 42건인데 각각 1건으로
  // 흩어져 있어 임계(3건) 아래에 통째로 숨어 있었다. 이 한 줄로 735 → 808종.
  // 긴 이름부터 지운다 — 「제2 건조실」이 「건조실」보다 먼저 걸려야 한다.
  for (const l of [...(m.locations ?? [])].sort(
    (a, b) => (b.name?.length ?? 0) - (a.name?.length ?? 0),
  )) {
    if (l.name && l.name.length >= 2) t = t.split(l.name).join('□');
  }
  // 상호는 `setting` 안에 따옴표로 묶여 있다('웨이브베이'). 고유명사라 안전하다.
  for (const q of (m.case_identity?.setting ?? '').matchAll(/'([^']{2,12})'/g)) {
    t = t.split(q[1]).join('□');
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

// 마스터를 통째로 훑어 «경로 → 문자열» 로 편다. 배열 첨자는 `[]` 로 뭉개고,
// `relationships[].says.CH01` 처럼 인물 id 가 경로에 끼는 자리는 `.<CH>` 로
// 모은다 — 안 그러면 한 칸이 다섯으로 갈려 비율이 전부 낮아 보인다.
function walk(node, p, out) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const v of node) walk(v, `${p}[]`, out);
  } else if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const key = /^CH\d+$/.test(k) ? '<CH>' : k;
      walk(v, p ? `${p}.${key}` : key, out);
    }
  } else if (typeof node === 'string') {
    (out[p] ??= []).push(node);
  }
}

const byPath = new Map(); // path -> Map(skeleton -> Set(caseId))
const totals = new Map(); // path -> 센 문장 수
const all = new Map(); // skeleton -> Set(caseId)  (사건별 비율에 쓴다)
const perCase = new Map(cases.map((c) => [c.id, { dup: 0, tot: 0, worst: 0 }]));
const seen = []; // [caseId, path, skeleton]

for (const c of cases) {
  const out = {};
  walk(c.m, '', out);
  for (const [p, texts] of Object.entries(out)) {
    if (EXCLUDE.has(p)) continue;
    for (const txt of texts) {
      for (const s of sentences(txt)) {
        const k = skeleton(s, c.m);
        if (k.replace(/[^가-힣]/g, '').length < MIN_HANGUL) continue;
        if (!byPath.has(p)) byPath.set(p, new Map());
        const bag = byPath.get(p);
        if (!bag.has(k)) bag.set(k, new Set());
        bag.get(k).add(c.id);
        totals.set(p, (totals.get(p) ?? 0) + 1);
        if (!all.has(k)) all.set(k, new Set());
        all.get(k).add(c.id);
        seen.push([c.id, p, k]);
      }
    }
  }
}

for (const [cid, , k] of seen) {
  const p = perCase.get(cid);
  p.tot += 1;
  const n = all.get(k)?.size ?? 1;
  if (n >= MIN_CASES) {
    p.dup += 1;
    p.worst = Math.max(p.worst, n);
  }
}

const rows = [];
for (const [p, bag] of byPath) {
  const tot = totals.get(p) ?? 0;
  if (tot < MIN_SAMPLE) continue;
  const hits = [...bag.entries()]
    .filter(([, v]) => v.size >= MIN_CASES)
    .sort((a, b) => b[1].size - a[1].size);
  const dup = hits.reduce((a, [, v]) => a + v.size, 0);
  rows.push({ p, tot, dup, r: dup / tot, kinds: hits.length, hits });
}
rows.sort((a, b) => b.r - a.r);

function table(title, list) {
  console.log(`\n══ ${title} ══`);
  if (!list.length) {
    console.log('  (없음)');
    return;
  }
  for (const x of list) {
    console.log(
      `\n  ${String(Math.round(x.r * 100)).padStart(3)}%  ${String(x.dup).padStart(4)}/${String(x.tot).padEnd(5)} ${String(x.kinds).padStart(3)}종   ${x.p}`,
    );
    for (const [k, v] of x.hits.slice(0, 3)) {
      console.log(`         [${String(v.size).padStart(3)}건] ${k.slice(0, 76)}`);
    }
  }
}

table(
  '플레이어가 읽는 문장',
  rows.filter((x) => !GM_ONLY.has(x.p)),
);
table(
  'GM·작성자만 보는 문장 (겹쳐도 화면에는 안 나온다)',
  rows.filter((x) => GM_ONLY.has(x.p)),
);

// ── 한 낱말만 다른 무리 ───────────────────────────────────────────────
// 정확 일치만 세면 **한 글자 차이가 통째로 숨는다.** 「□에서 정확히 무슨 일이
// 있었는지는 전혀 모른다」가 42건인데 무대 이름 때문에 42개의 1건으로 흩어져
// 있던 것이 그 예이고(그건 위에서 □로 지워 잡았다), 지워지지 않는 낱말로
// 갈리는 것이 아직 505무리 남아 있다 — 「○으로부터 **등급/성분검사/인증서류**
// 조작 의혹을 들었다」처럼.
//
// **정확 일치 수에 합치지 않고 따로 낸다.** 고치는 방식이 다르기 때문이다 —
// 정확 일치는 그 한 문장을 다시 쓰면 되지만, 이 무리는 **틀 자체가 반복**이라
// 문장을 갈아 봐야 같은 틀이 남는다.
//
// 토큰 넷 미만은 안 본다(한 토큰이 뜻의 절반이라 아무거나 붙는다). 연쇄로
// 묶이지만 실제로 엉뚱한 것이 붙지는 않았다 — 가장 큰 무리가
// 「말끝에 ○○를 자주 붙인다」 53종인데, 그건 오류가 아니라 **한 틀로 쉰셋을
// 찍어낸 진짜 반복**이다. 이 값은 첫 대면에 주어만 붙여 그대로 화면에 나간다.
const near = new Map(); // skeleton -> 대표
const nsig = new Map();
for (const k of all.keys()) {
  const tk = k.split(' ');
  if (tk.length < 4) continue;
  near.set(k, k);
  for (let i = 0; i < tk.length; i += 1) {
    const key = `${tk.length}\u0000${i}\u0000${tk.slice(0, i).join(' ')}\u0000${tk.slice(i + 1).join(' ')}`;
    if (!nsig.has(key)) nsig.set(key, []);
    nsig.get(key).push(k);
  }
}
const findRoot = (x) => {
  let r = x;
  while (near.get(r) !== r) r = near.get(r);
  let c = x;
  while (near.get(c) !== c) {
    const nx = near.get(c);
    near.set(c, r);
    c = nx;
  }
  return r;
};
for (const v of nsig.values()) {
  if (v.length < 2) continue;
  for (const x of v.slice(1)) {
    const a = findRoot(v[0]);
    const b = findRoot(x);
    if (a !== b) near.set(a, b);
  }
}
const nGroup = new Map();
for (const k of near.keys()) {
  const r = findRoot(k);
  if (!nGroup.has(r)) nGroup.set(r, { cases: new Set(), members: [] });
  const g = nGroup.get(r);
  for (const c of all.get(k)) g.cases.add(c);
  g.members.push(k);
}
const nHits = [...nGroup.values()]
  .filter((g) => g.members.length > 1 && g.cases.size >= MIN_CASES)
  .sort((a, b) => b.cases.size - a.cases.size);
// 지금 화면에 한 줄도 안 뜨는 무리 — 멤버가 전부 임계 미만인 것
const invisible = nHits.filter(
  (g) => Math.max(...g.members.map((k) => all.get(k).size)) < MIN_CASES,
);
console.log(
  `\n══ 한 낱말만 다른 무리 — ${nHits.length}개 (그중 ${invisible.length}개는 멤버가 전부 ${MIN_CASES}건 미만이라 위 목록에 한 줄도 안 뜬다) ══`,
);
for (const g of invisible.slice(0, 12)) {
  console.log(`\n  합쳐서 ${g.cases.size}건 · ${g.members.length}종`);
  for (const k of g.members
    .slice()
    .sort((a, b) => all.get(b).size - all.get(a).size)
    .slice(0, 3)) {
    console.log(`      [${String(all.get(k).size).padStart(2)}건] ${k.slice(0, 72)}`);
  }
}

// ── 뒷부분만 같은 무리 ───────────────────────────────────────────────
// 위 두 검사는 **문장 전체**로 견준다(정확 일치, 한 토큰 차이). 그래서 **앞머리
// 명사구만 갈아 끼운 같은 문장**이 통째로 숨는다 — 「값어치가, 사람 목숨보다 컸나
// 보죠」는 앞머리가 다르면 뼈대가 갈리고, 「부품 로트번호 불일치를 / 수산물
// 원산지 조작 의혹을 ○이 사망 전날 이미 확인했다는 사실」은 앞머리가 두 토큰
// 이상이라 한 낱말 무리에도 안 든다(2026-09, 041~045 소설화 회차 지적).
// 한국어는 서술어가 뒤에 오므로 **문장의 얼굴은 뒷부분**이다 — 그래서 꼬리를 센다.
//
// 세 가지 관문이 잡음을 거른다. 셋 다 실측으로 정했다:
// - **꼬리가 문장 토큰의 절반 이상**(`TAIL_RATIO`). 이게 핵심이다 — 「…사실을
//   증명한다」·「…것을 먼저 꺼내지 않는다」는 `proves`·`private_strain` 칸의
//   문법이지 같은 문장이 아닌데, 관문 없이 세면 그런 3~4토큰 꼬리가 71건·51건으로
//   맨 위를 차지해 진짜 복제가 안 보인다(관문 없이 2,247무리 → 0.5에서 564무리).
// - **꼬리 네 토큰 이상**(`MIN_TAIL_TOKENS`)과 한글 열 자(`MIN_HANGUL`).
// - **한 문장은 자기의 가장 긴 꼬리 하나에만 든다.** 안 그러면 「…병원으로
//   옮겨졌으나 사망이 확인됐다」가 4·5·6토큰 꼬리로 82·73·72건씩 세 번 뜬다.
//
// 한 낱말 무리와 같은 이유로 **정확 일치 수에 합치지 않고 따로 낸다** — 고치는
// 단위가 문장이 아니라 틀이다. 두 무리는 겹칠 수 있다(한 낱말이 다른데 그것이
// 앞머리면 양쪽에 다 든다). 그건 오류가 아니라 같은 반복을 두 각도에서 본 것이다.
const pathsOf = new Map(); // skeleton -> Set(path)
for (const [, p, k] of seen) {
  if (!pathsOf.has(k)) pathsOf.set(k, new Set());
  pathsOf.get(k).add(p);
}
const hangulLen = (s) => s.replace(/[^가-힣]/g, '').length;
const tailCases = new Map(); // 꼬리 -> Set(caseId)  (몇 건이 그 꼬리를 쓰는가)
for (const [k, cs] of all) {
  const tk = k.split(' ');
  const lo = Math.max(MIN_TAIL_TOKENS, Math.ceil(tk.length * TAIL_RATIO));
  for (let n = lo; n < tk.length; n += 1) {
    const t = tk.slice(tk.length - n).join(' ');
    if (hangulLen(t) < MIN_HANGUL) continue;
    if (!tailCases.has(t)) tailCases.set(t, new Set());
    for (const c of cs) tailCases.get(t).add(c);
  }
}
const tGroup = new Map(); // 꼬리 -> { n, cases, members }
for (const [k, cs] of all) {
  const tk = k.split(' ');
  const lo = Math.max(MIN_TAIL_TOKENS, Math.ceil(tk.length * TAIL_RATIO));
  for (let n = tk.length - 1; n >= lo; n -= 1) {
    const t = tk.slice(tk.length - n).join(' ');
    const shared = tailCases.get(t);
    if (!shared || shared.size < MIN_CASES) continue;
    if (!tGroup.has(t)) tGroup.set(t, { n, cases: new Set(), members: [] });
    const g = tGroup.get(t);
    for (const c of cs) g.cases.add(c);
    g.members.push(k);
    break; // 가장 긴 꼬리 하나에만
  }
}
const isPlayerFacing = (g) =>
  g.members.some((k) => [...pathsOf.get(k)].some((p) => !GM_ONLY.has(p)));
const tHits = [...tGroup.entries()]
  .filter(([, g]) => g.cases.size >= MIN_CASES && g.members.length > 1)
  .sort((a, b) => b[1].cases.size - a[1].cases.size);
const tInvisibleAll = tHits.filter(
  ([, g]) => Math.max(...g.members.map((k) => all.get(k).size)) < MIN_CASES,
);
const tInvisible = tInvisibleAll.filter(([, g]) => isPlayerFacing(g));
console.log(
  `\n══ 뒷부분만 같은 무리 — ${tHits.length}개 (그중 ${tInvisibleAll.length}개는 멤버가 전부 ${MIN_CASES}건 미만이라 위 목록에 한 줄도 안 뜨고, 그 가운데 플레이어가 읽는 문장이 ${tInvisible.length}개) ══`,
);
for (const [t, g] of tInvisible.slice(0, 12)) {
  const where = [...new Set(g.members.flatMap((k) => [...pathsOf.get(k)]))]
    .filter((p) => !GM_ONLY.has(p))
    .slice(0, 2)
    .join(', ');
  console.log(`\n  합쳐서 ${g.cases.size}건 · ${g.members.length}종 · 꼬리 ${g.n}토큰  «…${t.slice(0, 60)}»   ${where}`);
  for (const k of g.members
    .slice()
    .sort((a, b) => all.get(b).size - all.get(a).size)
    .slice(0, 3)) {
    console.log(`      [${String(all.get(k).size).padStart(2)}건] ${k.slice(0, 72)}`);
  }
}

if (EXCLUDE.size) {
  console.log('\n══ 세지 않은 칸과 그 이유 ══');
  for (const [p, why] of EXCLUDE) console.log(`  ${p}\n      ${why}`);
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

const grand = [...all.values()].filter((v) => v.size >= MIN_CASES).length;
console.log(
  `\n총 ${cases.length}건 / 겹치는 문장 ${grand}종 / 센 칸 ${rows.length}개 (표본 ${MIN_SAMPLE}개 이상)`,
);
