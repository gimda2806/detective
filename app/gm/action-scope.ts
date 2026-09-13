export type InvestigationActionScope =
  | 'move'
  | 'observe'
  | 'search'
  | 'open'
  | 'examine'
  | 'compare'
  | 'recover'
  | 'conversation'
  | 'other';

export type InvestigationActionType =
  | InvestigationActionScope
  | 'record_review'
  | 'video_review'
  | 'gather'
  | 'summon'
  | 'present_evidence'
  | 'final_deduction'
  | 'case_close'
  | 'source_challenge'
  | 'meta';

export type RequestedAnswerField =
  | 'yes_no'
  | 'time'
  | 'location'
  | 'person'
  | 'action'
  | 'reason'
  | 'method'
  | 'route'
  | 'duration'
  | 'appearance'
  | 'possession'
  | 'record'
  | 'full_account'
  | 'other';

export type RecordIntent =
  | 'policy_question'
  | 'request_summary'
  | 'request_original'
  | 'request_search'
  | 'request_comparison'
  | 'none';

export type ActionScopeContext = {
  currentInterviewNpcId?: string | null;
  currentLocationId?: string;
  interactionMode: 'scene' | 'individual_interview' | 'group_interview';
  gatheredNpcIds: string[];
  acquiredInformationIds: string[];
  presentedEvidenceIds: string[];
  caseStatus: 'playing' | 'closing' | 'completed';
  knownNpcs: Array<{ id: string; name: string }>;
  knownLocations: Array<{ id: string; name: string }>;
  visibleObjectLabels: string[];
  availableRecordLabels: string[];
};

export type EllipticalTargetType =
  | 'npc'
  | 'location'
  | 'object'
  | 'record'
  | 'event'
  | 'unknown';

export type EllipticalInputResolution = {
  isElliptical: boolean;
  targetType: EllipticalTargetType;
  targetId?: string;
  inferredAction:
    | 'address'
    | 'move'
    | 'observe'
    | 'ask_about'
    | 'review_record'
    | 'clarify'
    | 'none';
  confidence: 'high' | 'medium' | 'low';
  requiresClarification: boolean;
};

export type PlayerSocialIntent =
  | 'banter_reply'
  | 'relationship_correction'
  | 'playful_objection'
  | 'casual_reaction'
  | 'none';

export type ParsedInvestigationAction = {
  normalizedInput: string;
  actions: InvestigationActionType[];
  requestedFields: RequestedAnswerField[];
  explicitGroupQuestion: boolean;
  broadRequest: boolean;
  impliedInspection: boolean;
  exactClosureCommand: boolean;
  recordIntent: RecordIntent;
  elliptical: EllipticalInputResolution;
  socialIntent: PlayerSocialIntent;
};

export type ResponseScopeContract = {
  allowedOperations: InvestigationActionType[];
  forbiddenOperations: InvestigationActionType[];
  mayRevealVisibleOnEntry: boolean;
  mayRevealVisibleAnomalies: boolean;
  mayRevealConcealedContents: boolean;
  mayAdvanceNpcStatementStage: boolean;
  mayAddExactTimeline: boolean;
  mayPresentRecordContents: boolean;
  mayReachConclusion: boolean;
};

export function normalizePlayerInput(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/씨씨티비/gi, 'CCTV')
    .replace(/cctv/gi, 'CCTV')
    .replace(/죠ㅛ/g, '죠');
}

// Words that signal "this is about a record" across recordIntent(),
// resolveEllipticalInput(), requestedAnswerFields(), and
// parseInvestigationAction() — kept as one list so a gap in one place
// doesn't become a gap everywhere else. "단말기"(terminal)/"게시판"(board)
// were missing even though a real GM turn introduced exactly those as
// the way to reach an access record ("출입 기록을 확인할 수 있는
// 단말기와 출입자 명단이 적힌 게시판"); without them, a follow-up
// "단말기 확인" fell through to the generic 'examine' action instead of
// 'record_review', so it never got any of the record-specific handling.
const RECORD_KEYWORD_SOURCE =
  '기록|목록|명단|대장|장부|로그|내역|일정표|메시지|이메일|단말기|게시판';

export function recordIntent(value: string): RecordIntent {
  if (!new RegExp(`(?:${RECORD_KEYWORD_SOURCE}|원본)`).test(value)) {
    return 'none';
  }
  if (/비교|대조/.test(value)) return 'request_comparison';
  if (/찾아|검색|해당.*찾/.test(value)) return 'request_search';
  if (/보여|열람|펼쳐|원본|목록.*보|대장.*보/.test(value)) {
    return 'request_original';
  }
  if (/기록하|남기|적어|운영|따로s*있/.test(value)) {
    return 'policy_question';
  }
  return 'request_summary';
}

