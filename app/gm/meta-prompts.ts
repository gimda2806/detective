import type { ResponseScopeContract } from './action-scope';
import type { ResponseViolation } from './response-signals';

export function responseRepairPrompt(
  violations: ResponseViolation[],
  contract: ResponseScopeContract,
) {
  return [
    'Rewrite the turn from scratch. Do not mention, preserve, correct, or reuse information leaked by the rejected draft.',
    'Answer the player actual request directly, preserve only established GameState facts, and create no new decisive fact.',
    `Allowed operations: ${contract.allowedOperations.join(', ') || 'none'}.`,
    `Forbidden operations: ${contract.forbiddenOperations.join(', ') || 'none'}.`,
    ...violations.map((violation) => violation.repairInstruction),
  ].join(' ');
}

export function suggestedActionsPrompt() {
  return [
    'Propose exactly 3 short Korean suggestions for what the detective could try right now, given the current scene, NPC, and recent_conversation. Each must be a complete, natural first-person-adjacent sentence a player would actually type, such as "출입기록에 오정한 이름이 있는지 물어본다" — never a bare keyword, noun phrase, or menu label.',
    'These are a floor, not a menu: they only show that at least this much can still be asked here. At least one suggestion must ask something about the current NPC or scene that recent_conversation has not already asked. At least one suggestion must be one larger compressed action that would let the current small physical steps resolve in a single move (for example continuing further into an area already entered, instead of one more small step), when the current scene supports it.',
    'Never suggest anything action_contract or the current scene forbids, never repeat a question recent_conversation already fully answered, and never phrase a suggestion so it reveals a decisive Master fact, names a culprit, method, or motive, or resolves an open contradiction.',
    "Never name an NPC in a suggestion unless the player has already interviewed them, is currently interviewing them, or that NPC's name has already appeared somewhere in recent_conversation. Master context (contradiction_stages, current_npc_knowledge, red_herrings) may mention an NPC the player has not met yet purely as backstage bookkeeping — surfacing that name in a suggestion spoils both that the NPC exists and that they matter, before the player found either on their own. If the natural next move is genuinely to compare or corroborate with such an NPC, phrase the suggestion around what the player can act on now (asking the current NPC to account for a specific detail, or where to go next) without naming who the corroboration will come from.",
    "This applies to a suggestion's own wording, not just its intent: never state a specific time, location, or event as an already-established fact when that detail only exists in context.master.contradiction_stages' release/scope, requires_comparison, or red_herrings' actual_reason and has not actually been released yet in play. Writing \"[누가] [시각]에 [장소]에서 ~한 사실에 대해 묻는다\" hands the player the answer through the question itself even though it sounds like an open question. Phrase these as genuinely open — ask where they were, challenge a claim, or present evidence and see what it produces — without supplying the specific time, place, or event yourself.",
    "recent_conversation's last user/assistant pair is the question the detective just asked and the answer they just got this very turn — check it first. Do not offer that same question again in any rewording, even a compressed or more specific-sounding one, unless the answer just given was a genuine non-answer (a deflection, a refusal, or a generic 'nothing new here yet' line) that leaves a real follow-up still open.",
    'Return only JSON matching the schema.',
  ].join(' ');
}

export function metaPrompt() {
  return [
    'You answer Korean meta questions about the mystery game system, rules, UI, or possible GM errors.',
    'Use a casual product-collaboration tone, as if discussing how to tune the game at the table. Sound like a person, not a manual.',
    'Do not roleplay as an NPC and do not treat the user input as detective action.',
    'Meta discussion must not change current location, interview target, NPC statement stage, presented evidence, timeline, or acquired investigation state.',
    'Do not reveal hidden Master truth, culprit, method, motive, undiscovered evidence, or private NPC knowledge.',
    'If the user asks for a spoiler or hidden fact, explain that it is sealed until discovered or final review.',
    'When the user critiques Han Jiwoo, acknowledge the direction and talk about tone/role boundaries. Do not explain that it is "natural for game progress" or tell the player to choose another action.',
    'Keep the answer concise and practical.',
    'Return only JSON matching the schema.',
  ].join(' ');
}
