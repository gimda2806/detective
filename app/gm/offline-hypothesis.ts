// ---------------------------------------------------------------------------
// 가설 보드 — 오프라인이 「추리소설을 써내려가는 느낌」이 되게 하는 축
//
// 지금 오프라인에는 플레이어가 답을 거는 순간이 없다. 종결 버튼이 조건 없이
// 전말을 공개하니 지목이 아니라 열람이고, 그 앞은 「맞는 카드를 진범에게
// 순서대로 넣는」 조합 맞추기다(docs/offline-deduction.md 의 진단). 카드
// 본문이 진범 이름을 3.8배 부르니 수집 단계에서 이미 답을 안다.
//
// 그래서 추리소설의 뼈대 — 누가·언제·왜·어떻게 — 를 플레이어가 채우는
// 빈칸 넷으로 연다. 각 칸은 후보 중에서 고르고,
// 채운 칸을 인물에게 들이댄다. 틀리면 반박당하고 그 반박이 새 사실을 준다
// — 틀린 가설이 전진이다. 네 칸이 다 확정되면 2막(대립 단계)이 열린다.
//
// 판정은 칸 단위다. 조합(5×4×4×4)에 반박을 쓸 수는 없으니 칸별로 봐서
// 마스터가 써야 할 반박을 5+4+4+4 로 떨어뜨린다.
//
// 상태는 새 GameState 필드가 아니라 completed_actions 마커로 둔다 —
// offline-summon.ts 와 같은 이유다(오프라인만의 생각을 공유 app/game.ts 에
// 늘리지 않는다). set/clear 는 번호를 달아 최신 것이 이긴다.
//
// 이 파일은 offline-engine.ts 에서 import 하므로 그쪽을 import 하지 않는다.
// 필요한 상태 모양은 여기서 좁게 선언한다.
// ---------------------------------------------------------------------------

import type { HypothesisCandidateIndex, MasterIndex } from './master-index';

export type HypothesisSlot = 'who' | 'when' | 'why' | 'how';

export const HYPOTHESIS_SLOTS: HypothesisSlot[] = ['who', 'when', 'why', 'how'];

export const SLOT_LABEL: Record<HypothesisSlot, string> = {
  who: '누가',
  when: '언제',
  why: '왜',
  how: '어떻게',
};

type HypothesisState = {
  completed_actions: string[];
  acquired_information: string[];
  full_dialogue_log: Array<unknown>;
};

export type HypothesisCandidate = { id: string; text: string };

export type HypothesisSlotView = {
  id: string;
  text: string;
  basis: string[];
} | null;

export type HypothesisView = {
  enabled: boolean;
  slots: Record<HypothesisSlot, HypothesisSlotView>;
  confirmed: Record<HypothesisSlot, boolean>;
  refuted: Record<HypothesisSlot, string[]>;
  candidates: Record<HypothesisSlot, HypothesisCandidate[]>;
  act: 1 | 2;
};

// 마스터에 후보 목록이 하나라도 있으면 보드가 열린다. 없는 사건(지금 309건
// 전부)은 보드 없이 종전대로 돈다 — firingStage 게이트도 걸리지 않는다.
export function hypothesisEnabled(index: MasterIndex): boolean {
  return (
    index.motives.length > 0 ||
    index.times.length > 0 ||
    index.methods.length > 0
  );
}

// ---- 마커 ------------------------------------------------------------------

const SET = /^hyp\|set\|(who|when|why|how)\|([^|]+)\|([^|]*)\|(\d+)$/;
const CLEAR = /^hyp\|clear\|(who|when|why|how)\|(\d+)$/;
const REFUTED = /^hyp\|refuted\|(who|when|why|how)\|([^|]+)$/;
const CONFIRMED = /^hyp\|confirmed\|(who|when|why|how)\|([^|]+)$/;

// 마커의 칸 수는 그대로 둔다 — 근거 걸기를 없애기 전에 저장된 마커가
// 5칸이고, 형식을 줄이면 그 저장이 칸을 잃는다. 카드 자리는 늘 빈다.
export function setMarker(
  slot: HypothesisSlot,
  candidateId: string,
  seq: number,
): string {
  return `hyp|set|${slot}|${candidateId}||${seq}`;
}

export function clearMarker(slot: HypothesisSlot, seq: number): string {
  return `hyp|clear|${slot}|${seq}`;
}

export function refutedMarker(slot: HypothesisSlot, candidateId: string) {
  return `hyp|refuted|${slot}|${candidateId}`;
}

export function confirmedMarker(slot: HypothesisSlot, candidateId: string) {
  return `hyp|confirmed|${slot}|${candidateId}`;
}

export function nextSeq(state: HypothesisState): number {
  return state.full_dialogue_log.length;
}

