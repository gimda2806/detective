// Parses the structured rule content out of a Master's raw_text — the
// LOCATIONS observation_rules/detail_rules, each CHARACTERS block's
// knows/initial_claims/hidden_until/knowledge_limits, CONTRADICTION_STAGES,
// and RED_HERRINGS — so buildActionScopedMaster() in app/game.ts can put
// the current location's and current NPC's actual rules in front of the
// model every turn.
//
// Before this module existed, buildActionScopedMaster only ever sent the
// flat CaseData summary fields (location.description, npc.role, a card's
// one-line summary once acquired) into the per-turn context. raw_text
// itself was never included except once, at final case-close. That means
// on every ordinary play turn the model had no access to what a location's
// observation/detail actions actually reveal, what an NPC actually knows,
// which of their initial claims are lies, or their hidden_until gates — it
// necessarily improvised nearly everything beyond a one-line description,
// which is the real root cause behind hallucinated non-Master subplots
// (an invented CCTV network, fabricated technical caveats) and
// wrong-location item discoveries seen in real playtest logs (CASE059,
// CASE171): there was no real content to draw from, not a matching
// failure against content that was already there.
//
// Deliberately narrow and read-only: this never writes back into Master
// or changes what's stored — it only lets already-authored content
// actually reach the model instead of sitting unread in raw_text.

export type LocationRuleIndex = {
  observation: Array<{ action: string; result: string }>;
  detail: Array<{
    action: string;
    requires: string;
    result: string;
    evidenceId: string;
  }>;
};

export type NpcKnowledgeIndex = {
  knows: Array<{ factId: string; content: string }>;
  initialClaims: Array<{
    claimId: string;
    content: string;
    truthStatus: string;
  }>;
  initialInterviewRange: string[];
  hiddenUntil: Array<{
    factOrClaimId: string;
    prerequisite: string;
    trigger: string;
  }>;
  knowledgeLimits: string[];
  // Ordered denial variations for repeated pressure on a still-hidden
  // topic — was declared required by case_master.schema.json ("실제로는
  // 2~4개여야 한다") but structured-master-converter.ts never carried it
  // into raw_text at all, so every case's authored content here was
  // silently discarded before the model ever saw it (every one of the 48
  // existing pending-cases had 0 despite the schema requiring 2-4).
  pressureResponses: string[];
  // Optional comic personality beat (case_identity.tone permitting) — same
  // silent-discard gap as pressureResponses.
  comicTell: string;
};

export type ContradictionStageIndex = {
  id: string;
  targetCharacter: string;
  fromStage: string;
  toStage: string;
  requiresHeardClaimIds: string[];
  requiresPresentedEvidenceIds: string[];
  playerAction: string;
  release: string;
  releaseClaimOrFactId: string;
  mustNotRelease: string;
};

export type RedHerringIndex = {
  id: string;
  surfaceSuspicion: string;
  actualReason: string;
  howToClear: string;
  mustNotImply: string;
  // Mid-arc escalation ("gets worse before it clears") — same silent-
  // discard gap as NpcKnowledgeIndex.pressureResponses (schema required
  // it, structured-master-converter.ts never carried it into raw_text).
  suspicionDeepener: string;
};

// case_master.schema.json's case_complete: the "finish line" a progress
// display measures the player's current state against. IDs only — no
// prose — since these exist purely to be checked against
// state.acquired_information/player_established/npc_statement_stage, the
// same reachability-gated fields validateGmResponse's npc_updates gate
// already treats as ground truth.
export type CaseCompleteIndex = {
  requiredEstablishedFacts: string[];
  requiredContradictionStages: string[];
};

// actual_timeline[].world_fact is the case author's own pre-written,
// spoiler-safe public version of a timeline beat (actual_action itself is
// full-truth-grade and never surfaced here, same as FULL_TRUTH). Entries
// without a world_fact are internal-only ground truth with no safe public
// form and are left out entirely — there is nothing here for a timeline
// note to legitimately bind to.
//
// world_fact alone is NOT sufficient for safety, though: a real production
// leak (CASE008) showed a world_fact that is itself part of the hidden
// motive — "강태민은 15년간 그녀의 수석 제자이자 연인이었다" — surfacing in a
// player-facing timeline note in a turn that had nothing to do with it,
// well before the affair was ever earned through the culprit's own gated
// contradiction stages. actors is kept here so callers can additionally
// filter out any entry the culprit themselves appears in — see
// filterSafeTimelineFacts.
export type TimelineFactIndex = {
  id: string;
  time: string;
  actors: string[];
  worldFact: string;
};

