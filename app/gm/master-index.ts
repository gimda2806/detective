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
};

export type ContradictionStageIndex = {
  id: string;
  playerAction: string;
  release: string;
  mustNotRelease: string;
};

export type RedHerringIndex = {
  id: string;
  surfaceSuspicion: string;
  actualReason: string;
  howToClear: string;
  mustNotImply: string;
};

export type MasterIndex = {
  locations: Record<string, LocationRuleIndex>;
  npcs: Record<string, NpcKnowledgeIndex>;
  contradictionStages: ContradictionStageIndex[];
  redHerrings: RedHerringIndex[];
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

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
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
    };
  }

  const contradictionStages: ContradictionStageIndex[] = splitSubBlocks(
    sections.CONTRADICTION_STAGES || '',
  ).map((block) => ({
    id: block.id,
    playerAction: readField(block.lines, 'player_action'),
    release:
      readField(block.lines, 'scope') || readField(block.lines, 'release'),
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
  }));

  return { locations, npcs, contradictionStages, redHerrings };
}