// 칸에 지금 걸린 것. set 과 clear 중 번호가 큰 쪽이 이긴다 — game.ts 가
// completed_actions 를 집합으로 접기 때문에 같은 칸에 같은 후보를 두 번
// 걸어도 번호가 다르면 둘 다 남고, 최신 것을 읽으면 된다.
function slotOf(
  actions: string[],
  slot: HypothesisSlot,
): { id: string; basis: string[] } | null {
  let best: { seq: number; value: { id: string; basis: string[] } | null } = {
    seq: -1,
    value: null,
  };
  for (const action of actions) {
    const set = action.match(SET);
    if (set && set[1] === slot) {
      const seq = Number(set[4]);
      if (seq > best.seq) {
        best = {
          seq,
          value: { id: set[2], basis: set[3].split(',').filter(Boolean) },
        };
      }
      continue;
    }
    const clear = action.match(CLEAR);
    if (clear && clear[1] === slot) {
      const seq = Number(clear[2]);
      if (seq > best.seq) best = { seq, value: null };
    }
  }
  return best.value;
}

function listOf(
  actions: string[],
  pattern: RegExp,
  slot: HypothesisSlot,
): string[] {
  const out: string[] = [];
  for (const action of actions) {
    const match = action.match(pattern);
    if (match && match[1] === slot) out.push(match[2]);
  }
  return out;
}

// ---- 후보 ------------------------------------------------------------------

function listFor(
  index: MasterIndex,
  slot: Exclude<HypothesisSlot, 'who'>,
): HypothesisCandidateIndex[] {
  return slot === 'when'
    ? index.times
    : slot === 'why'
      ? index.motives
      : index.methods;
}

export function candidatesFor(
  index: MasterIndex,
  slot: HypothesisSlot,
  npcs: Array<{ id: string; name: string }>,
): HypothesisCandidate[] {
  if (slot === 'who') {
    // 「누가」는 characters 그대로다. 마스터 id(CH##)로 든다 — 반박·진범이
    // 그 id 로 적혀 있다.
    return npcs.map((npc) => ({
      id: npc.id.replace(/^N/, 'CH'),
      text: npc.name,
    }));
  }
  return listFor(index, slot).map((item) => ({ id: item.id, text: item.text }));
}

export function candidateText(
  index: MasterIndex,
  slot: HypothesisSlot,
  candidateId: string,
  npcs: Array<{ id: string; name: string }>,
): string {
  return (
    candidatesFor(index, slot, npcs).find((item) => item.id === candidateId)
      ?.text || candidateId
  );
}

// 「누가」의 근거. decisive_evidence_ids 가 있으면 그것, 없으면 진범 단계의
// 요구 합집합 — 후자는 「자백의 열쇠」라 엄밀히는 다른 것이지만, 없는 것보다
// 낫다(docs/offline-deduction.md 3.2).
function whoEvidenceFor(index: MasterIndex): string[] {
  if (index.decisiveEvidenceIds.length) return index.decisiveEvidenceIds;
  // 단계의 targetCharacter 는 N## 이고 responsibleCharacterId 는 CH## 다 —
  // 둘을 그대로 견주면 영영 안 맞아 근거가 비고, 정답 지목이 늘 short 로
  // 떨어진다(프로브에서 실제로 그랬다).
  const culprit = index.responsibleCharacterId.replace(/^N/, 'CH');
  const ids = new Set<string>();
  for (const stage of index.contradictionStages) {
    if (stage.targetCharacter.replace(/^N/, 'CH') !== culprit) continue;
    for (const id of stage.requiresPresentedEvidenceIds) ids.add(id);
  }
  return [...ids];
}

// ---- 보기 ------------------------------------------------------------------

export function hypothesisView(
  index: MasterIndex,
  state: HypothesisState,
  npcs: Array<{ id: string; name: string }>,
): HypothesisView {
  const enabled = hypothesisEnabled(index);
  const actions = state.completed_actions;
  const slots = {} as Record<HypothesisSlot, HypothesisSlotView>;
  const confirmed = {} as Record<HypothesisSlot, boolean>;
  const refuted = {} as Record<HypothesisSlot, string[]>;
  const candidates = {} as Record<HypothesisSlot, HypothesisCandidate[]>;
  for (const slot of HYPOTHESIS_SLOTS) {
    const current = slotOf(actions, slot);
    slots[slot] = current
      ? {
          id: current.id,
          text: candidateText(index, slot, current.id, npcs),
          basis: current.basis,
        }
      : null;
    confirmed[slot] = listOf(actions, CONFIRMED, slot).length > 0;
    refuted[slot] = listOf(actions, REFUTED, slot);
    candidates[slot] = enabled ? candidatesFor(index, slot, npcs) : [];
  }
  const act: 1 | 2 =
    !enabled || HYPOTHESIS_SLOTS.every((slot) => confirmed[slot]) ? 2 : 1;
  return { enabled, slots, confirmed, refuted, candidates, act };
}