export type MasterIndex = {
  locations: Record<string, LocationRuleIndex>;
  npcs: Record<string, NpcKnowledgeIndex>;
  contradictionStages: ContradictionStageIndex[];
  redHerrings: RedHerringIndex[];
  caseComplete: CaseCompleteIndex;
  responsibleCharacterId: string;
  timelineFacts: TimelineFactIndex[];
};

function splitTopSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const matches = Array.from(text.matchAll(/^\[([A-Z_]+)\]\s*$/gm));
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const name = match[1];
    const start = (match.index || 0) + match[0].length;
    const end =
      i + 1 < matches.length
        ? matches[i + 1].index || text.length
        : text.length;
    sections[name] = text.slice(start, end).trim();
  }
  return sections;
}

function splitSubBlocks(body: string): Array<{ id: string; lines: string[] }> {
  const blocks: Array<{ id: string; lines: string[] }> = [];
  let currentId = '';
  let currentLines: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const headerMatch = line.trim().match(/^\[([A-Za-z0-9-]+)\]\s*$/);
    if (headerMatch) {
      if (currentId) blocks.push({ id: currentId, lines: currentLines });
      currentId = headerMatch[1].toUpperCase();
      currentLines = [];
    } else if (currentId) {
      currentLines.push(line);
    }
  }
  if (currentId) blocks.push({ id: currentId, lines: currentLines });
  return blocks;
}

// Reads a single `field: value` line's value, or '' if the field never
// appears in `lines`.
function readField(lines: string[], key: string): string {
  const pattern = new RegExp(`^${key}\\s*:\\s*(.*)$`);
  for (const line of lines) {
    const match = line.trim().match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

// Extracts repeated `* action: ... / requires: ... / release_evidence_id:
// ... / result: ...`-style groups from a field's lines: each group starts
// at a `* action:` or bare `action:` line and runs until the next one (or
// the label's own end). Shared by observation_rules (no requires/
// release_evidence_id) and detail_rules (has both) — callers only read the
// keys that field actually uses.
function extractRuleGroups(
  lines: string[],
  label: string,
): Array<Record<string, string>> {
  const startIndex = lines.findIndex((line) => line.trim() === `${label}:`);
  if (startIndex === -1) return [];

  const groups: Array<Record<string, string>> = [];
  let current: Record<string, string> | null = null;

  // A real playtest log (CASE043) showed detail_rules[0]'s own action+result
  // (E01's discovery) silently duplicated into this location's observation
  // list — extractRuleGroups('observation_rules') never stopped at the
  // following "detail_rules:" section header, because that header line has
  // the exact same "word: " shape as an ordinary field-within-a-group line
  // (like "requires: ") and so matched fieldMatch below instead of ending
  // the loop, letting it read straight into detail_rules' own `* action:`
  // entries as if they were more observation_rules groups. The runtime
  // consequence: detectUndiscoveredEvidenceLeak's explainedByObservation
  // check then saw E01's own result sitting in "observation" and treated a
  // genuine detail discovery as already-explained-by-a-free-look, so the
  // model was never told to record acquire — the detective could describe
  // the tampered screw in perfect detail turn after turn and it would
  // never become an actual evidence card. observation_rules/detail_rules
  // are the only two sibling section labels sharing a location block (see
  // buildLocationBlock), so ending the loop the instant either one's own
  // header line reappears — not just at the next bracketed [LXX] block —
  // closes this without needing to special-case "field vs. header" more
  // generally.
  const SIBLING_SECTION_HEADERS = new Set([
    'observation_rules:',
    'detail_rules:',
  ]);

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (SIBLING_SECTION_HEADERS.has(trimmed)) break;
    const actionMatch = trimmed.match(/^\*?\s*action\s*:\s*(.+)$/);
    if (actionMatch) {
      if (current) groups.push(current);
      current = { action: actionMatch[1].trim() };
      continue;
    }
    if (!current) continue;
    const fieldMatch = trimmed.match(/^([a-z_]+)\s*:\s*(.*)$/);
    if (fieldMatch) {
      current[fieldMatch[1]] = fieldMatch[2].trim();
      continue;
    }
    // A new top-level field (not another bullet, not a continuation) ends
    // this rule list.
    if (trimmed && !trimmed.startsWith('*')) break;
  }
  if (current) groups.push(current);
  return groups;
}

function extractHiddenUntil(lines: string[]): NpcKnowledgeIndex['hiddenUntil'] {
  const startIndex = lines.findIndex((line) => line.trim() === 'hidden_until:');
  if (startIndex === -1) return [];

  const releases: NpcKnowledgeIndex['hiddenUntil'] = [];
  let currentId = '';
  let prerequisite = '';
  let trigger = '';
  const flush = () => {
    if (currentId)
      releases.push({ factOrClaimId: currentId, prerequisite, trigger });
  };

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const idMatch = trimmed.match(/^\*?\s*fact_or_claim_id\s*:\s*(.+)$/);
    if (idMatch) {
      flush();
      currentId = idMatch[1].trim();
      prerequisite = '';
      trigger = '';
      continue;
    }
    const prereqMatch = trimmed.match(/^release_prerequisite\s*:\s*(.+)$/);
    if (prereqMatch) {
      prerequisite = prereqMatch[1].trim();
      continue;
    }
    const triggerMatch = trimmed.match(/^release_trigger\s*:\s*(.+)$/);
    if (triggerMatch) {
      trigger = triggerMatch[1].trim();
      continue;
    }
    if (
      trimmed &&
      !trimmed.startsWith('*') &&
      /^[a-z_]+\s*:/.test(trimmed) &&
      !trimmed.startsWith('fact_or_claim_id')
    ) {
      break;
    }
  }
  flush();
  return releases;
}