export function isConversationQuestion(value: string) {
  // A real playtest log (CASE021) showed a player pointing out an NPC's own
  // contradiction ("어제 방문을 안하셨다고 하셨잖아요.") get zero quoted reply at
  // all — no punctuation or particle here matched, so isConversationQuestion
  // returned false, hasConversationTarget's MISSING_NPC_DIALOGUE backstop
  // never even ran, and the draft silently narrated body language instead
  // of answering. "-잖아(요)" is Korean's standard way to assert "you said/
  // did X, right?" — a confrontational statement, not phrased as a question
  // mark or particle, that just as much demands a spoken answer.
  return /[?？]|나요|습니까|니\b|지\?|죠\?|맞아|말해|물어|묻|잖아/.test(value);
}

export function isSourceChallenge(value: string) {
  // "어디서 확인" has two opposite senses, and only one is a challenge.
  // "그거 어디서 확인했어?" questions where the GM got its claim; "출입기록은
  // 어디서 확인할 수 있나요?" asks an NPC where a record lives — an ordinary,
  // useful investigative question. A real playtest log (CASE072) showed the
  // second one classified as a source challenge, which blanks the scene and
  // answers with the "무슨 뜻으로 물으신 건가요?" clarification line; the player
  // had to rephrase to get a plain answer. The potential form (할 수 있/하실
  // 수/가능) is what separates them.
  return /(?:어떻게|어케)\s*알|어디서\s*(?:확인|알)(?!\s*(?:할\s*수|할수|하실\s*수|가능))|누가\s*(?:말|그랬)|근거가\s*뭐|아직\s*(?:확인|밝혀)|확실한\s*거야|확인한\s*적\s*있/.test(
    value,
  );
}

export function playerSocialIntent(value: string): PlayerSocialIntent {
  if (
    /(?:내|우리).{0,10}(?:책상|사무실|물건|일).{0,14}(?:네가|지우가).{0,14}(?:관리|정리|치워|찾아|수습)/.test(
      value,
    )
  ) {
    return 'relationship_correction';
  }
  if (/^(?:그게|그건|왜|매일|아니|맞아|그래|그렇지).{0,28}$/.test(value)) {
    return 'banter_reply';
  }
  return 'none';
}

export function resolveEllipticalInput(
  input: string,
  context: ActionScopeContext,
): EllipticalInputResolution {
  const normalized = normalizePlayerInput(input);
  const isShortTarget =
    normalized.length <= 24 &&
    !/[?？]/.test(normalized) &&
    !/(?:가자|가보|이동|들어가|찾아가|수색|열어|확인|조사|살펴|비교|대조|보여|말해|물어|묻)/.test(
      normalized,
    );
  const none: EllipticalInputResolution = {
    isElliptical: false,
    targetType: 'unknown',
    inferredAction: 'none',
    confidence: 'low',
    requiresClarification: false,
  };
  if (!isShortTarget) return none;

  const npc = context.knownNpcs.find((item) => item.name === normalized);
  if (npc) {
    return {
      isElliptical: true,
      targetType: 'npc',
      targetId: npc.id,
      inferredAction: 'address',
      confidence: 'high',
      requiresClarification: false,
    };
  }
  const location = context.knownLocations.find(
    (item) => item.name === normalized,
  );
  if (location) {
    return {
      isElliptical: true,
      targetType: 'location',
      targetId: location.id,
      inferredAction: 'move',
      confidence: 'high',
      requiresClarification: false,
    };
  }
  if (
    new RegExp(`(?:CCTV|영상|카메라|녹화본|${RECORD_KEYWORD_SOURCE})`).test(
      normalized,
    ) ||
    context.availableRecordLabels.includes(normalized)
  ) {
    return {
      isElliptical: true,
      targetType: 'record',
      inferredAction: 'review_record',
      confidence: 'medium',
      requiresClarification: false,
    };
  }
  if (context.visibleObjectLabels.includes(normalized)) {
    return {
      isElliptical: true,
      targetType: 'object',
      inferredAction:
        context.interactionMode === 'individual_interview'
          ? 'ask_about'
          : 'observe',
      confidence: 'medium',
      requiresClarification: false,
    };
  }
  // In play mode, a remaining short noun phrase is most safely treated as a target,
  // never as permission to search, open, compare, or infer its significance.
  if (/^[가-힣A-Za-z0-9 ]{2,24}$/.test(normalized)) {
    return {
      isElliptical: true,
      targetType: 'object',
      inferredAction:
        context.interactionMode === 'individual_interview'
          ? 'ask_about'
          : 'observe',
      confidence: 'low',
      requiresClarification: false,
    };
  }
  return none;
}

