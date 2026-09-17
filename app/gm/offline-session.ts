// Turn orchestration for the offline game, kept out of app/game.ts.
//
// Deliberately takes everything it needs as arguments and imports nothing
// from game.ts: the offline mode gets to grow without either widening game.ts's
// exports (which would weaken the AI game's encapsulation) or introducing an
// import cycle. game.ts keeps the parts that are genuinely shared — loading a
// case, normalising a save, applying a GmResponse — and calls in here for
// everything that is specific to playing without a model.

import {
  type EngineCase,
  type EngineState,
  type OfflineGmResponse,
  runOfflineAction,
} from './offline-engine';

// One transcript entry, in the shape app/game.ts stores them. Assembled here
// rather than in game.ts so the caller only has to loop and push: which line
// goes before the narration and which after is a property of the turn, not of
// the save layer.
export type OfflineDialogue = {
  role: 'assistant' | 'user' | 'detective' | 'jiwoo';
  content: string;
  mode?: 'play' | 'meta' | 'case_close';
  acquired_cards?: string[];
  presented_evidence?: Array<{
    evidence_id: string;
    target_id: string | null;
    match_quality?: 'hit' | 'held' | 'irrelevant';
  }>;
  presented_evidence_outcome?: 'advanced' | 'no_change';
  location_cleared?: 'none' | 'done';
  timeline_notes?: Array<{ timeline_id: string | null; note: string }>;
};

export type OfflineTurnPlan = {
  gm: OfflineGmResponse;
  // The player's own line, the narration, and the two characters' beats, in
  // the order they should appear. The client sends an opaque action id, and
  // nobody wants to read "present|E03|N01" back in their play log, so the
  // player's line is the action's own label.
  dialogue: OfflineDialogue[];
  heardStatementIds: string[];
  completedActions: string[];
};

export function planOfflineTurn(
  selectedCase: EngineCase,
  state: EngineState,
  actionId: string,
  // Han Jiwoo speaking on literally every turn reads as scheduled rather than
  // reactive, so the same cooldown the model path applies is applied here —
  // except on a beat he should never sit out: something found, someone's
  // story moving under an evidence presentation, or a turn whose whole
  // content is the line itself (turn.jiwooEssential).
  turnsSinceJiwooSpoke: number,
  jiwooCooldownTurns: number,
): OfflineTurnPlan | null {
  const turn = runOfflineAction(selectedCase, state, actionId);
  if (!turn) return null;

  const forcedBeat =
    turn.gm.acquire.length > 0 ||
    // 엔진이 「이 줄이 이 턴의 내용이다」라고 표시한 자리. 카드도 단계도
    // 안 움직이지만 한지우의 한 줄이 곧 플레이어가 받는 정보다.
    turn.jiwooEssential === true ||
    // 전환점의 주고받기는 쿨다운을 타지 않는다. 그 자리는 두 사람이
    // 말하기로 정해 둔 자리라, 몇 턴 전에 말했다는 이유로 반쪽만 나가면
    // 대화가 끊긴 것으로 읽힌다.
    turn.gm.exchange.length > 0 ||
    turn.gm.npc_updates.some(
      (update) =>
        update.statement_stage && update.statement_stage !== 'initial',
    );

  const gm: OfflineGmResponse = {
    ...turn.gm,
    jiwoo_line:
      !forcedBeat && turnsSinceJiwooSpoke < jiwooCooldownTurns
        ? null
        : turn.gm.jiwoo_line,
  };

  const detective: OfflineDialogue | null = gm.detective_line
    ? { role: 'detective', content: gm.detective_line }
    : null;
  const dialogue: OfflineDialogue[] = [
    { role: 'user', content: turn.playerLine, mode: 'play' },
    ...(detective && gm.detective_line_position === 'before'
      ? [detective]
      : []),
    {
      role: 'assistant',
      content: gm.message,
      ...(gm.acquire.length && { acquired_cards: gm.acquire }),
      ...(gm.presented_evidence.length && {
        presented_evidence: gm.presented_evidence,
      }),
      ...(gm.timeline_notes.length && { timeline_notes: gm.timeline_notes }),
      ...(gm.presented_evidence_outcome && {
        presented_evidence_outcome: gm.presented_evidence_outcome,
      }),
      ...(turn.locationCleared && { location_cleared: turn.locationCleared }),
    },
    ...(detective && gm.detective_line_position === 'after' ? [detective] : []),
    ...(gm.jiwoo_line
      ? [{ role: 'jiwoo' as const, content: gm.jiwoo_line }]
      : []),
    // 'reply' 는 한지우 뒤다. 탐정이 받아치는 자리라 순서가 곧 내용이다.
    ...(detective && gm.detective_line_position === 'reply' ? [detective] : []),
    // 전환점의 주고받기. 배열 순서가 곧 말한 순서라 before/after/reply 규칙을
    // 타지 않는다 — 엔진이 이것을 실으면 detective_line/jiwoo_line 은 비운다.
    ...gm.exchange.map((item) => ({
      role: item.who as 'detective' | 'jiwoo',
      content: item.line,
    })),
  ];

  return {
    gm,
    dialogue,
    heardStatementIds: turn.heardStatementIds,
    completedActions: turn.completedActions,
  };
}

// The offline answer to GM mode: a plain read-back of what this session has
// established. It states only what the save already holds — where the detective
// is, who has been met, what is in the notebook, what has been put to whom —
// and never suggests what to do next.
export function offlineStatusSummary(
  selectedCase: EngineCase,
  state: EngineState,
): string {
  const locationName =
    selectedCase.locations.find((item) => item.id === state.current_location)
      ?.name || '알 수 없는 장소';
  const nameOf = (id: string | null) =>
    selectedCase.npcs.find((npc) => npc.id === id)?.name || null;
  const met = state.interviewed_characters
    .map((id) => nameOf(id))
    .filter(Boolean);
  const unmet = selectedCase.npcs
    .filter((npc) => !state.interviewed_characters.includes(npc.id))
    .map((npc) => npc.name);
  const acquired = state.acquired_information
    .map((id) => selectedCase.cards.find((card) => card.id === id)?.title)
    .filter(Boolean);
  const presented = state.presented_evidence.map((item) => {
    const title =
      selectedCase.cards.find((card) => card.id === item.evidence_id)?.title ||
      item.evidence_id;
    return `${title} → ${nameOf(item.target_id) || '대상 미지정'}`;
  });

  return [
    `현재 위치: ${locationName}`,
    `면담한 사람: ${met.length ? met.join(', ') : '없음'}`,
    `아직 만나지 않은 사람: ${unmet.length ? unmet.join(', ') : '없음'}`,
    `확보한 단서 ${acquired.length}건${acquired.length ? `: ${acquired.join(', ')}` : ''}`,
    `제시한 증거 ${presented.length}건${presented.length ? `: ${presented.join(' / ')}` : ''}`,
  ].join('\n');
}
