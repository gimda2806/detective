import type { ResponseScopeContract } from './action-scope';
import type { ResponseViolation } from './response-signals';
import { LEAK_SHAPED_VIOLATION_CODES } from './response-signals';

/**
 * 이번 턴에 유출형 위반이 섞였는지. 초안은 두 경우 모두 되돌려 주고,
 * 이 값은 수리 지시문의 말투만 가른다 — 자세한 이유는
 * LEAK_SHAPED_VIOLATION_CODES의 주석 참고.
 */
export function repairHasLeak(violations: ResponseViolation[]) {
  return violations.some((violation) =>
    LEAK_SHAPED_VIOLATION_CODES.has(violation.code),
  );
}

export function responseRepairPrompt(
  violations: ResponseViolation[],
  contract: ResponseScopeContract,
) {
  return [
    'Your previous draft for this turn is attached at the end of the input, and it was rejected for the specific reasons listed below.',
    repairHasLeak(violations)
      ? 'Some of it revealed something the player has not earned yet. Cut exactly that out — the specific sentences or clauses carrying it, not the whole turn — and leave everything else in the draft as it is. Do not restate the cut content in vaguer words, and do not let it reappear anywhere else in the turn. If removing it leaves the answer thin, that is fine; a shorter honest answer beats one that gives away what it should not.'
      : 'Fix exactly the flagged points and change nothing else: keep the draft\'s scene, its wording, and everything about it that was not flagged.',
    'This is an edit, not a rewrite — do not start over and do not answer a different question than the draft answered.',
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