export function requestedAnswerFields(value: string): RequestedAnswerField[] {
  const result: RequestedAnswerField[] = [];
  if (/언제|몇\s*시|시각|시간/.test(value)) result.push('time');
  if (/어디|장소|어느\s*쪽/.test(value)) result.push('location');
  if (/누가|누구/.test(value)) result.push('person');
  if (/무엇을|뭘|무슨\s*일|했(?:나요|습니까|죠)/.test(value))
    result.push('action');
  if (/왜|이유/.test(value)) result.push('reason');
  if (/어떻게|방법|수법/.test(value)) result.push('method');
  if (/동선|경로|그\s*후|그\s*다음|이후|어디서.*어디/.test(value))
    result.push('route');
  if (/얼마나|몇\s*분|기간/.test(value)) result.push('duration');
  if (/복장|옷|들고|소지|가지고/.test(value)) result.push('appearance');
  if (/복사본|소지|가지고/.test(value)) result.push('possession');
  if (new RegExp(RECORD_KEYWORD_SOURCE).test(value)) {
    result.push('record');
  }
  // 'route'/'full_account' feed mayAddExactTimeline below (unlike
  // person/reason/method/duration/appearance/possession, which are
  // diagnostic-log-only) — a narrow pattern here doesn't just miscategorize
  // for logging, it can incorrectly block a legitimate timestamp and fire
  // UNASKED_FIELD_DISCLOSURE on an answer the player actually asked for.
  if (
    /하루|전부|전체|처음부터|차례로|각자.*말|쭉\s*(?:말|얘기)/.test(value) ||
    // A real production failure (CASE008) showed "발견 당시 상황을 말해달라"
    // (and every rephrasing of it) getting blocked: an honest recount of
    // discovering a body almost always states when it happened — Master's
    // own witness claim IS "오늘 아침 7시에 ... 발견했다" — but the player's
    // wording never says "언제"/"몇 시" outright, so 'time' never got
    // added and the exact time in the truthful answer tripped
    // UNASKED_FIELD_DISCLOSURE every single retry. "그 순간/당시의 상황"
    // is asking for the whole scene, not narrowly withholding the time.
    /(?:당시|그\s*때|발견(?:했을\s*때|한|하고)|목격(?:했을\s*때|한)).{0,14}(?:상황|분위기|모습|장면)/.test(
      value,
    ) ||
    // Same failure, different wording. A real playtest log (CASE023) showed
    // "어제 오늘 이상한점은 없었나요" — about as ordinary as an investigation
    // question gets — blocked on both repairs and answered with the clarify
    // fallback ("죄송해요, 방금 그건 어떤 뜻으로 물으신 건가요?"). Master's own
    // answer for that NPC is a timed observation ("어젯밤 22:30경 … 작업실
    // 조명이 켜져 있었다"), so the honest reply always carries a clock time,
    // and the player's wording never says 언제/몇 시. Asking what was off is
    // asking for the account, time included.
    /(?:이상한|특이한|수상한|평소와\s*다른|눈에\s*띈|달랐던).{0,10}(?:점|것|거|일|게)/.test(
      value,
    )
  ) {
    result.push('full_account');
  }
  if (!result.length && isConversationQuestion(value)) result.push('yes_no');
  return result;
}

export function isDetectiveMovementCommand(value: string) {
  return /(?:가\s*보자|가자|이동하자|들어가자|향하자|찾아가자|가볼까|가보죠)\s*[.!?？]*$/.test(
    value.trim(),
  );
}

export function isNpcMovementQuestion(value: string) {
  return /(?:가셨|갔|들어가셨|들어갔|향했|찾아가셨|찾아갔).*(?:나요|습니까|죠|맞습니까|[?？])/.test(
    value,
  );
}

export function isGatherOnlyAction(value: string) {
  return (
    /(?:관계자|사람들|모두|전원).{0,30}(?:모으|불러|모여)/.test(value) &&
    !isExplicitGroupQuestion(value)
  );
}

export function isExplicitRoundRobinQuestion(value: string) {
  return (
    isExplicitGroupQuestion(value) && requestedAnswerFields(value).length > 0
  );
}

