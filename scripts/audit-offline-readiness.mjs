// 원본 마스터가 오프라인 필수 표(docs/offline-master-format.md 「필수」)를 얼마나
// 갖췄는지 번호순으로 센다. 판본(`Case-No-*.offline.json`)이 있으면 오프라인이
// 실제로 여는 것은 그쪽이므로 그 파일을 본다.
//
// 왜 따로 있나 — `check:case` 는 `.offline.json` 에만 이 표를 error 로 묻고,
// `audit:format` 은 스키마 이주 부채를 센다. 「어느 번호가 오프라인에서 놀 수
// 있는 모양인가」는 어느 쪽도 답하지 않았고, 그래서 판본이 몇 건인지·다음 막에
// 무엇이 비었는지를 사람이 세고 있었다(2026-09-26). 문서에 수를 적지 않기로 한
// 것과 같은 원리다 — 파일이 센다.
//
//   node scripts/audit-offline-readiness.mjs           요약 + 다음 막에 비는 번호
//   node scripts/audit-offline-readiness.mjs --list    번호 전부, 빈 칸 이름과 함께
//   node scripts/audit-offline-readiness.mjs CASE014   그 번호만 자세히
//
// 스키마·tsc 를 타지 않는다 — JSON 만 읽는다. 판정은 「키가 있는가」 수준이다.
// 값이 옳은가(`HERRING_OWNER_MISMATCH` 같은 것)는 `check:case` 의 몫이다.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pendingDir = path.join(root, 'data', 'pending-cases');

// 막 게이트(app/gm/case-gate.ts): 처음 1편, 그 뒤 5편씩 — 1 → 6 → 11 → 16.
// 막 하나에 못 노는 번호가 하나라도 있으면 플레이어가 갇힌다(CLAUDE.md 「막간과 막」).
const gateAfter = (rank) => (rank <= 1 ? 1 : Math.ceil((rank - 1) / 5) * 5 + 1);

const nonEmpty = (v) => Array.isArray(v) && v.length > 0;
const every = (arr, pred) => nonEmpty(arr) && arr.every(pred);
const has = (o, k) => o && typeof o === 'object' && k in o;

// 열 이름은 짧게 — 한 줄에 사건 하나가 들어가야 한다. 셋째 값이 true 인 열은 포맷
// 문서 「필수」 표의 한 줄이고 준비도를 막는다. false 인 열은 「사건마다 달라서
// 강제하지 않는 것」·CLAUDE.md 의 놀이 규칙에서 온 권장 사항이라 세되 막지 않는다
// (002~010 판본이 헛다리 주인의 반박을 안 갖는 것은 옛 관행이고 완주는 된다).
const COLUMNS = [
  ['보드', true, (m) => nonEmpty(m.motives) && nonEmpty(m.times) && nonEmpty(m.methods)],
  [
    '재료',
    true,
    (m) =>
      ['motives', 'times', 'methods'].every((k) =>
        every(m[k], (c) => nonEmpty(c.suggested_by) && typeof c.cue === 'string' && c.cue.trim()),
      ),
  ],
  [
    '반박',
    false,
    (m) => {
      const culprit = m.full_truth?.responsible_character_id;
      const others = (m.characters || []).map((c) => c.id).filter((id) => id && id !== culprit);
      const text = (v) => (typeof v === 'string' ? v : v?.text) || '';
      return others.length > 0 && others.every((id) => text(m.suspect_refutations?.[id]).trim());
    },
  ],
  ['지목', true, (m) => every(m.characters, (c) => c.points_finger && c.points_finger.at)],
  ['버릇', true, (m) => every(m.characters, (c) => typeof c.comic_tell === 'string' && c.comic_tell.trim())],
  ['한계', true, (m) => every(m.characters, (c) => nonEmpty(c.knowledge_limits))],
  ['목소리', false, (m) => every(m.characters, (c) => c.voice_profile && c.voice_profile.stance)],
  ['카드방향', true, (m) => every(m.evidence, (e) => has(e, 'points_at'))],
  ['어긋남', true, (m) => every(m.evidence, (e) => has(e, 'mismatch'))],
  [
    '헛다리',
    true,
    (m) =>
      every(m.red_herrings, (r) => r.character_id && r.weight && has(r, 'clearing_points_at')),
  ],
  ['관계id', true, (m) => every(m.relationships, (r) => r.id)],
  ['지도', true, (m) => every(m.locations, (l) => l.access_level && Array.isArray(l.connects_to))],
  ['해결편', false, (m) => ['who', 'when', 'why', 'how'].every((k) => m.resolution?.[k])],
];