// 2막이 열렸는가. 보드가 없는 사건은 언제나 2막이다 — 종전 동작 그대로.
export function actTwo(index: MasterIndex, state: HypothesisState): boolean {
  if (!hypothesisEnabled(index)) return true;
  return HYPOTHESIS_SLOTS.every(
    (slot) => listOf(state.completed_actions, CONFIRMED, slot).length > 0,
  );
}

// ---- 판정 ------------------------------------------------------------------

export type HypothesisJudgement =
  | { kind: 'empty' }
  | { kind: 'already' }
  // 이 반박은 다른 사람 몫이다. 후보에 refuted_by 가 적혀 있는데 지금 앞에
  // 앉은 사람이 아니거나, 「누가」를 본인이 아닌 사람에게 들이댔을 때.
  | { kind: 'wrong_respondent'; ownerId: string }
  | {
      kind: 'refuted';
      candidateId: string;
      text: string;
      releases: string | null;
      // 「누가」 지목이 그 사람의 안 풀린 레드헤링을 터뜨린 경우 그 id.
      viaHerring: string | null;
    }
  | { kind: 'short'; candidateId: string; missing: number }
  | { kind: 'confirmed'; candidateId: string; opensActTwo: boolean };

export function judgePress(
  index: MasterIndex,
  state: HypothesisState,
  slot: HypothesisSlot,
  // 지금 앞에 앉은 사람의 마스터 id(CH##).
  respondentId: string,
  // 엔진이 넘긴다: 이 사람의 안 풀린 레드헤링이 있으면 그 해소문.
  unclearedHerring: (
    characterId: string,
  ) => { id: string; text: string } | null,
): HypothesisJudgement {
  const current = slotOf(state.completed_actions, slot);
  if (!current) return { kind: 'empty' };
  if (listOf(state.completed_actions, CONFIRMED, slot).length) {
    return { kind: 'already' };
  }

  if (slot === 'who') {
    if (current.id !== respondentId) {
      return { kind: 'wrong_respondent', ownerId: current.id };
    }
    if (current.id === index.responsibleCharacterId) {
      return grade(current, whoEvidenceFor(index), state);
    }
    const herring = unclearedHerring(current.id);
    if (herring) {
      return {
        kind: 'refuted',
        candidateId: current.id,
        text: herring.text,
        releases: null,
        viaHerring: herring.id,
      };
    }
    const own = index.suspectRefutations[current.id];
    return {
      kind: 'refuted',
      candidateId: current.id,
      text: own?.text || '',
      releases: own?.releases || null,
      viaHerring: null,
    };
  }

  const candidate = listFor(index, slot).find((item) => item.id === current.id);
  if (!candidate) return { kind: 'empty' };
  if (candidate.refutedBy && candidate.refutedBy !== respondentId) {
    return { kind: 'wrong_respondent', ownerId: candidate.refutedBy };
  }
  if (candidate.truth) return grade(current, candidate.evidenceFor, state);
  return {
    kind: 'refuted',
    candidateId: candidate.id,
    text: candidate.refutation,
    releases: candidate.refutationReleases || null,
    viaHerring: null,
  };
}

// 정답 후보. **손에 든 카드 중 하나라도** 근거 목록에 있으면 확정 — 전부
// 요구하면 다시 조합 맞추기가 된다(docs/offline-deduction.md 5장 기본값).
//
// 한때 이 자리에서 「플레이어가 칸에 건 카드」를 봤다(`basis`). 그런데 그
// 고르는 동작이 **증거 제시와 똑같은 제스처**라 두 행동이 겹쳐 읽혔고
// (2026-09 사용자 지적), 「하나라도 맞으면」이므로 손에 든 것을 다 걸면
// 그냥 통과라서 **고르는 행위가 판정에 아무 영향도 주지 않았다**. 그래서
// 근거 걸기를 통째로 없애고 손에 든 것으로 본다(2026-09 사용자 결정) —
// 1막은 고르는 막, 2막은 내미는 막이 되어 제스처가 하나씩으로 갈린다.
function grade(
  current: { id: string },
  evidenceFor: string[],
  state: HypothesisState,
): HypothesisJudgement {
  const hit = evidenceFor.some((id) =>
    state.acquired_information.includes(id),
  );
  if (hit) {
    return { kind: 'confirmed', candidateId: current.id, opensActTwo: false };
  }
  // 몇 장 모자란지만 — 무엇인지는 말하지 않는다. 손에 없는 근거만 센다.
  const missing = evidenceFor.filter(
    (id) => !state.acquired_information.includes(id),
  ).length;
  return {
    kind: 'short',
    candidateId: current.id,
    missing: Math.max(1, missing || 1),
  };
}

// 확정 뒤 2막이 열리는지는 마커를 적은 다음에 봐야 하므로 따로 묻는다.
export function wouldOpenActTwo(
  state: HypothesisState,
  slot: HypothesisSlot,
): boolean {
  return HYPOTHESIS_SLOTS.every(
    (other) =>
      other === slot ||
      listOf(state.completed_actions, CONFIRMED, other).length > 0,
  );
}
