export function hasSpoilerSignal(value: string) {
  return /의혹|의심|가능성|독성|용액|조작|규정\s*위반|숨기|은폐|위조|거짓|비밀|상속|갈등|다툼|언쟁|범인|실행자|동기|수법|정답|약물|독\b/.test(
    value,
  );
}

export function hasDecisiveSignal(value: string) {
  return /가능성을\s*(?:낮|높)|확정|증명|반증|독살|살해\s*수단|범행\s*수단|결정적|범인|진범|실행자|동기|수법|정답/.test(
    value,
  );
}

export function hasUnprovedRecordInference(value: string) {
  return /독성|용액|스프레이|조작|확보|독살|범행|수법|가능성이\s*있|가능성을\s*(?:낮|높)/.test(
    value,
  );
}

// Narrowed after two observed false positives on ordinary NPC-introduction
// text: the third alternation used to include "정상"/"확인"/"결정적"/
// "확정적"/"충분" — words common enough in mundane sentences ("정상적으로
//근무 중" + "확인" appearing anywhere within 12 characters) that a first
// NPC interview's opening reaction could trip it with no exclusion
// language at all. Kept only the words that are actually exculpatory on
// their own (안전/무해/무관/결백/관련 없/문제 없), and only when they're the
// sentence's own predicate, not just nearby.
export function hasUnsupportedExclusion(value: string) {
  return /(?:의심|용의선|가능성|가설|수법|동선|경로|물건|사람|인물).{0,24}(?:벗어나|제외|배제|지워|낮춰|접어|없애)|(?:제외|배제|무시|안심|의심하지).{0,18}(?:해도|할 수|좋겠)|(?:안전|무해|무관|결백|관련\s*없|문제\s*없).{0,10}(?:이다|입니다|로\s*보인다|고\s*판단)|이쪽은\s*의심에서\s*벗어나/.test(
    value,
  );
}

// A single response claiming "직접 목격/확인했다" (personally witnessed)
// while citing CCTV/영상/기록 as the actual basis is self-contradictory —
// not a player-found crack, but the model inventing and immediately
// undercutting its own claim in the same breath (a real playtest log
// showed exactly this: "직접 본 적 있습니다... CCTV로 확인했어요", and later
// "CCTV를 통해 직접 확인했습니다"). Only matches an affirmative direct-
// witness ending (본 적 있/봤/목격했/확인했 등) — a negated one ("본 적은
// 없습니다", "마주치지 않았다") never matches these endings at all, so a
// legitimate "직접 만나진 않았지만 CCTV로 봤다" answer is not flagged.
export function hasDirectWitnessSourceMismatch(value: string) {
  const positiveDirectClaim =
    /직접\s*(?:본\s*적\s*있|봤|보았|목격했|목격한|마주쳤|마주친\s*적\s*있|확인했)/.test(
      value,
    );
  const citesIndirectSource =
    /CCTV|영상|카메라|녹화|기록(?:으로|을\s*통해)/.test(value);
  return positiveDirectClaim && citesIndirectSource;
}

export function isSealComparisonAction(value: string) {
  return /(?:병\s*고리|밀봉\s*띠|뚜껑).{0,30}(?:대조|비교|맞춰|확인)|(?:대조|비교|맞춰|확인).{0,30}(?:병\s*고리|밀봉\s*띠|뚜껑)/.test(
    value,
  );
}

// A player pointing out a mismatch they found themselves (two times,
// numbers, or statements that don't line up) is the actual payoff of a
// free-investigation mystery — a real crack in the story they noticed on
// their own. Papering over it kills that moment. Two distinct exact times
// in one message plus a "but/you said" word ("08:15이었는데 왜
// 08:20이라고 하셨죠?") catches a bare-numbers callout that no keyword
// alone would.
export function isContradictionChallenge(value: string) {
  if (
    /모순|이상하지\s*않|말이\s*안\s*되|앞뒤가\s*안\s*맞|안\s*맞는데|맞지\s*않는데|어긋나/.test(
      value,
    )
  ) {
    return true;
  }
  const times =
    value.match(/\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?/g) || [];
  const uniqueTimes = new Set(times.map((time) => time.replace(/\s/g, '')));
  return (
    uniqueTimes.size >= 2 &&
    /왜|근데|그런데|아까는|다르|잖아요|라면서|라고\s*하셨|말씀하셨/.test(value)
  );
}