const rows = [];
for (const entry of fs.readdirSync(pendingDir, { withFileTypes: true }).sort((a, b) =>
  a.name.localeCompare(b.name),
)) {
  const num = /^CASE(\d+)$/.exec(entry.name)?.[1];
  if (!entry.isDirectory() || !num) continue;
  const original = path.join(pendingDir, entry.name, `${entry.name}.master.json`);
  if (!fs.existsSync(original)) continue;
  const version = fs
    .readdirSync(path.join(pendingDir, entry.name))
    .find((f) => /^Case-No-\d+\.offline\.json$/.test(f));
  const file = version ? path.join(pendingDir, entry.name, version) : original;
  let master;
  try {
    master = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    rows.push({ id: entry.name, num: Number(num), version: !!version, broken: String(error) });
    continue;
  }
  const failed = COLUMNS.filter(([, , pred]) => !pred(master));
  const missing = failed.filter(([, required]) => required).map(([name]) => name);
  const advised = failed.filter(([, required]) => !required).map(([name]) => name);
  const note = version
    ? fs.existsSync(path.join(pendingDir, entry.name, version.replace(/\.json$/, '.md')))
    : false;
  rows.push({ id: entry.name, num: Number(num), version: !!version, note, missing, advised });
}
rows.sort((a, b) => a.num - b.num);

const only = process.argv.find((a) => /^CASE\d+$/.test(a));
const list = process.argv.includes('--list');

if (only) {
  const row = rows.find((r) => r.id === only);
  if (!row) {
    console.error(`${only}: 그런 마스터가 없다.`);
    process.exit(1);
  }
  console.log(`${row.id} — ${row.version ? '판본 있음' : '원본만'}${row.version ? (row.note ? ' · 노트 있음' : ' · 노트 없음') : ''}`);
  if (row.broken) console.log(`  JSON 을 읽지 못했다: ${row.broken}`);
  else if (!row.missing.length) console.log('  필수 표 전부 갖춤.');
  else console.log(`  필수 빈 칸 ${row.missing.length}: ${row.missing.join(' · ')}`);
  if (row.advised?.length) console.log(`  권장 빈 칸 ${row.advised.length}: ${row.advised.join(' · ')}`);
  process.exit(0);
}

const ready = rows.filter((r) => !r.broken && r.missing.length === 0);
const versions = rows.filter((r) => r.version);
console.log(
  `마스터 ${rows.length}건 — 판본 ${versions.length}건(노트 없는 판본 ${versions.filter((r) => !r.note).length}) · 필수 표 전부 갖춘 번호 ${ready.length}건`,
);

const count = (name) => rows.filter((r) => r.missing?.includes(name) || r.advised?.includes(name)).length;
const tally = (required) =>
  COLUMNS.filter(([, r]) => r === required)
    .map(([n]) => `${String(n)} ${String(count(n))}`)
    .join(' · ');
console.log('필수 빈 칸별(건):', tally(true));
console.log('권장 빈 칸별(건):', tally(false));

// 번호가 곧 막이다. 앞에서부터 갖춘 것이 이어지는 자리와, 다음 게이트까지 비는 번호.
let streak = 0;
for (const row of rows) {
  if (row.broken || row.missing.length) break;
  streak += 1;
}
const nextGate = gateAfter(streak + 1);
const needed = rows.slice(streak, nextGate).filter((r) => r.broken || r.missing.length);
console.log(
  `앞에서부터 이어진 것 ${streak}건(${rows[streak - 1]?.id ?? '없음'}까지) → 다음 게이트 ${nextGate}편까지 비는 번호 ${needed.length}건`,
);
for (const row of needed) {
  console.log(`  ${row.id}${row.version ? '(판본)' : ''}: ${row.broken ? 'JSON 깨짐' : row.missing.join(' · ')}`);
}

if (list) {
  console.log('');
  for (const row of rows) {
    const mark = row.broken ? '!!' : row.missing.length ? '  ' : 'ok';
    console.log(
      `${mark} ${row.id}${row.version ? ' [판본]' : '       '} ${row.broken ? 'JSON 깨짐' : row.missing.join(' · ')}${row.advised?.length ? `  (권장: ${row.advised.join(' · ')})` : ''}`,
    );
  }
}
