// The deterministic, no-API Game Master.
//
// Every case Master already carries fully authored, player-facing text for
// each thing a player can do: a location's observation_rules/detail_rules
// spell out the action AND its result, a character's initial_claims are
// their opening account verbatim, a testimony evidence's
// discovery_condition is literally a question to ask ("강지훈에게 어젯밤
// 점검 상황을 묻는다") and its content is the answer, and each
// contradiction_stages entry states exactly what the target admits once
// the required claims have been heard and the required evidence presented.
//
// So the offline GM does not have to write the case — it only has to pick
// the right authored text and stage it. That is what this module does:
// buildOfflineActionMenu() turns the Master rules reachable right now into
// a concrete list of buttons, and runOfflineAction() executes one of them
// into the same GmResponse shape the model path produces, so
// applyGmResponse()/stateView() downstream cannot tell the difference.
//
// Prose that Master does NOT author — arrival beats, Han Jiwoo's banter,
// the detective's reactive lines, an NPC's non-reaction to evidence that
// proves nothing against them — comes from the rotating pools at the
// bottom of this file. They are written to the same restraints
// systemPrompt() puts on the model (Jiwoo never selects a target, never
// closes a hypothesis, keeps 반존대 with the detective) because those
// restraints are about what the partner may say, not about who generates
// the sentence.

import {
  type ContradictionStageIndex,
  type MasterIndex,
  buildMasterIndex,
} from './master-index';

export type OfflineActionGroup =
  | '현장'
  | '인물'
  | '면담'
  | '증거 제시'
  | '이동'
  | '사건';

export type OfflineAction = {
  id: string;
  label: string;
  group: OfflineActionGroup;
  detail?: string;
  disabled?: boolean;
  hint?: string;
};

type EngineLocation = { id: string; name: string; description: string };
type EngineNpc = { id: string; name: string; role: string };
type EngineCard = {
  id: string;
  title: string;
  category: string;
  source: string;
  condition: string;
  summary: string;
};

export type EngineCase = {
  case_id: string;
  master: Record<string, unknown>;
  locations: EngineLocation[];
  npcs: EngineNpc[];
  cards: EngineCard[];
};

export type EngineState = {
  current_location: string;
  current_interview: string | null;
  interviewed_characters: string[];
  acquired_information: string[];
  presented_evidence: Array<{ evidence_id: string; target_id: string | null }>;
  npc_statement_stage: Record<string, string>;
  heard_claim_ids: string[];
  completed_actions: string[];
  full_dialogue_log: Array<unknown>;
  case_status: string;
};

export type OfflineGmResponse = {
  message: string;
  detective_line: string | null;
  detective_line_position: 'before' | 'after';
  jiwoo_line: string | null;
  jiwoo_line_position: 'before' | 'after';
  scene: { location_id: string; interview_character_id: string | null };
  acquire: string[];
  presented_evidence: Array<{ evidence_id: string; target_id: string | null }>;
  npc_updates: Array<{
    npc: string;
    status: string;
    statement_stage: string | null;
  }>;
  timeline_notes: string[];
  player_established: string[];
  scene_facts: Array<never>;
  memory_updates: string[];
  case_complete_candidate: boolean;
  final_judgement: string | null;
  tempo_self_check: { message_could_be_shorter: boolean };
};

export type OfflineTurn = {
  gm: OfflineGmResponse;
  // The human-readable sentence to store as the player's own line in the
  // transcript. The client sends an opaque action id; nobody wants to read
  // "inspect|L02|0" back in their own play log.
  playerLine: string;
  // Claim/fact ids this action let the player hear, and action ids that
  // must not be offered again. game.ts folds both into GameState.
  heardClaimIds: string[];
  completedActions: string[];
};

// ---------------------------------------------------------------------------
// Case index
// ---------------------------------------------------------------------------

type CaseIndex = {
  master: MasterIndex;
  structured: boolean;
  locationById: Map<string, EngineLocation>;
  npcById: Map<string, EngineNpc>;
  cardById: Map<string, EngineCard>;
  // CH0x -> N0x, matching buildMasterIndex()'s own renaming.
  npcLocation: Map<string, string>;
  // Testimony cards keyed by the NPC their discovery_condition addresses.
  questionsByNpc: Map<string, EngineCard[]>;
};

const indexCache = new Map<string, CaseIndex>();

