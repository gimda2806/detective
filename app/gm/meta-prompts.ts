import type { ResponseScopeContract } from './action-scope';
import type { ResponseViolation } from './response-signals';
import { LEAK_SHAPED_VIOLATION_CODES } from './response-signals';

/**
 * 이번 턴의 위반들이 초안을 되돌려 줘도 되는 종류인지 판정한다.
 * 하나라도 유출형이 섞이면 보수적인 쪽(초안 없이 다시 쓰기)을 따른다.
 * 자세한 이유는 LEAK_SHAPED_VIOLATION_CODES의 주석 참고.
 */
export function repairMayShowDraft(violations: ResponseViolation[]) {
  return !violations.some((violation) =>
    LEAK_SHAPED_VIOLATION_CODES.has(violation.code),
  );
}

export function responseRepairPrompt(
  violations: ResponseViolation[],
  contract: ResponseScopeContract,
) {
  const mayShowDraft = repairMayShowDraft(violations);
  return [
    mayShowDraft
      ? 'Your previous draft for this turn is attached at the end of the input, and it was rejected for the specific reasons listed below. Fix exactly those points and change nothing else: keep the draft\'s scene, its wording, and everything about it that was not flagged. This is an edit, not a rewrite — do not start over and do not answer a different question than the draft answered.'
      : 'Rewrite the turn from scratch. Do not mention, preserve, correct, or reuse information leaked by the rejected draft.',
    'Answer the player actual request directly, preserve only established GameState facts, and create no new decisive fact.',
    `Allowed operations: ${contract.allowedOperations.join(', ') || 'none'}.`,
    `Forbidden operations: ${contract.forbiddenOperations.join(', ') || 'none'}.`,
    ...violations.map((violation) => violation.repairInstruction),
  ].join(' ');
}

export function metaPrompt() {
  return [
    'You answer Korean meta questions about the mystery game system, rules, UI, or possible GM errors.',
    'Use a casual product-collaboration tone, as if discussing how to tune the game at the table. Sound like a person, not a manual.',
    'Do not roleplay as an NPC and do not treat the user input as detective action.',
    'Meta discussion must not change current location, interview target, NPC statement stage, presented evidence, timeline, or acquired investigation state.',
    'Do not reveal hidden Master truth, culprit, method, motive, undiscovered evidence, or private NPC knowledge.',
    "known_npcs lists every character the player can actually interview, each with whether they've been interviewed yet. case_public.surface_incident is the case's own already-public statement of what happened, including the victim's name and status if there is one. When the player asks about a name that appears in surface_incident but not in known_npcs, that person is almost always the deceased victim or a background figure who cannot be interviewed at all — say so plainly (they're the victim, already dead, not someone you can go talk to) rather than describing them as an NPC the player simply hasn't met or investigated yet.",
    'If the user asks for a spoiler or hidden fact, explain that it is sealed until discovered or final review.',
    'When the user critiques Han Jiwoo, acknowledge the direction and talk about tone/role boundaries. Do not explain that it is "natural for game progress" or tell the player to choose another action.',
    'Keep the answer concise and practical.',
    'Return only JSON matching the schema.',
  ].join(' ');
}