function extractBulletedField(lines: string[], label: string): string[] {
  const startIndex = lines.findIndex((line) => line.trim() === `${label}:`);
  if (startIndex === -1) return [];
  const values: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith('*')) {
      if (/^[a-z_]+\s*:/.test(trimmed)) break;
      continue;
    }
    values.push(trimmed.replace(/^\*\s*/, '').trim());
  }
  return values;
}

// Reads a `* subfield: value` line nested under a `label:` block (e.g.
// release: / * claim_or_fact_id: F-CH02-03), as opposed to readField's
// flat top-level fields or extractBulletedField's plain bullet list.
function readBulletedSubfield(
  lines: string[],
  label: string,
  subfield: string,
): string {
  const startIndex = lines.findIndex((line) => line.trim() === `${label}:`);
  if (startIndex === -1) return '';
  const pattern = new RegExp(`^\\*?\\s*${subfield}\\s*:\\s*(.+)$`);
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(pattern);
    if (match) return match[1].trim();
    if (trimmed && !trimmed.startsWith('*') && /^[a-z_]+\s*:/.test(trimmed)) {
      break;
    }
  }
  return '';
}

function extractKnows(lines: string[]): NpcKnowledgeIndex['knows'] {
  const startIndex = lines.findIndex((line) => line.trim() === 'knows:');
  if (startIndex === -1) return [];
  const results: NpcKnowledgeIndex['knows'] = [];
  let factId = '';
  let content = '';
  const flush = () => {
    if (factId) results.push({ factId, content });
  };
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const factMatch = trimmed.match(/^\*?\s*fact_id\s*:\s*(.+)$/);
    if (factMatch) {
      flush();
      factId = factMatch[1].trim();
      content = '';
      continue;
    }
    const contentMatch = trimmed.match(/^content\s*:\s*(.+)$/);
    if (contentMatch) {
      content = contentMatch[1].trim();
      continue;
    }
    if (
      trimmed &&
      !trimmed.startsWith('*') &&
      /^[a-z_]+\s*:/.test(trimmed) &&
      !trimmed.startsWith('fact_id')
    ) {
      break;
    }
  }
  flush();
  return results;
}