// A fabricated on-the-spot excuse for a contradiction — "that's possible
// with newer equipment," "there can be a margin of error" — invents a
// technical justification that (unlike an NPC's own Master-defined
// knowledge) doesn't come from anywhere in the case. See
// isContradictionChallenge: this is what should never follow it.
export function hasFabricatedTechnicalExcuse(value: string) {
  return /(?:최신|특수|고급|신형|예외적|드물게|간혹|가끔|해당\s*모델).{0,16}(?:가능|있을\s*수|그럴\s*수|때문)|(?:오차|지연|오류|버퍼|캐시|설정값|시스템\s*특성).{0,16}(?:때문|탓|영향|생길\s*수)/.test(
    value,
  );
}
import {
  hasExactTimeMention,
  isConversationQuestion,
  isRecordReviewAction,
} from './action-scope';
import type {
  ParsedInvestigationAction,
  ResponseScopeContract,
} from './action-scope';

export type ResponseViolationCode =
  | 'ACTION_SCOPE_EXPANSION'
  | 'UNASKED_FIELD_DISCLOSURE'
  | 'UNSUPPORTED_EXCLUSION'
  | 'INTERNAL_TERMINOLOGY_LEAK'
  | 'VIDEO_SCOPE_OVERREACH'
  | 'RECORD_SUMMARY_SUBSTITUTION'
  | 'HIDDEN_FACT_AS_RECALL'
  | 'REDUNDANT_PARTNER_PARAPHRASE'
  | 'MISSING_NPC_DIALOGUE'
  | 'INTERVIEW_TARGET_DRIFT'
  | 'FABRICATED_CONTRADICTION_RESOLUTION'
  | 'DIRECT_WITNESS_SOURCE_MISMATCH'
  | 'REQUIRED_BANTER_MISSING';

export type ResponseViolation = {
  code: ResponseViolationCode;
  severity: 'warning' | 'retry';
  evidence: string[];
  repairInstruction: string;
};

export function hasInternalBoundaryLeak(value: string) {
  return /공개로\s*말할\s*수\s*있는\s*선|공개\s*가능한\s*정보|현재\s*단계에서는|봉인된\s*정보|Master|마스터에\s*없|획득\s*조건|진술\s*단계|지원하지\s*않는\s*섹션|안전\s*응답|내부\s*데이터/i.test(
    value,
  );
}

