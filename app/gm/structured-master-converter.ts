// Converts the structured master JSON schema (case_identity/full_truth/
// actual_timeline/characters/locations/evidence/contradiction_stages/
// red_herrings/case_complete/final_deduction/ending_explanation — see
// scripts/case_master.schema.json) into the flat CaseData envelope +
// raw_text bracket format app/game.ts's validateUploadedCase() and
// app/gm/master-index.ts actually load and parse at runtime.
//
// This mirrors, as a reusable module, the one-off manual conversion done
// for CASE002-004 earlier in this session (verified there against the
// real buildMasterIndex()/buildEndingReveal() parser: correct location/
// npc/contradiction-stage/red-herring counts, no empty blocks). Doing it
// here instead of by hand means a case dropped into data/pending-cases/
// in this exact schema is playable on the very next deploy.

type StructuredMaster = {
  case_identity: Record<string, string | undefined>;
  opening_scene: { location_id: string; narrative: string };
  ending_scene?: { location_id: string; narrative: string };
  surface_incident?: string[];
  full_truth: Record<string, string | undefined>;
  actual_timeline?: Array<{
    id: string;
    time?: string;
    location?: string;
    actors?: string[];
    actual_action?: string;
    world_fact?: string;
  }>;
  characters?: Array<{
    id: string;
    name: string;
    role: string;
    present_location?: string;
    knows?: Array<{ fact_id: string; content: string }>;
    initial_claims?: Array<{
      claim_id: string;
      content: string;
      truth_status?: string;
    }>;
    initial_interview_range?: string[];
    hidden_until?: Array<{
      fact_or_claim_id: string;
      release_prerequisite: string;
      release_trigger: string;
    }>;
    knowledge_limits?: string[];
  }>;
  locations?: Array<{
    id: string;
    name: string;
    base_description?: string;
    observation_rules?: Array<{ action: string; result?: string }>;
    detail_rules?: Array<{
      action: string;
      requires?: string;
      release_evidence_id?: string;
      result?: string;
    }>;
  }>;
  evidence?: Array<{
    id: string;
    name: string;
    source_type?: string;
    found_at?: string;
    discovery_condition?: string;
    content?: string;
    proves?: string[];
    does_not_prove?: string[];
  }>;
  contradiction_stages?: Array<{
    id: string;
    target_character?: string;
    from_stage?: string;
    to_stage?: string;
    requires_heard_claim_ids?: string[];
    requires_presented_evidence_ids?: string[];
    player_action?: string;
    release?: { claim_or_fact_id?: string; scope?: string };
    must_not_release?: string[];
  }>;
  red_herrings?: Array<{
    id: string;
    surface_suspicion?: string;
    actual_reason?: string;
    lingering_thread?: string;
    how_to_clear?: string;
    must_not_imply?: string;
  }>;
  case_complete?: {
    required_established_facts?: string[];
    required_contradiction_stages?: string[];
    accusation_requirements?: {
      suspect?: string;
      method_fact?: string;
      motive_fact?: string;
    };
  };
  final_deduction: {
    responsible: string;
    method: string;
    motive: string;
    key_connection: string;
  };
  ending_explanation?: string[];
};

function normalizeParagraphs(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n\n');
}

function field(label: string, value: string | undefined): string {
  return `${label}: ${(value || '').replace(/\s*\n\s*/g, ' ').trim()}`;
}

function bulletList(label: string, items: string[] | undefined): string {
  if (!items || !items.length) return `${label}:`;
  return [`${label}:`, ...items.map((item) => `* ${item}`)].join('\n');
}

function buildCharacterBlock(
  ch: NonNullable<StructuredMaster['characters']>[number],
): string {
  const lines = [`[${ch.id}]`];
  lines.push(field('name', ch.name));
  lines.push(field('role', ch.role));
  if (ch.present_location) {
    lines.push(field('present_location', ch.present_location));
  }
  lines.push('knows:');
  for (const item of ch.knows || []) {
    lines.push(`* fact_id: ${item.fact_id}`);
    lines.push(field('content', item.content));
  }
  lines.push('initial_claims:');
  for (const item of ch.initial_claims || []) {
    lines.push(`* claim_id: ${item.claim_id}`);
    lines.push(field('content', item.content));
    lines.push(field('truth_status', item.truth_status));
  }
  lines.push(bulletList('initial_interview_range', ch.initial_interview_range));
  lines.push('hidden_until:');
  for (const item of ch.hidden_until || []) {
    lines.push(`* fact_or_claim_id: ${item.fact_or_claim_id}`);
    lines.push(field('release_prerequisite', item.release_prerequisite));
    lines.push(field('release_trigger', item.release_trigger));
  }
  lines.push(bulletList('knowledge_limits', ch.knowledge_limits));
  return lines.join('\n');
}