function extractInitialClaims(
  lines: string[],
): NpcKnowledgeIndex['initialClaims'] {
  const startIndex = lines.findIndex(
    (line) => line.trim() === 'initial_claims:',
  );
  if (startIndex === -1) return [];
  const results: NpcKnowledgeIndex['initialClaims'] = [];
  let claimId = '';
  let content = '';
  let truthStatus = '';
  const flush = () => {
    if (claimId) results.push({ claimId, content, truthStatus });
  };
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const claimMatch = trimmed.match(/^\*?\s*claim_id\s*:\s*(.+)$/);
    if (claimMatch) {
      flush();
      claimId = claimMatch[1].trim();
      content = '';
      truthStatus = '';
      continue;
    }
    const contentMatch = trimmed.match(/^content\s*:\s*(.+)$/);
    if (contentMatch) {
      content = contentMatch[1].trim();
      continue;
    }
    const truthMatch = trimmed.match(/^truth_status\s*:\s*(.+)$/);
    if (truthMatch) {
      truthStatus = truthMatch[1].trim();
      continue;
    }
    if (
      trimmed &&
      !trimmed.startsWith('*') &&
      /^[a-z_]+\s*:/.test(trimmed) &&
      !trimmed.startsWith('claim_id')
    ) {
      break;
    }
  }
  flush();
  return results;
}

export function buildMasterIndex(rawText: string): MasterIndex {
  const sections = splitTopSections(rawText);

  const locations: Record<string, LocationRuleIndex> = {};
  for (const block of splitSubBlocks(sections.LOCATIONS || '')) {
    locations[block.id] = {
      observation: extractRuleGroups(block.lines, 'observation_rules').map(
        (group) => ({
          action: group.action || '',
          result: group.result || '',
        }),
      ),
      detail: extractRuleGroups(block.lines, 'detail_rules').map((group) => ({
        action: group.action || '',
        requires: group.requires || '',
        result: group.result || '',
        evidenceId: group.release_evidence_id || '',
      })),
    };
  }

  const npcs: Record<string, NpcKnowledgeIndex> = {};
  for (const block of splitSubBlocks(sections.CHARACTERS || '')) {
    if (!/^CH[0-9]+$/.test(block.id)) continue;
    const npcId = block.id.replace(/^CH/, 'N');
    npcs[npcId] = {
      knows: extractKnows(block.lines),
      initialClaims: extractInitialClaims(block.lines),
      initialInterviewRange: extractBulletedField(
        block.lines,
        'initial_interview_range',
      ),
      hiddenUntil: extractHiddenUntil(block.lines),
      knowledgeLimits: extractBulletedField(block.lines, 'knowledge_limits'),
      pressureResponses: extractBulletedField(
        block.lines,
        'pressure_responses',
      ),
      comicTell: readField(block.lines, 'comic_tell'),
    };
  }

  const contradictionStages: ContradictionStageIndex[] = splitSubBlocks(
    sections.CONTRADICTION_STAGES || '',
  ).map((block) => ({
    id: block.id,
    targetCharacter: readField(block.lines, 'target_character').replace(
      /^CH/,
      'N',
    ),
    fromStage: readField(block.lines, 'from_stage'),
    toStage: readField(block.lines, 'to_stage'),
    requiresHeardClaimIds: extractBulletedField(
      block.lines,
      'requires_heard_claim_ids',
    ),
    requiresPresentedEvidenceIds: extractBulletedField(
      block.lines,
      'requires_presented_evidence_ids',
    ),
    playerAction: readField(block.lines, 'player_action'),
    release:
      readField(block.lines, 'scope') || readField(block.lines, 'release'),
    releaseClaimOrFactId: readBulletedSubfield(
      block.lines,
      'release',
      'claim_or_fact_id',
    ),
    mustNotRelease: extractBulletedField(block.lines, 'must_not_release').join(
      '; ',
    ),
  }));

  const redHerrings: RedHerringIndex[] = splitSubBlocks(
    sections.RED_HERRINGS || '',
  ).map((block) => ({
    id: block.id,
    surfaceSuspicion: readField(block.lines, 'surface_suspicion'),
    actualReason: readField(block.lines, 'actual_reason'),
    howToClear: readField(block.lines, 'how_to_clear'),
    mustNotImply: readField(block.lines, 'must_not_imply'),
    suspicionDeepener: readField(block.lines, 'suspicion_deepener'),
  }));

  const caseCompleteLines = (sections.CASE_COMPLETE || '').split(/\r?\n/);
  const splitIdList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  const caseComplete: CaseCompleteIndex = {
    requiredEstablishedFacts: splitIdList(
      readField(caseCompleteLines, 'required_established_facts'),
    ),
    requiredContradictionStages: splitIdList(
      readField(caseCompleteLines, 'required_contradiction_stages'),
    ),
  };

  const timelineFacts: TimelineFactIndex[] = splitSubBlocks(
    sections.ACTUAL_TIMELINE || '',
  )
    .map((block) => ({
      id: block.id,
      time: readField(block.lines, 'time'),
      actors: splitIdList(readField(block.lines, 'actors')),
      worldFact: readField(block.lines, 'world_fact'),
    }))
    .filter((entry) => entry.worldFact !== '');

  const responsibleCharacterId = readField(
    (sections.FULL_TRUTH || '').split(/\r?\n/),
    'responsible_character_id',
  );

  return {
    locations,
    npcs,
    contradictionStages,
    redHerrings,
    caseComplete,
    responsibleCharacterId,
    timelineFacts,
  };
}