function rawTextOf(selectedCase: EngineCase): string {
  const value = selectedCase.master?.raw_text;
  return typeof value === 'string' ? value : '';
}

// The NPC a testimony question is addressed to is the one named earliest in
// its discovery_condition — three cases across the library mention a second
// character inside the question itself ("진세아에게 그날 새벽 오태겸을 봤는지
// 묻는다"), and in every one of them the person being asked comes first.
function questionOwner(condition: string, npcs: EngineNpc[]): string | null {
  let bestId: string | null = null;
  let bestAt = Number.MAX_SAFE_INTEGER;
  for (const npc of npcs) {
    const at = condition.indexOf(npc.name);
    if (at >= 0 && at < bestAt) {
      bestAt = at;
      bestId = npc.id;
    }
  }
  return bestId;
}

// Master's raw_text sections, split the same way buildMasterIndex() splits
// them. A section runs from its own [NAME] header line to the next one.
function sectionBody(rawText: string, name: string): string {
  const headers = Array.from(rawText.matchAll(/^\[([A-Z_]+)\]\s*$/gm));
  for (let i = 0; i < headers.length; i += 1) {
    if (headers[i][1] !== name) continue;
    const start = (headers[i].index || 0) + headers[i][0].length;
    const end =
      i + 1 < headers.length
        ? headers[i + 1].index || rawText.length
        : rawText.length;
    return rawText.slice(start, end);
  }
  return '';
}

// Where each character actually is. buildMasterIndex() does not read this
// field, and without it every suspect would be reachable from every room,
// which both flattens the case and contradicts Master.
function presentLocationsFromRawText(rawText: string): Map<string, string> {
  const result = new Map<string, string>();
  let currentId = '';
  for (const line of sectionBody(rawText, 'CHARACTERS').split(/\r?\n/)) {
    const trimmed = line.trim();
    const header = trimmed.match(/^\[(CH[0-9]+)\]$/);
    if (header) {
      currentId = header[1].replace(/^CH/, 'N');
      continue;
    }
    const field = trimmed.match(/^present_location\s*:\s*(.+)$/);
    if (field && currentId) result.set(currentId, field[1].trim());
  }
  return result;
}

function buildCaseIndex(selectedCase: EngineCase): CaseIndex {
  const rawText = rawTextOf(selectedCase);
  const master = buildMasterIndex(rawText);
  const questionsByNpc = new Map<string, EngineCard[]>();

  for (const card of selectedCase.cards) {
    if (card.category !== 'testimony') continue;
    const owner = questionOwner(card.condition || '', selectedCase.npcs);
    if (!owner) continue;
    const bucket = questionsByNpc.get(owner) || [];
    bucket.push(card);
    questionsByNpc.set(owner, bucket);
  }

  return {
    master,
    structured: Object.keys(master.locations).length > 0,
    locationById: new Map(
      selectedCase.locations.map((item) => [item.id, item]),
    ),
    npcById: new Map(selectedCase.npcs.map((item) => [item.id, item])),
    cardById: new Map(selectedCase.cards.map((item) => [item.id, item])),
    npcLocation: presentLocationsFromRawText(rawText),
    questionsByNpc,
  };
}

// buildMasterIndex()'s rule reader treats the `detail_rules:` label as just
// another field of the observation_rules block, so every detail rule also
// comes back inside `observation` — which would list the same action twice,
// once as a look-around that finds nothing and once as the real inspection.
// The overlap is dropped here rather than in that shared parser, which the
// model-driven GM also reads. Both the menu and the runner go through this,
// so an `observe|<loc>|<i>` id always indexes the same list it was built from.
function locationRules(index: CaseIndex, locationId: string) {
  const rules = index.master.locations[locationId];
  const detail = rules?.detail || [];
  const detailActions = new Set(detail.map((rule) => rule.action));

  return {
    detail,
    observation: (rules?.observation || []).filter(
      (rule) => !detailActions.has(rule.action),
    ),
  };
}

function indexFor(selectedCase: EngineCase): CaseIndex {
  const key = `${selectedCase.case_id}:${rawTextOf(selectedCase).length}`;
  const cached = indexCache.get(key);
  if (cached) return cached;
  const built = buildCaseIndex(selectedCase);
  indexCache.set(key, built);
  return built;
}

