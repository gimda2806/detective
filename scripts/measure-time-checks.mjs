// 마스터 본문의 시각을 `actual_timeline` 스탬프에 **붙여 보는**(clock join) 실측기.
//
//   npm run measure:times
//
// **두 검사가 같은 기계다.** 백로그의 「어제/오늘」(`0n4a8r`)과 「12/24시간제
// 혼용」(`shouwq`)은 따로 적혀 있었지만, 둘 다 「본문의 이 시각이 타임라인의
// 어느 항목인가」를 먼저 풀어야 답이 나온다. 붙이고 나면 항목의 **날짜**를 보면
// A, 항목의 **시(hour)**를 보면 B다. 그래서 한 번에 잰다.
//
// **한 줄 규칙이 왜 안 되는지가 여기 다 있다**(2026-09-26 실측, 코퍼스 318건).
// 아래 여덟은 전부 실제로 오탐을 만들었고, 하나씩 막아 189곳 → 3곳이 됐다.
// 검사로 옮길 때 이 여덟을 같이 옮기지 않으면 오탐이 그대로 돌아온다.
//
//   1. 「06시」·「06:05」는 이미 24시간제다. 앞의 0을 안 보면 12시간제로 읽힌다.
//   2. 「낮 12시부터 1시 10분까지」의 1시는 낮이 지배한다 — 때 표시는 **뒤에 오는
//      시각까지** 이어진다(범위 상속).
//   3. 그 상속은 **다음 시각에서 끊긴다.** 「어제 6시 반에 퇴근했고 아침 7시
//      50분에 왔어요」의 7시 50분은 어제가 아니다.
//   4. 「사건 당일」과 「어제」는 **자가 다르다.** 앞은 사건 기준이라 스탬프와 같은
//      자이고, 뒤는 말하는 사람의 오늘 기준이라 진입일이 기준이다. 섞어 재면
//      멀쩡한 마스터가 전부 어긋난 것으로 나온다(이것 하나가 오탐 151곳이었다).
//   5. 「그날」은 안 센다. 「지금 얘기하는 그 날」이라 사건 당일이라는 보장이 없다
//      (7곳이 전부 멀쩡한 산문이었다).
//   6. 시각이 같다고 같은 사건이 아니다 — 본문과 타임라인 항목이 같은 고유명을
//      하나는 공유할 때만 붙인다(10곳 → 4곳).
//   7. **「사건」이 앞에 붙은 날짜말만 사건 기준이다.** 맨 「전날」·「다음 날」은
//      앞 문장이나 탐정이 보는 오늘을 기준으로 삼는다(4곳 → 1곳).
//   8. **진입일은 `detective_entry_time` 이 적는다.** 타임라인 마지막 날로
//      유추하면 발견 뒤 항목이 다음날까지 가는 사건에서 하루가 밀린다(5곳 → 2곳).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// `app/` 의 확장자 없는 import 때문에 node 로 바로 못 돌린다 — check-case.mjs 와 같은 절차다.
const out = mkdtempSync(join(tmpdir(), 'time-checks-'));
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
// 스탬프 해석은 검사기 것을 그대로 쓴다 — 여기서 새로 짜면 검사와 실측이 갈린다.
const { parseTimelineStamp } = await import(join(out, 'scripts/validate_master.js'));

// 플레이어가 읽지 않는 칸. audit-duplication.mjs 의 GM_ONLY 와 같은 목록에,
// 스탬프 자체인 두 칸(본문이 아니라 날짜 표기다)을 더한 것이다.
const NOT_PLAYER_TEXT = new Set([
  'red_herrings[].must_not_imply', 'evidence[].does_not_prove[]',
  'actual_timeline[].world_fact', 'actual_timeline[].actual_action',
  'characters[].knowledge_limits[]', 'contradiction_stages[].must_not_release[]',
  'case_complete.accusation_requirements.method_fact',
  'case_complete.accusation_requirements.motive_fact',
  'final_deduction.method', 'final_deduction.motive', 'final_deduction.key_connection',
  'case_identity.setting', 'case_identity.tone', 'case_identity.genre',
  'case_identity.detective_entry', 'full_truth.method', 'full_truth.motive',
  'full_truth.cover_up', 'full_truth.key_time_location',
  'characters[].initial_claims[].reason_for_limit_or_lie',
  'actual_timeline[].time', 'opening_scene.detective_entry_time',
]);

const walk = (node, path, hit) => {
  if (typeof node === 'string') return hit(path, node);
  if (Array.isArray(node)) { for (const v of node) walk(v, path + '[]', hit); return; }
  if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, hit);
};