// Sitting in MasterIndex.timelineFacts (has a world_fact) is necessary but
// not sufficient for a fact to be safe to surface as an already-public
// timeline note — a real production leak (CASE008) showed a world_fact
// that IS the hidden motive itself ("강태민은 15년간 그녀의 수석 제자이자
// 연인이었다") reaching a player-facing turn that had nothing to do with
// it, well before the culprit's own gated contradiction stages ever earned
// it. That exact entry's own actors field is only the victim (she's the
// one speaking in actual_action) — the culprit is merely the one being
// spoken about — so an actors-only check alone would have missed it.
// Every entry the culprit appears in (as an actor, or named in the
// world_fact text itself) is excluded here. Used both to decide what's
// exposed to the model as taggable each turn and, in applyGmResponse, as
// the actual binding gate on what a timeline_id is allowed to resolve to
// — a model that names an id outside this list (whether confused or
// having glimpsed FULL_TRUTH some other way) is refused, not trusted.
export function filterSafeTimelineFacts(
  index: MasterIndex,
  culpritName?: string,
): TimelineFactIndex[] {
  return index.timelineFacts.filter((fact) => {
    if (fact.actors.includes(index.responsibleCharacterId)) return false;
    if (culpritName && fact.worldFact.includes(culpritName)) return false;
    return true;
  });
}

export type CaseEndingReveal = {
  answer: Array<{ key: string; value: string }>;
  endingExplanation: string;
  // [ENDING_SCENE]'s narrative — the actual written confession/closing
  // scene, with detective_line/jiwoo_line-equivalent dialogue baked
  // directly into the prose by the case author (a real playtest log
  // showed this was authored in every recent Master but never read here
  // at all: case_close only ever assembled the answer/explanation into a
  // structured report, so every case's ending arrived as a dry "책임자/
  // 수법/동기" summary with no scene, no dialogue, nowhere for a
  // lingering_thread to actually land). '' when a case has none (older
  // Masters predating this field).
  endingScene: string;
};

// Case closing is entirely the player's call, and the ending itself is
// not something to generate — Master's [FINAL_DEDUCTION] and
// [ENDING_EXPLANATION] sections already are the case's actual ending,
// player-facing and pre-scrubbed of internal ids/timeline codes (unlike
// [FULL_TRUTH], which still uses CH/L/T ids for GM reference). Reading
// them directly means the reveal can never drift from what Master
// actually says, and needs no model call at all.
export function buildEndingReveal(rawText: string): CaseEndingReveal {
  const sections = splitTopSections(rawText);
  const finalDeductionBody = sections.FINAL_DEDUCTION || '';
  const answerIndex = finalDeductionBody.indexOf('answer:');
  const answerBody =
    answerIndex >= 0
      ? finalDeductionBody.slice(answerIndex + 'answer:'.length)
      : finalDeductionBody;

  const answer: Array<{ key: string; value: string }> = [];
  for (const line of answerBody.split(/\r?\n/)) {
    const match = line.trim().match(/^\*\s*([^:：]+)\s*[:：]\s*(.+)$/);
    if (match) answer.push({ key: match[1].trim(), value: match[2].trim() });
  }

  return {
    answer,
    endingExplanation: (sections.ENDING_EXPLANATION || '').trim(),
    endingScene: (sections.ENDING_SCENE || '').trim(),
  };
}