// ---------------------------------------------------------------------------
// Korean particles
// ---------------------------------------------------------------------------

function hasBatchim(word: string): boolean {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function withObject(word: string): string {
  return `${word}${hasBatchim(word) ? '을' : '를'}`;
}

function withComitative(word: string): string {
  return `${word}${hasBatchim(word) ? '과' : '와'}`;
}

function withTopic(word: string): string {
  return `${word}${hasBatchim(word) ? '은' : '는'}`;
}

function withDirection(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const final = (code - 0xac00) % 28;
    if (final === 0 || final === 8) return `${word}로`;
  }
  return `${word}으로`;
}

// Fills a prose-pool template. Korean particles depend on the final consonant
// of the word in front of them, so the pools never spell a particle pair out —
// they use {topic}/{object}/{placeObject}, and this resolves each against the
// actual name, which is why no template can leave one unresolved.
function fill(
  template: string,
  values: { name?: string; place?: string; role?: string },
) {
  return template
    .replace(/\{topic\}/g, values.name ? withTopic(values.name) : '')
    .replace(/\{object\}/g, values.name ? withObject(values.name) : '')
    .replace(/\{name\}/g, values.name || '')
    .replace(/\{placeObject\}/g, values.place ? withObject(values.place) : '')
    .replace(/\{place\}/g, values.place || '')
    .replace(/\{role\}/g, values.role || '');
}

// ---------------------------------------------------------------------------
// Action menu
// ---------------------------------------------------------------------------

function hashOf(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100003;
  }
  return hash;
}

function done(state: EngineState, actionId: string): boolean {
  return state.completed_actions.includes(actionId);
}

// `requires` is free text in Master and is usually empty or "없음". The
// handful of real ones all read as a named person's cooperation ("한도윤의
// 협조"), so the only gate worth enforcing mechanically is: have we actually
// met that person yet. Anything else is shown normally rather than guessed at.
function requirementBlock(
  requires: string,
  selectedCase: EngineCase,
  state: EngineState,
): string | null {
  const text = (requires || '').trim();
  if (!text || text === '없음') return null;
  const named = selectedCase.npcs.find((npc) => text.includes(npc.name));
  if (!named) return null;
  if (state.interviewed_characters.includes(named.id)) return null;
  return `${withObject(named.name)} 먼저 만나야 한다`;
}

