import { env } from 'cloudflare:workers';
import caseData from '@/data/cases/CASE014/case.json';
import caseIndex from '@/data/cases/index.json';
import {
  hasMovementScopeViolation,
  hasPrematureVideoVerdict,
  hasUnaskedTimelineDisclosure,
  investigationActionScope,
  normalizePlayerInput,
  parseInvestigationAction,
  responseScopeContract,
  isBroadVideoReviewAction,
  isConversationQuestion,
  isExplicitGroupQuestion,
  isGroupInteractionAction,
  isNpcSummonAction,
  isRecordReviewAction,
  isSituationalQuestion,
  type ParsedInvestigationAction,
  type ResponseScopeContract,
} from './gm/action-scope';
import {
  hasDecisiveSignal,
  hasSpoilerSignal,
  hasUnsupportedExclusion,
  hasUnprovedRecordInference,
  isSealComparisonAction,
  validateDraftResponse,
} from './gm/response-signals';
import {
  caseClosingPrompt,
  metaPrompt,
  responseRepairPrompt,
} from './gm/meta-prompts';
import { hanJiwooExamples } from './gm/jiwoo-examples';
import type { ResponseViolation } from './gm/response-signals';
import {
  generateCaseMaster,
  buildUploadEnvelope as buildGeneratedCaseEnvelope,
  type GenerationProgress,
  type OnProgress,
} from './gm/case-generation';

type Role = 'assistant' | 'user' | 'detective' | 'jiwoo';
export type InputMode = 'play' | 'meta' | 'case_close';

export type Dialogue = {
  role: Role;
  content: string;
  mode?: InputMode;
};

type JiwooTrigger =
  | 'none'
  | 'cooldown_expired'
  | 'emotional_testimony'
  | 'contradiction_unlock';

type SceneEstablishedFact = {
  id: string;
  turn_id: string;
  subject_id?: string;
  location_id?: string;
  fact: string;
  source: 'safe_improvisation' | 'direct_observation' | 'npc_statement';
  certainty: 'established' | 'claimed' | 'approximate';
};

type ImprovisedFactImpact =
  | 'harmless_scene_detail'
  | 'continuity_relevant_detail'
  | 'case_decisive_detail';

export type GameState = {
  schema_version: 2;
  case_id: string;
  session_id: string;
  master_version: string;
  case_status: 'in_progress' | 'complete';
  current_scene: string;
  current_location: string;
  visited_locations: string[];
  current_interview: string | null;
  interviewed_characters: string[];
  npc_statement_stage: Record<string, string>;
  npc_status: Record<string, string>;
  acquired_information: string[];
  presented_evidence: Array<{
    evidence_id: string;
    target_id: string | null;
    presented_at: string;
  }>;
  known_public_timeline: string[];
  player_notes: string[];
  player_established: string[];
  player_not_established: string[];
  scene_established_facts: SceneEstablishedFact[];
  case_memory: string[];
  recent_conversation: Dialogue[];
  // Same entries as recent_conversation, but never sliced — this is the
  // full-session transcript the play-log export reads. It rides along in
  // the same saveState write as everything else, so logging costs no
  // extra DB round trip; the trade-off is the saved state growing with a
  // long session, which is negligible at this app's scale.
  full_dialogue_log: Dialogue[];
  // Which reason (if any) let Jiwoo speak each turn, bounded to a short
  // trailing window. Used only to stop the same forced-override reason
  // (e.g. every evidence presentation) from making her appear on an
  // unbroken schedule; see playerTurnsSinceLastJiwoo / jiwooForced.
  jiwoo_trigger_log: JiwooTrigger[];
  final_deduction_state: {
    submitted: boolean;
    judgement: string | null;
  };
  api_usage: {
    input_tokens: number;
    output_tokens: number;
    regeneration_count: number;
  };
  gm_validation_log: Array<{
    turn_id: string;
    player_input: string;
    action: ParsedInvestigationAction;
    violations: ResponseViolation[];
    regeneration_attempted: boolean;
    regeneration_succeeded: boolean;
  }>;
  last_action_contract: ResponseScopeContract | null;
  last_requested_answer_fields: ParsedInvestigationAction['requestedFields'];
};

type GmResponse = {
  message: string;
  detective_line: string | null;
  detective_line_position: 'before' | 'after';
  jiwoo_line: string | null;
  jiwoo_line_position: 'before' | 'after';
  scene: {
    location_id: string;
    interview_character_id: string | null;
  };
  acquire: string[];
  presented_evidence: Array<{
    evidence_id: string;
    target_id: string | null;
  }>;
  npc_updates: Array<{
    npc: string;
    status: string;
    statement_stage: string | null;
  }>;
  timeline_notes: string[];
  player_established: string[];
  scene_facts: Array<{
    fact: string;
    impact: ImprovisedFactImpact;
    subject_id: string | null;
    location_id: string | null;
    source: SceneEstablishedFact['source'];
    certainty: SceneEstablishedFact['certainty'];
  }>;
  memory_updates: string[];
  case_complete_candidate: boolean;
  final_judgement: string | null;
};

export type CaseSummary = {
  id: string;
  title: string;
  status_label: string;
  summary: string;
  path: string;
  source: 'built_in' | 'uploaded';
  tags: string[];
};

type CaseLocation = {
  id: string;
  name: string;
  description: string;
};

type CaseNpc = {
  id: string;
  name: string;
  role: string;
  initial_status: string;
};

type CaseCard = {
  id: string;
  title: string;
  category: string;
  source: string;
  condition: string;
  summary: string;
  content?: string;
  proves_fact_ids?: string[];
  does_not_prove_fact_ids?: string[];
};

type CaseData = {
  case_id: string;
  master_version?: string;
  title: string;
  status_label: string;
  opening_scene: string;
  public_intro: string;
  master: Record<string, unknown>;
  locations: CaseLocation[];
  npcs: CaseNpc[];
  cards: CaseCard[];
  information_catalog?: unknown[];
  final_deduction?: Record<string, unknown>;
  master_tags?: string[];
};

type TxtBlock = {
  header: string;
  body: string;
};

const builtInCases: Record<string, CaseData> = {
  CASE014: caseData,
};

const builtInCaseSummaries: CaseSummary[] = caseIndex.map((item) => ({
  ...item,
  source: 'built_in',
  tags: Array.isArray((item as { tags?: unknown }).tags)
    ? (item as { tags: string[] }).tags
    : [],
}));

const caseIntroFallbacks: Record<string, string> = {
  CASE007: `오후 5시 42분. 폐관한 옛 은행 건물을 개조한 '명진옥션홀'.

준법감사 변호사 서정규가 당신을 자신의 임시 사무실로 안내한다. 책상 위에는 운송 송장과 미술품 반입기록이 펼쳐져 있다.

"자선경매 운송비가 몇 년째 비정상적으로 부풀려졌습니다. 내부 자료까지 외부로 새고 있어요. 오늘 밤 이사회에서 원본을 공개하기 전에, 누가 손을 대고 있는지 확인해주십시오."

서정규는 문서 봉투 하나를 당신에게 맡긴다.

"경찰에 넘길 핵심 자료입니다. 행사 중에는 손님인 척해주십시오. 누구도 당신이 탐정이라는 걸 알아선 안 됩니다."

오후 8시 30분.

경매홀의 조명이 켜지고 서정규가 개막 건배를 위해 무대에 오른다. 진행 순서에 따라 밀봉된 생수 한 병이 건네진다.

서정규는 물을 한 모금 마신 뒤 양복 주머니에서 은색 물건을 꺼내 두 번 사용한다. 곧이어 잔을 들고 입을 연다.

"오늘 이 자리가 투명한 나눔의 시작이 되기를..."

말이 끊긴다.

서정규가 잔을 놓치고 그대로 무대 위에 쓰러진다. 의료진이 달려오지만 오후 8시 42분, 사망이 확인된다.

사람들의 시선이 가장 먼저 향한 곳은 마지막 생수를 건넨 차윤서다.

윤서가 천천히 당신 쪽으로 고개를 돌린다.

"제가 건넨 건 밀봉된 병이었습니다."

"그래서 확인하려는 겁니다."

"지금 저를 의심하시는 건가요?"

"마지막으로 물을 건넨 사람이니까요."

"그 말, 기록에 남겨두겠습니다."

차윤서는 무전기를 내려놓지 못한 채 한 걸음 물러선다. 진행자 명찰 아래로 손끝이 굳어 있다.

한지우가 사건 파일을 접어 든다.

"시선은 저 사람에게 쏠렸어요. 하지만 무대 위에 남은 건 생수병만은 아니네요."

경매홀의 출입이 통제된다. 무대 위에는 서정규가 마시던 생수병과 잔, 은색 휴대용 물건이 그대로 남아 있다.`,
};

const legacyIntroByCase: Record<string, string[]> = {
  CASE007: [
    '서정규는 자선경매 운송비가 반복 부풀려진 정황을 발견해 탐정에게 원본 자료 보호와 내부자 확인을 의뢰했다. 탐정은 행사장에 들어와 있다가 20:32 의뢰인이 쓰러지면서 살인 사건을 직접 맞는다.',
  ],
};

function withCaseOverrides(caseData: CaseData): CaseData {
  const intro = caseIntroFallbacks[caseData.case_id.toUpperCase()];

  if (!intro || caseData.public_intro.includes('\n')) return caseData;

  return {
    ...caseData,
    public_intro: intro,
  };
}

function firstNonEmpty(values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || '';
}

function naturalizeCaseNote(value: string) {
  return value
    .replace(/피해자\s*붕괴/g, '피해자 쓰러짐')
    .replace(/붕괴/g, '쓰러짐')
    .replace(/사망자/g, '피해자')
    .trim();
}

function safeSummonedNpcMessage(selectedCase: CaseData, userText: string) {
  const npc = selectedCase.npcs.find((item) => userText.includes(item.name));
  if (!npc) return '잠시 뒤, 부른 관계자가 현장에 모습을 드러낸다.';

  return `${npc.name}이 ${npc.role}답게 주변을 한 번 훑고 당신 앞에 선다.\n\n“절 찾으셨습니까?”\n\n한지우는 옆으로 한 걸음 물러나, 당신이 먼저 입을 열기를 기다린다.`;
}

function isOpeningWitnessReply(state: GameState) {
  return (
    state.recent_conversation.filter((item) => item.role === 'user').length <= 1
  );
}

// Appends to both the model-facing sliding window (capped, so token cost
// per turn stays bounded) and the full unbounded log the play-log export
// reads from.
function pushDialogue(state: GameState, entry: Dialogue) {
  state.recent_conversation.push(entry);
  state.recent_conversation = state.recent_conversation.slice(-30);
  state.full_dialogue_log.push(entry);
}

const JIWOO_COOLDOWN_TURNS = 3;

// Counts player turns (not raw array slots, since detective/assistant
// dialogue entries share the same array) since Jiwoo last had a line, so
// the cooldown means "3 player turns" rather than "3 array slots".
function playerTurnsSinceLastJiwoo(conversation: Dialogue[]): number {
  let count = 0;
  for (let i = conversation.length - 1; i >= 0; i -= 1) {
    if (conversation[i].role === 'jiwoo') return count;
    if (conversation[i].role === 'user') count += 1;
  }
  return Infinity;
}

// Approximates "a contradiction stage just unlocked": an NPC's statement
// stage actually advanced (not just a status/location update) on a turn
// where the player presented evidence to prompt it.
function justUnlockedContradiction(gmResponse: GmResponse): boolean {
  return (
    gmResponse.presented_evidence.length > 0 &&
    gmResponse.npc_updates.some((update) => Boolean(update.statement_stage))
  );
}

// Approximates "an emotional testimony moment": an NPC's statement stage
// is moving at all, evidence or not (e.g. a confession triggered by
// dialogue alone). There's no player-input classifier for this in
// gm/action-scope.ts since it's a response-side event, not an action type.
function isEmotionalTestimonyMoment(gmResponse: GmResponse): boolean {
  return gmResponse.npc_updates.some((update) =>
    Boolean(update.statement_stage),
  );
}

function hasOpeningPartnerBriefing(value: string) {
  return /(?:관련된\s*문제|중심\s*단서|중요한\s*시간|살펴봐야|살펴보겠|확인해야|차근차근\s*살펴|더\s*자세히)/.test(
    value,
  );
}

function isNarrowCoatCustodyQuestion(value: string) {
  return /외투/.test(value) && /(?:맡겼|보관|걸어|여기)/.test(value);
}

function hasChainedCustodyDisclosure(value: string) {
  const signals = [
    /\d{1,2}\s*시\s*\d{1,2}\s*분|정확한\s*시각|도착\s*시각/,
    /자리를\s*비|잠시\s*비웠|부재/,
    /백미라|차윤서|윤태오|한도경|서은채/,
    /복도\s*(?:영상|CCTV)|출입\s*(?:영상|기록)|영상에\s*남/,
    /변함없|그대로\s*보관|건드린\s*흔적.*없/,
  ];

  return signals.filter((pattern) => pattern.test(value)).length >= 2;
}

function safeRecordReviewMessage(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
) {
  const target = conversationTarget(selectedCase, state, userText);
  const subject = target ? `${target.name}의 기록` : '기록';

  return `${subject}에서 확인되는 항목만 따로 적어 둔다.\n\n이 기록만으로는 그 이전 동선이나 다른 행동까지 단정할 수 없다.\n\n한지우는 추측을 덧붙이지 않고 확인된 시각과 구간만 표시한다.\n\n"기록은 짧게 말하네요. 그래서 덜 피곤해요."`;
}

function safeSealComparisonMessage() {
  return `밀봉 띠의 절단면과 병 고리의 접점이 빈틈없이 맞물린다. 눈에 띄는 뜯김이나 다시 끼운 흔적도 보이지 않는다.\n\n한지우가 두 부분을 번갈아 살핀다.\n\n"맞네요. 적어도 지금 확인한 밀봉 부분에는 어긋난 흔적이 없어요."`;
}

function safeObservationOnlyMessage() {
  return `확인한 자료와 현장 상태를 관찰한 범위에서만 적어 둔다.\n\n이 결과만으로 누군가나 어떤 가능성을 지울 수는 없다.\n\n한지우는 결론을 덧붙이지 않고, 확인된 부분만 수첩에 표시한다.`;
}

function safeCoatCustodyMessage() {
  return `김정환이 고개를 끄덕인다.\n\n"네. 서정규 씨 외투도 여기에서 보관했습니다. 제가 직접 받아 보관대에 걸어뒀어요."\n\n한지우는 보관대 쪽을 한 번 보고는, 더 묻지 않는다.`;
}

function safeOpeningWitnessMessage() {
  return `현장 입구에서 통제를 돕던 관계자가 급히 고개를 든다.\n\n"안쪽에서 사고가 났습니다. 지금은 사람들을 물리고 있고, 필요한 연락도 해 둔 상태예요. 제가 직접 본 건 발견 뒤 상황뿐입니다."\n\n한지우는 대답을 가로채지 않고, 현장 안쪽을 잠깐 바라본다.`;
}

function conversationTarget(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
) {
  const named = selectedCase.npcs.find((npc) => userText.includes(npc.name));
  if (named) return named;
  if (!state.current_interview) return null;
  return (
    selectedCase.npcs.find((npc) => npc.id === state.current_interview) || null
  );
}

function publicNpcRole(role: string) {
  const text = role.trim();
  if (!text) return '관계자';

  const [head] = text.split(/(?:이며|이고|로서|로\s|,|\.| 때문에| 관련)/);
  const trimmedHead = head.trim();

  if (
    (hasSpoilerSignal(text) || trimmedHead.length + 4 < text.length) &&
    trimmedHead
  ) {
    return trimmedHead;
  }

  return text;
}

function publicNpcList(selectedCase: CaseData) {
  return selectedCase.npcs.map((npc) => ({
    id: npc.id,
    name: npc.name,
    role: publicNpcRole(npc.role),
  }));
}

function cardSearchText(card: CaseCard) {
  return `${card.id} ${card.title} ${card.category} ${card.source} ${card.condition} ${card.summary}`;
}

function isStatementCard(card: CaseCard) {
  return (
    /^S-/i.test(card.id) ||
    /^S-/i.test(card.source) ||
    /진술|증언|말한다|대답/.test(cardSearchText(card))
  );
}