function buildLocationBlock(
  loc: NonNullable<StructuredMaster['locations']>[number],
): string {
  const lines = [`[${loc.id}]`];
  lines.push(field('name', loc.name));
  lines.push(field('base_description', loc.base_description));
  lines.push('observation_rules:');
  for (const rule of loc.observation_rules || []) {
    lines.push(`* action: ${rule.action}`);
    lines.push(field('result', rule.result));
  }
  lines.push('detail_rules:');
  for (const rule of loc.detail_rules || []) {
    lines.push(`* action: ${rule.action}`);
    lines.push(field('requires', rule.requires));
    lines.push(field('release_evidence_id', rule.release_evidence_id));
    lines.push(field('result', rule.result));
  }
  return lines.join('\n');
}

function buildEvidenceBlock(
  ev: NonNullable<StructuredMaster['evidence']>[number],
): string {
  const lines = [`[${ev.id}]`];
  lines.push(field('name', ev.name));
  lines.push(field('source_type', ev.source_type));
  lines.push(field('found_at', ev.found_at));
  lines.push(field('discovery_condition', ev.discovery_condition));
  lines.push(field('content', ev.content));
  lines.push(bulletList('proves', ev.proves));
  lines.push(bulletList('does_not_prove', ev.does_not_prove));
  return lines.join('\n');
}

function buildContradictionStageBlock(
  stage: NonNullable<StructuredMaster['contradiction_stages']>[number],
): string {
  const lines = [`[${stage.id}]`];
  lines.push(field('target_character', stage.target_character));
  lines.push(field('from_stage', stage.from_stage));
  lines.push(field('to_stage', stage.to_stage));
  lines.push(
    bulletList('requires_heard_claim_ids', stage.requires_heard_claim_ids),
  );
  lines.push(
    bulletList(
      'requires_presented_evidence_ids',
      stage.requires_presented_evidence_ids,
    ),
  );
  lines.push(field('player_action', stage.player_action));
  lines.push('release:');
  lines.push(`* claim_or_fact_id: ${stage.release?.claim_or_fact_id || ''}`);
  lines.push(field('scope', stage.release?.scope));
  lines.push(bulletList('must_not_release', stage.must_not_release));
  return lines.join('\n');
}

function buildRedHerringBlock(
  rh: NonNullable<StructuredMaster['red_herrings']>[number],
): string {
  const lines = [`[${rh.id}]`];
  lines.push(field('surface_suspicion', rh.surface_suspicion));
  lines.push(
    field(
      'actual_reason',
      rh.lingering_thread
        ? `${rh.actual_reason} ${rh.lingering_thread}`
        : rh.actual_reason,
    ),
  );
  lines.push(field('how_to_clear', rh.how_to_clear));
  lines.push(field('must_not_imply', rh.must_not_imply));
  return lines.join('\n');
}

function buildTimelineBlock(
  step: NonNullable<StructuredMaster['actual_timeline']>[number],
): string {
  const lines = [`[${step.id}]`];
  lines.push(field('time', step.time));
  lines.push(field('location', step.location));
  lines.push(field('actors', (step.actors || []).join(', ')));
  lines.push(field('actual_action', step.actual_action));
  if (step.world_fact) lines.push(field('world_fact', step.world_fact));
  return lines.join('\n');
}

