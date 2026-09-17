// 대사 풀이 고르게 나오는가?
//
//   node --experimental-strip-types scripts/banter-distribution.mjs [사건 수]
//
// 탐정·한지우 주고받기는 사건이 바뀌어도 같은 말이 나오는 순간 닳는다.
// 그래서 개수만큼 중요한 것이 "고르게 도는가"인데, 이건 눈으로 못 본다 —
// 한 사건만 해 보면 몇 개밖에 안 나오고, 300건을 손으로 돌릴 수는 없다.
//
// 이 스크립트가 실제 엔진으로 사건을 완전 탐색하면서 어느 쌍이 몇 번
// 나왔는지 세어, 풀마다 상위 3개가 전체의 몇 퍼센트인지와 한 번도 안 나온
// 것이 몇 개인지를 찍는다. 대사를 더 넣은 뒤 이 숫자가 나빠지지 않는지
// 보는 용도다.
//
// 기준선(chooseBalanced 를 넣기 전, 120건):
//   단계 돌파   28쌍 중 27쌍 · 상위 3쌍 23% · 최소 0
//   헛다리 해소 20쌍 중 18쌍 · 상위 3쌍 65% · 최소 0
//   헛짚음·빈손 36쌍 중 36쌍 · 상위 3쌍 12% · 최다 570 최소 255
import { readFileSync, readdirSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

register('./offline-ts-resolver.mjs', import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { buildOfflineActionMenu } = await import(
  `${ROOT}/app/gm/offline-engine.ts`
);
const { planOfflineTurn } = await import(`${ROOT}/app/gm/offline-session.ts`);
const { convertStructuredMaster } = await import(
  `${ROOT}/app/gm/structured-master-converter.ts`
);

// 풀을 소스에서 읽는다. 엔진이 내보내지 않는 값이고, 내보내게 고치면
// 검사 때문에 런타임 표면이 넓어진다.
const source = readFileSync(`${ROOT}/app/gm/offline-engine.ts`, 'utf8');

// 풀 하나를 블록 단위로 갈라 한지우 줄만 꺼낸다. 이것이 쌍의 열쇠다 —
// 탐정 줄은 "응."처럼 짧아 여러 풀에 같이 있고, 한 줄 정규식으로 뽑으면
// 옆 필드를 물어 와 숫자가 통째로 틀어진다.
function pairPool(name) {
  const body = source.match(
    new RegExp(`const ${name}: BanterPair\\[\\] = \\[([\\s\\S]*?)\\n\\];`),
  );
  if (!body) return [];
  const keys = [];
  for (const block of body[1].split('\n  },')) {
    const match = block.match(/jiwoo:\s*(?:\n\s*)?'((?:[^'\\]|\\.)*)'/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

// 긴 주고받기(EXCHANGE_*)도 센다. 두 줄짜리만 세고 있었더니 긴 것이 다
// 쓰이는지, 한두 개만 계속 나오는지가 안 보였다 — 사건당 한 번뿐인 자리라
// 한 번 쏠리면 연달아 여러 사건이 같은 여덟 줄로 시작한다.
//
// 열쇠는 **그 주고받기 전체**다. 한 줄로 잡으면 안 된다 — 처음에는 가장 긴
// 줄로 잡았다가 빈손(긴 것)이 120건에서 710회로 세어졌다. 짧은 줄("없네.")이
// 두 줄짜리 풀에도 똑같이 들어 있어서, 두 줄짜리가 나올 때마다 긴 것이
// 나온 것으로 세어진 것이다. 턴이 실은 배열을 통째로 맞춘다.
function exchangePool(name) {
  const body = source.match(
    new RegExp(`const ${name}: Exchange\\[\\] = \\[([\\s\\S]*?)\\n\\];`),
  );
  if (!body) return [];
  const keys = [];
  for (const block of body[1].split('\n  ],')) {
    const lines = [...block.matchAll(/[dj]\('((?:[^'\\]|\\.)*)'\)/g)].map(
      (m) => m[1],
    );
    if (lines.length) keys.push(lines.join('\n'));
  }
  return keys;
}

// 두 줄짜리는 줄 하나가 열쇠, 긴 것은 배열 전체가 열쇠라 세는 방법이 다르다.
const EXCHANGE_POOL_NAMES = new Set([
  '발견(긴 것)',
  '돌파(긴 것)',
  '해소(긴 것)',
  '빈손(긴 것)',
]);

const POOLS = {
  // 사건마다 딱 한 번 나오는 자리라 총계가 작다. 여기가 쏠리면 연달아 두
  // 사건이 같은 말로 시작한다.
  '첫 카드': pairPool('BANTER_FIRST_CARD'),
  '증거 발견': pairPool('BANTER_DISCOVERY'),
  '단계 돌파': pairPool('BANTER_STAGE_BREAK'),
  '헛다리 해소': pairPool('BANTER_HERRING_CLEAR'),
  '헛짚음·빈손': pairPool('BANTER_DEAD_END'),
  '발견(긴 것)': exchangePool('EXCHANGE_DISCOVERY'),
  '돌파(긴 것)': exchangePool('EXCHANGE_STAGE_BREAK'),
  '해소(긴 것)': exchangePool('EXCHANGE_HERRING_CLEAR'),
  '빈손(긴 것)': exchangePool('EXCHANGE_DEAD_END'),
};

function initialState(selectedCase) {
  return {
    current_location: selectedCase.opening_scene,
    current_interview: null,
    interviewed_characters: [],
    acquired_information: [],
    presented_evidence: [],
    npc_statement_stage: Object.fromEntries(
      selectedCase.npcs.map((npc) => [npc.id, 'initial']),
    ),
    heard_statements: [],
    completed_actions: [],
    full_dialogue_log: [{}],
    case_status: 'in_progress',
  };
}

function apply(state, plan) {
  const gm = plan.gm;
  state.current_location = gm.scene.location_id;
  state.current_interview = gm.scene.interview_character_id;
  const met = gm.scene.interview_character_id;
  if (met && !state.interviewed_characters.includes(met)) {
    state.interviewed_characters.push(met);
  }
  for (const id of gm.acquire) {
    if (!state.acquired_information.includes(id)) {
      state.acquired_information.push(id);
    }
  }
  for (const record of gm.presented_evidence) {
    const seen = state.presented_evidence.some(
      (item) =>
        item.evidence_id === record.evidence_id &&
        item.target_id === record.target_id,
    );
    if (!seen) state.presented_evidence.push(record);
  }
  for (const update of gm.npc_updates) {
    if (update.statement_stage) {
      state.npc_statement_stage[update.npc] = update.statement_stage;
    }
  }
  for (const id of plan.heardStatementIds) {
    if (!state.heard_statements.includes(id)) state.heard_statements.push(id);
  }
  for (const id of plan.completedActions) {
    if (!state.completed_actions.includes(id)) state.completed_actions.push(id);
  }
  for (const entry of plan.dialogue) {
    state.full_dialogue_log.push({ content: entry.content });
  }
}

const counts = Object.fromEntries(
  Object.keys(POOLS).map((name) => [name, new Map()]),
);

const limit = Number(process.argv[2] || 120);
const dirs = readdirSync(`${ROOT}/data/pending-cases`).slice(0, limit);
let played = 0;

for (const dir of dirs) {
  let raw;
  try {
    raw = JSON.parse(
      readFileSync(
        `${ROOT}/data/pending-cases/${dir}/${dir}.master.json`,
        'utf8',
      ),
    );
  } catch {
    continue;
  }
  const selectedCase = convertStructuredMaster(raw);
  const state = initialState(selectedCase);
  played += 1;

  const menu = () => buildOfflineActionMenu(selectedCase, state);
  const open = () => menu().filter((action) => !action.disabled);
  const step = (id) => {
    const plan = planOfflineTurn(selectedCase, state, id, 99, 0);
    if (!plan) return;
    // 주고받기는 exchange 로, 그 밖의 풀은 detective_line/jiwoo_line 으로
    // 나간다. 둘 다 세지 않으면 증거 발견 주고받기가 통째로 빠진다.
    const said = [
      ...plan.gm.exchange.map((item) => item.line),
      plan.gm.detective_line,
      plan.gm.jiwoo_line,
    ].filter(Boolean);
    const whole = plan.gm.exchange.map((item) => item.line).join('\n');
    for (const [name, lines] of Object.entries(POOLS)) {
      if (EXCHANGE_POOL_NAMES.has(name)) {
        if (whole && lines.includes(whole)) {
          counts[name].set(whole, (counts[name].get(whole) || 0) + 1);
        }
        continue;
      }
      for (const line of said) {
        if (!lines.includes(line)) continue;
        counts[name].set(line, (counts[name].get(line) || 0) + 1);
      }
    }
    apply(state, plan);
  };

  for (let pass = 0; pass < 4; pass += 1) {
    for (const place of selectedCase.locations) {
      if (state.current_location !== place.id) {
        const move = menu().find((a) => a.id === `move|${place.id}`);
        if (move) step(move.id);
      }
      for (let k = 0; k < 12; k += 1) {
        const scene = open().find((a) => a.group === '현장');
        if (!scene) break;
        step(scene.id);
      }
      for (const npc of selectedCase.npcs) {
        const talk = menu().find((a) => a.id === `talk|${npc.id}`);
        if (!talk) continue;
        step(talk.id);
        for (let k = 0; k < 12; k += 1) {
          const ask = open().find(
            (a) => a.group === '면담' && a.id !== 'leave',
          );
          if (!ask) break;
          step(ask.id);
        }
        for (const cardId of state.acquired_information.slice()) {
          const wanted = `present|${String(cardId)}|${String(npc.id)}`;
          const show = menu().find((a) => a.id === wanted && !a.disabled);
          if (show) step(show.id);
        }
      }
    }
  }
}

console.log(`사건 ${played}건 완전 탐색`);
let worst = 0;
for (const [name, lines] of Object.entries(POOLS)) {
  if (!lines.length) continue;
  const tally = lines.map((line) => counts[name].get(line) || 0);
  const total = tally.reduce((sum, n) => sum + n, 0);
  if (!total) {
    // 완전 탐색으로 한 번도 안 나오는 풀은 아무도 못 보는 대사다.
    console.log(
      `${name.padEnd(12)} ${lines.length}쌍 · ⚠ 완전 탐색에서 한 번도 안 나옴`,
    );
    continue;
  }
  const used = tally.filter((n) => n > 0).length;
  const top = [...tally].sort((a, b) => b - a).slice(0, 3);
  const share = Math.round((top.reduce((s, n) => s + n, 0) * 100) / total);
  // 완전히 고르게 돌아도 쌍이 적으면 상위 3쌍 비중은 높게 나온다(6쌍이면
  // 50%). 그 바닥값을 같이 찍지 않으면 작은 풀이 쏠린 것처럼 읽힌다.
  const floor = Math.round((Math.min(3, lines.length) * 100) / lines.length);
  worst = Math.max(worst, share - floor);
  console.log(
    `${name.padEnd(12)} ${lines.length}쌍 중 ${used}쌍 사용 · 총 ${total}회 · ` +
      `최다 ${Math.max(...tally)} 최소 ${Math.min(...tally)} · ` +
      `상위 3쌍 ${share}% (고르면 ${floor}%)`,
  );
}
console.log(`\n가장 쏠린 풀이 고른 분포보다 넘은 정도: ${worst}%p`);
