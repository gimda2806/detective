// Parses the CASE901-style master text format: top-level `[SECTION]`
// headers with NO closing tags (unlike app/game.ts's parseTxtMaster, which
// requires `[/SECTION]` and cannot read this format), each running until
// the next top-level header or end of file. Some sections contain nested
// `[XXNN]` sub-blocks (characters, locations, evidence, contradiction
// stages, red herrings, timeline steps).
//
// This module only extracts what the app actually needs structurally
// (case_id/title/opening intro, and locations/npcs/cards for the UI and
// available_codes) plus generation-time quality checks. The rest of the
// master (timeline, characters' hidden_until, contradiction stages, red
// herrings, final deduction) is kept verbatim in `master.raw_text` and
// handed to the GM model as-is — app/game.ts's validateUploadedCase does
// not require it to be structurally parsed.

const TOP_HEADER_RE = /^\[([A-Z_]+)\]\s*$/;
const SUB_HEADER_RE = /^\[([A-Z]+[0-9]+)\]\s*$/;

// The full, ordered set of top-level sections a master document has —
// used both to validate a repair-issue's section attribution and to
// splice a partially-regenerated section back into the full text (see
// replaceTopSection below).
export const TOP_LEVEL_SECTIONS = [
  'CASE_IDENTITY',
  'OPENING_SCENE',
  'SURFACE_INCIDENT',
  'FULL_TRUTH',
  'ACTUAL_TIMELINE',
  'CHARACTERS',
  'LOCATIONS',
  'EVIDENCE',
  'CONTRADICTION_STAGES',
  'RED_HERRINGS',
  'CASE_COMPLETE',
  'FINAL_DEDUCTION',
  'ENDING_EXPLANATION',
];

// Replaces one top-level section's body in `text` with `newBody`,
// leaving every other section (and their exact original formatting)
// untouched. Used for partial regeneration: only the sections a
// rejection actually implicates get re-drafted, instead of the whole
// document. Returns null if `sectionName` isn't present in `text`.
export function replaceTopSection(text, sectionName, newBody) {
  const lines = text.split(/\r?\n/);
  const output = [];
  let found = false;
  let i = 0;

  while (i < lines.length) {
    const match = lines[i].match(TOP_HEADER_RE);
    if (match && match[1] === sectionName) {
      found = true;
      output.push(lines[i]);
      i += 1;
      while (i < lines.length && !TOP_HEADER_RE.test(lines[i])) i += 1;
      output.push(newBody.trim());
    } else {
      output.push(lines[i]);
      i += 1;
    }
  }

  return found ? output.join('\n') : null;
}

export function splitTopSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = null;
  let buffer = [];

  const flush = () => {
    if (current) sections[current] = buffer.join('\n').trim();
  };

  for (const line of lines) {
    const match = line.match(TOP_HEADER_RE);
    if (match) {
      flush();
      current = match[1];
      buffer = [];
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

export function splitSubBlocks(body) {
  const lines = body.split(/\r?\n/);
  const blocks = [];
  let currentId = null;
  let buffer = [];

  const flush = () => {
    if (currentId)
      blocks.push({ id: currentId, body: buffer.join('\n').trim() });
  };

  for (const line of lines) {
    const match = line.trim().match(SUB_HEADER_RE);
    if (match) {
      flush();
      currentId = match[1];
      buffer = [];
    } else if (currentId) {
      buffer.push(line);
    }
  }
  flush();

  return blocks;
}

// Reads the first `key: value` line for a given key from a block body,
// ignoring bullet (`* ...`) lines and stopping at the next flat key.
export function readField(body, key) {
  const re = new RegExp(`^${key}\\s*:\\s*(.*)$`);
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(re);
    if (match) return match[1].trim();
  }
  return '';
}

// Reads bullet lines (`* ...`) immediately following a `key:` line, up to
// the next flat `key:` line or another bullet-introducing key.
export function readBulletsAfter(body, key) {
  const lines = body.split(/\r?\n/);
  const startRe = new RegExp(`^${key}\\s*:\\s*$`);
  const items = [];
  let collecting = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!collecting) {
      if (startRe.test(trimmed)) collecting = true;
      continue;
    }
    if (trimmed === '') continue;
    if (trimmed.startsWith('*')) {
      items.push(trimmed.replace(/^\*\s*/, '').trim());
      continue;
    }
    break;
  }

  return items;
}