export function buildOfflineActionMenu(
  selectedCase: EngineCase,
  state: EngineState,
): OfflineAction[] {
  const index = indexFor(selectedCase);
  const actions: OfflineAction[] = [];
  const locationId = state.current_location;
  const location = index.locationById.get(locationId);
  const interviewId = state.current_interview;

  if (state.case_status === 'complete') {
    return [
      {
        id: 'close',
        label: '사건의 전말을 다시 읽는다',
        group: '사건',
      },
    ];
  }

  // --- Interview actions, when someone is actually in front of the detective.
  if (interviewId) {
    const npc = index.npcById.get(interviewId);
    if (npc) {
      for (const card of index.questionsByNpc.get(interviewId) || []) {
        if (state.acquired_information.includes(card.id)) continue;
        actions.push({
          id: `ask|${card.id}`,
          label: card.condition || `${npc.name}에게 묻는다`,
          group: '면담',
        });
      }

      // Everything in the notebook, every time — nothing is filtered out for
      // having been shown to this person already. A contradiction stage can
      // need a claim the player only hears later, so evidence that drew a
      // shrug an hour ago can be the exact thing that breaks the story now;
      // hiding it would make those cases unwinnable. Filtering to only the
      // still-useful ones would fix that too, but the surviving buttons
      // would then quietly mark which evidence still matters, which is the
      // puzzle. So: no filter, and the notebook's 제시한 증거 list stays the
      // record of what has already been tried.
      for (const cardId of state.acquired_information) {
        const card = index.cardById.get(cardId);
        if (!card) continue;
        actions.push({
          id: `present|${cardId}|${interviewId}`,
          label: `${withObject(card.title)} ${npc.name}에게 제시한다`,
          group: '증거 제시',
          detail: card.summary,
        });
      }

      actions.push({
        id: 'leave',
        label: `${withComitative(npc.name)}의 대화를 마친다`,
        group: '면담',
      });
    }
  }

  // --- Scene actions at the current location.
  if (index.structured) {
    const rules = locationRules(index, locationId);
    for (const [i, rule] of rules.observation.entries()) {
      const id = `observe|${locationId}|${i}`;
      if (done(state, id)) continue;
      actions.push({
        id,
        label: rule.action || `${location?.name || '이곳'}을 살펴본다`,
        group: '현장',
      });
    }
    for (const [i, rule] of rules.detail.entries()) {
      const id = `inspect|${locationId}|${i}`;
      if (done(state, id)) continue;
      if (
        rule.evidenceId &&
        state.acquired_information.includes(rule.evidenceId)
      ) {
        continue;
      }
      const blocked = requirementBlock(rule.requires, selectedCase, state);
      actions.push({
        id,
        label: rule.action,
        group: '현장',
        disabled: Boolean(blocked),
        hint: blocked || undefined,
      });
    }
  } else {
    // Legacy cases (CASE014) predate the structured Master format and have
    // no rules to read — their cards still carry a condition written as a
    // player action plus the source it belongs to, which is enough to build
    // the same menu from.
    for (const card of selectedCase.cards) {
      if (state.acquired_information.includes(card.id)) continue;
      if (!card.condition) continue;
      const belongsHere = card.source === locationId;
      const belongsToInterview = Boolean(
        interviewId && card.source === interviewId,
      );
      const unscoped =
        !index.locationById.has(card.source) && !index.npcById.has(card.source);
      if (!belongsHere && !belongsToInterview && !unscoped) continue;
      actions.push({
        id: `legacy|${card.id}`,
        label: card.condition,
        group: belongsToInterview ? '면담' : '현장',
      });
    }
  }

  // --- People standing here.
  for (const npc of selectedCase.npcs) {
    if (npc.id === interviewId) continue;
    // Han Jiwoo is the detective's partner, not someone to go and
    // interview. She is listed as an NPC in the legacy CASE014 data, where
    // there are no present_location rules to keep her out of this list.
    if (npc.name === '한지우') continue;
    const npcLocation = index.npcLocation.get(npc.id);
    if (index.structured && npcLocation && npcLocation !== locationId) continue;
    actions.push({
      id: `talk|${npc.id}`,
      label: state.interviewed_characters.includes(npc.id)
        ? `${npc.name}에게 다시 말을 건다`
        : `${withObject(npc.name)} 만나 이야기를 듣는다`,
      group: '인물',
      detail: npc.role,
    });
  }

  // --- Movement.
  for (const place of selectedCase.locations) {
    if (place.id === locationId) continue;
    actions.push({
      id: `move|${place.id}`,
      label: `${withDirection(place.name)} 이동한다`,
      group: '이동',
      detail: place.description,
    });
  }

  actions.push({
    id: 'close',
    label: '사건을 종결한다',
    group: '사건',
  });

  return actions;
}

export function findOfflineAction(
  selectedCase: EngineCase,
  state: EngineState,
  actionId: string,
): OfflineAction | null {
  return (
    buildOfflineActionMenu(selectedCase, state).find(
      (action) => action.id === actionId && !action.disabled,
    ) || null
  );
}

// ---------------------------------------------------------------------------
// Running an action
// ---------------------------------------------------------------------------

function emptyResponse(state: EngineState): OfflineGmResponse {
  return {
    message: '',
    detective_line: null,
    detective_line_position: 'after',
    jiwoo_line: null,
    jiwoo_line_position: 'after',
    scene: {
      location_id: state.current_location,
      interview_character_id: state.current_interview,
    },
    acquire: [],
    presented_evidence: [],
    npc_updates: [],
    timeline_notes: [],
    player_established: [],
    scene_facts: [],
    memory_updates: [],
    case_complete_candidate: false,
    final_judgement: null,
    tempo_self_check: { message_could_be_shorter: false },
  };
}

