// 사건 봉투(CaseData)의 정의와 검증 한 벌.
//
// game.ts 안에 있던 것을 그대로 옮겨왔다. 옮긴 이유는 하나다 — 빌드 때
// scripts/build-case-assets.ts가 307건의 마스터를 변환·검증해서
// public/cases/ 아래 정적 에셋으로 떨궈야 하는데, game.ts는 최상위에서
// cloudflare:workers의 env를 잡으므로 빌드 스크립트가 불러올 수 없다.
//
// 그래서 "봉투를 만들고 검사하는 코드"만 여기로 내렸다. 런타임(game.ts)과
// 빌드 스크립트가 같은 함수를 쓴다 — 요약·태그를 뽑는 규칙이 두 벌로
// 갈라지면 목록 화면과 실제 사건이 서로 다른 말을 하게 된다.

export type CaseLocation = {
  id: string;
  name: string;
  description: string;
  access_level?: 'open' | 'restricted' | 'sealed';
  connects_to?: string[];
};

export type CaseNpc = {
  id: string;
  name: string;
  role: string;
  initial_status: string;
  present_location?: string;
};

export type CaseCard = {
  id: string;
  title: string;
  category: string;
  source: string;
  condition: string;
  summary: string;
  content?: string;
  proves_fact_ids?: string[];
  does_not_prove_fact_ids?: string[];
};

export type CaseKeyFigure = {
  id: string;
  name: string;
  role: string;
  status: string;
};

export type CaseData = {
  case_id: string;
  master_version?: string;
  title: string;
  status_label: string;
  opening_scene: string;
  public_intro: string;
  master: Record<string, unknown>;
  locations: CaseLocation[];
  npcs: CaseNpc[];
  cards: CaseCard[];
  key_figures?: CaseKeyFigure[];
  information_catalog?: unknown[];
  final_deduction?: Record<string, unknown>;
  master_tags?: string[];
  // 이 사건에 아직 손볼 것이 남았는가 — 빌드가 한 번 판정해 실어 둔다.
  // masterFormatWarnings(raw_text만 본다)에 구조화 마스터를 봐야 아는 것
  // (관계의 모양, 레드헤링이 카드로 풀리는지)을 더한 한 벌이고, 목록의
  // '수사 가능' 라벨과 사건 화면의 경고가 이것을 같이 읽는다. 빌드를
  // 거치지 않은 D1 업로드분에는 없으므로 런타임이 좁은 쪽으로 떨어진다.
  format_warnings?: string[];
};

export function firstNonEmpty(values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || '';
}

// A multi-word tag rendered as one underscore-joined hashtag reads as a
// single long word; the UI shows each array entry as its own pill, so
// splitting on spaces/underscores into separate entries instead ("#외곽",
// "#산업단지") gives each word its own pill rather than one cramped
// multi-hash string.
export function hashtagWords(value: string): string[] {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => `#${word}`);
}

export function nonSpoilerTags(values: Array<string | undefined>) {
  const forbidden =
    /범인|실행자|동기|목적|진범|은닉|위조|조작자|정답|수법|WHO|WHY|HOW|WHEN/i;

  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string =>
          Boolean(value && !forbidden.test(value)),
        )
        .flatMap(hashtagWords),
    ),
  ).slice(0, 4);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function getStringField(
  data: Record<string, unknown>,
  key: string,
  fallback = '',
) {
  const value = data[key];
  return typeof value === 'string' ? value.trim() : fallback;
}

export function getStringArrayField(
  data: Record<string, unknown>,
  key: string,
) {
  const value = data[key];
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : [];
}

export function caseTagsFromData(caseData: CaseData) {
  const directTags = (caseData as CaseData & { master_tags?: unknown })
    .master_tags;
  if (Array.isArray(directTags)) {
    return directTags.filter(
      (item): item is string => typeof item === 'string',
    );
  }

  const identity = isObject(caseData.master.identity)
    ? (caseData.master.identity as Record<string, string>)
    : {};

  return nonSpoilerTags([
    identity.difficulty,
    identity.primary_setting,
    identity.case_type,
    identity.estimated_play_time,
    caseData.master_version,
  ]);
}