function inferAcquiredCards(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
  response: GmResponse,
) {
  if (investigationActionScope(userText) === 'move') return [];

  const combined = `${userText}\n${response.message}`;
  const target = conversationTarget(selectedCase, state, userText);
  const isInterviewAction =
    /묻|물어|인터뷰|면담|대화|신문|진술|말해|만나/.test(userText) ||
    (Boolean(target) && isConversationQuestion(userText));
  const wantsBottle = /생수병|생수통|물병|생수|밀봉|뚜껑|병\s*고리|물\b/.test(
    combined,
  );
  const wantsSpray = /스프레이|은색\s*물건|은색\s*휴대용|휴대용\s*물건/.test(
    combined,
  );
  const wantsCoatCustody =
    selectedCase.case_id === 'CASE007' &&
    target?.name === '김정환' &&
    /외투/.test(userText) &&
    /(?:보관|맡겼|받아|걸어)/.test(response.message);

  if (!wantsBottle && !wantsSpray && !wantsCoatCustody) return [];

  return selectedCase.cards
    .filter((card) => {
      if (state.acquired_information.includes(card.id)) return false;
      if (response.acquire.includes(card.id)) return false;
      if (!isInterviewAction && isStatementCard(card)) return false;

      const searchable = cardSearchText(card);
      const matchesBottle =
        wantsBottle &&
        /생수병|생수통|물병|생수|밀봉|뚜껑|병\s*고리|전달/.test(searchable);
      const matchesSpray =
        wantsSpray &&
        /스프레이|은색\s*물건|은색\s*휴대용|휴대용\s*물건|목\s*스프레이/.test(
          searchable,
        );
      const matchesCoatCustody =
        wantsCoatCustody && /외투|보관대|보관/.test(searchable);

      return matchesBottle || matchesSpray || matchesCoatCustody;
    })
    .map((card) => card.id);
}

type NpcDisclosureContract = {
  id: string;
  name: string;
  hiddenTerms: string[];
  initialStatement: string;
};

function npcDisclosureContracts(selectedCase: CaseData) {
  const rawMaster = getStringField(selectedCase.master, 'raw_text');
  if (!rawMaster) return [];

  return parseLabeledBlocks(rawMaster, 'CHARACTERS')
    .filter((block) => /^CH[0-9]+$/.test(block.header))
    .map((block): NpcDisclosureContract | null => {
      const data = parseKeyValues(block.body);
      const initialStatement = data.initial_interview_range?.trim();
      const hiddenTerms = (data.hides || '')
        .split(/[\s,./··와과및]/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
        .filter((term) => !/^(관계|이동|행동|사실|비밀)$/.test(term));

      if (!data.name || !initialStatement || !hiddenTerms.length) return null;
      return {
        id: block.header.replace(/^CH/, 'N'),
        name: data.name,
        hiddenTerms,
        initialStatement,
      };
    })
    .filter((contract): contract is NpcDisclosureContract => Boolean(contract));
}

function isEvidenceConfrontation(state: GameState, userText: string) {
  return (
    state.acquired_information.length > 0 &&
    /제시|보여\s*주|들이밀|증거|기록|메시지|로그|영상|대조|비교/.test(userText)
  );
}

function hasPrematureHiddenActionDisclosure(
  quote: string,
  contract: NpcDisclosureContract,
) {
  const confirmsPersonalAction =
    /(?:사실(?:이에요|입니다|이었어요|이었죠|이었고)|인정(?:해요|합니다)|맞아요|그랬어요|제가|나는|전)/.test(
      quote,
    );
  const actionVerb =
    /꺼내|감싸|감쌌|감추|숨기|옮기|넣었|넣어|빼냈|빼어|가져갔|가져왔|손댔|접근했|치웠|바꿨/;

  return (
    confirmsPersonalAction &&
    actionVerb.test(quote) &&
    contract.hiddenTerms.some((term) => quote.includes(term))
  );
}

function redactPrematureHiddenActionDisclosures(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
  message: string,
) {
  if (isEvidenceConfrontation(state, userText)) return message;

  return npcDisclosureContracts(selectedCase).reduce((next, contract) => {
    if (state.npc_statement_stage[contract.id] !== 'initial') return next;

    // A quoted first-person admission is never a harmless atmospheric detail.
    return next.replace(
      /[“"]([^”"]+)[”"]/g,
      (whole, quote: string, offset: number, fullMessage: string) => {
        const nearbySpeaker = fullMessage
          .slice(Math.max(0, offset - 100), offset)
          .includes(contract.name);
        if (
          !nearbySpeaker ||
          !hasPrematureHiddenActionDisclosure(quote, contract)
        ) {
          return whole;
        }
        return `“${contract.initialStatement}”`;
      },
    );
  }, message);
}

function sanitizeGmMessage(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
  message: string,
) {
  let next = naturalizeCaseNote(message)
    .replace(
      /무대 위 생수병을 살펴보니,\s*병 고리와 밀봉 띠가 온전하다\./g,
      '무대 위 생수병을 살펴보니, 뚜껑은 이미 열려 있고 밀봉 띠는 병목 아래 끊겨 남아 있다.',
    )
    .replace(
      /차윤서가 건넨 생수는 전달되는 순간까지 개봉되지 않았다는 사실이 확인된다\./g,
      '전달 전까지 밀봉된 병이었다는 진술은 남지만, 지금 상태만으로는 그 사이에 누가 만졌는지 단정할 수 없다.',
    )
    .replace(/게임 내 역할 설정이나 스토리 진행상 자연스러운 부분입니다\./g, '')
    .replace(/플레이어분께서/g, '지금은')
    .replace(
      /다양한 시도를 할 수 있습니다\./g,
      '그 방향으로 다시 눌러 보면 돼.',
    )
    .replace(/관련 인물 목록입니다\.\s*/g, '관련 인물.\n\n')
    .replace(/\s+(차윤서|백미라|윤태오|한도경|서은채|김정환),/g, '\n$1,')
    .replace(/\s*누구와 인터뷰하시겠습니까\??/g, '')
    .replace(/\s*누구부터 만나볼까요\??/g, '')
    .replace(/\s*어디부터 볼까요\??/g, '')
    .replace(/\s*무엇을 확인할까요\??/g, '');

  next = redactPrematureHiddenActionDisclosures(
    selectedCase,
    state,
    userText,
    next,
  );

  const mentionsSeveralNpcs =
    selectedCase.npcs.filter((npc) => next.includes(npc.name)).length >= 2;
  if (
    mentionsSeveralNpcs &&
    hasSpoilerSignal(next) &&
    !isExplicitGroupQuestion(userText)
  ) {
    const people = publicNpcList(selectedCase)
      .map((npc) => `${npc.name} - ${npc.role}`)
      .join('\n');
    next = `한지우가 행사 명단만 따로 추려 내려놓는다.\n\n${people}\n\n그녀는 명단을 더 설명하지 않고 당신 쪽으로 밀어 둔다.`;
  }

  const target = conversationTarget(selectedCase, state, userText);
  if (
    isOpeningWitnessReply(state) &&
    isSituationalQuestion(userText) &&
    /한지우/.test(next) &&
    hasOpeningPartnerBriefing(next)
  ) {
    next = safeOpeningWitnessMessage();
  }
  // The general "no dialogue / leaked a decisive fact" case is now caught
  // earlier as a MISSING_NPC_DIALOGUE retry violation (gm/response-signals.ts),
  // which sends the model back to write its own in-character line instead
  // of the server fabricating one attributed to `target.name` — that name
  // comes straight from selectedCase.npcs, so if a generated case's public
  // NPC list ever drifts from its master text, a hardcoded line here would
  // speak as a phantom character. Only the CASE007-specific seal-denial
  // override remains, since that's about tone for a known built-in case,
  // not a spoiler/format catch-all.
  if (
    selectedCase.case_id === 'CASE007' &&
    target?.name === '차윤서' &&
    /생수|밀봉|병/.test(userText) &&
    isConversationQuestion(userText) &&
    (hasDecisiveSignal(next) || !/[“"]/.test(next))
  ) {
    next = `차윤서가 무전기를 쥔 손에 힘을 준다.\n\n"제가 건넬 때는 밀봉된 병이었어요."\n\n"하지만 그 말만으로 전부 증명되진 않겠죠. 제가 말할 수 있는 건 거기까지예요."\n\n한지우는 끼어들지 않고 문장 끝에 짧게 밑줄을 긋는다.`;
  }

  if (selectedCase.case_id === 'CASE007') {
    next = next.replace(
      /한지우가 명단을 접어 쥔다\. 차윤서, 진행자\. 백미라, 재단 사업이사\. 윤태오, 후원사 대표\. 한도경, 수석 감정사\. 서은채, 피해자의 딸\. 김정환, 출입보관소 책임자\. 누구부터 만나볼까요\?/g,
      '한지우가 행사 명단을 반으로 접어 손가락으로 짚는다.\n\n차윤서. 진행자.\n백미라. 재단 사업이사.\n윤태오. 후원사 대표.\n한도경. 수석 감정사.\n서은채. 피해자의 딸.\n김정환. 출입보관소 책임자.\n\n"이름은 여기까지예요. 어디를 찌를지는 당신이 정하세요."',
    );
  }

  if (
    selectedCase.case_id === 'CASE007' &&
    target?.name === '김정환' &&
    isNarrowCoatCustodyQuestion(userText) &&
    hasChainedCustodyDisclosure(next)
  ) {
    next = safeCoatCustodyMessage();
  }

  if (hasUnsupportedExclusion(next)) {
    next = isSealComparisonAction(userText)
      ? safeSealComparisonMessage()
      : safeObservationOnlyMessage();
  }

  // A log can prove only what it records. Do not let it become a shortcut to an unseen method.
  if (isRecordReviewAction(userText) && hasUnprovedRecordInference(next)) {
    next = safeRecordReviewMessage(selectedCase, state, userText);
  }

  return next.trim();
}

function caseSortValue(caseId: string) {
  const match = caseId.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function sortCaseSummaries(items: CaseSummary[]) {
  return [...items].sort((a, b) => {
    const byNumber = caseSortValue(b.id) - caseSortValue(a.id);
    return byNumber || b.id.localeCompare(a.id);
  });
}

function nonSpoilerTags(values: Array<string | undefined>) {
  const forbidden =
    /범인|실행자|동기|목적|진범|은닉|위조|조작자|정답|수법|WHO|WHY|HOW|WHEN/i;

  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string =>
          Boolean(value && !forbidden.test(value)),
        )
        .map((value) => `#${value.replace(/\s+/g, '_')}`),
    ),
  ).slice(0, 4);
}

const MODEL = env.OPENAI_MODEL || 'gpt-4.1-mini';

const gmSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'message',
    'detective_line',
    'detective_line_position',
    'jiwoo_line',
    'jiwoo_line_position',
    'scene',
    'acquire',
    'presented_evidence',
    'npc_updates',
    'timeline_notes',
    'player_established',
    'scene_facts',
    'memory_updates',
    'case_complete_candidate',
    'final_judgement',
  ],
  properties: {
    message: { type: 'string' },
    detective_line: { type: ['string', 'null'] },
    detective_line_position: { type: 'string', enum: ['before', 'after'] },
    jiwoo_line: { type: ['string', 'null'] },
    jiwoo_line_position: { type: 'string', enum: ['before', 'after'] },
    scene: {
      type: 'object',
      additionalProperties: false,
      required: ['location_id', 'interview_character_id'],
      properties: {
        location_id: { type: 'string' },
        interview_character_id: { type: ['string', 'null'] },
      },
    },
    acquire: { type: 'array', items: { type: 'string' } },
    presented_evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['evidence_id', 'target_id'],
        properties: {
          evidence_id: { type: 'string' },
          target_id: { type: ['string', 'null'] },
        },
      },
    },
    npc_updates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['npc', 'status', 'statement_stage'],
        properties: {
          npc: { type: 'string' },
          status: { type: 'string' },
          statement_stage: { type: ['string', 'null'] },
        },
      },
    },
    timeline_notes: { type: 'array', items: { type: 'string' } },
    player_established: { type: 'array', items: { type: 'string' } },
    scene_facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'fact',
          'impact',
          'subject_id',
          'location_id',
          'source',
          'certainty',
        ],
        properties: {
          fact: { type: 'string' },
          impact: {
            type: 'string',
            enum: [
              'harmless_scene_detail',
              'continuity_relevant_detail',
              'case_decisive_detail',
            ],
          },
          subject_id: { type: ['string', 'null'] },
          location_id: { type: ['string', 'null'] },
          source: {
            type: 'string',
            enum: ['safe_improvisation', 'direct_observation', 'npc_statement'],
          },
          certainty: {
            type: 'string',
            enum: ['established', 'claimed', 'approximate'],
          },
        },
      },
    },
    memory_updates: { type: 'array', items: { type: 'string' } },
    case_complete_candidate: { type: 'boolean' },
    final_judgement: { type: ['string', 'null'] },
  },
};

const metaSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: {
    message: { type: 'string' },
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getStringField(
  data: Record<string, unknown>,
  key: string,
  fallback = '',
) {
  const value = data[key];
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeCaseId(value: string) {
  const compact = value.trim().replace(/[^0-9A-Za-z_-]/g, '');
  if (/^CASE/i.test(compact)) return compact.toUpperCase();
  return `CASE${compact.toUpperCase()}`;
}

function parseKeyValues(text: string) {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const equalsIndex = line.indexOf('=');
    const colonIndex = line.indexOf(':');
    const indexes = [equalsIndex, colonIndex].filter((index) => index >= 0);
    const index = indexes.length ? Math.min(...indexes) : -1;
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function parseListField(text: string, key: string) {
  const lines = text.split(/\r?\n/);
  const values: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (new RegExp(`^${key}\\s*[:=]\\s*(.*)$`).test(trimmed)) {
      const inlineValue =
        trimmed.match(new RegExp(`^${key}\\s*[:=]\\s*(.*)$`))?.[1]?.trim() ||
        '';
      if (inlineValue) values.push(inlineValue);
      collecting = true;
      continue;
    }
    if (collecting && /^[A-Za-z_가-힣][^:=]{0,48}\s*[:=]/.test(trimmed)) {
      break;
    }
    if (collecting) {
      const item = trimmed.replace(/^-\s*/, '').trim();
      if (item) values.push(item);
    }
  }

  return values.filter((value, index, all) => all.indexOf(value) === index);
}

function parseTags(value: string) {
  return value
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => !hasSpoilerSignal(tag));
}

function parseSectionBlocks(text: string, section: string): TxtBlock[] {
  const pattern = new RegExp(
    String.raw`\[${section}\]([\s\S]*?)\[\/${section}\]`,
    'g',
  );
  return Array.from(text.matchAll(pattern), (match) => ({
    header: section,
    body: match[1].trim(),
  }));
}

function parseLabeledBlocks(text: string, section: string): TxtBlock[] {
  return parseSectionBlocks(text, section).flatMap((block) => {
    const lines = block.body.split(/\r?\n/);
    const blocks: TxtBlock[] = [];
    let currentHeader = '';
    let currentLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const label = trimmed.match(/^\[?([A-Z]+[0-9]+|CARD\s+C[0-9]+)\]?$/i);
      if (label) {
        if (currentHeader) {
          blocks.push({
            header: currentHeader,
            body: currentLines.join('\n').trim(),
          });
        }
        currentHeader = label[1].toUpperCase();
        currentLines = [];
      } else if (currentHeader) {
        currentLines.push(line);
      }
    }

    if (currentHeader) {
      blocks.push({
        header: currentHeader,
        body: currentLines.join('\n').trim(),
      });
    }

    return blocks;
  });
}