function normalizeCaseId(value) {
  const compact = (value || '').trim().replace(/[^0-9A-Za-z_-]/g, '');
  if (/^CASE/i.test(compact)) return compact.toUpperCase();
  return compact ? `CASE${compact.toUpperCase()}` : '';
}

export function extractIdentity(sections) {
  const body = sections.CASE_IDENTITY || '';
  return {
    caseId: normalizeCaseId(
      readField(body, 'case_id') || readField(body, 'case_no'),
    ),
    titleKo: readField(body, 'title_ko') || readField(body, 'title'),
    genre: readField(body, 'genre'),
    setting: readField(body, 'setting'),
  };
}

export function extractOpeningIntro(sections) {
  const body = sections.OPENING_SCENE || '';
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function extractLocations(sections) {
  const body = sections.LOCATIONS || '';
  return splitSubBlocks(body).map((block) => {
    const description =
      readBulletsAfter(block.body, 'base_description').join(' ') ||
      readField(block.body, 'base_description');
    return {
      id: block.id,
      name: readField(block.body, 'name') || block.id,
      description,
    };
  });
}

export function extractNpcs(sections) {
  const body = sections.CHARACTERS || '';
  return splitSubBlocks(body)
    .filter((block) => /^CH[0-9]+$/.test(block.id))
    .map((block) => ({
      id: block.id.replace(/^CH/, 'N'),
      name: readField(block.body, 'name') || block.id,
      role: readField(block.body, 'role') || '관계자',
      initial_status: 'not_interviewed',
    }));
}

export function extractTimeline(sections) {
  const body = sections.ACTUAL_TIMELINE || '';
  return splitSubBlocks(body)
    .filter((block) => /^T[0-9]+$/.test(block.id))
    .map((block) => ({
      id: block.id,
      actors: readField(block.body, 'actors')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      actualAction: readField(block.body, 'actual_action'),
      worldFact: readField(block.body, 'world_fact'),
    }));
}

// An atomic timeline entry is "one actor, one action, one moment" — that's
// what lets app/game.ts's GM prompt (and any future hidden_until/
// world_fact lookup) point at a single T0x and get one unambiguous fact.
// A step whose actual_action or world_fact names two or more of its own
// listed actors is really two people's actions narrated as one sentence
// (e.g. "강도윤이 발표를 시작하고 문예진이 자료를 조작한다") and should be
// split into separate T0x entries instead.
export function findTimelineActorMerges(sections) {
  const idToName = extractCharacterIdNameMap(sections);
  const timeline = extractTimeline(sections);
  const merges = [];

  for (const step of timeline) {
    const actorNames = step.actors
      .map((chId) => idToName.get(chId))
      .filter(Boolean);
    if (actorNames.length < 2) continue;

    for (const field of ['actualAction', 'worldFact']) {
      const text = step[field];
      if (!text) continue;
      const mentioned = actorNames.filter((name) => text.includes(name));
      if (mentioned.length >= 2) {
        merges.push({ id: step.id, field, actors: mentioned, text });
      }
    }
  }

  return merges;
}

export function extractCards(sections) {
  const body = sections.EVIDENCE || '';
  return splitSubBlocks(body).map((block) => ({
    id: block.id,
    title: readField(block.body, 'name') || block.id,
    category: 'evidence',
    source: readField(block.body, 'found_at'),
    condition: readField(block.body, 'discovery_condition'),
    summary: readField(block.body, 'content'),
  }));
}

export function extractContradictionStages(sections) {
  const body = sections.CONTRADICTION_STAGES || '';
  return splitSubBlocks(body).map((block) => ({
    id: block.id,
    targetCharacter: readField(block.body, 'target_character'),
    evidenceIds: readBulletsAfter(
      block.body,
      'requires_presented_evidence_ids',
    ),
  }));
}

export function extractRedHerrings(sections) {
  const body = sections.RED_HERRINGS || '';
  return splitSubBlocks(body).map((block) => ({
    id: block.id,
    howToClear: readField(block.body, 'how_to_clear'),
  }));
}

// Each hidden_until entry names the fact_or_claim_id it releases, then a
// release_prerequisite (an ID that must already be established) and a
// release_trigger (the ID presented/asked to actually unlock it) — two
// separate flat fields rather than one free-text release_condition, so a
// one-step or OR'd condition has nowhere to be written. See
// validateMasterText's HIDDEN_UNTIL_SCHEMA checks below.
export function extractHiddenReleases(sections) {
  const body = sections.CHARACTERS || '';
  const releases = [];
  for (const block of splitSubBlocks(body)) {
    const lines = block.body.split(/\r?\n/);
    const startIndex = lines.findIndex(
      (line) => line.trim() === 'hidden_until:',
    );
    if (startIndex === -1) continue;

    let currentFactId = '';
    let prerequisite = '';
    let trigger = '';
    const flush = () => {
      if (!currentFactId) return;
      releases.push({
        character: block.id,
        factId: currentFactId,
        prerequisite,
        trigger,
      });
    };

    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const trimmed = lines[i].trim();
      const factMatch = trimmed.match(/^\*?\s*fact_or_claim_id\s*:\s*(.+)$/);
      if (factMatch) {
        flush();
        currentFactId = factMatch[1].trim();
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
  }
  return releases;
}

// Maps each [CH0x] id to the name registered for it in [CHARACTERS] —
// this is the name app/game.ts's conversationTarget() will actually show
// the player (via selectedCase.npcs), independent of what other sections
// call that character.
export function extractCharacterIdNameMap(sections) {
  const body = sections.CHARACTERS || '';
  const map = new Map();
  for (const block of splitSubBlocks(body)) {
    if (!/^CH[0-9]+$/.test(block.id)) continue;
    const name = readField(block.body, 'name');
    if (name) map.set(block.id, name);
  }
  return map;
}

// Finds "CH04 차유라"-style id+name pairs in FULL_TRUTH and CASE_COMPLETE
// (both sections state the responsible character that way in the
// reference format) and flags any pair whose name doesn't match what
// [CHARACTERS] registered for that id — a live symptom of this: a
// generated case whose narrative consistently called a character by one
// name while an earlier draft's name lingered in the CHARACTERS block
// caused app/game.ts to make that phantom name speak mid-interview,
// since it reads target.name straight from the public npc list.
export function findNpcNameMismatches(sections) {
  const idToName = extractCharacterIdNameMap(sections);
  const mismatches = [];
  const pairPattern = /CH([0-9]+)\s+([^\s,.()\n]+)/g;

  for (const sectionName of ['FULL_TRUTH', 'CASE_COMPLETE']) {
    const body = sections[sectionName] || '';
    for (const match of body.matchAll(pairPattern)) {
      const chId = `CH${match[1]}`;
      const mentionedName = match[2];
      const registeredName = idToName.get(chId);
      if (registeredName && registeredName !== mentionedName) {
        mismatches.push({
          section: sectionName,
          characterId: chId,
          registeredName,
          mentionedName,
        });
      }
    }
  }

  return mismatches;
}

// Every claim/fact id actually *defined* in the master: fact_or_claim_id
// (initial hidden facts under CHARACTERS' hidden_until, bulleted or
// flat), claim_or_fact_id (facts released by a CONTRADICTION_STAGES
// stage), and claim_id in its bulleted form only (initial claims under a
// character's initial_claims — the same key name gets reused later as a
// *flat*, unbulleted reference under requires_comparison, which is
// deliberately excluded here so a corrupted reference can't "define" its
// own typo and hide it from repair), plus every [E0x] evidence id
// defined in [EVIDENCE]. This is the registry repairReferencedIds()
// checks bullet-list references against.
function collectDefinedIds(text) {
  const defined = new Set();
  for (const match of text.matchAll(
    /^\s*\*?\s*(?:fact_or_claim_id|claim_or_fact_id)\s*:\s*([A-Za-z0-9-]+)\s*$/gm,
  )) {
    defined.add(match[1]);
  }
  for (const match of text.matchAll(
    /^\s*\*\s*claim_id\s*:\s*([A-Za-z0-9-]+)\s*$/gm,
  )) {
    defined.add(match[1]);
  }
  for (const match of text.matchAll(/^\[(E[0-9]+)\]\s*$/gm)) {
    defined.add(match[1]);
  }
  return defined;
}

// Fixes the exact class of error a generation run just hit in practice:
// a bullet-list ID reference (requires_heard_claim_ids,
// requires_presented_evidence_ids, requires_comparison's evidence_ids/
// claim_id) written with a single-digit suffix ("S-CH04-1") when the id
// is actually defined with a zero-padded one ("S-CH04-01"). Deliberately
// narrow: only zero-pads a trailing single digit (works for hyphenated
// claim/fact ids and plain evidence ids like "E2" -> "E02" alike), and
// only rewrites a reference when the padded form is a real defined id —
// it never guesses at a "nearest" id, since a wrong silent guess
// (pointing a contradiction stage at the wrong fact) is worse than
// leaving the typo for validateMasterText to catch and repair-and-retry.
// Returns null both when nothing can be fixed *and* when the id is
// already correct — callers should treat either as "no rewrite needed".
function zeroPadIfDefined(id, defined) {
  if (defined.has(id)) return null;
  const padded = id.replace(/(\D)(\d)$/, '$10$2');
  return defined.has(padded) ? padded : null;
}

const ID_TOKEN = '[A-Za-z][A-Za-z0-9-]*\\d';

export function repairReferencedIds(text) {
  const defined = collectDefinedIds(text);
  let fixCount = 0;

  let repaired = text.replace(
    new RegExp(`^(\\s*\\*\\s*)(${ID_TOKEN})(\\s*)$`, 'gm'),
    (line, prefix, id, trailingSpace) => {
      const fixed = zeroPadIfDefined(id, defined);
      if (!fixed) return line;
      fixCount += 1;
      return `${prefix}${fixed}${trailingSpace}`;
    },
  );

  // Flat `claim_id: S-CH04-1` reference lines inside requires_comparison
  // blocks (as opposed to the bulleted requires_heard_claim_ids form
  // above).
  repaired = repaired.replace(
    new RegExp(`^(\\s*claim_id\\s*:\\s*)(${ID_TOKEN})(\\s*)$`, 'gm'),
    (line, prefix, id, trailingSpace) => {
      const fixed = zeroPadIfDefined(id, defined);
      if (!fixed) return line;
      fixCount += 1;
      return `${prefix}${fixed}${trailingSpace}`;
    },
  );

  // Comma-separated `evidence_ids: E2, E4` reference lines, also inside
  // requires_comparison blocks.
  repaired = repaired.replace(
    /^(\s*evidence_ids\s*:\s*)(.+)$/gm,
    (line, prefix, idList) => {
      const fixedList = idList
        .split(',')
        .map((raw) => {
          const id = raw.trim();
          const fixed = zeroPadIfDefined(id, defined);
          if (!fixed) return raw;
          fixCount += 1;
          return raw.replace(id, fixed);
        })
        .join(',');
      return `${prefix}${fixedList}`;
    },
  );

  return { text: repaired, fixCount };
}

// Structural checks mirroring what app/game.ts's validateUploadedCase
// requires (case_id pattern, title, opening_scene present among
// locations, non-empty locations/npcs, cards needing id+title+condition),
// plus the pacing directives for generated cases: enough contradiction
// stages with distinct evidence per stage, red herrings that actually
// resolve, and indirect (not immediately obvious) hidden-fact releases.
export function validateMasterText(text) {
  const errors = [];
  const warnings = [];

  if (!/^\[CASE_IDENTITY\]\s*$/m.test(text)) {
    errors.push('[CASE_IDENTITY] 섹션이 없습니다.');
    return { errors, warnings };
  }

  const sections = splitTopSections(text);
  const identity = extractIdentity(sections);
  const openingIntro = extractOpeningIntro(sections);
  const locations = extractLocations(sections);
  const npcs = extractNpcs(sections);
  const cards = extractCards(sections);
  const contradictionStages = extractContradictionStages(sections);
  const redHerrings = extractRedHerrings(sections);
  const hiddenReleases = extractHiddenReleases(sections);

  if (!/^CASE[0-9A-Z_-]{1,24}$/.test(identity.caseId)) {
    errors.push('case_id는 CASE로 시작하는 영문/숫자 코드여야 합니다.');
  }
  if (!identity.titleKo) errors.push('title_ko(또는 title)가 필요합니다.');
  if (!openingIntro) errors.push('[OPENING_SCENE] 본문이 비어 있습니다.');
  if (!locations.length) errors.push('[LOCATIONS] 하위 블록이 필요합니다.');
  if (locations.some((item) => !item.id || !item.name)) {
    errors.push('모든 location에는 id와 name이 필요합니다.');
  }
  if (!npcs.length) errors.push('[CHARACTERS] 하위 CH 블록이 필요합니다.');
  if (npcs.some((item) => !item.name || !item.role)) {
    errors.push('모든 캐릭터에는 name과 role이 필요합니다.');
  }
  if (!cards.length) errors.push('[EVIDENCE] 하위 E 블록이 필요합니다.');
  if (cards.some((item) => !item.title || !item.condition)) {
    errors.push('모든 증거에는 name과 discovery_condition이 필요합니다.');
  }
  if (!sections.FULL_TRUTH) errors.push('[FULL_TRUTH] 섹션이 필요합니다.');
  if (!sections.FINAL_DEDUCTION)
    errors.push('[FINAL_DEDUCTION] 섹션이 필요합니다.');

  for (const mismatch of findNpcNameMismatches(sections)) {
    errors.push(
      `NPC_NAME_MISMATCH: ${mismatch.characterId}는 [CHARACTERS]에 "${mismatch.registeredName}"로 등록됐지만 ` +
        `[${mismatch.section}]에서는 "${mismatch.mentionedName}"로 불립니다. 유령 이름이 플레이 중 등장할 수 있습니다.`,
    );
  }

  for (const merge of findTimelineActorMerges(sections)) {
    errors.push(
      `TIMELINE_NARRATIVE_STYLE: [${merge.id}]의 ${merge.field === 'actualAction' ? 'actual_action' : 'world_fact'}에 ` +
        `${merge.actors.join(', ')} 두 인물 이상의 행동이 한 항목에 섞여 있습니다 ("${merge.text}"). ` +
        `한 항목에는 한 인물의 한 행동만 담고, 나머지는 별도 T번호로 분리하세요.`,
    );
  }

  if (contradictionStages.length < 3) {
    errors.push(
      `[CONTRADICTION_STAGES]는 최소 3단계가 필요합니다 (현재 ${contradictionStages.length}단계).`,
    );
  }
  const evidenceSets = contradictionStages.map((stage) =>
    stage.evidenceIds
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .join(','),
  );
  const uniqueEvidenceSets = new Set(evidenceSets.filter(Boolean));
  if (
    contradictionStages.length >= 2 &&
    uniqueEvidenceSets.size < evidenceSets.filter(Boolean).length
  ) {
    errors.push(
      'CONTRADICTION_STAGES의 각 단계는 서로 다른 증거 조합을 요구해야 합니다.',
    );
  }
  if (contradictionStages.some((stage) => !stage.evidenceIds.length)) {
    warnings.push(
      '일부 CONTRADICTION_STAGES 단계에 requires_presented_evidence_ids가 없습니다.',
    );
  }

  if (!redHerrings.length) {
    errors.push(
      '[RED_HERRINGS]가 최소 1개 필요합니다 (조기 용의자 제외 시 남는 서브플롯).',
    );
  }
  if (redHerrings.some((item) => !item.howToClear)) {
    errors.push('모든 RED_HERRINGS 항목에는 how_to_clear가 필요합니다.');
  }

  if (!hiddenReleases.length) {
    warnings.push('CHARACTERS에 hidden_until 항목이 하나도 없습니다.');
  }
  for (const item of hiddenReleases) {
    if (!item.prerequisite || !item.trigger) {
      errors.push(
        `HIDDEN_UNTIL_SCHEMA: ${item.character}의 ${item.factId}에는 release_prerequisite와 release_trigger가 모두 필요합니다.`,
      );
      continue;
    }
    if (item.prerequisite === item.trigger) {
      errors.push(
        `HIDDEN_UNTIL_SCHEMA: ${item.character}의 ${item.factId}는 release_prerequisite와 release_trigger가 같은 ID("${item.prerequisite}")입니다. 선행 조건과 최종 트리거는 서로 다른 ID여야 합니다.`,
      );
    }
  }

  return {
    errors,
    warnings,
    caseId: identity.caseId,
    title: identity.titleKo,
    openingIntro,
    locations,
    npcs,
    cards,
  };
}

// Builds the JSON envelope accepted by app/game.ts's uploadCaseMaster
// (the JSON branch, validateUploadedCase): keeps the full master text
// verbatim in master.raw_text so the GM prompt loses nothing, and only
// lifts locations/npcs/cards out for the UI and available_codes.
export function buildUploadEnvelope(masterText) {
  const parsed = validateMasterText(masterText);
  if (parsed.errors.length) {
    throw new Error(`마스터 검증 실패: ${parsed.errors.join(' ')}`);
  }

  return {
    case_id: parsed.caseId,
    title: parsed.title,
    status_label: '수사 중',
    opening_scene: parsed.locations[0].id,
    public_intro: parsed.openingIntro,
    master: { raw_text: masterText },
    locations: parsed.locations,
    npcs: parsed.npcs,
    cards: parsed.cards,
  };
}