export function validateUploadedCase(raw: unknown): {
  caseData?: CaseData;
  summary?: string;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { errors: ['JSON 최상위 값은 객체여야 합니다.'] };
  }

  const caseId = getStringField(raw, 'case_id').toUpperCase();
  const title = getStringField(raw, 'title');
  const statusLabel = getStringField(raw, 'status_label', '수사 중');
  const openingScene = getStringField(raw, 'opening_scene');
  const publicIntro = firstNonEmpty([
    getStringField(raw, 'opening_drama'),
    getStringField(raw, 'dramatic_intro'),
    getStringField(raw, 'case_opening'),
    getStringField(raw, 'public_intro'),
  ]);
  const summary =
    getStringField(raw, 'summary') ||
    publicIntro.slice(0, 90) ||
    '업로드된 사건';

  if (!/^CASE[0-9A-Z_-]{1,24}$/.test(caseId)) {
    errors.push('case_id는 CASE로 시작하는 영문/숫자 코드여야 합니다.');
  }
  if (!title) errors.push('title이 필요합니다.');
  if (!openingScene) errors.push('opening_scene이 필요합니다.');
  if (!publicIntro) errors.push('public_intro가 필요합니다.');
  if (!isObject(raw.master)) errors.push('master 객체가 필요합니다.');
  if (!Array.isArray(raw.locations) || !raw.locations.length) {
    errors.push('locations 배열이 필요합니다.');
  }
  if (!Array.isArray(raw.npcs) || !raw.npcs.length) {
    errors.push('npcs 배열이 필요합니다.');
  }
  if (!Array.isArray(raw.cards)) {
    errors.push('cards 배열이 필요합니다.');
  }

  // access_level/connects_to are optional (older/legacy uploads never had
  // them) — an invalid or missing access_level falls back to 'open', and
  // connects_to drops any id that isn't actually another location in this
  // same case, so a typo or a legacy case with neither field never breaks
  // upload or blocks the map UI from rendering something reasonable.
  const VALID_ACCESS_LEVELS = new Set(['open', 'restricted', 'sealed']);
  const rawLocationObjects = Array.isArray(raw.locations)
    ? raw.locations.filter(isObject)
    : [];
  const locationIds = new Set(
    rawLocationObjects.map((item) => getStringField(item, 'id')),
  );
  const locations = rawLocationObjects.map((item) => {
    const accessLevel = getStringField(item, 'access_level');
    return {
      id: getStringField(item, 'id'),
      name: getStringField(item, 'name'),
      description: getStringField(item, 'description'),
      access_level: (VALID_ACCESS_LEVELS.has(accessLevel)
        ? accessLevel
        : 'open') as 'open' | 'restricted' | 'sealed',
      connects_to: getStringArrayField(item, 'connects_to').filter((id) =>
        locationIds.has(id),
      ),
    };
  });
  // connects_to only needs to be authored from one side of a connection —
  // this fills in the reverse direction so a location that's only ever
  // named as someone else's neighbor still shows that link on its own card.
  for (const location of locations) {
    for (const neighborId of location.connects_to) {
      const neighbor = locations.find((item) => item.id === neighborId);
      if (neighbor && !neighbor.connects_to.includes(location.id)) {
        neighbor.connects_to.push(location.id);
      }
    }
  }
  // key_figures (the victim, or another non-interviewable figure named in
  // actual_timeline) was previously dropped entirely here even when
  // convertStructuredMaster carried it through — a real user reported
  // never learning the victim's role/title from an opening scene whose
  // own prose happened to omit it, with no fallback place to look it up.
  const keyFigures = Array.isArray(raw.key_figures)
    ? raw.key_figures.filter(isObject).map((item) => ({
        id: getStringField(item, 'id'),
        name: getStringField(item, 'name'),
        role: getStringField(item, 'role'),
        status: getStringField(item, 'status'),
      }))
    : [];
  const npcs = Array.isArray(raw.npcs)
    ? raw.npcs.filter(isObject).map((item) => ({
        id: getStringField(item, 'id'),
        name: getStringField(item, 'name'),
        role: getStringField(item, 'role'),
        initial_status: getStringField(
          item,
          'initial_status',
          'not_interviewed',
        ),
        present_location: getStringField(item, 'present_location') || undefined,
      }))
    : [];
  const cards = Array.isArray(raw.cards)
    ? raw.cards.filter(isObject).map((item) => ({
        id: getStringField(item, 'id'),
        title: getStringField(item, 'title'),
        category: getStringField(item, 'category', 'evidence'),
        source: getStringField(item, 'source'),
        condition: getStringField(item, 'condition'),
        summary: getStringField(item, 'summary'),
        // These three were previously dropped here even when present in
        // the uploaded/bundled JSON, so buildActionScopedMaster's
        // acquired_cards always fell back to summary/empty proof scope —
        // starving the model of exactly the proves/does_not_prove detail
        // it needs to judge a presented_evidence confrontation correctly.
        content: getStringField(item, 'content') || undefined,
        proves_fact_ids: getStringArrayField(item, 'proves_fact_ids'),
        does_not_prove_fact_ids: getStringArrayField(
          item,
          'does_not_prove_fact_ids',
        ),
      }))
    : [];

  if (locations.some((item) => !item.id || !item.name)) {
    errors.push('모든 location에는 id와 name이 필요합니다.');
  }
  if (!locations.some((item) => item.id === openingScene)) {
    errors.push('opening_scene은 locations 안에 존재하는 id여야 합니다.');
  }
  if (npcs.some((item) => !item.id || !item.name || !item.role)) {
    errors.push('모든 npc에는 id, name, role이 필요합니다.');
  }
  if (cards.some((item) => !item.id || !item.title || !item.condition)) {
    errors.push('모든 card에는 id, title, condition이 필요합니다.');
  }

  if (errors.length) {
    return { errors };
  }

  return {
    caseData: {
      ...(raw as CaseData),
      case_id: caseId,
      title,
      status_label: statusLabel,
      opening_scene: openingScene,
      public_intro: publicIntro,
      master: raw.master as Record<string, unknown>,
      locations,
      npcs,
      cards,
      key_figures: keyFigures,
    },
    summary,
    errors: [],
  };
}