// ====================================================================
// Fact-anchor extraction — a real playtest log (CASE007) showed the same
// underlying fact (an NPC access-log alibi) getting restated across four
// separate turns, each in different wording. A text-similarity check
// (see hasContentOverlap in response-signals.ts) is the wrong tool for
// this: it's built to catch near-verbatim copying, and a genuine
// paraphrase deliberately avoids sharing enough literal substring to
// trip it. What a paraphrase CAN'T drop, though, is the minimal set of
// concrete elements that make the sentence that particular fact rather
// than a different one — who it's about, when it happened, what it's
// about. Matching on those "anchors" instead of on prose similarity is
// robust to rewording by construction.
// ====================================================================

export type FactAnchors = {
  id: string;
  label: string;
  actorIds: string[];
  times: string[];
  // A Set of overlapping 3-gram substrings, not discrete keywords — see
  // topicAnchors. Callers score overlap by ratio against this set's size
  // (topicOverlapRatio), not by counting exact-string containment of
  // individual "topics".
  topics: Set<string>;
};

// Shared scoring helper: how much of `fact`'s own topic-gram vocabulary
// actually shows up in `text`. A ratio (not a raw count) because facts
// vary a lot in length — a short fact needs proportionally more of its
// (few) grams present to be a confident match, while a long fact sharing
// the same absolute count of grams as a short one is a much weaker
// signal relative to how much of it is actually unaccounted for.
export function topicOverlapRatio(fact: FactAnchors, text: string): number {
  if (!fact.topics.size) return 0;
  const flat = text.replace(/\s+/g, '');
  let hits = 0;
  for (const gram of fact.topics) {
    if (flat.includes(gram)) hits += 1;
  }
  return hits / fact.topics.size;
}

