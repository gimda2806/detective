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
    if (currentId) blocks.push({ id: currentId, body: buffer.join('\n').trim() });
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
    caseId: normalizeCaseId(readField(body, 'case_id') || readField(body, 'case_no')),
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
    evidenceIds: readBulletsAfter(block.body, 'requires_presented_evidence_ids'),
  }));
}

export function extractRedHerrings(sections) {
  const body = sections.RED_HERRINGS || '';
  return splitSubBlocks(body).map((block) => ({
    id: block.id,
    howToClear: readField(block.body, 'how_to_clear'),
  }));
}

export function extractHiddenReleases(sections) {
  const body = sections.CHARACTERS || '';
  const releases = [];
  for (const block of splitSubBlocks(body)) {
    const lines = block.body.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line.trim() === 'hidden_until:');
    if (startIndex === -1) continue;
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('release_condition:')) {
        releases.push({
          character: block.id,
          releaseCondition: trimmed.replace(/^release_condition:\s*/, '').trim(),
        });
      } else if (trimmed && !trimmed.startsWith('*') && /^[a-z_]+\s*:/.test(trimmed) && !trimmed.startsWith('fact_or_claim_id')) {
        break;
      }
    }
  }
  return releases;
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
  if (!sections.FINAL_DEDUCTION) errors.push('[FINAL_DEDUCTION] 섹션이 필요합니다.');

  if (contradictionStages.length < 3) {
    errors.push(
      `[CONTRADICTION_STAGES]는 최소 3단계가 필요합니다 (현재 ${contradictionStages.length}단계).`,
    );
  }
  const evidenceSets = contradictionStages.map((stage) =>
    stage.evidenceIds.slice().sort((a, b) => a.localeCompare(b)).join(','),
  );
  const uniqueEvidenceSets = new Set(evidenceSets.filter(Boolean));
  if (contradictionStages.length >= 2 && uniqueEvidenceSets.size < evidenceSets.filter(Boolean).length) {
    errors.push('CONTRADICTION_STAGES의 각 단계는 서로 다른 증거 조합을 요구해야 합니다.');
  }
  if (contradictionStages.some((stage) => !stage.evidenceIds.length)) {
    warnings.push('일부 CONTRADICTION_STAGES 단계에 requires_presented_evidence_ids가 없습니다.');
  }

  if (!redHerrings.length) {
    errors.push('[RED_HERRINGS]가 최소 1개 필요합니다 (조기 용의자 제외 시 남는 서브플롯).');
  }
  if (redHerrings.some((item) => !item.howToClear)) {
    errors.push('모든 RED_HERRINGS 항목에는 how_to_clear가 필요합니다.');
  }

  if (!hiddenReleases.length) {
    warnings.push('CHARACTERS에 hidden_until/release_condition이 하나도 없습니다.');
  }
  const shallow = hiddenReleases.filter(
    (item) => item.releaseCondition.length < 8,
  );
  if (shallow.length) {
    warnings.push(
      `release_condition이 너무 짧아 즉시 풀릴 위험이 있는 항목: ${shallow.map((item) => item.character).join(', ')}`,
    );
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