export function parseInvestigationAction(
  input: string,
  context: ActionScopeContext,
): ParsedInvestigationAction {
  const normalizedInput = normalizePlayerInput(input);
  const fields = requestedAnswerFields(normalizedInput);
  const requestedRecordIntent = recordIntent(normalizedInput);
  const elliptical = resolveEllipticalInput(normalizedInput, context);
  const socialIntent = playerSocialIntent(normalizedInput);
  // Closing is deliberately available only through the confirmed UI control.
  const exactClosureCommand = false;
  const actions = new Set<InvestigationActionType>();
  const individualQuestion =
    context.interactionMode === 'individual_interview' &&
    isConversationQuestion(normalizedInput) &&
    !isDetectiveMovementCommand(normalizedInput);

  if (socialIntent !== 'none') {
    actions.add('other');
  } else if (isSourceChallenge(normalizedInput)) {
    actions.add('source_challenge');
  } else if (elliptical.isElliptical) {
    if (elliptical.inferredAction === 'move') actions.add('move');
    if (elliptical.inferredAction === 'address') actions.add('conversation');
    if (elliptical.inferredAction === 'ask_about') actions.add('conversation');
    if (elliptical.inferredAction === 'observe') actions.add('observe');
    if (elliptical.inferredAction === 'review_record') {
      actions.add(
        /(?:CCTV|영상|카메라|녹화본)/.test(normalizedInput)
          ? 'video_review'
          : 'record_review',
      );
    }
  } else if (individualQuestion || isNpcMovementQuestion(normalizedInput)) {
    actions.add('conversation');
  } else {
    if (
      isDetectiveMovementCommand(normalizedInput) ||
      /(?:가서|이동해|들어가)/.test(normalizedInput)
    ) {
      actions.add('move');
    }
    if (
      /(?:CCTV|영상|카메라|녹화본|감시영상|블랙박스|저장영상)/.test(
        normalizedInput,
      )
    ) {
      actions.add('video_review');
    }
    if (
      new RegExp(`(?:${RECORD_KEYWORD_SOURCE}|통화기록)`).test(normalizedInput)
    ) {
      actions.add('record_review');
    }
    if (/모으|불러|모여/.test(normalizedInput)) {
      actions.add(
        isGatherOnlyAction(normalizedInput) ? 'gather' : 'conversation',
      );
    }
    if (isNpcSummonAction(normalizedInput)) actions.add('summon');
    if (/제시|보여\s*주|들이밀/.test(normalizedInput))
      actions.add('present_evidence');
    if (/수색|뒤져|찾아보|전부\s*확인|하나씩\s*확인/.test(normalizedInput))
      actions.add('search');
    if (/열어|개봉|풀어|꺼내/.test(normalizedInput)) actions.add('open');
    if (/정밀|자세히\s*보|검사|분석|확인|조사|살펴/.test(normalizedInput))
      actions.add('examine');
    if (/비교|대조|맞춰|대비/.test(normalizedInput)) actions.add('compare');
    if (/회수|확보|챙겨|가져가|보관하/.test(normalizedInput))
      actions.add('recover');
    if (/둘러보|관찰|훑어보/.test(normalizedInput)) actions.add('observe');
    if (isConversationQuestion(normalizedInput)) actions.add('conversation');
  }

  if (!actions.size) actions.add('other');
  return {
    normalizedInput,
    actions: [...actions],
    requestedFields: fields,
    explicitGroupQuestion:
      context.interactionMode !== 'individual_interview' &&
      isExplicitRoundRobinQuestion(normalizedInput),
    // record_review에는 한동안 "이 요청이 충분히 구체적인가"라는 별도 broad
    // 판정이 있었다 — 처음엔 "보여/열람/원본/목록/대장" 동사만 구체적으로
    // 쳐줘서 정작 isRecordReviewAction 자체의 트리거 동사인 "확인"/"볼"조차
    // 늘 broad로 떨어지는 버그가 있었고(실플레이 로그 CASE021), 그걸 고친
    // 뒤에도 사용자가 지적한 대로 근본적인 설계가 잘못돼 있었다: "그 기록이
    // 있나요?" 같은 존재 여부 질문 자체가 이미 "보여달라"는 뜻인데, 굳이
    // 존재 확인과 열람을 별개 턴으로 강제할 이유가 없다. 그래서 record_review
    // 쪽 broad 판정은 아예 없앴다 — 플레이어가 그 기록을 언급하며 뭔가
    // 물었다는 것 자체가 이미 구체적 요청이다. CCTV/영상은 그대로 둔다:
    // 채널·시간대를 먼저 골라야 하는 게 실제 CCTV 조사 흐름과 맞아서
    // 두 단계가 자연스럽다.
    broadRequest: isBroadVideoReviewAction(normalizedInput),
    impliedInspection: actions.has('examine') || actions.has('search'),
    exactClosureCommand,
    recordIntent: requestedRecordIntent,
    elliptical,
    socialIntent,
  };
}

