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
import {
  effectiveNpcLocation,
  summonedNow,
  summonMarker,
} from './offline-summon';

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
  // Master statement ids (S-CHxx-nn claims, F-CHxx-nn facts) that have
  // actually been said to the detective. This is app/game.ts's own field —
  // the offline GM records into it rather than keeping a parallel list,
  // because contradiction_stages gate on exactly this and two lists that
  // mean the same thing eventually disagree.
  heard_statements: string[];
  completed_actions: string[];
  full_dialogue_log: Array<{ content?: string }>;
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
  presented_evidence: Array<{
    evidence_id: string;
    target_id: string | null;
    // 이 카드가 이 사람에게 지금 쓸 값어치가 있었는가. 서버 검증 단계에서
    // 계산하는 AI 경로와 달리(그 단계를 오프라인은 지나지 않는다) 여기서
    // 직접 매긴다 — 'hit'은 지금 열려 있는 단계가 요구하는 카드, 'held'는
    // 요구하긴 하는데 앞 단계가 아직 안 깨진 것, 'irrelevant'는 이 사람의
    // 어느 단계도 요구하지 않는 것이다.
    match_quality?: 'hit' | 'held' | 'irrelevant';
  }>;
  presented_evidence_outcome?: 'advanced' | 'no_change';
  npc_updates: Array<{
    npc: string;
    status: string;
    statement_stage: string | null;
    stated_claim_ids: string[];
  }>;
  timeline_notes: Array<{ timeline_id: string | null; note: string }>;
  player_established: string[];
  scene_facts: Array<never>;
  memory_updates: string[];
  surfaced_red_herring_ids: string[];
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
  // Statement ids this action actually put into someone's mouth, and action
  // ids that must not be offered again. game.ts folds both into GameState.
  heardStatementIds: string[];
  completedActions: string[];
  // 이 방에 더 뒤질 것이 남지 않았다는 표시. 말할 값어치가 있는 순간에만
  // 실린다 — 방에 막 들어왔거나, 방금 이 방의 마지막 하나를 찾았거나.
  locationCleared?: 'none' | 'done';
};

// ---------------------------------------------------------------------------
// Case index
// ---------------------------------------------------------------------------

type CaseIndex = {
  master: MasterIndex;
  locationById: Map<string, EngineLocation>;
  npcById: Map<string, EngineNpc>;
  cardById: Map<string, EngineCard>;
  // CH0x -> N0x, matching buildMasterIndex()'s own renaming.
  npcLocation: Map<string, string>;
  // Testimony cards keyed by the NPC their discovery_condition addresses.
  questionsByNpc: Map<string, EngineCard[]>;
};

const indexCache = new Map<string, CaseIndex>();

function npcLocationNow(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): string | undefined {
  return effectiveNpcLocation(
    index.npcLocation.get(npcId),
    state.completed_actions,
    npcId,
  );
}

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
    locationById: new Map(
      selectedCase.locations.map((item) => [item.id, item]),
    ),
    npcById: new Map(selectedCase.npcs.map((item) => [item.id, item])),
    cardById: new Map(selectedCase.cards.map((item) => [item.id, item])),
    npcLocation: presentLocationsFromRawText(rawText),
    questionsByNpc,
  };
}

// A location's rules, straight from the shared index. There used to be a
// de-duplication pass here: buildMasterIndex()'s rule reader treated the
// `detail_rules:` label as another field of the observation_rules block, so
// every detail rule came back inside `observation` too and the same action was
// listed twice. main fixed that at the source (SIBLING_SECTION_HEADERS in
// extractRuleGroups), and re-measuring the whole corpus after the rebase —
// 307 cases, 1,564 locations — finds zero duplicates, so the workaround is
// gone. Both the menu and the runner still go through here, so an
// `observe|<loc>|<i>` id always indexes the same list it was built from.
function locationRules(index: CaseIndex, locationId: string) {
  const rules = index.master.locations[locationId];

  return { observation: rules?.observation || [], detail: rules?.detail || [] };
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

function withSubject(word: string): string {
  return `${word}${hasBatchim(word) ? '이' : '가'}`;
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
  values: { name?: string; place?: string; role?: string; count?: string },
) {
  return template
    .replace(/\{count\}/g, values.count || '')
    .replace(/\{topic\}/g, values.name ? withTopic(values.name) : '')
    .replace(/\{object\}/g, values.name ? withObject(values.name) : '')
    .replace(/\{name\}/g, values.name || '')
    .replace(/\{placeObject\}/g, values.place ? withObject(values.place) : '')
    .replace(/\{placeTopic\}/g, values.place ? withTopic(values.place) : '')
    .replace(
      /\{placeDirection\}/g,
      values.place ? withDirection(values.place) : '',
    )
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
      // 피해자가 어떤 사람이었나. 관계를 묻는 것과는 다른 질문이고, 이것도
      // 사건이 바뀌어도 늘 나온다.
      const victim = victimOf(index);
      if (
        victim &&
        !done(state, `victim|${interviewId}`) &&
        victimAnswerFor(index, state, interviewId)
      ) {
        actions.push({
          id: `victim|${interviewId}`,
          label: `${npc.name}에게 ${withSubject(victim.name)} 어떤 사람이었는지 묻는다`,
          group: '면담',
        });
      }
      // 같은 부류의 또 하나 — 사건 당시 어디 있었나. 한 번만 뜬다.
      if (!done(state, `alibi|${interviewId}`) && alibiClaimFor(index, state, interviewId)) {
        actions.push({
          id: `alibi|${interviewId}`,
          label: `${npc.name}에게 사건 당시 어디에 있었는지 묻는다`,
          group: '면담',
        });
      }
      // 사건이 바뀌어도 추리물이면 늘 하게 되는 질문 — 피해자와 어떤 사이였나.
      // Master의 relationships가 그 답을 이미 갖고 있고(CASE294는 관계 4개 중
      // 3개가 피해자와의 관계다), nature/public_face는 "누구에게 물어도 나오는
      // 공개 정보"라 여기서 그대로 내보낼 수 있다. private_strain은 싣지
      // 않는다 — 그건 discovery_condition을 타고 나오는 것이고, 실제로 대부분
      // 그 인물의 knows와 같은 사실이라 여기서 꺼내면 두 번 말하게 된다.
      for (const rel of relationshipsOf(index, interviewId)) {
        if (done(state, `rel|${rel.id}`)) continue;
        const other = relationshipOther(index, rel, interviewId);
        if (!other) continue;
        actions.push({
          id: `relation|${rel.id}|${interviewId}`,
          label: `${npc.name}에게 ${withComitative(other)} 어떤 사이였는지 묻는다`,
          group: '면담',
        });
      }
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
  const rules = locationRules(index, locationId);
  for (const [i, rule] of rules.observation.entries()) {
    const id = `observe|${locationId}|${i}`;
    if (done(state, id)) continue;
    actions.push({
      id,
      label: rule.action || `${withObject(location?.name || '이곳')} 살펴본다`,
      group: '현장',
    });
  }
  // 진짜 조사 대상과 헛수고가 될 자리를 한 통에 담았다가 섞어서 내놓는다.
  // 뒤에 덧붙이기만 하면 헛것이 늘 목록 맨 아래에 모여서, 섞어 둔 것이
  // 순서만 보고 드러난다. 정렬 키는 사건·장소·대상이 정해진 해시라 같은
  // 방에 다시 들어와도 순서가 흔들리지 않는다 — 매번 바뀌면 플레이어가
  // 방을 기억하는 방식이 무너진다.
  const sceneActions: OfflineAction[] = [];
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
    sceneActions.push({
      id,
      label: rule.action,
      group: '현장',
      disabled: Boolean(blocked),
      hint: blocked || undefined,
    });
  }
  for (const [i, target] of probeTargetsAt(index, locationId).entries()) {
    const id = `probe|${locationId}|${i}`;
    if (done(state, id)) continue;
    sceneActions.push({
      id,
      label: `${withObject(target)} 살펴본다`,
      group: '현장',
    });
  }
  sceneActions.sort(
    (a, b) =>
      hashOf(`${selectedCase.case_id}|${a.id}`) -
      hashOf(`${selectedCase.case_id}|${b.id}`),
  );
  actions.push(...sceneActions);

  // --- People standing here, plus the one the detective can have fetched.
  const summoned = summonedNow(state.completed_actions);
  for (const npc of selectedCase.npcs) {
    if (npc.id === interviewId) continue;
    const npcLocation = npcLocationNow(index, state, npc.id);
    if (npcLocation && npcLocation !== locationId) {
      // 한지우 only fetches someone the detective has already sat down with:
      // a first meeting stays where Master wrote it, so the map still has to
      // be walked before it can be shortcut. Not offered mid-interview —
      // there is one 한지우 and he is standing right here.
      if (!interviewId && state.interviewed_characters.includes(npc.id)) {
        const away =
          summoned && summoned.npcId !== npc.id
            ? index.npcById.get(summoned.npcId)
            : null;
        actions.push({
          id: `summon|${npc.id}`,
          label: `한지우가 ${withObject(npc.name)} 데려온다`,
          group: '인물',
          detail: away
            ? `${npc.role} · ${withTopic(away.name)} 제자리로 돌아간다`
            : npc.role,
        });
      }
      continue;
    }
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

  // 종결은 여기에 없다. 정보판 바닥에 전용 버튼이 따로 있고, 거기서만
  // 확인을 한 번 거친다 — 행동 목록에도 같이 두면 되돌릴 수 없는 수가
  // "서랍을 열어 본다" 옆에 같은 무게로 놓인다. 종결된 뒤 전말을 다시
  // 읽는 항목은 위쪽 case_status === 'complete' 분기에 그대로 있다.
  return actions;
}

// A multi-card presentation (`present|E04,E05|N01`) is assembled in the
// notebook from cards it was already offering, so it is never in the menu
// verbatim. Rather than listing every combination, its parts are checked here:
// the target has to be who the detective is actually talking to, and every
// card has to be one the player holds.
function composedPresentAction(
  selectedCase: EngineCase,
  state: EngineState,
  actionId: string,
): OfflineAction | null {
  const [kind, cardList, npcId] = actionId.split('|');
  if (kind !== 'present' || !cardList || !npcId) return null;
  if (npcId !== state.current_interview) return null;

  const index = indexFor(selectedCase);
  const npc = index.npcById.get(npcId);
  if (!npc) return null;

  const cardIds = cardList.split(',').filter(Boolean);
  if (!cardIds.length) return null;
  const cards = cardIds.map((id) => index.cardById.get(id));
  if (cards.some((card) => !card)) return null;
  if (!cardIds.every((id) => state.acquired_information.includes(id))) {
    return null;
  }

  const titles = cards.map((card) => card?.title || '').filter(Boolean);
  const named =
    titles.length <= 3
      ? titles.join(', ')
      : `${titles.slice(0, 3).join(', ')} 외 ${titles.length - 3}건`;

  return {
    id: actionId,
    label: `${withObject(named)} ${npc.name}에게 제시한다`,
    group: '증거 제시',
  };
}

export function findOfflineAction(
  selectedCase: EngineCase,
  state: EngineState,
  actionId: string,
): OfflineAction | null {
  const listed = buildOfflineActionMenu(selectedCase, state).find(
    (action) => action.id === actionId && !action.disabled,
  );

  return listed || composedPresentAction(selectedCase, state, actionId);
}

// ---------------------------------------------------------------------------
// Running an action
// ---------------------------------------------------------------------------

// Is one side of a hidden_until gate satisfied? Master writes these ids
// loosely — a claim id, a contradiction stage id, or an evidence id, and the
// two fields are not always in the same order (CASE212 has the evidence as the
// prerequisite and the stage as the trigger) — so each is resolved by what it
// looks like rather than by which field it sits in.
function conditionMet(
  state: EngineState,
  npcId: string,
  rawId: string,
): boolean {
  const id = (rawId || '').trim();
  if (!id || id === '없음') return true;
  if (/^C[0-9]+$/i.test(id)) {
    return state.completed_actions.includes(`stage|${id.toUpperCase()}`);
  }
  if (/^E[0-9]+$/i.test(id)) {
    return state.presented_evidence.some(
      (item) => item.evidence_id === id && item.target_id === npcId,
    );
  }
  return state.heard_statements.includes(id);
}

// The next thing this person will admit now that was sealed before. Master
// authors these as hidden_until entries — an initial_claim or a known fact
// that only comes out once a prerequisite has been met and a trigger shown —
// and they are the whole reason to go back to someone a second time. Without
// this, claims left out of initial_interview_range were never said at all, and
// the stages gating on them (CASE268/CASE269's C02 and C03) were unreachable.
function nextUnlockedDisclosure(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): { id: string; content: string } | null {
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return null;

  for (const gate of knowledge.hiddenUntil) {
    const id = gate.factOrClaimId;
    if (!id || state.heard_statements.includes(id)) continue;
    if (!conditionMet(state, npcId, gate.prerequisite)) continue;
    if (!conditionMet(state, npcId, gate.trigger)) continue;

    const claim = knowledge.initialClaims.find((item) => item.claimId === id);
    if (claim?.content) return { id, content: claim.content };
    const fact = knowledge.knows.find((item) => item.factId === id);
    if (fact?.content) return { id, content: fact.content };
  }

  // initial_interview_range 밖인데 hidden_until에도 안 걸린 진술. 열릴 문이
  // 없어 아무에게도 도달하지 못한다 — 308건에 6개 있고, 내용이 하필
  // "그 시각엔 딱히 누굴 본 기억은 없어요" 같은 알리바이와 관계 진술이다.
  // 잠금이 없다는 것은 감춰 둔 것이 아니라 그냥 첫 자리에서 쏟아내지 않는
  // 말이라는 뜻이므로, 다시 물으면 나온다.
  const range = knowledge.initialInterviewRange;
  if (range.length) {
    const gated = new Set(knowledge.hiddenUntil.map((gate) => gate.factOrClaimId));
    for (const claim of knowledge.initialClaims) {
      if (range.includes(claim.claimId)) continue;
      if (gated.has(claim.claimId)) continue;
      if (state.heard_statements.includes(claim.claimId)) continue;
      if (claim.content) return { id: claim.claimId, content: claim.content };
    }
  }
  return null;
}

// 사건 당시 어디 있었나 — 사건이 바뀌어도 추리물이면 반드시 나오는 질문이다.
// 답은 마스터가 initial_claims에 이미 써 뒀다(2,548개 중 1,106개가 그날 밤의
// 행적을 말한다). 첫 면담에 이미 쏟아진 경우가 대부분이지만 그래도 물을 수
// 있어야 한다 — 용의자가 알리바이를 토씨 하나 안 틀리고 되풀이하는 것은
// 이 장르의 한 장면이고, 그 반복을 한지우가 짚는 자리이기도 하다.
// 신호를 좁게 잡는다. "그날"만으로 받으면 CASE288 백나린의 목격담("그날따라
// 세운 대표님이 직접 점검하겠다고…")이 알리바이 자리에 앉는다 — 물은 것과
// 다른 답이 나오는 것은 없는 것보다 나쁘다. 시각을 못 박거나 자기 행적을
// 말하는 문장만 받고, 걸리는 것이 없으면 선택지를 아예 띄우지 않는다.
const ALIBI_HINT =
  /(그 ?시각|그 ?시간|사고 ?시각|당시|어디[에가]?\s*(있|계)|\d{1,2}시|알리바이|(밤|저녁|새벽|오후|오전|그날|당일)[^.]{0,20}(있었|없었|잤|돌아|퇴근|자리|머물))/;

function alibiClaimFor(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): { id: string; content: string; repeated: boolean } | null {
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return null;
  const gated = new Set(knowledge.hiddenUntil.map((gate) => gate.factOrClaimId));
  const matching = knowledge.initialClaims.filter(
    (claim) =>
      claim.content &&
      ALIBI_HINT.test(claim.content) &&
      !gated.has(claim.claimId),
  );
  if (!matching.length) return null;
  const unheard = matching.find(
    (claim) => !state.heard_statements.includes(claim.claimId),
  );
  const claim = unheard || matching[0];
  return {
    id: claim.claimId,
    content: claim.content,
    repeated: !unheard,
  };
}

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
    surfaced_red_herring_ids: [],
    case_complete_candidate: false,
    final_judgement: null,
    tempo_self_check: { message_could_be_shorter: false },
  };
}