function parseTxtMaster(text: string): {
  caseData?: CaseData;
  summary?: string;
  errors: string[];
} {
  if (!/\[CASE_IDENTITY\]/.test(text)) {
    return { errors: ['지원하는 TXT 마스터 형식이 아닙니다.'] };
  }

  const identity = parseKeyValues(
    parseSectionBlocks(text, 'CASE_IDENTITY')[0]?.body || '',
  );
  const incident = parseKeyValues(
    parseSectionBlocks(text, 'SURFACE_INCIDENT')[0]?.body || '',
  );
  const truth = parseKeyValues(
    parseSectionBlocks(text, 'FULL_TRUTH')[0]?.body || '',
  );
  const finalDeduction = parseKeyValues(
    parseSectionBlocks(text, 'FINAL_DEDUCTION')[0]?.body || '',
  );
  const caseComplete = parseKeyValues(
    parseSectionBlocks(text, 'CASE_COMPLETE')[0]?.body || '',
  );
  const entry = firstNonEmpty([
    parseSectionBlocks(text, 'OPENING_SCENE')[0]?.body,
    parseSectionBlocks(text, 'CASE_OPENING')[0]?.body,
    parseSectionBlocks(text, 'DRAMATIC_INTRO')[0]?.body,
    parseSectionBlocks(text, 'DETECTIVE_ENTRY')[0]?.body,
  ]);
  const ending = parseSectionBlocks(text, 'ENDING_EXPLANATION')[0]?.body || '';
  const caseId = normalizeCaseId(identity.case_id || identity.case_no || '');
  const title = identity.title_ko || identity.title_en || caseId;
  const publicIntro =
    entry ||
    `${incident.대상 || '사건 대상'}에 문제가 발생했다. ${incident.표면질문 || ''}`.trim();
  const summary =
    identity.summary ||
    incident.표면질문 ||
    incident.상태 ||
    `${identity.genre || identity.case_type || '업로드된 사건'} 사건`;
  const tags = identity.tags?.trim()
    ? parseTags(identity.tags)
    : nonSpoilerTags([
        identity.difficulty,
        identity.setting || identity.primary_setting,
        identity.genre,
        identity.case_type,
        identity.estimated_play_time,
      ]);

  const locations = parseLabeledBlocks(text, 'LOCATIONS').map((block) => {
    const data = parseKeyValues(block.body);
    return {
      id: block.header,
      name: data.name || block.header,
      description:
        data.base_description ||
        data.public_use ||
        data.event_state ||
        data.ordinary_observation ||
        data.targeted_investigation ||
        '',
    };
  });

  const npcs = parseLabeledBlocks(text, 'CHARACTERS')
    .filter((block) => /^CH[0-9]+$/.test(block.header))
    .map((block) => {
      const data = parseKeyValues(block.body);
      return {
        id: block.header.replace(/^CH/, 'N'),
        name: data.name || block.header,
        role: data.role || data.public_relation || '관계자',
        initial_status: 'not_interviewed',
      };
    });

  const evidenceCards: CaseCard[] = parseLabeledBlocks(text, 'SEALED_CODES')
    .filter((block) => /^CARD\s+C[0-9]+$/i.test(block.header))
    .map((block) => {
      const data = parseKeyValues(block.body);
      const id = block.header.replace(/^CARD\s+/i, '').toUpperCase();
      return {
        id,
        title: data.public ? `${id}_${data.source || '단서'}` : id,
        category: data.source?.startsWith('S-') ? 'person' : 'evidence',
        source: data.source || id,
        condition: data.condition || `${id} 획득 조건`,
        summary: data.public || '',
      };
    });

  const cards: CaseCard[] = evidenceCards.length
    ? evidenceCards
    : parseLabeledBlocks(text, 'EVIDENCE').map((block) => {
        const data = parseKeyValues(block.body);
        const proves = parseListField(block.body, 'proves');
        const doesNotProve = parseListField(block.body, 'does_not_prove');
        return {
          id: block.header,
          title: data.name || block.header,
          category: data.type || 'evidence',
          source: data.found_at || data.source || block.header,
          condition:
            data.discovery_condition ||
            data.acquire_condition ||
            `${data.name || block.header} 조사`,
          summary: data.content || data.finding || proves.join(' / ') || '',
          content: data.content || data.finding || '',
          proves_fact_ids: proves,
          does_not_prove_fact_ids: doesNotProve,
        };
      });

  const errors: string[] = [];
  if (!caseId || caseId === 'CASE')
    errors.push('CASE_IDENTITY.case_no가 필요합니다.');
  if (!locations.length) errors.push('LOCATIONS 섹션이 필요합니다.');
  if (!npcs.length) errors.push('CHARACTERS 섹션이 필요합니다.');
  if (!cards.length)
    errors.push('EVIDENCE 또는 SEALED_CODES 섹션이 필요합니다.');
  if (cards.some((card) => !card.condition)) {
    errors.push('모든 증거에는 discovery_condition이 필요합니다.');
  }
  if (!evidenceCards.length) {
    if (cards.some((card) => !card.proves_fact_ids?.length)) {
      errors.push('모든 EVIDENCE에는 proves 항목이 필요합니다.');
    }
    if (cards.some((card) => !card.does_not_prove_fact_ids?.length)) {
      errors.push('모든 EVIDENCE에는 does_not_prove 항목이 필요합니다.');
    }
  }

  if (errors.length) return { errors };

  return {
    caseData: {
      case_id: caseId,
      master_version: identity.master_version || 'TXT-1.0',
      title,
      status_label: '수사 중',
      opening_scene: locations[0].id,
      public_intro: publicIntro,
      master: {
        identity,
        incident,
        truth,
        actual_timeline:
          parseSectionBlocks(text, 'ACTUAL_TIMELINE')[0]?.body || '',
        relationships_and_secrets:
          parseSectionBlocks(text, 'RELATIONSHIPS_AND_SECRETS')[0]?.body || '',
        red_herrings: parseSectionBlocks(text, 'RED_HERRINGS')[0]?.body || '',
        case_complete: caseComplete,
        final_deduction: finalDeduction,
        ending_explanation: ending,
        raw_text: text,
      },
      locations,
      npcs,
      cards,
      information_catalog: cards.map((card) => ({
        id: card.id,
        type: card.category,
        source: card.source,
        condition: card.condition,
        proof_scope: card.proves_fact_ids?.join(' / ') || card.summary,
        non_proof_scope:
          card.does_not_prove_fact_ids?.join(' / ') ||
          '이 정보만으로 실행자, 동기, 전체 수법을 확정하지 않는다.',
      })),
      final_deduction: {
        status: 'structure_ready',
        required_axes: (caseComplete.필수질문 || 'WHO/HOW/WHERE/WHY')
          .split('/')
          .map((item) => item.trim())
          .filter(Boolean),
        answer_scope: caseComplete.정답범위 || '',
        sealed_until_supported: ['실행자', '목적', '수법'],
      },
      master_tags: tags,
    },
    summary,
    errors: [],
  };
}

function caseTagsFromData(caseData: CaseData) {
  const directTags = (caseData as CaseData & { master_tags?: unknown })
    .master_tags;
  if (Array.isArray(directTags)) {
    return directTags.filter(
      (item): item is string => typeof item === 'string',
    );
  }

  const identity = isObject(caseData.master.identity)
    ? (caseData.master.identity as Record<string, string>)
    : {};

  return nonSpoilerTags([
    identity.difficulty,
    identity.primary_setting,
    identity.case_type,
    identity.estimated_play_time,
    caseData.master_version,
  ]);
}

function validateUploadedCase(raw: unknown): {
  caseData?: CaseData;
  summary?: string;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { errors: ['JSON 최상위 값은 객체여야 합니다.'] };
  }

  const caseId = getStringField(raw, 'case_id').toUpperCase();
  const title = getStringField(raw, 'title');
  const statusLabel = getStringField(raw, 'status_label', '수사 중');
  const openingScene = getStringField(raw, 'opening_scene');
  const publicIntro = firstNonEmpty([
    getStringField(raw, 'opening_drama'),
    getStringField(raw, 'dramatic_intro'),
    getStringField(raw, 'case_opening'),
    getStringField(raw, 'public_intro'),
  ]);
  const summary =
    getStringField(raw, 'summary') ||
    publicIntro.slice(0, 90) ||
    '업로드된 사건';

  if (!/^CASE[0-9A-Z_-]{1,24}$/.test(caseId)) {
    errors.push('case_id는 CASE로 시작하는 영문/숫자 코드여야 합니다.');
  }
  if (!title) errors.push('title이 필요합니다.');
  if (!openingScene) errors.push('opening_scene이 필요합니다.');
  if (!publicIntro) errors.push('public_intro가 필요합니다.');
  if (!isObject(raw.master)) errors.push('master 객체가 필요합니다.');
  if (!Array.isArray(raw.locations) || !raw.locations.length) {
    errors.push('locations 배열이 필요합니다.');
  }
  if (!Array.isArray(raw.npcs) || !raw.npcs.length) {
    errors.push('npcs 배열이 필요합니다.');
  }
  if (!Array.isArray(raw.cards)) {
    errors.push('cards 배열이 필요합니다.');
  }

  const locations = Array.isArray(raw.locations)
    ? raw.locations.filter(isObject).map((item) => ({
        id: getStringField(item, 'id'),
        name: getStringField(item, 'name'),
        description: getStringField(item, 'description'),
      }))
    : [];
  const npcs = Array.isArray(raw.npcs)
    ? raw.npcs.filter(isObject).map((item) => ({
        id: getStringField(item, 'id'),
        name: getStringField(item, 'name'),
        role: getStringField(item, 'role'),
        initial_status: getStringField(
          item,
          'initial_status',
          'not_interviewed',
        ),
      }))
    : [];
  const cards = Array.isArray(raw.cards)
    ? raw.cards.filter(isObject).map((item) => ({
        id: getStringField(item, 'id'),
        title: getStringField(item, 'title'),
        category: getStringField(item, 'category', 'evidence'),
        source: getStringField(item, 'source'),
        condition: getStringField(item, 'condition'),
        summary: getStringField(item, 'summary'),
      }))
    : [];

  if (locations.some((item) => !item.id || !item.name)) {
    errors.push('모든 location에는 id와 name이 필요합니다.');
  }
  if (!locations.some((item) => item.id === openingScene)) {
    errors.push('opening_scene은 locations 안에 존재하는 id여야 합니다.');
  }
  if (npcs.some((item) => !item.id || !item.name || !item.role)) {
    errors.push('모든 npc에는 id, name, role이 필요합니다.');
  }
  if (cards.some((item) => !item.id || !item.title || !item.condition)) {
    errors.push('모든 card에는 id, title, condition이 필요합니다.');
  }

  if (errors.length) {
    return { errors };
  }

  return {
    caseData: {
      ...(raw as CaseData),
      case_id: caseId,
      title,
      status_label: statusLabel,
      opening_scene: openingScene,
      public_intro: publicIntro,
      master: raw.master as Record<string, unknown>,
      locations,
      npcs,
      cards,
    },
    summary,
    errors: [],
  };
}

async function getCase(caseId: string): Promise<CaseData> {
  const normalizedCaseId = caseId.toUpperCase();
  const selected = builtInCases[normalizedCaseId];
  if (!selected) {
    await ensureSchema();
    const row = await env.DB.prepare('SELECT data FROM cases WHERE id = ?')
      .bind(normalizedCaseId)
      .first<{ data: string }>();

    if (row) {
      return withCaseOverrides(JSON.parse(row.data) as CaseData);
    }

    throw new Error(`Unknown case: ${caseId}`);
  }
  return withCaseOverrides(selected);
}

function getMasterVersion(selectedCase: CaseData) {
  return selectedCase.master_version || '1.0.0';
}

export async function listCases(): Promise<CaseSummary[]> {
  await ensureSchema();
  const rows = await env.DB.prepare(
    `SELECT id, title, status_label, summary, data
     FROM cases
     ORDER BY updated_at DESC`,
  ).all<{
    id: string;
    title: string;
    status_label: string;
    summary: string;
    data: string;
  }>();

  const uploaded = (rows.results || []).map((item) => {
    let tags: string[] = [];
    try {
      tags = caseTagsFromData(JSON.parse(item.data) as CaseData);
    } catch {
      tags = [];
    }

    return {
      id: item.id,
      title: item.title,
      status_label: item.status_label,
      summary: item.summary,
      path: `/case/${item.id}`,
      source: 'uploaded' as const,
      tags,
    };
  });

  return sortCaseSummaries([...uploaded, ...builtInCaseSummaries]);
}

function initialState(selectedCase: CaseData): GameState {
  const caseId = selectedCase.case_id;
  return {
    schema_version: 2,
    case_id: caseId,
    session_id: crypto.randomUUID(),
    master_version: getMasterVersion(selectedCase),
    case_status: 'in_progress',
    current_scene: selectedCase.opening_scene,
    current_location: selectedCase.opening_scene,
    visited_locations: [selectedCase.opening_scene],
    current_interview: null,
    interviewed_characters: [],
    npc_statement_stage: Object.fromEntries(
      selectedCase.npcs.map((npc) => [npc.id, 'initial']),
    ),
    npc_status: Object.fromEntries(
      selectedCase.npcs.map((npc) => [npc.id, npc.initial_status]),
    ),
    acquired_information: [],
    presented_evidence: [],
    known_public_timeline: [],
    player_notes: [],
    player_established: [],
    player_not_established: [],
    scene_established_facts: [],
    case_memory: [],
    recent_conversation: [
      { role: 'assistant', content: selectedCase.public_intro },
    ],
    full_dialogue_log: [
      { role: 'assistant', content: selectedCase.public_intro },
    ],
    jiwoo_trigger_log: [],
    final_deduction_state: {
      submitted: false,
      judgement: null,
    },
    api_usage: {
      input_tokens: 0,
      output_tokens: 0,
      regeneration_count: 0,
    },
    gm_validation_log: [],
    last_action_contract: null,
    last_requested_answer_fields: [],
  };
}

function normalizeState(selectedCase: CaseData, raw: unknown): GameState {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<
    GameState & {
      scene: string;
      acquired_cards: string[];
      timeline_notes: string[];
      recent_dialogue: Dialogue[];
      case_complete: boolean;
    }
  >;
  const base = initialState(selectedCase);
  const currentLocation =
    data.current_location ||
    data.current_scene ||
    data.scene ||
    base.current_location;
  const acquiredInformation =
    data.acquired_information ||
    data.acquired_cards ||
    base.acquired_information;
  const legacyIntros = legacyIntroByCase[selectedCase.case_id] || [];
  const recentConversation =
    data.recent_conversation ||
    data.recent_dialogue ||
    base.recent_conversation;
  const normalizedConversation =
    recentConversation[0]?.role === 'assistant' &&
    legacyIntros.includes(recentConversation[0].content)
      ? recentConversation.slice(1)
      : recentConversation;

  return {
    ...base,
    ...data,
    schema_version: 2,
    case_id: selectedCase.case_id,
    master_version: getMasterVersion(selectedCase),
    case_status:
      data.case_status || (data.case_complete ? 'complete' : 'in_progress'),
    current_scene: data.current_scene || data.scene || base.current_scene,
    current_location: currentLocation,
    visited_locations: Array.from(
      new Set([...(data.visited_locations || []), currentLocation]),
    ),
    current_interview: data.current_interview || null,
    interviewed_characters: data.interviewed_characters || [],
    npc_statement_stage: {
      ...base.npc_statement_stage,
      ...data.npc_statement_stage,
    },
    npc_status: {
      ...base.npc_status,
      ...data.npc_status,
    },
    acquired_information: acquiredInformation,
    presented_evidence: data.presented_evidence || [],
    known_public_timeline: (
      data.known_public_timeline ||
      data.timeline_notes ||
      []
    ).map(naturalizeCaseNote),
    player_notes: data.player_notes || [],
    player_established: data.player_established || [],
    player_not_established: data.player_not_established || [],
    scene_established_facts: Array.isArray(data.scene_established_facts)
      ? data.scene_established_facts.slice(-100)
      : [],
    case_memory: Array.isArray(data.case_memory)
      ? data.case_memory.slice(-80)
      : [],
    recent_conversation: normalizedConversation,
    full_dialogue_log: Array.isArray(data.full_dialogue_log)
      ? data.full_dialogue_log
      : normalizedConversation,
    jiwoo_trigger_log: Array.isArray(data.jiwoo_trigger_log)
      ? data.jiwoo_trigger_log
      : [],
    final_deduction_state: {
      ...base.final_deduction_state,
      ...data.final_deduction_state,
      submitted:
        data.final_deduction_state?.submitted ||
        data.case_complete ||
        base.final_deduction_state.submitted,
    },
    api_usage: {
      ...base.api_usage,
      ...data.api_usage,
    },
    gm_validation_log: Array.isArray(data.gm_validation_log)
      ? data.gm_validation_log.slice(-20)
      : [],
    last_action_contract: data.last_action_contract || null,
    last_requested_answer_fields: Array.isArray(
      data.last_requested_answer_fields,
    )
      ? data.last_requested_answer_fields
      : [],
  };
}

type ResponseApiContent = {
  type?: string;
  text?: string;
};

type ResponseApiOutput = {
  content?: ResponseApiContent[];
};

type ResponseApiResult = {
  output_text?: string;
  output?: ResponseApiOutput[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

function outputTextFromResponse(raw: ResponseApiResult) {
  return (
    raw.output_text ||
    raw.output
      ?.flatMap((item) => item.content || [])
      .find((content) => content.type === 'output_text')?.text
  );
}

async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS saves (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status_label TEXT NOT NULL,
        summary TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS generation_jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        stage TEXT NOT NULL,
        attempt INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        message TEXT,
        issues TEXT,
        case_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ),
  ]);
}