const DIR = 'data/pending-cases';
const cases = [];
for (const d of readdirSync(DIR).sort()) {
  const f = join(DIR, d, `${d}.master.json`);
  if (existsSync(f)) cases.push({ id: d, master: JSON.parse(readFileSync(f, 'utf8')) });
}

const timelineOf = (master) => {
  const rows = [];
  for (const item of master.actual_timeline ?? []) {
    const value = parseTimelineStamp(String(item.time ?? ''));
    if (value === null) continue;
    const mins = ((value % 1440) + 1440) % 1440;
    rows.push({
      day: Math.floor(value / 1440), hour: Math.floor(mins / 60), min: mins % 60,
      raw: String(item.time),
      body: `${item.world_fact ?? ''} ${item.actual_action ?? ''}`,
    });
  }
  return rows;
};

/**
 * 6번(2026-09-26 실측). **시각이 같다고 같은 사건이 아니다.** CASE055 의 카드
 * 「사건 전날 21시경 국다온의 예약」이 타임라인 「사건 당일, 21시경 선다혜가
 * 확인한다」에 붙어 날짜가 어긋난 것으로 나왔는데, 둘은 서로 다른 일이다.
 * 그래서 **본문과 타임라인 항목이 같은 고유명(인물·장소)을 하나는 공유할 때만**
 * 같은 사건으로 본다. 이 관문이 A-1 의 오탐 넷을 걷어낸다.
 */
const namesOf = (master) => [
  ...(master.characters ?? []).map((c) => c.name),
  ...(master.key_figures ?? []).map((c) => c.name),
  ...(master.locations ?? []).map((l) => l.name),
].filter((n) => typeof n === 'string' && n.length >= 2);

const sameEvent = (names, text, entry) =>
  names.some((n) => text.includes(n) && entry.body.includes(n));

const MARKERS = /오전|오후|새벽|아침|낮|저녁|밤|정오|자정|점심/g;
// 사건 기준(스탬프와 같은 자). 「그날」은 위 5번, 맨 「전날」은 7번 때문에 없다.
const ABSOLUTE = [
  [/(?:사건|사고|범행)\s*당일/, 0],
  [/(?:사건|사고|범행)\s*(?:다음\s*날|다음날|이튿날)/, 1],
  [/(?:사건|사고|범행)\s*전날/, -1],
  [/D-day/i, 0], [/D-(\d+)/, 'neg'], [/(\d+)\s*일\s*전/, 'neg'],
];
// 말하는 사람의 오늘 기준.
const RELATIVE = [[/그저께|그제/, -2], [/어젯밤|어제/, -1], [/오늘/, 0], [/내일/, 1], [/모레/, 2]];

const sentenceStart = (text, idx) => {
  let cut = -1;
  for (const mark of ['.', '。', '?', '!', '"']) cut = Math.max(cut, text.lastIndexOf(mark, idx - 1));
  return cut < 0 ? 0 : cut + 1;
};
const pick = (head, table, scale) => {
  let best = null, bestAt = -1;
  for (const [re, off] of table)
    for (const m of head.matchAll(new RegExp(re.source, 'g'))) {
      if (m.index <= bestAt) continue;
      bestAt = m.index;
      best = { word: m[0].trim(), off: off === 'neg' ? -Number(m[1]) : off, scale, at: m.index };
    }
  return best;
};