// 마스터 산문에 박힌 내부 id 참조를 벗긴다. 작성자가 "어느 정황을 말하는
// 것인지" 자기한테 메모해 둔 것인데, 그 문장이 그대로 화면에 나가면
// 플레이어는 수첩 어디에도 없는 번호를 읽게 된다 — 힌트가 "E06, E09을(를)
// 함께 제시해 볼 것"이라고 찍던 것과 같은 자리다. 레드헤링 602개 중 47개가
// surface_suspicion·suspicion_deepener·actual_reason에 이걸 달고 있어서
// 데이터 47군데를 고치는 대신 나가는 길목 하나를 막았다. 앞으로 들어올
// 사건에도 똑같이 듣는다.
//
// 괄호 안에 id가 보이면 괄호를 통째로 지운다. id만 빼면 "정황()이
// 드러나며"처럼 빈 괄호가 남고, 애초에 그 괄호 전체가 작성자의 메모다 —
// "격분했었고(E12의 깨진 화분 조각이 그 물증이다), 사망 추정 시각대에도"는
// 괄호를 들어내야 문장이 된다. 60자 상한은 안전장치다: 그보다 긴 괄호는
// 메모가 아니라 본문일 수 있으니 건드리지 않는다.
const MASTER_ID_REFERENCE =
  /\s*[(（][^)）]{0,60}?(?:E\d{2}|C\d{2}|S-CH\d{2}-\d{2}|F-[A-Z0-9-]*\d)[^)）]{0,60}?[)）]/g;

