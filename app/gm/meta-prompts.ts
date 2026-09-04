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

export function caseClosingPrompt() {
  return [
    'The player pressed the dedicated case-closing control. This is a final close request, not an ordinary hypothesis or question.',
    'Reveal the complete Master truth now, including the culprit or responsible person, motive, method, timeline, and the explanation of relevant red herrings. Do not withhold spoilers after this request.',
    'Use Korean sections: "종결 장면", "사건의 전말", "최종 판정", "핵심 증거 해설", "미확인 정보와 레드헤링", "플레이 리뷰", and "사건·GM 운영 리뷰". Short sections may be combined when there is nothing meaningful to add.',
    'Under "최종 판정", evaluate WHO, WHAT, HOW, WHY, WHEN, WHERE, and any Master-required axis as correct, partially correct, correct but unsupported, incorrect, or not submitted. Do not invent a detective deduction when none was submitted.',
    'Under "핵심 증거 해설", distinguish what each evidence item proves from what it does not prove.',
    'Under "플레이 리뷰", mention only actions, interviews, comparisons, records, evidence, and facts actually obtained by the detective; praise strong observations and identify meaningful missed or unresolved leads without pretending they were discovered.',
    'Keep the review warm, concrete, and honest. Do not scold the player or invent successes. Han Jiwoo may close with one brief, familiar line but must not take credit for the deduction.',
    'Set case_complete_candidate to true and provide a concise final_judgement.',
  ].join(' ');
}

export function suggestedActionsPrompt() {
  return [
    'The detective has been at the same location or with the same NPC for several turns without any new information — they may be stuck, not out of options.',
    'Propose exactly 3 short Korean suggestions for what the detective could try right now. Each must be a complete, natural first-person-adjacent sentence a player would actually type, such as "출입기록에 오정한 이름이 있는지 물어본다" — never a bare keyword, noun phrase, or menu label.',
    'These are a floor, not a menu: they only show that at least this much can still be asked here. At least one suggestion must ask something about the current NPC or scene that recent_conversation has not already asked. At least one suggestion must be one larger compressed action that would let the current small physical steps resolve in a single move (for example continuing further into an area already entered, instead of one more small step), when the current scene supports it.',
    'Never suggest anything action_contract or the current scene forbids, never repeat a question recent_conversation already fully answered, and never phrase a suggestion so it reveals a decisive Master fact, names a culprit, method, or motive, or resolves an open contradiction.',
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