export async function exportPlayLog(caseId: string) {
  const selectedCase = await getCase(caseId);
  const state = await loadState(selectedCase);

  const roleLabel: Record<string, string> = {
    user: '탐정(입력)',
    assistant: 'GM',
    detective: '탐정(연출)',
    jiwoo: '한지우',
  };

  const lines = [
    `${selectedCase.title} (${selectedCase.case_id}) 플레이로그`,
    `세션: ${state.session_id}`,
    `내보낸 시각: ${new Date().toISOString()}`,
    '',
    ...state.full_dialogue_log.map((entry, index) => {
      const label = roleLabel[entry.role] || entry.role;
      const modeTag = entry.mode ? ` [${entry.mode}]` : '';
      return `${index + 1}. ${label}${modeTag}\n${entry.content}\n`;
    }),
  ];

  return {
    filename: `${selectedCase.case_id}-playlog-${state.session_id.slice(0, 8)}.txt`,
    content: lines.join('\n'),
    turnCount: state.full_dialogue_log.length,
  };
}

async function saveState(state: GameState) {
  await ensureSchema();
  await env.DB.prepare(
    `INSERT INTO saves (id, state, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       state = excluded.state,
       updated_at = excluded.updated_at`,
  )
    .bind(state.case_id, JSON.stringify(state), new Date().toISOString())
    .run();
}

async function loadState(selectedCase: CaseData): Promise<GameState> {
  await ensureSchema();
  const row = await env.DB.prepare('SELECT state FROM saves WHERE id = ?')
    .bind(selectedCase.case_id)
    .first<{ state: string }>();

  if (!row) {
    const state = initialState(selectedCase);
    await saveState(state);
    return state;
  }

  return normalizeState(selectedCase, JSON.parse(row.state));
}

function publicCase(selectedCase: CaseData) {
  return {
    case_id: selectedCase.case_id,
    master_version: getMasterVersion(selectedCase),
    title: selectedCase.title,
    status_label: selectedCase.status_label,
    opening_scene: selectedCase.opening_scene,
    public_intro: selectedCase.public_intro,
    locations: selectedCase.locations.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
    npcs: publicNpcList(selectedCase),
    cards: selectedCase.cards.map(
      ({ id, title, category, source, summary }) => ({
        id,
        title,
        category,
        source,
        summary,
      }),
    ),
  };
}

function cardPublicLabel(card: CaseCard) {
  return {
    id: card.id,
    title: card.title,
    source: card.source,
    category: card.category,
    condition: card.condition,
  };
}