export function validateDraftResponse(
  playerInput: string,
  draftResponse: string,
  action: ParsedInvestigationAction,
  contract: ResponseScopeContract,
  jiwooLine?: string | null,
  hasConversationTarget = false,
): ResponseViolation[] {
  const violations: ResponseViolation[] = [];
  const visibleResponse = [draftResponse, jiwooLine || ''].join('\n');
  const isRecallQuestion =
    /(?:아까|방금|기억나|기억나지|맞지|그랬지|했었지|였지)/.test(playerInput);
  if (
    isContradictionChallenge(playerInput) &&
    hasFabricatedTechnicalExcuse(visibleResponse)
  ) {
    violations.push({
      code: 'FABRICATED_CONTRADICTION_RESOLUTION',
      severity: 'retry',
      evidence: [
        'The player pointed out a contradiction they found themselves, and the draft explained it away with an invented technical justification not stated anywhere in Master.',
      ],
      repairInstruction:
        'Do not resolve this contradiction with any explanation you invent — remove it entirely. The NPC reacts with visible unease, a vague deflection, hesitation, or silence about it instead. The contradiction stays open and unresolved unless Master itself already states that exact explanation.',
    });
  }
  if (hasDirectWitnessSourceMismatch(visibleResponse)) {
    violations.push({
      code: 'DIRECT_WITNESS_SOURCE_MISMATCH',
      severity: 'retry',
      evidence: [
        'The draft claims the NPC personally/directly witnessed something while citing CCTV, footage, or a record as the actual basis — a contradiction in the same breath, not a real claim.',
      ],
      repairInstruction:
        'Pick one and only one: either the NPC saw this in person (no camera/record mentioned as the source), or they only know it from CCTV/footage/a record (and then they did not personally witness it — say so plainly, e.g. "직접 마주치진 않았지만 CCTV로 확인했어요"). Never claim both in the same answer.',
    });
  }
  if (
    contract.forbiddenOperations.includes('open') &&
    /열어|개봉|꺼내|발견|확보|회수/.test(visibleResponse)
  ) {
    violations.push({
      code: 'ACTION_SCOPE_EXPANSION',
      severity: 'retry',
      evidence: ['The player requested movement only.'],
      repairInstruction:
        'Keep only arrival, immediately visible orientation, and neutral partner banter. Do not search, open, discover, recover, or interpret anything.',
    });
  }
  if (
    !contract.mayAddExactTimeline &&
    // mayPresentRecordContents (recordIntent === 'request_original') is
    // computed independently from mayAddExactTimeline, but the two
    // legitimately overlap: showing an original record the player asked
    // to see necessarily can include whatever timestamp that record
    // contains. Without checking it here too, a genuinely authorized
    // record disclosure could still get flagged as an unasked time leak
    // whenever mayAddExactTimeline itself happened to come out false.
    !contract.mayPresentRecordContents &&
    hasExactTimeMention(visibleResponse) &&
    !hasExactTimeMention(playerInput) &&
    !/언제|시각/.test(playerInput) &&
    // A record-review request ("출입 기록 확인해줘", "통화기록 봐줘") is asking
    // for an exact time in substance even though it never says "언제"/"시각"
    // — an exact timestamp is the entire reason that kind of record exists.
    // Without this, a correct, Master-grounded time straight out of
    // evidence[].content got flagged and retried as an unasked disclosure
    // purely because the player's wording didn't happen to include those
    // two words.
    !isRecordReviewAction(playerInput)
  ) {
    violations.push({
      code: 'UNASKED_FIELD_DISCLOSURE',
      severity: 'retry',
      evidence: ['Exact time was not requested.'],
      repairInstruction:
        'Answer only the requested field. Remove unasked exact times, routes, destinations, and later sightings.',
    });
  }
  if (hasUnsupportedExclusion(visibleResponse)) {
    violations.push({
      code: 'UNSUPPORTED_EXCLUSION',
      severity: 'retry',
      evidence: [
        'The draft declared someone or something clear, safe, unrelated, or fully confirmed without the player having established that.',
      ],
      repairInstruction:
        'Answer the same question with only what is actually known so far. Do not declare anyone or anything clear, safe, unrelated, ruled out, or fully confirmed — leave it open and unresolved. Keep every other fact and the answer to what was actually asked.',
    });
  }
  if (
    isRecallQuestion &&
    /(?:자동\s*재생|예약(?:된|\s*재생)|원격\s*(?:재생|조작)|설정(?:되어|된|값)|시스템\s*(?:재생|설정))/.test(
      visibleResponse,
    )
  ) {
    violations.push({
      code: 'HIDDEN_FACT_AS_RECALL',
      severity: 'retry',
      evidence: [
        'A recall question introduced an uninspected technical cause.',
      ],
      repairInstruction:
        'Answer only the shared sensory memory or already established fact. Do not reveal automatic playback, scheduling, settings, a responsible person, or a record-derived cause unless the current action inspected that source.',
    });
  }
  if (
    jiwooLine &&
    /(?:자동\s*재생|예약(?:된|\s*재생)|원격\s*(?:재생|조작)|설정)/.test(
      draftResponse,
    ) &&
    /(?:자동\s*재생|예약(?:된|\s*재생)|원격\s*(?:재생|조작)|설정)/.test(
      jiwooLine,
    )
  ) {
    violations.push({
      code: 'REDUNDANT_PARTNER_PARAPHRASE',
      severity: 'retry',
      evidence: ['Narration and Han Jiwoo repeated the same technical fact.'],
      repairInstruction:
        'Keep the fact with its visible source once. Let Han Jiwoo add a distinct reaction, limitation, or banter line instead of paraphrasing it.',
    });
  }
  if (hasInternalBoundaryLeak(visibleResponse)) {
    violations.push({
      code: 'INTERNAL_TERMINOLOGY_LEAK',
      severity: 'retry',
      evidence: [
        'Internal disclosure terminology appeared in visible dialogue.',
      ],
      repairInstruction:
        'Remove all internal system terminology. Express any limit only through in-world memory, refusal, or uncertainty.',
    });
  }
  if (
    action.actions.includes('video_review') &&
    action.broadRequest &&
    /(?:원본|메타데이터|조작).{0,50}(?:확실|확인|식별|진짜|안전|아니)|(?:확실|확인|식별|진짜|안전).{0,50}(?:원본|메타데이터|조작)/.test(
      draftResponse,
    )
  ) {
    violations.push({
      code: 'VIDEO_SCOPE_OVERREACH',
      severity: 'retry',
      evidence: [
        'Broad video review jumped to identification or authenticity.',
      ],
      repairInstruction:
        'For broad video review, establish camera coverage and visible limits first. Do not auto-pick a decisive time, identify a hidden object, or certify authenticity.',
    });
  }
  if (
    action.recordIntent === 'request_original' &&
    // The original marker list assumed every "show me the original" target
    // is tabular (a call/access log with rows and columns) — but a GPS
    // backup, a personal notebook, or a raw file is just as much "the
    // original" and never naturally produces those markers. A real
    // playtest log (CASE171) showed a legitimate, escalating request to
    // examine a GPS log backup fail this check on both the draft and the
    // repair, falling all the way to emptyNarrativeFor. Broadened to also
    // accept concrete extracted specifics (coordinates, figures, exact
    // wording in quotes) as evidence that the actual content was shown,
    // not just table-shaped phrasing.
    !/(?:\||기록에는|목록에는|대장에는|항목|열|칸|빈칸|누락|좌표|번호|수치|값|원문|그대로|["“][^"”]{2,}["”])/.test(
      draftResponse,
    )
  ) {
    violations.push({
      code: 'RECORD_SUMMARY_SUBSTITUTION',
      severity: 'retry',
      evidence: ['The player requested the record itself.'],
      repairInstruction:
        'Present the defined portion of the record itself, including labels, surrounding entries, or clearly absent fields when Master supports them. Do not replace inspection with one NPC-extracted fact.',
    });
  }
  if (
    hasConversationTarget &&
    isConversationQuestion(playerInput) &&
    (hasDecisiveSignal(draftResponse) || !/[“"]/.test(draftResponse))
  ) {
    violations.push({
      code: 'MISSING_NPC_DIALOGUE',
      severity: 'retry',
      evidence: [
        hasDecisiveSignal(draftResponse)
          ? 'The drafted response leaked a decisive fact to the interviewed NPC.'
          : 'The player addressed an NPC but the drafted response has no quoted dialogue.',
      ],
      repairInstruction:
        'The player is talking to the NPC currently being interviewed. Give that NPC one short, natural, in-character quoted line answering only what was asked. Do not confirm, deny, or hint at the culprit, method, motive, or any other decisive fact — a limited or evasive answer is fine, but it must be a real spoken line, not narration about being unable to answer.',
    });
  }

  return violations;
}