// 목록 화면 한 줄. CaseSummary에서 런타임만 아는 값(진행도·마지막 플레이
// 시각·경로)을 뺀 나머지다 — 빌드 때 확정되는 부분만 에셋 인덱스에 싣고,
// 나머지는 listCases()가 매 요청 채운다.
export type CaseIndexRow = {
  id: string;
  title: string;
  status_label: string;
  summary: string;
  tags: string[];
  // 이 사건의 장소 id들. 목록이 "번호를 물려받은 다른 사건의 저장"을
  // 가려내는 데 쓴다 — 저장된 현재 위치가 여기 없으면 그 저장은 이 사건의
  // 것이 아니다. case_title이 저장에 들어가기 전에 만들어진 저장에는 제목
  // 가드가 듣지 않아서 이 지문이 필요하다. 311건 합쳐도 몇 KB다.
  location_ids: string[];
  // 이 사건에 손볼 것이 하나도 남지 않았는가 — CaseData.format_warnings가
  // 비어 있는가. 목록에서 "수사 전"과 "수사 가능"을 가르는 값이다.
  // 런타임에 309건의 raw_text를 다시 파싱할 수 없어서 빌드 때 확정해 싣는다.
  format_ok: boolean;
  // public/cases/ 안의 실제 파일 이름. 사건 내용의 해시라 바깥에서 짐작할
  // 수 없고, 이 대응표는 Worker 번들 안에만 있다 — 에셋으로 내보내면
  // 그 파일 하나로 모든 사건의 주소가 새어 나간다.
  file: string;
};

// data/cases/index.json의 큐레이션 항목이 있으면 summary/tags가 그쪽이
// 이긴다(CASE014의 손으로 쓴 목록 설명이 이 경로로 들어왔었다). 없으면
// 업로드된 사건과 똑같은 방식으로 뽑는다.
export function caseIndexRow(
  caseData: CaseData,
  derivedSummary: string,
  file: string,
  formatOk: boolean,
  curated?: { summary?: string; tags?: unknown },
): CaseIndexRow {
  return {
    file,
    format_ok: formatOk,
    location_ids: caseData.locations.map((item) => item.id),
    id: caseData.case_id,
    title: caseData.title,
    status_label: caseData.status_label,
    summary: curated?.summary || derivedSummary || '',
    tags: Array.isArray(curated?.tags)
      ? (curated.tags as string[])
      : caseTagsFromData(caseData),
  };
}
