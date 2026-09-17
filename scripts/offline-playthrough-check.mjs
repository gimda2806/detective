// Can every case still be finished through the offline menu alone?
//
//   node --experimental-strip-types scripts/offline-playthrough-check.mjs
//
// The offline GM has no model to improvise past a gap, so a case is winnable
// only if the buttons it actually prints lead all the way to the last
// contradiction stage. This walks every case with an exhaustive player —
// enter every room, exhaust every scene action, talk to everyone, ask
// everything, present every card to everyone, repeat until nothing moves —
// and reports any case that cannot be finished that way. It is the backstop
// for the /offline route: run it after touching app/gm/offline-*.ts.
//
// It runs the real engine (hence --experimental-strip-types and the resolver
// hook next to it); a copied engine would drift and quietly stop testing
// anything. It reads the case corpus straight off disk, so it needs no build
// and no dev server.
import { readFileSync, readdirSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

register('./offline-ts-resolver.mjs', import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { buildOfflineActionMenu, offlineAfterCloseBanter, runOfflineAction } =
  await import(
  `${ROOT}/app/gm/offline-engine.ts`
);
const { convertStructuredMaster } = await import(
  `${ROOT}/app/gm/structured-master-converter.ts`
);

// Text the engine must never print: an unresolved template placeholder, a
// stringified object, or the `은(는)` fallback that means a Korean particle
// was written by hand instead of picked from the word in front of it.
const BAD =
  /undefined|NaN|\[object|\{[a-zA-Z]+\}|[은는을를이가과와]\([은는을를이가과와]\)/;

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

// The same folding app/game.ts does to a finished turn, minus everything the
// menu does not read back.
function apply(state, turn) {
  const gm = turn.gm;
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
      (x) =>
        x.evidence_id === record.evidence_id &&
        x.target_id === record.target_id,
    );
    if (!seen) state.presented_evidence.push(record);
  }
  for (const update of gm.npc_updates) {
    if (update.statement_stage) {
      state.npc_statement_stage[update.npc] = update.statement_stage;
    }
  }
  for (const id of turn.heardStatementIds) {
    if (!state.heard_statements.includes(id)) state.heard_statements.push(id);
  }
  for (const id of turn.completedActions) {
    if (!state.completed_actions.includes(id)) state.completed_actions.push(id);
  }
  state.full_dialogue_log.push({});
}

function playExhaustively(selectedCase, problems) {
  const state = initialState(selectedCase);
  const menu = () => buildOfflineActionMenu(selectedCase, state);
  const open = () => menu().filter((action) => !action.disabled);

  const step = (id) => {
    const turn = runOfflineAction(selectedCase, state, id);
    const at = `${selectedCase.case_id}: `;
    if (!turn) return problems.push(`${at}null turn ${id}`);
    if (!turn.gm.message.trim()) problems.push(`${at}empty message ${id}`);
    if (BAD.test(turn.gm.message)) {
      problems.push(`${at}bad text ${id} :: ${turn.gm.message.slice(0, 60)}`);
    }
    if (turn.gm.jiwoo_line && BAD.test(turn.gm.jiwoo_line)) {
      problems.push(`${at}bad jiwoo line ${id} :: ${turn.gm.jiwoo_line}`);
    }
    if (turn.gm.detective_line && BAD.test(turn.gm.detective_line)) {
      problems.push(
        `${at}bad detective line ${id} :: ${turn.gm.detective_line}`,
      );
    }
    apply(state, turn);
  };

  // Passes, not a single sweep: a stage that opens in the last room can be
  // what unlocks a question back in the first one.
  for (let pass = 0; pass < 14; pass += 1) {
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
          const ask = open().find((a) => a.id.startsWith('ask|'));
          if (!ask) break;
          step(ask.id);
        }
        // A snapshot: presenting a card can hand out another one, and the
        // new card gets its turn on the next pass rather than mid-loop.
        const held = state.acquired_information.slice();
        for (const cardId of held) {
          const wanted = `present|${cardId}|${npc.id}`;
          const show = menu().find((a) => a.id === wanted && !a.disabled);
          if (show) step(show.id);
        }
      }
    }
  }

  return state;
}

const cases = [];
for (const dir of readdirSync(`${ROOT}/data/pending-cases`)) {
  try {
    const raw = JSON.parse(
      readFileSync(
        `${ROOT}/data/pending-cases/${dir}/${dir}.master.json`,
        'utf8',
      ),
    );
    cases.push({ dir, raw, data: convertStructuredMaster(raw) });
  } catch {
    cases.push({ dir, raw: null, data: null });
  }
}
for (const dir of readdirSync(`${ROOT}/data/cases`)) {
  try {
    const data = JSON.parse(
      readFileSync(`${ROOT}/data/cases/${dir}/case.json`, 'utf8'),
    );
    cases.push({ dir, raw: null, data });
  } catch {
    // data/cases also holds index.json and other non-case files.
  }
}

const problems = [];
let unfinishable = 0;
for (const { dir, raw, data } of cases) {
  if (!data) {
    problems.push(`${dir}: 변환 실패`);
    unfinishable += 1;
    continue;
  }
  const state = playExhaustively(data, problems);
  const stages = raw
    ? (raw.contradiction_stages || []).map((stage) => stage.id)
    : [
        ...new Set(
          [...data.master.raw_text.matchAll(/^\[(C[0-9]+)\]$/gm)].map(
            (match) => match[1],
          ),
        ),
      ];
  const fired = stages.filter((id) =>
    state.completed_actions.includes(`stage|${id}`),
  );
  const required = raw?.case_complete?.required_contradiction_stages || stages;
  const stagesOk =
    stages.length > 0 &&
    fired.length === stages.length &&
    required.every((id) => fired.includes(id));
  const cardsOk =
    data.cards.length > 0 &&
    data.cards.every((card) => state.acquired_information.includes(card.id));
  // 종결까지 눌러 본다. 완주 검사가 사건을 **닫지 않아서** 종결 경로의
  // 예외가 311건을 통과했다 — offlineAfterCloseBanter 가 호출될 때마다
  // 던지는 상태로 배포됐고, 실플레이에서 「사건을 종결하지 못했습니다」로
  // 나왔다(2026-09). 마지막 한 번을 여기서 같이 누른다.
  try {
    offlineAfterCloseBanter(
      state.completed_actions,
      state.full_dialogue_log.length,
      state.full_dialogue_log.map((entry) => entry?.content || '').filter(Boolean),
    );
  } catch (error) {
    problems.push(`${data.case_id}: 종결 주고받기에서 예외 — ${error.message}`);
  }
  if (stagesOk && cardsOk) continue;
  unfinishable += 1;
  console.log(
    `❌ ${data.case_id}  모순단계 ${fired.length}/${stages.length}  단서 ${state.acquired_information.length}/${data.cards.length}`,
  );
}

console.log(
  `\n사건 ${cases.length}건 — 완주 가능 ${cases.length - unfinishable}, 불가 ${unfinishable}`,
);
console.log(`텍스트 이상: ${problems.length}`);
for (const problem of problems.slice(0, 20)) console.log('  ', problem);
process.exit(unfinishable || problems.length ? 1 : 0);