function stripMasterIds(text: string): string {
  return text.replace(MASTER_ID_REFERENCE, '');
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
// Which stage, if any, the cards put down this turn complete. Master states a
// stage's requirement as a set — CASE305's C01 wants E04 and E05 together —
// and the player now hands them over as one gesture, so this takes the set.
// Cards presented to this person on earlier turns still count toward it: the
// requirement is that they have all been shown, not all been shown at once.
// At least one of this turn's cards has to belong to the stage, or a turn that
// put down something unrelated would take credit for a set already complete.
function firingStage(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  evidenceIds: string[],
): ContradictionStageIndex | null {
  const presented = new Set(
    state.presented_evidence
      .filter((item) => item.target_id === npcId)
      .map((item) => item.evidence_id),
  );
  for (const id of evidenceIds) presented.add(id);
  const heard = new Set(state.heard_statements);

  for (const stage of index.master.contradictionStages) {
    if (stage.targetCharacter !== npcId) continue;
    if (done(state, `stage|${stage.id}`)) continue;
    if (
      !stage.requiresPresentedEvidenceIds.some((id) => evidenceIds.includes(id))
    ) {
      continue;
    }
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

// Has this exact card already done its work on this exact person? Narrower
// than app/game.ts's evidenceStageMarkers, which answers "did the stage this
// card belongs to open at all" for the notebook badge; what the reply needs is
// per-person, because a card can be spent against one suspect and still be the
// first thing another has seen. A shrug is the wrong answer here — the player
// watched it land a moment ago, and hearing "그래서요?" reads as if it never
// had.
function alreadyLandedOn(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  evidenceId: string,
): boolean {
  return index.master.contradictionStages.some(
    (stage) =>
      stage.targetCharacter === npcId &&
      stage.requiresPresentedEvidenceIds.includes(evidenceId) &&
      done(state, `stage|${stage.id}`),
  );
}

// 뒤져도 아무것도 안 나오는 자리. 마스터의 detail_rules 1,816개는 하나도
// 빠짐없이 증거를 내놓는다(0% 헛수고) — 그래서 방의 행동 목록이 곧 증거
// 목록이고, 플레이어는 공간을 상상하는 대신 버튼을 위에서부터 누르면 됐다.
// 방향 전환 3번이 걱정하는 "방이 체크리스트가 되는" 상태 그대로다.
//
// 지어내지는 않는다. 후보는 전부 마스터가 base_description에 이미 써 둔
// 물건이고, 여기서 하는 일은 그중 조사 대상이 아닌 것을 골라 손댈 수 있게
// 하는 것뿐이다. 한국어 형태소 분석기가 없으므로 어미 화이트리스트로
// 뽑는다 — 재현율은 낮지만(장소 1,568곳 중 654곳) 정밀도가 높고, 방당
// 한둘이면 "약간"이라는 요구에 맞는다.
const PROBE_NOUNS = [
  '책상', '작업대', '테이블', '데스크', '선반', '캐비닛', '사물함', '서류함',
  '보관함', '안내판', '게시판', '일정표', '진열장', '거치대', '클립보드',
  '의자', '서랍', '상자', '창문', '출입문', '철문', '조명', '장부', '명부',
  '시계', '화분', '소파', '침대', '옷장', '냉장고', '금고', '사다리',
  '공구함', '수납장', '진열대', '배전반', '계기판', '우편함', '쓰레기통',
  '커튼', '블라인드', '액자', '거울', '화이트보드', '칠판', '스피커',
  '모니터', '프린터', '복사기', '자판기', '정수기', '싱크대', '조리대',
  '바구니', '가방',
];
const PROBE_TRAILING_PARTICLE = /(?:이|가|은|는|을|를|엔|에는|에|의|도|과|와|만|으로|로)$/;
const PROBE_LIMIT = 2;

function probeTargetsAt(index: CaseIndex, locationId: string): string[] {
  const place = index.locationById.get(locationId);
  if (!place?.description) return [];
  // 진짜 조사 대상과 이 방에서 나오는 증거의 이름은 후보에서 뺀다. 안 그러면
  // 실제 증거를 가리키면서 "별것 없다"고 말하게 된다 — 그건 헛수고가 아니라
  // 거짓말이고, 플레이어를 증거에서 떼어 놓는다.
  const taken = [
    ...locationRules(index, locationId).detail.map((rule) => rule.action || ''),
    ...[...index.cardById.values()]
      .filter((card) => card.source === locationId)
      .map((card) => card.title),
  ].filter(Boolean);

  const found: string[] = [];
  for (const token of place.description.replace(/[,.]/g, ' ').split(/\s+/)) {
    const word = token.replace(PROBE_TRAILING_PARTICLE, '');
    if (word.length < 2) continue;
    if (!PROBE_NOUNS.some((noun) => word.endsWith(noun))) continue;
    if (taken.some((text) => text.includes(word) || word.includes(text))) {
      continue;
    }
    // 첫 글자가 같으면 버린다. "창문"과 "창틀 걸쇠"는 글자가 겹치지 않아
    // 위 필터를 통과하지만, 플레이어에게는 같은 것을 가리키는 두 버튼이다 —
    // 창문을 봤는데 걸쇠 얘기가 없으면 그건 헛수고가 아니라 오류로 읽힌다.
    if (taken.some((text) => text.split(/\s+/).some((part) => part[0] === word[0]))) {
      continue;
    }
    if (!found.includes(word)) found.push(word);
    if (found.length >= PROBE_LIMIT) break;
  }
  return found;
}

// 이 인물이 낀 관계들. relationships도 레드헤링과 똑같이 오프라인에서
// 통째로 죽어 있었다 — master-index.ts가 [RELATIONSHIPS]를 파싱해 두는데
// 엔진이 읽은 적이 없다. CASE294의 관계 4개 중 3개가 피해자와의 관계인데,
// 오프라인판에서는 피해자가 어떤 사람이었는지 물어볼 방법조차 없었다.
// CLAUDE.md 방향 전환 1번("장소 수색에서 인물 관계·서사로")이 가리키는 데이터가
// 정확히 이것이다.
//
// between은 CH0x/V0x 원본 id로 적혀 있고 엔진의 인물은 N0x이므로 양쪽을 맞춘다.
function relationshipsOf(index: CaseIndex, npcId: string) {
  const masterId = npcId.replace(/^N/, 'CH');
  const figureIds = new Set(index.master.keyFigures.map((item) => item.id));
  return index.master.relationships.filter(
    (rel) =>
      rel.between.includes(masterId) &&
      rel.nature &&
      // 피해자가 낀 관계는 "피해자가 어떤 사람이었나" 쪽이 맡는다. 양쪽에
      // 두면 답이 거의 같은 버튼이 두 개 생긴다.
      !rel.between.some((id) => figureIds.has(id)),
  );
}

// 피해자. 면담할 수 없는 인물 가운데 사망·실종으로 적힌 사람이고, 없으면
// 첫 번째를 쓴다 — 312건 중 307건이 status: deceased 하나뿐이다.
function victimOf(index: CaseIndex) {
  const figures = index.master.keyFigures;
  if (!figures.length) return null;
  return (
    figures.find((item) => /deceas|dead|missing|사망|실종/i.test(item.status)) ||
    figures[0]
  );
}

// 직급까지만. role은 "선임 문하생 / 개요식에서 유약 비법 유출을 폭로하려던
// 인물"처럼 빗금 뒤에 사건의 동기를 통째로 적어 두는 일이 잦다 — 오프라인
// GM은 마스터 문장을 그대로 내보내므로 그걸 읽으면 첫 면담에서 사건이
// 끝난다. 빗금 앞은 312명 전부 깨끗한 것을 확인했다.
function publicRoleOf(figure: { role: string }): string {
  return (figure.role || '').split('/')[0].trim();
}

// 이 사람이 피해자에 대해 해 줄 수 있는 말. 누구나 아는 직함이 먼저 오고,
// 이 사람만의 각도(피해자와의 관계)가 있으면 이어 붙는다.
function victimAnswerFor(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): { victimName: string; lines: string[] } | null {
  const victim = victimOf(index);
  if (!victim) return null;
  const masterId = npcId.replace(/^N/, 'CH');
  const rel = index.master.relationships.find(
    (item) =>
      item.between.includes(masterId) && item.between.includes(victim.id),
  );
  // 직함은 누구에게 물어도 같은 대답이라 사건에 한 번만 나온다. 그 뒤로는
  // 이 사람만의 각도가 있는 경우에만 물을 거리가 된다 — 안 그러면 다섯
  // 명이 차례로 "국태은, '설한산장' 대표."만 되풀이한다.
  const role = done(state, 'victim|asked') ? '' : publicRoleOf(victim);
  const lines = [
    role ? `${victim.name}, ${role}.` : null,
    rel?.nature || null,
    rel?.publicFace || null,
  ].filter((line): line is string => Boolean(line));
  return lines.length ? { victimName: victim.name, lines } : null;
}

// 관계의 상대편 이름. 면담 상대가 아닌 쪽인데, 대개 피해자(V01)라 npcs에는
// 없고 [KEY_FIGURES]에 있다.
function relationshipOther(
  index: CaseIndex,
  rel: { between: string[] },
  npcId: string,
): string | null {
  const masterId = npcId.replace(/^N/, 'CH');
  const otherId = rel.between.find((id) => id !== masterId);
  if (!otherId) return null;
  const npc = index.npcById.get(otherId.replace(/^CH/, 'N'));
  if (npc) return npc.name;
  const figure = index.master.keyFigures.find((item) => item.id === otherId);
  return figure?.name || null;
}

// 이 인물에게 걸린 레드헤링. AI 경로(app/game.ts의 redHerringSubjectNpc)와
// 같은 판정이다 — surface_suspicion 문장 안에 이름이 들어 있는 사람이 그
// 의심의 주인이다.
//
// 오프라인 엔진은 이 두 필드를 한 번도 읽은 적이 없었다. master-index.ts가
// surfaceSuspicion·suspicionDeepener를 멀쩡히 파싱해 두는데 여기서 빈
// 배열만 선언하고 끝이라, 오프라인판에서는 진범 말고 아무도 무게가 없었다.
// CASE294 완주 로그가 그대로다: 5명 중 서리안 외에는 누구도 의심받은 적이
// 없고, 추상원은 카드 한 장 내밀고 버려졌으며 E08·E12는 끝까지 안 열렸다.
// pressure_responses·comic_tell·voice_profile이 죽어 있던 것과 같은 종류다.
function redHerringsAbout(
  index: CaseIndex,
  selectedCase: EngineCase,
  npcId: string,
) {
  const npc = index.npcById.get(npcId);
  if (!npc) return [];
  return index.master.redHerrings.filter((herring) => {
    const subject = selectedCase.npcs.find((item) =>
      herring.surfaceSuspicion.includes(item.name),
    );
    return subject?.id === npcId;
  });
}

// 세 번째 박자 — 의심을 깨는 것. how_to_clear는 무엇을 맞춰 보면 이 사람이
// 풀려나는지를 id로 적어 둔다("추상원의 해명 진술(E08)과 방문일지의 퇴실
// 서명(E05)을 사건이 벌어진 밤 시간대와 대조한다"). 602개 중 321개가 증거
// id를, 나머지는 관찰로 얻는 사실이나 초기 진술 id를 부른다.
//
// 그래서 증거를 부르는 것은 제시로 깨지고, 사실·진술만 부르는 것은 그 조건이
// 채워진 뒤 그 사람을 다시 만나면 깨진다. 어느 쪽이든 풀려나는 순간 나오는
// 것은 actual_reason이다 — 마스터가 쓴 해명 그대로다.
function herringRequirements(herring: { howToClear: string }): {
  evidence: string[];
  facts: string[];
} {
  const ids = herring.howToClear.match(REFERENCED_MASTER_ID) || [];
  const unique = [...new Set(ids)];
  return {
    evidence: unique.filter((id) => id.startsWith('E')),
    facts: unique.filter((id) => !id.startsWith('E')),
  };
}

// how_to_clear가 id를 하나도 부르지 않는 경우 — 602개 중 281개가 그렇다
// ("그녀의 초기 진술과 편집부 사무실의 정황을 사고 시각과 대조한다"처럼
// 자연어로만 쓰여 있다). 그대로 두면 영원히 안 풀리는 목표가 서브미션
// 목록에 남는데, 그건 없느니만 못하다. 대신 그 사람에게 물어볼 것을 다
// 물어봤을 때로 잡았다 — 느슨하지만 실제 조사 행위에 걸려 있고, 대조할
// 자료를 서버가 못 짚는 상황에서 지어내는 것보다는 정직하다.
function herringRequirementsMet(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  herring: { howToClear: string },
): boolean {
  const { evidence, facts } = herringRequirements(herring);
  const presented = new Set(
    state.presented_evidence
      .filter((item) => item.target_id === npcId)
      .map((item) => item.evidence_id),
  );
  if (!evidence.length && !facts.length) {
    const questions = index.questionsByNpc.get(npcId) || [];
    return (
      questions.length > 0 &&
      questions.every((card) => state.acquired_information.includes(card.id))
    );
  }
  return (
    evidence.every((id) => presented.has(id)) &&
    facts.every((id) => state.heard_statements.includes(id))
  );
}

// 해명만. 변환기가 actual_reason 끝에 lingering_thread를 붙여 두는데, 그건
// "그 뒤로도 …게 된다"는 미래형이라 의심이 풀리는 그 순간에 나올 말이 아니고
// 엔딩에 같은 문장이 한 번 더 있다.
function herringResolution(herring: {
  actualReason: string;
  lingeringThread: string;
}): string {
  const reason = herring.actualReason.trim();
  const tail = herring.lingeringThread.trim();
  if (!tail || !reason.endsWith(tail)) return reason;
  return reason.slice(0, -tail.length).trim();
}

// 아직 안 깨진 것 중 지금 깨지는 것. evidenceIds가 주어지면 제시 턴이라
// 이번에 내려놓은 카드가 조건에 실제로 끼어 있어야 한다 — 아니면 관계없는
// 카드를 낸 턴이 이미 채워져 있던 조건의 공을 가로챈다.
function clearableHerring(
  index: CaseIndex,
  selectedCase: EngineCase,
  state: EngineState,
  npcId: string,
  evidenceIds: string[] | null,
): { id: string; text: string } | null {
  for (const herring of redHerringsAbout(index, selectedCase, npcId)) {
    if (!herring.id || !herring.actualReason) continue;
    if (done(state, `cleared|${herring.id}`)) continue;
    const need = herringRequirements(herring);
    if (evidenceIds) {
      if (!need.evidence.some((id) => evidenceIds.includes(id))) continue;
    } else if (need.evidence.length) {
      continue;
    }
    const withTurn: EngineState = evidenceIds
      ? {
          ...state,
          presented_evidence: [
            ...state.presented_evidence,
            ...evidenceIds.map((id) => ({
              evidence_id: id,
              target_id: npcId,
            })),
          ],
        }
      : state;
    if (!herringRequirementsMet(index, withTurn, npcId, herring)) continue;
    return { id: herring.id, text: herringResolution(herring) };
  }
  return null;
}

// 수첩에 뜨는 서브미션. 만나 본 사람의 의심만 싣는다 — 만나기도 전에
// 용의자 목록을 띄우면 사건이 시작부터 풀려 있는 셈이다.
export type OfflineSubMission = {
  id: string;
  subject: string;
  suspicion: string;
  status: 'open' | 'deepened' | 'cleared';
  resolution?: string;
  remaining: number;
  // 깰 수단이 이 사건 데이터에 아예 없는 의심. how_to_clear가 자료를 id로
  // 짚지 않고 그 인물에게 물어볼 카드도 없는 경우로, 602개 중 102개가
  // 그렇다. 목표로 세워 두면 영영 안 줄어드는 줄이 목록에 박히므로 —
  // 그건 없느니만 못하다 — 목표가 아니라 기록으로 보여 준다.
  clearable: boolean;
};

export function buildOfflineSubMissions(
  selectedCase: EngineCase,
  state: EngineState,
): OfflineSubMission[] {
  const index = indexFor(selectedCase);
  const missions: OfflineSubMission[] = [];
  for (const npc of selectedCase.npcs) {
    if (!state.interviewed_characters.includes(npc.id)) continue;
    for (const herring of redHerringsAbout(index, selectedCase, npc.id)) {
      if (!herring.id || !herring.surfaceSuspicion) continue;
      const cleared = done(state, `cleared|${herring.id}`);
      const need = herringRequirements(herring);
      const presented = new Set(
        state.presented_evidence
          .filter((item) => item.target_id === npc.id)
          .map((item) => item.evidence_id),
      );
      const questions = index.questionsByNpc.get(npc.id) || [];
      const remaining =
        need.evidence.length || need.facts.length
          ? need.evidence.filter((id) => !presented.has(id)).length +
            need.facts.filter((id) => !state.heard_statements.includes(id))
              .length
          : questions.filter(
              (card) => !state.acquired_information.includes(card.id),
            ).length;
      missions.push({
        id: herring.id,
        subject: npc.name,
        suspicion: stripMasterIds(herring.surfaceSuspicion),
        status: cleared
          ? 'cleared'
          : done(state, `herring|${herring.id}`)
            ? 'deepened'
            : 'open',
        resolution: cleared
          ? stripMasterIds(herringResolution(herring))
          : undefined,
        remaining: cleared ? 0 : remaining,
        clearable: Boolean(
          need.evidence.length || need.facts.length || questions.length,
        ),
      });
    }
  }
  return missions;
}

// 두 박자 중 두 번째. AI 경로는 "그 인물이 이미 한 번 말한 뒤"에만 이걸
// 꺼내게 하는데(hasSpokenAlready), 같은 조건이라 재면담·부르기 자리에서만
// 부른다. 한 번 나온 것은 마커로 닫는다 — 모델이 적어 주는 경로가 없으니
// 엔진이 자기가 내보낸 것을 직접 센다.
function pendingDeepener(
  index: CaseIndex,
  selectedCase: EngineCase,
  state: EngineState,
  npcId: string,
): { id: string; text: string } | null {
  for (const herring of redHerringsAbout(index, selectedCase, npcId)) {
    if (!herring.id || !herring.suspicionDeepener) continue;
    if (done(state, `herring|${herring.id}`)) continue;
    // 이 문장은 대개 "…정황이 드러나며 의심이 짙어진다" 꼴이라, 가리키는
    // 정황을 탐정이 실제로 본 뒤에만 말이 된다. CASE294의 R01·R02는 둘 다
    // 로비를 둘러봐야 나오는 F-L02-OBS-01을 가리키는데, 게이트가 없으면
    // 로비에 발도 안 들인 플레이어에게 "드러나며"라고 말하게 된다.
    // app/game.ts의 redHerringClearingUnlocked가 how_to_clear에 하는 것과
    // 같은 방식이다. 참조가 없는 문장은 그대로 통과시킨다.
    if (!referencedFactsReached(state, herring.suspicionDeepener)) continue;
    return { id: herring.id, text: herring.suspicionDeepener };
  }
  return null;
}

// 문장이 이름으로 부르는 마스터 id가 전부 플레이어에게 실제로 도달했는가.
// 증거는 손에 있어야 하고, 사실·진술은 들었거나 본 것이어야 한다
// (observation_rules의 release_fact_id도 heard_statements로 들어온다).
const REFERENCED_MASTER_ID =
  /(?<![A-Za-z0-9])(E\d{2}|S-CH\d{2}-\d{2}|F-[A-Z0-9-]*\d)/g;

function referencedFactsReached(state: EngineState, text: string): boolean {
  const ids = text.match(REFERENCED_MASTER_ID) || [];
  return ids.every((id) =>
    id.startsWith('E')
      ? state.acquired_information.includes(id)
      : state.heard_statements.includes(id),
  );
}

// 맞는 카드를 냈는데 짝이 모자란 경우. CASE294 실플레이에서 나온 것이다 —
// C01은 E06과 E09를 함께 요구하는데 플레이어가 E09만 다섯 턴 연속으로
// 내밀었고, 돌아온 것은 엉뚱한 카드를 냈을 때와 글자 하나 다르지 않은
// 시치미였다. 화면의 뱃지는 '맞는 방향이에요'라고 말하는데 서술은 "그래서
// 뭐가 달라지나요"라고 말하니, 플레이어가 믿는 쪽은 서술이다.
//
// 그래서 지금 열려 있는 단계에 이번 카드가 실제로 속하고 들어야 할 진술도
// 다 들었는데 아직 내밀지 않은 카드가 남아 있을 때, 몇 장이 모자란지를
// 돌려준다. 0이면 해당 없음(단계가 안 열렸거나, 진술이 모자라거나, 이번
// 카드가 그 단계와 무관하거나 — 그 경우는 이미 firingStage가 열었다).
// 몇 장인지까지만이고 무엇인지는 말하지 않는다. 그건 힌트의 몫이다.
function openStageShortfall(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  evidenceIds: string[],
): number {
  const current = state.npc_statement_stage[npcId] || 'initial';
  const stage = index.master.contradictionStages.find(
    (item) =>
      item.targetCharacter === npcId &&
      item.fromStage === current &&
      !done(state, `stage|${item.id}`),
  );
  if (!stage) return 0;
  if (!stage.requiresPresentedEvidenceIds.some((id) => evidenceIds.includes(id))) {
    return 0;
  }
  if (
    !stage.requiresHeardClaimIds.every((id) =>
      state.heard_statements.includes(id),
    )
  ) {
    return 0;
  }
  const presented = new Set(
    state.presented_evidence
      .filter((item) => item.target_id === npcId)
      .map((item) => item.evidence_id),
  );
  for (const id of evidenceIds) presented.add(id);
  return stage.requiresPresentedEvidenceIds.filter((id) => !presented.has(id))
    .length;
}

// 이 카드가 이 사람에게 지금 쓸 값어치가 있었는가. AI 경로는 검증 단계에서
// 같은 값을 매기는데 오프라인은 그 단계를 지나지 않으므로 여기서 직접 센다.
// "지금 열려 있는 단계"는 아직 안 깨진 단계 중 from_stage가 이 인물의 현재
// 단계인 것이다 — 사슬이라 그 하나뿐이다.
function matchQualityFor(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  evidenceId: string,
): 'hit' | 'held' | 'irrelevant' {
  const npcStages = index.master.contradictionStages.filter(
    (stage) => stage.targetCharacter === npcId,
  );
  if (!npcStages.length) return 'irrelevant';
  const current = state.npc_statement_stage[npcId] || 'initial';
  const requiredByOpenStage = npcStages.some(
    (stage) =>
      !done(state, `stage|${stage.id}`) &&
      stage.fromStage === current &&
      stage.requiresPresentedEvidenceIds.includes(evidenceId),
  );
  if (requiredByOpenStage) return 'hit';
  const requiredByAnyStage = npcStages.some((stage) =>
    stage.requiresPresentedEvidenceIds.includes(evidenceId),
  );

  return requiredByAnyStage ? 'held' : 'irrelevant';
}

// 이 방에 더 뒤질 것이 남았는가. AI 경로(app/game.ts의 locationClearedNote)와
// 같은 판정이다: 남은 것이 있으면 아무 말도 하지 않고, 방에 막 들어왔거나
// 방금 이 방의 마지막 하나를 찾은 순간에만 한 번 말한다. 그렇지 않으면 같은
// 방에 머무는 내내 같은 줄이 반복된다.
function locationClearedFor(
  index: CaseIndex,
  state: EngineState,
  gm: OfflineGmResponse,
): 'none' | 'done' | undefined {
  const here = gm.scene.location_id;
  const detailsHere = locationRules(index, here).detail.filter(
    (rule) => rule.evidenceId,
  );
  const remaining = detailsHere.filter(
    (rule) =>
      !state.acquired_information.includes(rule.evidenceId) &&
      !gm.acquire.includes(rule.evidenceId),
  );
  if (remaining.length) return undefined;
  // 헛수고 자리가 남아 있으면 아직 말하지 않는다. 증거만 세고 "여긴 다
  // 봤다"를 띄우면 목록에 남은 버튼이 전부 헛것이라고 알려 주는 셈이라,
  // 섞어 둔 것이 그 한 줄에 되돌려진다.
  const probesHere = probeTargetsAt(index, here);
  if (probesHere.some((_, i) => !done(state, `probe|${here}|${i}`))) {
    return undefined;
  }
  const arrived = here !== state.current_location;
  const foundLastHere = detailsHere.some((rule) =>
    gm.acquire.includes(rule.evidenceId),
  );
  if (!arrived && !foundLastHere) return undefined;

  return detailsHere.length ? 'done' : 'none';
}

// 지금 이 방에 서 있는 사람들을 한 줄로. 아무도 없으면 아무 말도 하지
// 않는다 — 빈 방은 빈 방이라고 매번 선언할 일이 아니다.
function peopleHereLine(
  index: CaseIndex,
  state: EngineState,
  locationId: string,
): string | null {
  const here = index.npcById
    ? [...index.npcById.values()].filter(
        (npc) => npcLocationNow(index, state, npc.id) === locationId,
      )
    : [];
  if (!here.length) return null;
  // 이름만 적는다. 직함은 수첩의 인물 탭이 들고 있고, 여기에 괄호로
  // 붙이면 조사가 괄호 뒤에 와서 ("연도희(야간 순찰대원)가") 읽기 나쁘다.
  const names = here.map((npc) => npc.name);
  const last = names[names.length - 1];
  const head = names.slice(0, -1).join(', ');

  return head
    ? `이곳에는 ${head}, ${withSubject(last)} 있다.`
    : `이곳에는 ${withSubject(last)} 있다.`;
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
  const recent = recentlySaid(state);
  const gm = emptyResponse(state);
  const turn: OfflineTurn = {
    gm,
    playerLine: action.label,
    heardStatementIds: [],
    completedActions: [],
  };
  const [kind, first, second] = actionId.split('|');
  // 각 분기가 제 갈 길로 return 하므로, 방 소진 판정은 turn 객체를 돌려주기
  // 직전에 한 번만 걸도록 감싸 둔다.
  const finish = (result: OfflineTurn | null) => {
    if (!result) return null;
    result.gm.message = stripMasterIds(result.gm.message);
    if (result.gm.jiwoo_line) {
      result.gm.jiwoo_line = stripMasterIds(result.gm.jiwoo_line);
    }
    const cleared = locationClearedFor(index, state, result.gm);
    if (cleared) result.locationCleared = cleared;

    return result;
  };

  if (kind === 'move') {
    const place = index.locationById.get(first);
    if (!place) return null;
    gm.scene = { location_id: place.id, interview_character_id: null };
    gm.message = joinParagraphs([
      `${withDirection(place.name)} 자리를 옮긴다.`,
      place.description,
      // 이 방에 누가 있는지는 방에 들어선 사람이 가장 먼저 보는 것인데,
      // 도착 서술이 그 말을 하는 일이 거의 없다. 사람이 있는 장소 1,138곳
      // 가운데 그 사람이 base_description에 나오는 것은 49곳(4.3%)뿐이고,
      // 그나마 대부분 "하유담의 개인 사무실"처럼 소유격이지 지금 거기
      // 서 있다는 말이 아니다.
      //
      // 인물을 행동 목록에서 수첩으로 옮긴 뒤로 이게 실제로 사람을
      // 놓치게 만들었다 — CASE294 실플레이에서 앞마당에 연도희(진범이
      // 밤에 보일러실을 드나드는 걸 본 유일한 목격자)가 있는데, 화면에는
      // "앞마당을 둘러본다" 한 줄뿐이라 플레이어가 2초 만에 나갔다.
      // 두 번째로 들어간 것도 힌트를 쓴 뒤였다.
      //
      // 지어내는 것이 아니라 Master의 present_location을 그대로 말한다.
      peopleHereLine(index, state, place.id),
    ]);
    gm.jiwoo_line = pick(JIWOO_ARRIVAL, seed, recent);
    return finish(turn);
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
    gm.jiwoo_line = pick(JIWOO_LEAVE, seed, recent);
    return finish(turn);
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
      pick(LEAD_OBSERVE, seed, recent, (template) =>
        fill(template, { place: place?.name || '주변' }),
      ),
      rule.result,
    ]);
    gm.jiwoo_line = pick(JIWOO_OBSERVE, seed, recent);
    turn.completedActions.push(actionId);
    // An observation_rule's release_fact_id is a first-class established fact:
    // CASE212's C03 gates on F-L05-OBS-01, something the detective saw rather
    // than something anyone said. Without recording it that stage, and the one
    // chained behind it, could never open.
    if (rule.factId) turn.heardStatementIds.push(rule.factId);
    return finish(turn);
  }

  if (kind === 'probe') {
    const target = probeTargetsAt(index, first)[Number(second)];
    if (!target) return null;
    gm.scene = {
      location_id: first,
      interview_character_id: state.current_interview,
    };
    gm.message = joinParagraphs([
      pick(LEAD_PROBE, seed, recent),
      pick(NOTHING_FOUND, seed, recent, (template) =>
        fill(template, { name: target }),
      ),
    ]);
    gm.jiwoo_line = pick(JIWOO_NOTHING, seed, recent);
    turn.completedActions.push(actionId);
    return finish(turn);
  }

  if (kind === 'inspect') {
    const rule = locationRules(index, first).detail[Number(second)];
    if (!rule) return null;
    const card = rule.evidenceId ? index.cardById.get(rule.evidenceId) : null;
    gm.scene = {
      location_id: first,
      interview_character_id: state.current_interview,
    };
    gm.message = joinParagraphs([
      pick(LEAD_INSPECT, seed, recent),
      rule.result,
    ]);
    turn.completedActions.push(actionId);
    if (card) {
      gm.acquire.push(card.id);
      gm.jiwoo_line = pick(JIWOO_DISCOVERY, seed, recent);
      gm.detective_line = pick(DETECTIVE_DISCOVERY, seed, recent);
      gm.detective_line_position = 'before';
    } else {
      gm.jiwoo_line = pick(JIWOO_NOTHING, seed, recent);
    }
    return finish(turn);
  }

  if (kind === 'summon') {
    const npc = index.npcById.get(first);
    if (!npc) return null;
    const place = index.locationById.get(state.current_location);
    const previous = summonedNow(state.completed_actions);
    const sentBack =
      previous && previous.npcId !== npc.id
        ? index.npcById.get(previous.npcId)
        : null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: null,
    };
    gm.message = joinParagraphs([
      pick(LEAD_SUMMON, seed, recent, (template) =>
        fill(template, { name: npc.name, place: place?.name || '이곳' }),
      ),
      sentBack
        ? `${withTopic(sentBack.name)} 한지우와 눈인사만 하고 제자리로 돌아간다.`
        : null,
    ]);
    gm.detective_line = pick(DETECTIVE_SUMMON, seed, recent, (template) =>
      fill(template, { name: npc.name }),
    );
    gm.detective_line_position = 'before';
    gm.jiwoo_line = pick(JIWOO_SUMMON, seed, recent, (template) =>
      fill(template, { name: npc.name }),
    );
    turn.completedActions.push(
      summonMarker(
        npc.id,
        state.current_location,
        state.full_dialogue_log.length,
      ),
    );
    return finish(turn);
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
      stated_claim_ids: [],
    });

    if (firstMeeting && knowledge) {
      const range = knowledge.initialInterviewRange.length
        ? knowledge.initialInterviewRange
        : knowledge.initialClaims.map((claim) => claim.claimId);
      const spoken = knowledge.initialClaims.filter((claim) =>
        range.includes(claim.claimId),
      );
      // 첫 박자. 이 사람이 왜 한 번 더 볼 만한 사람인지 — 마스터가
      // surface_suspicion에 적어 둔 그대로다. 해소가 아니라 제시라서
      // 첫 면담에 붙는다: 여기서 걸려야 플레이어가 다시 찾아온다.
      gm.message = joinParagraphs([
        pick(LEAD_FIRST_MEETING, seed, recent, (template) =>
          fill(template, { name: npc.name, role: npc.role }),
        ),
        ...spoken.map((claim) => claim.content),
        ...redHerringsAbout(index, selectedCase, first)
          .map((herring) => herring.surfaceSuspicion)
          .filter(Boolean),
      ]);
      const spokenIds = spoken.map((claim) => claim.claimId);
      turn.heardStatementIds.push(...spokenIds);
      for (const update of gm.npc_updates) {
        if (update.npc === first) update.stated_claim_ids = spokenIds;
      }
      gm.jiwoo_line = pick(JIWOO_INTERVIEW_START, seed, recent);
    } else {
      const unlocked = nextUnlockedDisclosure(index, state, first);
      if (unlocked) {
        gm.message = joinParagraphs([
          pick(LEAD_RELUCTANT, seed, recent, (template) =>
            fill(template, { name: npc.name }),
          ),
          unlocked.content,
        ]);
        turn.heardStatementIds.push(unlocked.id);
        for (const update of gm.npc_updates) {
          if (update.npc === first) update.stated_claim_ids = [unlocked.id];
        }
        gm.jiwoo_line = pick(JIWOO_TESTIMONY, seed, recent);
      } else {
        // 둘째 박자. 더 들을 진술이 없어서 어깨만 으쓱하고 끝나던 자리인데,
        // 이 사람에게 아직 안 나온 suspicion_deepener가 있으면 그것이 이
        // 턴의 내용이 된다. 의심은 풀리기 전에 한 번 짙어진다.
        const deepener = pendingDeepener(index, selectedCase, state, first);
        // how_to_clear가 증거를 하나도 부르지 않는 레드헤링(관찰 사실·초기
        // 진술만 대조하면 되는 것)은 제시로 깰 수가 없다. 조건이 채워진 뒤
        // 다시 만나면 그 자리에서 풀린다.
        const cleared = deepener
          ? null
          : clearableHerring(index, selectedCase, state, first, null);
        const body = deepener
          ? deepener.text
          : cleared
            ? joinParagraphs([
                pick(LEAD_HERRING_CLEAR, seed, recent, (template) =>
                  fill(template, { name: npc.name }),
                ),
                cleared.text,
              ])
            : pick(NPC_REENGAGE, seed, recent);
        gm.message = joinParagraphs([
          `${withTopic(npc.name)} 다시 탐정 쪽으로 몸을 돌린다.`,
          body,
        ]);
        gm.jiwoo_line = deepener
          ? pick(JIWOO_DEEPENER, seed, recent)
          : cleared
            ? pick(JIWOO_HERRING_CLEAR, seed, recent)
            : pick(JIWOO_REENGAGE, seed, recent);
        if (deepener) {
          gm.surfaced_red_herring_ids.push(deepener.id);
          turn.completedActions.push(`herring|${deepener.id}`);
        }
        if (cleared) turn.completedActions.push(`cleared|${cleared.id}`);
      }
    }
    return finish(turn);
  }

  if (kind === 'victim') {
    const npc = index.npcById.get(first);
    const answer = npc ? victimAnswerFor(index, state, npc.id) : null;
    if (!npc || !answer) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    gm.message = joinParagraphs([
      pick(LEAD_VICTIM, seed, recent, (template) =>
        fill(template, { name: npc.name, role: answer.victimName }),
      ),
      answer.lines.join(' '),
    ]);
    gm.jiwoo_line = pick(JIWOO_VICTIM, seed, recent);
    turn.completedActions.push(`victim|${npc.id}`, 'victim|asked');
    return finish(turn);
  }

  if (kind === 'alibi') {
    const npc = index.npcById.get(first);
    const claim = npc ? alibiClaimFor(index, state, npc.id) : null;
    if (!npc || !claim) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    gm.message = joinParagraphs([
      pick(claim.repeated ? LEAD_ALIBI_AGAIN : LEAD_ALIBI, seed, recent, (template) =>
        fill(template, { name: npc.name }),
      ),
      claim.content,
    ]);
    gm.npc_updates.push({
      npc: npc.id,
      status: 'interviewed',
      statement_stage: state.npc_statement_stage[npc.id] || 'initial',
      stated_claim_ids: [claim.id],
    });
    gm.jiwoo_line = pick(
      claim.repeated ? JIWOO_ALIBI_AGAIN : JIWOO_TESTIMONY,
      seed,
      recent,
    );
    if (!state.heard_statements.includes(claim.id)) {
      turn.heardStatementIds.push(claim.id);
    }
    turn.completedActions.push(`alibi|${npc.id}`);
    return finish(turn);
  }

  if (kind === 'relation') {
    const npc = index.npcById.get(second);
    const rel = index.master.relationships.find((item) => item.id === first);
    if (!npc || !rel) return null;
    const other = relationshipOther(index, rel, npc.id);
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    gm.message = joinParagraphs([
      pick(LEAD_RELATION, seed, recent, (template) =>
        fill(template, { name: npc.name, role: other || '' }),
      ),
      [rel.nature, rel.publicFace].filter(Boolean).join(' '),
    ]);
    gm.jiwoo_line = pick(JIWOO_RELATION, seed, recent);
    turn.completedActions.push(`rel|${rel.id}`);
    return finish(turn);
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
      npc
        ? pick(LEAD_ASK, seed, recent, (template) =>
            fill(template, { name: npc.name }),
          )
        : null,
      card.summary,
    ]);
    gm.acquire.push(card.id);
    gm.jiwoo_line = pick(JIWOO_TESTIMONY, seed, recent);
    return finish(turn);
  }

  if (kind === 'present') {
    const npc = index.npcById.get(second);
    const cardIds = (first || '').split(',').filter(Boolean);
    const cards = cardIds
      .map((id) => index.cardById.get(id))
      .filter((card): card is EngineCard => Boolean(card));
    if (!npc || !cards.length) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    for (const card of cards) {
      gm.presented_evidence.push({
        evidence_id: card.id,
        target_id: npc.id,
        match_quality: matchQualityFor(index, state, npc.id, card.id),
      });
    }

    const stage = firingStage(index, state, npc.id, cardIds);
    const cleared = stage
      ? null
      : clearableHerring(index, selectedCase, state, npc.id, cardIds);
    // 의심이 풀리는 것도 이야기가 앞으로 간 것이다. 아무 일도 없었다고
    // 적으면 수첩의 제시 기록이 실제와 어긋난다.
    gm.presented_evidence_outcome = stage || cleared ? 'advanced' : 'no_change';
    if (stage) {
      gm.message = joinParagraphs([
        pick(LEAD_STAGE_BREAK, seed, recent, (template) =>
          fill(template, { name: npc.name }),
        ),
        stage.release,
      ]);
      gm.npc_updates.push({
        npc: npc.id,
        status: 'interviewed',
        statement_stage: stage.toStage || null,
        stated_claim_ids: stage.releaseClaimOrFactId
          ? [stage.releaseClaimOrFactId]
          : [],
      });
      gm.detective_line = pick(DETECTIVE_BREAK, seed, recent);
      gm.detective_line_position = 'before';
      gm.jiwoo_line = pick(JIWOO_BREAK, seed, recent);
      turn.completedActions.push(`stage|${stage.id}`);
      if (stage.releaseClaimOrFactId) {
        turn.heardStatementIds.push(stage.releaseClaimOrFactId);
      }
    } else if (cleared) {
      gm.message = joinParagraphs([
        cards.length > 1
          ? pick(LEAD_PRESENT_SET, seed, recent, (template) =>
              fill(template, { name: npc.name }),
            )
          : null,
        pick(LEAD_HERRING_CLEAR, seed, recent, (template) =>
          fill(template, { name: npc.name }),
        ),
        cleared.text,
      ]);
      gm.jiwoo_line = pick(JIWOO_HERRING_CLEAR, seed, recent);
      turn.completedActions.push(`cleared|${cleared.id}`);
    } else if (
      cardIds.every((id) => alreadyLandedOn(index, state, npc.id, id))
    ) {
      gm.message = joinParagraphs([
        pick(NPC_SPENT, seed, recent, (template) =>
          fill(template, { name: npc.name }),
        ),
      ]);
      gm.jiwoo_line = pick(JIWOO_SPENT, seed, recent);
    } else {
      const shortfall = openStageShortfall(index, state, npc.id, cardIds);
      gm.message = joinParagraphs([
        cards.length > 1
          ? pick(LEAD_PRESENT_SET, seed, recent, (template) =>
              fill(template, { name: npc.name }),
            )
          : null,
        pick(shortfall ? NPC_PARTIAL : NPC_DEFLECT, seed, recent, (template) =>
          fill(template, { name: npc.name }),
        ),
      ]);
      gm.jiwoo_line = shortfall
        ? pick(JIWOO_PARTIAL, seed, recent, (template) =>
            fill(template, { count: countSheets(shortfall) }),
          )
        : pick(JIWOO_DEFLECT, seed, recent);
    }
    return finish(turn);
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

// How far back a line still counts as "just said" — twenty-odd turns, long
// enough that a pool cycles before anything comes round again. A CASE305
// playtest is what asked for this: four of the eight Han Jiwoo lines and four
// of the seven detective lines came back word for word inside one session,
// because the index was a hash of the turn count and the action id with
// nothing tracking what had already been used.
const RECENT_LINE_WINDOW = 60;

function recentlySaid(state: EngineState): string[] {
  return state.full_dialogue_log
    .slice(-RECENT_LINE_WINDOW)
    .map((entry) => entry?.content || '')
    .filter(Boolean);
}

// Picks a line nobody has heard lately. Candidates are rendered first, so a
// templated lead ("{topic} 잠깐 말을 고른다") is judged as the player would have
// seen it, and matched with includes() because a lead lands inside a larger
// message while Jiwoo's and the detective's lines are stored on their own.
// Falls back to the whole pool when all of it is recent — repeating beats
// saying nothing.
// 모자란 장수를 한지우가 입에 담을 수 있는 말로. 숫자를 그대로 읽으면
// 시스템 문구가 되어 버린다 — "2장 부족합니다"는 사람이 하는 말이 아니다.
function countSheets(count: number): string {
  return `${['한', '두', '세', '네', '다섯'][count - 1] || String(count)} 장`;
}

function pick(
  pool: string[],
  seed: number,
  recent: string[] = [],
  render: (template: string) => string = (template) => template,
): string {
  const rendered = pool.map(render);
  const fresh = rendered.filter(
    (line) => !recent.some((said) => said.includes(line)),
  );
  const from = fresh.length ? fresh : rendered;
  return from[Math.abs(seed) % from.length];
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
// 손댔는데 아무것도 없을 때. {name}에 그 물건 이름이 들어간다. 헛수고를
// 헛수고라고만 말하고 끝내면 턴을 버린 기분만 남으므로, 방의 결이나 그
// 물건의 평범함이 한 조각씩 묻어 나오게 쓴다 — 아무것도 안 나왔다는 것도
// 그 방에 대해 알게 된 것이다.
const NOTHING_FOUND = [
  '{topic} 손을 타지 않은 그대로다. 먼지가 고르게 앉아 있다.',
  '{topic} 열어 봐도 늘 있을 법한 것들뿐이다.',
  '{topic} 특별할 것이 없다. 탐정은 원래 자리에 그대로 돌려놓는다.',
  '{name} 쪽은 며칠째 아무도 건드리지 않은 모양이다.',
  '{topic} 한참 들여다봤지만 눈에 걸리는 것이 없다.',
  '{topic} 정리된 지 오래인 채 그대로다.',
  '{name} 아래까지 손을 넣어 봤지만 빈손이다.',
  '{topic} 여기서는 더 나올 것이 없어 보인다.',
];

// 헛수고 자리 전용. LEAD_INSPECT를 쓰면 "탐정은 그것부터 집어 든다"가
// 조명이나 캐비닛 앞에 붙는다 — 집을 수 없는 것을 집는다. 여기서는 손이
// 아니라 눈이 먼저 간다.
const LEAD_PROBE = [
  '탐정은 그쪽으로 걸음을 옮긴다.',
  '가까이 다가가 눈으로 훑는다.',
  '탐정은 허리를 숙여 들여다본다.',
  '손끝으로 한 번 쓸어 본다.',
  '탐정은 한참 그 앞에 서 있는다.',
  '각도를 바꿔 다시 본다.',
  '탐정은 잠깐 손을 멈추고 살핀다.',
];

const LEAD_INSPECT = [
  '탐정은 곧장 그쪽으로 손을 뻗는다.',
  '가까이 다가가 각도를 바꿔 본다.',
  '탐정은 무릎을 굽히고 들여다본다.',
  '손끝이 한 번 멈췄다가 다시 움직인다.',
  '탐정은 그것부터 집어 든다.',
  '한 손으로 조심스럽게 들어 올린다.',
];

// 죽은 사람 이야기를 꺼내는 자리. {role}에 피해자 이름이 들어간다.
const LEAD_VICTIM = [
  '{role} 이야기가 나오자 {topic} 잠깐 말을 고른다.',
  '{topic} 대답하기 전에 한 번 숨을 고른다.',
  '{topic} 시선을 탁자 위에 둔 채 말한다.',
  '{topic} 고개를 천천히 끄덕이고 나서 입을 연다.',
  '{topic} 남 이야기하듯 담담하게 말한다.',
  '{topic} 말끝을 흐렸다가 다시 이어 간다.',
];

const JIWOO_VICTIM = [
  '"...어떤 분이었는지는 저도 좀 알고 싶었어요."',
  '"다들 비슷하게 말씀하시는지 한번 보죠."',
  '"직함은 적어 뒀어요. 나머지는 사람마다 다를 테니까요."',
  '"좋은 말만 나오는 것도 그것대로 정보죠."',
  '"이 얘기 하실 때 표정은 안 적을게요. 그건 탐정님 몫이고요."',
];

// 처음 듣는 알리바이.
const LEAD_ALIBI = [
  '{topic} 잠깐 기억을 더듬는 얼굴이 된다.',
  '{topic} 손가락으로 무언가를 꼽아 보고 나서 대답한다.',
  '{topic} 시선을 한 번 내렸다가 든다.',
  '{topic} 별다른 망설임 없이 대답한다.',
  '{topic} 대답하기 전에 숨을 한 번 고른다.',
];

// 이미 한 말을 다시 묻는 자리. 되풀이한다는 것 자체가 이 장면의 내용이라
// 리드가 그걸 말한다 — 답은 마스터 문장 그대로다.
const LEAD_ALIBI_AGAIN = [
  '{topic} 아까 했던 말을 그대로 되풀이한다.',
  '{topic} 한 글자도 바꾸지 않고 같은 말을 한다.',
  '{name}의 대답은 처음과 토씨 하나 다르지 않다.',
  '{topic} 조금 지친 얼굴로 같은 이야기를 다시 꺼낸다.',
  '{topic} 묻기 전에 이미 대답을 준비하고 있던 사람처럼 말한다.',
];

const JIWOO_ALIBI_AGAIN = [
  '"...아까랑 똑같네요. 토씨까지요."',
  '"외운 사람처럼 말씀하시는데, 원래 저러시는 걸 수도 있고요."',
  '"두 번 다 같은 말인 건 적어 둘게요. 그게 좋은 쪽인지는 모르겠지만요."',
  '"보통은 두 번째에 뭐가 하나쯤 더 붙던데요."',
  '"저는 제 알리바이도 저렇게는 못 말해요."',
];

// 관계를 묻는 자리. {role}에 상대 이름이 들어간다 — 이 풀에서만 쓰는
// 용법이라 자리 이름과 뜻이 어긋나지만, fill()에 키를 하나 더 파는 것보다
// 이쪽이 낫다고 봤다.
const LEAD_RELATION = [
  '{topic} 잠깐 다른 곳을 본다. {role} 이야기다.',
  '{role} 이름이 나오자 {topic} 자세를 조금 고친다.',
  '{topic} 오래 알던 사람 이야기를 하는 말투가 된다.',
  '{topic} 한 박자 쉬고 대답한다.',
  '{topic} 그 이름을 한 번 되뇐다.',
  '{topic} 손에 쥐고 있던 것을 내려놓고 말한다.',
];

// 한지우는 관계를 판단하지 않는다. 방금 나온 말의 결을 짚거나, 적어 둔다는
// 말만 한다.
const JIWOO_RELATION = [
  '"사이가 나쁘지 않았다는 말씀이시죠. 적어 둘게요."',
  '"이런 건 물어보면 다들 비슷하게 말씀하시더라고요."',
  '"좋게 말하는 게 예의인 자리이긴 하죠."',
  '"관계도부터 그려 둘까요. 나중에 헷갈리니까요."',
  '"저는 이름만 적었어요. 나머지는 탐정님이 보셨겠죠."',
  '"말씀은 짧은데 표정은 안 짧네요."',
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

// Coming back to someone after their story has already been dented once.
const LEAD_RELUCTANT = [
  '{topic} 한참 말이 없다가, 결국 입을 연다.',
  '{topic} 탐정을 한 번 보고는 시선을 떨군다.',
  '{topic} 짧게 한숨을 쉰다.',
  '{topic} 주위를 한 번 살피고 목소리를 낮춘다.',
  '{topic} 더는 못 버티겠다는 듯 어깨를 내린다.',
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
  '{topic} 그것을 받아 들지도 않는다. "그걸 왜 저한테 보여 주시는지."',
  '{topic} 짧게 눈을 감았다 뜬다. "저는 모르는 일입니다."',
  '{topic} 손끝으로 탁자를 두어 번 두드린다. "더 하실 말씀 있으세요?"',
  '{topic} 어깨를 한 번 으쓱한다. "글쎄요."',
  '{topic} 그것을 힐끗 보고 만다. "그래서 뭐가 달라지나요."',
  '{topic} 되레 탐정을 빤히 본다. "저를 의심하시는 겁니까?"',
];

// 맞는 카드인데 짝이 아직 모자랄 때. 시치미와 같은 자리에서 돌아오지만
// 반드시 한 박자가 어긋나 있어야 한다 — 플레이어가 읽는 것은 뱃지가 아니라
// 이 문장이고, 여기가 "계속해도 된다"를 말할 수 있는 유일한 자리다.
// 인정은 하나도 내주지 않는다. 그건 단계가 깨질 때의 몫이다.
const NPC_PARTIAL = [
  '{topic} 그것을 한 번 내려다본다. 대답이 반 박자 늦는다. "……그게 왜요."',
  '{name}의 시선이 그 위에 잠깐 머문다. "그래서 하시려는 말씀이 뭡니까."',
  '{topic} 탁자에서 손끝을 뗀다. "그것만 가지고 무슨 말씀을 하시려는 건지."',
  '{topic} 짧게 숨을 고르고 나서 대답한다. "……계속하시죠."',
  '{topic} 자세를 고쳐 앉는다. 아까보다 조금 느리다. "그게 전부입니까?"',
  '{topic} 그것을 밀어내지는 않는다. "더 있으면 마저 꺼내 보세요."',
  '{name}의 대답이 한 번 끊겼다가 이어진다. "……그건 아까 말씀드린 거랑 상관없는 얘기죠."',
];

// 한지우가 말할 수 있는 범위 안이다 — 방금 화면에서 벌어진 반응을 되짚고,
// 아직 덜 놓였다는 것까지만 말한다. 어느 카드인지도, 다음에 누구를 볼지도
// 말하지 않는다.
const JIWOO_PARTIAL = [
  '"방금은 표정이 좀 달랐어요. 아까 다른 것들 보여 줬을 때랑요."',
  '"이걸로 반쯤 온 것 같은데요. 같이 놓을 게 {count}쯤 더 있지 않을까요."',
  '"한 장으로는 안 버티나 봐요. 나란히 놓으면 또 다를 텐데요."',
  '"말 끊긴 데는 표시해 뒀어요. 저기서 뭔가 걸린 거예요."',
  '"{count} 더 얹으면 저 얼굴이 안 버틸 것 같은데요."',
  '"지금 건 버렸다고 적지 않을게요. 아직 안 끝난 것 같아서요."',
  '"저 사람이 방금 탐정님 손을 봤어요. 뭘 더 꺼낼지 보는 거죠."',
];

// Shown something they have already conceded. They are past it, and none of
// these give an inch more than the stage already released.
// Several cards going down together is a different physical beat from one, so
// the turn opens on the gesture before the answer comes.
// The fetch itself. Three voices, because this turn is the one place the
// offline GM has 한지우 do something instead of comment on something —
// worth spending the lines on.
const LEAD_SUMMON = [
  '한지우가 수첩을 접고 나간다. 잠시 뒤 {topic} 마지못한 걸음으로 {place}에 들어선다.',
  '한지우가 자리를 비운 사이 {placeTopic} 조용해진다. 문이 다시 열리고 {topic} 들어온다.',
  '부탁을 받은 한지우가 복도로 사라진다. 돌아올 때는 {topic} 반 발짝 뒤에 있다.',
  '오래 걸리지 않는다. 한지우가 {object} 데리고 {placeDirection} 돌아온다.',
  '{topic} 하던 일을 놓고 온 표정으로 {place}에 선다. 한지우는 그 뒤에서 문을 닫는다.',
];

const DETECTIVE_SUMMON = [
  '"지우야, {name} 씨 좀 불러다 줘."',
  '"{name} 씨한테 잠깐만 시간을 내달라고 해."',
  '"한 번 더 앉혀야겠어. {name} 씨로."',
  '"발품은 네가 팔아라. {name} 씨 있는 데 알지."',
];

const JIWOO_SUMMON = [
  '"제가 다녀올게요. 탐정님이 가면 또 한 시간이잖아요."',
  '"모셔 왔어요. 가는 길에 아무 말도 안 붙였고요."',
  '"부르면 오시긴 하네요. 저는 그게 더 신기해요."',
  '"다음엔 좀 미리 말해 줘요. 저도 숨은 쉬어야죠."',
  '"데려왔으니까 이번엔 제대로 물어보세요."',
];

const LEAD_PRESENT_SET = [
  '탐정이 그것들을 나란히 내려놓는다.',
  '한 장씩, 탁자 위에 차례로 놓인다.',
  '탐정은 그것들을 함께 밀어 놓는다.',
  '{topic} 늘어놓인 것들을 차례로 훑는다.',
  '탐정이 손에 쥐고 있던 것을 전부 꺼낸다.',
];

const NPC_SPENT = [
  '{topic} 같은 것을 다시 내려다보고는 짧게 고개를 젓는다. "그 얘긴 아까 했잖습니까."',
  '{topic} 눈도 마주치지 않는다. "아까 말씀드린 그대로입니다."',
  '{topic} 지친 듯 손을 한 번 내젓는다. "몇 번을 보여 주셔도 똑같아요."',
  '{topic} 이미 안다는 얼굴이다. "그건 방금 인정했습니다."',
  '{topic} 입술을 한 번 깨문다. "……또요?"',
  '{topic} 팔짱을 낀 채 미동도 없다. "제 대답은 아까와 같습니다."',
  '{topic} 짧게 숨을 내쉰다. "그거 말고 다른 건 없으십니까."',
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

// 헛수고 자리도 이 풀을 쓴다. 한지우는 "여긴 아니네요" 정도만 하고 다음에
// 어디를 보라고는 하지 않는다 — 그건 탐정의 몫이고 힌트 버튼의 몫이다.
const JIWOO_NOTHING = [
  '"오늘은 여기까지인가 보네요."',
  '"헛걸음도 일이죠, 뭐."',
  '"이런 날도 있어요. 저는 이미 익숙해요."',
  '"표정 관리 하세요. 다 보여요."',
  '"아무것도 안 나온 것도 적어 둘게요. 나중에 헷갈리시니까."',
  '"여긴 아닌가 보네요."',
  '"저는 기대 안 했어요. ...조금은 했고요."',
  '"손 터세요. 먼지 묻었어요."',
  '"다음 거 보실 거죠? 저 아직 안 지쳤어요."',
  '"괜찮아요. 다 뒤져 보는 게 일이잖아요."',
];

const JIWOO_DISCOVERY = [
  '"...이건 그냥 넘기면 안 되겠네요."',
  '"손 대기 전에 한 번만 더 보실래요? 제가 붙잡고 있을게요."',
  '"찾으셨네요. 축하는 이따 하고요."',
  '"방금 표정 바뀌신 거 아세요?"',
  '"이런 건 또 잘 찾으시네요. 어제 우산은 못 찾으셨으면서."',
  '"적어 뒀어요. 무슨 의미인지는 안 물어볼게요, 어차피 말 안 해 주실 거."',
  '"표정 관리 좀 하세요. 벌써 다 아는 사람 얼굴인데요."',
  '"그거 원래 거기 있던 건 아니죠. 저도 그 정도는 알아요."',
  '"사진부터 찍을게요. 손은 그 다음에 대시고요."',
  '"이런 날 커피값은 탐정님이 내는 겁니다."',
  '"모른 척할까요, 아니면 놀라는 시늉이라도 해 드려요?"',
  '"...하나 나왔네요. 저는 아직 아무 말도 안 했습니다."',
];

const DETECTIVE_DISCOVERY = [
  '"잠깐."',
  '"이거 좀 봐."',
  '"...아직 아무 말도 하지 마."',
  '"이건 적어 둬."',
  '"여기 있었네."',
  '"한지우."',
  '"...그럼 그렇지."',
  '"이래서 못 나가는 거야."',
  '"메모."',
  '"거봐."',
  '"손전등 말고 수첩."',
  '"됐어, 찾았어."',
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

// 의심이 풀리는 자리. 단계 돌파와 정반대의 박자다 — 굳는 것이 아니라
// 풀어지는 것이고, 이 사람은 이제 이 사건에서 걸어 나간다.
const LEAD_HERRING_CLEAR = [
  '{name}의 어깨에서 힘이 빠진다. 대답이 처음으로 길어진다.',
  '{topic} 그제야 제대로 탐정을 본다.',
  '{topic} 짧게 숨을 내쉬고는 감추던 것을 마저 꺼낸다.',
  '{topic} 손끝을 풀고 자세를 고쳐 앉는다. 목소리가 한 톤 낮아진다.',
  '{name}의 표정에서 경계가 걷힌다.',
];

const JIWOO_HERRING_CLEAR = [
  '"...이 분은 아니었네요. 줄 하나 그어 둘게요."',
  '"한 명 줄었어요. 그게 나아진 건지는 모르겠지만요."',
  '"의심해서 죄송하다고는 제가 대신 말 못 해 드려요."',
  '"아까 그 표정은 이거였구나 싶네요."',
  '"남은 사람이 줄면 그만큼 좁아지는 거죠."',
  '"수첩에서 지우진 않을게요. 지운 이유도 기록이니까요."',
];

// 방금 한 사람이 더 의심스러워졌다. 한지우는 그 자리에서 결론을 내리지
// 않는다 — 규칙대로 방금 나온 것을 되짚고, 누구를 다음에 볼지는 말하지
// 않는다. 다만 이 사람을 그냥 지나치기는 어려워졌다는 것까지는 말한다.
const JIWOO_DEEPENER = [
  '"...그 얘기는 아까 안 하셨던 것 같은데요."',
  '"방금 건 따로 적어 둘게요. 어디에 걸릴지는 몰라도요."',
  '"이 분을 그냥 넘기기는 좀 어려워졌네요."',
  '"저는 아무 말도 안 했습니다. 표정도 안 지었고요."',
  '"묻지도 않았는데 나온 얘기라, 그게 더 걸려요."',
  '"수첩이 한 줄 늘었어요. 지우기는 탐정님이 정하세요."',
  '"아까보다 말이 길어지셨는데, 그게 좋은 신호인지는 모르겠어요."',
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
  '"저건 진짜 모르는 얼굴인지, 잘 만든 얼굴인지 모르겠네요."',
  '"방금 건 안 통했다고 적을게요. 통한 것도 언젠가 적겠죠."',
  '"카드가 아직 남아 있으니까요."',
  '"순서가 문제일 수도 있고요. 그건 탐정님이 정하실 일이지만."',
  '"저라도 저렇게 대답했을 것 같긴 해요."',
  '"물러서는 것처럼 보이면 안 되니까, 표정만 유지하세요."',
  '"괜찮아요. 아직 시간 있어요."',
];

// The player just re-played a card that already worked on this person. Jiwoo
// says so — it is a thing that happened on screen a moment ago, not a reading
// of what it means or a nudge toward what to do instead.
const JIWOO_SPENT = [
  '"그건 아까 이미 통했어요."',
  '"같은 카드 두 번 낸다고 두 번 먹히진 않죠."',
  '"저 사람이 인정한 다음이잖아요, 그건."',
  '"아까 표정 바뀌는 거 보셨으면서."',
  '"수첩에 적혀 있어요. 보여 드려요?"',
  '"두 번째는 확실히 덜 극적이네요."',
  '"이미 받아낸 건데요."',
  '"저는 아까 그 장면으로 충분했어요."',
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
