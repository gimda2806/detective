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

// Retired: this used to strip a "은폐"/"위장" WORD out of a genre clause
// and keep the rest as a hashtag, on the theory that genre clauses were
// short, tag-worthy phrases with just one spoiler-marker word attached.
// In practice genre is the case's own solution summary (motive clause +
// disguised-cause-of-death clause), so stripping the marker word left the
// actual spoiler content behind it fully intact — e.g. "인슐린 조작 저혈당
// 쇼크사 위장" became the hashtag "#인슐린_조작_저혈당_쇼크사", which states
// outright how the murder was actually committed. Worse, some clauses
// spoil the solution with no marker word to strip at all (CASE010's genre
// opened with "감금치사", the hidden cause of death, plainly, no "위장"
// anywhere) — surface_incident for that case only ever said the victim was
// "found dead," so a keyword filter alone can never reliably tell a public
// surface fact from a still-secret one. See case_identity.tags below,
// which replaces this entirely: an author-provided list, not something
// mined out of prose written for a different purpose.
// A multi-word tag ("사제 관계" or the author's own "사제_관계" habit) used
// to render as one underscore-joined hashtag ("#사제_관계"). The UI shows
// each array entry as its own pill, so joining "전통_도자기_공방" into a
// single "#전통#도자기#공방" string still rendered as one cramped pill —
// splitting on spaces/underscores into separate array entries instead
// ("#전통", "#도자기", "#공방") gives each word its own pill, matching how
// hashtags actually read elsewhere.
function hashtagWords(tag: string): string[] {
  return tag
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => `#${word}`);
}