function joinParagraphs(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

// Which contradiction stage, if any, this presentation completes. A stage
// fires only when every claim it needs has actually been heard and every
// piece of evidence it names has actually been put in front of this person
// — the same gate Master states, checked instead of judged.
function firingStage(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  evidenceId: string,
): ContradictionStageIndex | null {
  const presented = new Set(
    state.presented_evidence
      .filter((item) => item.target_id === npcId)
      .map((item) => item.evidence_id),
  );
  presented.add(evidenceId);
  const heard = new Set(state.heard_claim_ids);

  for (const stage of index.master.contradictionStages) {
    if (stage.targetCharacter !== npcId) continue;
    if (done(state, `stage|${stage.id}`)) continue;
    if (!stage.requiresPresentedEvidenceIds.includes(evidenceId)) continue;
    if (
      !stage.requiresPresentedEvidenceIds.every((id) => presented.has(id)) ||
      !stage.requiresHeardClaimIds.every((id) => heard.has(id))
    ) {
      continue;
    }
    return stage;
  }
  return null;
}

export function runOfflineAction(
  selectedCase: EngineCase,
  state: EngineState,
  actionId: string,
): OfflineTurn | null {
  const action = findOfflineAction(selectedCase, state, actionId);
  if (!action) return null;

  const index = indexFor(selectedCase);
  const seed = state.full_dialogue_log.length + hashOf(actionId);
  const gm = emptyResponse(state);
  const turn: OfflineTurn = {
    gm,
    playerLine: action.label,
    heardClaimIds: [],
    completedActions: [],
  };
  const [kind, first, second] = actionId.split('|');

  if (kind === 'move') {
    const place = index.locationById.get(first);
    if (!place) return null;
    gm.scene = { location_id: place.id, interview_character_id: null };
    gm.message = joinParagraphs([
      `${withDirection(place.name)} 자리를 옮긴다.`,
      place.description,
    ]);
    gm.jiwoo_line = pick(JIWOO_ARRIVAL, seed);
    return turn;
  }

  if (kind === 'leave') {
    const npc = second ? index.npcById.get(second) : null;
    const current =
      npc ||
      (state.current_interview
        ? index.npcById.get(state.current_interview)
        : null);
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: null,
    };
    gm.message = current
      ? `${withTopic(current.name)} 더 말을 잇지 않는다. 탐정은 한 걸음 물러선다.`
      : '탐정은 한 걸음 물러선다.';
    gm.jiwoo_line = pick(JIWOO_LEAVE, seed);
    return turn;
  }

  if (kind === 'observe') {
    const rule = locationRules(index, first).observation[Number(second)];
    if (!rule) return null;
    const place = index.locationById.get(first);
    gm.scene = {
      location_id: first,
      interview_character_id: state.current_interview,
    };
    gm.message = joinParagraphs([
      fill(pick(LEAD_OBSERVE, seed), { place: place?.name || '주변' }),
      rule.result,
    ]);
    gm.jiwoo_line = pick(JIWOO_OBSERVE, seed);
    turn.completedActions.push(actionId);
    return turn;
  }

  if (kind === 'inspect') {
    const rule = locationRules(index, first).detail[Number(second)];
    if (!rule) return null;
    const card = rule.evidenceId ? index.cardById.get(rule.evidenceId) : null;
    const place = index.locationById.get(first);
    gm.scene = {
      location_id: first,
      interview_character_id: state.current_interview,
    };
    gm.message = joinParagraphs([pick(LEAD_INSPECT, seed), rule.result]);
    turn.completedActions.push(actionId);
    if (card) {
      gm.acquire.push(card.id);
      gm.timeline_notes.push(`${place?.name || '현장'}에서 ${card.title} 확인`);
      gm.jiwoo_line = pick(JIWOO_DISCOVERY, seed);
      gm.detective_line = pick(DETECTIVE_DISCOVERY, seed);
      gm.detective_line_position = 'before';
    } else {
      gm.jiwoo_line = pick(JIWOO_NOTHING, seed);
    }
    return turn;
  }

  if (kind === 'legacy') {
    const card = index.cardById.get(first);
    if (!card) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: index.npcById.has(card.source)
        ? card.source
        : state.current_interview,
    };
    gm.message = joinParagraphs([pick(LEAD_INSPECT, seed), card.summary]);
    gm.acquire.push(card.id);
    gm.timeline_notes.push(card.title.replace(/_/g, ' '));
    gm.jiwoo_line = pick(JIWOO_DISCOVERY, seed);
    turn.completedActions.push(actionId);
    return turn;
  }

  if (kind === 'talk') {
    const npc = index.npcById.get(first);
    if (!npc) return null;
    const knowledge = index.master.npcs[first];
    const firstMeeting = !state.interviewed_characters.includes(first);
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: first,
    };
    gm.npc_updates.push({
      npc: first,
      status: 'interviewed',
      statement_stage: state.npc_statement_stage[first] || 'initial',
    });

    if (firstMeeting && knowledge) {
      const range = knowledge.initialInterviewRange.length
        ? knowledge.initialInterviewRange
        : knowledge.initialClaims.map((claim) => claim.claimId);
      const spoken = knowledge.initialClaims.filter((claim) =>
        range.includes(claim.claimId),
      );
      gm.message = joinParagraphs([
        fill(pick(LEAD_FIRST_MEETING, seed), {
          name: npc.name,
          role: npc.role,
        }),
        ...spoken.map((claim) => claim.content),
      ]);
      turn.heardClaimIds.push(...spoken.map((claim) => claim.claimId));
      gm.timeline_notes.push(`${npc.name} 면담`);
      gm.jiwoo_line = pick(JIWOO_INTERVIEW_START, seed);
    } else {
      gm.message = joinParagraphs([
        `${withTopic(npc.name)} 다시 탐정 쪽으로 몸을 돌린다.`,
        pick(NPC_REENGAGE, seed),
      ]);
      gm.jiwoo_line = pick(JIWOO_REENGAGE, seed);
    }
    return turn;
  }

  if (kind === 'ask') {
    const card = index.cardById.get(first);
    if (!card) return null;
    const ownerId = questionOwner(card.condition || '', selectedCase.npcs);
    const npc = ownerId ? index.npcById.get(ownerId) : null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: ownerId || state.current_interview,
    };
    gm.message = joinParagraphs([
      npc ? fill(pick(LEAD_ASK, seed), { name: npc.name }) : null,
      card.summary,
    ]);
    gm.acquire.push(card.id);
    gm.timeline_notes.push(
      npc ? `${npc.name} 진술: ${card.title}` : card.title,
    );
    gm.jiwoo_line = pick(JIWOO_TESTIMONY, seed);
    return turn;
  }

  if (kind === 'present') {
    const card = index.cardById.get(first);
    const npc = index.npcById.get(second);
    if (!card || !npc) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    gm.presented_evidence.push({ evidence_id: card.id, target_id: npc.id });

    const stage = firingStage(index, state, npc.id, card.id);
    if (stage) {
      gm.message = joinParagraphs([
        fill(pick(LEAD_STAGE_BREAK, seed), { name: npc.name }),
        stage.release,
      ]);
      gm.npc_updates.push({
        npc: npc.id,
        status: 'interviewed',
        statement_stage: stage.toStage || null,
      });
      gm.timeline_notes.push(`${npc.name}의 진술이 달라짐`);
      gm.detective_line = pick(DETECTIVE_BREAK, seed);
      gm.detective_line_position = 'before';
      gm.jiwoo_line = pick(JIWOO_BREAK, seed);
      turn.completedActions.push(`stage|${stage.id}`);
      if (stage.releaseClaimOrFactId) {
        turn.heardClaimIds.push(stage.releaseClaimOrFactId);
      }
    } else {
      gm.message = joinParagraphs([
        fill(pick(NPC_DEFLECT, seed), { name: npc.name }),
      ]);
      gm.jiwoo_line = pick(JIWOO_DEFLECT, seed);
    }
    return turn;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Non-Master prose
//
// Rotated by turn count so the same beat twenty minutes apart does not come
// back word for word. Every Jiwoo line here obeys the same limits the model
// path puts on her: she reacts, rephrases, or names something already in
// plain sight, and never picks the next target or declares anything cleared.
// ---------------------------------------------------------------------------

function pick(pool: string[], seed: number): string {
  return pool[Math.abs(seed) % pool.length];
}

const LEAD_OBSERVE = [
  '{place} 안을 천천히 훑는다.',
  '탐정은 걸음을 멈추고 {placeObject} 눈으로 한 바퀴 돈다.',
  '{place}의 공기가 한 박자 느리게 흐른다.',
  '탐정은 {place} 한가운데에 서서 시선을 옮긴다.',
  '{placeObject} 눈에 담는 데 잠깐 시간이 걸린다.',
  '탐정은 {placeObject} 구석부터 훑어 올라간다.',
];

// The action the player picked is already shown as their own line, so a
// turn never opens by restating it — it opens on what happens next.
const LEAD_INSPECT = [
  '탐정은 곧장 그쪽으로 손을 뻗는다.',
  '가까이 다가가 각도를 바꿔 본다.',
  '탐정은 무릎을 굽히고 들여다본다.',
  '손끝이 한 번 멈췄다가 다시 움직인다.',
  '탐정은 그것부터 집어 든다.',
  '한 손으로 조심스럽게 들어 올린다.',
];

const LEAD_ASK = [
  '{topic} 잠깐 말을 고른다.',
  '{topic} 한 박자 늦게 대답한다.',
  '{topic} 시선을 내렸다가 다시 든다.',
  '{topic} 기억을 더듬는 표정이다.',
  '{topic} 별다른 망설임 없이 대답한다.',
  '{topic} 하던 말을 끊고 이쪽을 본다.',
];

const LEAD_FIRST_MEETING = [
  '{name}, {role}. 탐정이 다가서자 하던 일을 멈춘다.',
  '{name}, {role}. 이쪽을 한 번 보고는 자세를 고쳐 앉는다.',
  '{name}, {role}. 말을 걸기 전부터 이미 이쪽을 의식하고 있었다.',
  '{name}, {role}. 짧게 목례를 하고는 입을 연다.',
  '{name}, {role}. 손에 쥔 것을 내려놓고 탐정 쪽으로 돌아선다.',
];

const LEAD_STAGE_BREAK = [
  '{name}의 표정이 한 번에 굳는다.',
  '{name}의 말이 중간에서 끊긴다.',
  '{topic} 그것을 한참 내려다본다. 대답이 늦어진다.',
  '{name}의 손끝이 멈춘다. 앞서 하던 말과 이어지지 않는다.',
  '{topic} 숨을 한 번 고르고 나서야 다시 입을 연다.',
];

const NPC_DEFLECT = [
  '{topic} 그것을 잠깐 보고는 고개를 젓는다. "그건 제가 말씀드릴 수 있는 게 아닌데요."',
  '{name}의 표정은 크게 달라지지 않는다. "그래서요?"',
  '{topic} 눈길을 한 번 주고 시선을 거둔다. "처음 봅니다."',
  '{topic} 팔짱을 고쳐 낀다. "그게 저랑 무슨 상관인지 모르겠는데요."',
  '{topic} 대답 대신 짧게 웃는다. "아까 드린 말씀에서 더 보탤 건 없어요."',
  '{topic} 그것을 밀어 놓듯 시선을 피한다. "저한테 물어볼 일은 아닌 것 같습니다."',
];

const NPC_REENGAGE = [
  '"또 뭐 여쭤보실 게 있나요."',
  '"아까 말씀드린 게 전부인데요."',
  '"...네. 말씀하세요."',
  '"오래 걸리나요? 정리할 게 남아서요."',
  '"할 얘기가 더 남았어요?"',
];

const JIWOO_ARRIVAL = [
  '"여기서부터는 제가 못 따라가는 척이라도 해야 하나요."',
  '"먼지 냄새가 다르네요. 그건 저도 알겠어요."',
  '"들어오자마자 다 뒤지실 거 아니죠? 한 번만 물어봤어요."',
  '"자리는 바뀌었는데 표정은 그대로네요."',
  '"여기 있는 것들, 일단 눈으로만 세어 볼게요."',
  '"신발 조심해요. 아까 그 얼룩 또 밟으면 제가 못 본 척 못 해요."',
  '"여기는 좀 춥네요. 오래 있을 건 아니죠?"',
  '"문 닫을까요? 소리가 다 새어 나가는데."',
  '"저는 여기 서 있을게요. 동선 안 밟으려고요."',
  '"방금 누가 나간 것 같은데, 제가 잘못 봤을 수도 있고요."',
];

const JIWOO_OBSERVE = [
  '"적어는 뒀어요. 무슨 뜻인지는 아직 안 물어볼게요."',
  '"이 정도면 눈에 띄는 편이죠. 그 다음은 탐정님 몫이고요."',
  '"보시는 동안 저는 손 안 댔어요. 증명해 드릴까요?"',
  '"금방 찾으시네요. 평소엔 안경도 못 찾으시면서."',
  '"그냥 넘어가도 되는 건지는 제가 판단할 일이 아니고요."',
  '"기록할게요. 어차피 나중에 저한테 물어보실 거잖아요."',
  '"눈에 걸리는 게 하나 있긴 한데, 말씀은 안 드릴게요. 규칙이잖아요."',
  '"제가 보기엔 다 비슷해 보여요. 그래서 탐정님이 계신 거고요."',
  '"천천히 보세요. 저 어디 안 가요."',
];

const JIWOO_NOTHING = [
  '"오늘은 여기까지인가 보네요."',
  '"헛걸음도 일이죠, 뭐."',
  '"이런 날도 있어요. 저는 이미 익숙해요."',
  '"표정 관리 하세요. 다 보여요."',
  '"아무것도 안 나온 것도 적어 둘게요. 나중에 헷갈리시니까."',
];

const JIWOO_DISCOVERY = [
  '"...이건 그냥 넘기면 안 되겠네요."',
  '"손 대기 전에 한 번만 더 보실래요? 제가 붙잡고 있을게요."',
  '"찾으셨네요. 축하는 이따 하고요."',
  '"방금 표정 바뀌신 거 아세요?"',
  '"이런 건 또 잘 찾으시네요. 어제 우산은 못 찾으셨으면서."',
  '"적어 뒀어요. 무슨 의미인지는 안 물어볼게요, 어차피 말 안 해 주실 거."',
];

const DETECTIVE_DISCOVERY = [
  '"잠깐."',
  '"이거 좀 봐."',
  '"...아직 아무 말도 하지 마."',
  '"이건 적어 둬."',
  '"여기 있었네."',
  '"한지우."',
];

const JIWOO_INTERVIEW_START = [
  '"말씀은 편하게 하셔도 돼요. 받아 적는 건 제 일이니까."',
  '"탐정님, 표현은 제가 조금 고쳐서 여쭤볼게요."',
  '"천천히 하셔도 됩니다. 저희도 급한 건 아니에요."',
  '"자리부터 하나 내드릴게요."',
  '"방금 그 말투 그대로 물어보실 거예요? ...알겠어요."',
];

const JIWOO_REENGAGE = [
  '"같은 걸 두 번 물으면 대답이 달라지기도 하죠. 안 그러기도 하고요."',
  '"아까랑 앉은 자세가 다르네요. 그것만 말씀드릴게요."',
  '"한 번 더 여쭙는 거라고 제가 말씀드릴게요. 그게 덜 껄끄러워요."',
  '"또 오셨다고 싫어하진 않으시는 것 같은데요."',
];

const JIWOO_TESTIMONY = [
  '"방금 그 부분만 다시 확인해도 될까요."',
  '"말끝이 조금 흐려졌는데, 제가 잘못 들은 걸 수도 있고요."',
  '"그건 기억하시네요."',
  '"받아 적었어요. 토씨 그대로요."',
  '"시간 얘기가 나왔으니 그것만 따로 표시해 둘게요."',
  '"...네. 여기까지만 적을게요."',
];

const JIWOO_DEFLECT = [
  '"기대하신 반응은 아니었나 봐요."',
  '"저 표정은 제가 회사 다닐 때 많이 봤어요."',
  '"안 통했다고 없던 일이 되는 건 아니니까요."',
  '"일단 제시했다는 것만 적어 둘게요."',
  '"다음 말씀 있으시면 지금 하셔도 돼요. 제가 물 한 잔 드릴 동안."',
];

const JIWOO_BREAK = [
  '"...방금, 앞에서 하신 말이랑 다르죠."',
  '"제가 아까 받아 적은 게 있는데, 그거 지금 꺼낼까요?"',
  '"천천히 하셔도 돼요. 어차피 다 적고 있으니까."',
  '"말 바뀐 부분만 표시해 뒀어요. 나머지는 그대로 두고요."',
  '"숨 한 번 쉬시고요."',
];

const DETECTIVE_BREAK = [
  '"이건 어떻게 설명하시겠습니까."',
  '"아까 하신 말씀과는 맞지 않는데요."',
  '"다시 여쭙겠습니다."',
  '"천천히 보셔도 됩니다."',
  '"이래도 같은 말씀이십니까."',
];

const JIWOO_LEAVE = [
  '"잘 나오셨어요. 더 있었으면 물 한 잔 더 드릴 뻔했어요."',
  '"여기까지 적었어요."',
  '"뒤에서 계속 보고 있는 것 같은데, 돌아보진 마세요."',
  '"다음은 어디로 가실 건지는 안 물어볼게요."',
];