export function responseScopeContract(
  action: ParsedInvestigationAction,
): ResponseScopeContract {
  if (action.actions.includes('source_challenge')) {
    return {
      allowedOperations: ['source_challenge'],
      forbiddenOperations: [
        'move',
        'observe',
        'search',
        'open',
        'examine',
        'compare',
        'recover',
        'record_review',
        'video_review',
        'gather',
        'summon',
        'present_evidence',
      ],
      mayRevealVisibleOnEntry: false,
      mayRevealVisibleAnomalies: false,
      mayRevealConcealedContents: false,
      mayAdvanceNpcStatementStage: false,
      mayAddExactTimeline: false,
      mayPresentRecordContents: false,
      mayReachConclusion: false,
    };
  }
  const isMoveOnly =
    action.actions.includes('move') &&
    !action.actions.some((item) =>
      ['observe', 'search', 'open', 'examine', 'compare', 'recover'].includes(
        item,
      ),
    );
  if (isMoveOnly) {
    return {
      allowedOperations: ['move', 'observe'],
      forbiddenOperations: ['search', 'open', 'examine', 'compare', 'recover'],
      mayRevealVisibleOnEntry: true,
      mayRevealVisibleAnomalies: true,
      mayRevealConcealedContents: false,
      mayAdvanceNpcStatementStage: false,
      mayAddExactTimeline: false,
      mayPresentRecordContents: false,
      mayReachConclusion: false,
    };
  }

  return {
    allowedOperations: action.actions,
    forbiddenOperations: [],
    mayRevealVisibleOnEntry: true,
    mayRevealVisibleAnomalies: action.actions.includes('observe'),
    mayRevealConcealedContents: action.actions.some((item) =>
      ['search', 'open', 'examine'].includes(item),
    ),
    mayAdvanceNpcStatementStage: action.actions.includes('present_evidence'),
    // 'record' belongs here too, not just mayPresentRecordContents: a
    // record-review request that never says "시간"/"언제" (e.g. "출입 기록
    // 확인해줘") still gets classified as 'record' by requestedAnswerFields,
    // and mayAddExactTimeline gates more than the UNASKED_FIELD_DISCLOSURE
    // check in response-signals.ts — it also decides whether this turn's
    // timeline_notes/player_established survive at all (see the
    // !responseContract.mayAddExactTimeline zeroing in submitMessage).
    // Without 'record' here, a legitimate record-derived timestamp would
    // stop getting flagged as a violation but its timeline_notes/
    // player_established would still be silently discarded.
    mayAddExactTimeline: action.requestedFields.some((field) =>
      ['time', 'route', 'full_account', 'record'].includes(field),
    ),
    mayPresentRecordContents: action.recordIntent === 'request_original',
    mayReachConclusion: action.actions.includes('case_close'),
  };
}

export function isSituationalQuestion(value: string) {
  return /무슨\s*일|무슨\s*사고|어떻게\s*(?:된|된 거)|무슨\s*상황/.test(value);
}

export function isExplicitGroupQuestion(value: string) {
  return /(?:각자|모두|전원|한\s*명씩|차례로|차례대로|각각).{0,48}(?:말씀|말해|답|대답|이야기|알려|보았|봤)|(?:마지막으로\s*본|언제|어디서|시각|장소).{0,48}(?:각자|모두|전원|한\s*명씩|차례로|차례대로|각각)/.test(
    value,
  );
}

export function isGroupInteractionAction(value: string) {
  return /(?:관계자|사람들|모두|전원|각자|다\s*같이|한\s*명씩|차례로|차례대로).{0,48}(?:모으|불러|모여|모였|말씀|말해|답|대답|이야기)|(?:모으|불러).{0,48}(?:관계자|사람들|모두|전원|각자)/.test(
    value,
  );
}

export function isNpcSummonAction(value: string) {
  return /(?:을|를)?\s*(?:부르|불러|불러오|데려오|오라고|오게\s*하)/.test(
    value,
  );
}