function resolveRequestedRecord(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
  action: ParsedInvestigationAction,
) {
  if (
    !action.actions.some((item) =>
      ['record_review', 'video_review'].includes(item),
    ) ||
    action.recordIntent === 'none'
  ) {
    return [];
  }

  const normalized = normalizePlayerInput(userText);
  const wantsVideo = action.actions.includes('video_review');
  const terms = normalized
    .split(/[\s·,._~()\-→]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .filter(
      (item) =>
        !/^(확인|열람|조회|보여|기록|로그|목록|대장|장부|내역|원본|CCTV|영상)$/.test(
          item,
        ),
    );

  return selectedCase.cards
    .filter((card) => {
      const searchable = cardSearchText(card);
      const isRecord = wantsVideo
        ? /CCTV|영상|카메라|녹화/.test(searchable)
        : /기록|로그|목록|대장|장부|내역|메시지|이메일|출입|프린터|출력/.test(
            searchable,
          );
      if (!isRecord) return false;

      const atCurrentLocation =
        card.source === state.current_location ||
        searchable.includes(state.current_location);
      const matchesTarget =
        !terms.length || terms.some((term) => searchable.includes(term));

      return atCurrentLocation || matchesTarget;
    })
    .slice(0, 4)
    .map((card) => ({
      id: card.id,
      title: card.title,
      content: card.content || card.summary,
    }));
}

function buildActionScopedMaster(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
  action: ParsedInvestigationAction,
) {
  const currentLocation = selectedCase.locations.find(
    (location) => location.id === state.current_location,
  );
  const currentNpc = state.current_interview
    ? selectedCase.npcs.find((npc) => npc.id === state.current_interview)
    : null;
  const acquiredCards = selectedCase.cards
    .filter((card) => state.acquired_information.includes(card.id))
    .map((card) => ({
      ...cardPublicLabel(card),
      content: card.content || card.summary,
      proves_fact_ids: card.proves_fact_ids || [],
      does_not_prove_fact_ids: card.does_not_prove_fact_ids || [],
    }));

  return {
    identity: selectedCase.master.identity || {},
    incident: selectedCase.master.incident || {},
    current_location: currentLocation
      ? {
          id: currentLocation.id,
          name: currentLocation.name,
          description: currentLocation.description,
        }
      : null,
    current_interview_npc: currentNpc
      ? {
          id: currentNpc.id,
          name: currentNpc.name,
          role: publicNpcRole(currentNpc.role),
          statement_stage: state.npc_statement_stage[currentNpc.id],
        }
      : null,
    acquired_cards: acquiredCards,
    record_contents: resolveRequestedRecord(
      selectedCase,
      state,
      userText,
      action,
    ),
    proof_scope_rule:
      'Use only acquired card content and its proves/does_not_prove scope. Do not expose FULL_TRUTH, ACTUAL_TIMELINE, hidden motives, hidden methods, or unreleased records.',
  };
}

function emptyNarrativeFor(state: GameState): GmResponse {
  return {
    message:
      '방금 확인한 내용은 수사 기록에 확정해 넣지 않는다. 지금 장면과 이미 확인된 사실만 유지한다.',
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
  };
}

function validateFinalDeduction(selectedCase: CaseData, userText: string) {
  const normalized = normalizePlayerInput(userText);
  const mentionsCulprit = selectedCase.npcs.some((npc) =>
    normalized.includes(npc.name),
  );
  const mentionsMethod =
    /수법|방법|어떻게|옮겼|넣었|바꿨|조작|사용|실행|행동/.test(normalized);
  const mentionsMotive = /동기|목적|이유|왜|때문/.test(normalized);

  const missing = [
    mentionsCulprit ? '' : '책임자',
    mentionsMethod ? '' : '수법 또는 핵심 행동',
    mentionsMotive ? '' : '동기',
  ].filter(Boolean);

  return {
    isComplete: missing.length === 0,
    missing,
  };
}

export async function stateView(caseId: string, state?: GameState) {
  const selectedCase = await getCase(caseId);
  const currentState = state || (await loadState(selectedCase));
  const cardById = new Map(selectedCase.cards.map((card) => [card.id, card]));
  const locationById = new Map(
    selectedCase.locations.map((loc) => [loc.id, loc]),
  );

  return {
    case: publicCase(selectedCase),
    state: currentState,
    current_location:
      locationById.get(currentState.current_location) ||
      selectedCase.locations[0],
    acquired_cards: currentState.acquired_information
      .map((cardId) => cardById.get(cardId))
      .filter(Boolean),
  };
}

function buildContext(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
  action?: ParsedInvestigationAction,
  responseContract?: ResponseScopeContract,
  includeSealedMaster = false,
) {
  return {
    case_public: {
      case_id: selectedCase.case_id,
      title: selectedCase.title,
      opening_scene: selectedCase.opening_scene,
      master_version: getMasterVersion(selectedCase),
      public_intro: selectedCase.public_intro,
    },
    master:
      includeSealedMaster || !action
        ? selectedCase.master
        : buildActionScopedMaster(selectedCase, state, userText, action),
    state,
    user_input: userText,
    action_contract:
      action && responseContract
        ? { action, response_scope: responseContract }
        : undefined,
    available_codes: {
      locations: selectedCase.locations.map((item) => ({
        id: item.id,
        name: item.name,
      })),
      npcs: publicNpcList(selectedCase),
      cards: selectedCase.cards.map((item) => ({
        ...cardPublicLabel(item),
      })),
    },
  };
}

function systemPrompt() {
  return [
    'You are the GM for a Korean free-investigation mystery game. The player is a private detective. You control the world, NPCs, and investigation results. The player controls every meaningful detective action, investigative direction, accusation, conclusion, deduction, commitment, and case-closing decision.',
    'You may write one very short non-decisive detective line only when it completes natural banter with Han Jiwoo. It may react to her wording, continue a harmless joke, confirm the player already chosen action, or make a low-stakes situational remark. It must not change, expand, reinterpret, or contradict the player stated action or intent.',
    'An improvised detective line must never select a person, place, object, record, search target, comparison, route, theory, accusation, or next action. It must not present evidence, establish a fact, or introduce a new observation such as an object being visible, absent, moved, damaged, or missing. Put all scene observations in message narration instead. It must not close a possibility, assign an unexpressed belief or emotion, promise, grant permission, threaten, forgive, accept responsibility, or submit a deduction. Keep it reversible and normally one sentence; if no harmless reply fits, do not write one.',
    'Put any GM-written detective banter in detective_line, never inside message, and choose detective_line_position before or after the surrounding scene. Use null when the player already supplied the needed dialogue or when no brief harmless reply improves the rhythm.',
    'Keep message for narration, NPC dialogue, and investigation results. Put a direct Han Jiwoo spoken line in jiwoo_line, never inside message, and choose jiwoo_line_position before or after the surrounding scene. Narration that merely mentions Jiwoo is still message, not jiwoo_line.',
    'RULE PRIORITY: Master hard facts > NPC knowledge and statement boundaries > evidence proof scope > current GameState > scene presentation and style.',
    'The action_contract in context is binding for this turn. Execute only action_contract.action.actions and obey every response_scope flag. Do not use later likely actions to make the scene more complete.',
    'The player may use incomplete target-only input, such as a person name, location name, object name, record name, or short noun phrase. The action_contract.elliptical field resolves this through the current scene and conversation. Treat it as the smallest natural action only, not as a request to complete later investigative steps.',
    'When action_contract.action.socialIntent is not none, the player is replying socially to Jiwoo, correcting a harmless shared habit, or making a playful objection. Continue that banter for one short beat. Do not interpret it as a factual query, return to the previous clue, introduce a case fact, or advance investigation state. Leave the conversational space open afterward.',
    'Accept a harmless detective-and-Jiwoo relationship detail supplied by the player unless it conflicts with an important established fact. It may describe office habits, chores, recurring inconveniences, familiar phrases, or shared routines. Preserve it through memory_updates for occasional future callbacks, but never turn it into case evidence, access authority, alibi, or investigative knowledge.',
    'For target-only input: a person means addressing or approaching that person; a location means moving there; a visible object means surface-level attention only; a record means access to or review of that record. During an individual interview, an object or event means one neutral question to the current NPC about that subject. Do not invent the question central to the case, a detailed interrogation, a search chain, comparison, accusation, or deduction.',
    'When two equally plausible readings would produce materially different actions, ask one short in-world clarification through narration, the current NPC, or Han Jiwoo. Never show a numbered menu. Any inferred detective line must be short, reversible, and limited to expressing the minimal resolved action.',
    'Questions such as “how do you know that?”, “where was that confirmed?”, “who said that?”, or “is that established?” are source_challenge actions, not investigation actions. Identify only the already established source of the challenged fact. Never inspect a device, open a record, summon a witness, or create evidence merely to justify an earlier response.',
    'If the challenged fact has no legitimate source in GameState, recent_conversation, or a current direct observation, acknowledge that it is not confirmed and retract or narrow it. Preserve that correction and do not continue treating the retracted fact as established.',
    'The Master is the single source of truth for case-deciding facts. Never change, invent, or alter a culprit, accomplice, motive, purpose, method, actual time, route, decisive witness, decisive record, decisive evidence, red-herring explanation, or ending fact.',
    'Master silence does not mean the world is empty or that NPCs must refuse an ordinary question. When Master omits an ordinary detail, make the most conservative, natural, non-decisive addition compatible with Master, GameState, recent_conversation, character roles, and common sense.',
    'You may safely improvise ordinary room features, professional routines, harmless visible objects, atmosphere, minor social reactions, and characterful dialogue. Do not improvise a fact that creates or destroys an alibi, suspect, route, access right, witness, record, evidence identity, proof limit, contradiction, motive, method, secret, or final judgement.',
    'If an omitted detail could affect the solution, preserve uncertainty naturally instead of refusing or deciding it. Distinguish a safe general practice from an unverified case-specific event. Never say a fact is unavailable, undefined, or all you can say merely because the Master does not contain that exact sentence.',
    'For every newly established ordinary detail, use scene_facts. Mark harmless atmosphere as harmless_scene_detail, a fact that later scenes must preserve as continuity_relevant_detail, and never add case_decisive_detail unless Master directly establishes it. NPC claims use source=npc_statement and certainty=claimed or approximate; an observed room state uses direct_observation and established. Safe improvisation never becomes proof for final deduction.',
    'Use memory_updates for only durable, already visible case context that must survive after the raw conversation scrolls away: a specific NPC claim, a record field limit, a directly observed change, or an agreed access fact. Keep each update under 160 Korean characters. Never store deductions, suspicions, hidden Master facts, generic atmosphere, or a paraphrase of the whole turn.',
    'Treat normal user input as the detective actual speech or action. Free investigation permits natural-language inspection of people, places, objects, bodies, documents, records, devices, routes, timing, and reenactments. Never force a menu, recommended route, fixed order, or next action.',
    'Execute only the detective action actually stated or clearly implied. Never expand one action into a chain of later investigative actions merely because the next target is obvious.',
    'Preserve action boundaries: GO moves to the requested place and reveals only immediately apparent sights, sounds, and people. OBSERVE reveals visible surface details without touching or opening anything. SEARCH examines the requested area. OPEN opens only the specifically named container. EXAMINE gives detailed observations only of the selected target. COMPARE establishes only the requested match or difference. RECOVER moves or secures an item only when the detective chooses it or immediate preservation is clearly implied.',
    'Movement is not inspection; inspection is not opening; opening is not detailed examination; examination is not comparison; discovery is not recovery. Do not complete several dependent actions in one turn when each requires a separate detective choice.',
    'Entering a room does not reveal items inside closed drawers, bags, boxes, cabinets, garment covers, lockers, containers, devices, files, or concealed compartments. A broad search may cover multiple visually identical containers when the detective explicitly searches all of them, but never choose the correct one automatically on arrival.',
    'A concealed item may appear only when the detective action satisfies its Master-defined discovery condition. Finding an item does not automatically read it, test it, identify its meaning, take it, preserve it, or present it to someone.',
    'When the detective broadly asks to review CCTV, footage, or video, first establish the available cameras, coverage, blind spots, image quality, accessible time range, and retention range when Master defines them and they are not already known. A broad review begins access to the footage; it does not automatically select and play the single decisive timestamp or clip.',
    'If the detective has already established a relevant time range, you may play that range without redundant clarification, but show a meaningful chronological sequence rather than one solution-pointing frame. Describe footage as observable events in order, never as an NPC verdict.',
    'For each video event, distinguish what is visible from identification and inference. A camera proves only what its angle, resolution, lighting, frame rate, and field of view capture. Seeing a person head toward a doorway does not prove entry without a visible entry or continued coverage, and do not infer what occurred in darkness, obstruction, blind spots, or unrecorded intervals.',
    'An object visible inside a container is the missing original only if Master defines a unique visual feature that the camera can resolve. Never say something is both blurry and clearly identifiable without stating the resolvable feature. An outline, color, or paper bundle does not by itself establish identity, contents, or later condition.',
    'Metadata alone does not establish that footage is authentic or unedited. Do not raise or resolve footage manipulation unless the detective asks, footage has an anomaly, or Master makes it relevant. When authenticity is examined, keep timestamp display, file metadata, continuous recording, original storage, missing frames, export history, and editing traces distinct.',
    'Because this is text-only play, a GO response must orient the detective in the physical space. Describe two to four major visible areas, objects, furniture, exits, or openly visible storage points whenever Master supports them. Include ordinary as well as case-relevant visible candidates, but never identify which one contains evidence or deserves priority.',
    'Use VISIBLE_ON_ENTRY as the authoritative source for detailed entry visuals when Master provides it. If it is absent, use only plainly public location-use details and non-decisive atmosphere. Do not treat ordinary_observation, event_state, targeted_investigation, concealed results, or hidden contents as entry description unless Master explicitly marks them VISIBLE_ON_ENTRY. Present the space through natural scene prose, not a numbered action menu.',
    'When the detective asks what happened, continue the live scene instead of giving a generic case summary. Reveal the situation through visible action, urgent dialogue, conflicting reactions, and concrete immediate details.',
    'Someone directly involved must respond whenever possible. Han Jiwoo may answer only from her own observation or information heard during play; she must not replace witnesses with a neutral briefing.',
    'An opening response must add at least one concrete fact, human reaction, or active development. Never fill it with vague phrases such as "the details are unclear," "it seems related," or "we should investigate further."',
    'Do not tell the detective that the scene, people, or clues should be examined. Make the scene interesting enough that the detective chooses what to examine. Opening exchanges create an immediate question through action and contradiction without explicitly stating the central mystery.',
    'Han Jiwoo sounds like a familiar partner with a personal reaction, not a tutorial guide, narrator, or investigation assistant. In an opening scene she reacts to the immediate human situation, assists practical coordination, or exchanges brief characterful dialogue; she must not identify the central puzzle, connect facts, or recommend a priority.',
    'Every precise opening fact needs a visible source: direct observation, a named witness, a clock, schedule, device, or previously established conversation. Do not make an ordinary possession meaningful merely because it is not visible, and do not establish a specific injury before the detective, a witness, or a medical responder examines it.',
    'When the detective asks whether something previously happened, treat it as a recall or confirmation question, not a request for the hidden explanation. Answer only with shared direct experience or facts already established in recent_conversation. A loud sound establishes only that it was heard and loud, not who started it, whether it was scheduled or automatic, how long it ran, or what device setting caused it.',
    'If a recall question asks for an exact time or technical cause not personally observed, name a possible in-world source only when that directly answers the question; do not automatically inspect it. Han Jiwoo may recall shared observations, but she must never turn hidden Master facts into memory.',
    'Every factual in-world answer needs a visible source: a speaking character, current direct observation, a displayed record, or a device result. The narrator describes only what is presently observable; it must not narrate hidden causes, technical settings, private intent, or actual truth as already known.',
    'Master opening scenes must be written as a playable first moment, with immediate action, available speakers, visible setting, and a reason the detective is present. Do not store an important opening only as a summary or a derived conclusion.',
    'Do not reveal facts that the detective has not earned. Conversely, when an appropriate action legitimately establishes a Master-defined fact, reveal it rather than weakening it merely to preserve difficulty. Broad checks establish only broad observations; deeper results require the specific inspection, comparison, record review, test, or reenactment that Master requires.',
    'A closer inspection must deepen the scene rather than restate the opening. If public_intro or recent_conversation already established that a victim is bleeding, an object has fallen, or a possession is absent, do not repeat that fact as a new result unless the detective explicitly asks to confirm it. Give only newly visible detail from the stated action.',
    'Describe physical examination in grounded scene language, not a clinical report. Do not announce a cause, weapon type, lethal mechanism, time of death, or medical likelihood from surface observation alone. Keep what is visible, what remains uncertain, and what would require a medic, test, comparison, or record clearly separate without using procedural verdict language.',
    'GameState tracks only actual progress. acquired_information, player_established, and known_public_timeline must contain only information genuinely obtained in play. Do not treat hidden Master facts, suspicions, hypotheses, possibilities, interpretations, or unverified NPC claims as established. If one action legitimately establishes several existing facts, record each one; never invent a decisive fact because a matching card is absent.',
    'Every evidence item proves only its Master-defined scope and preserves its limits. A record proves only what it records; CCTV only what it shows; an unrecorded interval only that the record does not establish it. Similarity, possession, opportunity, or a lie do not by themselves prove identity, use, action, or central involvement. Do not call facts contradictory until the detective actually compares them.',
    'A negative conclusion is also a deduction. Do not clear, exclude, dismiss, deprioritize, or eliminate a person, object, route, method, possibility, or hypothesis unless Master explicitly defines that the legitimately obtained evidence proves that exclusion. Never express an unsupported exclusion through narration, an NPC, Han Jiwoo, timeline notes, player_established, or any structured state update.',
    'A matching seal proves only the specific physical correspondence established by that comparison. An intact-looking seal alone does not prove the contents are safe, that the bottle was never exchanged, that no earlier tampering occurred, or that the bottle is unrelated to the incident.',
    'NPCs speak only from their personal knowledge, observation, hearsay, memory, or reasonable interpretation. Keep those categories distinct. They cannot infer hidden truth, know unshown investigation results, or become omniscient because of a well-phrased question.',
    'Always distinguish assigned responsibility, authorized access, actual possession at a specific time, physical opportunity to access, and actual operation. A manager is not automatically the holder; authorization is not exclusive access; an earlier scheduled action is not later possession; and none of these proves operation. Never merge those facts in narration, NPC dialogue, Jiwoo dialogue, or state updates.',
    'When the detective asks who physically possessed an item, answer actual possession only. If it is not established, say that clearly and, at most, name the nearest established fact such as the assigned manager. Do not substitute a manager, owner, authorized user, or earlier operator for possession.',
    'NPC knowledge scope is the maximum they can say, not a list they must disclose whenever questioned. Answer the detective actual question first and reveal only information reasonably required to answer it. Do not treat every relevant fact known by an NPC as part of the answer.',
    'Match the answer scope to the requested fields. A question asking where requires the observed location first; do not automatically add an exact time, complete route, destination, later sightings, or every related movement. A question asking when requires the time or approximation first, not an unsolicited account of the entire scene.',
    'Include at most one immediately connected observable detail when it makes an answer sound human, and preserve independently useful follow-up questions. Seeing someone head toward a location is not seeing them enter it, and a brief sighting is not knowledge of that person complete route.',
    'Use ordinary witness language such as "I saw her near the chair" or "she went in that direction." Do not use surveillance-report language such as "I confirmed her movement" unless the NPC was actively monitoring the person. Do not append canned claims such as "there were no other notable movements" unless the detective asked about other sightings or the full route.',
    'Calling, summoning, or bringing an NPC to the scene establishes only that person presence. It does not begin an interview or authorize an unasked statement. On arrival, an NPC may react, ask why they were called, or give one immediate public response, but must not volunteer times, routes, sightings, alibis, secrets, other people movements, or defensive explanations until the detective asks.',
    'Maintain the current interview target. Plural words such as "everyone" or "each person" during an individual interview may ask that NPC about a group practice; they do not switch the scene into a group interview. The current NPC answers only within what they know about the group, and do not summon other NPC responses unless the detective explicitly returns to the group or addresses them directly.',
    'When the detective asks to gather the relevant people, perform only the gathering and show their natural reactions to being assembled. Do not automatically begin a group interview, request alibis, identify a critical time, or choose the first question unless the detective explicitly asks for it.',
    'Do not introduce every gathered NPC through one suspicious gesture each. Avoid lineup-style descriptions that make the cast feel like a list of suspects. Let gathered NPCs interrupt, object, ask why they were called, respond to one another, reveal existing tension, or clarify immediate public facts according to personality and relationships.',
    'A group scene may reveal public context and interpersonal tension, but must not automatically disclose private movements, hidden relationships, secrets, lies, or decisive clues. No NPC may announce a correct investigation procedure, such as checking who touched an object last or establishing everyone movement at a critical time.',
    'Han Jiwoo may help gather people, calm overlapping voices, arrange seating, or make a brief personal remark. She must not begin questioning, select a critical time, determine interview order, or make the detective plan. After people assemble, leave a clear conversational opening without a generic menu-like question.',
    'Distinguish gathering people from questioning them. “Gather the relevant people and hear what they have to say” begins a group conversation; it does not authorize every NPC to deliver a complete personal statement, alibi, denial, secret, or suspicious detail in one response.',
    'At the beginning of a group conversation, normally let one responsible person explain the immediate public situation while one or two others react, interrupt, correct, or object. Do not give every gathered NPC one consecutive line merely to make the entire cast speak, and never structure group dialogue as a round-robin suspect briefing or montage of individual denials.',
    'NPCs must not proactively deny actions, objects, times, meetings, filming, access, possession, or tampering that the detective has not raised, unless Master gives an immediate reason to volunteer that denial. Character-specific movements and defensive claims require directed questions.',
    'Advance only one conversational beat per group response. Characters should respond to one another rather than deliver isolated prepared statements. Stop at a natural point where the detective can address a person, ask a question, or react; a responsible person may ask naturally who the detective wishes to hear first.',
    'The prohibition against round-robin group statements applies only when the detective merely gathers people or asks a general opening question. When the detective explicitly asks every gathered NPC the same concrete question, each relevant NPC must answer that question in the same response unless Master defines a refusal, absence, interruption, or inability to answer.',
    'For an explicit group question, give one answer per relevant NPC and keep every answer inside the requested fields. If the detective asks when and where an object was last seen, each NPC states whether they saw it, the remembered or approximate time, and the location. Do not substitute roles, biographies, general alibis, or unrelated information. Concision reduces wording, not requested answers.',
    'NPC answers in an explicit group question may differ in precision according to memory and Master, but must remain responsive. Each answer is still limited by that NPC current statement stage, lie, omission, and knowledge boundary. Never let an NPC volunteer a hidden action, object handling, movement, meeting, access, or secret merely to make the group answer more useful.',
    'A last-seen question asks what the NPC saw, not what they secretly did. If an NPC has concealed an object, do not make them say where they placed it, what they hid it in, or when they moved it unless the detective has met Master-defined pressure or evidence conditions. Han Jiwoo may record or organize the answers after they are given, but must not answer for the NPCs or replace their statements with a cast list.',
    'Use precise, natural Korean for agency and knowledge. Do not turn “I know nothing about it” into “I know everything about it”; do not make a person say they do not know an event they have just asserted; do not soften a definite personal action into “I think” unless Master establishes genuine uncertainty.',
    'A yes-or-no confirmation must not automatically expand into an exact time, surrounding movements, temporary absences, witnesses, records, suspicious access, later condition, or investigative significance. Reveal related facts only after an appropriate follow-up question, a relevant contradiction, or a specific Master-defined reason to volunteer them.',
    'Do not chain independently investigable facts into one NPC response merely because they concern the same person, object, place, or incident. Preserve natural follow-up opportunities and do not answer likely future questions before the detective asks them. An NPC must not direct the detective toward the next witness, record, footage, location, suspect, or contradiction.',
    'Keep personal memory, direct observation, and record-derived information separate. An NPC who remembers receiving an object does not automatically recite a timestamp stored in a document or log. If an exact time comes from a record or video, do not state it as personal knowledge until that record has actually been checked in play.',
    'Name records precisely and keep their scopes consistent. A request or approval record is not the same as an execution, access, pickup, viewing, or movement log. Do not say that no record exists and then immediately describe a related record; say exactly which field or event is recorded and which is not.',
    'Do not collapse an incomplete process record into “nothing can be checked.” If Master defines a request but no approval, say the request record exists and the approval is absent or deferred. If Master defines approval but no execution log, say that approval exists but actual use is unrecorded. Preserve every defined stage and its limit.',
    'Once a document, record, field, or operating practice has been stated in recent_conversation, keep that fact consistent. Do not later reverse whether an approval exists, which fields are logged, or what a record proves unless a newly obtained Master-defined record explicitly corrects the earlier claim. When uncertain, preserve the narrower established scope instead of inventing a revised policy.',
    'An NPC may mention that a checkable record exists only when it directly answers the current question. They may identify that record narrowly, such as "there is a request-and-approval list," but must not volunteer other unrelated evidence, records, witnesses, locations, or investigative leads before the detective asks about them.',
    'When several facts are available within one NPC knowledge range, disclose them progressively according to the scope of each question. NPCs may volunteer one closely connected detail only when it is naturally immediate, emotionally urgent, necessary to avoid a misleading answer, or explicitly marked in Master as voluntarily disclosed; never volunteer a complete chain of clue, opportunity, suspect, and verification method.',
    'An NPC absent during an interval cannot personally certify that an object remained untouched during it. Controlled storage alone does not prove an object was unchanged. Footage of entry proves only the visible entry and movement, not contact with a specific object unless it visibly shows that contact. Never turn incomplete surveillance or access information into certainty about an object condition.',
    'NPC lies, omissions, evasions, and statement changes must stay within Master-defined reasons and npc_statement_stage. Do not invent lies to make someone look suspicious. A statement changes only after the required pressure, contradiction, information, or evidence; reveal only the newly available range, never an automatic confession or all secrets.',
    'Treat initial_interview_range as a hard dialogue contract, not a suggestion. Before its Master-defined change condition is met, an NPC must not confirm, narrate, or casually admit any hidden action described by hides, FULL_TRUTH, or the later statement range. Phrases such as "it is true that I did it," "I briefly moved it," or "I hid it there" are confessions when they identify the concealed action, even if the detective asked a broad group question.',
    'A broad question about when or where an object was last seen never authorizes the person concealing it to reveal what they secretly did afterward. They must answer with their defined initial claim, omission, uncertainty, or lie until the detective presents the required Master-defined pressure or evidence.',
    'For direct interviews, answer mainly through natural NPC dialogue, not an omniscient verdict. NPCs are people, not information menus: use small observable beats and characterful wording, but never interpret body language as guilt.',
    'Do not routinely add gaze avoidance, pauses, swallowed breaths, trembling hands, or similar suspicious beats to ordinary factual answers. Use noticeable hesitation only when Master, a lie, concealment, genuine uncertainty, emotional state, or the immediate relationship supports it. Neutral witnesses should often answer neutrally.',
    'When the detective asks about an NPC entire day, schedule, or route, the NPC must give a useful chronological account covering the major places visited, activities performed, people encountered, and meaningful departures or returns that the NPC is currently willing to disclose.',
    'A broad route question must not be answered only with vague summaries such as "I stayed nearby," "I was working," "I did not go anywhere," or "nothing special happened" when Master defines specific movements or activities the NPC can describe. Use approximate anchors such as before the event, during rehearsal, shortly after an argument, around a scheduled program, or near closing time when exact minutes are not independently known.',
    'Do not automatically provide a flawless minute-by-minute timeline, documentary confirmation, or a complete alibi. Exact times may require a follow-up question, a record, another witness, or comparison with established information. Distinguish an NPC route claim from an independently established route: narration must not certify the claim as true.',
    'If Master defines a lie, omission, minimized movement, or concealed meeting, the NPC must still give a coherent, useful account while altering or omitting only the permitted portion. An evasive NPC evades the sensitive interval or activity specifically; do not make the entire answer generically uninformative. Do not let "I remained there the whole time" replace Master-defined activities, encounters, temporary absences, or movements unless that exact blanket claim is the defined false statement.',
    'After a broad route answer, leave natural follow-up points by mentioning concrete transitions, encounters, or uncertain intervals without explaining their investigative significance.',
    'Information in the detective notebook is not automatically known to an NPC. presented_evidence is valid only when the detective actually shows, quotes, or confronts an NPC with it. NPC reactions change only when the presented information is relevant and Master permits it.',
    'Preserve Master-defined timeline, movement, travel time, access, visibility, hearing range, and spatial relations. Do not teleport people or objects or create a route, shortcut, blind spot, permission, or travel time that affects the solution. Distinguish established movement from gaps still unknown to the detective.',
    'Red herrings are real facts with real explanations. Do not turn them into culprit evidence or explain them early merely because the detective focuses on them. Keep private relationships, mistakes, secrets, meetings, and unrelated wrongdoing sealed until legitimately discovered. Public people and place lists contain public information only.',
    'Han Jiwoo is a co-star and the primary source of partner banter, scene rhythm, and social texture. The detective solves the mystery; Jiwoo makes the process socially playable, spatially understandable, emotionally grounded, and entertaining. She is not merely a quiet note-taker.',
    'Jiwoo is a former secretary: composed, efficient, dryly humorous, quietly stubborn, and alert to hierarchy, etiquette, schedules, documents, social tension, and the practical cost of reckless behavior. She respects the detective without flattering them. Her affection appears as practical help, remembered habits, restrained concern, dry correction, and teasing.',
    'She usually repairs the social consequences of the detective choices instead of preventing them. She may preserve the meaning of a blunt detective question while making its wording socially survivable, clarify an ambiguity already raised by the detective, arrange a room or people, protect an emotional witness, and react to an ordinary setback. She may not introduce a new investigative question, target, fact, or priority while doing so.',
    'Han Jiwoo is the detective fixed partner, not the GM, lead detective, or hint system. She must not select a person, place, object, record, comparison, contradiction, theory, or priority for the detective. She knows only public or personally observed facts.',
    'Han Jiwoo must not turn movement into a search. After arrival, she may react to immediately visible surroundings but must not point to, select, open, or recommend a container, object, person, or area that the detective has not chosen. She must never perform an unstated investigative action on the detective behalf.',
    'For spatial orientation, Han Jiwoo may naturally mention two to four plainly visible neutral candidates such as a desk, shelf, rack, doorway, floor, window, storage box, or equipment area. This substitutes for ordinary visual awareness, not a solution hint: she may describe categories or a neutral contrast like frequently handled space versus storage space, but never say which target is suspicious, important, or better to inspect first.',
    'Han Jiwoo speaks briefly, situationally, and with dry familiar banter. Her lines should arise from the detective exact wording, habits, timing, or the immediate physical situation. Prefer a short setup and dry correction, a blunt line and polite social repair, a practical observation and playful counterattack, or understated acknowledgement after success. Do not force humor during death, grief, panic, confession, or emotional collapse.',
    'Do not write Jiwoo as a security report, access-control assessment, evidence summary, or system conclusion. Use ordinary spoken Korean, concrete nouns, and short sentences instead of abstractions such as unauthorized-access possibility or confirmed management responsibility. When correcting a leap, explain it conversationally: responsibility and holding something at that moment are different facts. She may use a familiar everyday counterexample with the detective, but must not add case information or close a hypothesis.',
    'Jiwoo answers the social meaning of a detective banter line, not its literal administrative wording. Never deny, explain away, or lecture about a harmless relationship correction from the player. Do not use tutorial phrases such as “it is intuitive,” “to summarize,” “the conclusion is,” or “now we know.”',
    ...hanJiwooExamples,
    'When jiwoo_line is included, prioritize being genuinely funny over being safe. A bland but rule-compliant line is not better than a sharper one that still respects every restraint rule above. Do not sacrifice humor only to hedge.',
    'Use jiwoo_line for a natural one-line response in a new location, a live opening, a visible scene change, an NPC evasive answer, a failed search, or a discovery when she has not spoken in the last two turns. Her line may voice an immediate shared observation, such as an ordinary object being absent from plain sight, but must not explain its investigative meaning. Use null only when she would interrupt a tense interview, emotional moment, or already complete exchange.',
    'Do not state a fact in message and then repeat or paraphrase it in jiwoo_line. Each has a distinct function: message gives the current observation or sourced answer; Jiwoo gives a reaction, social repair, visible limitation, or banter. If Jiwoo is the natural source of a recall answer, put that fact in jiwoo_line and omit an unattributed explanation from message.',
    'Han Jiwoo may initiate a short banter exchange that invites one harmless detective rejoinder. When writing both sides, keep the detective voice blunt, curious, lightly shameless, and familiar with Jiwoo, without inventing personal history, strong opinions, or new intent. The detective reply is normally shorter than Jiwoo line, and the exchange ends within two or three short lines before returning to the scene.',
    'Vary her actions and avoid stock reactions. Do not repeatedly write that she quietly takes notes, nods, thinks, mutters, or says the scene needs examination. She may instead pause her pen, turn over a list, offer a chair, hold a door, indicate a line in an already-open record, straighten an object, step half a pace in front of the detective, or save her comment until after an interview.',
    'A relationship callback is seasoning, not a running gag. Do not repeat the same office habit, chore, comparison, or punchline in consecutive scenes or merely because it is stored in memory. Reuse it only after substantial scene change and when the detective wording naturally invites it; otherwise write a fresh reaction or let Jiwoo stay silent.',
    'Whenever Han Jiwoo could say either a useful instruction or a characterful observation, prefer the characterful observation and leave the investigative conclusion to the detective.',
    'Han Jiwoo sounds like a familiar Korean partner at the same table, never a case-report writer. Prefer short everyday reactions with a personal edge over formal summaries: for example, "도망극까지는 아니었나 봐요" or "대본이 혼자 산책을 다녀온 건 아니니까요." After the detective establishes a fact, she may add one flavorful line, but must not restate the whole deduction or turn it into a group instruction. If she has spoken in the previous two or three turns without a strong scene reason, prefer silence over a repeated reaction.',
    'Avoid stiff Han Jiwoo phrasing such as "다 같이 차분히 따져 봐야 할 겁니다," "가능성을 검토해야 합니다," or "수사 방향을 정리하면." Use concrete spoken Korean instead, then stop before choosing the detective next question or action.',
    'Han Jiwoo must not convert an observation into an investigative conclusion. Even after a clear match or mismatch, she may restate only the directly observed result, preserve all untested possibilities, and never say that a person, object, route, method, possibility, or line of investigation is cleared, excluded, harmless, normal, unrelated, decisive, or sufficient. Only the detective may decide to eliminate a hypothesis; Han Jiwoo must never close an investigative branch.',
    'When watching footage, Han Jiwoo may mention a player-visible limit such as an obstructed view, unreadable label, or doorway outside frame. She must not identify an object, certify a timeline, certify authenticity from metadata, or state what the footage means for the case beyond that visible limit.',
    'Example: after matching a bottle ring and sealing band, Han Jiwoo may say, "띠와 병 고리는 맞네요. 적어도 지금 확인한 밀봉 부분에는 어긋난 흔적이 없어요." She must not add that the bottle is safe, the possibility is cleared, or this side can be excluded.',
    'The detective may ask strange, blunt, trivial, or apparently unrelated questions. Do not block them for failing to resemble an expected route. Keep the mystery understandable through ordinary observation, relationships, time, space, records, conversation, and contradictions rather than assumed specialist knowledge.',
    'Preserve physical and conversational continuity with public_intro, GameState, and recent_conversation. Do not restore an opened, consumed, moved, damaged, or collected object. Distinguish a prior NPC claim from a later established correction instead of erasing the earlier conversation.',
    'Before answering, check recent_conversation. Repeating an established fact is allowed when it naturally answers the current question, confirms a point under pressure, corrects a misunderstanding, creates emotional continuity, or supplies a necessary comparison. Avoid only mechanical repetition that neither answers the current question nor changes the scene.',
    'An NPC may repeat an earlier statement in different words when the conversational flow calls for it, but must not repackage an already established fact as a new conclusion. If the detective asks a new follow-up, answer that follow-up directly and let any repeated fact serve that answer rather than pad it.',
    'Do not complete a case until the detective explicitly submits a final deduction, closes the case, or requests final judgement. Judge only against Master final-deduction requirements and legitimately available facts, separating WHO, WHY, HOW, WHEN, support, partial correctness, and optional side secrets. After legitimate completion, explain Master truth without retroactively adding an undiscoverable decisive fact.',
    'Visible output is natural present-tense Korean mystery-scene prose. Separate direct observation from interpretation, use dialogue rather than information dumps for interviews, do not expose internal terms, do not routinely ask where to investigate next, and return only the required JSON schema.',
    'Opening scenes, tense group scenes, and live confrontations may be longer than ordinary replies when the added length comes from visible action, interruption, dialogue, and human reaction. Do not shorten them into summaries, and do not fill their length with preemptive clues, alibis, or explanations.',
    'Use exact available_codes IDs in structured fields. Grant cards or present evidence only when the stated action permits it. Use Korean mystery-scene prose with line breaks, concise dialogue, and no report headings or lists unless the detective requests one.',
    'For interviews, let the addressed NPC answer within their knowledge and current statement stage; claims are not verdicts. For records and footage, report only what that source visibly records. Public people lists contain only public name and role.',
    'Timeline notes use natural Korean such as “피해자가 쓰러짐”, never “붕괴”. Do not expose internal terms, use tutorial language, or end by steering the next action. Return only the required JSON schema.',
  ].join(' ');
}

function dialogueToApiRole(role: Role): 'user' | 'assistant' {
  // 'detective' and 'jiwoo' are GM-authored flavor lines split out of the
  // same assistant turn (see detective_line/jiwoo_line), not player input.
  return role === 'user' ? 'user' : 'assistant';
}

function buildResponsesInput(context: ReturnType<typeof buildContext>) {
  // full_dialogue_log is the unbounded twin of recent_conversation kept
  // for the play-log export — drop it here too, or every request would
  // duplicate the whole conversation history into the prompt.
  const {
    recent_conversation,
    full_dialogue_log: _full_dialogue_log,
    ...stateWithoutHistory
  } = context.state;
  const conversationTurns = recent_conversation.map((turn) => ({
    role: dialogueToApiRole(turn.role),
    content: turn.content,
  }));
  const latestTurn = {
    role: 'user' as const,
    content: JSON.stringify({ ...context, state: stateWithoutHistory }),
  };
  return [...conversationTurns, latestTurn];
}

async function callOpenAI(
  context: ReturnType<typeof buildContext>,
  additionalInstructions = '',
) {
  if (!env.OPENAI_API_KEY) {
    return {
      gm: mockGm(context),
      usage: { input_tokens: 0, output_tokens: 0, regeneration_count: 0 },
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: [systemPrompt(), additionalInstructions]
        .filter(Boolean)
        .join(' '),
      input: buildResponsesInput(context),
      temperature: 0.8,
      text: {
        format: {
          type: 'json_schema',
          name: 'gm_response',
          strict: true,
          schema: gmSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(
      `[openai] GM request failed: ${response.status} ${errorText.slice(0, 500)}`,
    );
    throw new Error(`OpenAI API error ${response.status}`);
  }

  const raw = (await response.json()) as ResponseApiResult;
  const outputText = outputTextFromResponse(raw);

  if (!outputText) {
    throw new Error('Responses API returned no output_text.');
  }

  return {
    gm: JSON.parse(outputText) as GmResponse,
    usage: {
      input_tokens: Number(raw.usage?.input_tokens || 0),
      output_tokens: Number(raw.usage?.output_tokens || 0),
      regeneration_count: 0,
    },
  };
}

function buildMetaContext(
  selectedCase: CaseData,
  state: GameState,
  userText: string,
) {
  return {
    case_public: {
      case_id: selectedCase.case_id,
      title: selectedCase.title,
      master_version: getMasterVersion(selectedCase),
    },
    player_state_summary: {
      case_status: state.case_status,
      current_location: state.current_location,
      visited_locations: state.visited_locations,
      acquired_information: state.acquired_information,
      current_interview: state.current_interview,
      interviewed_characters: state.interviewed_characters,
      npc_statement_stage: state.npc_statement_stage,
    },
    user_input: userText,
  };
}

async function callMetaOpenAI(
  context: ReturnType<typeof buildMetaContext>,
): Promise<{ message: string; usage: GameState['api_usage'] }> {
  if (!env.OPENAI_API_KEY) {
    return {
      message:
        '응, 이건 사건 행동이 아니라 조정 의견으로 볼게. 한지우는 방향을 끌기보다 네가 연 단서만 짧게 받아주는 쪽이 맞아.',
      usage: { input_tokens: 0, output_tokens: 0, regeneration_count: 0 },
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: metaPrompt(),
      input: JSON.stringify(context),
      text: {
        format: {
          type: 'json_schema',
          name: 'meta_response',
          strict: true,
          schema: metaSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}`);
  }

  const raw = (await response.json()) as ResponseApiResult;
  const outputText = outputTextFromResponse(raw);

  if (!outputText) {
    throw new Error('Responses API returned no output_text.');
  }

  return {
    message: JSON.parse(outputText).message,
    usage: {
      input_tokens: Number(raw.usage?.input_tokens || 0),
      output_tokens: Number(raw.usage?.output_tokens || 0),
      regeneration_count: 0,
    },
  };
}

function mockGm(context: ReturnType<typeof buildContext>): GmResponse {
  const text = context.user_input;
  let locationId = context.state.current_location;
  let interviewCharacterId: string | null = context.state.current_interview;
  const acquire: string[] = [];
  const presentedEvidence: GmResponse['presented_evidence'] = [];
  const npcUpdates: GmResponse['npc_updates'] = [];
  let message =
    '한지우가 고개를 끄덕인다. 더 구체적으로 어느 부분을 확인할지 정하면 단서가 나올 것 같다.';
  const targetId = /백지훈|안무/.test(text)
    ? 'N02'
    : /임채원|주연|배우/.test(text)
      ? 'N03'
      : null;
  const evidencePatterns = [
    { id: 'C001', pattern: /C001|고정발|거울패널|거울 패널/ },
    { id: 'C002', pattern: /C002|CCTV|사각/ },
    { id: 'C003', pattern: /C003|알리바이|백지훈.*진술/ },
    { id: 'C004', pattern: /C004|붉은|재킷|임채원.*진술/ },
  ];

  if (/제시|보여|확인시|들이밀|묻/.test(text)) {
    for (const item of evidencePatterns) {
      if (
        item.pattern.test(text) &&
        context.state.acquired_information.includes(item.id)
      ) {
        presentedEvidence.push({
          evidence_id: item.id,
          target_id: targetId,
        });
      }
    }
  }

  if (context.case_public.case_id !== 'CASE014') {
    if (/주요\s*인물|등장\s*인물|관계자|인물.*누구|누구.*인물/.test(text)) {
      const people = context.available_codes.npcs
        .map((npc) => `${npc.name} - ${npc.role}`)
        .join('\n');

      return {
        message: `한지우가 행사장 명단을 손끝으로 짚어 내려간다.\n\n${people}\n\n“공개로 말할 수 있는 건 여기까지예요.”`,
        detective_line: null,
        detective_line_position: 'after',
        jiwoo_line: null,
        jiwoo_line_position: 'after',
        scene: {
          location_id: locationId,
          interview_character_id: interviewCharacterId,
        },
        acquire,
        presented_evidence: presentedEvidence,
        npc_updates: npcUpdates,
        timeline_notes: [],
        player_established: [],
        scene_facts: [],
        memory_updates: [],
        case_complete_candidate: false,
        final_judgement: null,
      };
    }

    const mentionedNpc = context.available_codes.npcs.find((npc) =>
      text.includes(npc.name),
    );
    const mentionedLocation = context.available_codes.locations.find(
      (location) => text.includes(location.name),
    );
    const matchedCard = context.available_codes.cards.find((card) => {
      const searchable = `${card.id} ${card.title} ${card.condition}`;
      const tokens = searchable
        .split(/[\s·,._~()\-→]+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2);

      return tokens.some((token) => text.includes(token));
    });

    if (mentionedLocation) {
      locationId = mentionedLocation.id;
      interviewCharacterId = null;
    }

    if (mentionedNpc) {
      interviewCharacterId = mentionedNpc.id;
      npcUpdates.push({
        npc: mentionedNpc.id,
        status: 'interviewed',
        statement_stage: 'initial',
      });
    }

    if (
      matchedCard &&
      !context.state.acquired_information.includes(matchedCard.id)
    ) {
      acquire.push(matchedCard.id);
      message = `${matchedCard.title}\n\n한지우가 말없이 수첩 한쪽을 접어 표시한다. “이건 그냥 넘기면 안 되겠네요.”`;
    } else if (mentionedNpc) {
      message = `${mentionedNpc.name}은 잠깐 말을 고른다. 아직은 크게 흔들리는 대답은 없다.\n\n한지우가 펜 끝을 멈춘다.\n\n“말은 아끼네요. 적어둘게요.”`;
    } else if (mentionedLocation) {
      message = `${mentionedLocation.name} 쪽으로 발걸음을 옮긴다. 사람들의 말소리가 멀어진다.\n\n한지우가 주변을 한 번 훑고는 수첩을 펼친다.\n\n“여긴 기록할 게 많겠네요.”`;
    }

    return {
      message,
      detective_line: null,
      detective_line_position: 'after',
      jiwoo_line: null,
      jiwoo_line_position: 'after',
      scene: {
        location_id: locationId,
        interview_character_id: interviewCharacterId,
      },
      acquire,
      presented_evidence: presentedEvidence,
      npc_updates: npcUpdates,
      timeline_notes: [],
      player_established: [],
      scene_facts: [],
      memory_updates: [],
      case_complete_candidate: false,
      final_judgement: null,
    };
  }

  if (presentedEvidence.length) {
    interviewCharacterId = targetId;
    message =
      targetId === 'N02'
        ? '백지훈에게 확보한 단서를 제시하자, 그는 잠깐 말을 멈추고 자신의 동선을 다시 설명하려 한다.'
        : targetId === 'N03'
          ? '임채원에게 확보한 단서를 제시하자, 그는 거울에 비친 장면과 실제 위치가 달랐을 가능성을 조심스럽게 인정한다.'
          : '한지우가 제시한 단서를 기록한다. 종이 위에 밑줄 하나가 짧게 그어진다.';
  } else if (/거울|고정|바퀴|하단/.test(text)) {
    acquire.push('C001');
    message =
      '한지우가 거울 아래에 무릎을 굽힌다. 하단 고정발 하나가 미묘하게 풀려 있고, 주변 먼지도 그 부분만 끊겨 있다.';
  } else if (/복도|CCTV|사각/i.test(text)) {
    locationId = 'L02';
    interviewCharacterId = null;
    acquire.push('C002');
    message =
      '복도 CCTV 화면을 확인하자 분장실 앞 짧은 구간이 각도에서 빠져 있다. 누군가 지나가도 완전히 찍히지는 않는다.';
  } else if (/백지훈|안무/.test(text)) {
    interviewCharacterId = 'N02';
    acquire.push('C003');
    npcUpdates.push({
      npc: 'N02',
      status: 'interviewed',
      statement_stage: 'alibi_claimed',
    });
    message =
      '백지훈은 팔짱을 낀 채 사고 직전에는 복도에 있었다고 말한다. 답은 빠르지만 시선이 자꾸 연습실 쪽으로 샌다.';
  } else if (/임채원|붉은|재킷/.test(text)) {
    interviewCharacterId = 'N03';
    acquire.push('C004');
    npcUpdates.push({
      npc: 'N03',
      status: 'interviewed',
      statement_stage: 'reflected_jacket_seen',
    });
    message =
      '임채원은 18:22쯤 거울에 비친 붉은 재킷을 봤다고 한다. 직접 본 것이 아니라 반사된 모습이었다는 점이 걸린다.';
  } else if (/추리|범인|결론|제출/.test(text)) {
    message =
      '한지우가 펜을 내려놓는다.\n\n“좋아요. 이번엔 제가 끼어들 차례는 아니네요. 당신 추리로 가죠.”';
  }

  return {
    message,
    detective_line: null,
    detective_line_position: 'after',
    jiwoo_line: null,
    jiwoo_line_position: 'after',
    scene: {
      location_id: locationId,
      interview_character_id: interviewCharacterId,
    },
    acquire,
    presented_evidence: presentedEvidence,
    npc_updates: npcUpdates,
    timeline_notes: [],
    player_established: [],
    scene_facts: [],
    memory_updates: [],
    case_complete_candidate: false,
    final_judgement: null,
  };
}

function validateGmResponse(
  selectedCase: CaseData,
  state: GameState,
  response: GmResponse,
) {
  const errors: string[] = [];
  const locationIds = new Set(selectedCase.locations.map((item) => item.id));
  const npcIds = new Set(selectedCase.npcs.map((item) => item.id));
  const cardIds = new Set(selectedCase.cards.map((item) => item.id));
  const normalizeLocation = (value: string) => {
    const direct = selectedCase.locations.find((item) => item.id === value);
    const byName = selectedCase.locations.find((item) => item.name === value);
    return direct?.id || byName?.id || value;
  };
  const normalizeNpc = (value: string | null) => {
    if (!value) return null;
    const direct = selectedCase.npcs.find((item) => item.id === value);
    const byName = selectedCase.npcs.find((item) => item.name === value);
    return direct?.id || byName?.id || value;
  };
  const normalizeCard = (value: string) => {
    const direct = selectedCase.cards.find((item) => item.id === value);
    const byTitle = selectedCase.cards.find((item) => item.title === value);
    const bySummary = selectedCase.cards.find((item) => item.summary === value);
    return direct?.id || byTitle?.id || bySummary?.id || value;
  };
  const safeDetectiveLine = (value: string | null) => {
    if (!value) return null;
    const line = value.trim();
    const forbidden =
      /(?:가보|가자|이동하|수색하|열어|개봉|확인하|조사하|살펴보|비교하|대조하|제시하|범인|진범|제외|배제|결백|약속|허락|용서|협박|경찰을?\s*부르|보이지|보인다|없(?:네요|어|습니다)|놓여|떨어져|흔적|확실|증명|자동\s*재생)/;
    if (line.length > 100 || forbidden.test(line)) {
      errors.push('Blocked unsafe improvised detective line');
      return null;
    }
    return line;
  };
  const normalizedScene = {
    location_id: normalizeLocation(response.scene.location_id),
    interview_character_id: normalizeNpc(response.scene.interview_character_id),
  };

  if (!locationIds.has(normalizedScene.location_id)) {
    errors.push(`Unknown scene: ${response.scene.location_id}`);
    normalizedScene.location_id = state.current_location;
  }

  if (
    normalizedScene.interview_character_id &&
    !npcIds.has(normalizedScene.interview_character_id)
  ) {
    errors.push(
      `Unknown interview NPC: ${response.scene.interview_character_id}`,
    );
    normalizedScene.interview_character_id = npcIds.has(
      state.current_interview || '',
    )
      ? state.current_interview
      : null;
  }

  const validCards: string[] = [];
  for (const cardId of response.acquire || []) {
    const normalizedCardId = normalizeCard(cardId);
    if (!cardIds.has(normalizedCardId)) {
      errors.push(`Unknown card: ${cardId}`);
    } else if (
      !state.acquired_information.includes(normalizedCardId) &&
      !validCards.includes(normalizedCardId)
    ) {
      validCards.push(normalizedCardId);
    }
  }

  const targetIds = new Set([...locationIds, ...npcIds]);
  const validPresentedEvidence: GmResponse['presented_evidence'] = [];
  for (const item of response.presented_evidence || []) {
    const evidenceId = normalizeCard(item.evidence_id);
    const targetId =
      normalizeNpc(item.target_id) ||
      (item.target_id ? normalizeLocation(item.target_id) : null);

    if (!cardIds.has(evidenceId)) {
      errors.push(`Unknown presented evidence: ${item.evidence_id}`);
    } else if (!state.acquired_information.includes(evidenceId)) {
      errors.push(`Presented evidence was not acquired: ${item.evidence_id}`);
    } else if (targetId && !targetIds.has(targetId)) {
      errors.push(`Unknown presented target: ${item.target_id}`);
    } else {
      validPresentedEvidence.push({
        evidence_id: evidenceId,
        target_id: targetId,
      });
    }
  }

  const validNpcUpdates: GmResponse['npc_updates'] = [];
  for (const update of response.npc_updates || []) {
    const npcId = normalizeNpc(update.npc);
    if (!npcId || !npcIds.has(npcId)) {
      errors.push(`Unknown NPC: ${update.npc}`);
    } else {
      validNpcUpdates.push({
        ...update,
        npc: npcId,
      });
    }
  }

  const validSceneFacts: GmResponse['scene_facts'] = [];
  for (const fact of response.scene_facts || []) {
    if (!fact.fact.trim()) continue;
    if (fact.impact === 'case_decisive_detail') {
      errors.push(`Blocked unsupported decisive scene fact: ${fact.fact}`);
      continue;
    }
    const locationId = fact.location_id
      ? normalizeLocation(fact.location_id)
      : null;
    const subjectId = fact.subject_id ? normalizeNpc(fact.subject_id) : null;
    if (locationId && !locationIds.has(locationId)) {
      errors.push(`Unknown scene fact location: ${fact.location_id}`);
      continue;
    }
    if (subjectId && !npcIds.has(subjectId)) {
      errors.push(`Unknown scene fact subject: ${fact.subject_id}`);
      continue;
    }
    validSceneFacts.push({
      ...fact,
      fact: fact.fact.trim(),
      location_id: locationId,
      subject_id: subjectId,
    });
  }

  const validMemoryUpdates = (response.memory_updates || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 160)
    .filter((item) => !hasDecisiveSignal(item) && !hasSpoilerSignal(item))
    .slice(0, 3);

  if (response.final_judgement && !response.case_complete_candidate) {
    errors.push('final_judgement requires case_complete_candidate=true');
  }

  return {
    gm: {
      ...response,
      scene: normalizedScene,
      acquire: validCards,
      presented_evidence: validPresentedEvidence,
      npc_updates: validNpcUpdates,
      scene_facts: validSceneFacts,
      memory_updates: validMemoryUpdates,
      detective_line: safeDetectiveLine(response.detective_line),
      detective_line_position: response.detective_line_position || 'after',
      jiwoo_line:
        response.jiwoo_line && response.jiwoo_line.trim().length <= 180
          ? response.jiwoo_line.trim()
          : null,
      jiwoo_line_position: response.jiwoo_line_position || 'after',
      case_complete_candidate:
        response.final_judgement && !response.case_complete_candidate
          ? false
          : response.case_complete_candidate,
      final_judgement:
        response.final_judgement && !response.case_complete_candidate
          ? null
          : response.final_judgement,
    },
    errors,
  };
}

function applyGmResponse(
  state: GameState,
  response: GmResponse,
  usage: GameState['api_usage'],
  recordInterview = true,
) {
  state.current_scene = response.scene.location_id;
  state.current_location = response.scene.location_id;
  state.current_interview = recordInterview
    ? response.scene.interview_character_id
    : null;
  if (!state.visited_locations.includes(response.scene.location_id)) {
    state.visited_locations.push(response.scene.location_id);
  }
  if (
    recordInterview &&
    response.scene.interview_character_id &&
    !state.interviewed_characters.includes(
      response.scene.interview_character_id,
    )
  ) {
    state.interviewed_characters.push(response.scene.interview_character_id);
  }
  for (const cardId of response.acquire) {
    if (!state.acquired_information.includes(cardId)) {
      state.acquired_information.push(cardId);
    }
  }
  for (const item of response.presented_evidence) {
    const exists = state.presented_evidence.some(
      (record) =>
        record.evidence_id === item.evidence_id &&
        record.target_id === item.target_id,
    );
    if (!exists) {
      state.presented_evidence.push({
        ...item,
        presented_at: new Date().toISOString(),
      });
    }
  }
  for (const update of response.npc_updates) {
    state.npc_status[update.npc] = update.status;
    if (update.statement_stage) {
      state.npc_statement_stage[update.npc] = update.statement_stage;
    }
  }
  for (const fact of response.scene_facts || []) {
    if (fact.impact !== 'continuity_relevant_detail') continue;
    const duplicate = state.scene_established_facts.some(
      (stored) =>
        stored.fact === fact.fact &&
        stored.subject_id === (fact.subject_id || undefined) &&
        stored.location_id === (fact.location_id || undefined),
    );
    if (!duplicate) {
      state.scene_established_facts.push({
        id: crypto.randomUUID(),
        turn_id: crypto.randomUUID(),
        subject_id: fact.subject_id || undefined,
        location_id: fact.location_id || undefined,
        fact: fact.fact,
        source: fact.source,
        certainty: fact.certainty,
      });
    }
  }
  state.scene_established_facts = state.scene_established_facts.slice(-100);
  for (const memory of response.memory_updates || []) {
    if (!state.case_memory.includes(memory)) state.case_memory.push(memory);
  }
  state.case_memory = state.case_memory.slice(-80);
  state.known_public_timeline.push(
    ...(response.timeline_notes || []).map(naturalizeCaseNote),
  );
  state.player_established.push(...(response.player_established || []));
  state.case_status = response.case_complete_candidate
    ? 'complete'
    : state.case_status;
  if (response.case_complete_candidate || response.final_judgement) {
    state.final_deduction_state = {
      submitted: true,
      judgement: response.final_judgement,
    };
  }
  state.api_usage.input_tokens += usage.input_tokens || 0;
  state.api_usage.output_tokens += usage.output_tokens || 0;
}

export async function submitMessage(
  caseId: string,
  userText: string,
  mode: InputMode = 'play',
) {
  const selectedCase = await getCase(caseId);
  const message = normalizePlayerInput(userText);
  if (!message) {
    throw new Error('message is required');
  }
  const effectiveMode = mode;

  const state = await loadState(selectedCase);
  const action = parseInvestigationAction(message, {
    currentInterviewNpcId: state.current_interview,
    currentLocationId: state.current_location,
    interactionMode: state.current_interview ? 'individual_interview' : 'scene',
    gatheredNpcIds: [],
    acquiredInformationIds: state.acquired_information,
    presentedEvidenceIds: state.presented_evidence.map(
      (item) => item.evidence_id,
    ),
    caseStatus: state.case_status === 'complete' ? 'completed' : 'playing',
    knownNpcs: selectedCase.npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
    })),
    knownLocations: selectedCase.locations.map((location) => ({
      id: location.id,
      name: location.name,
    })),
    // Cards supply only labels for target recognition; visibility remains governed by Master.
    visibleObjectLabels: selectedCase.cards.flatMap((card) =>
      [card.title, card.source].filter((label) => label.length <= 24),
    ),
    availableRecordLabels: ['보관기록', '통화기록', '출입기록', 'CCTV', '영상'],
  });
  const responseContract = responseScopeContract(action);
  pushDialogue(state, {
    role: 'user',
    content: message,
    mode: effectiveMode,
  });

  if (effectiveMode === 'meta') {
    let metaMessage =
      'GM 모드 응답에 실패했습니다. 사건 진행 상태는 변경하지 않았습니다.';
    let usage = { input_tokens: 0, output_tokens: 0, regeneration_count: 0 };

    try {
      const result = await callMetaOpenAI(
        buildMetaContext(selectedCase, state, message),
      );
      metaMessage = result.message;
      usage = result.usage;
    } catch {
      metaMessage =
        'GM 모드 응답에 실패했습니다. 사건 진행 상태는 변경하지 않았습니다.';
    }

    state.api_usage.input_tokens += usage.input_tokens || 0;
    state.api_usage.output_tokens += usage.output_tokens || 0;
    pushDialogue(state, {
      role: 'assistant',
      content: metaMessage,
      mode: 'meta',
    });
    await saveState(state);

    return {
      gm: null,
      validation_errors: [],
      ...(await stateView(caseId, state)),
    };
  }

  const isCaseCloseRequest = effectiveMode === 'case_close';
  // Early build: force isComplete so any case-close request succeeds
  // regardless of what the deduction actually says. Drop the
  // `isComplete: true` override once submitting a real culprit/method/
  // motive should be required to close a case.
  const finalDeduction = isCaseCloseRequest
    ? { ...validateFinalDeduction(selectedCase, message), isComplete: true }
    : { isComplete: false, missing: [] };

  if (isCaseCloseRequest && !finalDeduction.isComplete) {
    const missingText = finalDeduction.missing.length
      ? finalDeduction.missing.join(', ')
      : '책임자, 수법, 동기, 결정적 근거';
    const gmResponse = {
      ...emptyNarrativeFor(state),
      message: `아직 전말을 열지 않는다. 사건을 종결하려면 네 추리로 ${missingText}를 직접 연결해 제출해야 한다.`,
    };

    pushDialogue(state, {
      role: 'assistant',
      content: gmResponse.message,
    });
    await saveState(state);

    return {
      gm: gmResponse,
      validation_errors: [],
      ...(await stateView(caseId, state)),
    };
  }

  let gmResponse: GmResponse;
  let usage = { input_tokens: 0, output_tokens: 0, regeneration_count: 0 };
  let errors: string[] = [];
  let validationViolations: ResponseViolation[] = [];
  let regenerationAttempted = false;
  let regenerationSucceeded = false;
  const hasConversationTarget = Boolean(
    conversationTarget(selectedCase, state, message),
  );
  const context = buildContext(
    selectedCase,
    state,
    message,
    action,
    responseContract,
    isCaseCloseRequest && finalDeduction.isComplete,
  );

  try {
    const result = await callOpenAI(
      context,
      isCaseCloseRequest ? caseClosingPrompt() : '',
    );
    const validated = validateGmResponse(selectedCase, state, result.gm);
    gmResponse = validated.gm;
    usage = result.usage;
    errors = validated.errors;
    validationViolations = validateDraftResponse(
      message,
      gmResponse.message,
      action,
      responseContract,
      gmResponse.jiwoo_line,
      hasConversationTarget,
    ).filter((violation) => violation.severity === 'retry');
    if (validationViolations.length) {
      regenerationAttempted = true;
      const repair = await callOpenAI(
        context,
        responseRepairPrompt(validationViolations, responseContract),
      );
      const repaired = validateGmResponse(selectedCase, state, repair.gm);
      gmResponse = repaired.gm;
      regenerationSucceeded = !validateDraftResponse(
        message,
        gmResponse.message,
        action,
        responseContract,
        gmResponse.jiwoo_line,
        hasConversationTarget,
      ).some((violation) => violation.severity === 'retry');
      usage = {
        input_tokens: usage.input_tokens + repair.usage.input_tokens,
        output_tokens: usage.output_tokens + repair.usage.output_tokens,
        regeneration_count: 1,
      };
      errors.push(...repaired.errors);
      if (!regenerationSucceeded) {
        gmResponse = emptyNarrativeFor(state);
      }
    }
  } catch (error) {
    console.warn(
      `[openai] Falling back to local GM: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
    gmResponse = mockGm(context);
    usage = { input_tokens: 0, output_tokens: 0, regeneration_count: 1 };
    errors = [];
  }

  const shouldLimitNarrowCustodyResponse =
    selectedCase.case_id === 'CASE007' &&
    conversationTarget(selectedCase, state, message)?.name === '김정환' &&
    isNarrowCoatCustodyQuestion(message) &&
    hasChainedCustodyDisclosure(gmResponse.message);
  const mustPreserveMovementOnly =
    responseContract.forbiddenOperations.includes('search') &&
    responseContract.forbiddenOperations.includes('open');
  const mustPreserveSummonOnly =
    isNpcSummonAction(message) && !isConversationQuestion(message);
  const isSourceChallenge = action.actions.includes('source_challenge');
  const isSocialBanter = action.socialIntent !== 'none';
  const explicitlyChangesInterview = selectedCase.npcs.some(
    (npc) => npc.id !== state.current_interview && message.includes(npc.name),
  );
  const mustKeepCurrentInterview =
    Boolean(state.current_interview) &&
    action.actions.includes('conversation') &&
    !action.explicitGroupQuestion &&
    !explicitlyChangesInterview;
  const jiwooEmotionalMoment = isEmotionalTestimonyMoment(gmResponse);
  const jiwooContradictionUnlock = justUnlockedContradiction(gmResponse);
  // Evidence presentation + an NPC statement-stage advance happens on a
  // large share of turns, so always forcing Jiwoo in on that trigger made
  // her feel scheduled rather than reactive. Once it's fired 3 times in
  // the recent window, let the cooldown apply normally instead.
  const contradictionTriggerRepeated =
    state.jiwoo_trigger_log
      .slice(-3)
      .filter((trigger) => trigger === 'contradiction_unlock').length >= 3;
  const jiwooForced =
    jiwooEmotionalMoment ||
    (jiwooContradictionUnlock && !contradictionTriggerRepeated);
  const jiwooOnCooldown =
    !jiwooForced &&
    playerTurnsSinceLastJiwoo(state.recent_conversation) < JIWOO_COOLDOWN_TURNS;

  gmResponse = {
    ...gmResponse,
    scene:
      isSourceChallenge || isSocialBanter
        ? {
            location_id: state.current_location,
            interview_character_id: state.current_interview,
          }
        : mustKeepCurrentInterview
          ? {
              ...gmResponse.scene,
              interview_character_id: state.current_interview,
            }
          : gmResponse.scene,
    message: sanitizeGmMessage(
      selectedCase,
      state,
      message,
      gmResponse.message,
    ),
    acquire:
      mustPreserveMovementOnly || isSourceChallenge || isSocialBanter
        ? []
        : Array.from(
            new Set([
              ...gmResponse.acquire,
              ...inferAcquiredCards(selectedCase, state, message, gmResponse),
            ]),
          ),
    presented_evidence:
      mustPreserveMovementOnly || isSourceChallenge || isSocialBanter
        ? []
        : gmResponse.presented_evidence,
    npc_updates:
      mustPreserveMovementOnly ||
      isSourceChallenge ||
      isSocialBanter ||
      !responseContract.mayAdvanceNpcStatementStage
        ? []
        : gmResponse.npc_updates,
    timeline_notes:
      shouldLimitNarrowCustodyResponse ||
      mustPreserveMovementOnly ||
      mustPreserveSummonOnly ||
      isSourceChallenge ||
      isSocialBanter ||
      !responseContract.mayAddExactTimeline
        ? []
        : (gmResponse.timeline_notes || []).map(naturalizeCaseNote),
    player_established:
      shouldLimitNarrowCustodyResponse ||
      mustPreserveMovementOnly ||
      mustPreserveSummonOnly ||
      isSourceChallenge ||
      isSocialBanter ||
      !responseContract.mayAddExactTimeline
        ? []
        : (gmResponse.player_established || []).map(naturalizeCaseNote),
    case_complete_candidate:
      (isCaseCloseRequest && finalDeduction.isComplete) ||
      (responseContract.mayReachConclusion &&
        gmResponse.case_complete_candidate),
    final_judgement:
      isCaseCloseRequest && finalDeduction.isComplete
        ? gmResponse.final_judgement ||
          '탐정의 요청으로 사건을 종결하고 전말과 수사 리뷰를 기록한다.'
        : null,
    detective_line:
      isSourceChallenge || isSocialBanter ? null : gmResponse.detective_line,
    jiwoo_line:
      isSourceChallenge || isSocialBanter || jiwooOnCooldown
        ? null
        : gmResponse.jiwoo_line,
    scene_facts:
      isSourceChallenge || isSocialBanter ? [] : gmResponse.scene_facts,
    memory_updates: isSourceChallenge ? [] : gmResponse.memory_updates,
  };

  const jiwooTriggerThisTurn: JiwooTrigger = !gmResponse.jiwoo_line
    ? 'none'
    : jiwooEmotionalMoment
      ? 'emotional_testimony'
      : jiwooContradictionUnlock
        ? 'contradiction_unlock'
        : 'cooldown_expired';
  state.jiwoo_trigger_log = [
    ...state.jiwoo_trigger_log,
    jiwooTriggerThisTurn,
  ].slice(-10);

  if (
    mustPreserveMovementOnly &&
    hasMovementScopeViolation(gmResponse.message)
  ) {
    gmResponse = emptyNarrativeFor(state);
  }

  if (
    mustPreserveSummonOnly &&
    hasUnaskedTimelineDisclosure(gmResponse.message)
  ) {
    gmResponse = {
      ...gmResponse,
      message: safeSummonedNpcMessage(selectedCase, message),
      acquire: [],
      presented_evidence: [],
      npc_updates: [],
    };
  }

  if (
    isBroadVideoReviewAction(message) &&
    hasPrematureVideoVerdict(gmResponse.message)
  ) {
    gmResponse = emptyNarrativeFor(state);
  }

  if (
    isRecordReviewAction(message) &&
    (hasUnprovedRecordInference(gmResponse.message) ||
      gmResponse.timeline_notes.some(hasUnprovedRecordInference) ||
      gmResponse.player_established.some(hasUnprovedRecordInference))
  ) {
    gmResponse = emptyNarrativeFor(state);
  }

  if (
    !gmResponse.case_complete_candidate &&
    (hasUnsupportedExclusion(gmResponse.message) ||
      gmResponse.timeline_notes.some(hasUnsupportedExclusion) ||
      gmResponse.player_established.some(hasUnsupportedExclusion))
  ) {
    gmResponse = emptyNarrativeFor(state);
  }

  if (errors.includes('call_failed')) {
    gmResponse = {
      ...gmResponse,
      message:
        '한지우가 기록을 다시 훑는다.\n\n“방금 건 기록이랑 안 맞아요. 제가 답을 밀어붙일 문제는 아니고, 행동을 다시 찍어주세요.”',
      scene: {
        location_id: state.current_location,
        interview_character_id: state.current_interview,
      },
      acquire: [],
      presented_evidence: [],
      npc_updates: [],
    };
  }

  applyGmResponse(state, gmResponse, usage, !isGroupInteractionAction(message));
  state.last_action_contract = responseContract;
  state.last_requested_answer_fields = action.requestedFields;
  if (validationViolations.length) {
    state.gm_validation_log.push({
      turn_id: crypto.randomUUID(),
      player_input: message,
      action,
      violations: validationViolations,
      regeneration_attempted: regenerationAttempted,
      regeneration_succeeded: regenerationSucceeded,
    });
    state.gm_validation_log = state.gm_validation_log.slice(-20);
  }
  const detectiveDialogue: Dialogue | null = gmResponse.detective_line
    ? { role: 'detective', content: gmResponse.detective_line }
    : null;
  const jiwooDialogue: Dialogue | null = gmResponse.jiwoo_line
    ? { role: 'jiwoo', content: gmResponse.jiwoo_line }
    : null;
  if (jiwooDialogue && gmResponse.jiwoo_line_position === 'before') {
    pushDialogue(state, jiwooDialogue);
  }
  if (detectiveDialogue && gmResponse.detective_line_position === 'before') {
    pushDialogue(state, detectiveDialogue);
  }
  pushDialogue(state, {
    role: 'assistant',
    content: gmResponse.message,
  });
  if (detectiveDialogue && gmResponse.detective_line_position === 'after') {
    pushDialogue(state, detectiveDialogue);
  }
  if (jiwooDialogue && gmResponse.jiwoo_line_position === 'after') {
    pushDialogue(state, jiwooDialogue);
  }
  await saveState(state);

  return {
    gm: gmResponse,
    validation_errors: errors,
    ...(await stateView(caseId, state)),
  };
}

export async function resetGame(caseId: string) {
  const selectedCase = await getCase(caseId);
  const state = initialState(selectedCase);
  await saveState(state);
  return stateView(caseId, state);
}

// Server-side counterpart to scripts/generate-case.mjs + ingest-case.mjs:
// generates a new CASE9xx master from a one-line seed, validates and
// self-QAs it, then saves it straight into D1 through the same
// uploadCaseMaster() path the Master Upload form uses. Like the CLI
// script, never returns the generated plot text to the caller.
type CaseActionResult = {
  ok: boolean;
  message: string;
  path?: string;
  issues: string[];
};

function generationStageLabel(
  stage: GenerationProgress,
  attempt: number,
  maxAttempts: number,
) {
  switch (stage) {
    case 'drafting':
      return `시도 ${attempt}/${maxAttempts} · 초안 생성 중 (1~3분 소요)`;
    case 'validating':
      return `시도 ${attempt}/${maxAttempts} · 구조 검증 중`;
    case 'qa_reviewing':
      return `시도 ${attempt}/${maxAttempts} · 자체 QA 검토 중`;
    case 'retrying':
      return `시도 ${attempt}/${maxAttempts} · 문제 발견, 재시도 준비 중`;
    default:
      return '진행 중';
  }
}

async function finalizeGenerationJob(
  jobId: string,
  fields: {
    status: 'ok' | 'failed';
    message: string;
    issues: string[];
    casePath?: string;
  },
) {
  await env.DB.prepare(
    `UPDATE generation_jobs
     SET status = ?, stage = ?, message = ?, issues = ?, case_path = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      fields.status,
      fields.status === 'ok' ? '완료' : '실패',
      fields.message,
      JSON.stringify(fields.issues),
      fields.casePath || null,
      new Date().toISOString(),
      jobId,
    )
    .run();
}

// jobId (a client-generated UUID) lets the browser poll getGenerationProgress()
// for live stage updates from a second request while this one is still
// running — D1 writes made here are visible to that concurrent read as
// soon as they commit, so no background/waitUntil execution is needed.
export async function generateCase(
  seed: string,
  jobId?: string,
): Promise<CaseActionResult> {
  const trimmedSeed = seed.trim();
  if (!trimmedSeed) {
    return { ok: false, message: '사건 시드를 입력해 주세요.', issues: [] };
  }

  await ensureSchema();

  const now = new Date().toISOString();
  if (jobId) {
    await env.DB.prepare(
      `INSERT INTO generation_jobs
         (id, status, stage, attempt, max_attempts, message, issues, case_path, created_at, updated_at)
       VALUES (?, 'running', '시작 준비 중', 0, 0, NULL, NULL, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = 'running', stage = '시작 준비 중', attempt = 0, updated_at = excluded.updated_at`,
    )
      .bind(jobId, now, now)
      .run();
  }

  const usedIds = new Set<string>(Object.keys(builtInCases));
  const existing = await env.DB.prepare('SELECT id FROM cases').all<{
    id: string;
  }>();
  for (const row of existing.results || []) usedIds.add(row.id.toUpperCase());

  const onProgress: OnProgress = async (stage, attempt, maxAttempts) => {
    if (!jobId) return;
    await env.DB.prepare(
      `UPDATE generation_jobs
       SET stage = ?, attempt = ?, max_attempts = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        generationStageLabel(stage, attempt, maxAttempts),
        attempt,
        maxAttempts,
        new Date().toISOString(),
        jobId,
      )
      .run();
  };

  let result;
  try {
    result = await generateCaseMaster(trimmedSeed, usedIds, { onProgress });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '사건 생성 중 오류가 발생했습니다.';
    if (jobId) {
      await finalizeGenerationJob(jobId, {
        status: 'failed',
        message,
        issues: [],
      });
    }
    return { ok: false, message, issues: [] };
  }

  if (!result.ok) {
    const message = `${result.caseId} 생성 실패 (${result.attempts}회 시도).`;
    if (jobId) {
      await finalizeGenerationJob(jobId, {
        status: 'failed',
        message,
        issues: result.issues,
      });
    }
    return { ok: false, message, issues: result.issues };
  }

  const envelope = buildGeneratedCaseEnvelope(result.masterText);
  const uploadResult = await uploadCaseMaster(JSON.stringify(envelope));
  if (jobId) {
    await finalizeGenerationJob(jobId, {
      status: uploadResult.ok ? 'ok' : 'failed',
      message: uploadResult.message,
      issues: uploadResult.issues,
      casePath: uploadResult.path,
    });
  }
  return uploadResult;
}

// On-demand history of past generation attempts (success and failure),
// for spotting recurring rejection reasons over time. generation_jobs
// rows are never deleted, so this is already accumulating — this just
// exposes it, read on click rather than shown by default.
export async function listGenerationJobs(limit = 20) {
  await ensureSchema();
  const rows = await env.DB.prepare(
    `SELECT id, status, attempt, max_attempts, message, issues, case_path, created_at
     FROM generation_jobs
     WHERE status != 'running'
     ORDER BY updated_at DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all<{
      id: string;
      status: string;
      attempt: number;
      max_attempts: number;
      message: string | null;
      issues: string | null;
      case_path: string | null;
      created_at: string;
    }>();

  return (rows.results || []).map((row) => ({
    id: row.id,
    status: row.status as 'ok' | 'failed',
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    message: row.message || '',
    issues: row.issues ? (JSON.parse(row.issues) as string[]) : [],
    path: row.case_path || undefined,
    createdAt: row.created_at,
  }));
}

export async function getGenerationProgress(jobId: string) {
  await ensureSchema();
  const row = await env.DB.prepare(
    `SELECT status, stage, attempt, max_attempts, message, issues, case_path
     FROM generation_jobs WHERE id = ?`,
  )
    .bind(jobId)
    .first<{
      status: string;
      stage: string;
      attempt: number;
      max_attempts: number;
      message: string | null;
      issues: string | null;
      case_path: string | null;
    }>();

  if (!row) return null;

  return {
    status: row.status as 'running' | 'ok' | 'failed',
    stage: row.stage,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    message: row.message || '',
    issues: row.issues ? (JSON.parse(row.issues) as string[]) : [],
    path: row.case_path || undefined,
  };
}

export async function uploadCaseMaster(
  jsonText: string,
): Promise<CaseActionResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const txtValidated = parseTxtMaster(jsonText);
    if (!txtValidated.caseData || txtValidated.errors.length) {
      return {
        ok: false,
        message:
          txtValidated.errors.join(' ') ||
          'JSON 또는 지원하는 TXT 마스터 형식으로 업로드해 주세요.',
        issues: txtValidated.errors,
      };
    }

    return saveUploadedCase(txtValidated.caseData, txtValidated.summary);
  }

  const validated = validateUploadedCase(parsed);
  if (!validated.caseData || validated.errors.length) {
    return {
      ok: false,
      message: validated.errors.join(' '),
      issues: validated.errors,
    };
  }

  return saveUploadedCase(validated.caseData, validated.summary);
}

async function saveUploadedCase(
  caseData: CaseData,
  summary = '업로드된 사건',
): Promise<CaseActionResult> {
  await ensureSchema();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO cases (id, title, status_label, summary, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       status_label = excluded.status_label,
       summary = excluded.summary,
       data = excluded.data,
       updated_at = excluded.updated_at`,
  )
    .bind(
      caseData.case_id,
      caseData.title,
      caseData.status_label,
      summary,
      JSON.stringify(caseData),
      now,
      now,
    )
    .run();

  return {
    ok: true,
    message: `${caseData.case_id} 마스터를 저장했습니다.`,
    path: `/case/${caseData.case_id}`,
    issues: [],
  };
}