function buildRawText(m: StructuredMaster): string {
  const sections: string[] = [];

  sections.push(
    '[CASE_IDENTITY]',
    field('case_id', m.case_identity.case_id),
    field('title', m.case_identity.title),
    field('title_ko', m.case_identity.title),
    field('genre', m.case_identity.genre),
    field('setting', m.case_identity.setting),
    field('detective_entry', m.case_identity.detective_entry),
    field('tone', m.case_identity.tone),
  );

  sections.push(
    '',
    '[OPENING_SCENE]',
    normalizeParagraphs(m.opening_scene.narrative),
  );

  sections.push(
    '',
    '[SURFACE_INCIDENT]',
    ...(m.surface_incident || []).map((line) => `* ${line}`),
  );

  sections.push(
    '',
    '[FULL_TRUTH]',
    field('responsible_character_id', m.full_truth.responsible_character_id),
    field('motive', m.full_truth.motive),
    field('method', m.full_truth.method),
    field('key_time_location', m.full_truth.key_time_location),
    field('cover_up', m.full_truth.cover_up),
    field('accomplice', m.full_truth.accomplice),
  );

  sections.push(
    '',
    '[ACTUAL_TIMELINE]',
    ...(m.actual_timeline || []).map(buildTimelineBlock),
  );

  sections.push(
    '',
    '[CHARACTERS]',
    ...(m.characters || []).map(buildCharacterBlock),
  );

  sections.push(
    '',
    '[LOCATIONS]',
    ...(m.locations || []).map(buildLocationBlock),
  );

  sections.push(
    '',
    '[EVIDENCE]',
    ...(m.evidence || []).map(buildEvidenceBlock),
  );

  sections.push(
    '',
    '[CONTRADICTION_STAGES]',
    ...(m.contradiction_stages || []).map(buildContradictionStageBlock),
  );

  sections.push(
    '',
    '[RED_HERRINGS]',
    ...(m.red_herrings || []).map(buildRedHerringBlock),
  );

  sections.push(
    '',
    '[CASE_COMPLETE]',
    field(
      'required_established_facts',
      (m.case_complete?.required_established_facts || []).join(', '),
    ),
    field(
      'required_contradiction_stages',
      (m.case_complete?.required_contradiction_stages || []).join(', '),
    ),
    field('suspect', m.case_complete?.accusation_requirements?.suspect),
    field('method_fact', m.case_complete?.accusation_requirements?.method_fact),
    field('motive_fact', m.case_complete?.accusation_requirements?.motive_fact),
  );

  sections.push(
    '',
    '[FINAL_DEDUCTION]',
    'answer:',
    `* 책임자: ${m.final_deduction.responsible}`,
    `* 수법: ${m.final_deduction.method.replace(/\s*\n\s*/g, ' ')}`,
    `* 동기: ${m.final_deduction.motive.replace(/\s*\n\s*/g, ' ')}`,
    `* 핵심 연결: ${m.final_deduction.key_connection.replace(/\s*\n\s*/g, ' ')}`,
  );

  sections.push(
    '',
    '[ENDING_EXPLANATION]',
    ...(m.ending_explanation || []).map((line, i) => `${i + 1}. ${line}`),
  );

  if (m.ending_scene) {
    sections.push(
      '',
      '[ENDING_SCENE]',
      normalizeParagraphs(m.ending_scene.narrative),
    );
  }

  return sections.join('\n');
}

// Returns null (rather than throwing) when the input doesn't look like
// this schema at all, so the bundled-case loader can skip a file that
// isn't actually a structured master without crashing the whole glob.
export function convertStructuredMaster(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as StructuredMaster;
  if (!m.case_identity?.case_id || !m.opening_scene || !m.final_deduction) {
    return null;
  }

  const rawText = buildRawText(m);

  const locations = (m.locations || []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    description: loc.base_description || '',
  }));

  const npcs = (m.characters || []).map((ch) => ({
    id: ch.id.replace(/^CH/, 'N'),
    name: ch.name,
    role: ch.role,
    initial_status: 'not_interviewed',
  }));

  const cards = (m.evidence || []).map((ev) => ({
    id: ev.id,
    title: ev.name,
    category: ev.source_type === 'testimony' ? 'testimony' : 'evidence',
    source: ev.found_at || '',
    condition: ev.discovery_condition || '',
    summary: ev.content || '',
    content: ev.content || '',
    proves_fact_ids: ev.proves || [],
    does_not_prove_fact_ids: ev.does_not_prove || [],
  }));

  return {
    case_id: m.case_identity.case_id,
    title: m.case_identity.title,
    status_label: '수사 중',
    opening_scene: m.opening_scene.location_id,
    public_intro: normalizeParagraphs(m.opening_scene.narrative),
    master: { raw_text: rawText },
    locations,
    npcs,
    cards,
  };
}
