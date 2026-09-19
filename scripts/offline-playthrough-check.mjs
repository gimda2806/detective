// Can every case still be finished through the offline menu alone?
//
//   npm run check:offline
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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

register('./offline-ts-resolver.mjs', import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { buildOfflineActionMenu, runOfflineAction } = await import(
  `${ROOT}/app/gm/offline-engine.ts`
);
const { buildEndingReveal } = await import(`${ROOT}/app/gm/master-index.ts`);
const { hypothesisView, HYPOTHESIS_SLOTS } = await import(
  `${ROOT}/app/gm/offline-hypothesis.ts`
);
const { buildMasterIndex } = await import(`${ROOT}/app/gm/master-index.ts`);
const { convertStructuredMaster } = await import(
  `${ROOT}/app/gm/structured-master-converter.ts`
);

// Text the engine must never print: an unresolved template placeholder, a
// stringified object, the `은(는)` fallback that means a Korean particle was
// written by hand instead of picked from the word in front of it, or a
// doubled period.
//
// 마침표 둘은 마스터 문장 끝에 엔진이 한 번 더 붙였다는 뜻이다 — 1,851명 중
// 46명의 `role` 이 이미 마침표로 끝나서 「…사진 수집가..」가 나왔다(CASE030
// 실플레이에서 여섯 명 전원). **줄 끝만 본다**: 말줄임표(`...`/`…`)와, 마스터가
// 일부러 쓴 말버릇(`'음..'`, `'그.. 그게'` — 코퍼스에 5개)은 줄 가운데에 있고
// 사람이 적은 것이라 건드리지 않는다.
const BAD =
  /undefined|NaN|\[object|\{[a-zA-Z]+\}|[은는을를이가과와]\([은는을를이가과와]\)|(?<!\.)\.\.(?!\.)[ \t]*$/m;

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
    // 서술이 둘로 갈린 턴의 뒷토막(첫 대면의 대답). 앞토막만 보면 진술
    // 문장은 한 번도 이 검사를 지나지 않는다.
    if (turn.gm.message_tail && BAD.test(turn.gm.message_tail)) {
      problems.push(
        `${at}bad tail ${id} :: ${turn.gm.message_tail.slice(0, 60)}`,
      );
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
        // 면담 보기를 전부 눌러 본다. 오래 `ask|` 만 눌렀는데, 그러면 자기
        // 문이 따로 있는 진술 — 「사건 당시 어디에 있었는지」(alibi),
        // 「그 밖에 이상한 점은 없었는지」(recall), 관계 두 박자 — 이 한 번도
        // 안 나온 채로 검사가 통과한다. 무식한 플레이어는 앞에 앉은 사람에게
        // 누를 수 있는 것을 다 누른다. `leave` 만 뺀다(그걸 누르면 그 자리에서
        // 일어서므로 나머지를 못 누른다).
        for (let k = 0; k < 24; k += 1) {
          const q = open().find((a) => a.group === '면담' && a.id !== 'leave');
          if (!q) break;
          step(q.id);
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

  // 가설 보드가 있는 사건: 1막에서는 대립 단계가 안 열리므로, 무식한
  // 플레이어도 칸을 채워야 한다 — 후보를 전부 걸어 보고 앞에 앉은 아무에게나
  // 들이댄다(그것이 무식함이다). 네 칸이 굳을 때까지 몇 턴이 걸리는지가
  // 새 지표다: 수첩만 보면 답이 보이는 사건일수록 이 값이 작다.
  const index = buildMasterIndex(selectedCase.master.raw_text);
  const board = () => hypothesisView(index, state, selectedCase.npcs);
  if (board().enabled) {
    const startTurn = state.full_dialogue_log.length;
    for (let round = 0; round < 6 && board().act !== 2; round += 1) {
      for (const slot of HYPOTHESIS_SLOTS) {
        if (board().confirmed[slot]) continue;
        for (const candidate of board().candidates[slot]) {
          if (board().confirmed[slot]) break;
          if (board().refuted[slot].includes(candidate.id)) continue;
          const held = state.acquired_information.join(',');
          if (!held) break;
          step(`hypothesis|set|${slot}|${candidate.id}|${held}`);
          // 「누가」는 본인에게, 나머지는 누구든 앞에 앉은 사람에게.
          const targets =
            slot === 'who'
              ? selectedCase.npcs.filter(
                  (npc) => npc.id.replace(/^N/, 'CH') === candidate.id,
                )
              : selectedCase.npcs;
          for (const npc of targets) {
            if (board().confirmed[slot]) break;
            if (board().refuted[slot].includes(candidate.id)) break;
            for (const loc of selectedCase.locations) {
              if (menu().some((a) => a.id === `talk|${npc.id}`)) break;
              const move = menu().find((a) => a.id === `move|${loc.id}`);
              if (move) step(move.id);
            }
            const talk = menu().find((a) => a.id === `talk|${npc.id}`);
            if (!talk) continue;
            step(talk.id);
            step(`hypothesis|press|${slot}|${npc.id}`);
            const leave = menu().find((a) => a.id === 'leave');
            if (leave) step(leave.id);
          }
        }
      }
    }
    hypothesisTurns.push({
      id: selectedCase.case_id,
      turns: state.full_dialogue_log.length - startTurn,
      done: board().act === 2,
    });
    // 2막이 열렸으면 대립 단계를 다시 돈다 — 1막에서는 닫혀 있었다.
    if (board().act === 2) {
      for (let pass = 0; pass < 6; pass += 1) {
        for (const npc of selectedCase.npcs) {
          for (const loc of selectedCase.locations) {
            if (menu().some((a) => a.id === `talk|${npc.id}`)) break;
            const move = menu().find((a) => a.id === `move|${loc.id}`);
            if (move) step(move.id);
          }
          const talk = menu().find((a) => a.id === `talk|${npc.id}`);
          if (!talk) continue;
          step(talk.id);
          for (const cardId of state.acquired_information.slice()) {
            const show = menu().find(
              (a) =>
                a.id === `present|${String(cardId)}|${String(npc.id)}` &&
                !a.disabled,
            );
            if (show) step(show.id);
          }
          const leave = menu().find((a) => a.id === 'leave');
          if (leave) step(leave.id);
        }
      }
    }
  }

  return state;
}

const hypothesisTurns = [];
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
  // 오프라인 전용 마스터가 있으면 그것도 한 편으로 센다. /offline 이 실제로
  // 여는 것은 이쪽이고, 원본만 걸으면 정작 오프라인에서 돌아가는 판본은
  // 아무도 완주시켜 보지 않은 채로 배포된다(CLAUDE.md 「오프라인 전용 마스터」).
  const offlinePath = `${ROOT}/data/pending-cases/${dir}/Case-No-${dir.slice(4)}.offline.json`;
  if (existsSync(offlinePath)) {
    try {
      const raw = JSON.parse(readFileSync(offlinePath, 'utf8'));
      cases.push({
        dir: `${dir}(offline)`,
        raw,
        data: convertStructuredMaster(raw),
      });
    } catch {
      cases.push({ dir: `${dir}(offline)`, raw: null, data: null });
    }
  }
}
// data/cases 는 옛 봉투 사건이 살던 자리다. 지금은 비어 있을 수 있다.
for (const dir of existsSync(`${ROOT}/data/cases`)
  ? readdirSync(`${ROOT}/data/cases`)
  : []) {
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
let herringTotal = 0;
let herringSurfaced = 0;
let herringCleared = 0;
let herringClearedFirst = 0;
let herringFeltFirst = 0;
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
  // 예외가 311건을 통과한 적이 있다 — 호출될 때마다 던지는 상태로 배포됐고
  // 실플레이에서 「사건을 종결하지 못했습니다」로 나왔다(2026-09). 그때 걸린
  // 것은 종결 뒤 주고받기였고 그건 지금 없다. 남은 것이 app/game.ts 의
  // case_close 가 실제로 기대는 하나 — buildEndingReveal 이다. 이것이
  // 던지거나 엔딩 장면을 못 읽으면 플레이어는 마지막 장면 대신 전말 덤프를
  // 본다.
  try {
    const reveal = buildEndingReveal(data.master.raw_text);
    if (!reveal.endingScene) {
      problems.push(`${data.case_id}: 종결 화면에 띄울 엔딩 장면이 없다`);
    }
  } catch (error) {
    problems.push(`${data.case_id}: 종결 경로에서 예외 — ${error.message}`);
  }
  if (process.env.OFFLINE_CHECK_HERRING) {
    const herrings = ((raw && raw.red_herrings) || []).map((x) => x.id).filter(Boolean);
    const surfaced = herrings.filter((id) =>
      state.completed_actions.includes(`herring|${id}`),
    );
    const cleared = herrings.filter((id) =>
      state.completed_actions.includes(`cleared|${id}`),
    );
    herringTotal += herrings.length;
    herringSurfaced += surfaced.length;
    herringCleared += cleared.length;
    for (const id of herrings) {
      const s = state.completed_actions.indexOf(`herring|${id}`);
      const c = state.completed_actions.indexOf(`cleared|${id}`);
      if (c >= 0 && (s < 0 || c < s)) herringClearedFirst += 1;
      else if (s >= 0 && c >= 0) herringFeltFirst += 1;
    }
  }
  if (stagesOk && cardsOk) continue;
  unfinishable += 1;
  console.log(
    `❌ ${data.case_id}  모순단계 ${fired.length}/${stages.length}  단서 ${state.acquired_information.length}/${data.cards.length}`,
  );
  if (process.env.OFFLINE_CHECK_VERBOSE) {
    const missing = data.cards
      .filter((card) => !state.acquired_information.includes(card.id))
      .map((card) => `${card.id}(${card.condition})`);
    if (missing.length) console.log(`     못 얻은 카드: ${missing.join(' / ')}`);
  }
}

console.log(
  `\n사건 ${cases.length}건 — 완주 가능 ${cases.length - unfinishable}, 불가 ${unfinishable}`,
);
if (hypothesisTurns.length) {
  const finished = hypothesisTurns.filter((item) => item.done);
  const avg = finished.length
    ? (
        finished.reduce((sum, item) => sum + item.turns, 0) / finished.length
      ).toFixed(1)
    : '-';
  console.log(
    `가설 보드 사건 ${hypothesisTurns.length}건 — 네 칸 확정 ${finished.length}건, 확정까지 평균 ${avg}턴`,
  );
  for (const item of hypothesisTurns.filter((entry) => !entry.done)) {
    console.log(`  ❌ ${item.id}: 네 칸을 굳히지 못함`);
  }
}
if (process.env.OFFLINE_CHECK_HERRING) {
  console.log(
    `레드헤링 ${herringTotal}개 — 의심이 드러난 것 ${herringSurfaced} (${((herringSurfaced / herringTotal) * 100).toFixed(1)}%), 풀린 것 ${herringCleared} (${((herringCleared / herringTotal) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   의심이 먼저 드러난 뒤 풀린 것 ${herringFeltFirst} · 드러나기도 전에 풀린 것 ${herringClearedFirst}`,
  );
}
console.log(`텍스트 이상: ${problems.length}`);
for (const problem of problems.slice(0, 20)) console.log('  ', problem);
process.exit(unfinishable || problems.length ? 1 : 0);