const TIME_RE =
  /(?<![\d:])(\d{1,2})\s*:\s*(\d{2})|(?<![\d:])(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?(?!간|계|각|점|험|장|내|외|절)/g;

const hits = { b: [], absDay: [], relDay: [] };
const joins = { unique: 0, many: 0, none: 0 };

for (const { id, master } of cases) {
  const timeline = timelineOf(master);
  if (!timeline.length) continue;
  // 8번: 진입일은 유추하지 않는다 — 마스터에 적혀 있다.
  const entryStamp = parseTimelineStamp(String(master.opening_scene?.detective_entry_time ?? ''));
  if (entryStamp === null) continue;
  const entryDay = Math.floor(entryStamp / 1440);
  const names = namesOf(master);
  walk(master, '', (path, text) => {
    if (NOT_PLAYER_TEXT.has(path)) return;
    let prevEnd = 0; // 3번: 때 표시·날짜말은 바로 앞 시각에서 끊긴다
    for (const m of text.matchAll(TIME_RE)) {
      const colon = m[1] !== undefined;
      const rawHour = colon ? m[1] : m[3];
      const hour = Number(rawHour);
      const min = colon ? Number(m[2]) : m[5] ? 30 : Number(m[4] ?? 0);
      if (hour > 23) continue;
      const padded = colon || /^0\d$/.test(rawHour); // 1번: 「06시」는 이미 24시간제
      // 3번의 끊김에는 예외가 하나 있다: 「새벽, 2시에서 3시 사이」처럼 앞 시각과
      // 범위 연결어로만 이어져 있으면 때 표시가 그대로 넘어온다.
      const gap = text.slice(prevEnd, m.index);
      const ranged = prevEnd > 0 && /^[\s,~\-–—]*(?:에서|부터|)[\s,~\-–—]*$/.test(gap);
      const head = text.slice(Math.max(sentenceStart(text, m.index), ranged ? 0 : prevEnd), m.index);
      const markerAll = [...head.matchAll(MARKERS)];
      const marker = markerAll.length ? markerAll[markerAll.length - 1][0] : null; // 2번
      const absWord = pick(head, ABSOLUTE, 'abs');
      const relWord = pick(head, RELATIVE, 'rel');
      const dayWord = absWord && relWord ? (absWord.at > relWord.at ? absWord : relWord) : (absWord ?? relWord);
      prevEnd = m.index + m[0].length;
      const snippet = text.slice(Math.max(0, m.index - 30), m.index + 26).replace(/\s+/g, ' ');

      // ── B. 맨 「N시」(1~11)인데 타임라인에는 그 시각이 오후로만 있다
      if (!colon && !padded && !marker && hour >= 1 && hour <= 11) {
        const am = timeline.filter((r) => r.hour === hour && r.min === min);
        const pm = timeline.filter((r) => r.hour === hour + 12 && r.min === min);
        if (pm.length) hits.b.push({ id, path, hour, min, snippet, both: am.length > 0, stamp: pm[0].raw });
      }

      // ── A. 날짜말이 붙은 시각을 타임라인에 붙여 날짜를 견준다
      if (!dayWord) continue;
      const amMarked = marker && /새벽|아침|오전|낮|정오/.test(marker);
      const widen = !colon && !padded && !amMarked && dayWord.scale === 'abs';
      const cand = timeline.filter((r) => r.min === min && (r.hour === hour || (widen && r.hour === hour + 12)));
      if (cand.length === 0) { joins.none++; continue; }
      if (cand.length > 1) { joins.many++; continue; }
      if (!sameEvent(names, text, cand[0])) { joins.none++; continue; }
      joins.unique++;
      const said = dayWord.scale === 'abs' ? dayWord.off : entryDay + dayWord.off;
      if (said === cand[0].day) continue;
      const row = { id, path, word: dayWord.word, said, stampDay: cand[0].day, entryDay, stamp: cand[0].raw, snippet };
      if (dayWord.scale === 'abs') hits.absDay.push(row);
      // 상대 표기는 「오늘」만, 진입이 사건 다음날 이후일 때만 본다 — 나머지는
      // 인용된 메모·일정표처럼 기준일이 글 안에 따로 있어 오탐이 된다.
      else if (dayWord.off === 0 && entryDay >= 1 && cand[0].day === 0) hits.relDay.push(row);
    }
  });
}

const cnt = (rows) => `${rows.length}곳 · 사건 ${new Set(rows.map((r) => r.id)).size}`;
console.log(`\n코퍼스 ${cases.length}건 · 본문 시각을 타임라인에 붙인 결과`);
console.log(`  하나로 붙는다 ${joins.unique} · 여러 항목 ${joins.many} · 타임라인에 없다 ${joins.none}\n`);
console.log(`══ B. 맨 「N시」인데 타임라인은 오후 — ${cnt(hits.b)} ══`);
for (const r of hits.b) console.log(`  ${r.id} ${r.path} [${r.hour}시${r.min ? ' ' + r.min + '분' : ''}] ← ${r.stamp}${r.both ? '  (오전 항목도 있다)' : ''}  …${r.snippet}…`);
console.log(`\n══ A-1. 사건 기준 날짜말이 스탬프와 다르다 — ${cnt(hits.absDay)} ══`);
for (const r of hits.absDay) console.log(`  ${r.id} ${r.path} 「${r.word}」=D${r.said} vs D${r.stampDay}(${r.stamp})  …${r.snippet}…`);
console.log(`\n══ A-2. 「오늘」인데 사건은 어제다(진입이 다음날) — ${cnt(hits.relDay)} ══`);
for (const r of hits.relDay) console.log(`  ${r.id} ${r.path} 진입D${r.entryDay}  D0(${r.stamp})  …${r.snippet}…`);