// Matches an exact clock time in either Korean word format ("22시 40분")
// or colon format ("22:40") — draft-response leak checks below need
// both, since the model (and Master content) writes either style
// interchangeably. A real playtest leak used the colon form ("22:40경")
// and slipped past checks that only recognized the Korean-word form.
const EXACT_TIME_SOURCE = String.raw`(?:\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?|\d{1,2}\s*:\s*\d{2})`;

export function hasExactTimeMention(value: string) {
  return new RegExp(EXACT_TIME_SOURCE).test(value);
}

export function hasUnaskedTimelineDisclosure(value: string) {
  return new RegExp(
    `(?:${EXACT_TIME_SOURCE}|오후|오전).{0,80}(?:봤|보았|떠났|이동|만났|있었|들고)|(?:봤|보았|떠났|이동|만났|있었|들고).{0,80}(?:${EXACT_TIME_SOURCE}|오후|오전)`,
  ).test(value);
}

export function investigationActionScope(
  value: string,
): InvestigationActionScope {
  if (/비교|대조|맞춰|대비/.test(value)) return 'compare';
  if (/회수|확보|챙겨|가져가|보관하/.test(value)) return 'recover';
  if (/열어|개봉|풀어|꺼내/.test(value)) return 'open';
  if (/수색|뒤져|찾아보|전부\s*확인|하나씩\s*확인/.test(value)) return 'search';
  if (/정밀|자세히\s*보|검사|분석|확인|조사|살펴/.test(value)) {
    return 'examine';
  }
  if (/둘러보|관찰|훑어보/.test(value)) return 'observe';
  if (/가보|가자|이동|들어가|향하|찾아가|도착/.test(value)) return 'move';
  if (isConversationQuestion(value)) return 'conversation';
  return 'other';
}

export function hasMovementScopeViolation(value: string) {
  return /(?:한지우|지우).{0,80}(?:살펴보|확인하|조사하|봐야|보죠)|(?:숨기|비밀|관련\s*흔적|증언).{0,48}(?:있|나오|확인)|(?:열어|열자|열고|개봉|꺼내|발견|찾아냈|찾았다|손을\s*넣|회수|확보).{0,48}(?:대본|물건|증거|봉투|상자|서랍|커버|가방|파일)|(?:대본|증거|봉투|상자|서랍|커버|가방|파일).{0,48}(?:발견|찾아|꺼내|열어|확보|회수)/.test(
    value,
  );
}

export function isRecordReviewAction(value: string) {
  // "볼 수 있을까요"/"보여주실 수 있나요"처럼 정중하게 요청하는 흔한 활용형이
  // 원래 목록의 "보"/"봐"에는 안 걸렸다 — "보다"가 "볼"로 활용되면 음절 자체가
  // 달라지기 때문. 실플레이 로그(CASE021)에서 "카드단말기 기록을 시간별로
  // 볼수있을까요"가 이 때문에 record_review로 분류조차 안 돼서, 원래는 위치
  // 조사 한 번으로 바로 나왔어야 할 출입기록(E02)이 NPC가 지어낸 다단계
  // 행정 절차(로비 데스크 승인, 시간대 범위 지정 등)로 둔갑해 여러 턴을
  // 낭비했다.
  return /(?:통화|출입|반입|보관|CCTV|영상|기록).{0,18}(?:확인|보|봐|볼|보여주|열람|조회|대조|살펴)/.test(
    value,
  );
}

export function isBroadVideoReviewAction(value: string) {
  // isRecordReviewAction과 같은 결함: "보"/"봐"만 있고 "보다"의 활용형인
  // "볼"("CCTV 볼 수 있을까요")이 빠져 있었다 — 다른 음절이라 매칭 안 됨.
  return (
    /(?:CCTV|영상|카메라).{0,18}(?:보|봐|볼|보여주|열람|확인|틀|재생)/.test(
      value,
    ) &&
    !new RegExp(
      `${EXACT_TIME_SOURCE}|몇\\s*시|시간대|구간|카메라\\s*[0-9]|객석|복도|통로`,
    ).test(value)
  );
}

export function hasPrematureVideoVerdict(value: string) {
  return new RegExp(
    `(?:${EXACT_TIME_SOURCE}|원본|메타데이터|조작).{0,80}(?:확실|확인|식별|진짜|안전|조작\\s*(?:아니|어렵))|(?:확실|확인|식별|진짜|안전|조작\\s*(?:아니|어렵)).{0,80}(?:${EXACT_TIME_SOURCE}|원본|메타데이터|조작)`,
  ).test(value);
}