function deriveCaseTags(
  caseIdentity: StructuredMaster['case_identity'],
): string[] {
  if (!Array.isArray(caseIdentity.tags)) return [];
  return Array.from(
    new Set(
      caseIdentity.tags
        .map((tag) => tag.trim().replace(/^#+/, ''))
        .filter(Boolean)
        .flatMap(hashtagWords),
    ),
  ).slice(0, 4);
}

type StructuredMaster = {
  case_identity: Record<string, string | undefined> & { tags?: string[] };
  relationships?: Array<{
    id: string;
    between: string[];
    nature: string;
    public_face: string;
    private_strain: string;
    surfaces_when: string;
  }>;
  opening_scene: {
    location_id: string;
    detective_entry_time?: string;
    narrative: string;
  };
  ending_scene?: { location_id: string; narrative: string };
  surface_incident?: string[];
  key_figures?: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
  }>;
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
    knows?: Array<{ fact_id: string; content: string; source?: string }>;
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
    pressure_responses?: string[];
    comic_tell?: string;
    voice_profile?: {
      formality_register?: string;
      sentence_length_tendency?: string;
      verbal_tic?: string;
    };
  }>;
  locations?: Array<{
    id: string;
    name: string;
    access?: string;
    access_level?: 'open' | 'restricted' | 'sealed';
    connects_to?: string[];
    base_description?: string;
    observation_rules?: Array<{
      action: string;
      result?: string;
      release_fact_id?: string;
    }>;
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
    suspicion_deepener?: string;
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
    // 이 인물이 이걸 어떻게 알게 됐는가(직접 목격/직접 행동/전해 들음…).
    // 프롬프트의 source-confidence 규칙이 문면에 "see knows[].source"라고
    // 적어 두고 있는데, 정작 이 값이 raw_text에 실리지 않아 모델 손에
    // 온 적이 없었다 — voice_profile과 같은 사고다.
    if (item.source) lines.push(field('source', item.source));
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
  lines.push(bulletList('pressure_responses', ch.pressure_responses));
  if (ch.comic_tell) lines.push(field('comic_tell', ch.comic_tell));
  // 이 인물이 어떻게 말하는가. 여기 안 실으면 master-index가 못 읽고,
  // 런타임은 NPC id를 해시해서 말투를 배정한다 — 마스터가 공들여 적어 둔
  // "오빠 얘기가 나오면 말이 길어진다" 같은 것이 통째로 버려진다.
  if (ch.voice_profile?.formality_register) {
    lines.push(field('voice_formality', ch.voice_profile.formality_register));
  }
  if (ch.voice_profile?.sentence_length_tendency) {
    lines.push(
      field('voice_sentence_length', ch.voice_profile.sentence_length_tendency),
    );
  }
  if (ch.voice_profile?.verbal_tic) {
    lines.push(field('voice_tic', ch.voice_profile.verbal_tic));
  }
  return lines.join('\n');
}

function buildLocationBlock(
  loc: NonNullable<StructuredMaster['locations']>[number],
): string {
  const lines = [`[${loc.id}]`];
  lines.push(field('name', loc.name));
  if (loc.access) lines.push(field('access', loc.access));
  lines.push(field('base_description', loc.base_description));
  lines.push('observation_rules:');
  for (const rule of loc.observation_rules || []) {
    lines.push(`* action: ${rule.action}`);
    // release_fact_id was dropped here, so the runtime never learned which
    // fact a location's free look establishes — and 113 of 253 cases gate an
    // NPC's own knowledge on exactly that id (see isHiddenUntilPrerequisiteMet).
    lines.push(field('release_fact_id', rule.release_fact_id));
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
  if (rh.suspicion_deepener) {
    lines.push(field('suspicion_deepener', rh.suspicion_deepener));
  }
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

  // 탐정이 현장에 들어온 시각. 이 사건의 "지금"이라, 대사 속 오늘·어제·
  // 어젯밤이 전부 이 값을 기준으로 읽힌다. raw_text에 실어야 master-index가
  // 파싱해 매 턴 GM에게 넘길 수 있다.
  // 인물 사이의 관계. 여기 안 실으면 master-index가 못 읽고, 못 읽으면
  // GM에게 안 간다 — pressure_responses/comic_tell이 정확히 그렇게 스키마에만
  // 있고 런타임에는 없는 채로 오래 있었다.
  if (m.relationships?.length) {
    sections.push('', '[RELATIONSHIPS]');
    for (const rel of m.relationships) {
      sections.push(
        `[${rel.id}]`,
        field('between', (rel.between || []).join(', ')),
        field('nature', rel.nature),
        field('public_face', rel.public_face),
        field('private_strain', rel.private_strain),
        field('surfaces_when', rel.surfaces_when),
      );
    }
  }

  sections.push(
    '',
    '[DETECTIVE_ENTRY_TIME]',
    m.opening_scene.detective_entry_time || '',
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

  // key_figures (the victim, or another non-interviewable figure named in
  // actual_timeline) was previously never written into raw_text at all —
  // the schema requires authors to fill it in, but this converter simply
  // never read it, so the model had no clean, dedicated, explicitly-public
  // source for a victim's name/role/status and had to rely on it turning
  // up incidentally inside FULL_TRUTH prose (or not at all). A real user
  // reported never learning the victim's role from the opening scene as a
  // direct result of this gap.
  sections.push(
    '',
    '[KEY_FIGURES]',
    ...(m.key_figures || []).map((figure) =>
      [
        `* id: ${figure.id}`,
        `  name: ${figure.name}`,
        `  role: ${figure.role}`,
        `  status: ${figure.status}`,
      ].join('\n'),
    ),
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

// access is free prose ("제한적 출입 (원장과 운영 매니저만 열쇠 소지)") because
// that's what a GM narrates from — but a map UI can't parse prose into a
// badge color. access_level is the same information as a fixed enum for
// that UI. Almost no existing case authors it explicitly (it's brand new),
// so this derives a reasonable default from access's own wording rather
// than leaving every pre-existing location stuck at a hardcoded "open" —
// text mentioning a post-incident lockdown/control designation reads as
// sealed, anything gated by permission/a key/a role reads as restricted,
// and anything else (explicitly open, or simply unstated) defaults open.
function deriveAccessLevel(access: string): 'open' | 'restricted' | 'sealed' {
  if (/통제\s*구역|봉쇄|출입\s*금지/.test(access)) return 'sealed';
  if (/제한|허가|열쇠|소지|권한|출입증/.test(access)) return 'restricted';
  return 'open';
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
    access_level: loc.access_level || deriveAccessLevel(loc.access || ''),
    connects_to: loc.connects_to || [],
  }));

  const npcs = (m.characters || []).map((ch) => ({
    id: ch.id.replace(/^CH/, 'N'),
    name: ch.name,
    role: ch.role,
    initial_status: 'not_interviewed',
    present_location: ch.present_location || '',
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
    key_figures: m.key_figures || [],
    master_tags: deriveCaseTags(m.case_identity),
  };
}