// A first-person reference ("저", "제가") resolves to whoever is actually
// speaking this turn rather than to any name/alias text, so it's handled
// as a rule at match time (see mentionsCharacter) instead of being folded
// into the alias table itself.
const FIRST_PERSON =
  /(?:^|[\s"“」])(?:저|제가|제|전|나|내가)(?=[\s가는은이의와과도만]|$)/;

const ROLE_TITLE_SUFFIX =
  /(팀장|센터장|원장|실장|과장|부장|반장|주임|팀원|대표)$/;

// Builds each NPC's set of ways they might be referred to besides their
// own name — a real playtest log showed an NPC's own answer referring to
// someone else purely by title ("서지훈과 한소율" one turn, "저와 팀장님만"
// the next) with no name repeated at all, so name-only matching would
// have missed the second turn's restatement entirely.
//
// Only adds a word from role when it's an actual title (ends in one of
// ROLE_TITLE_SUFFIX) — an earlier version added every 2+ character word
// in the role string, which meant an ordinary description word ("개소식
// 준비 총괄" -> "준비") became a spurious "alias" for that character and
// matched any unrelated sentence that happened to contain that common
// word.
export function characterAliases(
  npcs: Array<{ id: string; name: string; role: string }>,
): Map<string, string[]> {
  const aliases = new Map<string, string[]>();
  for (const npc of npcs) {
    const names = new Set<string>([npc.name]);
    for (const token of (npc.role || '').match(/[가-힣]{2,}/g) || []) {
      const titleMatch = token.match(ROLE_TITLE_SUFFIX);
      if (titleMatch) {
        names.add(token);
        names.add(titleMatch[1]);
      }
    }
    aliases.set(
      npc.id,
      [...names].filter((name) => name.length >= 2),
    );
  }
  return aliases;
}

export function mentionsCharacter(
  visibleText: string,
  npcId: string,
  aliases: Map<string, string[]>,
  isSpeaker: boolean,
): boolean {
  if (isSpeaker && FIRST_PERSON.test(visibleText)) return true;
  const flat = visibleText.replace(/\s+/g, '');
  return (aliases.get(npcId) || []).some((alias) =>
    flat.includes(alias.replace(/\s+/g, '')),
  );
}

// Matches an exact clock time in either "22:40" or "22시 40분" form and
// normalizes both to the same "H:MM" key, additionally folding a
// nocturnal-hour mention ("어젯밤 11시") to its 24-hour form so it anchors
// to the same key as "23:00" — a real playtest log had the same fact
// stated once each way.
const TIME_TOKEN =
  /(\d{1,2})\s*:\s*(\d{2})|(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/g;
export function timeAnchors(text: string): string[] {
  const out = new Set<string>();
  const nocturnal = /(밤|새벽|저녁|어젯밤|심야)/.test(text);
  for (const match of text.matchAll(TIME_TOKEN)) {
    let hour = Number(match[1] ?? match[3]);
    const minute = Number(match[2] ?? match[4] ?? 0);
    if (nocturnal && hour <= 12) hour += 12;
    out.add(`${hour % 24}:${String(minute).padStart(2, '0')}`);
  }
  return [...out];
}

// Topic anchors are overlapping 3-character substrings (character
// n-grams) of the Hangul-only, whitespace-stripped text — the same
// technique hasContentOverlap (response-signals.ts) uses, for the same
// reason: it survives particle differences ("출입은" vs "출입 기록에")
// that would otherwise split what's really the same word into different
// tokens. An earlier version here instead chunked the text greedily into
// non-overlapping 3-6 character runs, which is a much weaker signal —
// two runs of the same underlying text almost never land on the exact
// same chunk boundaries, so genuinely overlapping content routinely
// scored zero shared "topics" against itself. Returned as a plain Set:
// callers compare against a whole fact's set by overlap ratio (see
// FactAnchors.topics and its callers in game.ts), not by exact-token
// containment, since any single 3-gram is common enough on its own to be
// meaningless — only a real cluster of shared grams is a signal.
export function topicAnchors(text: string): Set<string> {
  const hangulOnly = (text.match(/[가-힣]/g) || []).join('');
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= hangulOnly.length; i += 1) {
    grams.add(hangulOnly.slice(i, i + 3));
  }
  return grams;
}

export function buildFactAnchors(
  npcs: Array<{ id: string; name: string; role: string }>,
  cards: Array<{
    id: string;
    title: string;
    content?: string;
    summary: string;
  }>,
  timelineFacts: TimelineFactIndex[],
): FactAnchors[] {
  const aliases = characterAliases(npcs);
  const npcIds = new Set(npcs.map((npc) => npc.id));
  const profiles: FactAnchors[] = [];
  const actorIdsMentionedIn = (text: string) => {
    const flat = text.replace(/\s+/g, '');
    return [...aliases.entries()]
      .filter(([, names]) =>
        names.some((name) => flat.includes(name.replace(/\s+/g, ''))),
      )
      .map(([npcId]) => npcId);
  };
  for (const card of cards) {
    const content = card.content || card.summary || '';
    profiles.push({
      id: card.id,
      label: card.title,
      // Actor detection reads title+content (a name could plausibly
      // appear in either), but topics deliberately reads content only —
      // a title like "시연실 출입기록" carries generic location/card-type
      // words ("시연실") shared by many different facts about the same
      // room, which would otherwise dilute this into a location-
      // proximity signal instead of a same-fact one (verified against a
      // real case: it made an unrelated fact about the same room and
      // person score as if it were the one actually being restated).
      actorIds: actorIdsMentionedIn(`${card.title} ${content}`),
      times: timeAnchors(content),
      topics: topicAnchors(content),
    });
  }
  for (const entry of timelineFacts) {
    // worldFact is the safe, spoiler-scrubbed public version of this beat
    // (see TimelineFactIndex) — the underlying actual_action is never
    // read here, same restriction every other public-facing surface in
    // this module already follows. actors is Master's own authored list
    // of who was involved, filtered to actual interview NPCs (an entry
    // can also name a key_figure/victim id, which isn't in npcs at all).
    profiles.push({
      id: entry.id,
      label: entry.time,
      actorIds: entry.actors.filter((actorId) => npcIds.has(actorId)),
      times: timeAnchors(entry.worldFact),
      topics: topicAnchors(entry.worldFact),
    });
  }
  return profiles;
}
