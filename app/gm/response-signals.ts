// Narrowed after a real playtest log (CASE009): the detective presented a
// roommate's testimony about an argument to the suspect ("룸메이트의 언쟁
// 목격담을 박지훈에게 제시한다") — a completely ordinary confrontation turn
// that of course ends up naming both NPCs and using the word "언쟁". game.ts's
// sanitizeGmMessage treats "2+ named NPCs + a spoiler-signal word" as a leak
// and discards the entire drafted response for a bare cast-list dump, which
// fired here on totally legitimate dialogue and ate the actual confrontation.
// 의혹/의심/가능성/갈등/다툼/언쟁/숨기 are ordinary mystery-investigation
// vocabulary that shows up in normal, non-spoiler turns constantly — they
// described the act of suspecting or a plain interpersonal conflict, not the
// case's actual hidden mechanism. Kept only words that are specific to the
// solution itself (동기/수법/범인/실행자/정답) or to a concrete concealment
// method (조작/은폐/위조/독성/약물/독/용액/규정 위반/거짓/비밀/상속).
export function hasSpoilerSignal(value: string) {
  return /독성|용액|조작|규정\s*위반|은폐|위조|거짓|비밀|상속|범인|실행자|동기|수법|정답|약물|독\b/.test(
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

// Tone/density rules (OUTPUT_FORMAT_RULES, messageTempoExamples) were the
// only rule category with no code-level enforcement — and this session's
// own pattern is that only rules a retry actually backs get followed
// consistently. This doesn't need to be precise: length alone is a coarse
// proxy for the unsolicited backstory/connective-explanation padding the
// TEMPO BAD REFERENCE example shows, but a coarse retry that sometimes
// fires on a legitimately fine response is a better trade than a rule
// with no enforcement at all. Callers exempt turns that are allowed to
// run long (broad requests, discoveries, explicit group questions).
export function hasExcessiveMessageLength(value: string, threshold = 350) {
  return value.length > threshold;
}

// Master's own evidence descriptions are written in an analytical register
// ("평소에는 단단히 고정되어 있어야 할 잠금쇠가 쉽게 움직여져서" — an "X should be
// Y but is actually Z" framing) because that's how a case document states a
// finding. A real playtest log showed this leaking verbatim into an NPC's
// own quoted line ("...이상하다고 판단했습니다. 또한 레버에도...") with no
// translation into how a person actually talks — the model copied Master's
// wording into dialogue instead of paraphrasing it as spoken Korean. "또한"
// is a written-only connective no one says aloud; "판단/인지/확인했습니다" is
// an analysis-report verb where a person would say "~인 것 같았어요"/"~더라
//고요" instead. Checked only inside quoted dialogue, not the surrounding
// narration, since Master's own analytical register is fine there.
export function hasWrittenRegisterInDialogue(value: string) {
  const quoted = value.match(/["“][^"”]*["”]/g) || [];
  return quoted.some((line) =>
    /또한|그러므로|따라서|이에\s*따라|(?:판단|인지|확인)했습니다(?!\s*\?)/.test(
      line,
    ),
  );
}

// A real playtest log (CASE005) showed an NPC reciting the content of an
// undiscovered evidence item's Master text — not verbatim, but as a close
// paraphrase ("등록번호의 불일치 문제를 지적하며 내일 경매 전에 반드시 확인해야 한다고
// 메모를 남겼습니다" for Master's "감정서 등록번호 불일치를 지적하며 '내일 경매 전 반드시
// 확인'이라 적힌... 메모") — three turns into that NPC's first interview, for
// a location detail_rule the player had not triggered yet. Whole-word
// matching would miss a paraphrase like this almost entirely: Korean verb/
// noun particles (등록번호 vs 등록번호의, 메모가 vs 메모를) change the exact
// string on nearly every word even when the underlying content is
// identical, so this instead measures overlap of overlapping 3-character
// substrings (character n-grams) of the Hangul-only text — a comparison
// that survives particle differences and word-order shuffling because it
// doesn't depend on word boundaries at all. High overlap on a source
// that's long enough to be a real fingerprint (not just a couple of
// generic phrases) is a strong signal the model copied that specific
// content rather than actually waiting for it to be discovered.
export function hasContentOverlap(
  value: string,
  sourceContent: string,
  { gramSize = 3, minGrams = 10, minHits = 6, minRatio = 0.3 } = {},
) {
  const toGrams = (text: string) => {
    const hangulOnly = (text.match(/[가-힣]/g) || []).join('');
    const grams = new Set<string>();
    for (let i = 0; i + gramSize <= hangulOnly.length; i += 1) {
      grams.add(hangulOnly.slice(i, i + gramSize));
    }
    return grams;
  };
  const sourceGrams = toGrams(sourceContent);
  if (sourceGrams.size < minGrams) return false;
  const valueGrams = toGrams(value);
  let hits = 0;
  for (const gram of sourceGrams) {
    if (valueGrams.has(gram)) hits += 1;
  }
  return hits >= minHits && hits / sourceGrams.size >= minRatio;
}

// hasContentOverlap's character-trigram matching is tuned to catch a
// near-verbatim leak, but a real playtest log (CASE023) showed it miss a
// genuine one: the model narrated evidence E01's exact fact (a tampered
// ground wire routed to the amp's chassis) through several sentences of
// original scene-writing — different phrasing, different sentence
// structure, same underlying fact — and the trigram overlap against
// Master's terse one-line content came out to 8-14%, far under the 30%
// floor, so the leak went uncaught and E01 was never added to acquire
// (case-breaking: E01 was required to reach the final confession stage,
// so this playthrough could never finish). Matching on whole content words
// instead of character runs survives that kind of paraphrase, since a
// creatively rewritten scene still needs the same distinctive nouns
// (접지/금속/섀시 in that example) to describe the same fact. Used as an
// additional check alongside hasContentOverlap, not a replacement — the
// trigram check still catches phrase-level copying this one is too coarse
// for.
// hasKeywordOverlap's raw /[가-힣]{2,}/g tokens include pure grammar and
// scene-setting filler — Master's own authored sentences are full of "있다",
// "남아", "문이", "당일", "사고" — and every one of those counts toward the
// hit threshold as heavily as a proper noun. A real playtest log (CASE043)
// showed the cost: E02's result ("사고 당일 오후 13:50경 서지오의 출입카드로
// 장비 보관실 문이 열린 기록이 남아 있다", 12 tokens) matched an arrival
// description of a completely different room on 사고/장비/남아/있다 alone —
// 3 hits out of 12 is exactly the default 0.25 ratio — so the turn was
// rejected as leaking evidence from a room the detective wasn't even in, and
// with no way to comply the whole answer fell to the deterministic fallback.
// Several arrival turns in a row did this, which is what made real play read
// as pasted Master one-liners.
//
// This scores only distinctive tokens: one trailing particle is stripped
// (so "기록이" and "기록" are the same word, which the raw tokenizer treats
// as unrelated strings) and grammatical/temporal filler is dropped outright.
const NON_DISTINCTIVE_TOKENS = new Set([
  '있다', '있고', '있는', '있었', '없다', '없이', '없는', '남아', '남는', '남은',
  '되어', '된다', '되는', '하는', '한다', '했다', '보인', '같다', '같은', '그중',
  '그리고', '것이', '것은', '당일', '오후', '오전', '저녁', '아침', '사고', '그때',
  '이상', '대한', '관련', '처럼', '채로', '않고', '않는', '통해', '따라', '위해',
  '때문', '뒤에', '앞에', '안에', '밖에', '위에', '아래', '사이', '정도', '다시',
  '아직', '이미', '여기', '저기', '거기', '그대로', '자국', '흔적', '모습', '상태',
]);
const TOKEN_PARTICLES = '은는이가을를의에서도와과로만';
const TWO_CHAR_PARTICLES = new Set([
  '으로', '에서', '에게', '까지', '부터', '이나', '라고', '에는', '이라', '으며',
]);
function distinctiveTokens(sourceContent: string, ignore = '') {
  const tokens = sourceContent.match(/[가-힣]{2,}/g) || [];
  // Tokens of the room's own name are not evidence of anything: Master writes
  // "장비 보관실 출입기록을 확인한다" and "…장비 보관실 문이 열린 기록이 남아
  // 있다", so simply BEING in 장비 보관실 and describing it scored two free
  // hits against that room's own evidence. A real playtest log (CASE043)
  // showed a bare "장비 보관실로 이동한다" both trip the leak check and, via
  // the fallback, hand E02 over on arrival without the detective looking at
  // anything.
  const ignored = ignore ? distinctiveTokens(ignore) : null;
  const stems = new Set<string>();
  for (const token of tokens) {
    const stem = tokenStem(token);
    if (stem.length < 2) continue;
    if (NON_DISTINCTIVE_TOKENS.has(stem)) continue;
    if (ignored?.has(stem)) continue;
    stems.add(stem);
  }
  return stems;
}

function tokenStem(token: string) {
  if (token.length >= 4 && TWO_CHAR_PARTICLES.has(token.slice(-2))) {
    return token.slice(0, -2);
  }
  if (token.length >= 3 && TOKEN_PARTICLES.includes(token.slice(-1))) {
    return token.slice(0, -1);
  }
  return token;
}

// The whole per-candidate decision of detectUndiscoveredEvidenceLeak, pulled
// out as a pure function of plain strings. This detector's false positives
// have cost more real play than any other single thing in the runtime — every
// one of them ends the same way, with a repair instruction the model cannot
// satisfy, both attempts burned, and the turn replaced by a Master one-liner —
// and they were being found one playtest log at a time. Keeping the decision
// here, dependency-free, lets scripts/audit-evidence-leak.ts replay it over
// every authored case at once, so a threshold change is measured instead of
// guessed.
export type LocationPublicText = {
  // Never counted as a match: Master repeats the room's name inside both its
  // detail actions and their results, so being in the room scored free hits
  // against the room's own evidence.
  name: string;
  // Free observation results and the public base description — text a
  // faithful answer is allowed, and expected, to be made of.
  observationResults: string[];
  description: string;
};

export type EvidenceLeakCandidate = {
  // The still-undiscovered detail being judged.
  detailResult: string;
  // The room this detail lives in.
  location: LocationPublicText;
  // The room the response actually puts the detective in. An audit over every
  // authored case (scripts/audit-evidence-leak.ts) found this was the single
  // biggest false-positive source: only the CANDIDATE's room text was ever
  // treated as an explanation, so an honest arrival description of room A
  // that happened to share vocabulary with room B's evidence was a violation.
  // CASE043's 메인 클라이밍 월 reads "…설민재의 시그니처 루트가 걸려 있다" and
  // 루트세팅 작업실's E04 reads "설민재의 시그니처 루트 도면 파일이 …" — three
  // shared words out of ten, purely because they are about the same route.
  here: LocationPublicText;
  // Use the loose bar? True only when the detective is standing at this
  // detail's own location AND nothing is already being recorded there this
  // turn — the case where the violation's instruction is the harmless "also
  // record the acquire" rather than "delete that content".
  useLooseBar: boolean;
  // Authored results of evidence this same turn is already recording.
  justAcquiredResults: string[];
};

export function evidenceLeakDetected(
  visibleResponse: string,
  candidate: EvidenceLeakCandidate,
): boolean {
  const locationName = candidate.location.name;
  const explainedByPublicText = [candidate.location, candidate.here].some(
    (room) =>
      room.observationResults.some(
        (result) =>
          hasContentOverlap(visibleResponse, result) ||
          hasDistinctiveKeywordOverlap(visibleResponse, result, {
            minRatio: 0.6,
            ignore: room.name,
          }),
      ) ||
      (Boolean(room.description) &&
        (hasContentOverlap(visibleResponse, room.description) ||
          hasDistinctiveKeywordOverlap(visibleResponse, room.description, {
            minRatio: 0.6,
            ignore: room.name,
          }))),
  );
  if (explainedByPublicText) {
    // "Explained by the room's public text" is right for a broad look that
    // recites only what the room already shows, and wrong for the discovery
    // itself — Master routinely authors a detail as "the observation, plus
    // the finding" ("건조대 뒤편에 마른 잎 뭉치가 놓여 있다" -> "…최근 꺾인
    // 협죽도 잎 뭉치가 발견된다"), so the exemption swallowed the very draft
    // the acquire nudge exists for. An audit over every authored case found
    // 61 details that could never be nudged from their own authored result:
    // if the model narrated the discovery and forgot the acquire, the card
    // was silently lost. So the exemption only holds while the draft stays
    // inside the public text — state the part the detail adds on top of it
    // and it is a discovery again.
    const publicTexts = [candidate.location, candidate.here].flatMap((room) => [
      room.description,
      ...room.observationResults,
    ]);
    const covered = new Set<string>();
    for (const text of publicTexts) {
      for (const stem of distinctiveTokens(text, locationName)) {
        covered.add(stem);
      }
    }
    const residual = [
      ...distinctiveTokens(candidate.detailResult, locationName),
    ].filter((stem) => !covered.has(stem));
    const residualHits = residual.filter((stem) =>
      visibleResponse.includes(stem),
    ).length;
    const statesWhatTheDetailAdds =
      residual.length >= 2 &&
      residualHits >= 2 &&
      residualHits / residual.length >= 0.4;
    if (!statesWhatTheDetailAdds) return false;
  }

  const explainedByJustAcquired = candidate.justAcquiredResults.some(
    (acquiredResult) =>
      hasContentOverlap(acquiredResult, candidate.detailResult, {
        minRatio: 0.2,
      }) ||
      hasDistinctiveKeywordOverlap(acquiredResult, candidate.detailResult, {
        minHits: 2,
        minRatio: 0.3,
        ignore: locationName,
      }),
  );
  if (explainedByJustAcquired) return false;

  return candidate.useLooseBar
    ? hasContentOverlap(visibleResponse, candidate.detailResult, {
        minRatio: 0.2,
      }) ||
        hasKeywordOverlap(visibleResponse, candidate.detailResult, {
          minHits: 2,
          minRatio: 0.15,
        })
    : hasContentOverlap(visibleResponse, candidate.detailResult) ||
        hasDistinctiveKeywordOverlap(visibleResponse, candidate.detailResult, {
          ignore: locationName,
        });
}

// How much of `text`'s own distinctive vocabulary appears in `corpus`. Used to
// ask whether a quoted record body the GM just put on screen exists anywhere in
// Master at all, which a boolean overlap check cannot express.
export function distinctiveCoverage(text: string, corpus: string) {
  const stems = [...distinctiveTokens(text)];
  if (!stems.length) return 1;
  const hits = stems.filter((stem) => corpus.includes(stem)).length;
  return hits / stems.length;
}

export function hasDistinctiveKeywordOverlap(
  value: string,
  sourceContent: string,
  { minHits = 3, minRatio = 0.25, ignore = '' } = {},
) {
  const stems = distinctiveTokens(sourceContent, ignore);
  if (stems.size < minHits) return false;
  let hits = 0;
  for (const stem of stems) {
    if (value.includes(stem)) hits += 1;
  }
  return hits >= minHits && hits / stems.size >= minRatio;
}

export function hasKeywordOverlap(
  value: string,
  sourceContent: string,
  { minHits = 3, minRatio = 0.25 } = {},
) {
  const tokenize = (text: string) => text.match(/[가-힣]{2,}/g) || [];
  const sourceTokens = new Set(tokenize(sourceContent));
  if (sourceTokens.size < minHits) return false;
  let hits = 0;
  for (const token of sourceTokens) {
    if (value.includes(token)) hits += 1;
  }
  return hits >= minHits && hits / sourceTokens.size >= minRatio;
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
  | 'PRESENTED_EVIDENCE_INTENT_MISMATCH'
  | 'JIWOO_EMPTY_EFFORT_GUESS_TEMPLATE'
  | 'REPEATED_JIWOO_LINE'
  | 'FABRICATED_CONTRADICTION_RESOLUTION'
  | 'DIRECT_WITNESS_SOURCE_MISMATCH'
  | 'MESSAGE_LENGTH_EXCEEDED'
  | 'WRITTEN_REGISTER_IN_DIALOGUE'
  | 'WITNESS_CLAIM_POLARITY_REVERSAL'
  | 'LOCATION_PRESENCE_REVERSAL'
  | 'UNDISCOVERED_EVIDENCE_LEAK'
  | 'UNDISCOVERED_TESTIMONY_LEAK'
  | 'PHANTOM_TESTIMONY_ACQUIRE'
  | 'MISSING_STATEMENT_STAGE_ADVANCE'
  | 'STALLED_CONTRADICTION_CONFRONTATION'
  | 'FABRICATED_TIME_REFERENCE'
  | 'FABRICATED_PROPER_NOUN'
  | 'VERBATIM_RESTATEMENT'
  | 'PARAPHRASED_RESTATEMENT'
  | 'REDUNDANT_SAME_LOCATION_MOVE'
  | 'PHANTOM_TIMELINE_NOTE'
  | 'INVENTED_DETAIL_PREREQUISITE'
  | 'MISSING_PRESENTATION_REACTION'
  | 'OPEN_CLAIM_ALIBI_REVERSAL'
  | 'FABRICATED_RECORD_CONTENT'
  | 'WITHHELD_UNLOCKED_KNOWLEDGE';

export type ResponseViolation = {
  code: ResponseViolationCode;
  severity: 'warning' | 'retry';
  evidence: string[];
  repairInstruction: string;
  // Set only for a leak/leak-adjacent violation where the detective is
  // legitimately in the right place to eventually find this (standing at
  // this location, or this NPC is the testimony's own actual source) —
  // never for a leak of content that doesn't belong here at all. Lets the
  // last-resort fallback (see emptyNarrativeFor's stalledNpc-style
  // branches) give an in-world "look closer here" hint instead of the
  // fully generic stall text when repair still can't converge, without
  // ever naming or confirming what the undiscovered thing actually is.
  locationId?: string;
  npcId?: string;
  // Set alongside locationId when the detector positively identified WHICH
  // of that location's own authored detail entries the detective legitimately
  // just earned (right place, right object). That makes the discovery a
  // code-verified fact rather than a guess, so the last-resort fallback can
  // deliver Master's own authored result text and record the acquire itself
  // instead of stalling — see emptyNarrativeFor's leak branch.
  evidenceId?: string;
  evidenceResult?: string;
  // Set on the "you narrated this legitimately, now record it" variants of the
  // leak detectors — the detective was standing at the evidence's own location
  // and targeted it, or the NPC speaking IS the testimony's authored source.
  // Those are not judgement calls left over after the repairs: the server knows
  // exactly which card id belongs in acquire, so the retry-exhaustion escape in
  // submitMessage can add it instead of discarding the turn.
  recordCardId?: string;
};

const INTERNAL_BOUNDARY_PHRASES =
  /공개로\s*말할\s*수\s*있는\s*선|공개\s*가능한\s*정보|현재\s*단계에서는|봉인된\s*정보|Master|마스터에\s*없|획득\s*조건|진술\s*단계|지원하지\s*않는\s*섹션|안전\s*응답|내부\s*데이터/i;
export function hasInternalBoundaryLeak(value: string) {
  return INTERNAL_BOUNDARY_PHRASES.test(value);
}
// Which phrase actually matched. A CASE023 log had this violation fire three
// turns running and kill each one, and the log line ("Internal disclosure
// terminology appeared in visible dialogue") gave no way to tell whether the
// draft really leaked system vocabulary or tripped on "현재 단계에서는", the one
// entry in that list that is also ordinary Korean.
export function internalBoundaryLeakPhrase(value: string) {
  return value.match(INTERNAL_BOUNDARY_PHRASES)?.[0] || null;
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
  // The player explicitly asked for a detailed/thorough account — used to
  // exempt this turn from the two checks that otherwise fight that request
  // outright (demanding brevity, or a single short quoted line) below.
  const detailRequested = /자세히|구체적으로|상세히|낱낱이/.test(playerInput);
  if (hasFabricatedTechnicalExcuse(visibleResponse)) {
    violations.push({
      code: 'FABRICATED_CONTRADICTION_RESOLUTION',
      severity: 'retry',
      evidence: isContradictionChallenge(playerInput)
        ? [
            'The player pointed out a contradiction they found themselves, and the draft explained it away with an invented technical justification not stated anywhere in Master.',
          ]
        : [
            'The draft volunteers an invented technical justification not stated anywhere in Master, without the player even having raised a contradiction yet.',
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
        `Internal disclosure terminology appeared in visible dialogue: "${internalBoundaryLeakPhrase(visibleResponse)}".`,
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
    // A real production failure (CASE008, 백은정's very first interview
    // question) showed the old repairInstruction's "one short... line"
    // directly fighting a legitimate "자세히/구체적으로 말해달라" request: the
    // model naturally answered with an extended third-person recount with
    // no literal quotation marks, this fired, and demanding brevity in the
    // repair made the retry keep narrating instead of quoting, failing the
    // same check again and falling through to the generic fallback with no
    // NPC dialogue at all. The requirement itself (must actually be
    // spoken, in quotes, never a decisive fact) is what matters — length
    // was never actually part of it, so the instruction no longer says
    // anything about length at all, short or long.
    violations.push({
      code: 'MISSING_NPC_DIALOGUE',
      severity: 'retry',
      evidence: [
        hasDecisiveSignal(draftResponse)
          ? 'The drafted response leaked a decisive fact to the interviewed NPC.'
          : 'The player addressed an NPC but the drafted response has no quoted dialogue.',
      ],
      repairInstruction:
        "The player is talking to the NPC currently being interviewed. Give that NPC a natural, in-character quoted line answering only what was asked — it must actually be spoken as the NPC's own words in quotation marks, not narrated about them in third person. Do not confirm, deny, or hint at the culprit, method, motive, or any other decisive fact — a limited or evasive answer is fine, but it must be a real spoken line, not narration about being unable to answer.",
    });
  }

  if (hasWrittenRegisterInDialogue(visibleResponse)) {
    violations.push({
      code: 'WRITTEN_REGISTER_IN_DIALOGUE',
      severity: 'retry',
      evidence: [
        'A quoted line contains Master\'s own written analytical register (a written-only connective like "또한", or a report verb like "판단/인지/확인했습니다") instead of how a person actually speaks.',
      ],
      repairInstruction:
        'Rewrite this quoted line as something a person would actually say out loud — short, spoken Korean, not a copy of Master\'s evidence-description wording. Remove "또한" and any "~라고 판단/인지했습니다" framing; a person says "~인 것 같았어요" or "~더라고요", not that they "judged" something. Keep exactly the same information, just spoken instead of written.',
    });
  }

  if (
    hasExcessiveMessageLength(draftResponse) &&
    !action.broadRequest &&
    !action.explicitGroupQuestion &&
    !contract.mayRevealConcealedContents &&
    !detailRequested &&
    // A confrontation is not an ordinary turn. A real playtest log (CASE043)
    // showed the two biggest moments of the case — six cards laid out at once,
    // then walked through one by one — drafted at 402 and 583 characters and
    // discarded for length, each replaced by the same two-line fallback
    // ("서지오가 시선을 피했다가 다시 든다…"). The player had spent the whole
    // session assembling those turns. Laying out six records and naming what
    // each one contradicts cannot be done in 350 characters, and this rule
    // exists to stop unsolicited padding, not to cap the climax.
    !contract.mayAdvanceNpcStatementStage
  ) {
    violations.push({
      code: 'MESSAGE_LENGTH_EXCEEDED',
      severity: 'retry',
      evidence: [
        `message is ${draftResponse.length} characters for an ordinary turn.`,
      ],
      repairInstruction:
        'Cut this to the shortest version that still answers what was actually asked. Remove unsolicited backstory, restated connective explanation, and psychological narration the player did not ask for — a short, information-dense turn is correct here, not a longer one.',
    });
  }

  return violations;
}
