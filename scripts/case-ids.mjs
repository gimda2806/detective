// 마스터를 손으로 고칠 때 **번호를 타이핑하지 않게** 한다.
//
//   npm run ids <CASE_ID>           인물·카드·헛다리 대응표를 찍는다
//   npm run ids <CASE_ID> <이름>     그 사람의 id 하나만 찍는다
//   npm run ids <CASE_ID> fix       이름에서 유도되는 id 를 실제로 채우고 고친다
//
// (`--fix` 로도 되지만 npm 이 대시로 시작하는 인자를 자기 것으로 먹으므로
//  `npm run ids CASE008 -- --fix` 라고 써야 한다. 그래서 `fix` 도 받는다.)
//
// 왜 있나 — 2026-09-21 에 한 세션이 `red_herrings[].character_id` 를 **네 자리
// 다 틀리게** 적었다. 사건을 읽어 「R01 은 서준혁」까지는 맞게 알고도 서준혁이
// CH04 인지 CH03 인지를 확인하지 않은 것이고, 실수는 **이름에서 번호로 옮겨
// 적는 그 한 단계**에서 났다. 그런데 세 층이 전부 통과시켰다 — 스키마는
// 문자열이면 되고, 교차참조는 존재하는 id 라 넘어가며, `check:offline` 의
// 전수 플레이는 모든 카드를 모두에게 내밀어 주인이 누구든 헛다리가 풀린다.
//
// 검사기(`HERRING_OWNER_MISMATCH`·`REFERENCE_OWNERSHIP`)를 뒤에 세웠지만 그건
// 사후 그물이다. 이 도구는 그 앞자리를 맡는다 — **옮겨 적기 자체를 사람이
// 하지 않게** 한다.
//
// `--fix` 가 건드리는 것은 `character_id` 하나뿐이다. 이름이 문장 안에 있는
// 유일한 필드라 기계가 되짚을 수 있고, 나머지(`points_finger.at`,
// `clearing_points_at`)는 대사에 이름이 안 나오기도 해서 유도할 수 없다 —
// 그쪽은 위의 표를 보며 손으로 적고 검사기가 뒤에서 받는다.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [caseIdRaw, ...rest] = process.argv.slice(2);
if (!caseIdRaw) {
  console.error('사용법: npm run ids <CASE_ID> [이름 | --fix]');
  process.exit(1);
}
const caseId = caseIdRaw.toUpperCase().startsWith('CASE')
  ? caseIdRaw.toUpperCase()
  : `CASE${caseIdRaw.padStart(3, '0')}`;
const dir = join('data', 'pending-cases', caseId);
if (!existsSync(dir)) {
  console.error(`${caseId} 폴더가 없다: ${dir}`);
  process.exit(1);
}
const fix = rest.includes('--fix') || rest.includes('fix');
const lookup = rest.find((a) => !a.startsWith('--') && a !== 'fix');

// 오프라인 판본이 있으면 그쪽도 본다 — `/offline` 이 여는 것이 그 파일이다.
const files = readdirSync(dir)
  .filter((n) => n.endsWith('.json'))
  .map((n) => join(dir, n));

let changed = 0;
let mismatched = 0;

for (const file of files) {
  let master;
  try {
    master = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  if (!master.characters) continue;

  const nameById = new Map(master.characters.map((c) => [c.id, c.name]));
  const culprit = master.full_truth?.responsible_character_id;

  // 이름 하나만 물었을 때.
  if (lookup) {
    const hit = master.characters.find(
      (c) => c.name === lookup || c.name.includes(lookup),
    );
    console.log(hit ? hit.id : `${caseId}에 「${lookup}」이(가) 없다`);
    process.exit(hit ? 0 : 1);
  }

  let changedHere = 0;
  console.log(`\n=== ${file}`);
  console.log('— 인물');
  for (const c of master.characters) {
    const mark = c.id === culprit ? ' ★진범' : '';
    console.log(
      `   ${c.id}  ${c.name}${mark}  @${c.present_location ?? '?'}  ${c.role ?? ''}`,
    );
  }
  for (const k of master.key_figures ?? []) {
    console.log(`   ${k.id}  ${k.name}  (피해자)`);
  }

  console.log('— 카드가 가리키는 사람 (points_at)');
  for (const e of master.evidence ?? []) {
    const aim = Object.prototype.hasOwnProperty.call(e, 'points_at')
      ? (e.points_at ?? '(없음)')
      : '※ 키 자체가 없음';
    const who = nameById.get(aim);
    console.log(
      `   ${e.id}  ${String(aim).padEnd(12)}${who ? `(${who})` : ''}  ${e.name ?? ''}`,
    );
  }

  console.log('— 헛다리');
  for (const h of master.red_herrings ?? []) {
    const owner = h.character_id;
    const surface = h.surface_suspicion ?? '';
    // 문장 안에 이름이 있는 인물. 이것이 이 도구가 유도할 수 있는 전부다.
    const inSurface = master.characters.filter(
      (c) => c.name && surface.includes(c.name),
    );
    const derived =
      inSurface.length === 1 && inSurface[0].id !== culprit
        ? inSurface[0].id
        : null;
    let note = '';
    if (!owner && derived) note = `→ ${derived}(${nameById.get(derived)}) 로 채울 수 있다`;
    else if (owner && derived && owner !== derived) {
      note = `★ 어긋남 — 문장은 ${derived}(${nameById.get(derived)})를 말한다`;
      mismatched += 1;
    } else if (!owner && !derived) {
      note = inSurface.length
        ? `(문장에 ${inSurface.map((c) => c.name).join('·')} 가 있어 하나로 못 좁힌다)`
        : '(문장에 인물 이름이 없어 유도할 수 없다)';
    }
    console.log(
      `   ${h.id}  ${String(owner ?? '(없음)').padEnd(8)}${owner ? `(${nameById.get(owner) ?? '?'})` : ''}  ${note}`,
    );
    console.log(`        ${surface.slice(0, 78)}`);

    if (fix && derived && owner !== derived) {
      h.character_id = derived;
      changed += 1;
      changedHere += 1;
      console.log(`        → ${derived} 로 ${owner ? '고쳤다' : '채웠다'}`);
    }
  }

  // 파일별로 센다 — 앞 파일에서 고친 것 때문에 안 바뀐 파일까지 다시 쓰면
  // 들여쓰기만 달라진 diff 가 생긴다.
  if (fix && changedHere) {
    writeFileSync(file, `${JSON.stringify(master, null, 2)}\n`, 'utf8');
  }
}

if (fix) {
  console.log(
    changed
      ? `\n${changed}자리를 고쳤다. npm run check:case ${caseId} 를 돌려 볼 것.`
      : '\n고칠 것이 없다.',
  );
} else if (mismatched) {
  console.log(
    `\n★ 어긋난 자리 ${mismatched}개 — --fix 를 붙이면 문장에서 유도한 값으로 고친다.`,
  );
}
