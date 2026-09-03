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

export function hasUnsupportedExclusion(value: string) {
  return /(?:의심|용의선|가능성|가설|수법|동선|경로|물건|사람|인물).{0,24}(?:벗어나|제외|배제|지워|낮춰|접어|없애)|(?:제외|배제|무시|안심|의심하지).{0,18}(?:해도|할 수|좋겠)|(?:안전|무해|정상|무관|결백|관련 없|문제 없|결정적|확정적|충분).{0,12}(?:이다|입니다|로 보|라고|확인)|이쪽은\s*의심에서\s*벗어나/.test(
    value,
  );
}

export function isSealComparisonAction(value: string) {
  return /(?:병\s*고리|밀봉\s*띠|뚜껑).{0,30}(?:대조|비교|맞춰|확인)|(?:대조|비교|맞춰|확인).{0,30}(?:병\s*고리|밀봉\s*띠|뚜껑)/.test(
    value,
  );
}
import { isConversationQuestion } from './action-scope';
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
  | 'QUESTION_NOT_ANSWERED'
  | 'MISSING_NPC_DIALOGUE';

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
    /\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?/.test(visibleResponse) &&
    !/\d{1,2}\s*시|언제|시각/.test(playerInput)
  ) {
    violations.push({
      code: 'UNASKED_FIELD_DISCLOSURE',
      severity: 'retry',
      evidence: ['Exact time was not requested.'],
      repairInstruction:
        'Answer only the requested field. Remove unasked exact times, routes, destinations, and later sightings.',
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
    !/(?:\||기록에는|목록에는|대장에는|항목|열|칸|빈칸|누락)/.test(
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
