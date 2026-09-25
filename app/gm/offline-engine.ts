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
  type NpcKnowledgeIndex,
  buildMasterIndex,
} from './master-index';
import {
  effectiveNpcLocation,
  summonedNow,
  summonMarker,
} from './offline-summon';
import {
  HYPOTHESIS_SLOTS,
  type HypothesisSlot,
  SLOT_LABEL,
  actTwo,
  candidateText,
  candidatesFor,
  clearMarker,
  confirmedMarker,
  hypothesisEnabled,
  candidateLocked,
  hypothesisView,
  judgeConfirm,
  judgePress,
  nextSeq,
  pressedMarker,
  pressedWho,
  refutedMarker,
  setMarker,
  wouldOpenActTwo,
} from './offline-hypothesis';

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
  // 이 카드를 주운 턴에 두 사람이 주고받는 말. 마스터가 써 둔 것이 있으면
  // 공용 풀 대신 그것이 나간다 — 풀은 2,604장이 같이 쓰므로 무엇을 찾았든
  // 물건을 입에 올릴 수 없다. 없으면 종전대로 풀로 떨어진다.
  reaction?: { jiwoo: string; detective: string };
  // 이 카드가 증명하지 **않는** 것. 마스터가 2,604장 중 2,508장에 써 뒀는데
  // 오프라인 GM 은 한 번도 읽지 않았다(AI 경로만 봤다). 이름이 `_fact_ids`
  // 지만 실제로 담긴 것은 id 가 아니라 산문이다 — 「누가 닦았는지」처럼
  // 대부분 명사구이고, 그래서 문장 틀에 그대로 들어간다.
  does_not_prove_fact_ids?: string[];
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
  // 서술의 뒷토막. 비어 있지 않으면 화면은 message → 탐정의 줄 → 이 토막
  // 순으로 셋을 쌓고, 그 턴에 들은 진술은 이쪽에 달린다. 첫 대면이 이것을
  // 쓴다 — 인사만 받고 곧바로 진술이 쏟아지던 것을 탐정이 한 번 묻고 나서
  // 나오게 가른 자리다(2026-09 사용자 지적).
  message_tail?: string | null;
  detective_line: string | null;
  // 'reply' 는 한지우 다음이다. 지금까지 탐정은 언제나 한지우보다 먼저
  // 말했고, 그래서 두 사람이 같은 턴에 말해도 서로 주고받은 적이 없다 —
  // 각자 한 마디씩 했을 뿐이다. 우선순위 2번이 말하는 티키타카는 받아치는
  // 쪽에서 나온다.
  detective_line_position: 'before' | 'after' | 'reply';
  jiwoo_line: string | null;
  jiwoo_line_position: 'before' | 'after';
  // 두 줄을 넘어가는 주고받기. detective_line/jiwoo_line 은 한 사람이 한
  // 마디씩 하는 자리라, 여섯 줄짜리 대화를 담을 수가 없다. 비어 있지 않으면
  // 이쪽이 그 두 필드를 대신하고, 순서는 배열 그대로다.
  //
  // 전환점에서만 쓴다 — 매 턴 대화가 붙으면 수사가 아니라 시트콤이 된다.
  exchange: Array<{ who: 'detective' | 'jiwoo'; line: string }>;
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
  // 이 턴의 한지우 줄은 잡담이 아니라 신호다 — 쿨다운으로 지우면 안 된다.
  //
  // planOfflineTurn 은 카드가 나왔는지·단계가 움직였는지만 보고 한지우를
  // 쉬게 할지 정한다. 그런데 아무것도 안 움직인 턴에 실리는 한지우 줄
  // 중에 둘은 그 턴의 내용 자체다. 「한 장쯤 더 있지 않을까요」는 지금
  // 제시가 열린 단계에 몇 장 모자라는지를 세어서 나오는 것이고,
  // 「토씨까지 똑같네요」는 같은 알리바이가 두 번 나왔다는 지적이다.
  // 둘 다 지워지면 플레이어에게는 아무 일도 안 일어난 턴으로 보인다 —
  // CASE289 실플레이에서 실제로 그랬다.
  jiwooEssential?: boolean;
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
  // 위 지도에 담긴 카드 id 전부. 같은 카드를 방 뒤지기 보기로도 내놓지
  // 않으려고 둔다 — 아래 buildOfflineActionMenu 의 주석 참고.
  questionCardIds: Set<string>;
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
    questionCardIds: new Set(
      [...questionsByNpc.values()].flatMap((cards) =>
        cards.map((card) => card.id),
      ),
    ),
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

// 서술격 조사 '이다'의 두 꼴. 받침이 없으면 '이'가 빠진다 —
// "기원 총무이시죠"가 아니라 "기원 총무시죠", "지도기사이라는"이 아니라
// "지도기사라는"이다. 직함이 그대로 들어오는 자리라 손으로 못 정한다.
function withHonorificCopula(word: string): string {
  return `${word}${hasBatchim(word) ? '이시죠' : '시죠'}`;
}

function withQuotedCopula(word: string): string {
  return `${word}${hasBatchim(word) ? '이라는' : '라는'}`;
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
    .replace(
      /\{roleCopula\}/g,
      values.role ? withHonorificCopula(values.role) : '',
    )
    .replace(
      /\{roleQuoted\}/g,
      values.role ? withQuotedCopula(values.role) : '',
    )
    // 「곽태섭」이라는 / 「배준서」라는 / 「…막으려고」라는 — 괄호 안 마지막
    // 글자의 받침을 본다. 「곽태섭」라는 으로 나갔다(CASE001 실플레이).
    .replace(
      /\{roleBracketCopula\}/g,
      values.role
        ? `「${values.role}」${hasBatchim(values.role) ? '이라는' : '라는'}`
        : '',
    )
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
// 방의 한 칸을 언제 열 것인가. 마스터의 `detail_rules[].requires` 를 읽는다.
//
// 오래 이 함수는 사람 이름 하나만 알았다 — 「없음」이 아닌 requires 34개 중
// 이름만 적힌 20개만 걸렸고, id 가 적힌 12개(10건. CASE113·CASE177 의 `E01`,
// CASE226 의 `C01`/`C02` 처럼 id 만 쓴 것 포함)는 조용히 통과했다. 그래서
// 방은 대부분 들어서는 순간 뒤질 것이 전부 펼쳐지는 체크리스트였다. id 를
// 읽게 해 두면 「사람에게 들은 말이 방의 두 번째 층을 연다」를 마스터가 쓸
// 수 있다. 이름과 id 가 같이 적힌 것은 id 가 이긴다 — 「유서인의 증언(E06)을
// 먼저 들어야」는 그 사람을 만났는가가 아니라 그 카드를 손에 넣었는가다.
//
// 힌트는 무엇이 잠겨 있는지가 아니라 **어디로 가야 하는지**만 말한다. 카드
// 제목이나 진술 내용을 적으면 잠가 둔 것을 자물쇠가 읽어 주는 꼴이 된다.
function requirementBlock(
  requires: string,
  selectedCase: EngineCase,
  state: EngineState,
): string | null {
  const text = (requires || '').trim();
  if (!text || text === '없음') return null;

  // 증거 카드: 손에 들고 있어야 한다. 여기서는 「누구에게 제시했는가」가
  // 아니다 — 방을 여는 것은 사람 앞에 내려놓는 행동이 아니라 가지고 온 것이다.
  const cardId = text.match(/\bE\d{2}\b/)?.[0];
  if (cardId) {
    return state.acquired_information.includes(cardId)
      ? null
      : '아직 근거가 될 것을 찾지 못했다';
  }
  // 들은 말(진술·관찰 사실)이 여는 칸.
  const heardId = text.match(/\b(?:F-CH\d{2}-\d{2}|F-L\d{2}-OBS-\d{2}|S-CH\d{2}-\d{2})\b/)?.[0];
  if (heardId) {
    return state.heard_statements.includes(heardId)
      ? null
      : '아직 이곳을 뒤질 근거를 듣지 못했다';
  }
  // 대립 단계가 여는 칸.
  const stageId = text.match(/\bC\d{2}\b/)?.[0];
  if (stageId) {
    return state.completed_actions.includes(`stage|${stageId}`)
      ? null
      : '아직 이곳을 뒤질 근거를 듣지 못했다';
  }

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
  // 「대화를 마친다」는 창 밖에 둔다. 아래에서 면담 보기를 세 개로 자르는데,
  // 이것이 네 번째로 밀리면 대화에서 나올 방법이 사라진다.
  let leaveAction: OfflineAction | null = null;
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
      if (
        !done(state, `alibi|${interviewId}`) &&
        (alibiClaimFor(index, state, interviewId) ||
          privateMovementsOf(index, interviewId).length)
      ) {
        actions.push({
          id: `alibi|${interviewId}`,
          label: `${npc.name}에게 사건 당시 어디에 있었는지 묻는다`,
          group: '면담',
        });
      }
      // 사건이 바뀌어도 추리물이면 늘 하게 되는 질문 — 피해자와 어떤 사이였나.
      // Master의 relationships가 그 답을 이미 갖고 있고(CASE294는 관계 4개 중
      // 3개가 피해자와의 관계다), nature/public_face는 "누구에게 물어도 나오는
      // 공개 정보"라 여기서 그대로 내보낼 수 있다. private_strain은 이 첫
      // 박자에 싣지 않는다 — 먼저 꺼내지 않는 것이 그 필드의 정의고, 조건을
      // 채운 뒤의 두 번째 박자가 아래에 따로 있다.
      for (const other of relationPartners(index, selectedCase, interviewId)) {
        if (done(state, `rel|${interviewId}|${other.key}`)) continue;
        actions.push({
          id: `relation|${other.key}|${interviewId}`,
          label: `${npc.name}에게 ${withComitative(other.name)} 어떤 사이였는지 묻는다`,
          group: '면담',
        });
      }
      // 두 번째 박자 — 균열. 공개용 대답을 이미 들었고, surfaces_when이 부르는
      // 것을 탐정이 실제로 손에 넣었을 때만 열린다. 한 번 닫혔던 칸이 다시
      // 열리는 것 자체가 신호다: 같은 사람에게 같은 상대를 또 물을 수 있게
      // 됐다는 것은 그 사이에 무언가가 바뀌었다는 뜻이다.
      for (const other of relationPartners(index, selectedCase, interviewId)) {
        if (!done(state, `rel|${interviewId}|${other.key}`)) continue;
        const rel = relationshipBetween(index, interviewId, other.key);
        if (!rel || done(state, `strain|${strainKey(rel)}`)) continue;
        if (!strainReady(state, rel)) continue;
        // 감추고 있는 쪽 본인에게만 묻는다.
        if (strainSubject(selectedCase, rel) !== interviewId) continue;
        actions.push({
          id: `strain|${other.key}|${interviewId}`,
          label: `${npc.name}에게 ${withComitative(other.name)}의 사이를 다시 묻는다`,
          group: '면담',
        });
      }
      // 가설 보드 — 채워 두고 아직 굳지 않은 칸은 이 사람에게 들이댈 수 있다.
      // 후보를 고르는 것과 굳히는 것은 보드의 일이라 여기 없고(composed),
      // 들이대는 것만 보기로 뜬다. 보드가 없는 사건은 아무것도 안 뜬다.
      if (hypothesisEnabled(index.master)) {
        const board = hypothesisView(index.master, state, selectedCase.npcs);
        const pressed = pressedWho(state);
        for (const slot of HYPOTHESIS_SLOTS) {
          const filled = board.slots[slot];
          if (!filled || board.confirmed[slot]) continue;
          // 이미 접힌 후보는 다시 들이대도 같은 반박이 또 나올 뿐이다.
          // 반박당해도 칸을 비우지 않기로 했으므로(2026-09 사용자 결정 —
          // 무엇을 이미 지웠는지가 플레이어의 기록이다) 접힌 후보가 칸에
          // 걸린 채 남고, 막지 않으면 이 보기가 매 턴 다시 뜬다.
          if (board.refuted[slot].includes(filled.id)) continue;
          if (candidateLocked(index.master, state, slot, filled.id)) continue;
          // 「누가」는 지목당한 본인에게만, 한 번만. 남 앞에서는 뜨지 않는다.
          if (slot === 'who') {
            if (filled.id.replace(/^CH/, 'N') !== interviewId) continue;
            if (pressed.includes(filled.id)) continue;
          }
          actions.push({
            id: `hypothesis|press|${slot}|${interviewId}`,
            label: `${npc.name}에게 가설을 들이댄다: ${SLOT_LABEL[slot]} — ${filled.text}`,
            group: '면담',
          });
        }
      }
      for (const card of index.questionsByNpc.get(interviewId) || []) {
        if (state.acquired_information.includes(card.id)) continue;
        actions.push({
          id: `ask|${card.id}`,
          label: card.condition || `${npc.name}에게 묻는다`,
          group: '면담',
        });
      }
      // 남을 지목하는 말(`points_finger`)은 보기가 아니다 — 위의 관계 질문
      // 답 뒤에 흘러나온다(`pendingFinger`). 한때 「누가 그랬다고 생각하는지
      // 묻는다」 보기가 따로 있었다(2026-09-24 에 뺌).
      // 되묻는 말이 품고 있던 질문. 첫 대면이 미뤄 둔 진술(ECHO_HINT)은
      // 그 자체가 무엇을 물어야 나오는 말인지 적고 있으므로, 화제를 뽑아
      // 보기로 세운다. 「명 코치님요? 그냥 인사하는 사이죠.」가 인사 다음
      // 줄에 혼자 나오던 것이 이제 「명 코치님에 대해 묻는다」를 누른 뒤에
      // 나온다.
      for (const claim of echoClaimsFor(index, state, interviewId)) {
        actions.push({
          id: `echo|${interviewId}|${claim.id}`,
          label: `${npc.name}에게 ${claim.topic}에 대해 묻는다`,
          group: '면담',
        });
      }
      // 남은 것이 있는 동안만 뜬다. 누를 때마다 하나씩 나오고, 다 나오면
      // 사라진다 — 남아 있다는 것 자체가 아직 들을 것이 있다는 표시다.
      //
      // 잠금이 풀린 진술도 여기서 나온다. 전에는 hidden_until 이 열려도
      // 「자리를 뜨고 다시 말을 건다」로만 나왔는데, 앉아 있는 사람에게
      // 방금 카드를 내밀어 문이 열린 자리에서 그러면 플레이어는 이 사람에게
      // 더 들을 것이 없다고 읽고 일어선다. 라벨은 한 가지로 둔다 — 「지금
      // 뭔가 열렸다」를 버튼이 먼저 말해 버리면 잠가 둔 뜻이 없다.
      if (
        recallableFacts(index, state, interviewId).length ||
        unlockedByGate(index, state, interviewId)
      ) {
        actions.push({
          id: `recall|${interviewId}`,
          label: `${npc.name}에게 그 밖에 이상한 점은 없었는지 묻는다`,
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
      // 예외 하나. **그 사람에게 물어서 받은 카드는 그 사람에게 내밀지
      // 않는다.** 「표시온 알리바이 증언을 표시온에게 제시한다」가 메뉴에
      // 떠 있었다 — 방금 그 사람 입에서 들은 말을 그 사람 앞에 도로 꺼내
      // 놓는 행동이다. 코퍼스에서 레드헤링 126개가 그것을 해소 조건으로
      // 걸고 있었고(2026-09 실플레이 신고), 그쪽은 손에 든 것만으로 조건이
      // 차도록 고쳤으므로 이 보기는 이제 할 일이 없다.
      //
      // 위의 「거르지 않는다」와 어긋나지 않는다. 그 규칙은 **이미 보여 준
      // 것을 숨기지 않는다**는 말이지, 성립하지 않는 행동까지 늘어놓으라는
      // 말이 아니다.
      //
      // 한때 여기 예외가 하나 있었다 — 대립 단계가 **본인 카드**를 열쇠로
      // 쥐고 있던 8건(CASE212·264~267)은 이 필터에 걸리면 단계가 영영 안
      // 열려서, 지웠더니 311건 중 6건이 완주 불가가 됐다. 2026-09 에 그
      // 8건의 열쇠를 **남의 카드나 장소 카드**로 옮겨 예외를 없앴다.
      // 자기 입으로 한 말을 자기 앞에 도로 놓는 것은 절차지 추리가
      // 아니므로, 그것으로만 열리는 단계는 애초에 단계가 아니었다.
      // 「○○에게」로 **시작**하는 것만 본다. questionsByNpc 는 조건 안에서
      // 가장 먼저 나오는 이름을 주인으로 잡는데, CASE047 의 「동창들에게
      // 매서준의 옷차림에 대해 묻는다」는 동창들이 인물 목록에 없어서
      // 매서준 것이 되어 버린다. 그건 남이 그 사람에 대해 한 말이므로
      // 본인에게 내미는 것이 당연히 성립한다.
      const fromThisNpc = new Set(
        (index.questionsByNpc.get(interviewId) || [])
          .filter((card) =>
            (card.condition || '').startsWith(`${npc.name}에게`),
          )
          .map((card) => card.id),
      );
      // 네 칸이 다 굳기 전에는 카드를 들이대지 않는다. 한때 「누가」 한
      // 칸으로 갈라 봤는데(2026-09), 그러면 **제시는 되는데 아무 일도
      // 일어나지 않는다** — 대립 단계는 여전히 네 칸에 걸려 있으므로
      // 헛방만 돌아오고, 플레이어는 그것을 고장으로 읽는다(CASE001 실플레이
      // 사용자 지적). 닫혀 있는 것이 헛도는 것보다 낫다.
      // 보드가 없는 사건은 늘 열려 있다.
      const mayPresent = actTwo(index.master, state);
      for (const cardId of state.acquired_information) {
        const card = index.cardById.get(cardId);
        if (!card) continue;
        if (fromThisNpc.has(cardId)) continue;
        if (!mayPresent) continue;
        actions.push({
          id: `present|${cardId}|${interviewId}`,
          label: `${withObject(card.title)} ${npc.name}에게 제시한다`,
          group: '증거 제시',
          detail: card.summary,
        });
      }

      leaveAction = {
        id: 'leave',
        label: `${withComitative(npc.name)}의 대화를 마친다`,
        group: '면담',
      };
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
    // 사람에게 묻는 것이 방 뒤지기 보기로 떠 있던 것. 마스터가 증언 카드의
    // 발견을 `detail_rules` 에도 적어 두면 「○○에게 …를 묻는다」가 「현장」
    // 목록에 서고, 그걸 누르면 물건을 뒤지는 지문과 3인칭 보고문이 나간다 —
    // CASE001 실플레이에서 「하연우에게 어르신이 어떻게 승낙했는지 묻는다」에
    // 「탐정은 그것부터 집어 든다」가 붙었고, 마스터가 써 둔 하연우의 대사는
    // 화면에 한 번도 안 나왔다. 같은 카드가 면담 보기(`ask|`)로 이미 열리고
    // 그쪽은 인물의 지문·탐정의 질문·따옴표 친 대사를 쓴다. 코퍼스 1,956개
    // 중 124개(48건)가 이 모양이고 **124개 전부** ask 로도 열린다.
    if (rule.evidenceId && index.questionCardIds.has(rule.evidenceId)) {
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
          // 데려오는 것으로 끝나지 않고 그 자리에서 면담이 이어지므로
          // 라벨도 거기까지 말한다.
          label: `한지우가 ${withObject(npc.name)} 데려와 앉힌다`,
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
  return capChoices(selectedCase, actions, leaveAction);
}

// 첫 대면에 쏟는 진술 수.
//
// 마스터의 initial_interview_range 를 그대로 따르면 첫 인사 뒤에 그 사람이
// 아는 것을 전부 말해 버린다. CASE289 실플레이 신고 — 탁우진이 한마디 뒤에
// 다섯 줄을 연달아 쏟았고, 그중 셋이 알리바이·관계 질문의 답이라 뒤이어
// 뜨는 보기들이 이미 들은 말을 다시 묻는 꼴이 됐다.
//
// 코퍼스 1,533명 중 780명이 원래 한 줄, 618명이 두 줄이라 흔한 경우는
// 멀쩡하다. 문제는 셋 이상인 135명이다. 두 줄로 자르면 그 135명만 바뀐다.
//
// 잘린 진술은 사라지지 않는다 — 다시 말을 걸면 nextUnlockedDisclosure 가
// 하나씩 내놓는다(아래 range 건너뛰기를 없앤 것이 그 때문이다). 단계가
// 그 진술을 조건으로 걸고 있어도 도달할 수 있다.
const FIRST_MEETING_CLAIMS = 2;

// 한 번에 보여 주는 보기 수. 열 개가 한꺼번에 깔리면 고르는 것이 아니라
// 훑는 것이 되고, 방을 기억하는 대신 목록을 읽게 된다.
const MENU_VISIBLE = 3;

// 「현장」과 「면담」을 세 개씩만 내놓는다. 둘 다 쓰면 사라지는 보기라
// — 살펴본 자리도, 물어본 것도 다음 턴에는 목록에서 빠진다 — 세 칸을
// 유지하면 쓴 자리를 다음 것이 자동으로 채운다.
//
// 어느 셋인지는 사건·보기 id 로 정해진 해시가 고른다. 무작위가 아니라
// 고정이라, 같은 방에 다시 들어와도 아까 보던 목록이 그대로 있다 — 매번
// 섞이면 플레이어가 방을 기억하는 방식이 무너진다.
//
// 두 가지를 창 밖에 둔다. 「대화를 마친다」는 언제나 보여야 하고(밀리면
// 대화에서 나올 수 없다), 조건이 안 맞아 잠긴 보기는 뒤로 미룬다 — 잠긴
// 것 셋이 칸을 다 차지하면 그 방에서 할 수 있는 일이 없어진다.
function capChoices(
  selectedCase: EngineCase,
  actions: OfflineAction[],
  leaveAction: OfflineAction | null,
): OfflineAction[] {
  const capped: OfflineAction[] = [];
  for (const group of ['면담', '현장'] as const) {
    const remaining = actions.filter((action) => action.group === group);
    // 남은 것이 전부 헛수고 자리면 한 칸도 안 내놓는다(2026-09 사용자 결정).
    // 그 방에서 실제로 나올 것은 이미 다 나왔고, 남은 버튼을 누르는 것은
    // 시간만 쓰는 일이다. 대신 도착 서술에 「살펴볼 것은 다 봤다」가 붙는다.
    // 전체 남은 것으로 판정한다 — 창에 잘린 세 개만 보면, 헛것 셋이 앞에
    // 서 있을 때 뒤의 진짜가 영영 안 나온다.
    if (
      group === '현장' &&
      remaining.length > 0 &&
      remaining.every((action) => action.id.startsWith('probe|'))
    ) {
      continue;
    }
    const ordered = remaining.sort((a, b) => {
      const lock = Number(Boolean(a.disabled)) - Number(Boolean(b.disabled));
      if (lock !== 0) return lock;
      return (
        hashOf(`${selectedCase.case_id}|${a.id}`) -
        hashOf(`${selectedCase.case_id}|${b.id}`)
      );
    });
    const items = ordered.slice(0, MENU_VISIBLE);
    // 면담에는 창이 막힐 수 있는 조합이 있다. 피해자·알리바이·관계 질문은
    // 눌러야 사라지는데, 그 셋이 창을 채우면 마스터가 써 둔 증언 카드
    // (`ask|`)가 영영 안 뜬다 — 그 카드를 보려고 관심 없는 질문 셋을 먼저
    // 태워야 하는 꼴이고, 그 카드가 대립 단계의 조건이면 사건 자체가 막힌다
    // (311건 검사에서 26건이 그렇게 걸렸다). 그래서 남은 것 중 증언 카드가
    // 있으면 한 자리는 그것에 내준다. 어느 자리인지는 드러나지 않는다 —
    // 셋 다 같은 모양의 버튼이다.
    //
    // 「그 밖에 이상한 점은 없었는지」도 같은 자리를 다툰다. 관계 질문은
    // 인물 수만큼 생기므로(넷이면 셋, 다섯이면 넷) 창을 늘 가득 채우고,
    // 그러면 이 보기는 영영 안 뜬다 — CASE290에서 오필두·서지완의 증언이
    // 한 번도 안 나온 것이 그 때문이었다. 증거 카드가 먼저다(그게 없으면
    // 사건이 막힐 수 있다). 카드가 떨어진 뒤에 이 자리를 물려받는다.
    // 되묻기 보기(`echo|`)도 같은 자리를 다툰다. 관계 질문이 인물 수만큼
    // 생겨 창을 늘 채우므로, 자리를 안 남기면 「명 코치님에 대해 묻는다」가
    // 영영 안 뜨고 그 진술은 아무 데서도 안 나온다 — 다시 말을 거는 자리는
    // 이 보기가 있다는 이유로 비켜 두고 있다.
    const reserved =
      ordered.find((action) => action.id.startsWith('ask|')) ||
      ordered.find((action) => action.id.startsWith('echo|')) ||
      ordered.find((action) => action.id.startsWith('recall|'));
    if (
      group === '면담' &&
      reserved &&
      !items.some((action) => action.id === reserved.id)
    ) {
      items[items.length - 1] = reserved;
    }
    capped.push(...items);
    if (group === '면담' && leaveAction) capped.push(leaveAction);
  }
  return [
    ...capped,
    ...actions.filter(
      (action) => action.group !== '면담' && action.group !== '현장',
    ),
  ];
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
  // 화면이 수첩 선택에서 행동 id 를 직접 조립해 보내므로(presentSelected),
  // 메뉴에서 빼는 것만으로는 막히지 않는다.
  if (!actTwo(index.master, state)) return null;
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

// 가설 보드의 행동. 칸에 걸 후보와 카드 조합은 화면이 고르므로 메뉴에 다
// 늘어놓을 수 없다 — 제시(composedPresentAction)와 같은 이유로 여기서
// 검증만 한다. 보드가 없는 사건(후보 목록이 없는 마스터)에서는 어떤 id 도
// 받지 않는다.
function composedHypothesisAction(
  selectedCase: EngineCase,
  state: EngineState,
  actionId: string,
): OfflineAction | null {
  const [kind, op, slotRaw, a] = actionId.split('|');
  if (kind !== 'hypothesis') return null;
  const index = indexFor(selectedCase);
  if (!hypothesisEnabled(index.master)) return null;
  if (!HYPOTHESIS_SLOTS.includes(slotRaw as HypothesisSlot)) return null;
  const slot = slotRaw as HypothesisSlot;
  const view = hypothesisView(index.master, state, selectedCase.npcs);

  if (op === 'set') {
    const candidate = candidatesFor(index.master, slot, selectedCase.npcs).find(
      (item) => item.id === a,
    );
    if (!candidate) return null;
    // 접힌 후보는 다시 걸 수 없다. 화면도 막지만 행동 id 는 화면을 거치지
    // 않고도 올 수 있고, 그 경로로는 같은 반박을 또 하고 턴만 썼다.
    if (view.refuted[slot].includes(candidate.id)) return null;
    // 떠올리게 한 재료(suggested_by)가 하나도 안 닿은 후보는 적을 수 없다 —
    // 들은 적 없는 생각은 수첩에 오르지 않는다(1막의 화폐는 말, 2026-09-25).
    // 재료가 안 적힌 옛 판본은 늘 열려 있다.
    if (candidateLocked(index.master, state, slot, candidate.id)) return null;
    // 근거 카드를 걸던 검사를 없앴다(2026-09 사용자 결정) — 카드가 한 장도
    // 없어도 칸은 적을 수 있다. 굳히는 것은 보드의 「굳힌다」가 한다.
    return {
      id: actionId,
      label: `가설을 적는다: ${SLOT_LABEL[slot]} — ${candidate.text}`,
      group: '사건',
    };
  }
  if (op === 'clear') {
    if (!view.slots[slot]) return null;
    return {
      id: actionId,
      label: `가설을 지운다: ${SLOT_LABEL[slot]}`,
      group: '사건',
    };
  }
  if (op === 'press') {
    const filled = view.slots[slot];
    if (!filled || a !== state.current_interview) return null;
    if (view.refuted[slot].includes(filled.id)) return null;
    if (slot === 'who') {
      if (filled.id.replace(/^CH/, 'N') !== a) return null;
      if (pressedWho(state).includes(filled.id)) return null;
    }
    const npc = index.npcById.get(a);
    if (!npc) return null;
    return {
      id: actionId,
      label: `${npc.name}에게 가설을 들이댄다: ${SLOT_LABEL[slot]} — ${filled.text}`,
      group: '면담',
    };
  }
  // 굳힘은 보드의 일이다 — 사람 앞이 아니어도 되고, 카드를 고르지 않는다.
  // 손에 든 카드가 그 줄을 받치는지만 본다(judgeConfirm).
  if (op === 'confirm') {
    const filled = view.slots[slot];
    if (!filled || view.confirmed[slot]) return null;
    return {
      id: actionId,
      label: `가설을 굳힌다: ${SLOT_LABEL[slot]} — ${filled.text}`,
      group: '사건',
    };
  }
  return null;
}

export function findOfflineAction(
  selectedCase: EngineCase,
  state: EngineState,
  actionId: string,
): OfflineAction | null {
  const listed = buildOfflineActionMenu(selectedCase, state).find(
    (action) => action.id === actionId && !action.disabled,
  );

  return (
    listed ||
    composedPresentAction(selectedCase, state, actionId) ||
    composedHypothesisAction(selectedCase, state, actionId)
  );
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
  justPresented: string[] = [],
): boolean {
  const id = (rawId || '').trim();
  if (!id || id === '없음') return true;
  if (/^C[0-9]+$/i.test(id)) {
    return state.completed_actions.includes(`stage|${id.toUpperCase()}`);
  }
  if (/^E[0-9]+$/i.test(id)) {
    return (
      justPresented.includes(id) ||
      state.presented_evidence.some(
        (item) => item.evidence_id === id && item.target_id === npcId,
      )
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
function unlockedByGate(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  justPresented: string[] = [],
): { id: string; content: string; reluctant: boolean } | null {
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return null;

  // 대립 단계가 내주기로 한 말은 그 단계가 깨질 때만 나온다. 1,020개 중
  // 233개(22.8%)가 자기 release 를 **같은 카드로 열리는** hidden_until 에
  // 도 걸어 두고 있어서, 카드를 내밀면 단계를 건드리지 않고도 그 말이
  // 먼저 새어 나왔다 — 보드 사건 CASE002·003·004 는 단계 전부가 그렇다.
  // 그러면 2막 게이트가 반쯤 뚫린다: 1막에 카드를 다 내밀어 두고 2막에
  // 가서 이미 들은 말을 형식적으로 다시 받는 꼴이 된다(2026-09 사용자
  // 결정으로 막음). 단계가 깨지면 그 말이 heard_statements 에 들어가므로
  // 갇히지 않는다.
  const stageReleases = new Set(
    index.master.contradictionStages
      .map((stage) => stage.releaseClaimOrFactId)
      .filter(Boolean),
  );

  for (const gate of knowledge.hiddenUntil) {
    const id = gate.factOrClaimId;
    if (!id || state.heard_statements.includes(id)) continue;
    if (stageReleases.has(id)) continue;
    if (!conditionMet(state, npcId, gate.prerequisite, justPresented)) continue;
    if (!conditionMet(state, npcId, gate.trigger, justPresented)) continue;

    const claim = knowledge.initialClaims.find((item) => item.claimId === id);
    if (claim?.content) return { id, content: claim.content, reluctant: true };
    const fact = knowledge.knows.find((item) => item.factId === id);
    if (fact?.content) return { id, content: fact.content, reluctant: true };
  }
  return null;
}

// 단계가 깨지며 인정한 사실 뒤에 붙는 **변명**. 마스터가 그 사실(F-)을
// 전제로 잠가 둔 거짓 진술(S-)이다 — 「네, 4시 50분에 펜을 꺼내 트럭에
// 넣었습니다. 잃어버릴까 봐 챙겨 둔 것뿐이에요.」 이것이 다음 단계의
// **질문**이다. 전에는 이 변명이 `release.scope` 지문(「다만 …라고 주장한다」)
// 에만 있어서 수첩에 진술로 남지 않았고, 다음 단계는 이미 인정한 사실을
// 비교 진술로 걸어 두어 카드가 무엇을 깨는지가 화면에 없었다(2026-09-23
// 사용자 지적: 「기존 진술이 질문이고 제시하는 증거가 답이어야 하는데 그
// 상관관계가 안 맞는다」). 같은 턴에 인정과 변명이 한 호흡으로 나간다.
function excuseClaimsFor(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  releaseId: string | null | undefined,
): Array<{ id: string; content: string }> {
  if (!releaseId) return [];
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return [];
  const out: Array<{ id: string; content: string }> = [];
  for (const gate of knowledge.hiddenUntil) {
    const id = gate.factOrClaimId;
    if (!id?.startsWith('S-') || state.heard_statements.includes(id)) continue;
    if ((gate.prerequisite || '').trim() !== releaseId) continue;
    const claim = knowledge.initialClaims.find((item) => item.claimId === id);
    if (claim?.content) out.push({ id, content: claim.content });
  }
  return out;
}

// 남을 지목하는 말이 나오는 자리. 말하는 사람의 말이지 사건의 사실이 아니다
// — 사실은 맞고 해석이 틀린 것이 이 자리의 노림수라, 엔진은 판정하지 않고
// 그대로 내보낸다. 판단은 플레이어가 보드에서 한다.
//
// 한때 「누가 그랬다고 생각하는지 묻는다」 보기가 따로 있었는데(2026-09),
// 다섯 사람에게 같은 설문 문항을 돌리는 꼴이라 플레이어가 수집 요소로
// 읽었고 탐정도 만나는 사람마다 그 말을 물었다. 판본 55개의 `says` 는
// 애초에 그 질문의 답이 아니라 **다른 이야기를 하다가 새는 험담** 모양이다
// (「…프런트에 계신 분이면 누가 드나들었는지 아시지 않나요」). 지금은 **그
// 사람과 어떤 사이였는지 묻는** 답 뒤에 붙어 나온다(2026-09-24 사용자 결정)
// — 사이를 묻다가 험담이 새는 것이 사람이 말하는 방식이고, 묻지 않았는데
// 느끼게 된다. `opens`(자기 진술을 한 번 들려준 뒤에야) 조건은 그대로다.
// 관계 문이 그 전에 닫혔으면 `opens` 가 들리는 턴 말끝에 붙는다(finish).
function pendingFinger(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  otherKey: string,
): NonNullable<NpcKnowledgeIndex['pointsFinger']> | null {
  const finger = index.master.npcs[npcId]?.pointsFinger;
  if (!finger || finger.at !== otherKey) return null;
  if (done(state, `finger|${npcId}`)) return null;
  return finger;
}

// 한지우는 지목을 받아 적기만 한다. 누가 맞는지는 그의 몫이 아니다.
//
// 이름을 대는 줄은 **그 사람이 실제로 이름을 말했을 때만.** 빈서하가
// 「지난달 그 밤에 링크에 남아 있던 게 누군지 물어보세요」라고만 했는데
// 한지우가 「헌도겸 씨라고 적어 둘게요」라고 받으면, 플레이어가 풀어야 할
// 것을 한지우가 먼저 풀어 준 것이 된다(CASE004 실플레이). 「또 나왔네요」는
// 다른 사람이 먼저 같은 이름을 댔을 때만 — 첫 번째 지목에 「또」가 붙었다
// (CASE001 실플레이).
function fingerJiwooLine(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  finger: NonNullable<NpcKnowledgeIndex['pointsFinger']>,
  seed: number,
  recent: string[],
): string {
  const target = index.npcById.get(finger.at.replace(/^CH/, 'N'));
  const named = Boolean(target && finger.says.includes(target.name));
  const namedBefore =
    named &&
    Object.entries(index.master.npcs).some(
      ([id, knowledge]) =>
        id !== npcId &&
        done(state, `finger|${id}`) &&
        knowledge.pointsFinger?.at === finger.at,
    );
  const pool = JIWOO_ACCUSE.filter((line) => {
    if (line.includes('또 나왔네요')) return namedBefore;
    if (line.includes('{name}')) return named;
    return true;
  });
  return pick(pool, seed, recent, (template) =>
    fill(template, { name: target?.name || finger.at }),
  );
}

function nextUnlockedDisclosure(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): { id: string; content: string; reluctant: boolean } | null {
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return null;

  const gated = unlockedByGate(index, state, npcId);
  if (gated) return gated;

  // initial_interview_range 밖인데 hidden_until에도 안 걸린 진술. 열릴 문이
  // 없어 아무에게도 도달하지 못한다 — 308건에 6개 있고, 내용이 하필
  // "그 시각엔 딱히 누굴 본 기억은 없어요" 같은 알리바이와 관계 진술이다.
  // 잠금이 없다는 것은 감춰 둔 것이 아니라 그냥 첫 자리에서 쏟아내지 않는
  // 말이라는 뜻이므로, 다시 물으면 나온다.
  const range = knowledge.initialInterviewRange;
  if (range.length) {
    // 알리바이 문을 아직 안 열었을 때만 그 한 줄을 비켜 둔다. 한 번 물은
    // 뒤에는 그 보기가 메뉴에서 사라지므로(`alibi|` 는 done 마커로 닫힌다),
    // 계속 비켜 두면 남은 알리바이꼴 진술이 아무 데서도 안 나온다.
    const alibiNext = done(state, `alibi|${npcId}`)
      ? null
      : alibiClaimFor(index, state, npcId);
    const sealed = new Set(
      knowledge.hiddenUntil.map((gate) => gate.factOrClaimId),
    );
    for (const claim of knowledge.initialClaims) {
      // 범위 안이라고 건너뛰지 않는다. FIRST_MEETING_CLAIMS 로 잘린 진술이
      // 범위 안에 있으면서 아직 안 나온 상태이기 때문이다 — 이미 말한 것은
      // heard_statements 가 걸러 준다.
      if (sealed.has(claim.claimId)) continue;
      if (state.heard_statements.includes(claim.claimId)) continue;
      // 첫 대면이 미뤄 둔 알리바이가 여기로 새면 미룬 뜻이 없다. 다만
      // **알리바이 문이 실제로 내줄 그 한 줄만** 비켜 둔다 — ALIBI_HINT 는
      // 넓게 잡혀 있어서("그날 … 없었어요" 같은 부인도 걸린다) 걸리는 것을
      // 전부 막으면 그 문이 영영 안 내주는 진술이 갇힌다. CASE171 이 그랬다:
      // 진범의 세 진술 중 둘이 걸려 C01 이 요구하는 S-CH01-02 가 사라졌고,
      // 알리바이 문은 S-CH01-01 을 내주므로 아무 데서도 안 나왔다.
      if (alibiNext && claim.claimId === alibiNext.id) continue;
      // 화제를 뽑아 보기로 세운 되묻기 진술은 그 보기가 내준다. 여기서
      // 먼저 내주면 「명 코치님에 대해 묻는다」가 눌러 보기도 전에 사라진다.
      // 화제를 못 뽑은 것(서술절 되받기)은 걸리지 않으므로 종전대로 여기서
      // 나온다 — 어느 쪽도 갇히지 않는다.
      if (echoTopicOf(claim.content)) continue;
      // 잠금이 풀려 나오는 것이 아니라 첫 자리에서 미뤄 둔 말이다. 서술을
      // 갈라야 한다 — 「더는 못 버티겠다는 듯」이 「그냥 동업자 사이였어요」에
      // 붙으면 서술이 약속한 것과 나온 말이 어긋난다.
      if (claim.content) {
        return { id: claim.claimId, content: claim.content, reluctant: false };
      }
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
// 묻지도 않은 질문을 되받는 꼴. 「명 코치님요? 그냥 인사하는 사이죠.」는
// 「피해자는 어떤 사람이었나」의 답이지 첫 대면에서 혼자 꺼낼 말이 아니다
// (2026-09 사용자 지적). 되묻는 첫머리가 그 표식이다 — 작성자가 질문을
// 머릿속에 두고 썼다는 뜻이라, 그 질문이 실제로 나온 뒤에 나와야 한다.
//
// 코퍼스 2,606개 중 52개(2.0%)가 이 꼴이고 그중 37개가 첫 면담 자리에
// 있었다. 알리바이와 같은 처리다 — **빼지 않고 뒤로만 민다.** 다시 찾아가
// 물으면 nextUnlockedDisclosure 가 그대로 내준다.
export const ECHO_HINT = /^.{0,12}?(요|죠|까|데요)\?/;

// 되묻는 말에 들어 있는 **화제**. 「명 코치님요?」는 「명 코치님에 대해
// 묻는다」를 품고 있다 — 작성자가 머릿속에 둔 그 질문이 글자로 남아 있는
// 것이라, 뽑아서 보기로 올리면 답이 제자리를 찾는다(2026-09 사용자 결정).
//
// 깨끗한 명사구만 받는다. 「구윤하랑 다퉜다고요?」처럼 서술절이 되받아진
// 것은 「…에 대해 묻는다」에 넣으면 문장이 깨지므로 null 을 돌려주고,
// 그런 진술은 종전대로 다시 말을 걸면 나오는 자리에 남는다. 어색한 보기
// 하나가 안 나오는 보기 하나보다 나쁘다.
export function echoTopicOf(content: string | null | undefined): string | null {
  const matched = (content || '').match(/^(.{2,16}?)요\?/);
  if (!matched) return null;
  let topic = matched[1].trim();
  // 「펜이요?」·「도겸이요?」의 '이'는 조사다. 받침 뒤에서만 떼어 낸다 —
  // 「사이요?」의 '이'까지 떼면 화제가 「사」가 된다.
  if (topic.length >= 2 && topic.endsWith('이')) {
    const before = topic.codePointAt(topic.length - 2) || 0;
    const hasBatchim =
      before >= 0xac00 && before <= 0xd7a3 && (before - 0xac00) % 28 !== 0;
    if (hasBatchim) topic = topic.slice(0, -1);
  }
  // 한 글자로 줄어든 것은 대개 대명사이거나 화제가 못 된다.
  if (topic.length < 2 && !/^[가-힣]$/.test(topic)) return null;
  if (['저', '나', '제', '그', '이', '것', '저희', '우리'].includes(topic)) {
    return null;
  }
  // 서술절·연결어미로 끝나면 명사구가 아니다.
  if (/(고|다|라|까|죠|서|며|데|지|나)$/.test(topic)) return null;
  if (/[.!?"'\n]/.test(topic)) return null;
  return topic;
}

// 이 사람에게 아직 안 나온, 화제를 뽑을 수 있는 되묻기 진술들.
// 보기(`echo|`)와 「다시 말을 건다」(nextUnlockedDisclosure)가 같은 판단을
// 쓰게 하려고 한 곳에 둔다 — 갈리면 한쪽이 먼저 내줘서 보기가 헛돈다.
export function echoClaimsFor(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): Array<{ id: string; content: string; topic: string }> {
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return [];
  // initial_interview_range 로 거르지 않는다. 「다시 말을 건다」가 범위
  // 밖 진술도 내주기 때문이다(그쪽 주석 참고) — 여기서만 거르면 범위 밖의
  // 되묻기 진술이 양쪽 어디에서도 안 나온다. CASE002·CASE004 가 그렇게
  // 모순 단계 앞에서 멈췄다.
  const sealed = new Set(
    knowledge.hiddenUntil.map((gate) => gate.factOrClaimId),
  );
  return knowledge.initialClaims
    .filter((claim) => !sealed.has(claim.claimId))
    .filter((claim) => !state.heard_statements.includes(claim.claimId))
    .map((claim) => ({
      id: claim.claimId,
      content: claim.content || '',
      topic: echoTopicOf(claim.content) || '',
    }))
    .filter((item) => item.content && item.topic);
}

// **시각 표지가 없어도 자기 행적만 말하는 첫마디를 잡는다**(2026-09).
// 원래 마지막 갈래가 `(그날|밤|새벽…)[^.]{0,20}(있었|…)`이라 스무 자 창을
// 넘기면 빠져나갔다. CASE024의 두 줄이 그 틈을 그대로 보여 준다 —
//   CH02 「**그 시간엔** 계속 작업실에서 혼자 활을 정비하고 있었어요」 → 걸린다
//   CH01 「**그날 아침엔** 계속 작업실에서 활을 점검하고 있었어요」 → 안 걸린다
// 사실상 같은 말인데 「그날」과 「있었」 사이가 **21자**라 한 글자 차로 샜다.
// 창을 32자로 넓히고, 행적을 말하는 동사(들어갔·나왔·왔·했·하고 있었·정리·
// 점검)를 더했다. 이 검사가 있는 이유가 「묻지도 않았는데 자기 행적이 인사
// 다음 줄에 나온다」이므로, 시각을 말하느냐가 아니라 **행적을 말하느냐**가
// 기준이어야 맞는다. CASE021~025 다섯 편에서 3/25명만 잡히던 것이 이 틈이다.
export const ALIBI_HINT =
  /(그 ?시각|그 ?시간|사고 ?시각|당시|어디[에가]?\s*(있|계)|\d{1,2}시|알리바이|(밤|저녁|새벽|아침|오후|오전|그날|당일|그때)[^.]{0,32}(있었|없었|잤|돌아|퇴근|자리|머물|들어갔|들렀|나왔|왔어|왔습|왔고|했어|했습|하고 ?있|정리|점검|작업))/;

// 흔적을 남기지 않은 이 사람의 움직임. 알리바이로 쓸 수 있는 유일한 종류의
// 타임라인이다 — world_fact가 있는 항목은 세상에 흔적이 남았다는 뜻이라
// 증거 카드가 이미 그 자리를 맡고 있고, 여기서 미리 말해 버리면 찾을 것이
// 없어진다.
//
// 진범은 통째로 뺀다. world_fact 없는 945개 중 332개(35%)가 진범이 낀
// 것이고, 그 안에 "정신을 잃은 한서준을 슬립 탱크 안으로 밀어 넣는다"
// 같은 범행 자체가 들어 있다. 이야기로도 그쪽이 맞다 — 무고한 사람은
// 있었던 그대로 말하고(actual_timeline), 진범은 거짓말을 한다
// (initial_claims의 truth_status: lie). 그 둘이 어긋나는 것이 이 게임이다.
//
// 다른 인물이 함께 낀 항목도 뺀다. 남의 그 시각 행적까지 대신 말해 주면
// 탐정이 그 사람을 만날 이유가 줄고, 레드헤링 주인공의 수상한 움직임이
// 엉뚱한 사람 입에서 먼저 새어 나온다.
// 「그 밖에 이상한 점은 없었는지」가 꺼낼 수 있는 것.
//
// CASE290 실플레이 + 그 소설본을 나란히 놓고 드러난 것이다. 소설에서 백도현이
// 진짜 용의자로 읽히는 것은 오필두가 "오후 늦게 그 사람이 약품보관실 앞을
// 서성이는 걸 보긴 했어요"라고 말해 주기 때문인데, **플레이에서는 그 줄이
// 한 번도 안 나온다.** 마스터에는 잠금도 없이 적혀 있다. 그 인물의 사실이
// 나올 길은 ① 첫 면담의 initial_claims ② 이름으로 시작하는 증거 카드
// ③ 관계 질문뿐인데, CASE290에서 카드를 가진 사람은 다섯 중 하나뿐이었다.
// 레드헤링 둘이 통째로 죽어 있었다는 뜻이다(R01의 suspicion_deepener가
// 가리키는 것이 정확히 저 증언이다).
//
// 코퍼스에서 진범을 뺀 1,225명 중 533명(44%)이 카드가 없고, 그 사람들에게
// 955개의 사실이 묻혀 있다. 마스터를 고치는 대신 런타임이 꺼내 쓰게 한다 —
// 이미 있는 것을 못 꺼내 쓰고 있는 것이 아닌지부터 의심하라는 그 자리다.
//
// 진범은 제외한다. CASE290의 임소민은 「18:50경 조태원의 개인 수액백에
// KCl을 주입했다」가 잠금 없이 들어 있어서, 그냥 열면 첫 질문에 자백이
// 나온다. 진범에게 할 일은 증거를 들이대는 것이고 그건 대립 단계가 굴린다.
function recallableFacts(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): Array<{ id: string; content: string }> {
  const masterId = npcId.replace(/^N/, 'CH');
  if (masterId === index.master.responsibleCharacterId) return [];
  const npc = index.master.npcs[npcId];
  if (!npc) return [];
  // hidden_until 이 걸린 것은 그대로 잠가 둔다 — 그건 무엇을 건드려야
  // 새어 나오는지가 따로 적힌 것이고, 여기서 열면 그 설계가 무의미해진다.
  const gated = new Set(npc.hiddenUntil.map((item) => item.factOrClaimId));
  // 이미 카드로 손에 들어온 사실은 두 번 말하게 하지 않는다.
  const held = state.acquired_information
    .map((id) => index.cardById.get(id)?.summary || '')
    .join(' ');
  const open = npc.knows
    .filter((fact) => fact.factId && fact.content)
    .filter((fact) => !gated.has(fact.factId))
    .filter((fact) => !state.heard_statements.includes(fact.factId))
    .filter((fact) => !held.includes(fact.content))
    .map((fact) => ({ id: fact.factId, content: fact.content }));
  // 그날 밤 자기가 어디 있었는지는 「그날 밤 어디 있었는지 묻는다」의 몫이다.
  // 이 목록은 적힌 순서대로 하나씩 나가는데, 진범 아닌 1,245명 중 229명이
  // 알리바이꼴 knows 를 들고 있고 그중 189명은 그것이 맨 앞이라 — 「그 밖에
  // 이상한 점은 없었는지」라고 물었는데 알리바이가 돌아왔다. 빼지 않고 뒤로만
  // 민다: 가진 것이 그것뿐인 사람에게서 들을 말이 사라지면 안 된다.
  const plain = open.filter((fact) => !ALIBI_HINT.test(fact.content));
  return [...plain, ...open.filter((fact) => ALIBI_HINT.test(fact.content))];
}

const ALIBI_TIMELINE_LIMIT = 2;

function privateMovementsOf(index: CaseIndex, npcId: string): string[] {
  const masterId = npcId.replace(/^N/, 'CH');
  const culprit = index.master.responsibleCharacterId;
  if (!culprit || masterId === culprit) return [];
  // 피해자가 함께 낀 항목은 남겨 둔다. 면담할 수 없는 사람이라 탐정이
  // 따로 찾아갈 데가 없고, "그 시각 국태은과 인사를 나눴다"는 이 사람이
  // 말할 수 있는 자기 행적이다. 다른 인물이 끼면 뺀다 — 남의 그 시각
  // 행적까지 대신 말해 주면 그 사람을 만날 이유가 줄고, 레드헤링 주인공의
  // 수상한 움직임이 엉뚱한 사람 입에서 먼저 새어 나온다.
  const figureIds = new Set(index.master.keyFigures.map((item) => item.id));
  return index.master.privateTimeline
    .filter(
      (entry) =>
        entry.actualAction &&
        entry.actors.includes(masterId) &&
        entry.actors.every((id) => id === masterId || figureIds.has(id)),
    )
    .slice(-ALIBI_TIMELINE_LIMIT)
    .map((entry) =>
      entry.time ? `${entry.time} — ${entry.actualAction}` : entry.actualAction,
    );
}

function alibiClaimFor(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): { id: string; content: string; repeated: boolean } | null {
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return null;
  const gated = new Set(
    knowledge.hiddenUntil.map((gate) => gate.factOrClaimId),
  );
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

// 거짓 진술에 붙는 한 박자.
//
// `initial_claims` 2,560개 중 1,152개가 `truth_status: lie` 인데 오프라인 GM 은
// 이 표시를 한 번도 읽은 적이 없었다 — 거짓말이 진실과 글자 그대로 같은
// 방식으로 나왔다.
//
// **진범은 뺀다.** 거짓은 진범에게 몰려 있다(진범 1인 평균 2.26개, 나머지는
// 1인 0.37개로 6배 차이고, 진범의 진술은 95%가 거짓이다). 무엇보다 309건 중
// **75건은 거짓이 진범에게만 있어서**, 그대로 붙이면 첫 면담에서 범인이
// 드러난다 — 표시 하나가 사건을 통째로 여는 것은 없느니만 못하다. 진범을
// 깨는 것은 표정을 읽는 것이 아니라 증거를 들이대는 것이고, 그건
// `contradiction_stages` 가 굴린다.
//
// 남는 455개가 이 도구의 자리다. 진범이 아닌 사람이 감추는 것(횡령·병·이미
// 써 둔 사직서)에 무게가 실려야 플레이어가 가릴 것이 생기고 — 방향 전환
// 2번이 말하는 자리다 — 그 거짓말이 풀리는 곳이 `red_herrings` 와
// `private_strain` 이다.
//
// 문장은 **행동만** 적는다. 「거짓말을 한다」는 GM 이 답을 말해 버리는 것이라
// 쓰지 않는다. 플레이어가 보는 것은 한 박자 늦은 대답이지 판정이 아니다.
// 「거짓 티」는 2026-09에 지웠다(사용자 결정). 거짓 진술 뒤에 몸짓 한 줄을
// 붙여 수상함을 보이려던 자리인데, 두 가지가 겹쳐 있었다.
//
//   1. **진범에게는 절대 안 붙었다.** 코퍼스의 거짓 초기 진술 1,166개 중
//      진범의 것이 709개인데 그 전부가 표시 없이 지나갔고, 진범 아닌 사람의
//      457개에만 티가 붙었다. 236건에서 **티가 뜬 사람은 100% 범인이 아니다**
//      — stance 쏠림(0.6% vs 11.1%)이나 인물 순서(52%)보다 센 유출이었다.
//   2. 진범에게도 붙이면 그 유출은 막히지만 「이 문장은 거짓말이다」가 남고,
//      규칙 엔진이라 몇 판이면 읽힌다. 그건 추리 한 칸을 대신하는 것이다 —
//      진술과 증거가 어긋나는 것을 찾아 들이대는 것이 이 게임의 본체이고,
//      그 일을 하라고 contradiction_stages 가 있다.
//
// 대신으로 생각했던 「숨긴 것이 있는 사람에게 붙인다」도 안 된다. 1,558명 중
// 1,220명(78%)이 hidden_until 을 갖고 있고 313건 중 177건은 다섯 명 전부라,
// 첫 면담에서는 모두에게 붙어 아무것도 가리키지 않는다.
//
// `truth_status: lie` 는 죽지 않는다. AI 경로가 「유지하라」로 읽고, 오프라인은
// 대립 단계가 그 거짓을 깨는 재료로 쓴다. 화면에 표시만 안 한다.

function emptyResponse(state: EngineState): OfflineGmResponse {
  return {
    message: '',
    detective_line: null,
    detective_line_position: 'after',
    jiwoo_line: null,
    jiwoo_line_position: 'after',
    exchange: [],
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

  const current = state.npc_statement_stage[npcId] || 'initial';

  for (const stage of index.master.contradictionStages) {
    if (stage.targetCharacter !== npcId) continue;
    if (done(state, `stage|${stage.id}`)) continue;
    // 사슬의 순서를 지킨다. 마스터는 단계를 initial → … → … 한 줄로 엮어
    // 두는데(1,003개 중 687개가 선행 단계를 가진다) 여기서는 from_stage를
    // 보지 않아, 뒷 단계의 카드가 먼저 모이면 앞 단계를 건너뛰고 터졌다.
    // CASE014 실플레이가 그랬다 — C01(황보람의 목격담으로 화분을 짚는 자리)이
    // 통째로 빠진 채 C02가 터지고 C03까지 가서, 백주안은 화분을 만졌다는
    // 말은 한 번도 하지 않고 10년 전 일부터 털어놓았다. 힌트를 만드는
    // openStageShortfall은 이미 from_stage를 보고 있었으므로, 안내와 판정이
    // 서로 다른 말을 하고 있던 것이기도 하다.
    if (stage.fromStage && stage.fromStage !== current) continue;
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
  '책상',
  '작업대',
  '테이블',
  '데스크',
  '선반',
  '캐비닛',
  '사물함',
  '서류함',
  '보관함',
  '안내판',
  '게시판',
  '일정표',
  '진열장',
  '거치대',
  '클립보드',
  '의자',
  '서랍',
  '상자',
  '창문',
  '출입문',
  '철문',
  '조명',
  '장부',
  '명부',
  '시계',
  '화분',
  '소파',
  '침대',
  '옷장',
  '냉장고',
  '금고',
  '사다리',
  '공구함',
  '수납장',
  '진열대',
  '배전반',
  '계기판',
  '우편함',
  '쓰레기통',
  '커튼',
  '블라인드',
  '액자',
  '거울',
  '화이트보드',
  '칠판',
  '스피커',
  '모니터',
  '프린터',
  '복사기',
  '자판기',
  '정수기',
  '싱크대',
  '조리대',
  '바구니',
  '가방',
];
const PROBE_TRAILING_PARTICLE =
  /(?:이|가|은|는|을|를|엔|에는|에|의|도|과|와|만|으로|로)$/;
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
    if (
      taken.some((text) =>
        text.split(/\s+/).some((part) => part[0] === word[0]),
      )
    ) {
      continue;
    }
    if (!found.includes(word)) found.push(word);
    if (found.length >= PROBE_LIMIT) break;
  }
  return found;
}

// 피해자. 면담할 수 없는 인물 가운데 사망·실종으로 적힌 사람이고, 없으면
// 첫 번째를 쓴다 — 312건 중 307건이 status: deceased 하나뿐이다.
// 「이름, 직함.」 한 줄. 마스터의 `role` 은 마침표로 끝나는 것도 있고 아닌 것도
// 있어서(1,851명 중 46명이 마침표로 끝난다) 그대로 `${role}.` 로 조립하면 그
// 46명은 소개가 「…사진 수집가..」가 된다. CASE030 실플레이 로그에서 여섯 명
// **전원**이 그랬다 — 그 사건은 모든 role 이 마침표로 끝난다.
function withPeriod(text: string): string {
  const body = text.trim().replace(/\.+$/, '');

  return body ? `${body}.` : '';
}

function victimOf(index: CaseIndex) {
  const figures = index.master.keyFigures;
  if (!figures.length) return null;
  return (
    figures.find((item) =>
      /deceas|dead|missing|사망|실종/i.test(item.status),
    ) || figures[0]
  );
}

// 직급까지만. role은 "선임 문하생 / 개요식에서 유약 비법 유출을 폭로하려던
// 인물"처럼 빗금 뒤에 사건의 동기를 통째로 적어 두는 일이 잦다 — 오프라인
// GM은 마스터 문장을 그대로 내보내므로 그걸 읽으면 첫 면담에서 사건이
// 끝난다. 빗금 앞은 312명 전부 깨끗한 것을 확인했다.
//
// 그리고 첫 문장까지만. 빗금 없이 마침표로 잇는 role 도 있다("은염사 수석
// 인화기사. 구윤하의 오랜 조수이자…" — 1,869명 중 29명). 그대로 두면
// {roleQuoted} 가 "…거절당했다.라는 것 말고는"으로 깨지고, 피해자 직함
// 한 줄도 소개문 두 문장이 된다. 끝의 마침표는 조사가 붙을 자리라 뗀다.
function publicRoleOf(figure: { role: string }): string {
  const beforeSlash = (figure.role || '').split('/')[0].trim();
  const firstSentence = beforeSlash.split(/(?<=[.。])\s+/)[0];
  return firstSentence.replace(/[.。]$/, '').trim();
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
  // 관계 질문과 같은 자리다 — says 를 갈라 써 뒀으면 그 사람 입으로 나온
  // 말을 쓰고, 없을 때만 nature+publicFace 로 돌아간다. 이 질문은 인물마다
  // 한 번씩 뜨므로, 갈라 쓰지 않으면 다섯 명이 피해자에 대해 똑같은 설명문을
  // 되풀이한다.
  const own = asQuote(rel?.says?.[masterId]) || '';
  const lines = [
    role ? `${victim.name}, ${withPeriod(role)}` : null,
    ...(own ? [own] : [rel?.nature || null, rel?.publicFace || null]),
  ].filter((line): line is string => Boolean(line));
  return lines.length ? { victimName: victim.name, lines } : null;
}

// 이 인물에게 "○○과 어떤 사이였습니까"를 물을 수 있는 상대 전부 — 다른
// 면담 대상과 피해자를 포함한다.
//
// 전에는 마스터가 `relationships`에 적어 둔 짝만 메뉴에 올렸는데, 그게
// 그대로 정답 표시였다. 관계가 적힌 사건 39건을 세어 보면 가능한 짝
// 971개 중 221개(22%)에만 카드가 뜨고, 면담 대상 194명 중 99명(51%)은
// 카드가 **딱 하나**이며, 그 하나가 진범을 가리키는 경우가 30명이다.
// CASE014 황보람이 그랬다 — 그에게 뜨는 관계 질문이 "백주안과 어떤
// 사이였는지" 하나뿐이라, 누르기도 전에 답을 알려 준다(2026-09 사용자
// 지적: "이게 너무 수상해서 오히려 안 누르게 돼").
//
// 그래서 격자를 채운다. 관계가 적힌 사건에서는 모든 짝에 카드가 뜨고,
// 마스터가 쓴 짝만 실제 관계를 말한다. 나머지는 상대의 공개 직함을 짚고
// 더 할 말이 없다고 답한다 — 세상에 대한 주장이 아니라 이 사람이 지금
// 할 말이 없다는 뜻이라, 마스터와 어긋날 자리가 없다.
//
// 관계가 하나도 없는 사건(282건이 이 필드가 생기기 전이다)에서는 한 장도
// 띄우지 않는다. 사건 안에서 모양이 같기만 하면 새어 나갈 것이 없다.
function relationPartners(
  index: CaseIndex,
  selectedCase: EngineCase,
  npcId: string,
): Array<{ key: string; name: string; role: string }> {
  // 피해자는 이 격자에 넣지 않는다 — "○○이 어떤 사람이었는지" 카드가
  // 이미 그 자리를 맡고 있고, 답까지 거의 같아진다. 그래서 인물끼리의
  // 관계가 하나라도 있는 사건에서만 격자를 편다(코퍼스 34건. 피해자
  // 관계만 있는 5건과 관계가 없는 269건은 한 장도 안 뜬다).
  const figureIds = new Set(index.master.keyFigures.map((item) => item.id));
  const hasPeerRelationship = index.master.relationships.some(
    (rel) => rel.nature && !rel.between.some((id) => figureIds.has(id)),
  );
  if (!hasPeerRelationship) return [];
  const partners = selectedCase.npcs
    .filter((item) => item.id !== npcId)
    .map((item) => ({
      key: item.id.replace(/^N/, 'CH'),
      name: item.name,
      role: publicRoleOf(item),
    }))
    .filter((item) => item.name);

  // 마스터가 쓴 순서대로 두면 앞자리가 곧 힌트가 된다. 사건마다 고정된
  // 해시로 섞어 두 번 들어가도 자리가 같게 한다.
  return partners.sort(
    (a, b) =>
      hashOf(`${selectedCase.case_id}|${npcId}|${a.key}`) -
      hashOf(`${selectedCase.case_id}|${npcId}|${b.key}`),
  );
}

function relationshipBetween(
  index: CaseIndex,
  npcId: string,
  otherKey: string,
) {
  const masterId = npcId.replace(/^N/, 'CH');
  return (
    index.master.relationships.find(
      (item) =>
        item.between.includes(masterId) && item.between.includes(otherKey),
    ) || null
  );
}

// 관계의 사적 균열이 새어 나오는 자리.
//
// `private_strain` 은 관계 683개 전부에 채워져 있는데(2026-09) 오프라인 GM 은
// 한 번도 읽은 적이 없었다. 관계 질문이 공개용 얼굴(`says`, 없으면
// `nature`+`public_face`)만 돌려주고 끝이라, 이 게임에서 관계는 명함 교환이었다.
// 진범이 아닌 인물에게 일어나는 일이 레드헤링 둘뿐이던 것(대립 단계 1,006개
// 중 998개가 진범 대상이다)의 절반이 여기다.
//
// 언제 새어 나오는지는 `surfaces_when` 이 적어 두는데 자연어라 규칙이
// "도달했는가"를 판정할 수 없다 — AI 경로가 「지금 앞에 앉은 사람 것만 모델에게
// 넘긴다」는 차선을 택한 것도 그래서다(CLAUDE.md). 다만 683개 중 408개(60%)가
// 그 문장 안에 id 를 이미 달고 있다("…재감정 메모(E03)와 …를 함께 제시할 때").
// `how_to_clear` 가 걸어간 길과 같은 모양이라 같은 판정기를 그대로 쓴다.
//
// **id 가 하나도 없는 275개는 닫아 둔다.** `referencedFactsReached` 는 부르는
// id 가 없으면 참을 돌려주므로(빈 배열의 every), 그 검사만 쓰면 조건이 안 적힌
// 관계가 첫 턴부터 균열을 쏟는다. 이주 루틴이 그 275개의 문장에 id 를 달면
// 그때 저절로 열린다 — 런타임은 고치지 않는다.
function strainReady(
  state: EngineState,
  rel: { privateStrain: string; surfacesWhen: string } | null,
): boolean {
  if (!rel?.privateStrain.trim()) return false;
  if (!(rel.surfacesWhen.match(REFERENCED_MASTER_ID) || []).length)
    return false;
  return referencedFactsReached(state, rel.surfacesWhen);
}

// 이 균열을 말할 수 있는 사람. `private_strain` 은 3인칭 산문이고 주어가
// 곧 감추고 있는 쪽이다("한도윤은 그날 밤 늦게 박지훈의 운동복이 젖어 있는
// 것을 봤지만 먼저 나서서 말하지 않는다"). 짝의 아무에게나 물어서 나오게
// 두면 **박지훈이 한도윤의 감춘 것을 대신 말해 주는** 턴이 된다 — AI 경로가
// response-signals.ts 로 잡는 화자 드리프트를 규칙 엔진이 제 손으로 만드는
// 꼴이고, 남의 숨긴 정보가 엉뚱한 입에서 새는 것이라 더 나쁘다. 코퍼스
// 전수에서 148회 중 실제로 그런 자리가 나왔다(CASE009·CASE011).
//
// 주인은 문장에서 이름이 가장 앞에 나오는 인물로 잡는다 — `redHerringsAbout`
// 이 surface_suspicion 에, validate_master 의 checkHerringClearance 가
// how_to_clear 에 쓰는 것과 같은 규칙이다. 아무 이름도 없거나 피해자처럼
// 면담할 수 없는 사람이 주어면 문을 열지 않는다.
function strainSubject(
  selectedCase: EngineCase,
  rel: { privateStrain: string },
): string | null {
  let best: { id: string; at: number } | null = null;
  for (const npc of selectedCase.npcs) {
    const at = rel.privateStrain.indexOf(npc.name);
    if (at < 0) continue;
    if (!best || at < best.at) best = { id: npc.id, at };
  }

  return best?.id ?? null;
}

// 같은 균열을 짝의 양쪽에서 두 번 듣지 않게 하는 열쇠. 관계 id 는 코퍼스
// 683개 전부 채워져 있지만(REL##/R##), 파싱이 비워 놓는 경우를 대비해
// 짝으로 떨어진다.
function strainKey(rel: { id: string; between: string[] }): string {
  return rel.id || [...rel.between].sort().join('-');
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
    // 마스터가 적어 둔 주인이 먼저다. 이 줄이 없던 동안 아래 폴백만
    // 돌았는데, 그것은 surface_suspicion **문장에서 인물 이름을 찾는** 것이라
    // 이름순으로 선 npcs 에서 먼저 걸리는 사람이 주인이 됐다. 한 문장에 두
    // 사람이 나오면 엉뚱한 쪽이 잡히고(CASE001 R02 는 「곽태섭과 언성을
    // 높였다」의 진범이 잡혀 **진범 앞에서 안수경의 결백이 풀렸다**), 이름이
    // 하나도 없으면 아무에게서도 안 풀린다(CASE005 R03). 62개 중 7개가
    // 그랬다(2026-09-21).
    if (herring.characterId) {
      return herring.characterId.replace(/^CH/, 'N') === npcId;
    }
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
  // 이 사람에게 물어서 받은 카드는 그 사람 입에서 이미 나온 말이다. 그것을
  // 다시 그 사람 앞에 내밀어야 의심이 풀린다고 하면, 플레이어는 방금 들은
  // 알리바이를 그 알리바이의 주인에게 보여 주는 행동을 해야 한다.
  //
  // 602개 중 126개(89건)가 정확히 그 모양이었다 — how_to_clear 가 부르는
  // 카드가 그 인물의 「○○에게 …를 묻는다」 카드다. CASE289 실플레이에서
  // 표시온(E01)과 안시우(E11) 둘 다 카드는 손에 들어왔는데 도장이 안
  // 채워졌다는 신고가 이것이다.
  for (const card of index.questionsByNpc.get(npcId) || []) {
    if (state.acquired_information.includes(card.id)) presented.add(card.id);
  }
  if (!evidence.length && !facts.length) {
    // "그 사람에게 물어볼 것을 다 물어봤다"를 질문 카드로만 셌다. 그런데
    // 진범을 뺀 인물 1,225명 중 533명이 카드가 하나도 없어서
    // questions.length > 0 에서 바로 걸렸다 — **그 사람이 주인공인 레드헤링은
    // 영원히 안 풀린다.** 602개 중 171개(141건)가 그 상태였고, CASE290의
    // 백도현·서지완이 정확히 그랬다. 레드헤링을 살리려면 그 인물에게도 할
    // 일이 있어야 한다는 지적(2026-09 사용자)이 이 자리다.
    //
    // 이제 카드와 「그 밖에 이상한 점은 없었는지」를 함께 센다. 카드가 없는
    // 사람도 자기 knows 를 다 내놓으면 "다 물어본" 것이 되고, 잠긴 것이
    // 남아 있으면 아직 아니다 — 그 잠긴 것이 대개 의심을 짙게 하는 바로 그
    // 증언이라, 그것을 듣기 전에 의심이 풀리면 순서가 뒤집힌다.
    const questions = index.questionsByNpc.get(npcId) || [];
    const knowledge = index.master.npcs[npcId];
    if (!questions.length && !(knowledge?.knows.length || 0)) return false;
    if (
      !questions.every((card) => state.acquired_information.includes(card.id))
    ) {
      return false;
    }
    if (hasUnheardGatedKnowledge(index, state, npcId)) return false;
    return recallableFacts(index, state, npcId).length === 0;
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
// 이 인물이 밀렸을 때 내놓는 말. 마스터가 `pressure_responses` 로 2~4개씩
// 순서대로 적어 두는데(코퍼스 1,533명에 4,482개) 오프라인 GM 은 한 번도
// 읽은 적이 없어서, 지금까지 네 명의 용의자가 전부 같은 공용 문장으로
// 버텼다 — "글쎄요.", "그래서요?" 사람이 바뀌어도 같은 소리가 났다.
//
// 값의 모양이 한 가지가 아니다. 4,482개 중 대부분은 그 인물이 탐정에게
// 하는 말 그대로이고(`…습니다.` 928개, `…어요.` 483개), 408개는 3인칭
// 지문이며(`난간을 붙들고 골목 쪽으로 고개를 돌린다.`), 653개는 지문 안에
// 대사가 물려 있다(`"30년을 여기 있었습니다."라며 목소리가 굵어진다.`).
// 그래서 끝맺음을 보고 갈라서, 대사면 따옴표에 넣고 지문이면 이름을 앞에
// 붙여 그대로 내보낸다.
// 값을 대사와 지문으로 가르는 기준. 존댓말 끝맺음으로 잡아 봤더니 "…잘
// 몰라요.", "…어떡해요.", "…나 참, 어이가 없어서." 같은 대사가 전부 지문
// 쪽으로 새서, 이름을 앞에 붙인 비문이 나왔다. 그래서 반대로 잡는다 —
// 지문은 3인칭 서술형(`…돌린다.`, `…반복한다.`)으로 끝나고, 인물이 탐정에게
// 하는 말은 `습니다`/`…요`/말줄임으로 끝난다. `니다`로 끝나는 것은 대사다.
const NARRATION_END = /다[.。]?$/;
const FORMAL_SPEECH_END = /니다[.。]?$/;

// 통째로 따옴표 하나인 값(`"더 물어봐도 할 말 없어."`)은 지문이 아니라
// 대사다. 이름만 앞에 붙이면 동사가 없는 토막이 된다.
const WHOLE_QUOTE = /^["“][^"“”]*["”][.。]?$/;
const QUOTE_MARK = /["“”]/;

// 64개는 "장부 얘기가 나오면 안경을 벗어 닦기 시작한다" 처럼 조건절을
// 달고 있다. 그건 작성자가 언제 쓰라고 적어 둔 것이지 읽어 줄 문장이
// 아니므로, 지금 실제로 밀린 자리에서는 앞머리를 떼고 동작만 남긴다.
const PRESSURE_CONDITION_CLAUSE =
  /^[^,.]{0,40}?(?:나오면|하면|되면|물으면|짚으면|들면)\s+/;

// 대사만 있는 값 앞에 놓는 짧은 지문. 마스터가 지문까지 써 둔 값에는
// 붙이지 않는다 — 두 동작이 겹친다.
const PRESSURE_ACTION = [
  '{topic} 자세를 고쳐 앉는다.',
  '{topic} 시선을 잠깐 내렸다 든다.',
  '{topic} 한 박자 늦게 대답한다.',
  '{topic} 손을 무릎 위에 모은다.',
  '{topic} 짧게 숨을 고른다.',
  '{topic} 표정을 바꾸지 않는다.',
];

// 이 인물의 버릇. 마스터의 `voice_profile.verbal_tic` 인데(1,533명 중
// 1,378명이 갖고 있다) 오프라인 GM 은 이것도 읽은 적이 없다. 값은 전부
// 3인칭 지문으로 쓰여 있어서("대답 전에 반상 쪽을 한 번 본다", "말끝에
// '뭐, 그렇지요'를 붙이며 한 박자 쉰다") 주어만 세워 주면 그대로 문장이
// 된다.
//
// 첫 대면에 한 번만 붙인다. 버릇은 습관이라 매 턴 적으면 그 사람이
// 아니라 화면이 반복하는 것이 되고, 반대로 한 번도 안 적으면 다섯 명이
// 전부 같은 얼굴로 앉아 있게 된다.
// 첫 면담의 첫마디.
//
// 지금까지 첫 대면은 인사 없이 곧바로 마스터의 initial_claims 를 쏟았다.
// 사람을 만난 자리인데 첫 문장이 이미 사건 내용이라, 누구를 만났는지보다
// 무엇을 들었는지가 먼저 남는다(2026-09 사용자 요청). 여기서 한 마디를
// 먼저 내놓는다 — **사건 이야기는 하지 않는다.** 그 사람이 탐정을 어떻게
// 맞는지만 보여 주고, 내용은 플레이어가 물어서 가져간다.
//
// 유형은 마스터의 voice_profile 에서 가른다. formality_register 와
// sentence_length_tendency 둘을 붙여 놓고 키워드로 본다 — 1,533명이
// 여섯 갈래로 고르게 흩어진다(과묵 29% / 협조 21% / 방어 16% / 긴장 15% /
// 태연 10% / 권위 6%).
//
// `반말`은 권위의 표시로 쓰지 않는다. 그 말이 나오는 자리는 대개 "탐정에게는
// 깍듯한 존댓말, 기원 사람들에게는 반말로 내려간다"처럼 **다른 사람을**
// 대하는 태도라, 그것으로 가르면 탐정 앞에서 깍듯한 사람이 권위형이 된다.
const FIRST_WORD_TYPES: Array<[string, RegExp]> = [
  ['imperious', /따진|권위|훈계|지시하듯|명령|딱딱|퉁명|쏘아|내려다|목소리를 높/],
  ['skittish', /긴장|떨|불안|더듬|작아지|움츠|조심스|주저|말끝을 흐|눈치를 보/],
  ['guarded', /방어|부인|선을 긋|잘라|단호|변명|경계/],
  ['unruffled', /태연|여유|차분|웃|농담|느긋|담담/],
  ['procedural', /짧|단답|간결|말수가 적|필요한 말만|최소한|먼저 말을 꺼내지/],
];

const FIRST_WORD: Record<string, string[]> = {
  // 먼저 말을 붙이는 쪽. 키워드 추론으로는 여기에 올 수 없다 — 마스터가
  // stance 로 직접 적었을 때만 쓰인다. 코퍼스에 「밝고 사교적인 존댓말」인
  // 사람이 194명 있었는데 갈 자리가 없어 전부 courteous 로 떨어졌다.
  forthcoming: [
    '"어서 오세요. 뭐든 물어보세요."',
    '"기다리고 있었어요. 앉으세요."',
    '"그 일 때문에 오셨죠? 그럴 줄 알았어요."',
    '"제가 아는 건 다 말씀드릴게요."',
    '"아, 탐정님이시죠? 얘기 들었어요."',
    '"뭐부터 여쭤보실 거예요?"',
    '"저야 뭐, 아는 건 다 말씀드리죠."',
    '"여기 앉으세요. 서 계시지 말고요."',
    '"무슨 일이신지 말씀해 주세요."',
    '"제가 먼저 아는 것부터 말씀드릴까요."',
    '"궁금한 게 있으시면 편하게 물어보세요."',
    '"제가 본 건 말씀드릴 수 있습니다."',
    '"필요하신 건 같이 확인해 보죠."',
    '"그때 상황부터 말씀드리겠습니다."',
    '"제가 기억하는 건 빠짐없이 말씀드릴게요."',
    '"먼저 제가 아는 것부터 말씀드리죠."',
    '"혹시 찾으시는 내용이 있으면 말씀하세요."',
    '"제가 놓친 게 있으면 말씀해 주세요."',
    '"기억나는 대로 말씀드릴게요."',
    '"필요한 곳은 같이 보셔도 됩니다."',
    '"무엇부터 이야기하면 될까요?"',
    '"제가 본 것부터 말씀드릴게요."',
    '"필요한 건 편하게 물어보세요."',
    '"아는 내용이면 바로 말씀드리겠습니다."',
    '"그때 제가 있었던 곳부터 설명할까요?"',
    '"생각나는 대로 말씀해도 될까요?"',
    '"제가 기억하는 장면이 하나 있습니다."',
    '"확인하실 게 있으면 같이 보시죠."',
    '"그 시간대라면 제가 기억합니다."',
    '"말씀하시면 제가 아는 만큼 답할게요."',
    '"혹시 이 부분을 찾으시는 건가요?"',
    '"제가 설명할 수 있는 건 먼저 말씀드릴게요."',
  ],
  // 강하게 방어적.
  guarded: [
    '"무슨 일이시죠?"',
    '"저한테 뭐 물어보실 게 있습니까?"',
    '"제가 먼저 말씀드릴 건 없습니다."',
    '"무엇부터 말씀드리면 됩니까?"',
    '"용건이 뭡니까."',
    '"제가 답할 의무는 없는 걸로 압니다만."',
    '"오래 걸립니까."',
    '"필요한 것만 여쭤보시죠."',
    '"제 얘기는 이미 다 했습니다."',
    '"뭘 듣고 오셨는지 먼저 말씀해 주시죠."',
    '"필요한 말씀만 하시죠."',
    '"제가 아는 건 이미 말씀드렸습니다."',
    '"어떤 걸 확인하시려는 겁니까."',
    '"질문이 있으면 말씀하세요."',
    '"제가 답해야 하는 내용인가요?"',
    '"무슨 부분이 궁금하십니까."',
    '"제가 먼저 설명드릴 건 없습니다."',
    '"오래 걸리지는 않겠죠?"',
    '"필요한 것부터 물어보시죠."',
    '"제 입장에서는 더 말씀드릴 게 없습니다."',
    '"확인할 게 있으면 말씀하십시오."',
    '"제가 아는 범위에서 답하겠습니다."',
    '"무슨 이야기를 들으셨는지는 모르겠습니다."',
    '"그 부분은 이미 설명했습니다."',
    '"질문부터 하시죠."',
    '"제가 알고 있는 건 한정적입니다."',
    '"확인하고 싶은 게 뭡니까."',
    '"필요한 내용이면 말씀드리겠습니다."',
    '"무슨 내용을 확인하시려는 겁니까?"',
    '"제가 아는 범위에서만 말씀드리겠습니다."',
    '"그 부분부터 물어보시죠."',
    '"제가 말씀드릴 수 있는 건 많지 않습니다."',
    '"확인할 내용이 있으면 하나씩 말씀하세요."',
    '"그 질문에는 답하겠습니다."',
    '"제가 본 것만 말씀드리겠습니다."',
    '"필요한 부분을 말씀하시면 확인해 보죠."',
    '"무슨 점이 걸리시는 겁니까?"',
    '"제 기억으로는 그게 전부입니다."',
    '"먼저 질문을 말씀해 주시죠."',
    '"제가 직접 확인한 것만 답하겠습니다."',
    '"그날 일이라면 기억나는 만큼 말씀드리죠."',
    '"제가 더 보탤 이야기는 없습니다."',
    '"무엇을 확인하셨는지 말씀해 보시죠."',
    '"질문하시는 내용에 따라 답하겠습니다."',
  ],
  // 당황하거나 긴장한 쪽.
  skittish: [
    '"네... 말씀하세요."',
    '"제가 뭘 잘못했습니까?"',
    '"무슨 일인지 설명해 주실 수 있을까요?"',
    '"갑자기 왜 저를 찾으셨는지..."',
    '"저... 저 말씀이신가요?"',
    '"제가 뭘 알아야 하는 건가요?"',
    '"아무것도 못 봤는데요."',
    '"오래 걸리나요?"',
    '"여기서 말씀드려야 되나요..."',
    '"제가 잘못한 게 있으면 말씀해 주세요."',
    '"무슨 일이 있었던 건가요?"',
    '"저는 잘 모르겠는데요."',
    '"무슨 질문을 하시려는 건지..."',
    '"제가 아는 건 말씀드릴게요."',
    '"저는 그냥 본 대로 말씀드리면 되는 거죠?"',
    '"네, 듣고 있습니다."',
    '"저한테 물어보시는 거죠?"',
    '"제가 먼저 말씀드려야 하나요?"',
  ],
  unruffled: [
    '"앉으시죠."',
    '"궁금하신 걸 물어보세요."',
    '"아는 만큼 말씀드리겠습니다."',
    '"시간은 괜찮습니다."',
    '"오실 줄 알았습니다."',
    '"차라도 한잔 드릴까요."',
    '"급할 것 없습니다. 앉으시죠."',
    '"뭐가 궁금하신지부터 들어 보죠."',
    '"저는 여기 계속 있을 겁니다."',
    '"천천히 하셔도 됩니다."',
    '"저부터 물어봐도 되겠습니까."',
    '"이럴 줄 알았어요."',
    '"편하게 물어보세요."',
    '"서두르실 것 없습니다."',
    '"천천히 말씀하시죠."',
    '"시간은 충분합니다."',
    '"먼저 들어 보겠습니다."',
    '"궁금한 것부터 말씀하세요."',
    '"오늘은 길게 이야기해도 괜찮습니다."',
    '"하나씩 물어보시면 됩니다."',
  ],
  // 경계하면서도 협조하는 쪽. 아무 표시도 없는 사람이 여기로 온다.
  // 경계하면서도 협조하는 쪽 — 차분하고 감정 기복이 적은 사람들이다.
  // 아무 표시도 없는 사람이 여기로 오므로 1,533명 중 612명(39퍼센트)이 이
  // 갈래다. 풀이 제일 커야 하는 자리라 사용자가 따로 채웠다. 개성이 거의
  // 없는 것("말씀하세요")과 은근히 성격이 드러나는 것("예상은 했습니다")을
  // 섞는다 — 앞엣것만 있으면 아무나 할 수 있는 말이 되고, 뒤엣것만 있으면
  // 차분한 사람이 전부 한 성격 하는 사람이 된다.
  courteous: [
    '"제가 아는 건 많지 않습니다."',
    '"제가 말씀드릴 수 있는 건 여기까지입니다."',
    '"먼저 어떤 걸 확인하고 싶으신지 말씀해 주세요."',
    '"필요한 만큼은 답하겠습니다."',
    '"네, 말씀하세요."',
    '"무슨 일이신가요?"',
    '"무엇을 확인하고 싶으신가요?"',
    '"제가 아는 건 말씀드리겠습니다."',
    '"질문하시면 답하겠습니다."',
    '"천천히 말씀하시죠."',
    '"듣고 있습니다."',
    '"필요한 게 있으면 말씀하세요."',
    '"제가 아는 범위에서 말씀드리겠습니다."',
    '"무슨 일인지 먼저 설명해 주시겠습니까?"',
    '"네. 말씀하셔도 됩니다."',
    '"확인할 게 있으신 모양이네요."',
    '"괜찮습니다. 물어보세요."',
    '"어떤 점이 궁금하신가요?"',
    '"네, 기다리고 있었습니다."',
    '"말씀하시면 듣겠습니다."',
    '"예상은 했습니다. 말씀하시죠."',
    '"무슨 질문부터 하실 건가요?"',
    '"천천히 물어보셔도 됩니다."',
    '"제가 설명드릴 수 있는 건 말씀드리죠."',
    '"네. 듣겠습니다."',
    '"무슨 일이 있었는지부터 말씀드릴까요?"',
    '"궁금하신 게 있으면 바로 물어보세요."',
  ],
  imperious: [
    '"왜 제가 불려와야 했는지부터 듣죠."',
    '"이렇게까지 할 일입니까?"',
    '"제가 피할 이유는 없습니다."',
    '"질문이 있으면 바로 하시죠."',
    '"용건만 말씀하시죠."',
    '"제가 여기 있어야 할 이유가 있습니까."',
    '"길게는 못 냅니다."',
    '"누구한테 뭘 들으셨는지부터 듣죠."',
    '"왜 저한테 묻는지부터 말씀하시죠."',
    '"질문이 있으면 바로 하십시오."',
    '"이 정도 일로 저를 붙잡으신 겁니까?"',
    '"무엇을 확인하려는지부터 듣겠습니다."',
    '"제가 모르는 이야기가 있는 모양이군요."',
    '"용건을 말씀하시죠."',
    '"필요한 질문만 하십시오."',
    '"저도 시간이 많지는 않습니다."',
    '"확인할 게 있으면 지금 하시죠."',
    '"제가 설명해야 할 이유가 있습니까?"',
    '"무슨 근거로 묻는 겁니까."',
    '"먼저 상황부터 제대로 말씀하시죠."',
    '"제가 아는 건 정확하게 말씀드리겠습니다."',
    '"질문을 정리해서 하시는 게 좋겠습니다."',
    '"무엇이 문제인지부터 듣죠."',
    '"저한테 따로 확인할 게 있습니까?"',
    '"그 부분은 제가 설명할 수 있습니다."',
    '"길게 돌려 말할 필요는 없겠죠."',
    '"확인할 게 있다면 말씀하십시오."',
    '"무엇을 확인할 건지 말씀하시죠."',
    '"질문이 있다면 정확하게 하십시오."',
    '"제가 아는 내용부터 말씀드리죠."',
    '"무슨 일이 문제인지 먼저 듣겠습니다."',
    '"필요한 것만 물으시면 됩니다."',
    '"제가 답할 수 있는 내용인지 보죠."',
    '"질문의 요지를 말씀해 주십시오."',
    '"그렇게 묻는 이유가 있겠죠."',
    '"먼저 확인할 사항부터 정리하시죠."',
    '"그 부분은 제가 잘 알고 있습니다."',
    '"무엇이 맞지 않는다는 겁니까?"',
    '"질문을 한 번에 하시는 게 좋겠습니다."',
    '"제가 설명하면 되는 겁니까?"',
    '"그 점은 오해하지 않으셨으면 합니다."',
    '"확인할 내용이 있다면 말씀하십시오."',
  ],
  // 말수가 적은 쪽. 백주안처럼 짧게 답하고 먼저 말을 꺼내지 않는 인물이
  // 여기 온다 — "뭘 물어보시려고요."가 그 설정에 가장 가깝다.
  procedural: [
    '"네."',
    '"말씀하세요."',
    '"듣고 있습니다."',
    '"뭘 물어보시려고요."',
    '"기록은 다 남아 있습니다."',
    '"어느 부분을 보시겠습니까."',
    '"필요하시면 대장을 가져오겠습니다."',
    '"제 담당은 거기까지입니다."',
    '"순서대로 말씀드리죠."',
    '"뭘 확인하시려는 겁니까."',
    '"자리에서 말씀드려도 되겠습니까."',
    '"일은 계속해도 되겠습니까."',
    '"확인할 내용을 말씀해 주십시오."',
    '"기록은 확인해 보겠습니다."',
    '"필요한 자료가 있으면 말씀하십시오."',
    '"담당 업무부터 말씀드리겠습니다."',
    '"순서대로 말씀드리겠습니다."',
    '"확인 절차에 따라 보겠습니다."',
    '"기록된 내용부터 확인하시죠."',
    '"필요한 부분을 짚어 주십시오."',
    '"제가 확인할 수 있는 건 말씀드리겠습니다."',
    '"일단 사실관계부터 보겠습니다."',
    '"해당 기록은 남아 있습니다."',
    '"확인할 항목을 말씀해 주십시오."',
    '"업무상 알고 있는 범위에서 답하겠습니다."',
    '"시간 순서대로 말씀드리겠습니다."',
    '"기록을 보면 확인할 수 있습니다."',
    '"그 부분은 자료를 가져오겠습니다."',
  ],
};

// 마스터의 말투 설명은 거의 언제나 "평소엔 A지만 …하면 B" 꼴이다. 뒤쪽은
// **압박받을 때**의 변화라, 그것까지 넣고 가르면 인사말이 틀린다 — 황보람은
// "평소엔 말이 길고 사설이 붙지만, 백주안 얘기가 나오면 갑자기 짧아진다"인데
// 뒤 절의 '짧'이 걸려 과묵형이 됐다. 첫마디는 아직 아무것도 안 물어본
// 자리이므로 평소 쪽만 본다.
const VOICE_UNDER_PRESSURE =
  /(지만|다가|하면|나오면|되면|받으면|짚으면|물으면|압박)/;

function baselineVoice(text: string): string {
  const at = text.search(VOICE_UNDER_PRESSURE);
  return at > 0 ? text.slice(0, at) : text;
}

// 부정문에 걸리지 않게 한다. 목하연의 "모두에게 정중한 존댓말을 쓰고
// 목소리를 높이지 않는다"에서 '목소리를 높'만 보면 권위형이 되는데,
// 실제로는 그 반대를 말하는 문장이다.
function matchesVoice(text: string, pattern: RegExp): boolean {
  const scan = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
  for (const found of text.matchAll(scan)) {
    const after = text.slice(
      (found.index || 0) + found[0].length,
      (found.index || 0) + found[0].length + 7,
    );
    if (!/않|없|말고|아니/.test(after)) return true;
  }
  return false;
}

// 이 인물이 어느 갈래인가. 첫마디와 압박 사다리가 같은 판정을 쓴다 —
// 인사는 차분한데 몰렸을 때는 다른 사람이 되면 안 된다.
// 마스터의 진술·증언은 대부분 그 사람이 탐정에게 하는 말인데(2,606개 중
// 2,565개가 `…습니다`/`…어요`로 끝나는 1인칭 대사체) 따옴표 없이 맨문장으로
// 찍혀 나갔다. 같은 화면에서 첫마디(`"듣고 있습니다."`)와 가설 반박은
// 따옴표 안에 있으니, 진술만 서식이 갈려 사람의 말이 아니라 기록으로 읽힌다.
//
// 값이 대사인지 서술인지는 끝맺음으로 가른다 — `knows[].content` 는
// `21시경 밸브를 잠갔다.` 처럼 사실을 그대로 적는 자리라 3인칭 서술이고,
// 옛 서식으로 쓰인 증언 카드도 `…라는 진술이 확보된다.` 로 끝난다. 그런
// 값에 따옴표를 씌우면 없던 화자가 생기므로 손대지 않는다.
//
// 다만 `initial_claims[].content` 는 이 판정을 타지 않는다(2026-09-23).
// 스키마가 「첫 대면에서 그 인물이 먼저 꺼내는 말」로 정의한 자리이고 코퍼스
// 2,768줄 중 지문 꼴이 0줄이라, 끝맺음을 볼 이유가 없다. 보던 동안에는
// 「…놀라서 오신 거죠, 뭐.」처럼 꼬리 절로 끝나는 입말이 이 정규식에 안
// 걸려 **그 줄만 따옴표 없이 기록처럼** 나갔다(CASE011 S-CH01-03). 진술은
// `asQuote` 로 무조건 세우고, 끝맺음 판정은 물증과 증언이 한 필드에 섞이는
// 카드 본문(`card.summary`)에만 남긴다. 포맷의 기준은
// `docs/offline-master-format.md` 「대사 — 무엇이 말이고 무엇이 지문인가」.
const SPEECH_END = /(?:니다|니까|나요|가요|는데요|군요|죠|요|\.\.\.|…)\s*[.?!。]?$/;

// 말이라고 적힌 자리를 따옴표로 세운다. `asSpeech` 는 끝맺음을 보고 대사인지
// 지문인지 가리지만, 여기 오는 것은 **필드 정의가 이미 대사인 값**이다 —
// `evidence[].reaction`(두 사람이 주고받는 말)과 `relationships[].says`(그 사람
// 입으로 한 마디). 그런데 마스터가 따옴표를 빼먹은 것이 reaction 136줄 전부,
// says 798줄 중 58줄이라, 같은 화면에서 공용 풀의 대사는 따옴표가 있고 손으로
// 쓴 것은 없었다(CASE001 실플레이: 한지우의 줄이 한 턴은 「"그래도 뭐라도 나온
// 게 어디예요."」, 다음 턴은 따옴표 없이 나갔다). 데이터 936줄을 고치는 대신
// 내보내는 자리에서 세운다 — 새로 쓰는 마스터가 또 빼먹어도 화면은 같다.
function asQuote(text: string | null | undefined): string | null {
  const body = (text || '').trim();
  if (!body) return null;
  return QUOTE_MARK.test(body[0]) ? body : `"${body}"`;
}

function asSpeech(text: string | null | undefined): string | null {
  const body = (text || '').trim();
  if (!body) return null;
  if (QUOTE_MARK.test(body[0])) return body;
  return SPEECH_END.test(body) ? `"${body}"` : body;
}

// 3인칭으로 적힌 사실(`knows[].content`, 「05시 40분 마루에서 아버지와
// 계약서를 같이 봤다.」)을 **그 사람이 말한 것**으로 옮긴다 — 「…봤다고
// 한다.」 지금까지는 「배준서는 그러고 보니, 하는 표정으로 입을 연다.」 뒤에
// 그 3인칭 문장이 그대로 붙어서, 입을 연다고 해 놓고 나온 것이 기록이었다
// (2026-09-23 CASE001·003·004 실플레이 로그 전부에서). 문장이 여럿이면
// 「…였다고, …썼다고 한다.」로 잇는다. 「아니다」는 「아니라고」, 「이다」는
// 「이라고」. 이미 대사꼴이면 따옴표만 세우고, 「다.」로 안 끝나는 문장이
// 섞여 있으면 손대지 않는다 — 어설픈 간접화법보다 원문이 낫다.
function reportedFact(text: string | null | undefined): string | null {
  const body = (text || '').trim();
  if (!body) return null;
  if (QUOTE_MARK.test(body[0])) return body;
  if (SPEECH_END.test(body)) return `"${body}"`;
  const sentences = body
    .split(/(?<=다)[.。]\s+/)
    .map((item) => item.trim().replace(/[.。]$/, ''))
    .filter(Boolean);
  if (!sentences.length || !sentences.every((item) => item.endsWith('다'))) {
    return body;
  }
  const clauses = sentences.map((item) =>
    item.replace(/아니다$/, '아니라').replace(/이다$/, '이라'),
  );
  return clauses
    .map((item, i) => (i === clauses.length - 1 ? `${item}고 한다.` : `${item}고,`))
    .join(' ');
}

// 진술(S-)은 그 사람의 말이라 따옴표를 세우고, 사실(F-)은 간접화법으로.
// 회상·다시 말 걸기·제시 해금·가설 반박 해금이 같은 갈림을 쓴다.
function spokenById(id: string, content: string | null | undefined): string | null {
  if (!content) return null;
  return id.startsWith('S-') ? asQuote(content) : reportedFact(content);
}

// 방금 들은 말에 붙는 한지우의 한 줄. 풀의 몇 줄은 **그 말의 모양을
// 단정한다** — 「말끝이 흐려졌는데」「시간 얘기가 나왔으니」. 실플레이에서
// 시각이 한 번도 안 나온 대답 뒤에 「시간 얘기가 나왔으니」가 붙었다
// (CASE003 「하역구요? 거긴…」). 단정하는 줄은 그 말이 실제로 그럴 때만 뽑는다.
function jiwooTestimonyLine(
  said: string | null | undefined,
  seed: number,
  recent: string[],
): string | null {
  const body = (said || '').trim();
  const trailsOff = /(?:…|\.\.\.)\s*["”]?\s*$/.test(body) || /…\s*["”]?\s*[.?!]?$/.test(body);
  const hasTime = /\d{1,2}\s*시|\d{1,2}:\d{2}/.test(body);
  const pool = JIWOO_TESTIMONY.filter((line) => {
    if (line.includes('말끝이')) return trailsOff;
    if (line.includes('시간 얘기')) return hasTime;
    return true;
  });
  return pick(pool, seed, recent);
}

// 탐정이 그 자리에서 실제로 던지는 말. 지금까지 카드 턴에서 탐정은 한
// 마디도 하지 않았다 — 상대의 지문과 대답만 나오고, 무엇을 물었는지는
// 플레이어가 누른 행동 문구에만 있었다.
//
// 문장은 `discovery_condition` 에서 만든다. 카드마다 대사를 새로 적게 하면
// 2,604장을 다시 써야 하는데, 이 필드가 이미 「○○에게 <물어볼 것>을
// 묻는다」 꼴이라 앞의 이름과 뒤의 `묻는다`만 떼면 목적어가 그대로 남는다
// (「발견 당시 상황을」, 「어르신이 어떻게 승낙했는지」). 둘 다 아래 맺음말에
// 그대로 붙는다.
// 맺음말은 **상대에 따라** 고른다. 목록을 늘리기만 하면 어투가 많아질 뿐
// 성격이 되지 않는다 — 탐정이 상대를 보고 말을 고르는 것이 이 자리에서
// 그의 성격이다. 갈래는 첫마디·지문과 같은 여섯 가지를 쓴다(권위·긴장·
// 방어·태연·과묵·협조). 진범인지 결정적 증거인지로 가르지 않는다 — 어투가
// 정답을 흘린다. 상대의 말투는 플레이어가 이미 보고 있는 것이라 새지 않는다.
//
// 목적어의 끝 글자는 열한 건에서 을 22 · 지 12 · 를 4 · 해 2 · 시 1 로
// 갈리므로, 그 다섯 뒤에 전부 자연스럽게 붙는 맺음말만 쓴다.
// 「짚어 주시겠습니까」 같은 것은 「…승낙했는지 짚어 주시겠습니까」가
// 어색해서 뺐다.
const ASK_CLOSING_BY_KIND: Record<string, string[]> = {
  forthcoming: [
    '{topic} 말씀해 주시겠습니까.',
    '{topic} 여쭙겠습니다.',
    '{topic} 듣고 싶습니다.',
    '{topic} 듣겠습니다.',
    '{topic} 말씀해 주십시오.',
    '{topic} 말씀해 주시면 됩니다.',
    '{topic} 자세히 말씀해 주시겠습니까.',
    '{topic} 기억나는 대로 말씀해 주십시오.',
    '{topic} 처음부터 말씀해 주시겠습니까.',
    '{topic} 들려주시면 됩니다.',
    '{topic} 자세히 말씀해 주십시오.',
    '{topic} 기억나는 순서대로 말씀해 주십시오.',
  ],
  // 깍듯하되 짧게. 길게 청하면 이쪽이 아쉬운 사람이 된다.
  imperious: [
    '{topic} 여쭙겠습니다.',
    '{topic} 듣겠습니다.',
    '{topic} 확인하고 싶습니다.',
    '{topic} 말씀해 주시겠습니까.',
    '{topic} 듣고 싶습니다.',
    '{topic} 정확히 말씀해 주십시오.',
    '{topic} 구체적으로 말씀해 주시겠습니까.',
    '{topic} 그대로 말씀해 주십시오.',
    '{topic} 순서대로 말씀해 주십시오.',
    '{topic} 말씀해 주십시오.',
    '{topic} 정확히 말씀해 주시겠습니까.',
    '{topic} 확인하겠습니다.',
    '{topic} 구체적으로 말씀해 주십시오.',
    '{topic} 순서대로 말씀해 주시겠습니까.',
    '{topic} 자세히 말씀해 주십시오.',
    '{topic} 말씀해 주시면 됩니다.',
  ],
  // 겁먹은 사람에게는 재촉하지 않는다.
  skittish: [
    '{topic} 기억나는 대로 말씀해 주십시오.',
    '{topic} 천천히 말씀하셔도 됩니다.',
    '{topic} 아는 만큼만 말씀해 주시면 됩니다.',
    '{topic} 아는 대로만 말씀해 주시면 됩니다.',
    '{topic} 듣고 싶습니다.',
    '{topic} 괜찮으니 천천히 말씀해 주십시오.',
    '{topic} 생각나는 것부터 말씀해 주십시오.',
    '{topic} 기억나는 부분만 말씀해 주시면 됩니다.',
    '{topic} 말씀하실 수 있는 만큼만 말씀해 주십시오.',
  ],
  // 빠져나갈 틈을 주지 않되 몰아붙이지도 않는다.
  guarded: [
    '{topic} 말씀해 주시겠습니까.',
    '{topic} 그대로 말씀해 주시면 됩니다.',
    '{topic} 다시 한번 듣고 싶습니다.',
    '{topic} 여쭙겠습니다.',
    '{topic} 듣고 싶습니다.',
    '{topic} 필요한 부분만 말씀해 주십시오.',
    '{topic} 확인해 보겠습니다.',
    '{topic} 구체적으로 말씀해 주시겠습니까.',
    '{topic} 순서대로 말씀해 주십시오.',
    '{topic} 그대로 말씀해 주십시오.',
    '{topic} 확인하겠습니다.',
    '{topic} 정확히 말씀해 주시겠습니까.',
    '{topic} 자세히 들려주시겠습니까.',
    '{topic} 말씀해 주시면 확인하겠습니다.',
  ],
  unruffled: [
    '{topic} 듣고 싶습니다.',
    '{topic} 확인하고 싶습니다.',
    '{topic} 여쭙겠습니다.',
    '{topic} 말씀해 주시겠습니까.',
    '{topic} 듣겠습니다.',
    '{topic} 천천히 말씀해 주십시오.',
    '{topic} 기억나는 대로 말씀해 주시겠습니까.',
    '{topic} 자세히 들어 보겠습니다.',
    '{topic} 말씀해 주시면 됩니다.',
  ],
  // 말수가 적은 쪽에는 이쪽도 말을 줄인다.
  procedural: [
    '{topic} 듣겠습니다.',
    '{topic} 여쭙겠습니다.',
    '{topic} 말씀해 주십시오.',
    '{topic} 확인하고 싶습니다.',
    '{topic} 짚어 주시면 됩니다.',
    '{topic} 순서대로 말씀해 주십시오.',
    '{topic} 기록과 맞춰 보겠습니다.',
    '{topic} 확인해 보겠습니다.',
    '{topic} 구체적으로 말씀해 주십시오.',
    '{topic} 사실대로 말씀해 주시면 됩니다.',
  ],
  courteous: [
    '{topic} 말씀해 주시겠습니까.',
    '{topic} 여쭙겠습니다.',
    '{topic} 듣고 싶습니다.',
    '{topic} 말씀해 주십시오.',
    '{topic} 확인하고 싶습니다.',
    '{topic} 자세히 말씀해 주십시오.',
    '{topic} 순서대로 말씀해 주시겠습니까.',
    '{topic} 기억나는 대로 말씀해 주시면 됩니다.',
    '{topic} 빠짐없이 말씀해 주십시오.',
    '{topic} 차례대로 설명해 주시겠습니까.',
  ],
};

function detectiveQuestionFor(
  condition: string,
  npcName: string,
  kind: string,
  seed: number,
  recent: string[],
): string | null {
  let body = (condition || '').trim();
  if (!body) return null;
  const prefix = `${npcName}에게 `;
  if (!body.startsWith(prefix)) return null;
  body = body.slice(prefix.length).trim();
  // 「…를 묻는다」 / 「…인지 물어본다」. 이 꼴이 아니면 문장을 만들 수 없으니
  // 손대지 않는다 — 어색한 한 줄보다 탐정이 말을 아끼는 편이 낫다.
  const stripped = body.replace(/\s*(?:묻는다|물어본다)[.。]?$/, '').trim();
  if (!stripped || stripped === body) return null;
  // 너무 길면 대사가 아니라 지시문으로 읽힌다.
  if (stripped.length > 28) return null;
  const pool = ASK_CLOSING_BY_KIND[kind] || ASK_CLOSING_BY_KIND.courteous;
  const line = pick(pool, seed, recent, (template) =>
    template.replace('{topic}', stripped),
  );
  return line ? `"${line}"` : null;
}

// 첫 대면에서 탐정이 던지는 첫 물음. 붙일 말꼬리는 카드를 받아 내는 자리와
// 같은 ASK_CLOSING_BY_KIND 를 쓴다 — 겁먹은 사람에게는 천천히 말하라고 하고
// 따지는 사람에게는 짧게 묻는 그 구분이 첫 물음에서도 같아야 한다.
//
// 시각을 짚어 묻지 않는다. 「그날 밤 어디 있었는지」는 알리바이 행동이 따로
// 받는 자리라, 여기서 먼저 물으면 미뤄 둔 그 말이 첫 턴에 도로 나온다.
const FIRST_QUESTION_TOPICS = [
  '그날 있었던 일을',
  '무엇을 보셨는지',
  '이상하게 느끼신 것이 있었는지',
  '평소와 달랐던 것이 있었는지',
  '그때 무엇을 하고 계셨는지',
  '당시의 동선을',
  '기억하시는 것을',
  '어떤 상황이었는지',
];

// 물음 앞에 서는 **받는 말**. 이것이 없을 때 탐정은 상대가 방금 한 말을
// 통째로 무시하고 질문지를 읽었다 — 겁먹은 사람이 「제가 뭘 잘못했습니까?」
// 하고 물었는데 「그때 무엇을 하고 계셨는지…」가 돌아왔다. 캐치볼이 아니라
// 각자 공을 던지는 것이다.
//
// 상대의 **그 첫마디**를 보고 고른다. 첫마디 풀이 stance 별로 갈려 있어도
// 한 갈래 안에 「무슨 일이시죠?」와 「제가 답할 의무는 없는 걸로 압니다만」이
// 같이 있으므로, stance 만 보면 결국 두루뭉술한 말이 된다. 먼저 걸리는 것이
// 이기므로 **좁은 것부터** 적는다.
const FIRST_WORD_REPLY: Array<[RegExp, string]> = [
  [/잘못/, '잘못하신 건 없습니다.'],
  [/의무/, '의무가 아닌 건 압니다.'],
  [/오래 걸리|시간이 없|바쁘/, '오래 안 걸립니다.'],
  [/이미|다 했|다 말씀|또 /, '같은 걸 한 번 더 여쭙겠습니다.'],
  [/모르겠|못 봤|아는 게 없/, '모르시는 건 모르신다고 하셔도 됩니다.'],
  [/저 말씀이신가요|저한테|저를 찾/, '예, 맞습니다.'],
  [/기다리|오실 줄|그럴 줄|얘기 들었|탐정님이시죠/, '그럼 바로 여쭙겠습니다.'],
  [/차라도|드릴까요/, '아뇨, 괜찮습니다.'],
  [/앉으시죠|앉으세요|자리/, '고맙습니다.'],
  [/뭐부터|무엇부터|먼저/, '그럼 처음부터.'],
  [/용건|무슨 일|어떤 걸|무슨 부분|뭘 물/, '몇 가지만 여쭙겠습니다.'],
  [/물어보세요|물어보시죠|물으시면|질문|말씀하세요/, '그러겠습니다.'],
];

// 첫마디가 위 어디에도 안 걸릴 때의 기본값. 여기서도 stance 를 지킨다.
const ASK_OPENER_BY_KIND: Record<string, string[]> = {
  forthcoming: [
    '그럼 바로 여쭙겠습니다.',
    '도와주셔서 고맙습니다.',
    '그럼 한 가지씩.',
    '말씀 편하게 하셔도 됩니다.',
    '그럼 여쭙겠습니다.',
    '오래 안 걸립니다.',
  ],
  courteous: [
    '몇 가지만 여쭙겠습니다.',
    '시간 내주셔서 고맙습니다.',
    '그럼 여쭙겠습니다.',
    '오래 안 걸립니다.',
    '하나씩 여쭙겠습니다.',
    '편하게 말씀하셔도 됩니다.',
  ],
  procedural: [
    '확인할 것이 있어 왔습니다.',
    '절차대로 여쭙겠습니다.',
    '몇 가지만 확인하겠습니다.',
    '짧게 여쭙겠습니다.',
    '순서대로 여쭙겠습니다.',
    '기록에 남을 이야기입니다.',
  ],
  unruffled: [
    '그럼 천천히 여쭙겠습니다.',
    '오래 붙잡지는 않겠습니다.',
    '급할 것 없습니다.',
    '편한 대로 말씀하셔도 됩니다.',
    '그럼 하나만.',
    '그럼 앉아서 하시죠.',
  ],
  guarded: [
    '오래 안 걸립니다.',
    '답하기 싫으시면 그렇다고 하셔도 됩니다.',
    '한 가지만 여쭙겠습니다.',
    '확인만 하면 됩니다.',
    '그럼 짧게.',
    '무리한 건 안 여쭙겠습니다.',
  ],
  imperious: [
    '그러겠습니다.',
    '그럼 바로 여쭙죠.',
    '한 가지만.',
    '짧게 여쭙겠습니다.',
    '말씀대로 하겠습니다.',
    '그럼 그렇게 하죠.',
  ],
  skittish: [
    '잘못하신 건 없습니다.',
    '편하게 말씀하셔도 됩니다.',
    '모르시면 모르신다고 하셔도 됩니다.',
    '오래 안 걸립니다.',
    '본 대로만 말씀해 주시면 됩니다.',
    '천천히 하셔도 됩니다.',
  ],
};

// 남의 입에서 이 사람 이름이 이미 나왔을 때. 이 한 구절만은 **조건이 참일
// 때만** 성립한다 — 플레이어가 발로 뛴 것이 탐정 입으로 돌아오는 자리라,
// 물음 자체가 이 판의 물음이 된다. 그래서 받는 말 중에 이것이 가장 세고,
// 있으면 위 둘보다 먼저 쓴다.
const ASK_OPENER_NAME_CAME_UP = [
  '앞에서 성함이 나왔습니다.',
  '앞서 들은 이야기에 성함이 있었습니다.',
  '성함을 먼저 듣고 왔습니다.',
  '다른 분 말씀 중에 성함이 나왔습니다.',
  '여기 오기 전에 성함을 들었습니다.',
  '이야기를 듣다가 성함이 나와서 왔습니다.',
];

// 이미 들은 진술 가운데 **남의 것**에 이 사람 이름이 들어 있는가. 자기
// 진술은 세지 않는다 — 아직 만나지도 않은 사람이라 있을 수가 없지만,
// 나중에 순서가 바뀌어도 「본인이 본인 이름을 말했다」로 열리면 안 된다.
function nameAlreadyHeard(
  index: CaseIndex,
  state: EngineState,
  npc: EngineNpc,
): boolean {
  if (!npc.name) return false;
  for (const [ownerId, knowledge] of Object.entries(index.master.npcs)) {
    if (ownerId === npc.id) continue;
    for (const item of knowledge.knows) {
      if (!state.heard_statements.includes(item.factId)) continue;
      if ((item.content || '').includes(npc.name)) return true;
    }
    for (const claim of knowledge.initialClaims) {
      if (!state.heard_statements.includes(claim.claimId)) continue;
      if ((claim.content || '').includes(npc.name)) return true;
    }
  }
  return false;
}

// 탐정이 묻는 몸짓. 인물은 LEAD_FIRST_MEETING 으로 몸이 있는데 탐정은
// 목소리만 있었다 — 한 줄을 붙이면 두 사람이 같은 방에 서게 된다. 수첩은
// 한지우가 들고 있으므로 여기서 탐정이 적지는 않는다.
const LEAD_DETECTIVE_ASK: Record<string, string[]> = {
  forthcoming: [
    '탐정이 그 말을 받아 바로 묻는다.',
    '탐정이 짧게 눈인사를 하고 묻는다.',
    '탐정은 뜸을 들이지 않는다.',
  ],
  courteous: [
    '탐정이 짧게 목례를 하고 묻는다.',
    '탐정은 잠깐 뜸을 들였다가 묻는다.',
    '탐정이 자세를 고쳐 잡는다.',
  ],
  procedural: [
    '탐정이 한지우 쪽을 한 번 보고 묻는다.',
    '탐정은 본론부터 꺼낸다.',
    '탐정이 말을 고르지 않고 바로 묻는다.',
  ],
  unruffled: [
    '탐정도 서두르지 않는다.',
    '탐정이 마주 앉고 나서 묻는다.',
    '탐정은 방을 한 번 둘러보고 나서 입을 연다.',
  ],
  guarded: [
    '탐정이 한 걸음 좁혀 선다.',
    '탐정은 그 말에 대꾸하지 않고 묻는다.',
    '탐정이 잠깐 상대를 보고 나서 입을 연다.',
  ],
  imperious: [
    '탐정은 말을 끊지 않고 끝까지 듣는다.',
    '탐정이 고개를 한 번 끄덕이고 묻는다.',
    '탐정은 목소리를 높이지 않는다.',
  ],
  skittish: [
    '탐정은 앉지 않고 반걸음 물러선 채 묻는다.',
    '탐정이 목소리를 한 톤 낮춘다.',
    '탐정은 서두르지 않고 기다렸다가 묻는다.',
  ],
};

function firstQuestionFor(
  index: CaseIndex,
  state: EngineState,
  npc: EngineNpc,
  firstWord: string,
  seed: number,
  recent: string[],
): string {
  const kind = voiceKindOf(index, npc);
  const opener = nameAlreadyHeard(index, state, npc)
    ? pick(ASK_OPENER_NAME_CAME_UP, seed, recent)
    : FIRST_WORD_REPLY.find(([pattern]) => pattern.test(firstWord))?.[1] ||
      pick(ASK_OPENER_BY_KIND[kind] || ASK_OPENER_BY_KIND.courteous, seed, recent);
  const topic = pick(FIRST_QUESTION_TOPICS, seed, recent);
  const pool = ASK_CLOSING_BY_KIND[kind] || ASK_CLOSING_BY_KIND.courteous;
  const question = pick(pool, seed + 1, recent, (template) =>
    template.replace('{topic}', topic),
  );
  return `"${opener} ${question}"`;
}

// 카드 한 장을 받아 내는 자리에서 그 사람이 어떻게 입을 여는지. 첫 대면의
// 말버릇(verbalTicLine)은 이미 한 번 쓰였으므로 여기서 또 쓰면 그 사람이
// 아니라 화면이 반복하는 것이 된다. 대신 첫마디를 가르던 여섯 갈래를
// 그대로 써서 동작만 사람마다 다르게 고른다.
const LEAD_ASK_BY_KIND: Record<string, string[]> = {
  forthcoming: [
    '{topic} 묻기도 전에 말을 시작한다.',
    '{topic} 하던 일을 밀어 두고 이쪽으로 돌아앉는다.',
    '{topic} 반가운 얼굴로 대답한다.',
    '{topic} 묻는 말이 끝나기 전에 고개를 끄덕인다.',
    '{topic} 기다렸다는 듯 몸을 앞으로 기울인다.',
    '{topic} 웃으며 대답한다.',
    '{topic} 질문을 듣자마자 고개를 끄덕인다.',
    '{topic} 생각나는 내용을 먼저 꺼내려 한다.',
    '{topic} 질문이 끝나자 바로 대답한다.',
    '{topic} 탐정 쪽으로 몸을 돌려 앉는다.',
    '{topic} 기억나는 순서대로 이야기를 풀어 놓는다.',
    '{topic} 질문보다 앞서 필요한 설명을 덧붙인다.',
    '{topic} 손짓까지 섞어가며 설명한다.',
    '{topic} 말할 내용을 정리하기보다 먼저 입을 연다.',
    '{topic} 질문을 들으며 고개를 여러 번 끄덕인다.',
    '{topic} 떠오른 사실부터 차례로 말한다.',
    '{topic} 자신이 본 장면을 자세히 설명한다.',
    '{topic} 설명이 끝나기 전에 다음 이야기를 덧붙인다.',
    '{topic} 기억나는 부분을 하나씩 꺼내 놓는다.',
    '{topic} 질문의 뜻을 알아듣자 곧장 말한다.',
    '{topic} 주변 상황까지 함께 설명하려 한다.',
    '{topic} 말을 멈추지 않고 당시 상황을 이어 간다.',
    '{topic} 질문에 답하면서 관련된 이야기를 하나 더 보탠다.',
    '{topic} 떠오르는 대로 말하다가 순서를 다시 잡는다.',
    '{topic} 먼저 본인의 기억부터 꺼내 놓는다.',
    '{topic} 질문을 반갑게 받아들이며 대답한다.',
    '{topic} 설명할 것이 있다는 듯 몸을 앞으로 기울인다.',
    '{topic} 질문에 답한 뒤에도 말을 이어 간다.',
    '{topic} 당시 상황을 손짓으로 짚어 보이며 설명한다.',
    '{topic} 기억나는 사실을 빠르게 이어 붙인다.',
    '{topic} 질문을 듣고 바로 그때의 상황을 떠올린다.',
    '{topic} 자신이 아는 범위를 넓혀 설명하려 한다.',
    '{topic} 질문을 듣고 바로 기억을 꺼낸다.',
    '{topic} 당시의 상황을 떠올리며 말을 시작한다.',
    '{topic} 질문에 답하면서 관련된 사실까지 덧붙인다.',
    '{topic} 탐정이 묻는 내용을 놓치지 않고 받아친다.',
    '{topic} 그때 있었던 일을 처음부터 풀어 설명한다.',
    '{topic} 말할 것이 더 있다는 듯 곧바로 이어 간다.',
    '{topic} 기억나는 장면을 손짓으로 짚어 가며 말한다.',
    '{topic} 질문을 듣자마자 당시의 시간을 떠올린다.',
    '{topic} 자신이 알고 있는 배경부터 설명하려 한다.',
    '{topic} 대답과 함께 주변 상황도 자연스럽게 덧붙인다.',
    '{topic} 질문에 맞춰 기억을 하나씩 꺼내 놓는다.',
    '{topic} 당시 자신이 했던 일을 먼저 설명한다.',
    '{topic} 말문이 트이자 이야기를 길게 이어 간다.',
    '{topic} 질문의 답을 한 뒤 다음 사실까지 말한다.',
    '{topic} 그날의 흐름을 떠올리며 차근차근 이야기한다.',
    '{topic} 기억나는 순서를 따라 이야기를 풀어 간다.',
    '{topic} 자신이 직접 본 부분을 자세히 설명한다.',
    '{topic} 질문을 계기로 관련된 이야기를 더 꺼낸다.',
    '{topic} 그 시간에 무엇을 했는지부터 설명한다.',
    '{topic} 탐정이 묻지 않은 주변 상황까지 덧붙인다.',
    '{topic} 질문을 이해하자 곧바로 당시 장면을 설명한다.',
    '{topic} 말하는 동안 새로운 기억이 떠오른 듯 덧붙인다.',
    '{topic} 자신이 들은 내용과 본 내용을 함께 설명한다.',
    '{topic} 질문에 답한 뒤 확인할 만한 부분을 먼저 짚는다.',
  ],
  imperious: [
    '{topic} 질문이 끝나기 전에 입을 연다.',
    '{topic} 팔짱을 풀지 않은 채 대답한다.',
    '{topic} 되묻지 않고 곧장 잘라 말한다.',
    '{topic} 질문을 끝까지 듣지 않는다.',
    '{topic} 대답하면서 시계를 본다.',
    '{topic} 그건 당연하다는 투로 말한다.',
    '{topic} 질문의 전제를 바로잡으려 한다.',
    '{topic} 자신이 아는 사실부터 단정적으로 말한다.',
    '{topic} 탐정의 말을 끊고 먼저 설명한다.',
    '{topic} 질문을 듣고 눈썹을 살짝 올린다.',
    '{topic} 당연한 사실을 설명하듯 대답한다.',
    '{topic} 질문의 표현을 하나하나 따진다.',
    '{topic} 대답보다 질문의 의도를 먼저 확인한다.',
    '{topic} 말끝을 흐리지 않고 또렷하게 대답한다.',
    '{topic} 손짓으로 질문의 범위를 좁힌다.',
    '{topic} 자신이 옳다는 듯 고개를 든다.',
    '{topic} 질문을 듣고 짧게 웃는다.',
    '{topic} 필요한 부분만 단정해서 말한다.',
    '{topic} 질문의 순서를 바꾸려 한다.',
    '{topic} 탐정을 똑바로 바라보며 대답한다.',
    '{topic} 설명하듯 한 문장씩 끊어 말한다.',
    '{topic} 상대가 이미 알아야 할 내용이라는 듯 말한다.',
    '{topic} 대답하면서 고개를 한 번 젓는다.',
    '{topic} 질문에 대한 답을 먼저 정해 둔 듯 말한다.',
    '{topic} 말할 필요가 없다는 듯 짧게 대답한다.',
    '{topic} 질문의 표현부터 바로잡으려 한다.',
    '{topic} 대답하기 전에 질문의 전제를 짚는다.',
    '{topic} 자신이 아는 사실을 먼저 강조한다.',
    '{topic} 탐정을 향해 고개를 약간 든다.',
    '{topic} 질문의 핵심을 다시 확인한 뒤 대답한다.',
    '{topic} 설명하듯 천천히 대답한다.',
    '{topic} 질문보다 자신이 알고 있는 내용을 앞세운다.',
    '{topic} 당연한 사실을 확인시키듯 말한다.',
    '{topic} 말의 순서를 스스로 정해 대답한다.',
    '{topic} 질문을 듣고 짧게 한숨을 쉰다.',
    '{topic} 탐정의 말을 끝까지 듣고도 바로 답하지 않는다.',
    '{topic} 자신이 옳다는 듯 또렷하게 대답한다.',
    '{topic} 질문의 빈틈을 먼저 짚어 낸다.',
    '{topic} 대답하기 전에 상대의 표현을 되짚는다.',
    '{topic} 설명을 주도하려는 듯 몸을 앞으로 기울인다.',
    '{topic} 질문에 대한 답을 단정적으로 내놓는다.',
    '{topic} 한 문장으로 상황을 정리하려 한다.',
    '{topic} 자신이 알고 있는 사실을 기준으로 답한다.',
    '{topic} 질문에 섞인 가정을 바로잡는다.',
    '{topic} 손짓으로 상황을 설명하며 대답한다.',
    '{topic} 탐정을 똑바로 바라보고 대답한다.',
    '{topic} 상대가 알아야 할 내용이라는 듯 말한다.',
    '{topic} 질문의 순서를 바꿔 설명하려 한다.',
    '{topic} 대답 뒤에 짧게 덧붙여 설명한다.',
  ],
  skittish: [
    '{topic} 한 박자 늦게 대답한다.',
    '{topic} 손끝을 만지작거리다 입을 연다.',
    '{topic} 눈을 한 번 깜빡이고 대답한다.',
    '{topic} 말을 시작했다가 처음부터 다시 한다.',
    '{topic} 목소리가 작아진다.',
    '{topic} 탐정 쪽을 흘끗 보고 대답한다.',
    '{topic} 대답하기 전에 주변을 한 번 살핀다.',
    '{topic} 손을 모은 채 조심스럽게 말한다.',
    '{topic} 질문을 다시 확인하고 대답한다.',
    '{topic} 시선을 오래 마주치지 못한다.',
    '{topic} 입술을 한 번 다문 뒤 대답한다.',
    '{topic} 말끝을 흐리다가 다시 이어 간다.',
    '{topic} 손가락을 만지작거리며 기억을 더듬는다.',
    '{topic} 질문을 듣고 잠시 얼어붙는다.',
    '{topic} 눈치를 보듯 상대의 반응을 살핀다.',
    '{topic} 작게 숨을 들이마시고 대답한다.',
    '{topic} 말을 고르느라 잠시 침묵한다.',
    '{topic} 어깨를 움츠린 채 대답한다.',
    '{topic} 질문에 바로 답하지 못하고 한 번 되묻는다.',
    '{topic} 시선을 아래로 내린 채 말한다.',
    '{topic} 손을 내려다보다가 겨우 입을 연다.',
    '{topic} 대답하기 전에 짧게 숨을 고른다.',
    '{topic} 목소리를 낮춰 조심스럽게 말한다.',
    '{topic} 기억나는 부분만 조심스럽게 꺼낸다.',
    '{topic} 눈을 피했다가 다시 이쪽을 본다.',
    '{topic} 말을 하다가 중간에 멈춘다.',
    '{topic} 손끝에 힘을 주며 대답한다.',
    '{topic} 질문을 듣고 고개부터 작게 끄덕인다.',
  ],
  guarded: [
    '{topic} 잠깐 말을 고른다.',
    '{topic} 대답하기 전에 이쪽을 한 번 본다.',
    '{topic} 그 질문을 기다렸다는 듯 대답한다.',
    '{topic} 필요한 만큼만 말하려는 얼굴이다.',
    '{topic} 대답하기 전에 한 번 생각한다.',
    '{topic} 짧게 끊어 말한다.',
    '{topic} 질문의 범위를 먼저 확인한다.',
    '{topic} 시선을 오래 마주치지 않는다.',
    '{topic} 대답할 부분만 골라서 말한다.',
    '{topic} 한마디씩 끊어 대답한다.',
    '{topic} 질문을 다시 확인한 뒤 입을 연다.',
    '{topic} 더 설명할 필요가 없다는 듯 대답한다.',
    '{topic} 손을 내려놓고 짧게 대답한다.',
    '{topic} 질문의 핵심만 받아들인다.',
    '{topic} 잠시 침묵하다가 필요한 말만 한다.',
    '{topic} 표정을 바꾸지 않고 대답한다.',
    '{topic} 대답할 말을 미리 정리한 듯 말한다.',
    '{topic} 주변을 한 번 보고 대답한다.',
    '{topic} 질문에 바로 답하지 않고 잠시 생각한다.',
    '{topic} 말을 길게 이어 가지 않는다.',
    '{topic} 시선을 돌린 채 필요한 부분만 설명한다.',
    '{topic} 짧은 문장으로 답을 끝낸다.',
    '{topic} 더 묻지 말라는 듯 말을 닫는다.',
    '{topic} 질문을 듣고 한숨을 짧게 내쉰다.',
    '{topic} 자신이 말할 범위를 정한 듯 대답한다.',
    '{topic} 잠시 침묵한 뒤 짧게 답한다.',
    '{topic} 질문을 들은 뒤 표정을 가다듬는다.',
    '{topic} 대답할 범위를 정한 듯 입을 연다.',
    '{topic} 필요한 사실만 골라 말한다.',
    '{topic} 질문을 되짚은 뒤 대답한다.',
    '{topic} 짧은 시선만 주고 다시 앞을 본다.',
    '{topic} 말끝을 흐리지 않고 대답을 끝낸다.',
    '{topic} 더 설명하지 않으려는 듯 고개를 든다.',
    '{topic} 질문의 핵심에만 답한다.',
    '{topic} 잠시 생각한 뒤 한 문장으로 답한다.',
    '{topic} 탐정의 표정을 살핀 뒤 대답한다.',
    '{topic} 대답할 내용을 신중하게 고른다.',
    '{topic} 손을 모은 채 필요한 말만 한다.',
    '{topic} 질문에 맞는 부분만 골라 꺼낸다.',
    '{topic} 시선을 내렸다가 짧게 대답한다.',
    '{topic} 질문을 다시 듣고 나서 입을 연다.',
    '{topic} 말할 내용을 짧게 정리한 뒤 대답한다.',
    '{topic} 대답을 길게 늘이지 않는다.',
    '{topic} 질문의 범위를 넘지 않으려는 듯 말한다.',
    '{topic} 한 번 숨을 고르고 필요한 사실을 말한다.',
    '{topic} 대답할 부분과 아닌 부분을 나누는 표정이다.',
    '{topic} 짧은 대답 뒤 더 말하지 않는다.',
    '{topic} 탐정의 질문을 끝까지 들은 뒤 대답한다.',
    '{topic} 시선을 마주쳤다가 곧 거둔다.',
  ],
  unruffled: [
    '{topic} 별다른 망설임 없이 대답한다.',
    '{topic} 하던 일을 마저 하며 대답한다.',
    '{topic} 어깨를 한 번 으쓱하고 말한다.',
    '{topic} 서두르지 않고 대답한다.',
    '{topic} 창밖을 한 번 보고 말한다.',
    '{topic} 앉은 자세를 바꾸지 않는다.',
    '{topic} 잠시 생각한 뒤 느긋하게 대답한다.',
    '{topic} 질문을 한 번 되새기고 말한다.',
    '{topic} 손에 든 것을 내려놓고 천천히 대답한다.',
    '{topic} 별일 아니라는 듯 고개를 끄덕인다.',
    '{topic} 시간을 재촉하지 않는 표정으로 대답한다.',
    '{topic} 잠깐 웃고는 평소처럼 말한다.',
    '{topic} 시선을 돌리지 않은 채 대답한다.',
    '{topic} 생각나는 순서대로 천천히 말한다.',
    '{topic} 잠시 침묵한 뒤 자연스럽게 입을 연다.',
    '{topic} 질문을 가볍게 받아들이며 대답한다.',
    '{topic} 몸을 편하게 기대고 말한다.',
    '{topic} 주변을 한 번 둘러본 뒤 대답한다.',
    '{topic} 굳이 서두를 이유가 없다는 듯 말한다.',
    '{topic} 차분한 표정으로 이야기를 이어 간다.',
    '{topic} 고개를 살짝 기울이고 대답한다.',
    '{topic} 한 번 숨을 고른 뒤 편하게 말한다.',
    '{topic} 평소 이야기하듯 자연스럽게 대답한다.',
    '{topic} 질문을 끝까지 듣고 천천히 말한다.',
    '{topic} 잠깐 손을 멈췄다가 다시 대답한다.',
    '{topic} 특별한 긴장 없이 이야기를 이어 간다.',
  ],
  procedural: [
    '{topic} 짧게 숨을 고르고 대답한다.',
    '{topic} 하던 말을 끊고 이쪽을 본다.',
    '{topic} 필요한 만큼만 말한다.',
    '{topic} 손에 든 것을 내려놓고 대답한다.',
    '{topic} 날짜를 한 번 짚고 대답한다.',
    '{topic} 기억이 아니라 기록을 더듬는 표정이다.',
    '{topic} 먼저 시간부터 확인한다.',
    '{topic} 질문의 항목을 하나씩 나눠 듣는다.',
    '{topic} 정확한 순서를 생각하며 대답한다.',
    '{topic} 업무 기록을 떠올리는 표정이다.',
    '{topic} 숫자를 확인하듯 잠시 생각한다.',
    '{topic} 자신이 맡은 범위부터 설명한다.',
    '{topic} 사실과 추정을 나누려는 듯 말한다.',
    '{topic} 질문의 핵심을 짚고 대답한다.',
    '{topic} 기억나는 시간을 먼저 말한다.',
    '{topic} 기록에 없는 부분은 잠시 말을 멈춘다.',
    '{topic} 손가락으로 책상 위를 가볍게 짚으며 순서를 잡는다.',
    '{topic} 절차를 설명하듯 차례대로 말한다.',
    '{topic} 날짜와 시간을 맞춰 보며 대답한다.',
    '{topic} 필요한 사실만 골라서 말한다.',
    '{topic} 자신이 확인한 범위를 먼저 밝힌다.',
    '{topic} 업무상 기준을 떠올리고 대답한다.',
    '{topic} 질문을 기록 항목처럼 받아들인다.',
    '{topic} 순서를 놓치지 않으려는 듯 천천히 말한다.',
    '{topic} 확인된 사실부터 말한다.',
    '{topic} 기억과 기록을 구분해서 설명한다.',
    '{topic} 업무 흐름을 따라가며 대답한다.',
    '{topic} 먼저 시간대를 정리한다.',
    '{topic} 수치를 떠올린 뒤 대답한다.',
    '{topic} 질문에 필요한 부분만 골라 답한다.',
  ],
  courteous: [
    '{topic} 기억을 더듬는 표정이다.',
    '{topic} 시선을 내렸다가 다시 든다.',
    '{topic} 고개를 끄덕이고 대답한다.',
    '{topic} 한 박자 두었다가 대답한다.',
    '{topic} 정확히 말하려고 말을 고른다.',
    '{topic} 묻는 쪽을 똑바로 보고 대답한다.',
    '{topic} 잠시 생각을 정리한 뒤 차분히 대답한다.',
    '{topic} 질문의 뜻을 확인하듯 고개를 살짝 끄덕인다.',
    '{topic} 기억나는 부분부터 순서대로 말한다.',
    '{topic} 빠뜨리지 않으려는 듯 말을 천천히 이어 간다.',
    '{topic} 답할 내용을 가늠한 뒤 조심스럽게 입을 연다.',
    '{topic} 한 번 더 생각한 뒤 또박또박 대답한다.',
    '{topic} 자세를 바로 하고 대답한다.',
    '{topic} 묻는 말을 끝까지 듣고 입을 연다.',
    '{topic} 대답하기 전에 짧게 목을 가다듬는다.',
    '{topic} 잊은 것이 없는지 한 번 확인하고 말한다.',
    '{topic} 아는 데까지만 말하려는 듯 조심스럽게 답한다.',
    '{topic} 손을 가지런히 모으고 대답한다.',
    '{topic} 되묻지 않고 곧바로 답한다.',
    '{topic} 틀린 말을 하지 않으려고 한 번 더 생각한다.',
    '{topic} 기억이 맞는지 스스로 확인하며 말한다.',
    '{topic} 차분한 목소리로 그때 일을 말한다.',
    '{topic} 질문에 하나씩 나누어 대답한다.',
    '{topic} 숨을 한 번 고르고 또렷하게 답한다.',
    '{topic} 눈을 맞추고 성실하게 대답한다.',
    '{topic} 서두르지 않고 기억을 되짚는다.',
    '{topic} 말을 아끼지 않고 아는 것을 꺼낸다.',
    '{topic} 잠깐 생각하다가 고개를 끄덕이고 말한다.',
    '{topic} 짐작과 사실을 구분해서 답하려 한다.',
    '{topic} 대답을 마치고도 더 필요한 게 있는지 살핀다.',
  ],
};

// 말투 칸에만 걸리는 좁은 표시. 겁먹은 사람은 대개 말이 짧아서 길이 칸의
// 「짧다」가 먼저 걸리고 과묵형이 됐다 — 「어색한 존댓말. 어른 앞이라 말끝이
// 기어든다」인 고등학생이 「필요한 만큼은 답하겠습니다」로 탐정을 맞았다.
// 길이 칸은 보지 않고 말투 칸만 본다(길이로 넓히면 「차분한 존댓말」인 사람
// 열 명이 같이 넘어온다 — 재어 보고 뺐다). 1,533명 중 두 명이 옮겨 온다.
const NERVOUS_REGISTER = /어색한|수줍|기어들|쭈뼛|주눅/;

// 마스터가 `voice_profile.stance` 로 직접 적었으면 그 값이 이긴다. 없으면
// 말투 산문에서 키워드로 짐작한다 — 1,558명 중 596명(38%)이 아무 표시도
// 안 걸려 courteous 로 떨어지던 자리라, 적어 둔 사건부터 정확해진다.
const STANCES = new Set([
  'forthcoming',
  'courteous',
  'procedural',
  'unruffled',
  'guarded',
  'imperious',
  'skittish',
]);

function voiceKindOf(index: CaseIndex, npc: EngineNpc): string {
  const voice = index.master.npcs[npc.id];
  const stance = (voice?.voiceStance || '').trim();
  if (STANCES.has(stance)) return stance;
  const register = baselineVoice(voice?.voiceFormality || '');
  if (NERVOUS_REGISTER.test(register)) return 'skittish';
  const blob = `${register} ${baselineVoice(
    voice?.voiceSentenceLength || '',
  )}`;
  return (
    FIRST_WORD_TYPES.find(([, pattern]) => matchesVoice(blob, pattern))?.[0] ||
    'courteous'
  );
}

function firstWordFor(
  index: CaseIndex,
  npc: EngineNpc,
  seed: number,
  recent: string[],
): string | null {
  const pool = FIRST_WORD[voiceKindOf(index, npc)] || FIRST_WORD.courteous;
  return chooseBalanced(pool, (line) => line, recent, seed) || pool[0];
}

// 말버릇을 **말하게** 한다.
//
// 1,200개 중 1,069개가 「'장부상으로는'을 앞세운다」처럼 따옴표로 문구를
// 지정하는데, 그 문구를 서술로 옮겨 적으면 아무리 프레임을 고쳐도 결국
// 「그 사람이 뭐라고 말하는지를 화면이 대신 설명하는 것」이다. 말버릇은
// 들려야 말버릇이다(2026-09-21 사용자 결정).
//
// 다만 **혼자 설 수 있는 문장일 때만** 그렇게 한다. 1,069개 중 502개가
// 「그건 원래 그렇게 돼 있어요」처럼 종결어미로 끝나 그대로 대사가 되고,
// 나머지 567개는 「제 입장에서는」·「규정상」처럼 뒤에 말이 이어져야 하는
// 조각이다. 조각을 따옴표에 넣어 혼자 띄우면 문장이 깨지고, 뒤따르는
// 본문에 붙이면(본문은 NPC_REENGAGE 다섯 줄이거나 마스터의 3인칭 서술이다)
// 앞뒤가 안 맞는 말이 된다. 그런 것은 verbalTicLine 의 습관 서술로 남는다.
function verbalTicQuote(index: CaseIndex, npc: EngineNpc): string | null {
  const tic = (index.master.npcs[npc.id]?.voiceTic || '').trim();
  if (!tic) return null;
  const quoted = tic
    .match(/['‘“"「『]([^'’”"」』]{1,60})['’”"」』]/)?.[1]
    ?.trim();
  if (!quoted) return null;
  // 종결어미나 말줄임·물음표로 끝나는 것만. 쉼표로 끝나는 것(「선생님은요,」)은
  // 이어질 말을 기다리는 꼴이라 뺀다.
  if (!/(요|습니다|입니다|다|까|죠|네|군요|는데요|거든요|…|\.\.\.|\?|!)$/.test(quoted)) {
    return null;
  }
  // 이미 문장부호로 끝나면 그대로 둔다 — 「아 그게...」에 마침표를 더 붙이면
  // 점이 넷이 되고, check:offline 의 이중 마침표 검사에 걸린다.
  const body = /[.…?!]$/.test(quoted) ? quoted : `${quoted}.`;
  return `"${body}"`;
}

function verbalTicLine(
  index: CaseIndex,
  npc: EngineNpc,
  // 앞 문장이 이미 이름을 세웠으면 주어를 빼야 한다 — 안 그러면
  // "목련우는 다시 몸을 돌린다. 목련우는 곤란할 때…"가 된다.
  withSubjectName = true,
): string | null {
  const tic = (index.master.npcs[npc.id]?.voiceTic || '').trim();
  if (!tic) return null;
  const body = tic.replace(/[.。]\s*$/, '');
  if (!body) return null;
  // 1,378개 중 163개는 서술형이 아니라 명사로 끝난다. 그중 133개는
  // "…말을 시작하는 버릇"/"…붙이는 습관" 꼴이라 받침을 보고 '이/가 있다'만
  // 세워 주면 문장이 되고(괄호로 예를 단 것도 같다), 나머지 서른 개는
  // "…자주 붙임"처럼 명사형 활용이라 무엇을 붙여도 어색해진다. 그런 것은
  // 버릇 줄을 아예 빼고 첫 대면 서술만 내보낸다 — 어색한 한 줄보다 낫다.
  const predicate = /다[)'"”』]?$/.test(body)
    ? body
    : /(버릇|습관)(\s*[('"“][^)]*[)'"”])?$/.test(body)
      ? `${body}${hasBatchim(body) ? '이' : '가'} 있다`
      : null;
  if (!predicate) return null;
  // 버릇을 **지금 한 말**처럼 적으면 거짓말이 된다.
  //
  // 이 줄 바로 뒤에 붙는 본문은 NPC_REENGAGE(엔진이 가진 다섯 줄)이거나
  // suspicion_deepener/how_to_clear(마스터의 3인칭 서술)라, 마스터가 적어
  // 둔 그 문구가 들어 있을 수가 없다. 그런데 1,200명 중 1,133명의
  // verbal_tic 이 「'장부상으로는'을 앞세운다」처럼 **따옴표로 문구를
  // 지정한** 꼴이어서, 화면에는 이렇게 나갔다:
  //
  //   빈서하는 다시 탐정 쪽으로 몸을 돌린다. '장부상으로는'을 앞세운다.
  //   "오래 걸리나요? 정리할 게 남아서요."
  //
  // 앞세운다고 해 놓고 안 앞세운다 — CASE004 실플레이에서 세 인물이 전부
  // 그랬다(육시아·빈서하·궁채원). 고칠 수 있는 쪽은 프레임이다. 이 한
  // 줄은 방금 한 말이 아니라 **그 사람이 말하는 방식**을 적는 자리이므로,
  // 습관을 가리키는 부사를 앞에 세워 그렇게 읽히게 한다. 실제로 그 문구는
  // 마스터의 증거 대사와 pressure_responses 에서 나온다.
  //
  // 명사형(「…붙이는 버릇이 있다」)은 이미 습관을 말하고 있으므로 그대로
  // 둔다 — "말을 꺼낼 때마다 …버릇이 있다"가 되면 같은 말을 두 번 한다.
  // 부사를 붙이는 것은 **문구를 지정한 버릇**에만. 따옴표가 없는 67개는
  // 「대답 전에 찻잔을 한 번 내려놓는다」 같은 동작이라 지금 이 자리에서
  // 그러는 것으로 읽혀도 맞고, 「말을 꺼낼 때마다 대답 전에 …」가 되면
  // 오히려 문장이 겹친다. 명사형(「…붙이는 버릇이 있다」)도 이미 습관을
  // 말하고 있으므로 그대로 둔다.
  const quotesPhrase = /['‘“"「『][^'’”"」』]{1,60}['’”"」』]/.test(body);
  const habitual =
    !quotesPhrase || /(버릇|습관)[이가] 있다$/.test(predicate)
      ? predicate
      : `말을 꺼낼 때마다 ${predicate}`;
  // 마스터가 버릇 문장 안에 이름을 써 둔 경우. 부사는 이름 **뒤**로
  // 들어가야 한다 — 앞에 붙이면 주어가 부사 뒤로 밀린다. 앞 문장이 이미
  // 이름을 세웠으면(withSubjectName=false) 여기서는 이름을 뺀다.
  if (predicate.startsWith(npc.name)) {
    const rest = predicate
      .slice(npc.name.length)
      .replace(/^(?:은|는|이|가)\s*/, '');
    const tail = habitual === predicate ? rest : `말을 꺼낼 때마다 ${rest}`;
    return withSubjectName ? `${withTopic(npc.name)} ${tail}.` : `${tail}.`;
  }
  if (!withSubjectName) return `${habitual}.`;
  return `${withTopic(npc.name)} ${habitual}.`;
}

// 마스터의 거절이 떨어진 뒤로도 계속 미는 자리.
//
// 예전에는 목록 끝에서 1번으로 되돌아갔다 — 네 번째로 들이댔는데 첫 번째와
// 같은 말이 돌아오면, 몰아붙인 것이 아니라 제자리걸음이 된다. 마스터가
// 적어 두는 것은 2~4개뿐이라(1,533명 전부 그 범위다) 카드를 여러 장 가진
// 플레이어는 금방 그 끝에 닿는다.
//
// 그래서 그 뒤는 사다리로 간다. 몰릴수록 **문장이 짧아진다**(2026-09 사용자
// 작성) — 차분한 사람은 무너지기보다 말을 고르고, 대답이 짧아지고, 방어의
// 논리가 먼저 나온다. 말을 많이 할수록 오히려 그 차분함이 무너져 보인다.
//
//   첫 대면   "말씀하세요."
//   제시 뒤   "그건 다른 이야기입니다."
//   더 몰리면 "……그건 설명하겠습니다."
//
// 차분한 갈래(협조·태연·과묵)에만 쓴다. 긴장·방어·권위형은 이 말투가 아니라
// 지금까지처럼 마스터의 것을 되풀이한다. 과묵한 사람은 원래 말이 짧으므로
// 사다리의 세 번째 칸에서 시작한다.
const CALM_PRESSURE: string[][] = [
  // 아주 차분한 반응.
  [
    '그건 제가 설명드릴 수 있습니다.',
    '그 사실만으로 보시기엔 조금 부족하지 않을까요?',
    '그렇게 볼 수도 있겠네요.',
    '그 부분은 제가 기억하는 것과 다릅니다.',
    '그 기록이 그렇게 남아 있는 건 맞습니다.',
    '잠시만요. 그건 순서를 따져봐야 합니다.',
    '그건 다른 이야기입니다.',
    '제가 말씀드린 내용과 모순되지는 않습니다.',
  ],

  // 살짝 몰리기 시작한 느낌.
  [
    '그건... 제가 설명하겠습니다.',
    '잠시만 생각해 보겠습니다.',
    '그 부분은 제가 정확히 기억하지 못합니다.',
    '그렇게까지 단정하실 필요는 없습니다.',
    '그 기록이 전부를 말해 주는 건 아닙니다.',
    '제가 그렇게 말했다고 해서 그게 사실이라는 뜻은 아니죠.',
    '그건 제가 말씀드린 것과 조금 다릅니다.',
    '그렇게 연결되는 건 아닌 것 같습니다만.',
  ],

  // 차분함을 유지하려고 애쓰는 느낌.
  [
    '차근차근 말씀드리겠습니다.',
    '숨길 일이었다면 이런 식으로 남겨두진 않았겠죠.',
    '한 가지씩 말씀하시죠.',
    '그 부분은 다시 확인해 보겠습니다.',
    '지금은 판단하기 이릅니다.',
    '저도 확인할 시간이 필요합니다.',
  ],

  // 짧게 한 번 끊는다. 여기가 제일 무겁다.
  [
    '……그건 설명하겠습니다.',
    '그건, 조금 다릅니다.',
    '잠시만요.',
    '그것만으로 판단하시기엔 조금 이릅니다.',
  ],
];

// 압박을 받았을 때 어디로 가는가 — 갈래마다 다르다.
//
// 앞서 넣은 CALM_PRESSURE 는 "차분한 사람이 점점 짧아진다" 한 줄기뿐이었다.
// 그러면 태연한 사람도 과묵한 사람도 결국 같은 곳으로 간다. 실제로는
// **높아지고 낮아지는 것이 아니라 받는 방식이 갈린다**(2026-09 사용자 설계):
// 과묵한 사람은 화내는 대신 말을 없애고, 권위형은 눌리는 대신 대화의
// 주도권을 가져온다.
//
// 갈래마다 주력 둘과 극점 하나를 둔다. 주력 중 어느 쪽을 먼저 쓰는지는
// 인물마다 고정된 해시로 갈린다 — 같은 태연형이라도 A는 여유로 받고
// B는 해명으로 나가야 면담 맛이 달라진다.
//
// 극점은 대개 **다른 갈래로 넘어간다.** 태연·과묵이 무너지면 긴장이고,
// 방어가 무너지면 권위다(사용자 표). 그래서 그 자리는 새 풀이 아니라 그
// 갈래의 주력을 그대로 쓴다 — 무너진다는 것이 곧 다른 사람이 된다는 뜻이다.
//
// **이 게임은 경찰 심문물이 아니다**(2026-09 사용자 결정). 탐정이 정중하게
// 묻고, 인물이 자기 입장에서 답하고, 찔리는 데를 밟히면 말투가 변하는 것이
// 기본 정서다. 그래서 "심문받을 이유가 있습니까" · "그런 식으로 몰아붙이지
// 마십시오" · "더 듣고 싶지 않습니다" 처럼 **취조실에서나 나올 말은 쓰지
// 않는다.** 증거 제시도 인물 쪽에서는 "탐정이 뭔가를 보여주며 다시 묻는 것"
// 정도로 느껴져야 하므로, 방어형조차 반격하는 대신 선을 긋는 쪽으로 쓴다.
type PressureBranch = string[];

const PRESSURE_BRANCH: Record<string, PressureBranch> = {
  // 태연 — 여유가 기본값. 들켜도 당황하지 않고 그 자리에서 받는다.
  여유: [
    '"아, 그 부분을 보셨군요."',
    '"그렇게 생각하실 만하네요."',
    '"네, 그건 맞습니다."',
    '"그 질문은 예상했습니다."',
  ],
  해명: [
    '"그건 제가 설명드릴 수 있습니다."',
    '"천천히 말씀드리죠."',
    '"그 기록이 그렇게 남은 건 맞습니다. 다만 그게 전부는 아닙니다."',
    '"순서대로 말씀드리는 게 낫겠네요."',
  ],
  // 과묵 — 말을 아끼는 것이 기본값. 화내는 대신 말을 없애는 쪽으로 간다.
  단답: ['"네."', '"그렇습니다."', '"그 정도입니다."', '"맞습니다."'],
  함구: [
    '"모릅니다."',
    '"잘 기억나지 않습니다."',
    '"거기까지는 모릅니다."',
    '"……드릴 말씀이 없습니다."',
  ],
  // 방어 — 경계가 기본값. 되받아치는 게 아니라 조용히 선을 긋는다.
  선긋기: [
    '"제가 아는 건 그 정도입니다."',
    '"제가 한 일과는 관계가 없습니다."',
    '"그렇게 연결되는 건 아닌 것 같습니다."',
  ],
  되짚기: [
    '"그건 조금 다르게 보셔야 할 것 같습니다."',
    '"그 부분은 제가 설명할 수 있습니다."',
    '"그 기록만으로 그렇게 보시면 조금 곤란합니다."',
  ],
  // 긴장 — 불안이 기본값. 말의 통제가 먼저 흔들린다.
  더듬기: [
    '"그건… 잠시만요."',
    '"아니, 그러니까…"',
    '"제가 정확히 기억하는 건…"',
  ],
  미루기: [
    '"그건... 조금 생각해 봐야겠습니다."',
    '"그 부분은 잘 모르겠습니다."',
    '"조금만 시간을 주시겠습니까."',
  ],
  말막힘: ['"……"', '"……말이 잘 안 나오네요."', '"……죄송합니다. 잠깐만요."'],
  // 권위 — 통제가 기본값. 눌리는 대신 대화의 주도권을 슬쩍 가져온다.
  주도권: [
    '"그 부분은 제가 판단할 일입니다."',
    '"제 입장도 한번 들어보시죠."',
    '"그 문제는 제가 더 잘 알고 있습니다."',
  ],
  바로잡기: [
    '"그렇게까지 단정하실 필요는 없습니다."',
    '"그건 조금 과한 해석 같습니다."',
    '"순서가 잘못됐습니다. 처음부터 말씀드리죠."',
  ],
  끊기: ['"그 이야기는 여기까지 하시죠."', '"더 드릴 말씀은 없습니다."'],
};

// 갈래별 [주력, 주력, 극점]. 극점이 다른 갈래의 주력을 가리키는 것이
// 사용자 표 그대로다.
const PRESSURE_TREE: Record<string, [string, string, string]> = {
  unruffled: ['여유', '해명', '더듬기'],
  procedural: ['단답', '함구', '더듬기'],
  guarded: ['선긋기', '되짚기', '주도권'],
  skittish: ['더듬기', '미루기', '말막힘'],
  imperious: ['주도권', '바로잡기', '끊기'],
};

// PRESSURE_TREE 에 자리가 없는 갈래. CALM_PRESSURE 사다리를 쓴다.
// courteous 는 표시가 없는 사람이 떨어지는 자리이기도 하고, forthcoming 은
// 몰렸을 때 특유의 무너지는 모양이 따로 없다 — 먼저 말하던 사람이 말을
// 아끼기 시작하는 것 자체가 변화라 공용 사다리로 충분하다.
const CALM_KINDS = new Set(['courteous', 'forthcoming']);

function pressureLine(
  index: CaseIndex,
  selectedCase: EngineCase,
  state: EngineState,
  npc: EngineNpc,
  seed: number,
  recent: string[],
): string | null {
  const list = (index.master.npcs[npc.id]?.pressureResponses || [])
    .map((item) => item.trim())
    .filter(Boolean);

  // 마스터는 이것을 "같은 자리를 다시 밀었을 때의 순서"로 적어 둔다.
  // 그래서 무작위가 아니라 이 사람에게 몇 번째로 들이댔는지로 고른다 —
  // 두 번째 거절이 첫 번째보다 무거워지는 것이 그 순서의 뜻이다.
  // 지금 내려놓는 카드까지 세어야 한다. state 는 이 턴이 끝나야 갱신되므로
  // 그냥 세면 첫 번째와 두 번째가 같은 말을 받는다.
  const step =
    state.presented_evidence.filter((item) => item.target_id === npc.id)
      .length + 1;

  let raw = '';
  if (step <= list.length) {
    raw = list[step - 1];
  } else if (PRESSURE_TREE[voiceKindOf(index, npc)]) {
    // 마스터의 것이 떨어진 뒤로는 이 사람의 갈래를 타고 간다.
    const [first, second, breaking] = PRESSURE_TREE[voiceKindOf(index, npc)];
    // 주력 둘 중 어느 쪽을 먼저 쓰는지는 인물마다 고정이다 — 같은 태연형이라도
    // 한 사람은 농담으로 버티고 다른 사람은 냉소로 나가야 면담이 달라진다.
    const leansSecond =
      hashOf(`${selectedCase.case_id}|${npc.id}|lean`) % 2 === 1;
    const path = leansSecond
      ? [second, first, breaking]
      : [first, second, breaking];
    const rung = Math.min(step - list.length - 1, path.length - 1);
    const pool = PRESSURE_BRANCH[path[rung]] || [];
    if (pool.length) {
      raw = chooseBalanced(pool, (line) => line, recent, seed) || pool[0];
    }
  } else if (CALM_KINDS.has(voiceKindOf(index, npc))) {
    // 협조형(표시가 없는 사람들, 39퍼센트)은 갈래가 없다. 차분한 사람이
    // 점점 짧아지는 그 사다리를 그대로 쓴다.
    const rung = Math.min(step - list.length - 1, CALM_PRESSURE.length - 1);
    const pool = CALM_PRESSURE[rung];
    raw = chooseBalanced(pool, (line) => line, recent, seed) || pool[0];
  }
  if (!raw && list.length) {
    raw = list[(step - 1) % list.length];
  }
  raw = raw.replace(PRESSURE_CONDITION_CLAUSE, '').trim();
  if (!raw) return null;

  const narration =
    !WHOLE_QUOTE.test(raw) &&
    (QUOTE_MARK.test(raw) ||
      (NARRATION_END.test(raw) && !FORMAL_SPEECH_END.test(raw)));

  if (!narration) {
    // 통째 따옴표였으면 껍데기를 벗겨서 다시 씌운다 — 안 그러면 따옴표가
    // 두 겹이 된다.
    const said = raw
      .replace(/^["“]\s*/, '')
      .replace(/\s*["”]$/, '')
      .trim();
    const lead = pick(PRESSURE_ACTION, seed, recent, (template) =>
      fill(template, { name: npc.name }),
    );
    return `${lead} "${said}"`;
  }
  // 지문. 이미 이름으로 시작하면 그대로 두고, 아니면 주어를 세워 준다.
  const body = /[.。"”]$/.test(raw) ? raw : `${raw}.`;
  if (body.startsWith(npc.name)) return body;
  return `${withTopic(npc.name)} ${body}`;
}

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
    // 제시 턴에서는 이번에 내려놓은 것이 그 레드헤링과 상관이 있어야 한다 —
    // 엉뚱한 카드를 냈는데 딴 데서 의심이 풀리면 무엇이 풀었는지 알 수 없다.
    // 다시 만나는 자리에는 그 문턱이 없다. 예전에는 how_to_clear 가 증거를
    // 하나라도 부르면 이 자리를 아예 건너뛰었는데, 그 증거가 본인에게서
    // 나온 카드면 「제시」라는 행동 자체가 성립하지 않아 영영 안 풀렸다.
    // 조건이 찼는지는 herringRequirementsMet 이 판정한다.
    if (evidenceIds && !need.evidence.some((id) => evidenceIds.includes(id))) {
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

// surface_suspicion 은 화면에 내보내지 않는다. 한 번 내보내 봤고 실플레이에서
// 바로 걸렸다(CASE060 강시온).
//
//   - 첫 면담 끝에 붙이면 그 한 턴에 그 사람 이야기가 끝난다. 3인칭 서술이
//     면담 대사 자리에 앉는 것도 어색하고, 무엇보다 잠긴 정보를 앞지른다.
//     강시온의 F-CH01-02("도원영으로부터 부품 로트번호 불일치 의혹을 들었다")는
//     E01 을 제시해야 열리는데, R01 의 surface_suspicion 이 "부품 위조 의혹을
//     미리 듣고도 무마하려 한 정황"이라고 첫 대면에서 말해 버렸다.
//   - 재면담으로 미뤄도 같다. E01 없이 두 번 말만 걸면 나온다.
//   - hidden_until 이 전부 풀린 뒤로 더 미루면 누설은 막히지만, 그때는 이미
//     플레이어가 그 사람을 파고든 뒤라 의심을 세우는 역할을 못 한다.
//
// 애초에 이 값은 모델에게 "이 사람을 이렇게 연기하라"고 주는 지시문이지
// 읽어 줄 문장이 아니다(프롬프트 규칙도 play ... straight 라고 쓴다).
// 레드헤링의 나머지 두 박자는 남는다 — suspicion_deepener 는 가리키는 정황을
// 탐정이 실제로 본 뒤에만 나오고(referencedFactsReached), actual_reason 은
// how_to_clear 의 조건을 채워야 나온다. 둘 다 벌어서 얻는 자리다.

// 이 사람이 아직 잠가 둔 것이 남아 있는가. hidden_until 은 "무엇을 해야
// 이 사람이 이걸 말한다"를 적어 둔 자리인데, 레드헤링 문장이 그 내용을 먼저
// 말해 버리면 잠금이 무의미해진다. CASE060 강시온의 R01 deepener 가 그랬다 —
// "도원영의 제보를 듣고도 아무 조치를 취하지 않았다"는 E01 을 제시해야 열리는
// F-CH01-02 그 자체인데, 문장에 id 가 안 적혀 있어서 referencedFactsReached
// 가 빈 배열을 통과시켰고 그냥 두 번 말을 걸면 나왔다.
//
// 글자 겹침으로 판정하는 대신 순서로 막는다: 이 사람에게 아직 못 들은
// hidden_until 항목이 하나라도 있으면 레드헤링 박자를 열지 않는다.
function hasUnheardGatedKnowledge(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
): boolean {
  const knowledge = index.master.npcs[npcId];
  if (!knowledge) return false;
  return knowledge.hiddenUntil.some(
    (gate) =>
      gate.factOrClaimId &&
      !state.heard_statements.includes(gate.factOrClaimId),
  );
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
  if (hasUnheardGatedKnowledge(index, state, npcId)) return null;
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
): string[] {
  const current = state.npc_statement_stage[npcId] || 'initial';
  const stage = index.master.contradictionStages.find(
    (item) =>
      item.targetCharacter === npcId &&
      item.fromStage === current &&
      !done(state, `stage|${item.id}`),
  );
  if (!stage) return [];
  if (
    !stage.requiresPresentedEvidenceIds.some((id) => evidenceIds.includes(id))
  ) {
    return [];
  }
  if (
    !stage.requiresHeardClaimIds.every((id) =>
      state.heard_statements.includes(id),
    )
  ) {
    return [];
  }
  const presented = new Set(
    state.presented_evidence
      .filter((item) => item.target_id === npcId)
      .map((item) => item.evidence_id),
  );
  for (const id of evidenceIds) presented.add(id);
  return stage.requiresPresentedEvidenceIds.filter((id) => !presented.has(id));
}

// 카드가 이 사람의 어떤 단계에는 맞는데 그 단계가 열리지 않는 이유.
// 'unheard' — 지금 단계인데 requires_heard_claim_ids 를 아직 못 들었다.
// 'order'   — 카드가 부르는 단계가 사슬의 뒤쪽이라 앞 단계부터 깨야 한다.
// 둘 다 아니면 null(카드가 이 사람 단계와 무관하다). 2막에서만 부른다.
function stageBlockReason(
  index: CaseIndex,
  state: EngineState,
  npcId: string,
  evidenceIds: string[],
): 'unheard' | 'order' | null {
  const current = state.npc_statement_stage[npcId] || 'initial';
  let order = false;
  for (const stage of index.master.contradictionStages) {
    if (stage.targetCharacter !== npcId) continue;
    if (done(state, `stage|${stage.id}`)) continue;
    if (!stage.requiresPresentedEvidenceIds.some((id) => evidenceIds.includes(id))) {
      continue;
    }
    if (stage.fromStage && stage.fromStage !== current) {
      order = true;
      continue;
    }
    if (
      !stage.requiresHeardClaimIds.every((id) =>
        state.heard_statements.includes(id),
      )
    ) {
      return 'unheard';
    }
  }
  return order ? 'order' : null;
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
  // 헛수고 자리는 더 세지 않는다. 예전에는 그것이 남아 있으면 "여긴 다
  // 봤다"를 미뤘다 — 목록에 버튼이 남아 있는데 다 봤다고 하면 남은 것이
  // 전부 헛것이라고 알려 주는 셈이었기 때문이다. 이제 헛것만 남으면
  // 버튼 자체를 안 내놓으므로(capChoices) 알려 줄 것이 없다. 미루면
  // 오히려 플레이어가 헛것을 하나씩 다 눌러 봐야 이 줄이 나온다.
  const arrived = here !== state.current_location;
  const foundLastHere = detailsHere.some((rule) =>
    gm.acquire.includes(rule.evidenceId),
  );
  if (!arrived && !foundLastHere) return undefined;

  return detailsHere.length ? 'done' : 'none';
}

// 지금 이 방에 서 있는 사람들을 한 줄로. 아무도 없으면 아무 말도 하지
// 않는다 — 빈 방은 빈 방이라고 매번 선언할 일이 아니다.
// 이 방의 물증을 다 찾았는가. 재방문 서술을 줄여도 되는지의 기준이다.
function locationExhausted(
  index: CaseIndex,
  state: EngineState,
  locationId: string,
): boolean {
  const details = locationRules(index, locationId).detail.filter(
    (rule) => rule.evidenceId,
  );
  return details.every((rule) =>
    state.acquired_information.includes(rule.evidenceId),
  );
}

function peopleHereLine(
  index: CaseIndex,
  state: EngineState,
  locationId: string,
  // 도착 서술이 이미 그 사람을 그려 놓았으면(「곽태섭이 장갑을 한 짝만 낀 채
  // 채밀기 손잡이를 닦고 있다」) 바로 밑에 「이곳에는 곽태섭이 있다」를 또
  // 쓰지 않는다. 서술에 없는 사람만 이 줄이 맡는다.
  description = '',
): string | null {
  const here = index.npcById
    ? [...index.npcById.values()].filter(
        (npc) =>
          npcLocationNow(index, state, npc.id) === locationId &&
          !(description && description.includes(npc.name)),
      )
    : [];
  if (!here.length) return null;
  // 이름만 적는다. 직함은 수첩의 인물 탭이 들고 있고, 여기에 괄호로
  // 붙이면 조사가 괄호 뒤에 와서 ("연도희(야간 순찰대원)가") 읽기 나쁘다.
  const names = here.map((npc) => npc.name);
  const last = names[names.length - 1];
  const head = names.slice(0, -1).join(', ');

  return head
    ? `${head}, ${withSubject(last)} 아직 그 자리에 있다.`
    : `${withSubject(last)} 아직 그 자리에 있다.`;
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
  // 사건당 한 번뿐인 긴 주고받기는 씨에 사건 id 를 섞는다. 그 자리들은 어느
  // 사건에서나 비슷한 대목에서 터지므로(첫 발견·첫 돌파) full_dialogue_log
  // 길이와 행동 id 가 사건을 건너뛰며 겹치고, 그러면 연달아 여러 사건이 같은
  // 여덟 줄로 시작한다. BANTER_FIRST_CARD 에서 한 번 겪은 것과 같은 병이다 —
  // 그때는 probe|L01|0 이 94회 중 62회를 한 쌍에 몰아줬다.
  const caseSeed = seed + hashOf(`${selectedCase.case_id}|exchange`);
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
    // 관계 문이 먼저 닫힌 뒤에 `opens` 가 들린 경우의 뒷문 — 지목이 그 진술이
    // 나온 턴 말끝에 붙는다. 없으면 관계를 먼저 물은 사람은 그 지목을 영영
    // 못 듣는다(판본 55개 중 2개가 첫 면담 밖의 진술을 `opens` 로 건다).
    const who =
      result.gm.scene?.interview_character_id ?? state.current_interview;
    const late = who ? index.master.npcs[who]?.pointsFinger : null;
    if (
      who &&
      late &&
      late.opens &&
      !done(state, `finger|${who}`) &&
      !result.completedActions.includes(`finger|${who}`) &&
      done(state, `rel|${who}|${late.at}`) &&
      result.heardStatementIds.includes(late.opens)
    ) {
      result.gm.message = joinParagraphs([
        result.gm.message,
        asQuote(late.says),
      ]);
      if (!result.gm.jiwoo_line) {
        result.gm.jiwoo_line = fingerJiwooLine(
          index,
          state,
          who,
          late,
          seed,
          recent,
        );
      }
      result.jiwooEssential = true;
      result.completedActions.push(`finger|${who}`);
    }
    result.gm.message = stripMasterIds(result.gm.message);
    if (result.gm.jiwoo_line) {
      result.gm.jiwoo_line = stripMasterIds(result.gm.jiwoo_line);
    }
    const cleared = locationClearedFor(index, state, result.gm);
    if (cleared) result.locationCleared = cleared;
    // 전환점의 주고받기가 실린 턴에는 혼잣말을 얹지 않는다. 두 사람이
    // 이미 서로에게 말하고 있는데 그 앞에 탐정이 혼자 한 마디를 더 하면
    // 대화가 어디서 시작하는지가 흐려진다.
    if (!result.gm.detective_line && !result.gm.exchange.length) {
      const insight = detectiveInsight(result, seed, recent);
      if (insight) {
        result.gm.detective_line = insight;
        result.gm.detective_line_position = 'after';
      }
    }

    return result;
  };

  if (kind === 'move') {
    const place = index.locationById.get(first);
    if (!place) return null;
    gm.scene = { location_id: place.id, interview_character_id: null };
    // 다시 들어온 방. 도착 서술을 매번 통째로 다시 찍었다 — CASE001
    // 실플레이에서 과수원 경계길 문단이 네 번, CASE004 전기실이 세 번
    // 글자까지 같게 나왔다. 뒤질 것이 남아 있으면 그 문장 안의 밑줄
    // 표식이 아직 쓸모가 있으니 그대로 두고, 다 뒤진 방이면 한 줄로 줄인다.
    const revisit = done(state, `visited|${place.id}`);
    const exhausted = revisit && locationExhausted(index, state, place.id);
    turn.completedActions.push(`visited|${place.id}`);
    gm.message = joinParagraphs([
      exhausted
        ? `${withDirection(place.name)} 돌아온다.`
        : `${withDirection(place.name)} 자리를 옮긴다.`,
      exhausted ? null : place.description,
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
      peopleHereLine(index, state, place.id, exhausted ? '' : place.description),
    ]);
    // 방마다 한마디씩 얹으면 방을 오갈수록 소음이 된다. 처음 들어갈 때만.
    // 몇 번째로 들어간 방인지로 줄을 고른다 — 턴 씨앗으로 고르면 열아홉 턴
    // 뒤에 같은 줄이 다른 방에 또 붙었다(CASE013 실측). 방 수가 풀보다 작으니
    // 이렇게 하면 한 사건 안에서는 안 겹친다.
    const visitedRooms = new Set(
      state.completed_actions
        .filter((item) => item.startsWith('visited|'))
        .map((item) => item.slice('visited|'.length)),
    ).size;
    gm.jiwoo_line = revisit
      ? null
      : JIWOO_ARRIVAL[(visitedRooms + Math.abs(caseSeed)) % JIWOO_ARRIVAL.length];
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
    // 주운 자리에서도 선을 긋는다 — 다만 마스터가 이 카드에 두 사람의 말을
    // 직접 써 뒀으면(`reaction`) 비켜선다. 거기는 손으로 쓴 두 줄이 그 턴의
    // 전부인 자리고, 2,604장 중 61장뿐이다. 나머지 2,543장은 공용 풀로
    // 떨어지는데 풀은 무엇을 찾았든 물건을 입에 올릴 수 없으므로, 그 자리에
    // 이 카드의 이름과 한계를 말하는 문장이 하나 서는 편이 낫다.
    //
    // 이 사건의 첫 카드도 비켜선다. 거기는 BANTER_FIRST_CARD 가 「첫 장에
    // 기대지 마라」를 말하도록 짝지어 쓰인 자리라, 같은 뜻의 문장이 바로
    // 앞에 서면 한 턴에 같은 말을 두 번 하게 된다.
    const boundary =
      card && !card.reaction && state.acquired_information.length > 0
        ? notProvenLine([card], state, seed, recent)
        : null;
    gm.message = joinParagraphs([
      pick(LEAD_INSPECT, seed, recent),
      rule.result,
      boundary?.text || null,
    ]);
    if (boundary) turn.completedActions.push(`notproven|${boundary.cardId}`);
    turn.completedActions.push(actionId);
    if (card) {
      gm.acquire.push(card.id);
      // 무언가 나온 턴은 이 게임에서 두 사람이 가장 사람처럼 구는 자리다.
      // 각자 한 마디씩 던지고 끝내는 대신 한 번씩 주고받는다.
      // 이 사건에서 처음 손에 들어온 것은 한 번뿐인 순간이라 탐정이 한 마디
      // 더 붙인다. 한지우가 먼저 반기고 탐정이 받은 다음, 물을 끼얹는 말이
      // 따라온다.
      //
      // 이 한 마디를 어디에 두느냐로 두 번 틀렸다. 처음에는 **짝의 탐정 줄
      // 자리에** 넣었더니 한지우가 던진 말에 아무도 대답하지 않았다:
      //
      //   한지우  "이런 날 커피값은 탐정님이 내는 겁니다."
      //   탐정    "하나 나왔다고 그림이 보이는 건 아니야. 보통은 반대지."
      //
      // 그래서 짝을 온전히 두고 뒤에 **덧붙였더니** 탐정이 연달아 말하면서
      // 대화 두 덩어리가 겹쳐 보였다(2026-09 실플레이 신고):
      //
      //   한지우  "찾으셨네요. 축하는 이따 하고요."
      //   탐정    "이따가 언제."
      //   탐정    "하나 나왔다고 그림이 보이는 건 아니야. 보통은 반대지."
      //
      // 둘 다 한 턴에 대화가 둘이라는 같은 병이다. 그래서 이 말을 아예 짝의
      // 되받는 줄로 **쓰도록 다시 쓴 풀**(BANTER_FIRST_CARD)을 따로 뒀다.
      // 한지우의 던지는 줄이 그 대답을 받도록 같이 쓰여 있으므로, 첫 카드도
      // 다른 카드와 똑같이 두 줄로 끝난다.
      // 마스터가 이 카드에 직접 써 둔 짝이 있으면 그것이 이긴다. 첫 카드의
      // 전용 풀도, 사건당 한 번인 긴 주고받기도 비켜선다 — 한 턴에 대화가
      // 둘이 되는 것이 이 자리에서 두 번 겪은 병이고(위 주석), 손으로 쓴
      // 것을 밀어내면서까지 풀을 먼저 낼 이유가 없다.
      // 손으로 쓴 짝은 언제나 한지우가 던지고 탐정이 받는다(lead: 'jiwoo').
      // 그래서 탐정의 줄이 'reply' 자리에 서고 한지우 뒤에 붙는다 — 두 줄의
      // 순서가 곧 내용이라 작성자가 고를 것이 아니라 정해 두는 쪽이 맞다.
      const written: BanterPair | null = card.reaction
        ? {
            lead: 'jiwoo',
            jiwoo: asQuote(card.reaction.jiwoo) || card.reaction.jiwoo,
            detective:
              asQuote(card.reaction.detective) || card.reaction.detective,
          }
        : null;
      const firstEver = state.acquired_information.length === 0;
      // 긴 주고받기는 사건당 한 번(EXCHANGE_ONCE_PER_CASE)이고 첫 카드는
      // 건너뛴다 — 그 자리는 BANTER_FIRST_CARD 가 「첫 장에 기대지 마라」를
      // 말하도록 짝지어 쓰인 자리라, 긴 것이 가로채면 사건마다 한 번뿐인
      // 그 말이 사라진다.
      if (
        written ||
        firstEver ||
        !applyExchange(turn, state, 'discovery', caseSeed, recent)
      ) {
        const banter =
          written ||
          (firstEver
            ? pickFirstCardBanter(selectedCase.case_id, seed, recent)
            : pickBanter(seed, recent, null));
        gm.jiwoo_line = banter.jiwoo;
        gm.detective_line = banter.detective;
        // 두 줄짜리는 gm.exchange 로 옮기지 않는다. 탐정이 여는 짝은
        // 서술보다 **앞에** 서야 한다("거봐." 하고 나서 무엇을 봤는지가
        // 나온다) — exchange 는 언제나 서술 뒤에 붙으므로 그 박자가 죽는다.
        gm.detective_line_position =
          banter.lead === 'jiwoo' ? 'reply' : 'before';
      }
    } else {
      gm.jiwoo_line = pick(JIWOO_NOTHING, seed, recent);
    }
    return finish(turn);
  }

  // 「한지우가 데려온다」는 도착만 알리고 끝나서, 데려온 사람에게 말을
  // 붙이려면 인물 카드를 한 번 더 눌러야 했다(2026-09 사용자 지적). 부르는
  // 이유가 이야기하려는 것이므로 도착 서술 뒤에 면담이 그대로 이어진다 —
  // 아래 talk 가지의 몸통을 그대로 쓰고, 이 서술이 그 앞에 붙는다. 데려올 수
  // 있는 사람은 이미 만난 사람뿐이라 여기서 첫 대면이 열리는 일은 없다.
  const summonIntro: string[] = [];
  if (kind === 'summon') {
    const npc = index.npcById.get(first);
    if (!npc) return null;
    const place = index.locationById.get(state.current_location);
    const previous = summonedNow(state.completed_actions);
    const sentBack =
      previous && previous.npcId !== npc.id
        ? index.npcById.get(previous.npcId)
        : null;
    summonIntro.push(
      pick(LEAD_SUMMON, seed, recent, (template) =>
        fill(template, { name: npc.name, place: place?.name || '이곳' }),
      ),
    );
    if (sentBack) {
      summonIntro.push(
        `${withTopic(sentBack.name)} 한지우와 눈인사만 하고 제자리로 돌아간다.`,
      );
    }
    gm.detective_line = pick(DETECTIVE_SUMMON, seed, recent, (template) =>
      fill(template, { name: npc.name }),
    );
    gm.detective_line_position = 'before';
    // 데려오는 동안의 말이라 서술보다 앞에 선다. 아래 몸통은 이 턴에
    // 한지우의 줄을 다시 쓰지 않는다 — 한 턴에 그의 말이 둘이 되면 대화가
    // 둘로 갈린다.
    gm.jiwoo_line = pick(JIWOO_SUMMON, seed, recent, (template) =>
      fill(template, { name: npc.name }),
    );
    gm.jiwoo_line_position = 'before';
    turn.completedActions.push(
      summonMarker(
        npc.id,
        state.current_location,
        state.full_dialogue_log.length,
      ),
    );
  }

  if (kind === 'talk' || kind === 'summon') {
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
      const eligible = knowledge.initialClaims.filter((claim) =>
        range.includes(claim.claimId),
      );
      // 묻기 전에 알리바이부터 대는 사람이 1,558명 중 **742명(47.6%)**이고,
      // 그중 195명이 진범이다 — 캐물어 끄집어내야 할 거짓말이 인사 다음 줄에
      // 저절로 나왔다. (옛 ALIBI_HINT 로는 349명/84명이었다. 시각 표지가 없는
      // 「그날 아침엔 계속 작업실에서 …하고 있었어요」 꼴을 스무 자 창이
      // 놓치고 있었다 — 2026-09에 창을 32자로 넓히고 행적 동사를 더했다.) 그 말은 「그날 밤 어디 있었는지 묻는다」가 받아야
      // 한다(alibiClaimFor 가 같은 진술을 그대로 내준다). 다만 할 말이 그것
      // 뿐인 사람은 첫 대면이 인사만 남으므로, 다른 말이 하나도 없을 때만
      // 알리바이를 쓴다.
      // **내줄 수 없는 것은 밀지 않는다.** 알리바이꼴을 뒤로 미는 것은
      // 「사건 당시 어디에 있었는지 묻는다」가 그 줄을 그대로 내주기
      // 때문인데, `alibiClaimFor` 는 `hidden_until` 에 걸린 진술을 건너뛴다.
      // 그래서 **잠긴 알리바이 진술**은 첫 면담에서 빼는 순간 두 경로 사이로
      // 떨어져 영영 안 나온다 — CASE274·276 이 그랬다(진범의 `S-CH01-01` 이
      // 잠겨 있는데 첫 모순 단계가 그 주장을 들었을 것을 전제한다. 밀어
      // 두자 단계가 0/3 이 됐다). 잠긴 것은 예전처럼 첫 면담이 말한다.
      const servedLater = new Set(
        knowledge.hiddenUntil.map((gate) => gate.factOrClaimId),
      );
      const plain = eligible.filter(
        (claim) =>
          (servedLater.has(claim.claimId) ||
            !ALIBI_HINT.test(claim.content || '')) &&
          !ECHO_HINT.test(claim.content || ''),
      );
      const spoken = (plain.length ? plain : eligible).slice(
        0,
        FIRST_MEETING_CLAIMS,
      );
      const said = spoken.map((claim) => asQuote(claim.content));
      const kind = voiceKindOf(index, npc);
      // 상대의 그 첫마디를 탐정이 받는다. 풀에서 뽑은 줄을 그대로 들고
      // 내려가야 하므로 여기서 한 번만 고른다.
      const firstWord = firstWordFor(index, npc, seed, recent) || '';
      gm.message = joinParagraphs([
        ...summonIntro,
        // 소개 한 줄. 누구를 만났는지가 맨 위에 혼자 서야 눈에 걸린다.
        `${npc.name}, ${withPeriod(npc.role)}`,
        pick(LEAD_FIRST_MEETING, seed, recent),
        firstWord,
        // 묻는 몸짓 한 줄. 이것이 없으면 탐정은 목소리만 있고 몸이 없다.
        pick(LEAD_DETECTIVE_ASK[kind] || LEAD_DETECTIVE_ASK.courteous, seed, recent),
      ]);
      // 인사와 대답 사이에 탐정이 한 번 묻는다. 여기를 가르기 전에는 최초
      // 발견자가 인사 다음 줄에서 그날 밤 이야기를 혼자 꺼냈다 — 묻지도
      // 않은 말이라 진술이 아니라 통보로 읽혔다(2026-09 사용자 지적).
      gm.detective_line = firstQuestionFor(
        index,
        state,
        npc,
        firstWord,
        seed,
        recent,
      );
      gm.message_tail = joinParagraphs(said);
      const spokenIds = spoken.map((claim) => claim.claimId);
      turn.heardStatementIds.push(...spokenIds);
      for (const update of gm.npc_updates) {
        if (update.npc === first) update.stated_claim_ids = spokenIds;
      }
      if (kind !== 'summon') {
        gm.jiwoo_line = pick(JIWOO_FIRST_HEARD, seed, recent);
      }
    } else {
      const unlocked = nextUnlockedDisclosure(index, state, first);
      if (unlocked) {
        gm.message = joinParagraphs([
          ...summonIntro,
          pick(
            unlocked.reluctant ? LEAD_RELUCTANT : LEAD_MORE_TO_SAY,
            seed,
            recent,
            (template) => fill(template, { name: npc.name }),
          ),
          spokenById(unlocked.id, unlocked.content),
        ]);
        turn.heardStatementIds.push(unlocked.id);
        for (const update of gm.npc_updates) {
          if (update.npc === first) update.stated_claim_ids = [unlocked.id];
        }
        if (kind !== 'summon') {
          gm.jiwoo_line = jiwooTestimonyLine(unlocked.content, seed, recent);
        }
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
        // 말버릇. 그대로 대사가 되는 것은 말하게 하고(verbalTicQuote),
        // 문장 조각인 것만 서술로 남는다.
        const ticSaid = verbalTicQuote(index, npc);
        gm.message = joinParagraphs([
          ...summonIntro,
          // 버릇은 첫 대면에서 뺐다 — 소개·동작·버릇이 한꺼번에 쌓이면
          // 만나자마자 읽을 것이 셋이 된다(2026-09 사용자 지적). 대신 다시
          // 찾아온 자리로 옮긴다. 습관은 원래 두 번째에 눈에 들어오고,
          // 여기는 리드가 한 줄뿐이라 자리도 있다.
          //
          // 데려온 턴에서는 앞의 도착 서술이 이미 그 사람을 이 방에 세워
          // 놓았으므로 「다시 몸을 돌린다」를 빼고 버릇만 남긴다.
          [
            kind === 'summon'
              ? null
              : `${withTopic(npc.name)} 다시 탐정 쪽으로 몸을 돌린다.`,
            // 말할 수 있는 버릇은 아래에서 대사로 나간다. 여기 남는 것은
            // 혼자 설 수 없는 조각뿐이다.
            ticSaid || done(state, `tic|${npc.id}`)
              ? null
              : verbalTicLine(index, npc, false),
          ]
            .filter(Boolean)
            .join(' '),
          done(state, `tic|${npc.id}`) ? null : ticSaid,
          body,
        ]);
        turn.completedActions.push(`tic|${npc.id}`);
        if (kind !== 'summon') {
          gm.jiwoo_line = deepener
            ? pick(JIWOO_DEEPENER, seed, recent)
            : cleared
              ? pick(JIWOO_HERRING_CLEAR, seed, recent)
              : pick(JIWOO_REENGAGE, seed, recent);
        }
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
    // 직함 한 줄(「배문호, 문호벌집 주인.」)은 수첩에 적히는 표제라 **지문
    // 앞**에 둔다. 전에는 「안수경은 말끝을 흐렸다가 다시 이어 간다.」 뒤에
    // 이 조각이 끼고 그다음에야 따옴표가 와서, 말끝을 흐린 사람이 직함을
    // 읊는 것처럼 읽혔다(2026-09-23 실플레이 로그 세 편 전부).
    const roleLine = answer.lines[0]?.startsWith(`${answer.victimName},`)
      ? answer.lines[0]
      : null;
    const spokenLines = roleLine ? answer.lines.slice(1) : answer.lines;
    gm.message = joinParagraphs([
      roleLine,
      pick(LEAD_VICTIM, seed, recent, (template) =>
        fill(template, { name: npc.name, role: answer.victimName }),
      ),
      // 직함 한 줄과 인물의 말은 문단을 나눈다. 전에는 nature+publicFace 가
      // 둘 다 3인칭 설명문이라 한 문단으로 이어 읽혔는데, says 가 들어오면
      // 그 자리가 따옴표라 `조태원, 병원장. "15년입니다…"` 가 된다.
      ...spokenLines,
    ]);
    gm.jiwoo_line = pick(JIWOO_VICTIM, seed, recent);
    turn.completedActions.push(`victim|${npc.id}`, 'victim|asked');
    return finish(turn);
  }

  if (kind === 'alibi') {
    const npc = index.npcById.get(first);
    if (!npc) return null;
    const claim = alibiClaimFor(index, state, npc.id);
    const movements = privateMovementsOf(index, npc.id);
    if (!claim && !movements.length) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    // 되풀이라고 말할 수 있는 것은 진술뿐이다. 시각이 붙은 행적은 이번이
    // 처음 나오는 말이므로, 그게 섞이면 "토씨 하나 다르지 않다"가 거짓이 된다.
    const repeated = Boolean(claim?.repeated) && !movements.length;
    gm.message = joinParagraphs([
      pick(repeated ? LEAD_ALIBI_AGAIN : LEAD_ALIBI, seed, recent, (template) =>
        fill(template, { name: npc.name }),
      ),
      asQuote(claim?.content),
      // 마스터의 actual_action은 "목하진이 …한다"는 3인칭 서술이다. 바로
      // 앞 문단이 "…라고 말한다"로 끝나므로 그대로 이어 붙이면 화자가
      // 뒤섞인다 — 대답이 아니라 GM이 짚어 주는 기록이라고 한 줄 세워
      // 두면 뒤따르는 3인칭이 제자리를 찾는다.
      movements.length
        ? pick(LEAD_ALIBI_TIMELINE, seed, recent, (template) =>
            fill(template, { name: npc.name }),
          )
        : null,
      ...movements,
    ]);
    gm.npc_updates.push({
      npc: npc.id,
      status: 'interviewed',
      statement_stage: state.npc_statement_stage[npc.id] || 'initial',
      stated_claim_ids: claim ? [claim.id] : [],
    });
    gm.jiwoo_line = repeated
      ? pick(JIWOO_ALIBI_AGAIN, seed, recent)
      : movements.length
        ? pick(JIWOO_ALIBI_TIME, seed, recent)
        : jiwooTestimonyLine(claim?.content, seed, recent);
    // 되풀이를 짚는 줄이 이 턴의 내용이다. 이것이 빠지면 화면에는 아까
    // 들은 말이 한 번 더 찍힐 뿐이라, 장르의 한 장면이 아니라 엔진이
    // 같은 답을 두 번 낸 것으로 읽힌다.
    if (repeated) turn.jiwooEssential = true;
    if (claim && !state.heard_statements.includes(claim.id)) {
      turn.heardStatementIds.push(claim.id);
    }
    turn.completedActions.push(`alibi|${npc.id}`);
    return finish(turn);
  }

  if (kind === 'recall') {
    const npc = index.npcById.get(first);
    if (!npc) return null;
    // 잠금이 풀린 것이 먼저다 — 방금 무언가를 해서 열린 문이고, 그 자리에서
    // 나와야 한 일과 들은 말이 이어진다. 그것이 없을 때만 원래의 「그 밖에」,
    // 곧 잠긴 적 없는 나머지가 하나 나온다.
    const unsealed = unlockedByGate(index, state, npc.id);
    const remaining = recallableFacts(index, state, npc.id);
    const fact = unsealed || remaining[0];
    if (!fact) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    gm.message = joinParagraphs([
      pick(
        unsealed ? LEAD_RELUCTANT : LEAD_RECALL,
        seed,
        recent,
        (template) => fill(template, { name: npc.name }),
      ),
      spokenById(fact.id, fact.content),
    ]);
    gm.npc_updates.push({
      npc: npc.id,
      status: 'interviewed',
      statement_stage: state.npc_statement_stage[npc.id] || 'initial',
      stated_claim_ids: [fact.id],
    });
    // 마지막 하나였으면 한지우가 그걸 짚어 준다 — 다음에 이 보기가 사라지는
    // 이유를 플레이어가 알 수 있어야 한다.
    gm.jiwoo_line = pick(
      unsealed || remaining.length > 1 ? JIWOO_RECALL : JIWOO_RECALL_LAST,
      seed,
      recent,
    );
    if (!state.heard_statements.includes(fact.id)) {
      turn.heardStatementIds.push(fact.id);
    }
    return finish(turn);
  }

  if (kind === 'relation') {
    const npc = index.npcById.get(second);
    const other = npc
      ? relationPartners(index, selectedCase, npc.id).find(
          (item) => item.key === first,
        )
      : null;
    if (!npc || !other) return null;
    const rel = relationshipBetween(index, npc.id, other.key);
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    // 마스터가 쓴 짝이면 그 관계를, 아니면 상대의 공개 직함을 짚고 더 할
    // 말이 없다는 대답을. 둘 다 한 턴을 쓰므로 어느 쪽인지는 눌러 봐야
    // 안다 — 그게 이 격자를 채운 이유다.
    // 마스터가 says 를 갈라 써 뒀으면 그 사람 입으로 나온 말을 쓴다.
    // 없으면 nature+publicFace 로 돌아가는데, 그건 짝에 적힌 3인칭 설명문
    // ("…업무 관계로만 알려져 있다")이라 인물이 아니라 해설자의 목소리로
    // 읽히고, 무엇보다 **양쪽이 같은 문장을 말한다** — CASE290 실플레이에서
    // 서지완과 임소민이 서로에 대해 글자 하나 안 틀리고 같은 말을 했다.
    const own = asQuote(rel?.says?.[npc.id.replace(/^N/, 'CH')]) || '';
    const answer = own
      ? own
      : rel
        ? [rel.nature, rel.publicFace].filter(Boolean).join(' ')
        : // 말이므로 따옴표를 씌운다. 없으면 3인칭 설명문(nature+publicFace)
          // 과 같은 모양으로 화면에 나가 누가 말한 것인지 알 수 없다.
          asQuote(
            pick(RELATION_NO_COMMENT, seed, recent, (template) =>
              fill(template, { name: other.name, role: other.role }),
            ),
          ) || '';
    // 그 상대를 가리키는 지목이 있으면 관계 답 뒤에 흘러나온다. 지문 한
    // 줄(어떻게 그 말을 꺼내는지)이 관계 답과 지목 사이를 잇는다.
    const finger = pendingFinger(index, state, npc.id, other.key);
    const fingerNow =
      finger && (!finger.opens || state.heard_statements.includes(finger.opens))
        ? finger
        : null;
    gm.message = joinParagraphs([
      pick(LEAD_RELATION, seed, recent, (template) =>
        fill(template, { name: npc.name, role: other.name }),
      ),
      answer,
      fingerNow
        ? pick(
            LEAD_ACCUSE_BY_KIND[voiceKindOf(index, npc)] || LEAD_ACCUSE,
            seed,
            recent,
            (template) => fill(template, { name: npc.name }),
          )
        : null,
      fingerNow ? asQuote(fingerNow.says) : null,
    ]);
    // 마스터가 짝을 안 쓴 상대(「일로 마주칠 일이 있으면 마주치는 정도」)에는
    // 한지우가 붙지 않는다. 격자는 눌러 봐야 아는 것이 규칙이라 그대로 두되,
    // 헛턴마다 「빈칸으로 두겠습니다」까지 얹으면 헛턴이 두 배로 길어진다
    // (CASE001 실플레이: 한 사람당 서너 번).
    gm.jiwoo_line = fingerNow
      ? fingerJiwooLine(index, state, npc.id, fingerNow, seed, recent)
      : rel
        ? pick(JIWOO_RELATION, seed, recent)
        : null;
    if (fingerNow) {
      turn.jiwooEssential = true;
      turn.completedActions.push(`finger|${npc.id}`);
    }
    turn.completedActions.push(`rel|${npc.id}|${other.key}`);
    return finish(turn);
  }

  if (kind === 'strain') {
    const npc = index.npcById.get(second);
    const other = npc
      ? relationPartners(index, selectedCase, npc.id).find(
          (item) => item.key === first,
        )
      : null;
    if (!npc || !other) return null;
    const rel = relationshipBetween(index, npc.id, other.key);
    // 메뉴가 연 뒤에 상태가 바뀌는 일은 없지만, 행동 id 는 클라이언트가
    // 들고 있던 것이라 여기서 조건을 한 번 더 본다 — 다른 문들과 같은 규칙.
    if (!rel || !strainReady(state, rel)) return null;
    if (strainSubject(selectedCase, rel) !== npc.id) return null;
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: npc.id,
    };
    // private_strain 은 3인칭 산문이다("한소영은 …내색하지 않았다"). 따옴표
    // 안에 넣으면 인물이 자기를 3인칭으로 부르는 말이 되므로, 도입 한 줄
    // 뒤의 서술로 둔다 — nature+public_face 가 그렇게 나가는 것과 같다.
    gm.message = joinParagraphs([
      pick(LEAD_STRAIN, seed, recent, (template) =>
        fill(template, { name: npc.name, role: other.name }),
      ),
      rel.privateStrain,
    ]);
    gm.jiwoo_line = pick(JIWOO_STRAIN, seed, recent);
    // 짝의 양쪽에서 두 번 나오지 않게 관계 단위로 닫는다.
    turn.completedActions.push(`strain|${strainKey(rel)}`);
    return finish(turn);
  }

  // 되묻는 말이 품고 있던 질문을 실제로 던지는 자리. 첫 대면이 미뤄 둔
  // 진술 하나를 그 화제로 물어서 받는다. 카드를 받아 내는 `ask` 와 같은
  // 박자지만 나오는 것은 카드가 아니라 진술이다 — 마스터가 initial_claims
  // 에 써 둔 문장을 그대로 내준다.
  if (kind === 'echo') {
    const npc = index.npcById.get(first);
    if (!npc || first !== state.current_interview) return null;
    const claim = echoClaimsFor(index, state, first).find(
      (item) => item.id === second,
    );
    if (!claim) return null;
    const kindOf = voiceKindOf(index, npc);
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: first,
    };
    gm.message = joinParagraphs([
      pick(LEAD_ASK_BY_KIND[kindOf] || LEAD_ASK, seed, recent, (template) =>
        fill(template, { name: npc.name }),
      ),
      asQuote(claim.content),
    ]);
    // 탐정이 묻고 상대가 대답하는 순서라 서술보다 앞이다. 말꼬리는 카드를
    // 받아 내는 자리와 같은 표를 쓴다.
    const closing = pick(
      ASK_CLOSING_BY_KIND[kindOf] || ASK_CLOSING_BY_KIND.courteous,
      seed,
      recent,
      (template) => template.replace('{topic}', `${claim.topic}에 대해`),
    );
    gm.detective_line = `"${closing}"`;
    gm.detective_line_position = 'before';
    gm.jiwoo_line = jiwooTestimonyLine(claim.content, seed, recent);
    gm.npc_updates.push({
      npc: first,
      status: 'interviewed',
      statement_stage: state.npc_statement_stage[first] || 'initial',
      stated_claim_ids: [claim.id],
    });
    turn.heardStatementIds.push(claim.id);
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
        ? pick(
            LEAD_ASK_BY_KIND[voiceKindOf(index, npc)] || LEAD_ASK,
            seed,
            recent,
            (template) => fill(template, { name: npc.name }),
          )
        : null,
      asSpeech(card.summary),
    ]);
    gm.acquire.push(card.id);
    if (npc) {
      const question = detectiveQuestionFor(
        card.condition || '',
        npc.name,
        voiceKindOf(index, npc),
        seed,
        recent,
      );
      if (question) {
        gm.detective_line = question;
        // 묻고 나서 상대가 대답하는 순서라 서술보다 앞이다.
        gm.detective_line_position = 'before';
      }
    }
    gm.jiwoo_line = jiwooTestimonyLine(card.summary, seed, recent);
    // 방금 받은 이 말이 이 사람에 대한 의심을 푸는 바로 그 말일 때가 있다.
    // 그 자리에서 풀어야 한다 — 「사건 당일 오후 내내 창고에 있었다」를 듣고도
    // 다음에 한 번 더 찾아와야 도장이 채워지면, 플레이어는 방금 무슨 일이
    // 일어났는지 모른 채 방을 나간다.
    //
    // 의심을 짙게 할 것이 남아 있으면 그쪽이 먼저다. 그 순서가 뒤집히면
    // 의심이 짙어지기도 전에 풀린다.
    if (npc) {
      const withCard: EngineState = {
        ...state,
        acquired_information: [...state.acquired_information, card.id],
      };
      const deepener = pendingDeepener(index, selectedCase, withCard, npc.id);
      const cleared = deepener
        ? null
        : clearableHerring(index, selectedCase, withCard, npc.id, null);
      if (cleared) {
        gm.message = joinParagraphs([
          gm.message,
          pick(LEAD_HERRING_CLEAR, seed, recent, (template) =>
            fill(template, { name: npc.name }),
          ),
          cleared.text,
        ]);
        gm.jiwoo_line = pick(JIWOO_HERRING_CLEAR, seed, recent);
        turn.completedActions.push(`cleared|${cleared.id}`);
        applyBanterSlot(turn, state, 'herring_clear', caseSeed, recent);
      }
    }
    return finish(turn);
  }

  if (kind === 'hypothesis') {
    // 다섯째 칸(옛 근거 카드 목록)은 더 읽지 않는다. 화면이 빈 값으로
    // 보내고 마커도 빈 칸을 지킨다 — 옛 저장의 5칸 마커 때문이다.
    const [, op, slotRaw, a] = actionId.split('|');
    const slot = slotRaw as HypothesisSlot;
    const seq = nextSeq(state);
    gm.scene = {
      location_id: state.current_location,
      interview_character_id: state.current_interview,
    };

    if (op === 'set') {
      const text = candidateText(index.master, slot, a, selectedCase.npcs);
      turn.completedActions.push(setMarker(slot, a, seq));
      gm.message = joinParagraphs([
        pick(LEAD_HYP_SET, seed, recent),
        `${SLOT_LABEL[slot]} — ${text}.`,
      ]);
      gm.jiwoo_line = pick(JIWOO_HYP_SET, seed, recent);
      return finish(turn);
    }
    if (op === 'clear') {
      turn.completedActions.push(clearMarker(slot, seq));
      gm.message = `${SLOT_LABEL[slot]} 칸을 비운다.`;
      gm.jiwoo_line = pick(JIWOO_HYP_CLEAR, seed, recent);
      return finish(turn);
    }
    if (op === 'confirm') {
      const judged = judgeConfirm(index.master, state, slot);
      if (judged.kind === 'empty') return null;
      if (judged.kind === 'already') {
        gm.message = '그 줄은 이미 굳어 있다. 수첩을 다시 덮는다.';
        return finish(turn);
      }
      const filledText =
        hypothesisView(index.master, state, selectedCase.npcs).slots[slot]
          ?.text || '';
      if (judged.kind === 'unsupported') {
        // 정답이든 오답이든 같은 말이다 — 굳히기로는 정답을 못 읽는다.
        gm.message = joinParagraphs([
          pick(LEAD_HYP_UNSUPPORTED, seed, recent),
          `${SLOT_LABEL[slot]} — ${filledText}.`,
        ]);
        gm.jiwoo_line = pick(JIWOO_HYP_UNSUPPORTED, seed, recent);
        turn.jiwooEssential = true;
        return finish(turn);
      }
      const opens = wouldOpenActTwo(state, slot);
      turn.completedActions.push(confirmedMarker(slot, judged.candidateId));
      gm.message = joinParagraphs([
        pick(LEAD_HYP_CONFIRMED, seed, recent),
        `${SLOT_LABEL[slot]} — ${filledText}.`,
        // 네 칸이 다 차는 그 턴에 증거 제시가 열린다. 문이 열렸다는 것은
        // 아래 한지우가 말한다 — 같은 말을 두 문단으로 하면 화면이 규칙을
        // 설명하는 꼴이 된다.
        opens ? pick(LEAD_ACT_TWO, seed, recent) : null,
      ]);
      gm.jiwoo_line = pick(
        opens ? JIWOO_PRESENT_OPEN : JIWOO_HYP_CONFIRMED,
        seed,
        recent,
      );
      turn.jiwooEssential = true;
      return finish(turn);
    }
    if (op !== 'press') return null;

    const npc = index.npcById.get(a);
    if (!npc) return null;
    const respondentId = npc.id.replace(/^N/, 'CH');
    const judged = judgePress(
      index.master,
      state,
      slot,
      respondentId,
      // 지목당한 사람의 헛다리가 **풀릴 조건까지 찼을 때만** 그 해소문이
      // 나온다. 전에는 `cleared|` 마커만 없으면 그냥 터뜨렸는데, 그러면 카드
      // 한 장만 들고 보드에서 사람을 한 명씩 짚는 것으로 그 사건의 헛다리
      // 둘이 공짜로 벗겨졌다 — CASE030 에서 E01 한 장만 주운 상태로 예소담을
      // 지목했더니 제시한 증거 0장에 R02 가 풀렸다. `how_to_clear` 가 부르는
      // 것(남의 카드·남의 진술·장소 관찰)을 하나도 안 건드리고서다.
      // clearableHerring 을 그대로 쓰면 제시 턴·재면담과 같은 판정을 탄다
      // (evidenceIds 는 null — 이 턴에 무엇을 내려놓은 것이 아니라 이름을
      // 부른 것이므로).
      (characterId) => {
        const target = index.npcById.get(characterId.replace(/^CH/, 'N'));
        if (!target) return null;
        return clearableHerring(index, selectedCase, state, target.id, null);
      },
      // 진범이 지목당하면 자기 거짓 알리바이를 말한다. 무고한 사람은
      // suspect_refutations 의 사실을 말하는데 진범만 빈손이면 그것이 표시다.
      // 그 거짓말은 나중에 2막에서 카드로 깨는 것이다.
      () => {
        const lie = (index.master.npcs[npc.id]?.initialClaims || []).find(
          (claim) => claim.truthStatus === 'lie' && claim.content.trim(),
        );
        return lie ? { id: lie.claimId, text: lie.content } : null;
      },
    );
    const filledText =
      hypothesisView(index.master, state, selectedCase.npcs).slots[slot]
        ?.text || '';

    if (judged.kind === 'empty') return null;
    if (judged.kind === 'already') {
      gm.message = '그 줄은 이미 굳어 있다. 수첩을 다시 덮는다.';
      return finish(turn);
    }
    if (judged.kind === 'deny') {
      // 반박할 말이 없는 사람의 부인. 정답 후보를 들이댄 것인지 남이 반박할
      // 오답을 들이댄 것인지 여기서는 갈리지 않는다 — 갈리면 그것이 답을
      // 읽는 길이 된다. 「누가」만 본인의 되받는 말(사실 또는 거짓 진술)이
      // 있고, 그 말은 수첩에 들어간다.
      if (slot === 'who') turn.completedActions.push(pressedMarker(respondentId));
      // 「누가」의 부인은 「제가요? 아닙니다」이고 동기·시간·방법의 부인은
      // 「그건 제가 말씀드릴 게 없네요」다 — 후자에 전자를 쓰면 동기 얘기에
      // 「제가 아니라는 걸」이 붙는다.
      const spoken =
        judged.text.trim() ||
        pick(slot === 'who' ? NPC_HYP_DENY : NPC_HYP_DENY_OTHER, seed, recent) ||
        '';
      const released = judged.releases
        ? spokenById(judged.releases, statementContent(index, judged.releases))
        : null;
      if (judged.releases && released) {
        turn.heardStatementIds.push(judged.releases);
      }
      // 되받은 말 한 문단뿐이다. 무고한 사람의 말 뒤에 「…라고 한다」를
      // 붙이고 진범의 거짓말 뒤에는 안 붙이면 그 모양이 표시가 된다 —
      // 풀려난 사실은 수첩에만 조용히 들어간다.
      gm.message = joinParagraphs([
        pick(LEAD_HYP_DENY, seed, recent, (template) =>
          fill(template, { name: npc.name, role: filledText }),
        ),
        asQuote(spoken),
      ]);
      gm.jiwoo_line = pick(
        released ? JIWOO_HYP_DENY_HEARD : JIWOO_HYP_DENY,
        seed,
        recent,
      );
      turn.jiwooEssential = true;
      return finish(turn);
    }
    // refuted — 틀린 가설이 전진이다: 반박이 사실을 준다. 반박은 인물의 말이라
    // 따옴표로 세우고, 풀려나는 사실이 있으면 수첩에 들어간다.
    if (slot === 'who') {
      turn.completedActions.push(pressedMarker(respondentId));
    } else {
      turn.completedActions.push(refutedMarker(slot, judged.candidateId));
    }
    if (judged.viaHerring) {
      turn.completedActions.push(`cleared|${judged.viaHerring}`);
      gm.surfaced_red_herring_ids.push(judged.viaHerring);
    }
    // refutation 은 그 사람의 말이라 따옴표를 세운다. 레드헤링의
    // actual_reason 은 3인칭 서술("실제로는 도하린이 …")이라 따옴표를
    // 씌우면 본인이 자기를 3인칭으로 부르게 된다 — 서술로 둔다.
    const spoken = judged.text.trim() || pick(NPC_HYP_DENY, seed, recent) || '';
    const quoted =
      !spoken || judged.viaHerring || /^["“]/.test(spoken)
        ? spoken
        : `"${spoken}"`;
    const released = judged.releases
      ? spokenById(judged.releases, statementContent(index, judged.releases))
      : null;
    if (judged.releases && released) {
      turn.heardStatementIds.push(judged.releases);
    }
    gm.message = joinParagraphs([
      pick(LEAD_HYP_REFUTED, seed, recent, (template) =>
        fill(template, { name: npc.name, role: filledText }),
      ),
      quoted || null,
      released,
    ]);
    // 이 턴이 무엇을 주었는가. 헛다리가 벗겨졌거나 사실이 하나 풀렸으면
    // 한지우가 그것을 짚고, 부인만 받았으면 「한 칸 지웠다」까지만 말한다 —
    // 기존 풀의 절반이 「대신 하나 얻었고요」처럼 얻은 것을 전제한다.
    const gained = Boolean(judged.viaHerring || released);
    gm.jiwoo_line = pick(
      gained ? JIWOO_HYP_REFUTED : JIWOO_HYP_REFUTED_BARE,
      seed,
      recent,
    );
    turn.jiwooEssential = true;
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

    // 1막에서는 대립 단계가 안 열린다 — 네 칸이 확정되기 전에 카드를 진범에게
    // 내밀면 pressure_responses 로 받아칠 뿐이다. 보드가 없는 사건은 늘 2막이라
    // 종전 그대로다(docs/offline-deduction.md 2.4).
    const stage = actTwo(index.master, state)
      ? firingStage(index, state, npc.id, cardIds)
      : null;
    const cleared = stage
      ? null
      : clearableHerring(index, selectedCase, state, npc.id, cardIds);
    // 카드를 눈앞에 들이대는 것 자체가 hidden_until의 열쇠일 때가 있다.
    // 마스터의 게이트 2,011개 중 793개(39%)는 release_prerequisite가 증거
    // 카드인데, 지금까지 그 문은 "묻는다" 카드로만 열렸다 — CASE014 실플레이
    // 로그에서 플레이어가 구인섭에게 E04(고쳐 쓴 당번표)를, 이어 E03(10년 전
    // 장부)을 내밀었고 둘 다 그 사람 게이트의 전제 조건 그대로였는데, 돌아온
    // 것은 "글쎄요" 한 줄이었다. 장르에서 가장 자연스러운 행동이 아무것도
    // 아닌 것이 되면 플레이어는 제시를 그만두게 된다.
    const unsealed =
      stage || cleared ? null : unlockedByGate(index, state, npc.id, cardIds);
    gm.presented_evidence_outcome =
      stage || cleared || unsealed ? 'advanced' : 'no_change';
    if (stage) {
      // 여러 장이 한꺼번에 단계를 깨는 순간은 이 게임의 클라이맥스인데,
      // 지금까지 그 장면이 한 줄이었다 — 리드 한 줄 뒤에 바로 자백이 붙었다.
      // 탐정이 무엇을 내려놓았는지 한 장씩 짚고 나서 상대가 무너져야 그게
      // 장면이 된다. 제목은 마스터가 쓴 것이고 시각도 그 카드 본문에서
      // 꺼낸 것이라 지어내는 자리가 없다.
      const laidOut = cards.length > 1 ? evidenceLayout(cards, seed) : [];
      // 무엇이 어긋나는지를 탐정이 말한다. 마스터가 단계마다 player_action 에
      // 적어 둔 추궁("환풍기 스위치의 조작 흔적(E02)과 채이든의 증언(E07)을
      // 근거로, 평소엔 늘 켜져 있던 환풍기가 그날 밤에만 꺼져 있었다는 사실을
      // 추궁한다")이 1,006개 전부 채워져 있는데 오프라인 GM 은 한 번도 읽지
      // 않았고, 그 자리에 공용 한 줄("아까 하신 말씀과는 맞지 않는데요")만
      // 나갔다. CASE030 실플레이에서 사용자가 짚은 「단계가 논리가 아니라
      // 순번으로 이어진다」의 절반이 이것이다 — 단계를 잇는 논리가 마스터에
      // 있는데 화면이 말하지 않았다.
      //
      // 1,006개 전부 따옴표 없는 3인칭 서술이고 「…대조한다/추궁한다」로 끝나
      // 서술 문단으로 그대로 들어간다. 있으면 공용 다그침(evidenceLayout 의
      // 마지막 줄 / DETECTIVE_BREAK)을 이것이 대신하고, 없는 마스터에서만
      // 종전대로 떨어진다. id 괄호는 stripMasterIds 가 벗긴다.
      const argued = stripMasterIds(stage.playerAction || '').trim() || null;
      // 인정한 사실에 붙는 변명 진술. 다음 단계가 깰 「질문」이라 같은 턴에
      // 그 사람 입으로 나가고 수첩에도 진술로 꽂힌다.
      const excuses = excuseClaimsFor(
        index,
        state,
        npc.id,
        stage.releaseClaimOrFactId,
      );
      gm.message = joinParagraphs([
        ...(argued && laidOut.length ? laidOut.slice(0, -1) : laidOut),
        argued,
        pick(
          LEAD_STAGE_BREAK_BY_KIND[voiceKindOf(index, npc)] ||
            LEAD_STAGE_BREAK,
          seed,
          recent,
          (template) => fill(template, { name: npc.name }),
        ),
        stage.release,
        ...excuses.map((item) => asQuote(item.content)),
      ]);
      gm.npc_updates.push({
        npc: npc.id,
        status: 'interviewed',
        statement_stage: stage.toStage || null,
        stated_claim_ids: [
          ...(stage.releaseClaimOrFactId ? [stage.releaseClaimOrFactId] : []),
          ...excuses.map((item) => item.id),
        ],
      });
      // 여러 장을 늘어놓은 턴에서는 다그치는 말이 늘어놓기의 끝에 붙어야
      // 한다(evidenceLayout 이 그 자리에 넣는다). 앞에 두면 아직 아무것도
      // 꺼내지 않았는데 먼저 다그치는 꼴이 된다.
      if (!laidOut.length && !argued) {
        gm.detective_line = pick(DETECTIVE_BREAK, seed, recent);
        gm.detective_line_position = 'before';
      }
      gm.jiwoo_line = pick(JIWOO_BREAK, seed, recent);
      turn.completedActions.push(`stage|${stage.id}`);
      // 클라이맥스. 여기서만큼은 두 사람이 서로에게 말해야 한다.
      //
      // 다만 **마지막** 단계는 다른 자리다. CASE004 실플레이에서 육시아가
      // 조카 이름을 지키려 했다고 인정한 바로 그 줄 밑에 「제가
      // 웃었습니까?」 / 「방금 입꼬리 올라갔어.」가 붙었다 — 단계가 깨질
      // 때마다 쓰는 농담 풀이 사건의 바닥이 드러난 자리에도 그대로
      // 나온 것이다. 두 사람의 티키타카가 재미의 절반인데, 그 절반이
      // 장면을 깎아먹는 쪽으로 붙으면 안 쓰느니만 못하다.
      //
      // (같은 로그에서 마지막 단계 뒤 다섯 턴이 더 돌았는데, 그건 종결
      // 신호가 없어서가 아니라 **레드헤링을 깨려던 것**이었다 —
      // 2026-09-21 사용자 정정. 그쪽은 이 풀이 아니라 따로 본다.)
      applyBanterSlot(
        turn,
        state,
        lastRequiredStage(index, state, stage.id) ? 'last_stage' : 'stage_break',
        caseSeed,
        recent,
      );
      if (stage.releaseClaimOrFactId) {
        turn.heardStatementIds.push(stage.releaseClaimOrFactId);
      }
      turn.heardStatementIds.push(...excuses.map((item) => item.id));
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
      applyBanterSlot(turn, state, 'herring_clear', caseSeed, recent);
    } else if (unsealed) {
      gm.message = joinParagraphs([
        cards.length > 1
          ? pick(LEAD_PRESENT_SET, seed, recent, (template) =>
              fill(template, { name: npc.name }),
            )
          : null,
        pick(LEAD_UNSEAL, seed, recent, (template) =>
          fill(template, { name: npc.name }),
        ),
        spokenById(unsealed.id, unsealed.content),
      ]);
      gm.npc_updates.push({
        npc: npc.id,
        status: 'interviewed',
        statement_stage: null,
        stated_claim_ids: [unsealed.id],
      });
      gm.jiwoo_line = pick(JIWOO_UNSEAL, seed, recent);
      turn.heardStatementIds.push(unsealed.id);
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
      const missing = openStageShortfall(index, state, npc.id, cardIds);
      const shortfall = missing.length;
      // 모자란 것을 전부 이미 들고 있는가. CASE042 실플레이에서 플레이어는
      // 142번 턴부터 E05 한 장이 모자랐는데 그 카드는 60번 턴부터 손에
      // 있었다 — 거기서 46턴을 헛돌았다(방 다섯을 다 돌고, 딴 사람을
      // 불러 헛제시 둘). 코퍼스 완전 탐색에서 이 자리 474회 중 418회(88%)가
      // 그렇다. 몇 장인지만 말하던 신호에 「새로 찾을 게 아니라 수첩 안에
      // 있다」를 더한다. 무엇인지는 여전히 말하지 않는다 — 그건 힌트의 몫.
      const allHeld =
        shortfall > 0 &&
        missing.every((id) => state.acquired_information.includes(id));
      // 헛짚은 제시에 돌아오는 말은 이 사람 것이어야 한다. 마스터가 써 둔
      // 거절이 있으면 그것을 쓰고, 없는 마스터(코퍼스에 그런 인물이 있다)
      // 에서만 공용 문장으로 떨어진다. 단계에 절반쯤 닿은 자리(shortfall)는
      // 공용 문장을 그대로 둔다 — 그 문장이 "아직 뭔가 더 있다"는 신호를
      // 겸하고 있어서, 인물의 평범한 거절로 바꾸면 신호가 사라진다.
      // 카드는 이 사람의 단계에 맞는데 다른 조건이 막고 있는 자리. 그 사람의
      // 거짓말을 아직 안 들었거나(requires_heard_claim_ids), 사슬의 뒷단계
      // 카드를 먼저 내밀었다(from_stage). 둘 다 지금까지 「그래서요?」 한
      // 줄로 끝나서 카드가 틀린 것처럼 읽혔다(2026-09-25 실플레이 신고 —
      // 「진술을 깨고 있는데 카드로 안 열려」). 무엇이 잠겼는지는 말하지
      // 않고 어디로 가야 하는지만 한지우가 짚는다.
      const blocked = shortfall
        ? null
        : stageBlockReason(index, state, npc.id, cardIds);
      const ownRefusal = shortfall
        ? null
        : pressureLine(index, selectedCase, state, npc, seed, recent);
      // 헛짚은 제시가 이 턴의 전부였다 — 상대가 거절하고 끝난다. 그 자리에
      // 「이 카드가 어디까지 말하는가」를 한 줄 긋는다. 단계에 절반쯤 닿은
      // 자리(shortfall)는 건드리지 않는다: 거기 붙은 줄이 「아직 뭔가 더
      // 있다」는 신호를 겸하고 있어서, 범위를 말하는 문장이 끼면 그 신호가
      // 「이건 여기까지다」로 읽혀 반대로 간다.
      const notProven = shortfall
        ? null
        : notProvenLine(cards, state, seed, recent);
      gm.message = joinParagraphs([
        cards.length > 1
          ? pick(LEAD_PRESENT_SET, seed, recent, (template) =>
              fill(template, { name: npc.name }),
            )
          : null,
        ownRefusal ||
          pick(
            shortfall ? NPC_PARTIAL : NPC_DEFLECT,
            seed,
            recent,
            (template) => fill(template, { name: npc.name }),
          ),
        notProven?.text || null,
      ]);
      if (notProven) turn.completedActions.push(`notproven|${notProven.cardId}`);
      gm.jiwoo_line = shortfall
        ? pick(
            allHeld ? JIWOO_PARTIAL_HELD : JIWOO_PARTIAL,
            seed,
            recent,
            (template) => fill(template, { count: countSheets(shortfall) }),
          )
        : blocked === 'unheard'
          ? pick(JIWOO_STAGE_UNHEARD, seed, recent, (template) =>
              fill(template, { name: npc.name }),
            )
          : blocked === 'order'
            ? pick(JIWOO_STAGE_ORDER, seed, recent, (template) =>
                fill(template, { name: npc.name }),
              )
            : pick(JIWOO_DEFLECT, seed, recent);
      // 몇 장 모자라는지를 세어서 나온 줄이다. 아래에서 잡담으로 덮지
      // 않는 것과 같은 이유로, 쿨다운으로도 지우지 않는다.
      if (shortfall || blocked) turn.jiwooEssential = true;
      // 단계에 절반쯤 닿은 자리(shortfall)는 건드리지 않는다 — 거기 붙은
      // 한 줄이 "아직 뭔가 더 있다"는 신호를 겸하고 있어서, 잡담으로
      // 덮으면 신호가 사라진다.
      // 헛짚을 때마다 두 사람이 주고받으면 헛짚음이 이어질수록 잡담이
      // 길어진다 — CASE001 실플레이에서 여덟 번 연속 헛짚는 동안 매번
      // 두세 줄에서 여덟 줄이 붙었다. 세 번에 한 번만.
      const deadEnds = state.completed_actions.filter((item) =>
        item.startsWith('deadend|'),
      ).length;
      if (!shortfall && !blocked) {
        turn.completedActions.push(`deadend|${deadEnds + 1}`);
        if (deadEnds % 3 === 0) {
          applyBanterSlot(turn, state, 'dead_end', caseSeed, recent);
        }
      }
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
// path puts on him: he reacts, rephrases, or names something already in
// plain sight, and never picks the next target or declares anything cleared.
// ---------------------------------------------------------------------------

// 이 사건에서 지금까지 화면에 찍힌 모든 줄. 예전에는 뒤에서 60줄만 잘라
// 썼는데(CASE305 실플레이에서 같은 대사가 한 세션 안에 그대로 돌아온 것이
// 그때 넣은 창이다), 이제 chooseBalanced 가 "이 풀이 몇 번 나왔나"를 세므로
// 자르면 오래된 것이 안 세어져 횟수가 틀어진다.
function recentlySaid(state: EngineState): string[] {
  return state.full_dialogue_log
    .map((entry) => entry?.content || '')
    .filter(Boolean);
}

// 이 풀이 마지막으로 말한 다섯 번 안에 있으면 다시 쓰지 않는다.
const POOL_RECENT_USES = 5;

// 쏠림 없이 고르기.
//
// 지금까지는 `seed % pool.length` 였다. seed 가 턴 수라 겉보기엔 고르게
// 도는 것 같지만, 최근에 나온 것을 걸러 낸 **뒤의** 목록에 대고 나머지를
// 구하기 때문에 목록 길이가 매번 달라지고 같은 자리가 계속 뽑힌다. 120건을
// 돌려 세어 보니 헛다리 해소는 20쌍 중 상위 3쌍이 전체의 65%를 먹었고 2쌍은
// 한 번도 안 나왔다. 단계 돌파도 최다 21회 / 최소 0회였다.
//
// 그래서 두 가지를 본다.
//   1. **최근 5번** — 이 풀이 말한 마지막 다섯 번 안에 있으면 후보에서 뺀다.
//      전체 대화 몇 줄이 아니라 "이 풀 기준 다섯 번"이라, 자주 나오는 풀과
//      드물게 나오는 풀이 같은 규칙으로 돈다.
//   2. **전체 횟수** — 남은 후보 중 지금까지 이 사건에서 가장 적게 나온 것.
//
// 둘 다 대화 기록에서 세므로 따로 저장할 상태가 없다 — 화면에 실제로 찍힌
// 것만 세므로 기록과 어긋날 수가 없다. 사건이 바뀌면 횟수는 0부터 시작하고,
// 그때는 동률을 가르는 해시가 고른다(seed 에 턴 수와 행동 id 가 들어 있어
// 사건마다 다른 자리에서 시작한다).
// 횟수가 같을 때 누가 이기는가. 여기가 편향되면 어떤 대사는 영원히 안 나온다.
//
// 예전에는 `hashOf(`${seed}|${key}`)` 였다. hashOf 는 31 진법 다항식이라
// 그렇게 하면 결과가 **h(seed)·31^(키 길이) + (키 자신의 값)** 꼴이 되고,
// 길이가 같은 두 키는 차이가 seed 와 무관한 상수가 된다 — 짧은 쪽이 언제나
// 이긴다. EXCHANGE_DISCOVERY 의 `"이건 적어 둬."` 가 20,000번 중 31번만
// 이겼다(고르게 돌면 1,176번).
//
// 자리 번호도 같이 섞는다. 도입이 글자 그대로 같은 항목이 일곱 쌍 있다
// (긴 것 두 벌이 똑같이 `"안 나오네."` 로 여는 식). 키만 쓰면 언제나
// 앞엣것이 이겨서 뒤엣것은 한 번도 안 나온다 — 실제로 네 풀에서 일곱 개가
// 그렇게 죽어 있었다. 세는 쪽(count/recent)은 키 그대로다: 같은 도입이 한
// 사건에서 두 번 나오지 않게 하는 것은 그대로 두려는 것이다.
//
// murmur3 의 마무리 믹서. 곱셈이 32비트를 넘으므로 Math.imul 을 쓴다.
function tieBreak(seed: number, key: string, index: number): number {
  let h =
    (hashOf(key) ^
      Math.imul(seed, 0x9e3779b1) ^
      Math.imul(index, 0x85ebca6b)) >>>
    0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function chooseBalanced<T>(
  candidates: T[],
  keyOf: (item: T) => string,
  said: string[],
  seed: number,
): T | null {
  if (!candidates.length) return null;
  const keys = candidates.map(keyOf);
  const count = new Map<string, number>();
  const order: string[] = [];
  for (const line of said) {
    for (const key of keys) {
      if (!key || !line.includes(key)) continue;
      count.set(key, (count.get(key) || 0) + 1);
      order.push(key);
    }
  }
  const recent = new Set(order.slice(-POOL_RECENT_USES));
  const entries = candidates.map((item, index) => ({ item, index }));
  const fresh = entries.filter((entry) => !recent.has(keyOf(entry.item)));
  const from = fresh.length ? fresh : entries;

  let best = from[0];
  let bestCount = count.get(keyOf(best.item)) || 0;
  let bestTie = tieBreak(seed, keyOf(best.item), best.index);
  for (const entry of from.slice(1)) {
    const key = keyOf(entry.item);
    const used = count.get(key) || 0;
    const tie = tieBreak(seed, key, entry.index);
    if (used < bestCount || (used === bestCount && tie < bestTie)) {
      best = entry;
      bestCount = used;
      bestTie = tie;
    }
  }
  return best.item;
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

// 틀의 고정 부분 중 가장 긴 토막. 이미 나온 말을 찾는 열쇠로 쓴다.
function literalKey(template: string): string {
  return template
    .split(/\{[^}]*\}/)
    .map((part) => part.trim())
    .reduce(
      (longest, part) => (part.length > longest.length ? part : longest),
      '',
    );
}

// 틀에 {name} 같은 자리가 있으면 **채운 뒤의 문장은 매번 다르다.** 그대로
// 균형을 잡으면 "임소민 씨요? …" 와 "백도현 씨요? …" 가 서로 다른 말로
// 세어져, 같은 틀이 연달아 나와도 아무것도 막지 않는다. CASE290 실플레이
// 에서 임소민이 관계 질문 세 번에 「{roleQuoted} 것만 알고 지냈습니다.
// 사적으로는 아는 게 없어요.」를 그대로 세 번 되풀이한 것이 이것이다
// (수간호사·인턴 수의사·시설 관리인만 갈렸다).
//
// 그래서 **채우기 전의 틀로** 고르고, 무엇이 이미 나왔는지는 틀의 고정
// 부분으로 찾는다. 이 함수를 formatter 와 함께 쓰는 자리가 전부 같은 병을
// 앓고 있었다 — 서술 도입부(LEAD_*)도 이름만 바뀐 같은 문장이 연달아
// 나오고 있었다.
function pick(
  pool: string[],
  seed: number,
  recent: string[] = [],
  render: (template: string) => string = (template) => template,
): string {
  const chosen =
    chooseBalanced(pool, literalKey, recent, seed) ||
    pool[Math.abs(seed) % pool.length];
  return render(chosen);
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

// 물건을 전제하는 동작은 쓰지 않는다. 「탐정은 그것부터 집어 든다」가
// 울타리 철망과 회수 드럼에, 「무릎을 굽히고 들여다본다」가 처마 밑 걸이에
// 붙었다(2026-09-23 실플레이 로그) — 풀은 무엇을 살펴보는지 모른 채 뽑히므로,
// 어느 물건에 붙어도 틀리지 않는 동작만 남긴다.
const LEAD_INSPECT = [
  '탐정은 곧장 그쪽으로 다가간다.',
  '가까이 다가가 각도를 바꿔 본다.',
  '탐정은 잠깐 손을 멈추고 살핀다.',
  '손끝이 한 번 멈췄다가 다시 움직인다.',
  '한 발 물러섰다가 다시 다가선다.',
  '눈에 익을 때까지 한 번 더 본다.',
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

// 3인칭 행적 줄을 받는 자리. 이 문장 뒤부터는 대답이 아니라 기록이다.
const LEAD_ALIBI_TIMELINE = [
  '{name}의 말을 따라가면 그날 하루는 이렇게 된다.',
  '{topic} 시각을 하나씩 짚어 가며 그날의 자기 자리를 되짚는다.',
  '{topic} 기억나는 대로 시간을 앞뒤로 맞춰 본다.',
  '탐정의 수첩에 {name}의 그날이 시간 순으로 적힌다.',
  '{topic} 손가락을 꼽아 가며 시각을 세운다.',
];

// 시각이 붙은 행적이 나왔을 때. 한지우는 그 시각을 적어 둔다는 말까지만
// 하고, 그게 누구의 시각과 어긋나는지는 말하지 않는다.
const JIWOO_ALIBI_TIME = [
  '"시각 나왔어요. 그것만 따로 표시해 둘게요."',
  '"몇 시라고 하셨는지 한 번만 더 확인할게요."',
  '"이건 다른 분 말씀이랑 맞춰 보면 되겠네요."',
  '"수첩에 시간표가 한 줄 늘었습니다."',
  '"기억이 꽤 또렷하신데요. 좋은 뜻으로 말씀드리는 거예요."',
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

// 마스터가 그 짝을 쓰지 않았을 때의 대답. 세상에 대한 주장을 하지 않는
// 것이 규칙이다 — "둘은 아무 사이도 아니다"가 아니라 "제가 지금 드릴
// 말씀이 없다"여야 마스터와 어긋날 자리가 없다. 상대의 공개 직함({role})만
// 짚어서, 빈 대답이 아니라 짧은 대답으로 읽히게 한다.
const RELATION_NO_COMMENT = [
  '{roleCopula}. 여기서 얼굴 보는 사이고, 그 이상은 제가 드릴 말씀이 없네요.',
  '일로 마주칠 일이 있으면 마주치는 정도입니다.',
  '인사하고 지나가는 사이입니다. 그 이상은 저도 모릅니다.',
  '{roleQuoted} 것만 알고 지냈습니다. 사적으로는 아는 게 없어요.',
  '{name} 씨에 대해서는 제가 뭐라 말씀드릴 입장이 아닙니다.',
  '오가며 인사는 합니다. 그 이상 여쭤보시면 제가 답을 못 드려요.',
  '{roleQuoted} 것 말고는 제가 아는 게 별로 없습니다.',
];

// 한지우는 관계를 판단하지 않는다. 방금 나온 말의 결을 짚거나, 적어 둔다는
// 말만 한다.
// 「사이가 나쁘지 않았다는 말씀이시죠」는 뺐다 — 방금 나온 말이 험담일
// 때도 붙었다. 내용을 단정하는 줄은 여기 못 온다.
const JIWOO_RELATION = [
  '"이런 건 물어보면 다들 비슷하게 말씀하시더라고요."',
  '"좋게 말하는 게 예의인 자리이긴 하죠."',
  '"관계도부터 그려 둘까요. 나중에 헷갈리니까요."',
  '"저는 이름만 적었어요. 나머지는 탐정님이 보셨겠죠."',
  '"말씀은 짧은데 표정은 안 짧네요."',
];

// 반박이 풀어 주는 사실·진술의 본문. 어느 인물의 knows/initial_claims 든 id
// 로 찾는다 — 반박 문장이 부르는 id 는 그 사람 것일 수도, 남의 것일 수도 있다.
function statementContent(index: CaseIndex, id: string): string | null {
  for (const npc of Object.values(index.master.npcs)) {
    const fact = npc.knows.find((item) => item.factId === id);
    if (fact?.content) return fact.content;
    const claim = npc.initialClaims.find((item) => item.claimId === id);
    if (claim?.content) return claim.content;
  }
  return null;
}

// 가설 보드의 서술. 칸을 채우는 것은 수첩에 적는 일이라 조용하고, 들이대는
// 자리는 그 사람 반응이 앞에 선다. 반박·확정의 내용은 마스터 문장이다 —
// 여기 풀은 그 앞뒤 한 박자만 맡는다.
const LEAD_HYP_SET = [
  '수첩을 펼쳐 한 줄을 적는다.',
  '탐정은 수첩 한 칸을 채운다.',
  '지금까지의 것을 한 줄로 줄여 적는다.',
];

const JIWOO_HYP_SET = [
  '"적으신 거, 저도 옆에 옮겨 둘게요."',
  '"그 줄은 나중에 지우실 수도 있고요."',
  '"누구한테 들이대 볼지는 탐정님이 고르세요."',
  '"한 칸 채우셨네요. 아직 세 칸 남았고요."',
];

const JIWOO_HYP_CLEAR = [
  '"지우셨어요. 그것도 적어 둘게요 — 지운 것도 기록이니까요."',
  '"빈칸으로 돌아갔네요."',
];

// 반박할 말이 없는 사람의 부인 앞뒤. 정답을 들이댄 것인지 남의 몫인 오답을
// 들이댄 것인지 **여기서 갈리면 안 된다** — 그래서 한 풀이다.
const LEAD_HYP_DENY = [
  '{topic} 그 줄을 듣고 고개를 젓는다.',
  '{topic} 탐정이 내민 줄을 한 번 보고 되받는다.',
  '{topic} 잠깐 뜸을 들이다 대답한다.',
];

const JIWOO_HYP_DENY = [
  '"부인이네요. 이 줄은 그대로 두고요."',
  '"저 사람 입에서는 안 나오는 얘기인가 봐요."',
  '"지울 것도 얻은 것도 없어요. 다른 사람한테 물어보죠."',
  '"여기선 안 걸리네요."',
];

// 부인하면서 자기 말을 하나 남긴 턴 — 「누가」에 지목당한 사람의 되받는 말.
const JIWOO_HYP_DENY_HEARD = [
  '"아니라고는 하는데, 방금 말은 적어 둘게요."',
  '"부인은 부인이고, 저 말은 따로 접어 둡니다."',
  '"본인 말은 그렇다는 거고요. 맞는지는 카드가 말하겠죠."',
];

const LEAD_HYP_REFUTED = [
  '{topic} 그 말을 듣고 잠깐 말이 없다가, 고개를 든다.',
  '{topic} 그 가설을 끝까지 듣고 나서 한 마디로 받는다.',
  '{topic} 한숨을 한 번 쉬고 나서야 대답한다.',
  '{topic} 탐정이 내민 줄을 한참 보다가 입을 연다.',
];

const JIWOO_HYP_REFUTED = [
  '"그 줄은 지워야겠네요. 대신 하나 얻었고요."',
  '"틀렸는데 손해는 아니네요."',
  '"방금 나온 말, 그게 더 쓸모 있어 보여요."',
  '"한 갈래 접었습니다. 남은 갈래가 줄었어요."',
];

// 이름이 불렸는데 마스터가 준 반박이 없을 때 그 사람이 하는 말. 사건을
// 가리지 않아야 하므로 사건 안의 어떤 것도 부르지 않는다 — 부인 그 자체다.
const NPC_HYP_DENY = [
  '제가요? 아닙니다.',
  '아니라고 말씀드리는 것 말고 제가 드릴 게 없는데요.',
  '무슨 근거로 그렇게 보시는지부터 듣고 싶습니다.',
  '그렇게 보셨다면 제가 뭘 잘못 말씀드린 모양인데, 아닙니다.',
  '저를 그쪽에 놓고 보고 계셨군요. 아닙니다.',
  '아닙니다. 그 이상 어떻게 말씀드려야 할지 모르겠네요.',
  '제가 아니라는 걸 어떻게 보여 드려야 믿으실지 모르겠습니다.',
  '그건 제 이야기가 아닙니다.',
];

// 동기·시간·방법을 들이댔는데 그 사람이 반박할 말이 없을 때. 정답인지
// 남의 몫인 오답인지 여기서 갈리면 안 되므로 사건 안의 어떤 것도 부르지
// 않는다.
const NPC_HYP_DENY_OTHER = [
  '그건 제가 뭐라 말씀드릴 게 없네요.',
  '저한테 물으실 일은 아닌 것 같은데요.',
  '그렇게 보실 수도 있겠죠. 제가 아는 건 아니지만요.',
  '제가 아는 데서는 그런 얘기가 안 나옵니다.',
  '거기까지는 제가 모릅니다.',
  '그건 제 쪽 얘기가 아니라서요.',
];

// 부인만 받은 턴. 지운 것은 있고 얻은 것은 없다.
const JIWOO_HYP_REFUTED_BARE = [
  '"아니라는 말만 받았네요. 그래도 한 칸은 지웠습니다."',
  '"지웠어요. 얻은 건 없고요."',
  '"부인만 남았습니다. 이 줄은 접을게요."',
  '"근거를 더 모아야 할 것 같은데요. 지금은 여기까지고요."',
  '"틀린 건 확인했어요. 그게 전부지만요."',
];

// 보드에서 굳히려는데 받칠 카드가 없다. 정답·오답이 같은 말이다.
const LEAD_HYP_UNSUPPORTED = [
  '수첩의 그 줄에 밑줄을 그으려다 멈춘다.',
  '탐정은 그 줄과 손에 든 카드를 번갈아 본다.',
  '줄은 있는데 그 밑에 놓을 것이 없다.',
];

const JIWOO_HYP_UNSUPPORTED = [
  '"이 줄을 받칠 카드가 아직 없어요. 심증은 심증이고요."',
  '"손에 든 걸로는 안 굳어요. 더 돌아보죠."',
  '"적어 두는 건 자유인데, 굳히는 건 카드가 하는 거니까요."',
];

// 보드에서 굳혔다. 사람 앞이 아니라 수첩 앞이다 — 확정은 카드가 한다.
const LEAD_HYP_CONFIRMED = [
  '수첩의 그 줄 밑에 카드를 한 장 놓는다. 맞물린다.',
  '탐정은 그 줄에 밑줄을 긋는다.',
  '손에 든 것 하나가 그 줄을 받친다.',
];

const JIWOO_HYP_CONFIRMED = [
  '"이 칸은 굳었네요. 손에 든 카드가 이 줄이랑 맞물려요."',
  '"한 칸 끝. 다음 칸으로요."',
  '"방금 건 안 지워도 되겠어요."',
];

// 남을 지목할 때의 지문. 그 사람이 어떻게 그 말을 꺼내는지가 지목만큼
// 말해 준다 — 망설이는지, 기다렸다는 듯한지.
const LEAD_ACCUSE = [
  '{topic} 잠깐 말을 고르고 나서 입을 연다.',
  '{topic} 탐정을 한 번 보고 대답한다.',
];

const LEAD_ACCUSE_BY_KIND: Record<string, string[]> = {
  forthcoming: [
    '{topic} 기다렸다는 듯 몸을 앞으로 기울인다.',
    '{topic} 목소리를 낮추면서도 곧바로 대답한다.',
    '{topic} 주위를 한 번 보고 말한다.',
  ],
  courteous: [
    '{topic} 잠깐 망설이다가 조심스럽게 말한다.',
    '{topic} 이런 말을 해도 되나 하는 얼굴로 입을 연다.',
    '{topic} 한 박자 쉬고 대답한다.',
  ],
  procedural: [
    '{topic} 사실만 말하겠다는 투로 대답한다.',
    '{topic} 묻는 말에만 답하듯 짧게 말한다.',
    '{topic} 손에 든 것을 내려놓고 대답한다.',
  ],
  unruffled: [
    '{topic} 서두르지 않고 대답한다.',
    '{topic} 잠깐 웃는 듯하다가 말한다.',
    '{topic} 그럴 줄 알았다는 얼굴로 입을 연다.',
  ],
  guarded: [
    '{topic} 말할까 말까 하다가 결국 꺼낸다.',
    '{topic} 이건 제 생각일 뿐이라는 말을 먼저 붙인다.',
    '{topic} 한참 있다가 짧게 대답한다.',
  ],
  imperious: [
    '{topic} 물어봐 주기를 기다린 사람처럼 대답한다.',
    '{topic} 목소리를 낮추지 않고 말한다.',
    '{topic} 손가락으로 방향을 한 번 짚고 말한다.',
  ],
  skittish: [
    '{topic} 말해도 되는지 먼저 묻는 눈으로 탐정을 본다.',
    '{topic} 목소리가 작아진 채로 대답한다.',
    '{topic} 한 번 삼켰다가 말한다.',
  ],
};

// 그가 하는 것은 받아 적는 일이다. 누가 맞는지는 그의 몫이 아니다.
const JIWOO_ACCUSE = [
  '"{name} 씨라고 적어 둘게요. 말씀하신 분 이름도 같이요."',
  '"적었습니다. 이건 본 게 아니라 생각하신 거고요."',
  '"{name} 씨 이름이 또 나왔네요. 세어 두겠습니다."',
  '"그렇게 보신 이유까지 적어 둘게요."',
  '"이건 진술이 아니라 짐작이라고 표시해 두겠습니다."',
];

// 네 칸이 다 차는 순간 = 증거 제시가 열리는 순간이라, 2막 풀과 제시 풀을
// 합쳤다. 한때 「누가」 한 칸으로 제시를 열어 봤을 때는 두 자리가 달랐다.
const JIWOO_PRESENT_OPEN = [
  '"이제 수첩에 든 거, 저분한테 꺼내 놓으셔도 됩니다."',
  '"카드 꺼내실 거면 지금부터요. 받아 적는 건 제가 하고요."',
  '"여기서부터는 보여 주시는 쪽이 빠를 겁니다."',
  '"다 채우셨네요. 이제부터는 제가 받아 적기만 하면 되는 거죠."',
  '"이야기가 됐어요. 남은 건 저 사람이 그걸 듣는 거고요."',
];

const LEAD_ACT_TWO = [
  '네 칸이 다 찼다. 이제 남은 것은 그 사람 앞에 이것을 전부 늘어놓는 일뿐이다.',
  '수첩의 네 줄이 하나의 이야기가 된다. 남은 것은 그 이야기를 그 사람 얼굴 앞에서 읽는 것이다.',
];



// 균열이 나오는 자리의 도입. 공개용 대답을 이미 한 사람이 그 대답을 다시
// 하려다 마는 순간이다 — 새 사실을 말해 주는 것은 아래 private_strain 이고,
// 이 한 줄은 그 앞의 한 박자만 맡는다.
const LEAD_STRAIN = [
  '{topic} 이번에는 바로 대답하지 않는다.',
  '{role} 이름을 다시 꺼내자 {topic} 쥐고 있던 손을 편다.',
  '{topic} 아까 했던 말을 다시 시작했다가 그만둔다.',
  '{topic} 짧게 숨을 고르고, 아까 하지 않은 말을 한다.',
  '{topic} 대답하기 전에 문 쪽을 한 번 본다.',
  '{topic} 이제는 감출 이유가 없다는 얼굴로 탐정을 본다.',
];

// 한지우는 여기서도 판단하지 않는다. 앞 대답과 달라진 것을 짚거나, 적어
// 둔다고 말하거나, 아직 열려 있다는 것을 남긴다.
const JIWOO_STRAIN = [
  '"아까 하신 말씀이랑은 조금 다르네요. 둘 다 적어 둘게요."',
  '"먼저 말씀하시진 않았던 부분이고요."',
  '"이건 관계도 쪽에 적는 게 맞겠죠."',
  '"묻기 전까지는 안 나올 말이었네요."',
  '"탐정님, 이 줄은 밑줄 쳐 뒀어요."',
  '"사이가 나쁘지 않았다는 말도 여전히 맞을 수 있고요."',
];

const LEAD_ASK = [
  '{topic} 잠깐 말을 고른다.',
  '{topic} 한 박자 늦게 대답한다.',
  '{topic} 시선을 내렸다가 다시 든다.',
  '{topic} 기억을 더듬는 표정이다.',
  '{topic} 별다른 망설임 없이 대답한다.',
  '{topic} 하던 말을 끊고 이쪽을 본다.',
];

// 이름과 직함은 여기 없다. 소개 한 줄과 서술 사이를 비워 두려고 따로
// 내보내기 때문이다(2026-09 사용자 결정) — 셋이 한 문단에 붙어 있으면
// 누구를 만났는지가 동작 서술에 묻힌다.
const LEAD_FIRST_MEETING = [
  '탐정이 다가서자 하던 일을 멈춘다.',
  '이쪽을 한 번 보고는 자세를 고쳐 앉는다.',
  '말을 걸기 전부터 이미 이쪽을 의식하고 있었다.',
  '짧게 목례를 하고는 입을 연다.',
  '손에 쥔 것을 내려놓고 탐정 쪽으로 돌아선다.',
];

// 첫 자리에서 미뤄 둔 말이 나오는 자리. 몰아붙여서 나온 것이 아니므로
// LEAD_RELUCTANT 의 무게를 쓰지 않는다 — 생각났다는 듯, 덧붙이듯 나온다.
const LEAD_MORE_TO_SAY = [
  '{topic} 잠깐 생각하더니 한마디 더 붙인다.',
  '{name}의 말이 거기서 끝나지 않는다.',
  '{topic} 그러고 보니, 하는 얼굴로 말을 잇는다.',
  '{topic} 아까 하던 말을 다시 집어 든다.',
  '{topic} 한 박자 쉬고 덧붙인다.',
  '{topic} 묻기 전에 먼저 입을 연다.',
];

// Coming back to someone after their story has already been dented once.
const LEAD_RELUCTANT = [
  '{topic} 한참 말이 없다가, 결국 입을 연다.',
  '{topic} 탐정을 한 번 보고는 시선을 떨군다.',
  '{topic} 짧게 한숨을 쉰다.',
  '{topic} 주위를 한 번 살피고 목소리를 낮춘다.',
  '{topic} 더는 못 버티겠다는 듯 어깨를 내린다.',
];

// 카드가 먹혀서 이야기가 한 칸 물러서는 순간. 플레이어가 한참 걸려 모은
// 것을 내밀어 상대를 무너뜨린 자리인데, 여기가 갈래 없이 다섯 줄 공용이라
// 313건이 전부 같은 식으로 굳었다. **버티는 모습(PRESSURE_BRANCH)은
// 사람마다 다른데 무너지는 모습만 다 같았다** — 압박이 갈래별인데 돌파가
// 공용인 것이 앞뒤가 안 맞는다.
//
// 무너지는 방식은 그 사람이 무엇에 기대고 있었는지를 따라간다. 기록에
// 기대던 사람은 기록을 다시 들여다보고, 내려다보던 사람은 목소리가 낮아지고,
// 떨던 사람은 아예 멈춘다.
const LEAD_STAGE_BREAK_BY_KIND: Record<string, string[]> = {
  // 먼저 말하던 사람이 말을 멈추는 것 자체가 변화다.
  forthcoming: [
    '{name}의 말이 거기서 멎는다. 처음으로 먼저 입을 열지 않는다.',
    '{topic} 웃음기를 거두고 그것을 본다.',
    '{name}의 손이 무릎 위로 내려온다. 아까까지의 기세가 없다.',
    '{topic} 뭔가 더 말하려다 그만둔다.',
    '{name}의 목소리가 한 칸 작아진다.',
    '{topic} 입을 열었다가 다음 말을 찾지 못한다.',
    '{topic} 방금 전처럼 말을 이어 가지 못한다.',
    '{topic} 시선을 옮기며 설명하던 흐름을 놓친다.',
    '{name}의 손짓이 중간에서 멈춘다.',
    '{topic} 설명하려던 말을 삼키고 잠시 가만히 있는다.',
    '{topic} 처음으로 질문을 되묻는다.',
    '{topic} 한참 생각하다가도 바로 대답하지 못한다.',
    '{name}의 표정에서 방금 전의 여유가 사라진다.',
    '{topic} 더 설명하려다 탐정의 얼굴을 먼저 살핀다.',
    '{name}의 말이 짧아진다.',
    '{topic} 고개를 끄덕이려다 멈춘다.',
    '{topic} 입을 열고도 한동안 말을 잇지 못한다.',
    '{topic} 손을 움직이려다 그대로 내려놓는다.',
    '{name}의 시선이 질문과 그것 사이를 오간다.',
    '{topic} 방금까지 이어지던 설명을 끝맺지 못한다.',
    '{topic} 대답하기 전에 숨을 한 번 고른다.',
    '{topic} 웃으려다 표정을 거둔다.',
    '{name}의 말이 처음보다 조심스러워진다.',
    '{topic} 무엇을 더 말해야 할지 잠시 생각한다.',
    '{topic} 결국 하려던 말을 삼킨다.',
    '{name}의 말이 다음 장면으로 넘어가지 못한다.',
    '{topic} 방금까지 이어지던 설명을 멈춘다.',
    '{topic} 입을 열었다가 말을 고른다.',
    '{topic} 더 덧붙이려던 말을 삼킨다.',
    '{name}의 손짓이 허공에서 멈춘다.',
    '{topic} 질문을 다시 확인하듯 눈을 움직인다.',
    '{topic} 한동안 대답 대신 탐정을 바라본다.',
    '{topic} 처음으로 먼저 설명을 이어 가지 않는다.',
    '{name}의 말이 짧게 끊어진다.',
    '{topic} 대답하려다 잠시 고개를 숙인다.',
    '{topic} 방금 전의 말을 다시 생각한다.',
    '{topic} 입술을 열었다가 조용히 다문다.',
    '{name}의 시선이 한곳에 오래 머문다.',
    '{topic} 더 말하려던 기색을 거둔다.',
    '{topic} 한 번 숨을 삼키고 말을 멈춘다.',
    '{topic} 질문을 듣고 한동안 움직이지 않는다.',
    '{name}의 목소리가 이전보다 낮아진다.',
    '{topic} 설명하던 손을 천천히 내린다.',
    '{topic} 대답을 시작하려다 멈춘다.',
    '{topic} 한동안 아무 말 없이 그것을 바라본다.',
    '{topic} 스스로 말을 정리하지 못한 채 침묵한다.',
    '{topic} 시선을 옮겼다가 다시 그것으로 돌아온다.',
    '{name}의 말끝이 흐려진다.',
    '{topic} 다음 말을 고르느라 시간이 걸린다.',
  ],
  courteous: [
    '{name}의 표정이 한 번에 굳는다.',
    '{name}의 말이 중간에서 끊긴다.',
    '{topic} 그것을 한참 내려다본다. 대답이 늦어진다.',
    '{name}의 손끝이 멈춘다. 앞서 하던 말과 이어지지 않는다.',
    '{topic} 숨을 한 번 고르고 나서야 다시 입을 연다.',
    '{topic} 고개를 들지 못한다.',
    '{topic} 잠시 말을 멈추고 눈앞의 증거를 다시 확인한다.',
    '{name}의 표정에서 당황한 기색이 선명해진다.',
    '{topic} 방금까지 이어 가던 설명을 처음부터 되짚는다.',
    '{name}의 손이 얌전히 놓여 있던 자리에서 움직이지 않는다.',
    '{topic} 대답하기 전에 긴 숨을 한 번 내쉰다.',
    '{topic} 한동안 아무 말 없이 탐정의 말을 듣는다.',
    '{name}의 목소리가 처음으로 흔들린다.',
    '{topic} 대답을 고르다가 결국 아무 말도 하지 않는다.',
    '{topic} 그것을 보고도 바로 말하지 못한다.',
    '{topic} 방금 한 말을 스스로 되짚다가 멈춘다.',
    '{name}의 어깨에서 힘이 빠진다.',
    '{topic} 성실하게 이어 가던 말이 거기서 끊긴다.',
    '{name}의 손이 무릎 위에서 굳는다.',
    '{topic} 미안하다는 듯 고개를 숙인다.',
    '{name}의 대답이 처음으로 늦어진다.',
    '{topic} 눈을 한 번 감았다가 뜬다.',
    '{name}의 표정이 천천히 바뀐다.',
    '{topic} 뭐라고 말해야 할지 몰라 잠시 가만히 있는다.',
    '{name}의 입술이 잠시 벌어졌다가 다시 다물린다.',
    '{topic} 탐정의 얼굴을 한 번 보고 시선을 내린다.',
    '{name}의 말이 끝맺지 못한 채 남는다.',
    '{topic} 자세를 고쳐 앉으려다 그대로 멈춘다.',
    '{name}의 목소리가 평소보다 작게 나온다.',
    '{topic} 한참 만에야 겨우 입을 연다.',
  ],
  // 기록에 기대던 사람은 기록으로 돌아간다. 거기 없다는 걸 알면서도.
  procedural: [
    '{topic} 그것을 두 번 읽는다. 두 번째에는 더 느리게 읽는다.',
    '{name}의 손이 서류를 넘기다 멈춘다.',
    '{topic} 날짜를 확인하듯 시선을 옮겼다가, 확인할 것이 없다는 걸 안다.',
    '{name}의 대답이 처음으로 기록에서 시작하지 않는다.',
    '{topic} 숫자를 말하려다 만다.',
    '{name}의 말투에서 절차가 빠진다.',
    '{topic} 기록을 찾듯 시선을 옮기지만 손이 움직이지 않는다.',
    '{name}의 손끝이 표 위에서 멈춘다.',
    '{topic} 시간을 다시 확인하려다 말을 멈춘다.',
    '{topic} 방금 말한 순서를 스스로 되짚는다.',
    '{topic} 숫자를 이어 말하지 못한다.',
    '{name}의 대답에서 확인과 추정의 구분이 사라진다.',
    '{topic} 서류를 내려다본 채 한동안 말이 없다.',
    '{topic} 처음으로 기록을 근거로 들지 않는다.',
    '{topic} 날짜와 시간을 맞추려다 시선을 멈춘다.',
    '{name}의 손이 펜을 잡은 채 움직이지 않는다.',
    '{topic} 방금까지 설명하던 절차를 끝맺지 못한다.',
    '{name}의 말이 업무 설명에서 개인적인 설명으로 바뀐다.',
    '{topic} 숫자를 다시 세려다 포기한다.',
    '{name}의 목소리에서 단정적인 말투가 사라진다.',
    '{topic} 기록의 다음 줄을 찾지 못한다.',
    '{topic} 대답하기 전에 서류를 한 번 더 확인한다.',
    '{topic} 순서를 설명하려다 중간에서 멈춘다.',
    '{name}의 손이 서류 가장자리를 만지작거린다.',
    '{topic} 확인해야 할 항목을 떠올리다가 말을 잇지 못한다.',
    '{name}의 대답이 처음으로 모호해진다.',
    '{topic} 시간 대신 다른 이야기를 꺼내려다 입을 다문다.',
    '{topic} 방금 전의 설명을 수정하려 한다.',
    '{topic} 기록을 기준으로 답하려다 한참 늦어진다.',
    '{name}의 말에서 절차라는 기준이 빠진다.',
  ],
  // 여유가 밑천이던 사람. 여유가 먼저 빠지고 그 자리가 빈다.
  unruffled: [
    '{name}의 여유가 그 자리에서 빠진다.',
    '{topic} 처음으로 서두른다.',
    '{name}의 말이 느려지다가 아예 멈춘다.',
    '{topic} 웃으려다 실패한다.',
    '{name}의 시선이 그것에 붙은 채 떨어지지 않는다.',
    '{topic} 한참을 그대로 앉아 있는다.',
    '{topic} 대답할 말을 고르느라 침묵한다.',
    '{topic} 손에 들고 있던 것을 천천히 내려놓는다.',
    '{name}의 평소보다 느긋하던 표정이 사라진다.',
    '{topic} 잠시 시선을 피했다가 다시 본다.',
    '{topic} 처음으로 질문을 되묻는다.',
    '{topic} 대답하기 전에 한참을 생각한다.',
    '{name}의 손이 움직임을 멈춘다.',
    '{topic} 아무렇지 않은 표정을 유지하려다 실패한다.',
    '{topic} 한숨을 짧게 내쉰다.',
    '{topic} 방금 전과 다른 속도로 말하기 시작한다.',
    '{name}의 시선이 한곳에 오래 머문다.',
    '{topic} 웃음 없이 고개만 끄덕인다.',
    '{topic} 말을 이어 가려다 잠시 멈춘다.',
    '{topic} 처음으로 자세를 고쳐 앉는다.',
    '{name}의 대답 사이에 긴 침묵이 생긴다.',
    '{topic} 손가락으로 책상을 두드리다 멈춘다.',
    '{topic} 방금 전의 말을 다시 떠올리는 듯 입을 다문다.',
    '{topic} 시선을 내린 채 대답을 고른다.',
    '{name}의 목소리가 평소보다 낮아진다.',
    '{topic} 한동안 아무 말 없이 그것을 본다.',
  ],
  // 선을 긋던 사람은 그을 선이 없어진다.
  guarded: [
    '{topic} 그것에서 눈을 떼지 못한다. 선을 그을 자리가 없다.',
    '{name}의 부인이 문장 중간에서 끊긴다.',
    '{topic} 팔짱을 푼다.',
    '{name}의 어깨가 한 번에 내려간다.',
    '{topic} 아니라고 말하려다 입을 다문다.',
    '{topic} 대답할 말을 찾지 못한다.',
    '{topic} 시선을 피하려다 다시 그것을 본다.',
    '{name}의 짧던 대답이 중간에서 멈춘다.',
    '{topic} 더 묻지 말라는 듯하던 표정이 사라진다.',
    '{topic} 처음으로 침묵을 길게 가져간다.',
    '{topic} 입을 열었다가 질문을 그대로 받아들인다.',
    '{name}의 손이 가만히 멈춘다.',
    '{topic} 방금 전과 달리 시선을 오래 유지한다.',
    '{topic} 하려던 말을 끝내지 못한다.',
    '{topic} 한숨을 내쉬고 고개를 숙인다.',
    '{name}의 대답이 한 단어로 끝난다.',
    '{topic} 질문을 피하려던 시선이 멈춘다.',
    '{name}의 자세가 조금 굳는다.',
    '{topic} 더는 선을 그을 수 없다는 듯 가만히 있는다.',
    '{topic} 방금 한 말을 되돌아본다.',
    '{topic} 입술을 다물고 한동안 대답하지 않는다.',
    '{name}의 목소리가 평소보다 낮아진다.',
    '{topic} 반박하려다 말을 고른다.',
    '{topic} 처음으로 먼저 설명을 덧붙인다.',
    '{topic} 시선을 내리고 조용히 대답한다.',
    '{topic} 더 이상 말을 잇지 않는다.',
    '{topic} 그것을 본 뒤 입을 다문다.',
    '{name}의 표정이 굳은 채 움직이지 않는다.',
    '{topic} 짧게 대답하려던 입이 멈춘다.',
    '{topic} 시선을 피했다가 다시 돌린다.',
    '{topic} 방금 전의 단호한 태도가 흐려진다.',
    '{name}의 손이 천천히 내려간다.',
    '{topic} 더 묻지 말라는 표정을 짓지 못한다.',
    '{topic} 대답하기 전에 한참을 생각한다.',
    '{topic} 눈을 내리깔고 아무 말이 없다.',
    '{name}의 입술이 잠깐 굳게 다물린다.',
    '{topic} 반박할 말을 찾다가 침묵한다.',
    '{topic} 처음으로 질문을 피하지 않고 바라본다.',
    '{topic} 대답을 미루려다 결국 고개를 든다.',
    '{name}의 자세가 이전보다 작아진다.',
    '{topic} 그것을 내려놓고 손을 가만히 둔다.',
    '{topic} 방금 한 말의 끝을 다시 생각한다.',
    '{topic} 짧은 부인을 하려다 말을 멈춘다.',
    '{name}의 시선이 바닥에 머문다.',
    '{topic} 더 이상 선을 긋지 못한 채 서 있다.',
    '{topic} 한숨처럼 짧게 숨을 내쉰다.',
    '{topic} 질문을 피하려던 표정이 사라진다.',
    '{name}의 대답 사이에 긴 침묵이 생긴다.',
    '{topic} 입을 다문 채 한동안 그것을 바라본다.',
  ],
  // 내려다보던 사람은 높이를 잃는다.
  imperious: [
    '{name}의 목소리가 한 톤 낮아진다.',
    '{topic} 처음으로 이쪽을 올려다본다.',
    '{name}의 말끝에서 힘이 빠진다.',
    '{topic} 반박하려고 입을 열었다가 닫는다.',
    '{name}의 자세가 무너진다.',
    '{topic} 질문을 다시 읽듯 그것을 바라본다.',
    '{topic} 대답할 말을 찾느라 잠시 멈춘다.',
    '{topic} 방금 전의 자신감이 사라진다.',
    '{name}의 손이 팔걸이에서 떨어진다.',
    '{topic} 더는 말을 끊지 않고 듣는다.',
    '{topic} 입을 열었다가 짧게 숨을 내쉰다.',
    '{topic} 시선을 피하지 못한다.',
    '{name}의 말이 단정적인 문장에서 멈춘다.',
    '{topic} 처음으로 대답을 서두르지 않는다.',
    '{topic} 반박할 말을 고르다가 침묵한다.',
    '{topic} 손에 힘을 주었다가 천천히 푼다.',
    '{name}의 목소리가 평소보다 작아진다.',
    '{topic} 방금 한 말을 다시 확인한다.',
    '{topic} 질문을 끊지 않고 끝까지 듣는다.',
    '{topic} 고개를 들고도 바로 말하지 못한다.',
    '{name}의 표정에서 여유가 사라진다.',
    '{topic} 한동안 아무 말 없이 그것을 바라본다.',
    '{topic} 결국 짧게 대답하고 입을 다문다.',
    '{topic} 더 설명하려다 말을 멈춘다.',
    '{name}의 자세가 조금씩 굳는다.',
    '{topic} 반박하려던 말을 삼킨다.',
    '{topic} 처음으로 대답을 바로 내놓지 못한다.',
    '{name}의 손이 허공에서 멈춘다.',
    '{topic} 질문을 듣고 고개를 들지 못한다.',
    '{name}의 표정이 굳어 버린다.',
    '{topic} 설명하려던 문장을 끝맺지 못한다.',
    '{topic} 잠시 말을 잃는다.',
    '{topic} 방금 전의 단정적인 말투가 사라진다.',
    '{name}의 시선이 그것에 머문다.',
    '{topic} 대답 대신 짧게 숨을 내쉰다.',
    '{topic} 반박할 말을 찾다가 입을 다문다.',
    '{topic} 처음으로 질문을 끝까지 듣는다.',
    '{name}의 목소리가 한층 낮아진다.',
    '{topic} 손짓을 멈추고 가만히 있는다.',
    '{topic} 자신의 말을 다시 확인하듯 중얼거린다.',
    '{topic} 자신 있게 말하려다 멈춘다.',
    '{name}의 자세가 눈에 띄게 굳어진다.',
    '{topic} 질문을 다시 보며 말을 고른다.',
    '{topic} 더 이상 말을 끊지 않는다.',
    '{name}의 말끝에서 확신이 빠진다.',
    '{topic} 반박하려던 표정이 사라진다.',
    '{topic} 결국 짧은 대답만 남긴다.',
    '{topic} 다음 말을 이어 가지 못한다.',
  ],
  // 이미 떨던 사람. 더 갈 데가 없어서 멈춘다.
  skittish: [
    '{name}의 말이 아예 멈춘다.',
    '{topic} 손으로 얼굴을 한 번 쓸어내린다.',
    '{name}의 눈이 그것과 탐정 사이를 몇 번 오간다.',
    '{topic} 뭐라고 대답해야 할지 모르는 얼굴이다.',
    '{name}의 어깨가 떨린다.',
    '{topic} 입을 열었다가 아무 말 없이 닫는다.',
    '{topic} 손을 꼭 맞잡는다.',
    '{topic} 시선을 바닥으로 내린 채 움직이지 않는다.',
    '{name}의 목소리가 더 작아진다.',
    '{topic} 질문을 다시 들은 듯 눈을 크게 뜬다.',
    '{name}의 손끝이 떨린다.',
    '{topic} 탐정을 보려다 시선을 피한다.',
    '{topic} 한참 동안 대답하지 못한다.',
    '{topic} 입술을 깨물었다가 놓는다.',
    '{name}의 말이 중간에서 끊긴다.',
    '{topic} 방금 한 말을 되짚듯 고개를 숙인다.',
    '{topic} 대답 대신 짧게 숨을 내쉰다.',
    '{topic} 눈을 감았다가 천천히 뜬다.',
    '{name}의 손이 허공에서 멈춘다.',
    '{topic} 뭐라고 말할지 찾는 듯 입술만 움직인다.',
    '{topic} 질문을 피하지 못하고 그대로 듣는다.',
    '{topic} 시선이 한곳에 붙은 채 움직이지 않는다.',
    '{name}의 고개가 조금 더 숙여진다.',
    '{topic} 대답을 시작하려다 목소리가 나오지 않는다.',
  ],
};

const LEAD_STAGE_BREAK = LEAD_STAGE_BREAK_BY_KIND.courteous;

// 「이 카드가 증명하지 **않는** 것」. 마스터의 `does_not_prove` 를 그대로 문장에
// 앉힌다 — 2,526개 중 1,753개가 「누가 닦았는지」처럼 `~는지` 로 끝나는 명사구라
// 아래 틀에 그냥 들어간다. 5%(133개)는 이미 「…직접 증명하지는 않는다」 같은
// 완결 문장이라 틀에 안 넣고 그대로 쓴다.
//
// 왜 넣었나: 카드 한 장이 곧 결론이 되면 사건이 일직선이 된다. 증거 2,604장 중
// `proves` 가 둘 이상인 것이 39장(1%)이라, 카드는 사실 하나를 증명하고 진범
// 쪽으로 한 칸 가는 화살표였다. 「거기 있었다는 건 되는데 밀었다는 건 안 된다」
// 는 선이 그어져야 플레이어가 카드 한 장으로 사람을 지목하지 않는다. 그 선이
// 마스터에 96% 쓰여 있었는데 화면이 말한 적이 없다.
//
// 대사가 아니라 서술인 것은, 뜻에 대한 판단은 탐정 몫인데(한지우는 물건에
// 반응하고 뜻에는 반응하지 않는다) 이 자리에서 탐정이 입을 열면 상대 앞이라
// 존댓말이어야 하고, 그러면 혼잣말인지 상대에게 하는 말인지가 흐려지기
// 때문이다. 서술로 두면 이 턴의 목소리 수가 그대로다 — 인물이 거절하고,
// 그 선이 그어지고, 두 사람이 받는다.
const LEAD_NOT_PROVEN = [
  '{cardTopic} {body}까지 말해 주지는 않는다.',
  '{bodyTopic} 이 한 장으로는 알 수 없다.',
  '{cardTopic} 거기까지다. {bodyTopic} 아직 빈칸이다.',
  '{bodyTopic} 이것만으로는 못 정한다.',
  '{cardSubject} 말해 주는 것은 거기까지다. {bodyTopic} 그 다음 문제다.',
];

// 완결 문장으로 쓰인 것(「누가 조작했는지 직접 증명하지는 않는다」)은 앞에
// 카드 이름만 세워 준다.
const LEAD_NOT_PROVEN_SENTENCE = [
  '{cardTopic} 거기까지다. {body}.',
  '{cardTopic} 그 이상은 아니다. {body}.',
];

const NOT_PROVEN_SENTENCE = /(다|요)$/;

// 이 턴에 내민 카드 중 아직 선을 안 그은 것 하나. 카드마다 한 번만 나온다 —
// 같은 카드를 다섯 사람에게 내밀면서 같은 문장을 다섯 번 읽게 할 이유가 없다.
function notProvenLine(
  cards: EngineCard[],
  state: EngineState,
  seed: number,
  recent: string[],
): { cardId: string; text: string } | null {
  for (const card of cards) {
    if (done(state, `notproven|${card.id}`)) continue;
    const raw = (card.does_not_prove_fact_ids || [])
      .map((item) => (item || '').trim())
      .find(Boolean);
    if (!raw) continue;
    const body = raw.replace(/[.。]\s*$/, '').trim();
    if (!body) continue;
    const pool = NOT_PROVEN_SENTENCE.test(body)
      ? LEAD_NOT_PROVEN_SENTENCE
      : LEAD_NOT_PROVEN;
    const text = pick(pool, seed, recent, (template) =>
      template
        .replace(/{cardTopic}/g, withTopic(card.title))
        .replace(/{cardSubject}/g, withSubject(card.title))
        .replace(/{bodyTopic}/g, withTopic(body))
        .replace(/{body}/g, body),
    );
    if (text) return { cardId: card.id, text };
  }
  return null;
}

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
  '{topic} 되레 탐정을 빤히 본다. "제가 뭘 잘못 말했나요?"',
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

// 모자란 것을 전부 이미 들고 있을 때. 위 풀과 달리 **장 수를 빼먹지 않는다** —
// 142번 턴에서 나온 「지금 건 버렸다고 적지 않을게요」에는 숫자가 없어서
// 플레이어가 한 장 남았다는 것조차 몰랐다. 「수첩 안」이라는 말이 이 풀의
// 내용이다: 찾으러 갈 데가 없다는 것. 어느 장인지는 말하지 않는다.
const JIWOO_PARTIAL_HELD = [
  '"수첩에 있는 것 중에 아직 안 내민 게 {count} 있어요."',
  '"{count} 더요. 새로 찾을 건 아니고, 이미 들고 계신 것 중에서요."',
  '"지금 들고 계신 걸로 되는데, {count}이 빠졌어요."',
  '"찾으러 갈 데는 없어요. 수첩 안에서 {count} 고르시면 돼요."',
  '"방향은 맞아요. 손에 든 것 중에 {count} 더 놓아 보세요."',
  '"{count} 모자라요. 그리고 그건 이미 저희 손에 있어요."',
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

// 방의 온도나 냄새를 단정하는 줄은 쓰지 않는다 — 「여기는 좀 춥네요」가
// 5월 아침 벌밭에 붙었다(CASE001 실플레이). 어느 방에 붙어도 참인 것만.
const JIWOO_ARRIVAL = [
  '"먼지 냄새가 다르네요. 그건 저도 알겠어요."',
  '"들어오자마자 다 뒤지실 거 아니죠?"',
  '"자리는 바뀌었는데 표정은 그대로네요."',
  '"여기 있는 것들, 일단 눈으로만 세어 볼게요."',
  '"신발 조심해요. 아까 그 얼룩 또 밟으면 제가 못 본 척 못 해요."',
  '"문 닫을까요? 소리가 다 새어 나가는데."',
  '"저는 여기 서 있을게요. 동선 안 밟으려고요."',
  // 「방금 누가 나간 것 같은데」가 여기 있었다 — 오프라인에서 인물은
  // present_location 에 붙박이고(한지우가 데려오는 것만 예외라 그때는
  // 도착 서술이 따로 붙는다) 방을 드나들지 않으므로, 한지우가 일어나지
  // 않은 일을 본 것이 된다. 방의 결을 말하는 다른 줄로 바꿨다.
  '"어디부터 보실지는 정하셨죠?"',
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

// 탁자 위에 한 장씩. 제목 뒤에 그 카드가 말하는 시각이 있으면 같이 짚는다 —
// 시각이 곧 단서인 게임에서 같은 시각이 서로 다른 카드에서 겹쳐 보이는 것이
// 플레이어가 스스로 알아채는 순간이다.
const CALLOUT_TIME = /(\d{1,2}시(?:\s?\d{1,2}분)?|\d{1,2}:\d{2})/g;

// 탁자 위에 한 장씩. GM 이 목록을 읽어 주는 대신 탐정이 꺼내면서 시각을
// 소리 내어 말한다 — 같은 시각이 서로 다른 카드에서 겹쳐 보이는 것이
// 플레이어가 스스로 알아채는 순간이고, 목록은 그 순간을 못 만든다.
//
// 따옴표 줄은 화면에서 대사로 조판되는데, 바로 앞뒤 서술이 매번 "탐정이"로
// 시작하므로 누가 말하는지가 흐려지지 않는다. 시각이 없는 카드는 조용히
// 놓기만 한다 — 없는 시각을 지어내느니 서술만 남는 편이 낫다.
const LAYOUT_CONNECTORS = [
  ['탐정이 먼저', '다음은', '그리고', '마지막으로'],
  ['탐정은 먼저', '그 옆에', '이어서', '끝으로'],
];

function evidenceLayout(cards: EngineCard[], seed: number): string[] {
  const words = LAYOUT_CONNECTORS[Math.abs(seed) % LAYOUT_CONNECTORS.length];
  const lines: string[] = [];
  for (const [index, card] of cards.entries()) {
    // 처음과 끝에만 연결어를 준다. 가운데까지 붙이면 "그 옆에"가 다섯 번
    // 이어져 장면이 아니라 물품 목록이 된다 — 제목만 놓이는 쪽이 한 장씩
    // 내려놓는 소리에 가깝다. 두 장뿐이면 둘째가 끝이라 연결어를 받는다.
    const last = index === cards.length - 1;
    lines.push(
      index === 0
        ? `${words[0]} ${withObject(card.title)} 탁자 위에 꺼내 놓는다.`
        : last
          ? `${words[2]} ${card.title}.`
          : `${card.title}.`,
    );
    // 한 카드에 시각이 둘이면 둘 다 읽는다 — 「5시 차단, 6시 10분 복구」를
    // 「5시」만 읊으면 반쪽이고, 뒤에 공백이 따라와 "5시 ." 이 됐다(CASE013).
    const times = [...(card.summary || '').matchAll(CALLOUT_TIME)]
      .map((m) => m[1].trim())
      .filter((t, i, arr) => arr.indexOf(t) === i);
    if (times.length) lines.push(`"${times.join(', ')}."`);
  }
  return [lines.join('\n'), pick(DETECTIVE_BREAK, seed, [])];
}

// 탐정의 읽기. 소설 쪽에는 있고 게임에는 없던 것 — "그건 부정이 아니었다.
// 정보의 범위를 확인하는 질문이었다" 같은, 방금 벌어진 일을 탐정이 어떻게
// 읽는지.
//
// 격언 풀을 무작위로 뿌리면 반드시 상황과 어긋난다. 열 번째 단서에서 "처음
// 나온 게 제일 위험하다"고 하거나, 상대가 부정한 적도 없는데 "저건 부정이
// 아니다"라고 하면 캐릭터가 아니라 포춘쿠키가 된다. 그래서 줄마다 이번 턴에
// 엔진이 증명할 수 있는 사실을 조건으로 건다 — 정말 첫 증거일 때만, 정말
// 상대가 되물었을 때만.
//
// 나가는 자리는 탐정 대사 칸이 비어 있는 턴뿐이다. 단계를 깨는 턴에는 이미
// 다그치는 말이 있고, 무언가 찾은 턴에는 한지우와의 주고받기가 있다. 남는
// 것은 시치미를 맞은 턴, 헛수고한 턴처럼 지금 가장 밋밋한 자리들이고,
// 채워야 할 곳도 정확히 거기다.
//
// 드문 상황(첫 증거)은 그대로 나가고, 흔한 상황은 seed 로 3턴에 한 번쯤만
// 나가게 둔다. 매번 읊으면 그것대로 잡음이다.
function detectiveInsight(
  turn: OfflineTurn,
  seed: number,
  recent: string[],
): string | null {
  const gm = turn.gm;
  const inInterview = Boolean(gm.scene.interview_character_id);
  const occasionally = Math.abs(seed) % 3 === 0;

  // 상대가 대답 대신 되물었다. 이번 턴에 실제로 찍힌 글자를 보고 판정하므로
  // "되묻지도 않았는데 되물었다고 말하는" 일이 없다.
  if (inInterview && occasionally && /[?？]/.test(gm.message)) {
    return pick(INSIGHT_ASKED_BACK, seed, recent);
  }

  if (
    gm.presented_evidence.length &&
    gm.presented_evidence_outcome === 'no_change'
  ) {
    // 맞는 패인데 안 열렸다 — 짝이 모자란 것이지 틀린 것이 아니다.
    if (
      occasionally &&
      gm.presented_evidence.some((item) => item.match_quality === 'hit')
    ) {
      return pick(INSIGHT_RIGHT_CARD_HELD, seed, recent);
    }
    // 전부 이 사람과 무관했다.
    if (
      occasionally &&
      gm.presented_evidence.every((item) => item.match_quality === 'irrelevant')
    ) {
      return pick(INSIGHT_WRONG_DOOR, seed, recent);
    }
  }

  // 뒤졌는데 아무것도 없었다.
  if (
    occasionally &&
    turn.completedActions.some((action) => action.startsWith('probe|'))
  ) {
    return pick(INSIGHT_NOTHING_THERE, seed, recent);
  }

  return null;
}

const INSIGHT_ASKED_BACK = [
  '"방금 건 부정이 아니야. 내가 어디까지 아는지 재는 거지."',
  '"대답 대신 질문이 왔잖아. 그것도 대답이야."',
  '"묻는 쪽이 바뀌면 바뀐 이유가 있어."',
];

const INSIGHT_RIGHT_CARD_HELD = [
  '"패는 맞아. 아직 다 안 꺼냈을 뿐이지."',
  '"한 장으로 무너지는 사람은 없어."',
  '"버티는 건 버틸 만하니까 버티는 거야."',
];

const INSIGHT_WRONG_DOOR = [
  '"이 사람한테 저건 그냥 종이야."',
  '"엉뚱한 데를 두드리고 있었네."',
  '"내 쪽이 헛다리였어. 그것도 알아낸 거고."',
];

const INSIGHT_NOTHING_THERE = [
  '"없다는 것도 적어 둬. 나중에 그게 줄여 줘."',
  '"찾는 것보다 없는 걸 확인하는 데 시간이 더 들어."',
  '"여기까지는 아니라는 게 방금 확실해졌잖아."',
];

// 무언가 찾은 순간의 주고받기. 이 게임에서 두 사람이 가장 사람처럼 구는
// 자리인데, 지금까지는 각자 한 마디씩 던지고 끝났다 — 탐정 대사가 언제나
// 한지우보다 먼저 나왔으므로 구조적으로 받아칠 수가 없었다.
//
// 짝으로 쓴다. lead 가 누가 먼저 여는지를 정한다: 탐정이 지시하고 한지우가
// 되받는 박자("손전등 말고 수첩." / "둘 다 들고 있었거든요.")와, 한지우가 찌르고 탐정이
// 받아치는 박자("적어 뒀어요. 무슨 의미인지는 안 물어볼게요." / "알면
// 재미없잖아.") 둘 다 있어야 관계가 한 방향으로 굳지 않는다.
//
// 말투 비대칭은 그대로다 — 탐정은 반말, 한지우는 반존대. 한지우는 여기서도
// 판단하지 않는다: 방금 벌어진 것을 되짚거나 핀잔을 줄 뿐, 다음에 무엇을
// 볼지는 말하지 않는다.
//
// 한 번뿐인 과거 사건을 대사에 넣지 않는다. "어제 우산은 못 찾으셨으면서"가
// 그랬다 — 이 줄이 311건에 돌아가면서 탐정은 매 사건마다 어제 우산을 잃어버린
// 사람이 됐다. 사건은 매번 새로 시작하는데 대사가 그 사건의 어제를 못 박아
// 버린 것이다. 둘이 오래 같이 일했다는 데서 나오는 습관("탐정님 펜은 늘
// 제가 찾아드리는데")이나 한지우 자신의 배경("제가 회사 다닐 때")은 매번 참이므로
// 괜찮다 — 어긋나는 것은 일회성 사건이지 관계의 이력이 아니다.
type BanterPair = {
  lead: 'detective' | 'jiwoo';
  jiwoo: string;
  detective: string;
};

const BANTER_DISCOVERY: BanterPair[] = [
  // 한지우가 먼저.
  {
    lead: 'jiwoo',
    jiwoo:
      '"적어 뒀어요. 무슨 의미인지는 안 물어볼게요, 어차피 말 안 해 주실 거."',
    detective: '"알면 재미없잖아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"표정 관리 좀 하세요. 벌써 다 아는 사람 얼굴인데요."',
    detective: '"아직 몰라. 내 얼굴만 아는 건가 보지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"...하나 나왔네요. 저는 아직 아무 말도 안 했습니다."',
    detective: '"얼굴로 다 해놓고 무슨."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"찾으셨네요. 축하는 이따 하고요."',
    detective: '"이따가 언제."',
  },
  {
    lead: 'jiwoo',
    jiwoo:
      '"이런 건 또 잘 찾으시네요. 탐정님 펜은 늘 제가 찾아드리는데 말이죠."',
    detective: '"펜은 원래 찾으라고 있는 거야."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"사진부터 찍을게요. 손은 그 다음에 대시고요."',
    detective: '"알아. 너 없을 때도 그렇게 해."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이런 날 커피값은 탐정님이 내는 겁니다."',
    detective: '"찾은 건 난데."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"모른 척할까요, 아니면 놀라는 시늉이라도 해 드려요?"',
    detective: '"놀라는 쪽으로. 기왕이면 크게."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그거 원래 거기 있던 건 아니죠. 저도 그 정도는 알아요."',
    detective: '"그 정도면 충분해."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"...이건 그냥 넘기면 안 되겠네요."',
    detective: '"안 넘겨. 그러려고 온 거야."',
  },
  // 탐정이 먼저.
  {
    lead: 'detective',
    detective: '"한지우."',
    jiwoo: '"네, 봤어요. 적고 있고요."',
  },
  {
    lead: 'detective',
    detective: '"...아직 아무 말도 하지 마."',
    jiwoo: '"아무 말도 안 했는데요. 숨은 쉬어도 되는 거죠?"',
  },
  {
    lead: 'detective',
    detective: '"거봐."',
    jiwoo: '"뭘 보라는 건지는 말씀을 해 주셔야죠."',
  },
  {
    lead: 'detective',
    detective: '"됐어, 찾았어."',
    jiwoo: '"찾으신 게 뭔지도 같이 알려 주시면 더 좋을텐데요."',
  },
  {
    lead: 'detective',
    detective: '"손전등 말고 수첩."',
    jiwoo: '"둘 다 들고 있었거든요."',
  },

  // ---- 2026-09 사용자 추가 116쌍 ----
  // 발견은 사건당 열 번 넘게 일어나는데 열여섯 쌍으로 돌리고 있었다. 한 사건
  // 안에서 같은 말이 두세 번 돌아오던 것이 이걸로 끝난다.
  // 한지우가 먼저.
  {
    lead: 'jiwoo',
    jiwoo: '"방금 손이 멈췄는데요."',
    detective: '"찾았으니까."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"탐정님, 그건 그냥 지나칠 표정이 아니네요."',
    detective: '"표정이 언제부터 증거였어?"',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"아까부터 그쪽만 세 번째 보고 계십니다."',
    detective: '"네 번째야."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그렇게 쳐다보시면 물건도 부담스러워하겠습니다."',
    detective: '"참 말이 많아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"뭔가 보이셨죠?"',
    detective: '"조금?"',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"조금 보였다는 말치고는 꽤 오래 서 계시는데요."',
    detective: '"조금인데 확인할 게 많아서."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"방금 고개 끄덕이신 건 무슨 의미입니까?"',
    detective: '"안알려줄거임."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"저는 아직 아무것도 못 찾았는데 탐정님은 벌써 찾으신 얼굴이네요."',
    detective: '"그게 너와 나의 다른 점이지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"여긴 아까랑 달라진 게 없는 것 같은데요."',
    detective: '"그래서 이상한 거야."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그거 건드리기 전에 장갑부터 끼시죠."',
    detective: '"...나도 알아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이쯤 되면 제가 먼저 찾는 날도 있어야 공평한데요."',
    detective: '"기대하지 마."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"방금 발견하시고도 모른 척하신 거죠?"',
    detective: '"확인하고 있었어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그 침묵, 좋은 징조는 아니죠?"',
    detective: '"보통은 아니지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 제가 먼저 적었습니다."',
    detective: '"그래서?"',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"탐정님도 이런 데서 멈추실 때가 있네요."',
    detective: '"나도 사람인데 왜 늘 직진만 해야 돼."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이건 아까와 연결되는 것 같은데요."',
    detective: '"내 대사를 뺏지 말라고."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"방금부터 걸음이 달라졌습니다."',
    detective: '"이제는 내 걸음까지 봐?"',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"탐정님 걸음 빨라지는 건 보통 이유가 있잖아요."',
    detective: '"늦어서 빨라진 걸 수도 있지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"저건 아예 안 보셨던 것 같은데요."',
    detective: '"보려고 했어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"잠시만요. 이건 각도부터 다시 봐야 할 것 같습니다."',
    detective: '"많이 컸네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"평소보다 말이 없으신데요."',
    detective: '"네가 대신 말하고 있잖아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이런 건 발견하고 나면 꼭 하나 더 나오던데요."',
    detective: '"그렇겠지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"벌써 다음 생각하고 계시죠?"',
    detective: '"아직 여기 안 끝났어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"지금 하시는 거 보니까 그냥 물건은 아닌 것 같네요."',
    detective: '"눈치가 좀 늘었네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 먼저 말하면 싫어하실 것 같아서 기다렸습니다."',
    detective: '"너가 탐정해라."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그거 찾고 나니까 표정이 좀 풀리셨는데요."',
    detective: '"반대야. 이제 더 복잡해진 거야."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 제가 봐도 좀 수상합니다."',
    detective: '"헛다리면 좋을 텐데, 아무래도 수상한 거 맞겠지."',
  },
  // 탐정이 먼저.
  {
    lead: 'detective',
    detective: '"여기부터 다시 보자."',
    jiwoo: '"아까 지나간 곳인데요?"',
  },
  {
    lead: 'detective',
    detective: '"이거 움직이지 마."',
    jiwoo: '"탐정님이나 건드리지 마세요."',
  },
  {
    lead: 'detective',
    detective: '"이건 처음 봤어."',
    jiwoo: '"저도요. 같이 처음 보는 걸로 하죠."',
  },
  {
    lead: 'detective',
    detective: '"뭔가 빠졌어."',
    jiwoo: '"뭐가 빠졌는지는 아직 모르시는 거고요?"',
  },
  {
    lead: 'detective',
    detective: '"이쪽 이상해."',
    jiwoo: '"탐정님한테는 모든 게 이상하잖아요."',
  },
  {
    lead: 'detective',
    detective: '"이건 기억해 둬."',
    jiwoo: '"기억은 자신 있는데요. 탐정님이 나중에 물어보시면 문제고요."',
  },
  {
    lead: 'detective',
    detective: '"방금 봤지?"',
    jiwoo: '"봤습니다. 모른 척할까요?"',
  },
  {
    lead: 'detective',
    detective: '"다시 확인하자."',
    jiwoo: '"알겠습니다. 저도 아까는 대충 봤습니다."',
  },
  {
    lead: 'detective',
    detective: '"저건 치워 두지 마."',
    jiwoo: '"네. 그대로 두겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"뭔가 이상해."',
    jiwoo: '"오늘 벌써 몇 번째 이상인지 세어 볼까요?"',
  },
  {
    lead: 'detective',
    detective: '"한 번 더 확인해."',
    jiwoo: '"네. 이번엔 제가 먼저 보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"방금 본 거, 말하지 마."',
    jiwoo: '"제가요? 누구한테요?"',
  },
  {
    lead: 'detective',
    detective: '"저쪽도 봐."',
    jiwoo: '"또 제가 반대로 가야 하는 겁니까?"',
  },
  {
    lead: 'detective',
    detective: '"이건 예상 못 했네."',
    jiwoo: '"그 말씀 들으니까 저까지 긴장되네요."',
  },
  {
    lead: 'detective',
    detective: '"이건 아닌 것 같은데."',
    jiwoo: '"저는 처음엔 맞는 줄 알았습니다."',
  },
  {
    lead: 'detective',
    detective: '"잠깐만 생각하자."',
    jiwoo: '"네. 저는 입 다물고 있겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"저쪽보다 이쪽이 낫겠다."',
    jiwoo: '"탐정님이 방향 정하시면 저는 따라가죠."',
  },
  {
    lead: 'detective',
    detective: '"이상한 부분 하나 더 있어."',
    jiwoo: '"하나 더라는 말이 제일 싫습니다."',
  },
  {
    lead: 'detective',
    detective: '"아까 그거 기억나?"',
    jiwoo: '"기억은 하는데, 지금 물어보시는 걸 보면 제가 놓친 게 있네요."',
  },
  {
    lead: 'detective',
    detective: '"이건 나중에 다시 보자."',
    jiwoo: '"네. 나중에라는 말이 오늘 안이라는 뜻이길 바랍니다."',
  },
  {
    lead: 'detective',
    detective: '"지금은 건드리지 말자."',
    jiwoo: '"알겠습니다. 탐정님 손부터 치워 두죠."',
  },
  {
    lead: 'detective',
    detective: '"여기 봐."',
    jiwoo: '"이번엔 뭘 먼저 봐야 합니까?"',
  },
  {
    lead: 'detective',
    detective: '"이 부분만 보면 돼."',
    jiwoo: '"네. 범위가 줄어서 다행이네요."',
  },
  {
    lead: 'detective',
    detective: '"그거 왜 거기 있지?"',
    jiwoo: '"제가 알까요?"',
  },
  {
    lead: 'detective',
    detective: '"방금 전까지 없었던 것 같은데."',
    jiwoo: '"사진 찍어 뒀는데 드려요?"',
  },
  {
    lead: 'detective',
    detective: '"이건 확실히 이상하다."',
    jiwoo: '"이번에는 저도 반박할 생각 없습니다."',
  },
  {
    lead: 'detective',
    detective: '"아직 판단하지 마."',
    jiwoo: '"네. 저도 섣불리 좋아하지 않겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이거 보면서 뭐 떠오르는 거 없어?"',
    jiwoo: '"있긴 한데, 틀리면 혼날 것 같아서요."',
  },
  {
    lead: 'detective',
    detective: '"이상한 건 맞아."',
    jiwoo: '"그럼 제가 괜히 이상하게 본 건 아니네요."',
  },
  {
    lead: 'detective',
    detective: '"이쪽 먼저 살펴보자."',
    jiwoo: '"네. 범위부터 줄이시는 거죠."',
  },
  {
    lead: 'detective',
    detective: '"이건 그냥 넘기지 마."',
    jiwoo: '"알겠습니다. 이번엔 꼼꼼하게 보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"저 부분, 가까이서 보자."',
    jiwoo: '"네. 멀리서 볼 때랑 다를 수도 있겠네요."',
  },
  {
    lead: 'detective',
    detective: '"잠깐 보고 지나간 게 걸리네."',
    jiwoo: '"그럼 다시 보는 걸로 하죠."',
  },
  {
    lead: 'detective',
    detective: '"아까부터 저게 신경 쓰였어."',
    jiwoo: '"탐정님이 계속 보는 걸 보니 저도 신경 쓰이네요."',
  },
  {
    lead: 'detective',
    detective: '"이건 위치가 이상해."',
    jiwoo: '"위치부터 확인해 보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이상한 건 물건 자체가 아니야."',
    jiwoo: '"그럼 놓인 방식이 문제입니까?"',
  },
  {
    lead: 'detective',
    detective: '"이거 기억해 둬."',
    jiwoo: '"네. 이번엔 정말 기억하겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"한 번만 더 들여다보자."',
    jiwoo: '"네. 저는 두 번째부터 더 잘 보입니다."',
  },
  {
    lead: 'detective',
    detective: '"방금 지나친 곳으로 돌아가."',
    jiwoo: '"역시 한 번에 끝날 리가 없네요."',
  },
  {
    lead: 'detective',
    detective: '"이건 생각보다 재미있네."',
    jiwoo: '"그 말씀 나오시면 저는 일이 늘어날까 긴장됩니다."',
  },
  {
    lead: 'detective',
    detective: '"이 부분만 따로 봐."',
    jiwoo: '"네. 다른 건 잠시 접어 두겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 순서가 중요해."',
    jiwoo: '"그럼 순서부터 맞춰 보죠."',
  },
  {
    lead: 'detective',
    detective: '"아까 본 것하고 비교해 봐."',
    jiwoo: '"네. 차이를 찾아보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이거 누가 만졌을까."',
    jiwoo: '"그건 아직 저도 모르겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 원래 여기 있었나?"',
    jiwoo: '"저는 본 기억이 없어요."',
  },
  {
    lead: 'detective',
    detective: '"좀 이상하게 남아 있네."',
    jiwoo: '"그럼 남은 모양부터 확인하시죠."',
  },
  {
    lead: 'detective',
    detective: '"이것만 보면 별거 아닌데."',
    jiwoo: '"다른 것과 붙으면 달라질 수도 있겠네요."',
  },
  {
    lead: 'detective',
    detective: '"이건 눈에 띄지 않아?"',
    jiwoo: '"그래서 더 이상한 겁니까?"',
  },
  {
    lead: 'detective',
    detective: '"너라면 이걸 그냥 지나갈 수 있어?"',
    jiwoo: '"아니요. 그래서 서 있잖아요."',
  },
  {
    lead: 'detective',
    detective: '"지금부터는 천천히 보자."',
    jiwoo: '"네. 서두르면 꼭 하나씩 놓치더라고요."',
  },
  {
    lead: 'detective',
    detective: '"이건 앞뒤를 같이 봐야 해."',
    jiwoo: '"앞만 보면 답이 안 나오는군요."',
  },
  {
    lead: 'detective',
    detective: '"이 부분은 따로 기억해 둬."',
    jiwoo: '"네. 별표까지 해 둘까요?"',
  },
  {
    lead: 'detective',
    detective: '"이쪽은 건드리지 말자."',
    jiwoo: '"네. 손대지 않고 주변만 보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"조금만 기다려."',
    jiwoo: '"네. 기다리는 건 익숙합니다."',
  },
  {
    lead: 'detective',
    detective: '"내가 놓친 게 있는지 다시 볼게."',
    jiwoo: '"그러면 저는 반대쪽을 보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 설명이 안 맞아."',
    jiwoo: '"어느 부분부터 틀어진 건지 찾아보죠."',
  },
  {
    lead: 'detective',
    detective: '"이렇게 놓일 이유가 없는데."',
    jiwoo: '"그럼 놓인 이유를 찾아야겠네요."',
  },
  {
    lead: 'detective',
    detective: '"이거 하나 때문에 분위기가 달라지네."',
    jiwoo: '"저도 방금 그렇게 느꼈습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 조금 아껴 두자."',
    jiwoo: '"네. 지금 바로 결론 내리지는 않겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이 부분, 네가 본 것 같았는데."',
    jiwoo: '"네. 저도 지나가면서 봤습니다."',
  },
  {
    lead: 'detective',
    detective: '"그때는 못 봤네."',
    jiwoo: '"저도 마찬가지입니다."',
  },
  {
    lead: 'detective',
    detective: '"이번엔 놓치지 말자."',
    jiwoo: '"네. 둘 다 눈 크게 뜨겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 조금 애매하네."',
    jiwoo: '"그럼 애매한 채로 기록해 두죠."',
  },
  {
    lead: 'detective',
    detective: '"이쪽에서 보면 다르게 보이지?"',
    jiwoo: '"네. 각도가 꽤 다릅니다."',
  },
  {
    lead: 'detective',
    detective: '"이것만 따로 보면 이상하지."',
    jiwoo: '"같이 놓여 있던 것까지 봐야 할 것 같습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 조금 기다렸다가 보자."',
    jiwoo: '"네. 바로 판단하지 않겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"방금 전하고 달라진 게 있나?"',
    jiwoo: '"눈에 띄는 건 아직 없습니다."',
  },
  {
    lead: 'detective',
    detective: '"내가 잘못 본 건가."',
    jiwoo: '"같이 보면 확인할 수 있겠네요."',
  },
  {
    lead: 'detective',
    detective: '"이건 직접 확인해야겠다."',
    jiwoo: '"네. 추측으로 넘길 건 아닌 것 같습니다."',
  },
  {
    lead: 'detective',
    detective: '"이 정도면 의미가 있을 수도 있겠어."',
    jiwoo: '"그럼 일단 의미 있는 쪽으로 표시해 두죠."',
  },
  {
    lead: 'detective',
    detective: '"방금 생각이 바뀌었어."',
    jiwoo: '"무슨 부분에서요?"',
  },
  {
    lead: 'detective',
    detective: '"처음엔 별거 아닌 줄 알았는데."',
    jiwoo: '"저도 처음엔 그렇게 봤습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 좀 묘하네."',
    jiwoo: '"그 표현 쓰실 때는 대체로 뭔가 있더라고요."',
  },
  {
    lead: 'detective',
    detective: '"이거 보면서 하나 생각났어."',
    jiwoo: '"말씀하실 때까지 기다리겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"지금은 결론 내리지 말자."',
    jiwoo: '"네. 저도 성급하게 적지는 않겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 조금 더 봐야겠어."',
    jiwoo: '"네. 급하게 보면 놓칠 것 같습니다."',
  },
  {
    lead: 'detective',
    detective: '"이것도 연결될 수 있겠는데."',
    jiwoo: '"그러면 앞에서 본 것도 다시 봐야겠네요."',
  },
  {
    lead: 'detective',
    detective: '"이거 보고 나니까 아까가 이상해졌어."',
    jiwoo: '"그럼 아까부터 다시 맞춰 봐야겠네요."',
  },
  {
    lead: 'detective',
    detective: '"이건 예상 밖인데."',
    jiwoo: '"예상 밖인 게 하나쯤은 나와야 일할 맛도 나죠."',
  },
  {
    lead: 'detective',
    detective: '"저기 봐. 저것만 남아 있어."',
    jiwoo: '"네. 가까이서 보면 더 분명하겠네요."',
  },
  {
    lead: 'detective',
    detective: '"이거 누락된 게 있는 것 같아."',
    jiwoo: '"그럼 있는 것부터 전부 다시 세어 보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 예상보다 오래 보게 생겼네."',
    jiwoo: '"그 말씀하실 줄 알았습니다."',
  },
  {
    lead: 'detective',
    detective: '"지우야, 이거 봐봐."',
    jiwoo: '"네. 이번엔 저도 집중해서 보겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 내가 보기엔 좀 이상해."',
    jiwoo: '"저도 같이 보면 금방 감이 올 것 같습니다."',
  },
  {
    lead: 'detective',
    detective: '"이 정도면 그냥 우연이라고 보기 어렵지 않나?"',
    jiwoo: '"저도 그 생각이 들긴 합니다."',
  },
  {
    lead: 'detective',
    detective: '"여기까지만 보면 충분해."',
    jiwoo: '"네. 더 보면 오히려 헷갈릴 수도 있겠네요."',
  },
  {
    lead: 'detective',
    detective: '"이제 이걸 왜 못 봤나 싶네."',
    jiwoo: '"원래 찾고 나면 다 그렇게 보입니다."',
  },
  {
    lead: 'detective',
    detective: '"이건 꽤 중요한 것 같은데."',
    jiwoo: '"그럼 저도 자세히 봐 두겠습니다."',
  },
  {
    lead: 'detective',
    detective: '"좋아. 이 정도면 됐어."',
    jiwoo: '"네. 드디어 다음 걸 볼 수 있겠네요."',
  },
];

// 최근에 나온 짝은 피한다. pick() 과 같은 규칙이지만 두 줄을 함께 봐야 해서
// 따로 돈다 — 한 줄만 신선하고 다른 한 줄이 방금 나온 것이면 주고받기가
// 어색해진다.
function pickBanter(
  seed: number,
  recent: string[],
  lead: BanterPair['lead'] | null = null,
): BanterPair {
  const pool = lead
    ? BANTER_DISCOVERY.filter((pair) => pair.lead === lead)
    : BANTER_DISCOVERY;
  return (
    chooseBalanced(pool, (pair) => pair.jiwoo, recent, seed) ||
    pool[Math.abs(seed) % pool.length]
  );
}

// 사건의 첫 카드에서만 쓰는 짝. 탐정의 되받는 줄이 전부 "첫 장에 기대지
// 마라"는 같은 말을 한다 — 사건마다 반드시 한 번 나오는 자리라 그 한 번에
// 이걸 말해 두는 값이 있다. 한지우의 던지는 줄은 그 대답이 대답으로 들리게
// 같이 쓴다. 이 풀이 따로 있는 이유가 그것이므로, 여기에 일반 농담을
// 넣으면 짝이 어긋나 원래 문제로 돌아간다.
const BANTER_FIRST_CARD: BanterPair[] = [
  {
    lead: 'jiwoo',
    jiwoo: '"첫 단추는 뀄네요."',
    detective: '"처음 나온 건 제일 조심해야 돼. 나머지를 여기 맞추게 되거든."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이제 좀 풀리려나요."',
    detective: '"하나 나왔다고 그림이 보이는 건 아니야. 보통은 반대지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"적어 둘까요?"',
    detective: '"적어는 둬. 근데 아직 아무것도 아니라고 생각하고 있어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"하나 나왔으니 반은 온 거죠?"',
    detective: '"반이면 좋겠는데, 대체로 여기서부터 길어져."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그래도 뭐라도 나온 게 어디예요."',
    detective: '"그 말 믿고 첫 장에 기대면 나중에 고생해."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이거면 방향은 잡히는 거 아니에요?"',
    detective: '"방향은 세 장쯤 모여야 생겨. 지금은 점 하나야."',
  },
];

// 사건 번호를 섞어서 고른다. 이 자리에서는 seed 만으로는 고르게 안 돌아간다
// — 첫 카드는 대화 기록이 비어 있어 chooseBalanced 가 셀 것이 없고 동점
// 처리로 떨어지는데, seed 의 재료인 행동 id 가 `probe|L01|0` 처럼 사건끼리
// 그대로 겹치기 때문이다. 120건을 돌려 보니 6쌍 중 하나가 94회 중 62회를
// 가져갔다. 사건 번호를 넣으면 그게 12회까지 내려간다.
function pickFirstCardBanter(
  caseId: string,
  seed: number,
  recent: string[],
): BanterPair {
  const mixed = seed + hashOf(`${caseId}|first-card`);
  return (
    chooseBalanced(BANTER_FIRST_CARD, (pair) => pair.jiwoo, recent, mixed) ||
    BANTER_FIRST_CARD[Math.abs(mixed) % BANTER_FIRST_CARD.length]
  );
}

// 「그 밖에 이상한 점은 없었는지」의 도입. 물어본 쪽이 탐정이므로 인물이
// 기억을 되짚는 동작이 앞에 서고, 그 뒤에 마스터의 사실이 그대로 온다.
const LEAD_RECALL = [
  // 이름 뒤 은/는은 {topic} 이 받침을 보고 고른다. {name}은 이라고 쓰면
  // "강윤재은"이 된다.
  '{topic} 잠깐 생각하는 얼굴이 된다.',
  '{topic} 기억을 더듬다가 한 가지를 떠올린다.',
  '{name}의 시선이 한 번 허공에 머문다.',
  '{topic} 그러고 보니, 하는 표정으로 입을 연다.',
  '{topic} 대답하려다 말고 한 박자 쉰다.',
  '{topic} 별것 아니라는 듯 덧붙인다.',
];

const JIWOO_RECALL = [
  '"적어 뒀습니다. 더 생각나시면 말씀해 주세요."',
  '"이런 건 나중에 맞춰 보면 쓸모가 있더라고요."',
  '"방금 건 따로 표시해 둘게요."',
  '"천천히 하셔도 됩니다. 어차피 다 적고 있으니까요."',
  '"하나 더 나왔네요."',
];

// 이 사람에게서 더 나올 것이 없을 때. 보기가 사라지는 이유를 여기서 말한다.
const JIWOO_RECALL_LAST = [
  '"이분한테서 나올 건 여기까지인 것 같네요."',
  '"더 짜내도 같은 얘기만 나올 것 같습니다."',
  '"이제 이쪽은 비었어요. 적을 게 없습니다."',
];

// 첫 대면의 끝자리. 탐정이 묻고 상대가 대답한 **뒤**라, 「이제 물어보시죠」
// 쪽 말은 여기 올 수 없다 — 묻기 전의 말이 대답 뒤에 붙으면 순서가 뒤집혀
// 읽힌다. 그가 하는 것은 받아 적는 일이고, 방금 들은 말이 참인지는 그의
// 몫이 아니다.
const JIWOO_FIRST_HEARD = [
  '"여기까지는 받아 적었습니다."',
  '"말씀 그대로 옮겼어요. 고칠 데 있으면 말씀해 주세요."',
  '"적어 뒀어요. 더 여쭐 게 생기면 그때 다시 오시죠."',
  '"수첩에 넣었습니다. 탐정님, 다음은요?"',
  '"저는 받아 적기만 할게요. 판단은 탐정님 몫이고요."',
  '"말씀 감사합니다. 빠진 건 나중에 다시 여쭐게요."',
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

// 카드를 들이대자 잠겨 있던 말이 열린 순간. 자백(단계 돌파)은 아니다 —
// 이 사람이 숨기던 것이 아니라 굳이 먼저 말하지 않던 것이 나온 자리라,
// 무너지는 대신 한 걸음 물러서는 쪽으로 쓴다.
const LEAD_UNSEAL = [
  '{topic} 그것을 한참 들여다보고 나서야 입을 연다.',
  '{name}의 시선이 그 위에 머문다. 변명이 한 박자 늦는다.',
  '{topic} 짧게 헛기침을 하고 말을 고쳐 잡는다.',
  '{topic} 그것을 손끝으로 당겨 놓는다. "……그건 그렇습니다."',
  '{topic} 잠깐 말을 멈췄다가, 아까와는 다른 말을 꺼낸다.',
  '{topic} 그것에서 눈을 떼지 못한 채 대답한다.',
];

const JIWOO_UNSEAL = [
  '"아까 하신 말씀이랑은 다르네요. 둘 다 적어 둘게요."',
  '"이건 보여 드리니까 나오는 얘기였네요."',
  '"방금 건 물어봐서 나온 게 아니라 보여 줘서 나온 겁니다."',
  '"먼저 말씀해 주셨으면 더 좋았을 텐데요."',
  '"순서를 바꿔서 여쭤볼걸 그랬습니다."',
  '"종이 한 장에 말이 바뀌는 건 늘 봐도 신기해요."',
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

// 「말끝이」「시간 얘기」 줄은 jiwooTestimonyLine 이 그 말의 모양을 보고
// 거른다. 「방금 그 부분만 다시 확인해도 될까요」는 뺐다 — 누구에게 하는
// 말인지가 없었다.
const JIWOO_TESTIMONY = [
  '"적었습니다. 그 말씀은 그대로 옮길게요."',
  '"말끝이 조금 흐려졌는데, 제가 잘못 들은 걸 수도 있고요."',
  '"그건 기억하시네요."',
  '"받아 적었어요. 토씨 그대로요."',
  '"시간 얘기가 나왔으니 그것만 따로 표시해 둘게요."',
  '"...네. 여기까지만 적을게요."',
];

// 카드는 맞는 자리인데 그 사람 입에서 어긋날 말이 아직 안 나왔다. 무엇을
// 들어야 하는지는 말하지 않는다 — 「이 사람 말을 더」까지만.
const JIWOO_STAGE_UNHEARD = [
  '"이 카드가 뭐랑 어긋나는지, 아직 {name} 씨 입에서 그 말이 안 나왔어요. 말을 더 들어 보죠."',
  '"카드는 맞는 것 같은데 받아칠 말이 없네요. {name} 씨한테 더 물어봐야겠어요."',
  '"지금은 부딪칠 진술이 없어요. 이 사람이 뭐라고 했는지부터 다시 들어 보죠."',
];

// 뒷단계 카드를 먼저 내밀었다. 앞에서부터.
const JIWOO_STAGE_ORDER = [
  '"그건 나중 얘기예요. {name} 씨가 지금 하는 말부터 무너뜨려야죠."',
  '"순서가 앞섰어요. 이 카드는 다음에 쓰일 것 같은데요."',
  '"먼저 걸어야 할 말이 따로 있어요. 이건 접어 뒀다가 꺼내죠."',
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

// ---------------------------------------------------------------------------
// 전환점의 긴 주고받기
//
// BanterPair 는 두 줄이다 — 한지우 한 마디, 탐정 한 마디. 그 길이로는 두
// 사람이 "주고받는" 것까지는 되어도 "서로를 아는 것"이 안 나온다. 관계는
// 한 번 더 받아쳤을 때 보인다: 지우가 찌르고, 탐정이 피하고, 지우가 다시
// 파고들고, 탐정이 결국 한 마디를 내주는 박자.
//
// 그래서 전환점 네 자리에만 여섯~아홉 줄짜리를 쓴다. 자주 나오는 자리에
// 이걸 붙이면 수사가 시트콤이 되므로, 아래 EXCHANGE_ONCE_PER_CASE 가 그
// 빈도를 나눈다.
//
// 대사 규칙은 BANTER_DISCOVERY 위에 적힌 것 그대로다 — 말투 비대칭, 한지우는
// 판단하지 않음, 일회성 과거 사건 금지, 사건 내용 금지. 자리마다 무엇을
// 쓸 수 있고 무엇이 금지인지는 docs/banter-slots.md 에 있다.
type Exchange = Array<{ who: 'detective' | 'jiwoo'; line: string }>;

const j = (line: string) => ({ who: 'jiwoo' as const, line });
const d = (line: string) => ({ who: 'detective' as const, line });

// 단계 돌파. 이 게임의 클라이맥스이고 사건당 두세 번뿐이라 매번 길게 간다.
const EXCHANGE_STAGE_BREAK: Exchange[] = [
  [
    j('"...지금 말씀이 아까랑 다른데요."'),
    d('"알고 있어."'),
    j('"그런데 왜 웃으세요?"'),
    d('"네가 눈치챘잖아."'),
    j('"제가 눈치챈 걸 좋아하실 일인가요?"'),
    d('"내가 틀리지 않았다는 뜻이니까."'),
  ],
  [
    d('"적어."'),
    j('"뭘요?"'),
    d('"방금 저 사람 표정."'),
    j('"그건 글씨로 어떻게 적습니까?"'),
    d('"네가 알아서 잘 쓰잖아."'),
    j('"탐정님은 정말 사람을 부려먹는 데 재능이 있으세요."'),
    d('"그래도 안 떠나잖아."'),
    j('"...그건 맞습니다."'),
  ],
  [
    j('"이번에는 대답이 빨라졌네요."'),
    d('"그래?"'),
    j('"네. 아까는 세 번 생각하시던데요."'),
    d('"세 번까지 세고 있었어?"'),
    j('"탐정님이 하도 오래 생각하시니까요."'),
    d('"쓸데없는 데 부지런하네."'),
    j('"옆에서 오래 있었으면 이런 것도 보입니다."'),
  ],
  [
    d('"방금 말 바뀌었지."'),
    j('"네. 저도 들었습니다."'),
    d('"뭐가 달라졌는지 말해 봐."'),
    j('"아까는 기억난다고 하셨고, 지금은 확실하지 않다고 하셨습니다."'),
    d('"좋아."'),
    j('"이럴 때만 짧게 대답하시네요."'),
    d('"중요한 건 길게 말 안 해."'),
  ],
  [
    j('"아까랑 설명이 조금 달라졌습니다."'),
    d('"그래?"'),
    j('"네."'),
    d('"어디가."'),
    j('"그걸 제가 먼저 말씀드리면 탐정님이 또 제 말을 이용하시잖아요."'),
    d('"그래서 안 말할 거야?"'),
    j('"아니요. 말은 하겠습니다."'),
    j('"대신 제가 틀리면 모른 척해 주세요."'),
  ],
  [
    d('"이것도 적어."'),
    j('"이번에도 전부요?"'),
    d('"전부."'),
    j('"나중에 정리하면 분량이 꽤 나오겠습니다."'),
    d('"그게 네 일이잖아."'),
    j('"맞습니다."'),
    j('"그런데 탐정님은 제 업무량을 늘리는 데 굉장히 성실하시네요."'),
  ],
  [
    j('"대답하시기 전에 생각 좀 오래 하셨습니다."'),
    d('"그걸 왜 세."'),
    j('"세지는 않았습니다."'),
    d('"그럼?"'),
    j('"탐정님이 오래 생각할 때 생기는 표정을 압니다."'),
    d('"무슨 표정인데."'),
    j('"말씀드리면 또 고치실 것 같아서 비밀로 하겠습니다."'),
  ],
  [
    d('"앞뒤가 안 맞네."'),
    j('"네."'),
    d('"어느 쪽이 문제지?"'),
    j('"둘 다일 수도 있습니다."'),
    d('"좋은 대답이네."'),
    j('"칭찬입니까?"'),
    d('"모르겠어."'),
    j('"역시 칭찬은 아니군요."'),
  ],
  [
    j('"표정이 조금 좋아지셨는데요."'),
    d('"아니."'),
    j('"방금 올라갔습니다."'),
    d('"뭐가."'),
    j('"입꼬리요."'),
    d('"네가 잘못 봤어."'),
    j('"그럼 제가 기록에서 빼겠습니다."'),
    d('"그건 됐어."'),
  ],
  [
    d('"이 부분 표시해 둬."'),
    j('"어느 정도로요?"'),
    d('"네가 보면 알겠지."'),
    j('"굵게 표시하겠습니다."'),
    d('"너무 굵으면 나중에 거슬려."'),
    j('"얇게 하면 탐정님이 못 보시잖아요."'),
    d('"내가 못 볼 리가."'),
    j('"그래서 제가 가운데로 하겠습니다."'),
  ],
  [
    j('"말이 길어지셨습니다."'),
    d('"질문이 많으니까."'),
    j('"평소보다 두 배는 길었습니다."'),
    d('"그것까지 세고 있어?"'),
    j('"오래 같이 다니다 보니 대충 압니다."'),
    d('"쓸데없는 데 기억력이 좋네."'),
    j('"그 말씀 자주 하시죠."'),
  ],
  [
    d('"방금 한 말 기억해 둬."'),
    j('"네."'),
    d('"중요해."'),
    j('"그 말씀 하시면 더 중요해집니다."'),
    d('"왜."'),
    j('"탐정님은 평소엔 아무 말이나 잘하시니까요."'),
    d('"내가 언제."'),
    j('"방금도 하셨습니다."'),
  ],
  [
    j('"이게 뭔지는 제가 먼저 알아봤습니다."'),
    d('"그래?"'),
    j('"네."'),
    d('"그래서."'),
    j('"칭찬받고 싶습니다."'),
    d('"잘했어."'),
    j('"...끝입니까?"'),
    d('"더 해 줘?"'),
  ],
  [
    d('"네가 본 것도 말해."'),
    j('"탐정님도 같은 걸 보신 것 같은데요."'),
    d('"그래도 말해."'),
    j('"제가 먼저 말하면 또 제 생각을 기준으로 보실까 봐요."'),
    d('"그 정도는 구분해."'),
    j('"그럼 말씀드리겠습니다."'),
    d('"응."'),
    j('"역시 같은 데 보고 계셨네요."'),
  ],
  [
    j('"제가 굳이 말씀드리지 않아도 되겠는데요."'),
    d('"왜."'),
    j('"탐정님 눈이 벌써 그쪽에 가 있어서요."'),
    d('"그래도 말해."'),
    j('"네."'),
    d('"왜 웃어."'),
    j('"제가 생각한 것과 똑같아서요."'),
  ],
  [
    d('"아직 끝난 거 아니야."'),
    j('"알겠습니다."'),
    d('"그 표정은 뭐야."'),
    j('"탐정님이 그렇게 말씀하시면 시간이 좀 더 걸린다는 뜻이라서요."'),
    d('"불만 있어?"'),
    j('"없습니다."'),
    j('"다만 오늘 저녁은 포기했습니다."'),
  ],
  [
    j('"이제 좀 재미있어지셨죠?"'),
    d('"너만 신났어."'),
    j('"저는 원래 이런 데 재밌어합니다."'),
    d('"알아."'),
    j('"그걸 아시면 왜 데리고 다니십니까?"'),
    d('"시끄러워서 조용한 사람보다 나아."'),
    j('"...그건 칭찬 맞죠?"'),
  ],
  [
    j('"방금 말이 바뀌었습니다."'),
    d('"알아."'),
    j('"제가 듣기에도 꽤 달라졌는데요."'),
    d('"그래서 확인하는 거야."'),
    j('"그럼 앞에 하신 말씀도 남겨 둘까요?"'),
    d('"당연하지."'),
    j('"네. 나중에 고르실 건 탐정님이 정하시고요."'),
  ],
  [
    j('"이번에는 대답하시기 전에 꽤 오래 생각하셨습니다."'),
    d('"그걸 보고 있었어?"'),
    j('"옆에 있었으니까요."'),
    d('"쓸데없는 건 잘 봐."'),
    j('"탐정님은 중요한 건 잘 보시니까 제가 이런 걸 봐야죠."'),
    d('"말은 잘하네."'),
    j('"그건 칭찬으로 듣겠습니다."'),
  ],
  [
    d('"이 부분 표시해."'),
    j('"어느 정도로요?"'),
    d('"눈에 띄게."'),
    j('"굵게 하겠습니다."'),
    d('"너무 굵게 하지 마."'),
    j('"아까는 눈에 띄게 하라고 하셨는데요."'),
    d('"적당히라는 말이 있었어."'),
    j('"그건 탐정님 마음속에만 있었던 것 같은데요."'),
  ],
  [
    j('"지금 표정 보니까 뭔가 찾으셨죠?"'),
    d('"아직."'),
    j('"그럼 왜 웃으십니까?"'),
    d('"네가 먼저 알아봐서."'),
    j('"제가요?"'),
    d('"응."'),
    j('"그런 건 미리 말씀해 주셔도 됩니다."'),
  ],
  [
    d('"네가 본 것도 말해."'),
    j('"탐정님이 먼저 말씀하실 줄 알았습니다."'),
    d('"기다릴게."'),
    j('"그럼 제 생각부터 말씀드리겠습니다."'),
    d('"그래."'),
    j('"저도 같은 부분이 이상합니다."'),
    d('"알았어."'),
    j('"이번에는 제가 좀 도움이 된 것 같네요."'),
  ],
  [
    j('"이제야 말이 맞물리네요."'),
    d('"아직 다 맞은 건 아니야."'),
    j('"네. 그 말씀 하실 줄 알았습니다."'),
    d('"뭐가."'),
    j('"탐정님은 마지막까지 꼭 한마디 남기시잖아요."'),
    d('"그럼 안 할까?"'),
    j('"아닙니다. 하셔야죠."'),
  ],
  [
    d('"방금 한 말 적어."'),
    j('"네."'),
    d('"빠뜨리지 말고."'),
    j('"제가 언제 빠뜨렸습니까?"'),
    d('"가끔."'),
    j('"그건 탐정님이 너무 빨리 말씀하실 때고요."'),
    d('"그럼 따라오면서 빨리 적어."'),
    j('"결국 제 잘못이네요."'),
  ],
  [
    j('"아까 말씀하고 조금 달라졌습니다."'),
    d('"그래."'),
    j('"별로 놀라지 않으시네요."'),
    d('"놀랄 일은 아니니까."'),
    j('"전 조금 놀랐는데요."'),
    d('"너는 표정에 다 쓰잖아."'),
    j('"탐정님도 다 보시면서 모른 척하시잖아요."'),
  ],
  [
    d('"아직 끝난 거 아니야."'),
    j('"네."'),
    d('"왜 그렇게 순순히 대답해."'),
    j('"탐정님이 아직 안 끝났다고 하실 때는 진짜 안 끝났더라고요."'),
    d('"그걸 이제 알아?"'),
    j('"오래 봤으니까요."'),
    d('"그건 인정."'),
  ],
  [
    j('"이번엔 제가 먼저 적어 뒀습니다."'),
    d('"그래?"'),
    j('"네."'),
    d('"그럼 잘했어."'),
    j('"끝입니까?"'),
    d('"더 해 줘?"'),
    j('"아닙니다. 나중에 드물게 해 주시는 걸로 하죠."'),
  ],
];

// 헛다리 해소. 사건당 두셋이고, 한 사람을 의심에서 놓아주는 자리라 길어도
// 된다.
const EXCHANGE_HERRING_CLEAR: Exchange[] = [
  [
    j('"저분은 아니었네요."'),
    d('"응."'),
    j('"그럼 제가 아까 의심한 건 틀렸던 거네요."'),
    d('"원래 의심은 틀리려고 하는 거야."'),
    j('"그럴듯하게 말씀하시네요."'),
    d('"그럴듯해야 네가 안 삐치지."'),
    j('"제가 언제 삐쳤습니까?"'),
    d('"지금."'),
    j('"...아닙니다."'),
  ],
  [
    j('"한 명 빠졌네요."'),
    d('"사람을 사람 수로 세지 마."'),
    j('"그럼 탐정님은 어떻게 세시는데요?"'),
    d('"의심할 이유가 몇 개 남았는지."'),
    j('"역시 이상한 사람입니다."'),
    d('"너도 매일 따라다니잖아."'),
    j('"그러니까 저도 이상한 거겠죠."'),
  ],
  [
    j('"이쪽은 아니었네요."'),
    d('"응."'),
    j('"제가 꽤 오래 보고 있었는데요."'),
    d('"그래서 확실히 알았잖아."'),
    j('"탐정님은 이런 상황에서도 위로를 참 잘하십니다."'),
    d('"위로 안 했는데."'),
    j('"그러니까 더 자연스럽습니다."'),
  ],
  [
    d('"하나 빠졌어."'),
    j('"네."'),
    d('"기록에서 정리해."'),
    j('"완전히 지우지는 않겠습니다."'),
    d('"왜."'),
    j('"제가 틀린 이유도 나중에는 쓸모가 있을 테니까요."'),
    d('"그건 맞아."'),
    j('"오늘 처음으로 제 의견을 그대로 인정하셨습니다."'),
  ],
  [
    j('"괜히 오래 붙잡고 있었네요."'),
    d('"확인 전까진 다 가능성이지."'),
    j('"그 말씀 들으면 제가 괜히 덜 억울해집니다."'),
    d('"억울할 게 뭐 있어."'),
    j('"제가 꽤 자신 있었거든요."'),
    d('"그 자신감은 나쁘지 않아."'),
    j('"그럼 다음에도 가져오겠습니다."'),
  ],
  [
    d('"그건 지워."'),
    j('"알겠습니다."'),
    d('"왜 웃어."'),
    j('"탐정님도 저처럼 처음엔 확신하셨잖아요."'),
    d('"난 확신한 적 없어."'),
    j('"아까 얼굴은 그러셨는데요."'),
    d('"말 안 들으면 손해 봐."'),
    j('"이럴 때만 상사십니다."'),
  ],
  [
    j('"처음 판단이 틀렸네요."'),
    d('"처음이면 그럴 수 있지."'),
    j('"탐정님도요?"'),
    d('"나도 사람인데."'),
    j('"그 말씀은 제가 좀 기억하겠습니다."'),
    d('"왜."'),
    j('"가끔 너무 완벽한 척하셔서요."'),
  ],
  [
    d('"그냥 지나칠 뻔했네."'),
    j('"그럴 뻔했습니다."'),
    d('"너도?"'),
    j('"네. 그래서 제가 아무 말도 안 했습니다."'),
    d('"왜 안 했어."'),
    j('"탐정님이 먼저 알아차리시나 보려고요."'),
    d('"시험했어?"'),
    j('"조금요."'),
  ],
  [
    j('"한 가지 줄었습니다."'),
    d('"응."'),
    j('"수첩도 조금 덜 복잡해졌네요."'),
    d('"네가 좋아하잖아. 정리하는 거."'),
    j('"제가 정리하고 탐정님은 어지르시고요."'),
    d('"역할 분담이 확실하네."'),
    j('"그렇게 생각하시면 제가 할 말이 없습니다."'),
  ],
  [
    d('"아닌 건 확인됐어."'),
    j('"네."'),
    d('"그걸로 됐어."'),
    j('"탐정님은 늘 그렇게 깔끔하게 끝내시네요."'),
    d('"뭐가 문제야."'),
    j('"저는 아직 한숨이 안 끝났습니다."'),
    d('"그건 네가 체력이 약해서 그래."'),
    j('"그 말씀은 나중에 기억하겠습니다."'),
  ],
  [
    j('"생각보다 빨리 정리됐습니다."'),
    d('"가끔 나도 빨라."'),
    j('"가끔인 건 인정하시네요."'),
    d('"너한테만."'),
    j('"그 말씀은 좀 위험하게 들립니다."'),
    d('"이상하게 듣지 마."'),
    j('"알겠습니다. 그냥 농담으로 듣겠습니다."'),
  ],
  [
    d('"이제 됐어."'),
    j('"네."'),
    d('"왜 안 가."'),
    j('"수첩 덜 닫았습니다."'),
    d('"그거 닫는 데 얼마나 걸린다고."'),
    j('"탐정님 기다리라고 하면 금방 닫겠습니다."'),
    d('"그럼 빨리 해."'),
    j('"네."'),
  ],
  [
    j('"이쪽은 아니었네요."'),
    d('"응."'),
    j('"제가 꽤 오래 봤는데요."'),
    d('"그래서 확실히 알았잖아."'),
    j('"탐정님은 틀려도 되게 태연하십니다."'),
    d('"틀릴 수도 있지."'),
    j('"그렇게 말씀하시면 저도 덜 민망하네요."'),
  ],
  [
    d('"하나 정리됐어."'),
    j('"네."'),
    d('"기록에서는 빼."'),
    j('"완전히 지울까요?"'),
    d('"아니. 남겨 둬."'),
    j('"나중에 볼 수도 있으니까요?"'),
    d('"그래."'),
    j('"역시 탐정님은 버리는 게 별로 없으십니다."'),
  ],
  [
    j('"제가 처음에 잘못 봤네요."'),
    d('"처음엔 그럴 수 있어."'),
    j('"탐정님도 처음엔 그렇게 보셨잖아요."'),
    d('"그건 모르겠는데."'),
    j('"제가 옆에서 봤습니다."'),
    d('"너 참 잘 본다."'),
    j('"필요한 것만 잘 봅니다."'),
  ],
  [
    d('"그건 이제 넘어가자."'),
    j('"네."'),
    d('"왜 웃어."'),
    j('"탐정님도 처음엔 꽤 마음에 들어 하셨던 것 같아서요."'),
    d('"그게 뭐."'),
    j('"아닙니다. 저도 같이 믿었으니까요."'),
    d('"그럼 됐어."'),
  ],
  [
    j('"한 가지 줄었습니다."'),
    d('"응."'),
    j('"수첩도 조금 깔끔해졌네요."'),
    d('"네가 정리 좋아하잖아."'),
    j('"탐정님이 어지르는 걸 제가 정리하는 거죠."'),
    d('"역할 분담 확실하네."'),
    j('"그렇게 말씀하시면 계속 시키실 것 같습니다."'),
  ],
  [
    d('"이제 아니라고 확실히 알겠네."'),
    j('"네."'),
    d('"그럼 됐어."'),
    j('"저는 아직 조금 아쉽습니다."'),
    d('"뭐가."'),
    j('"제가 꽤 자신 있었거든요."'),
    d('"그 자신감은 버리지 마."'),
    j('"네. 그건 안 버리겠습니다."'),
  ],
];

// 헛짚음·빈손. 사건당 열 번도 나올 수 있는 자리라, 여기만 사건당 한 번으로
// 막는다(EXCHANGE_ONCE_PER_CASE). 나머지 헛걸음은 지금까지처럼 한 줄짜리가
// 받는다 — 매번 길게 늘어지면 헤매는 구간이 더 지루해진다.
const EXCHANGE_DEAD_END: Exchange[] = [
  [
    d('"없네."'),
    j('"네."'),
    d('"왜 그렇게 빨리 대답해?"'),
    j('"탐정님이 없다고 하셨잖아요."'),
    d('"한 번쯤 반박해 봐."'),
    j('"없습니다."'),
    d('"...너 요즘 너무 편해졌어."'),
    j('"탐정님이 키우셨죠."'),
  ],
  [
    j('"이번에도 허탕이네요."'),
    d('"이번엔 네가 웃네."'),
    j('"탐정님이 아까 자신만만하셔서요."'),
    d('"내가 언제?"'),
    j('"얼굴에 다 써 있던데요."'),
    d('"그럼 네가 잘못 읽은 거야."'),
    j('"그렇게 끝내시면 제가 억울한데요."'),
  ],
  [
    j('"아무것도 없네요."'),
    d('"응."'),
    j('"제가 괜히 기대했습니다."'),
    d('"기대는 해도 돼."'),
    j('"그럼 다음에도 기대하겠습니다."'),
    d('"마음대로 해."'),
    j('"그 말씀하시는 거 보니 탐정님도 기대하고 계시네요."'),
  ],
  [
    d('"허탕이다."'),
    j('"네."'),
    d('"왜 그렇게 웃어."'),
    j('"탐정님도 가끔 이런 날이 있구나 싶어서요."'),
    d('"뭐, 사람인데."'),
    j('"그 말씀 오늘 몇 번째인지 아십니까?"'),
    d('"세지 마."'),
  ],
  [
    j('"이번에는 꽤 자신 있으셨죠?"'),
    d('"내가?"'),
    j('"네."'),
    d('"근거는."'),
    j('"방금 들어올 때 발걸음이 빨랐습니다."'),
    d('"그걸까지 봐?"'),
    j('"오래 따라다니면 보입니다."'),
  ],
  [
    d('"안 나오네."'),
    j('"네. 아주 안 나옵니다."'),
    d('"좋아할 일은 아니지만."'),
    j('"그럼 다행입니다."'),
    d('"뭐가."'),
    j('"탐정님이 아무것도 안 나오는데 웃고 계셔서요."'),
    d('"나 안 웃어."'),
    j('"네. 그러시겠죠."'),
  ],
  [
    j('"제가 웃으면 안 되겠죠?"'),
    d('"왜."'),
    j('"탐정님 표정이 좀..."'),
    d('"뭐."'),
    j('"아닙니다."'),
    d('"말해."'),
    j('"다음부터는 먼저 확인하고 웃겠습니다."'),
  ],
  [
    d('"왜 웃어."'),
    j('"안 웃었습니다."'),
    d('"웃었어."'),
    j('"그럼 제가 잘못했습니다."'),
    d('"뭘 잘못했는데."'),
    j('"웃은 거요."'),
    d('"그게 그렇게 큰 잘못이냐."'),
    j('"탐정님 표정 보니 큰 것 같습니다."'),
  ],
  [
    j('"이번 건은 저도 모르겠습니다."'),
    d('"나도."'),
    j('"이렇게 바로 인정하시는 건 처음 봅니다."'),
    d('"가끔은 인정해야지."'),
    j('"그럼 저도 오늘은 그냥 모르겠습니다."'),
    d('"그래."'),
    j('"편하네요."'),
  ],
  [
    d('"생각보다 단단하네."'),
    j('"사람이 질문을 많이 받으면 단단해지죠."'),
    d('"네가 해 봐서 알아?"'),
    j('"탐정님한테 매일 질문받습니다."'),
    d('"그건 네가 잘못한 거고."'),
    j('"제가요?"'),
    d('"따라오잖아."'),
    j('"그건 또 그렇습니다."'),
  ],
  [
    j('"오늘은 제가 할 말이 없네요."'),
    d('"드문 일인데."'),
    j('"저도 그렇게 생각합니다."'),
    d('"그러니까 조용히 있어."'),
    j('"그건 자신 없습니다."'),
    d('"왜."'),
    j('"탐정님이 혼자 고민하고 계시면 옆에서 한마디 하고 싶어집니다."'),
    d('"그 한마디가 늘 문제야."'),
  ],
  [
    d('"별거 없네."'),
    j('"네."'),
    d('"실망했어?"'),
    j('"조금요."'),
    d('"왜."'),
    j('"뭔가 나올 줄 알았습니다."'),
    d('"나도."'),
    j('"그럼 저랑 똑같네요."'),
  ],
  [
    j('"이걸로 끝이면 좀 허무합니다."'),
    d('"끝난다고 한 적 없어."'),
    j('"그럴 줄 알았습니다."'),
    d('"뭘."'),
    j('"탐정님이 그 말 하실 줄요."'),
    d('"너무 오래 봤네."'),
    j('"네. 그건 인정합니다."'),
  ],
  [
    d('"너도 모르겠지?"'),
    j('"모르는 척하고 있습니다."'),
    d('"왜."'),
    j('"탐정님이 생각 정리하시는 중인 것 같아서요."'),
    d('"그걸 또 알아?"'),
    j('"표정이 있잖습니까."'),
    d('"그런 것도 보지 마."'),
    j('"이미 봤습니다."'),
  ],
  [
    j('"제가 괜히 기대했나 봅니다."'),
    d('"기대할 수 있지."'),
    j('"탐정님도 하셨잖아요."'),
    d('"내가?"'),
    j('"네. 아까 제일 먼저 들어가셨습니다."'),
    d('"그건 빨리 보려고 그런 거야."'),
    j('"그게 기대 아니면 뭡니까?"'),
  ],
  [
    d('"조용하네."'),
    j('"네."'),
    d('"왜."'),
    j('"지금은 제가 말하면 방해될 것 같아서요."'),
    d('"그래도 말하잖아."'),
    j('"그건 탐정님이 먼저 물어보셨으니까요."'),
    d('"그건 맞네."'),
  ],
  [
    j('"이번엔 정말 빈손입니다."'),
    d('"그 손으로 다시 하면 돼."'),
    j('"말은 쉽습니다."'),
    d('"그래서 네가 하는 거잖아."'),
    j('"탐정님은 책임을 참 자연스럽게 나누십니다."'),
    d('"같이 하는 일이니까."'),
    j('"그런 말씀 하실 때는 또 그럴듯합니다."'),
  ],
  [
    d('"오늘 운이 없네."'),
    j('"운으로 수사하시는 분은 아니잖아요."'),
    d('"알아."'),
    j('"그런데 오늘은 유난히 아쉬워하시는데요."'),
    d('"네가 말을 많이 해서 그래."'),
    j('"그건 제가 잘못했습니다."'),
    d('"그렇게 빨리 인정하지 마."'),
  ],
  [
    j('"탐정님은 아직 젊으십니까?"'),
    d('"갑자기 왜."'),
    j('"아까부터 한숨이 많으셔서요."'),
    d('"네 한숨이 더 많아."'),
    j('"전 아직 체력에 자신 있습니다."'),
    d('"그럼 짐 들어."'),
    j('"...그건 다른 이야기 아닙니까?"'),
    d('"아니야. 같은 이야기야."'),
  ],
  [
    d('"이제 그만 웃어."'),
    j('"안 웃고 있습니다."'),
    d('"입이 웃고 있어."'),
    j('"탐정님도 조금 올라가셨는데요."'),
    d('"난 원래 그래."'),
    j('"그럼 저도 원래 그렇겠습니다."'),
    d('"따라 하지 마."'),
    j('"네."'),
  ],
  [
    j('"이번엔 정말 아무것도 없네요."'),
    d('"응."'),
    j('"탐정님도 인정하시네요."'),
    d('"없는 걸 있다고 하진 않아."'),
    j('"오늘은 좀 솔직하시네요."'),
    d('"원래 솔직해."'),
    j('"그건 제가 판단하겠습니다."'),
  ],
  [
    d('"허탕이야."'),
    j('"네."'),
    d('"웃지 마."'),
    j('"안 웃었습니다."'),
    d('"입꼬리 올라갔어."'),
    j('"탐정님도 조금 올라가셨는데요."'),
    d('"나는 안 웃어."'),
    j('"네. 그러시겠죠."'),
  ],
  [
    j('"이번엔 제가 할 말이 없습니다."'),
    d('"드문 일인데."'),
    j('"저도 그렇게 생각합니다."'),
    d('"그럼 조용히 있어."'),
    j('"그건 자신 없습니다."'),
    d('"왜."'),
    j('"옆에서 탐정님이 고민하시면 한마디 하고 싶어집니다."'),
    d('"그 한마디가 늘 길어."'),
  ],
  [
    d('"안 나오네."'),
    j('"네. 생각보다 단단합니다."'),
    d('"상대가?"'),
    j('"아니요. 오늘이요."'),
    d('"오늘이 왜."'),
    j('"아침부터 계속 이렇잖습니까."'),
    d('"아직 하루 안 끝났어."'),
    j('"그 말씀을 기다리고 있었습니다."'),
  ],
  [
    j('"제가 괜히 기대했나 봅니다."'),
    d('"기대한 건 괜찮아."'),
    j('"탐정님도 기대하셨으면서요."'),
    d('"내가?"'),
    j('"발걸음부터 빨라지셨습니다."'),
    d('"그걸 봤어?"'),
    j('"그 정도는 봅니다."'),
    d('"쓸데없이 눈치 빠르네."'),
  ],
  [
    d('"오늘은 잘 안 풀리네."'),
    j('"네."'),
    d('"왜 대답이 그렇게 빠르지?"'),
    j('"탐정님이 한숨 쉬실 때마다 같이 긴장해서요."'),
    d('"한숨 안 쉬었어."'),
    j('"방금 하셨습니다."'),
    d('"한 번."'),
    j('"저도 한 번만 세겠습니다."'),
  ],
];

// 긴 것은 자리마다 사건에 한 번씩만 나온다.
//
// 처음에는 헛짚음만 막았는데, 그러면 나머지 세 자리에서는 긴 것이 다
// 소진될 때까지 계속 나온다 — 단계 돌파는 사건당 두세 번 터지고 긴 것이
// 세 개라 한 사건이 그것으로 다 채워지고, 두 줄짜리 열네 쌍은 한 번도
// 안 나온다. 자리마다 한 번이라야 "긴 것 한 번 → 나머지는 두 줄"이 된다.
// 무언가 찾은 순간의 긴 주고받기 (2026-09 사용자 작성).
//
// 이 자리에 긴 것이 생긴 것은 다른 세 자리보다 늦다. 발견은 사건당 열 번도
// 넘게 일어나므로 매번 여덟 줄이 나가면 수사가 아니라 만담이 된다. 그래서
// 다른 자리와 똑같이 EXCHANGE_ONCE_PER_CASE 에 넣었다 — 사건당 한 번, 나머지
// 발견은 두 줄짜리 BANTER_DISCOVERY 가 받는다.
//
// 사건의 첫 카드에는 나오지 않는다. 그 자리는 BANTER_FIRST_CARD 가 "첫 장에
// 기대지 마라"를 말하도록 짝지어 쓰인 자리이고, 긴 것이 그 앞을 가로채면
// 사건마다 한 번뿐인 그 말이 사라진다.
// 이 풀은 2,604장이 같이 쓴다. 그래서 **무엇을 찾았는지 이름 붙이지
// 않는다** — 「여기 흔적.」이 약국 영수증을 주운 턴에 나가면 두 사람이 있지도
// 않은 것을 보고 있는 것이 된다(CASE001 실플레이 E05). 물성을 말하는 낱말
// (흔적·자국·깨끗·젖은·냄새)을 넷 고쳤다. 가리키는 말(「여기.」「이거.」)과
// 두 사람 사이의 말은 매체를 안 타므로 그대로 둔다. 물건을 입에 올려야 할
// 자리는 마스터의 `evidence[].reaction` 이다.
const EXCHANGE_DISCOVERY: Exchange[] = [
  [
    d('"찾았다."'),
    j('"뭘요?"'),
    d('"이거."'),
    j('"아, 그 표정 나오셨네요."'),
    d('"무슨 표정."'),
    j('"뭔가 걸렸을 때 나오는 표정이요."'),
    d('"네가 그걸 왜 알아."'),
    j('"오래 봤으니까요."'),
  ],
  [
    j('"잠깐만요."'),
    d('"왜."'),
    j('"이거 그냥 넘기시면 안 될 것 같은데요."'),
    d('"그래?"'),
    j('"네. 여기만 유독 다릅니다."'),
    d('"그럼 사진부터."'),
    j('"이미 찍었습니다."'),
    d('"역시."'),
  ],
  [
    d('"지우."'),
    j('"네."'),
    d('"이리 와서 이것 좀 봐."'),
    j('"네."'),
    j('"이건 꽤 이상하네요."'),
    d('"그렇지."'),
    j('"탐정님이 먼저 찾으실 줄 알았습니다."'),
    d('"내가 찾았잖아."'),
  ],
  [
    j('"찾으셨습니까?"'),
    d('"응."'),
    j('"이번에는 오래 안 걸리셨네요."'),
    d('"무슨 뜻이야."'),
    j('"평소보다 일찍 멈추셨길래요."'),
    d('"쓸데없는 거 보고 있었네."'),
    j('"그 쓸데없는 게 가끔 도움이 됩니다."'),
    d('"가끔만."'),
  ],
  [
    d('"이거 봐."'),
    j('"네."'),
    d('"여기만 달라."'),
    j('"저도 방금 그쪽 보고 있었습니다."'),
    d('"왜 먼저 안 말했어?"'),
    j('"탐정님이 먼저 찾으시는지 보려고요."'),
    d('"시험했어?"'),
    j('"조금요."'),
  ],
  [
    j('"이건 좀 수상한데요."'),
    d('"그래."'),
    j('"탐정님도 그렇게 생각하시죠?"'),
    d('"응."'),
    j('"그럼 제가 이번에는 맞춘 겁니까?"'),
    d('"아직 몰라."'),
    j('"역시 쉽게 안 주십니다."'),
    d('"당연하지."'),
  ],
  [
    d('"사진 찍어."'),
    j('"네."'),
    d('"이것도."'),
    j('"네."'),
    d('"그리고 이 부분 확대해서."'),
    j('"탐정님."'),
    d('"왜."'),
    j('"제가 사진 담당인 건 알겠는데, 오늘은 유난히 많습니다."'),
    d('"찾은 게 많으니까."'),
    j('"그 말씀은 인정하겠습니다."'),
  ],
  [
    j('"방금 멈추신 데, 뭔가 있죠?"'),
    d('"왜 그렇게 생각해."'),
    j('"탐정님이 뭔가 찾으셨을 때 항상 손이 먼저 멈춥니다."'),
    d('"그걸 또 보고 있었어?"'),
    j('"제가 옆에서 할 일이 그것뿐이라서요."'),
    d('"쓸데없이 정확하네."'),
    j('"정작 중요한 건 잘 봐야죠."'),
  ],
  [
    d('"됐어."'),
    j('"찾으셨습니까?"'),
    d('"응."'),
    j('"표정 보니까 꽤 중요한 모양이네요."'),
    d('"중요할 수도 있지."'),
    j('"그 말씀하시면 거의 중요한 거던데요."'),
    d('"거의가 아니고."'),
    j('"네. 알겠습니다."'),
  ],
  [
    j('"잠깐 보겠습니다."'),
    d('"뭐가 보여?"'),
    j('"아직 모르겠습니다."'),
    d('"그런데?"'),
    j('"탐정님이 왜 거기서 웃고 계시는지는 알 것 같습니다."'),
    d('"내가 웃었어?"'),
    j('"네. 아주 조금요."'),
    d('"그럼 됐어."'),
  ],
  [
    d('"이건 적어 둬."'),
    j('"네."'),
    d('"중요해."'),
    j('"그 말까지 적을까요?"'),
    d('"그건 왜."'),
    j('"탐정님이 중요한 거 찾으시면 꼭 그렇게 말씀하시니까요."'),
    d('"습관이야."'),
    j('"그래서 더 기억하기 쉽습니다."'),
  ],
  [
    j('"받아 적었습니다."'),
    d('"뭘."'),
    j('"여기 이 부분입니다."'),
    d('"오."'),
    j('"이번엔 줄까지 맞췄습니다."'),
    d('"그래. 잘했어."'),
    j('"끝입니까?"'),
    d('"더 해 줄까?"'),
    j('"아닙니다. 갑자기 많아지면 부담스럽습니다."'),
  ],
  [
    d('"이거 이상하지."'),
    j('"네."'),
    d('"뭐가 이상한지 말해 봐."'),
    j('"탐정님이 먼저 찾았는데 저한테 시험 문제처럼 내시는 게요."'),
    d('"정답 알고 있잖아."'),
    j('"그래도 문제는 어렵습니다."'),
    d('"그럼 틀려."'),
    j('"그 말씀은 또 참 편하십니다."'),
  ],
  [
    j('"이건 그냥 지나치면 안 될 것 같습니다."'),
    d('"왜."'),
    j('"여기만 눈에 걸립니다."'),
    d('"잘 봤네."'),
    j('"칭찬입니까?"'),
    d('"응."'),
    j('"오늘 두 번째입니다."'),
    d('"뭐가."'),
    j('"칭찬하신 거요."'),
    d('"세지 마."'),
  ],
  [
    d('"지우, 이거 봐."'),
    j('"네."'),
    d('"여기."'),
    j('"봤습니다."'),
    d('"언제?"'),
    j('"탐정님이 보시기 직전쯤요."'),
    d('"왜 말 안 했어?"'),
    j('"탐정님이 얼마나 빨리 찾으시는지 보고 싶어서요."'),
    d('"다음부터 그러지 마."'),
    j('"네. 재미는 있었는데요."'),
  ],
  // 원래 두 줄짜리로 받은 것인데 세 줄이라 이쪽에 둔다. 같은 객체에 jiwoo 가
  // 두 번 쓰여 있어서 그대로 두면 JS 가 뒤엣것만 남기고 첫 줄을 버린다.
  [
    j('"아무래도 이건 설명을 한 번 들어봐야겠습니다."'),
    d('"까먹지 말고 물어봐라."'),
    j('"제가요?"'),
  ],
  [
    j('"또 찾으셨네요."'),
    d('"응."'),
    j('"이제 제가 놀라지도 않는 게 문제입니다."'),
    d('"익숙해진 거지."'),
    j('"그건 맞습니다."'),
    d('"좋네."'),
    j('"다만 탐정님이 너무 빨리 찾으시면 제가 할 일이 줄어듭니다."'),
    d('"그럼 더 빨리 따라와."'),
  ],
];

const EXCHANGE_ONCE_PER_CASE = new Set([
  'stage_break',
  'herring_clear',
  'dead_end',
  'discovery',
]);

const EXCHANGE_POOLS: Record<string, Exchange[]> = {
  stage_break: EXCHANGE_STAGE_BREAK,
  herring_clear: EXCHANGE_HERRING_CLEAR,
  dead_end: EXCHANGE_DEAD_END,
  discovery: EXCHANGE_DISCOVERY,
};

// 이 자리의 긴 주고받기를 지금 쓸 수 있으면 돌려준다. 못 쓰면 null 이고,
// 부르는 쪽은 지금까지의 한 줄짜리로 떨어진다.
//
// 같은 사건에서 같은 대화가 두 번 나오지 않게 고른 것을 completed_actions 에
// 적어 둔다 — 짧은 한마디와 달리 여섯 줄짜리는 두 번째에 바로 들킨다.
// recent 는 안에서 만들지 않고 밖에서 받는다. 한때 안에서
// recentlySaid(state) 를 불렀는데, 턴 엔진을 지나지 않는 호출자가 하나
// 있어서(사건 종결 뒤 주고받기, 지금은 없다) full_dialogue_log 가 없는
// state 에 .map 을 부르다 예외가 났고 그게 그대로 「사건을 종결하지
// 못했습니다」가 됐다(2026-09 실플레이 신고). 부르는 쪽이 자기 자리에서
// 무엇이 최근에 나왔는지 알고 있으므로, 받는 쪽이 맞다.
function pickExchange(
  state: EngineState,
  slot: string,
  seed: number,
  recent: string[],
): { lines: Exchange; marker: string } | null {
  const pool = EXCHANGE_POOLS[slot];
  if (!pool?.length) return null;
  if (EXCHANGE_ONCE_PER_CASE.has(slot) && done(state, `exchange|${slot}`)) {
    return null;
  }
  const fresh = pool
    .map((lines, index) => ({ lines, index }))
    .filter((item) => !done(state, `exchange|${slot}|${item.index}`));
  if (!fresh.length) return null;
  // 긴 것도 같은 규칙으로 고른다 — 열쇠는 첫 줄이다. 62개 중 열두 개가
  // 두 줄짜리와 도입이 겹치므로, 그 쌍이 이미 나왔으면 횟수가 잡혀 뒤로
  // 밀린다.
  const chosen =
    chooseBalanced(fresh, (item) => item.lines[0]?.line || '', recent, seed) ||
    fresh[Math.abs(seed) % fresh.length];
  return {
    lines: chosen.lines,
    marker: `exchange|${slot}|${chosen.index}`,
  };
}

// 긴 주고받기가 있으면 그것을 쓰고, 없으면 지금까지의 한 줄짜리를 남긴다.
function applyExchange(
  turn: OfflineTurn,
  state: EngineState,
  slot: string,
  seed: number,
  recent: string[],
): boolean {
  const picked = pickExchange(state, slot, seed, recent);
  if (!picked) return false;
  turn.gm.exchange = picked.lines.map((item) => ({ ...item }));
  turn.gm.detective_line = null;
  turn.gm.jiwoo_line = null;
  turn.completedActions.push(picked.marker);
  if (EXCHANGE_ONCE_PER_CASE.has(slot)) {
    turn.completedActions.push(`exchange|${slot}`);
  }
  return true;
}

// ---------------------------------------------------------------------------
// 전환점의 주고받기 — 두 줄짜리
//
// 위의 EXCHANGE_* 가 여섯 줄 넘게 가는 긴 것이라면, 이쪽은 같은 네 자리에
// 쓰는 두 줄짜리다. 긴 것은 자리마다 사건에 한 번씩만 나오고, 나머지는
// 여기서 받는다 — 긴 대화가 매번 나오면 수사가 시트콤이 된다.
//
// 이 풀의 핵심은 한지우가 받아 주기만 하지 않는 것이다(2026-09 사용자
// 작성). 지우가 찌르면 탐정이 받아치고, 탐정이 무심하게 던지면 지우가 한 번
// 더 비튼다. 그래서 자리마다 lead 가 섞여 있다.
//
// 규칙은 BANTER_DISCOVERY 위에 적힌 것 그대로 — 말투 비대칭(탐정 반말,
// 한지우 반존대), 한지우는 다음 대상을 고르지 않음, 일회성 과거 사건 금지,
// 사건 내용 금지. 자리별 허용/금지는 docs/banter-slots.md 에 있다.

const BANTER_STAGE_BREAK: BanterPair[] = [
  {
    lead: 'jiwoo',
    jiwoo: '"방금 말 바뀌었는데요."',
    detective: '"알아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"아까는 아니라고 하셨잖아요."',
    detective: '"그러니까 지금 다시 듣는 거야."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 나중에 빼달라고 하셔도 안 빼겠습니다."',
    detective: '"이것도 적어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"방금 대답 전에 좀 오래 생각하셨습니다."',
    detective: '"그걸 보고 있었어?"',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 저도 그건 들었습니다."',
    detective: '"앞뒤가 안 맞네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"탐정님, 지금 표정이 좀 좋아지셨는데요."',
    detective: '"그런가."',
  },
  {
    lead: 'detective',
    jiwoo: '"굵게 할까요?"',
    detective: '"표시해 둬."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"말이 길어지셨네요."',
    detective: '"질문이 많으니까."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 그 말씀 나오시면 중요한 거라는 건 압니다."',
    detective: '"방금 한 말 기억해."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 제가 먼저 알아챘습니다."',
    detective: '"그래? 칭찬해 줘?"',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 그런데 탐정님도 같은 걸 보고 계신 것 같습니다."',
    detective: '"네가 본 것도 말해."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 굳이 말씀드리지 않아도 되겠네요."',
    detective: '"그래도 말해."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 그 표정이면 한참 더 하실 것 같습니다."',
    detective: '"아직 끝난 거 아니야."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이제 좀 재미있어지시죠?"',
    detective: '"너만 재미있어하네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"방금 말이 바뀌었는데요."',
    detective: '"그래. 네가 놓치지 않았네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"아까는 확실하다고 하셨잖아요."',
    detective: '"확실한 것과 확실해 보이는 건 다르지."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 그런데 탐정님, 글씨체가 점점 험해지고 있습니다."',
    detective: '"방금 한 말 전부 적어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 대답까지 한 박자 늦으셨습니다."',
    detective: '"그걸 세고 있었어?"',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"표정 보셨어요?"',
    detective: '"봤어. 그래서 네가 웃는 거고."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 웃었습니까?"',
    detective: '"방금 입꼬리 올라갔어."',
  },
  {
    lead: 'detective',
    jiwoo: '"그럼 맞을 때까지 보면 되는 거죠?"',
    detective: '"이제 앞뒤가 안 맞아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"말씀이 아까랑 조금 달라졌네요."',
    detective: '"조금이면 시작하기 좋은 차이야."',
  },
  {
    lead: 'detective',
    jiwoo:
      '"이미 기억하고 있습니다. 탐정님이 중요한 순간엔 꼭 그렇게 말씀하시잖아요."',
    detective: '"이건 기억해 둬."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"또 제가 적어야 합니까?"',
    detective: '"응."',
  },
  {
    lead: 'detective',
    jiwoo: '"원래는 느리게 해야 합니까?"',
    detective: '"대답이 너무 빨라."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"아까보다 말씀이 길어졌는데요."',
    detective: '"사람은 불리해지면 설명이 많아져."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 그런데 표정은 벌써 끝난 사람처럼 보이십니다."',
    detective: '"아직 끝난 거 아니야."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"지금 꽤 만족스러워 보이십니다."',
    detective: '"티 났어?"',
  },
];

const BANTER_HERRING_CLEAR: BanterPair[] = [
  {
    lead: 'jiwoo',
    jiwoo: '"이쪽은 아니었네요."',
    detective: '"응."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"하나 빠졌네요."',
    detective: '"그래. 확인했으면 됐어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"괜히 오래 붙잡고 있었네요."',
    detective: '"확인하기 전까진 다 가능성이야."',
  },
  {
    lead: 'detective',
    jiwoo: '"표시만 남겨 두겠습니다."',
    detective: '"그건 지워."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 잘못 본 건가요?"',
    detective: '"처음 판단이 틀린 거지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그냥 지나갈 뻔했네요."',
    detective: '"그래서 확인한 거잖아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"한 가지 빠지니까 좀 편해지네요."',
    detective: '"수첩이?"',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 그럼 됐습니다."',
    detective: '"아니라는 것도 확인했어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"생각보다 빨리 정리됐습니다."',
    detective: '"가끔은 나도 빨라."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 탐정님이 그 말 하시면 정말 끝난 거니까요."',
    detective: '"이제 됐어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"한 가지는 정리됐네요."',
    detective: '"응. 그 정도면 충분해."',
  },
  {
    lead: 'detective',
    jiwoo: '"그러니까 오래 볼 필요는 없겠네요."',
    detective: '"이쪽은 아니네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 괜히 의심했네요."',
    detective: '"의심하는 게 네 일이기도 하잖아."',
  },
  {
    lead: 'detective',
    jiwoo: '"나중에 지울 필요가 없도록요?"',
    detective: '"이건 기록 남겨."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"조금 아쉽긴 하네요."',
    detective: '"왜."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"빠진 사람 하나 생겼네요."',
    detective: '"사람이 아니라 의심 하나가 빠진 거야."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"전 꽤 수상하다고 봤는데요."',
    detective: '"그래서 확인한 거잖아."',
  },
  {
    lead: 'detective',
    jiwoo: '"낙담은 안 했습니다. 조금 창피할 뿐이죠."',
    detective: '"처음 생각이 틀렸다고 낙담하지 마."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"그래도 헛수고는 아니었네요."',
    detective: '"응. 틀린 길도 길은 길이니까."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 탐정님이 마음 놓으시는 것도 오랜만이네요."',
    detective: '"정리됐으면 넘어가자."',
  },
];

const BANTER_DEAD_END: BanterPair[] = [
  {
    lead: 'jiwoo',
    jiwoo: '"아무것도 없네요."',
    detective: '"응."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 오늘도 하나 채우셨네요."',
    detective: '"허탕이다."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 꽤 자신 있으셨던 것 같은데요."',
    detective: '"내가?"',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 아주 안 나옵니다."',
    detective: '"안 나오네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 웃으면 안 되겠죠?"',
    detective: '"해 봐."',
  },
  {
    lead: 'detective',
    jiwoo: '"탐정님도 웃으셨습니다."',
    detective: '"왜 웃어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번 건은 저도 모르겠습니다."',
    detective: '"나도."',
  },
  {
    lead: 'detective',
    jiwoo: '"질문 많이 받으시면 원래 그렇게 됩니다."',
    detective: '"생각보다 단단하네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"오늘은 제가 할 말이 없네요."',
    detective: '"드문 날이네."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 정말 별거 없습니다."',
    detective: '"별거 없네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이걸로 끝이면 좀 허무한데요."',
    detective: '"끝난다고 한 적 없어."',
  },
  {
    lead: 'detective',
    jiwoo: '"모르는 척하는 겁니다."',
    detective: '"너도 모르겠지?"',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 괜히 기대했나 봅니다."',
    detective: '"기대한 만큼 움직였잖아."',
  },
  {
    lead: 'detective',
    jiwoo: '"제가 말 걸면 시끄럽다고 하실 거면서요."',
    detective: '"조용하네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번에는 정말 빈손입니다."',
    detective: '"그 손으로 다시 찾으면 되지."',
  },
  {
    lead: 'detective',
    jiwoo: '"운으로 수사하는 건 아니니까요."',
    detective: '"오늘 운이 없네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이런 날도 많이 겪어 보셨겠네요."',
    detective: '"너보다 나이 몇 달 많은 정도야."',
  },
  {
    lead: 'detective',
    jiwoo: '"안 웃고 있습니다."',
    detective: '"이제 그만 웃어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 정말 아무것도 없네요."',
    detective: '"그래 보여."',
  },
  {
    lead: 'detective',
    jiwoo: '"오늘 한 번쯤은 해야 했던 거죠."',
    detective: '"허탕이다."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 괜히 기대했나 봅니다."',
    detective: '"그 기대 때문에 여기까지 온 거야."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 너무 정직하게 안 나오네요."',
    detective: '"안 나오네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 표정도 안 좋으십니다."',
    detective: '"원래 이런 얼굴이야."',
  },
  {
    lead: 'detective',
    jiwoo: '"안 웃었습니다."',
    detective: '"웃지 마."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"지금 조금 억울해 보이시는데요."',
    detective: '"네가 자꾸 그걸 확인하니까 그렇지."',
  },
  {
    lead: 'detective',
    jiwoo: '"그 말 들으니까 제가 괜히 같이 긴장됩니다."',
    detective: '"생각보다 단단하네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번엔 제가 아무 말도 안 하겠습니다."',
    detective: '"그래. 그게 더 불안해."',
  },
  {
    lead: 'detective',
    jiwoo: '"그럼 오늘 운도 여기까지인가 봅니다."',
    detective: '"아무것도 없어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"또 조용해졌네요."',
    detective: '"시끄러운 것보다 낫잖아."',
  },
  {
    lead: 'detective',
    jiwoo: '"그 말을 탐정님한테 들으니 더 허무합니다."',
    detective: '"별거 없네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 위로를 해 드려야 합니까?"',
    detective: '"아니."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 그런데 이상하게 탐정님은 이런 날도 안 포기하시죠."',
    detective: '"오늘은 안 풀리네."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이번에도 빗나갔습니다."',
    detective: '"빗나간 걸 알았으면 됐어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"너무 조용한데요."',
    detective: '"조용하면 네가 꼭 한마디를 하지."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"제가 분위기라도 살려 드릴까요?"',
    detective: '"그건 됐어. 더 시끄러워질 것 같아."',
  },
  {
    lead: 'detective',
    jiwoo: '"그 말씀도 안 믿겠습니다."',
    detective: '"다음부터는 기대하지 마."',
  },
];
// 마지막 단계가 깨진 자리. 여기서 웃으면 안 된다 — 이 게임에서 사람이
// 무엇을 지키려 했는지가 방금 그 사람 입으로 나온 참이다. 그래서 농담
// 대신 ① 방금 들은 것의 무게를 한 박자 두고 ② 이제 남은 것이 종결뿐임을
// 알린다. 탐정은 한지우에게 반말, 한지우는 탐정에게 반존대.
const BANTER_LAST_STAGE: BanterPair[] = [
  {
    lead: 'jiwoo',
    jiwoo: '"...여기까지가 다인 거죠."',
    detective: '"응. 더 나올 건 없어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"수첩에 더 적을 데가 없는데요."',
    detective: '"그럼 덮어. 남은 건 읽는 것뿐이야."',
  },
  {
    lead: 'detective',
    jiwoo: '"네. 처음부터 끝까지 한 줄로 이어집니다."',
    detective: '"이제 앞뒤가 다 맞아."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"이런 건 좀 익숙해질 줄 알았어요."',
    detective: '"안 익숙해지는 게 나아."',
  },
  {
    lead: 'detective',
    jiwoo: '"...저는 아직 좀 그런데요."',
    detective: '"끝났어."',
  },
  {
    lead: 'jiwoo',
    jiwoo: '"정리는 제가 할게요. 탐정님은 말씀만 하시면 되고요."',
    detective: '"늘 그랬잖아."',
  },
];

const BANTER_SLOTS: Record<string, BanterPair[]> = {
  stage_break: BANTER_STAGE_BREAK,
  last_stage: BANTER_LAST_STAGE,
  herring_clear: BANTER_HERRING_CLEAR,
  dead_end: BANTER_DEAD_END,
};

// 지금 깨진 단계가 case_complete 가 요구하는 **마지막** 단계인가.
//
// 요구 목록이 비어 있는 옛 마스터에서는 판정할 재료가 없으므로 false 로
// 떨어진다 — 아무 일도 안 일어나던 종전과 같다.
function lastRequiredStage(
  index: CaseIndex,
  state: EngineState,
  stageId: string,
): boolean {
  const required = index.master.caseComplete.requiredContradictionStages.filter(
    (id) => /^C\d{2}$/.test(id),
  );
  if (!required.length) return false;
  if (!required.includes(stageId)) return false;
  return required.every(
    (id) => id === stageId || done(state, `stage|${id}`),
  );
}

// 전환점 한 자리의 주고받기. 긴 것이 아직 남아 있으면 그쪽을 먼저 쓰고,
// 아니면 두 줄짜리로 떨어진다. 어느 쪽이든 turn.gm.exchange 에 실린다 —
// 두 줄도 순서가 내용이라 detective_line/jiwoo_line 으로 나눠 담으면
// 위치 규칙(before/after/reply)에 다시 얽힌다.
function applyBanterSlot(
  turn: OfflineTurn,
  state: EngineState,
  slot: string,
  seed: number,
  recent: string[],
): boolean {
  if (applyExchange(turn, state, slot, seed, recent)) return true;
  const pool = BANTER_SLOTS[slot];
  if (!pool?.length) return false;
  // 쌍의 열쇠는 한지우 줄이다 — 103쌍 전부 서로 다르고, 탐정 줄은 "응."
  // 처럼 짧아 다른 쌍의 줄 안에 들어가 버리는 것이 있다.
  const pair = chooseBalanced(pool, (item) => item.jiwoo, recent, seed);
  if (!pair) return false;
  turn.gm.exchange =
    pair.lead === 'jiwoo'
      ? [j(pair.jiwoo), d(pair.detective)]
      : [d(pair.detective), j(pair.jiwoo)];
  turn.gm.detective_line = null;
  turn.gm.jiwoo_line = null;
  return true;
}
