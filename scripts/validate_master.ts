/**
 * validate_master.ts
 *
 * case_master.schema.json이 강제하지 못하는 교차참조/개수 규칙을 검사한다.
 * - JSON Schema(특히 Claude 구조화 출력)는 "필드가 있는가/타입이 맞는가"는 강제하지만
 *   "그 필드값이 문서 어딘가에 실제로 정의돼 있는가" 같은 교차참조는 강제하지 못한다.
 * - 외부 라이브러리 없이 순수 함수로 작성해 기존 파이프라인에 바로 옮겨 붙일 수 있게 했다.
 *
 * 실행: npx tsx validate_master.ts <master.json>
 */

type Master = any; // 실제 프로젝트에서는 case_master.schema.json에서 뽑은 타입으로 교체

interface Issue {
  severity: 'error' | 'warn';
  code: string;
  message: string;
}

function collectIds(master: Master) {
  const locationIds = new Set<string>(master.locations.map((l: any) => l.id));
  const characterIds = new Set<string>(master.characters.map((c: any) => c.id));
  const keyFigureIds = new Set<string>(
    (master.key_figures ?? []).map((k: any) => k.id),
  );
  const timelineIds = new Set<string>(
    master.actual_timeline.map((t: any) => t.id),
  );
  const evidenceIds = new Set<string>(master.evidence.map((e: any) => e.id));
  const contradictionIds = new Set<string>(
    master.contradiction_stages.map((c: any) => c.id),
  );

  const factIds = new Set<string>();
  const claimIds = new Set<string>();
  for (const ch of master.characters) {
    for (const k of ch.knows ?? []) factIds.add(k.fact_id);
    for (const c of ch.initial_claims ?? []) claimIds.add(c.claim_id);
  }
  for (const loc of master.locations) {
    for (const o of loc.observation_rules ?? []) factIds.add(o.release_fact_id);
  }
  // CONTRADICTION_STAGES가 release하는 fact/claim id도 "이후 정의되는 사실"로서 유효 참조로 인정한다.
  for (const c of master.contradiction_stages) {
    if (c.release?.claim_or_fact_id) {
      const id: string = c.release.claim_or_fact_id;
      if (id.startsWith('F-')) factIds.add(id);
      else if (id.startsWith('S-')) claimIds.add(id);
    }
  }

  return {
    locationIds,
    characterIds,
    keyFigureIds,
    timelineIds,
    evidenceIds,
    contradictionIds,
    factIds,
    claimIds,
  };
}

/** fact/claim/evidence/contradiction-stage ID 중 하나로 실제 정의되어 있는지 확인 */
function resolveReference(
  id: string,
  ids: ReturnType<typeof collectIds>,
): boolean {
  return (
    ids.factIds.has(id) ||
    ids.claimIds.has(id) ||
    ids.evidenceIds.has(id) ||
    ids.contradictionIds.has(id)
  );
}

export function validateMaster(master: Master): Issue[] {
  const issues: Issue[] = [];
  const ids = collectIds(master);

  // 1. hidden_until: prerequisite와 trigger가 같은 값이면 사실상 1단계 해금이다.
  //    그리고 둘 다 문서 안에 실제로 정의된 ID를 가리켜야 한다.
  for (const ch of master.characters) {
    for (const h of ch.hidden_until ?? []) {
      if (h.release_prerequisite === h.release_trigger) {
        issues.push({
          severity: 'error',
          code: 'HIDDEN_UNTIL_SINGLE_STEP',
          message: `${ch.id}: ${h.fact_or_claim_id} 의 release_prerequisite(${h.release_prerequisite})와 release_trigger가 동일해 1단계 해금이 됨.`,
        });
      }
      if (
        !resolveReference(h.release_prerequisite, ids) &&
        !ids.contradictionIds.has(h.release_prerequisite)
      ) {
        issues.push({
          severity: 'error',
          code: 'UNDEFINED_REFERENCE',
          message: `${ch.id}: hidden_until.release_prerequisite(${h.release_prerequisite})가 문서 어디에도 정의돼 있지 않음.`,
        });
      }
      if (!resolveReference(h.release_trigger, ids)) {
        issues.push({
          severity: 'error',
          code: 'UNDEFINED_REFERENCE',
          message: `${ch.id}: hidden_until.release_trigger(${h.release_trigger})가 문서 어디에도 정의돼 있지 않음.`,
        });
      }
      if (!resolveReference(h.fact_or_claim_id, ids)) {
        issues.push({
          severity: 'error',
          code: 'UNDEFINED_REFERENCE',
          message: `${ch.id}: hidden_until.fact_or_claim_id(${h.fact_or_claim_id})가 knows/initial_claims 어디에도 정의돼 있지 않음. (S-/F- 접두어 오타 여부를 확인)`,
        });
      }
    }
  }

  // 2. CONTRADICTION_STAGES: 최소 3단계, 단계마다 증거 조합이 달라야 함
  if (master.contradiction_stages.length < 3) {
    issues.push({
      severity: 'error',
      code: 'CONTRADICTION_STAGES_TOO_FEW',
      message: `CONTRADICTION_STAGES가 ${master.contradiction_stages.length}단계뿐임 (최소 3단계 필요).`,
    });
  }
  const seenEvidenceCombos = new Map<string, string>();
  for (const c of master.contradiction_stages) {
    const combo = [...c.requires_presented_evidence_ids].sort().join(',');
    if (seenEvidenceCombos.has(combo)) {
      issues.push({
        severity: 'error',
        code: 'CONTRADICTION_STAGES_DUPLICATE_EVIDENCE',
        message: `${c.id}와 ${seenEvidenceCombos.get(combo)}가 완전히 같은 증거 조합(${combo})을 요구함.`,
      });
    } else {
      seenEvidenceCombos.set(combo, c.id);
    }
    // 단계가 참조하는 evidence/claim id가 실제로 존재하는지
    for (const eid of c.requires_presented_evidence_ids) {
      if (!ids.evidenceIds.has(eid)) {
        issues.push({
          severity: 'error',
          code: 'UNDEFINED_REFERENCE',
          message: `${c.id}: 존재하지 않는 증거 ${eid} 참조.`,
        });
      }
    }
    if (!resolveReference(c.release.claim_or_fact_id, ids)) {
      issues.push({
        severity: 'error',
        code: 'UNDEFINED_REFERENCE',
        message: `${c.id}.release.claim_or_fact_id(${c.release.claim_or_fact_id})가 정의돼 있지 않음.`,
      });
    }
  }

  // 3. EVIDENCE ↔ LOCATION 상호 일관성 (source_type: "location"인 것만):
  //    evidence.discovery_condition은 해당 location의 detail_rules[].action과 "문자 그대로" 같아야
  //    런타임에서 조회(1단계)가 가능하다.
  for (const ev of master.evidence) {
    const loc = master.locations.find((l: any) => l.id === ev.found_at);
    if (!loc) {
      issues.push({
        severity: 'error',
        code: 'EVIDENCE_BAD_LOCATION',
        message: `${ev.id}: found_at(${ev.found_at})이 존재하지 않는 장소.`,
      });
      continue;
    }
    if (ev.source_type === 'location') {
      const matchingRule = (loc.detail_rules ?? []).find(
        (r: any) => r.action === ev.discovery_condition,
      );
      if (!matchingRule) {
        issues.push({
          severity: 'error',
          code: 'EVIDENCE_CONDITION_MISMATCH',
          message: `${ev.id}: discovery_condition("${ev.discovery_condition}")이 ${ev.found_at}의 detail_rules 어떤 action과도 문자 그대로 일치하지 않음. 런타임 조회가 실패할 것.`,
        });
      } else if (matchingRule.release_evidence_id !== ev.id) {
        issues.push({
          severity: 'error',
          code: 'EVIDENCE_LOCATION_CROSSWIRED',
          message: `${loc.id}의 detail_rule("${matchingRule.action}")은 ${matchingRule.release_evidence_id}를 내주는데 ${ev.id}가 같은 문구를 discovery_condition으로 쓰고 있음(서로 다른 증거인데 문구가 겹침).`,
        });
      }
    } else if (ev.source_type === 'testimony') {
      // testimony 증거는 location detail_rule과 매칭될 필요가 없다. 대신 어딘가에서 실제로 소비되는지만 확인.
      const usedInStage = master.contradiction_stages.some((c: any) =>
        c.requires_presented_evidence_ids?.includes(ev.id),
      );
      if (!usedInStage) {
        issues.push({
          severity: 'warn',
          code: 'TESTIMONY_EVIDENCE_UNUSED',
          message: `${ev.id}(testimony)가 어떤 CONTRADICTION_STAGES에서도 요구되지 않음 — 죽은 증거일 수 있음.`,
        });
      }
    }
  }

  // 4. 모든 location.detail_rules가 실제 evidence로 이어지는지 (죽은 조사 경로 방지)
  for (const loc of master.locations) {
    if (
      loc.access_level &&
      !['open', 'restricted', 'sealed'].includes(loc.access_level)
    ) {
      issues.push({
        severity: 'error',
        code: 'INVALID_ACCESS_LEVEL',
        message: `${loc.id}.access_level("${loc.access_level}")은 open/restricted/sealed 중 하나여야 함.`,
      });
    }
    for (const neighborId of loc.connects_to ?? []) {
      if (!ids.locationIds.has(neighborId)) {
        issues.push({
          severity: 'error',
          code: 'UNDEFINED_REFERENCE',
          message: `${loc.id}.connects_to가 존재하지 않는 장소(${neighborId})를 가리킴.`,
        });
      }
    }
    for (const rule of loc.detail_rules ?? []) {
      if (!ids.evidenceIds.has(rule.release_evidence_id)) {
        issues.push({
          severity: 'error',
          code: 'DEAD_DETAIL_RULE',
          message: `${loc.id}의 detail_rule("${rule.action}")이 존재하지 않는 증거 ${rule.release_evidence_id}를 가리킴.`,
        });
      }
    }
  }

  // 5. ACTUAL_TIMELINE 원자성 휴리스틱 (접속어 + 서술어 패턴)
  const atomicityPattern =
    /(하고|한\s?뒤|한\s?후|하며|하고서)\s*\S+(하다|한다|했다|했습니다|합니다)/;
  for (const t of master.actual_timeline) {
    if (atomicityPattern.test(t.actual_action)) {
      issues.push({
        severity: 'warn',
        code: 'TIMELINE_ATOMICITY_SUSPECT',
        message: `${t.id}: "${t.actual_action}" — 두 행동이 접속어로 이어붙었을 가능성 (수동 확인 요망).`,
      });
    }
    if (!ids.locationIds.has(t.location)) {
      issues.push({
        severity: 'error',
        code: 'TIMELINE_BAD_LOCATION',
        message: `${t.id}: location(${t.location})이 존재하지 않는 장소.`,
      });
    }
    for (const actor of t.actors) {
      if (!ids.characterIds.has(actor) && !ids.keyFigureIds.has(actor)) {
        issues.push({
          severity: 'error',
          code: 'TIMELINE_UNDEFINED_ACTOR',
          message: `${t.id}: actor(${actor})가 CHARACTERS에도 key_figures에도 정의돼 있지 않음.`,
        });
      }
    }
  }

  // 6. opening_scene / ending_scene의 location_id 유효성
  if (!ids.locationIds.has(master.opening_scene.location_id)) {
    issues.push({
      severity: 'error',
      code: 'OPENING_BAD_LOCATION',
      message: `opening_scene.location_id(${master.opening_scene.location_id})가 존재하지 않는 장소.`,
    });
  }
  if (!ids.locationIds.has(master.ending_scene.location_id)) {
    issues.push({
      severity: 'error',
      code: 'ENDING_BAD_LOCATION',
      message: `ending_scene.location_id(${master.ending_scene.location_id})가 존재하지 않는 장소.`,
    });
  }

  // 6b. opening_scene: "탐정은 [의뢰인]의 다급한 연락/신고를 받고 왔다"류 클리셰 금지.
  //     사건마다 이 문구가 반복되면 오프닝의 첫인상이 다 똑같아져 재미를 해친다
  //     (CASE002~CASE011에서 반복 확인된 문제). 예전엔 이 검사가
  //     scripts/lib/master-parser.mjs(구 CASE901 텍스트 파이프라인, 삭제됨)
  //     에만 있었는데, 그 파이프라인이 없어지면서 이 검사도 같이 사라졌던 것을
  //     여기(외부 작성 워크플로가 실제로 쓰는 유일한 검증기)로 옮겨왔다.
  const OPENING_CLICHE =
    /다급한\s*(연락|전화|신고)[을를]?\s*받고\s*(왔|출동|나선)/;
  if (OPENING_CLICHE.test(master.opening_scene.narrative)) {
    issues.push({
      severity: 'error',
      code: 'OPENING_CLICHE',
      message: `opening_scene.narrative가 "다급한 연락/신고를 받고 왔다"류의 상투적 호출 문구를 포함함. 사건 현장의 소리·대화·분위기 대비 등 다른 방식으로 열어라.`,
    });
  }

  // 6b-2. full_truth.method: "관제실에서 계기 표시값을 조작하는 프로그램을 실행 →
  //       안전장치를 수동으로 조작해 안전 확인 절차를 건너뛰게 함 → 피해자가 정상
  //       수치를 믿고 들어갔다가 사망" 트릭 템플릿 금지. CASE061~CASE111 51건이
  //       계기/장소/장치 명사만 바꿔 이 골격을 그대로 복제했던 것이 실플레이에서
  //       반복 재미 저하로 확인됐다 — 트릭 자체를 다양화해야 하며, 명사만 바꾸는
  //       재작성으로는 이 검사를 통과할 수 없다.
  const GAUGE_TAMPER_TEMPLATE = /표시값[을를]?\s*조작하는\s*프로그램/;
  const SAFETY_BYPASS_PHRASE = /안전\s*확인\s*절차를\s*건너뛰게/;
  const TRUSTED_READING_PHRASE = /정상\s*수치를\s*믿고/;
  const methodText: string = master.full_truth?.method ?? '';
  if (
    GAUGE_TAMPER_TEMPLATE.test(methodText) ||
    (SAFETY_BYPASS_PHRASE.test(methodText) &&
      TRUSTED_READING_PHRASE.test(methodText))
  ) {
    issues.push({
      severity: 'error',
      code: 'METHOD_GAUGE_TAMPER_TEMPLATE',
      message:
        'full_truth.method가 "관제실에서 계기 표시값을 조작하는 프로그램을 실행 → 안전장치를 수동으로 조작해 안전 확인 절차를 건너뛰게 함 → 피해자가 정상 수치를 믿고 들어갔다가 사망"이라는, CASE061~111에서 이미 51번 반복된 트릭 골격을 그대로 쓰고 있음. 계기/장소/장치 명사만 바꾸지 말고 트릭 자체를 다르게 설계할 것.',
    });
  }

  // 6b-3. actual_timeline: "3일 전 16:00, 피해자가 우연히 증거를 발견한다" /
  //       "사고 당일 21:50, 범인이 순찰 중 쓰러진 피해자를 발견한다"는 시각까지
  //       토씨 하나 안 틀린 채 CASE121/122/123/125에 그대로 재사용됐던 골격
  //       금지. 육하원칙(특히 "어떻게/무엇을 계기로")이 빠진 채 사람 이름만
  //       바꿔도 다른 사건에 그대로 옮겨 쓸 수 있는 문장이라 반복이 생겼다.
  const GENERIC_DISCOVERY_ACTION = /순찰\s*중\s*쓰러진\s*\S+를?\s*발견한다/;
  const GENERIC_EVIDENCE_DISCOVERY_TIME = /^3일\s*전\s*16:00$/;
  for (const t of master.actual_timeline ?? []) {
    if (
      GENERIC_DISCOVERY_ACTION.test(t.actual_action ?? '') ||
      (t.time && GENERIC_EVIDENCE_DISCOVERY_TIME.test(t.time))
    ) {
      issues.push({
        severity: 'error',
        code: 'TIMELINE_GENERIC_DISCOVERY_TEMPLATE',
        message: `actual_timeline.${t.id}("${t.actual_action}", time: "${t.time}")가 CASE121/122/123/125에서 시각까지 그대로 반복됐던 "3일 전 16:00 우연히 발견" / "순찰 중 쓰러진 OO를 발견한다" 골격과 겹침. 왜 그 시각에 그 자리에 있었는지, 무엇이 계기가 됐는지를 이 사건만의 것으로 채울 것 — 이름만 바꾼 재사용은 이 검사를 통과할 수 없다.`,
      });
    }
  }

  // 6c. opening_scene / ending_scene: 탐정-한지우 티키타카 필수. 둘 다 등장인물
  //     대사를 "한지우 혼자 한 줄 논평"으로 때우지 않고, 탐정과 한지우가 짧게라도
  //     주고받는 장면인지 확인한다. 정확한 발화자 귀속은 자연어라 기계적으로
  //     확정할 수 없으므로: 한지우가 아예 등장 안 하면 확실한 위반(error), 대사
  //     (큰따옴표 쌍)가 1개 이하면 주고받을 상대가 없다는 뜻이라 의심(warn)으로
  //     표시해 사람이 확인하게 한다.
  const quotedLineCount = (text: string) => (text.match(/"/g)?.length ?? 0) / 2;
  for (const [sceneName, code, scene] of [
    ['opening_scene', 'OPENING', master.opening_scene],
    ['ending_scene', 'ENDING', master.ending_scene],
  ] as const) {
    const narrative: string = scene.narrative ?? '';
    if (!narrative.includes('한지우')) {
      issues.push({
        severity: 'error',
        code: `${code}_NO_JIWOO`,
        message: `${sceneName}.narrative에 한지우가 등장하지 않음. 탐정과 한지우가 주고받는 티키타카가 필수다.`,
      });
    } else if (quotedLineCount(narrative) < 2) {
      issues.push({
        severity: 'warn',
        code: `${code}_NO_TIKITAKA`,
        message: `${sceneName}.narrative에 대사(큰따옴표)가 ${quotedLineCount(narrative)}개뿐임 — 한지우 혼자 한 줄 논평하고 끝나는 게 아니라 탐정과 짧게라도 대사를 주고받는지 수동 확인 요망.`,
      });
    }
  }

  // 7. RED_HERRINGS 중 최소 하나는 lingering_thread를 채워야 엔딩에 여운을 남길 수 있다.
  const hasLingering = (master.red_herrings ?? []).some(
    (r: any) => (r.lingering_thread ?? '').trim().length > 0,
  );
  if (!hasLingering) {
    issues.push({
      severity: 'warn',
      code: 'NO_LINGERING_THREAD',
      message: `모든 RED_HERRINGS의 lingering_thread가 비어 있음 — 엔딩에 남길 여운이 없어 결말이 지나치게 깔끔하게 끝날 수 있음.`,
    });
  }

  // 8. CHARACTERS[].pressure_responses: 스키마 description이 "실제로는
  // 2~4개여야 한다(사후 검증기가 확인)"이라고 명시하지만, JSON Schema는
  // minItems: 1까지만 강제하고 상한은 아예 표현할 수 없다 — 여기서 세지
  // 않으면 1개짜리(반복 추궁해도 똑같은 반응 한 줄)나 5개 이상(과하게
  // 늘어지는 반응)이 스키마 통과만으로 그냥 넘어간다.
  for (const ch of master.characters ?? []) {
    const count = (ch.pressure_responses ?? []).length;
    if (count < 2 || count > 4) {
      issues.push({
        severity: 'error',
        code: 'PRESSURE_RESPONSES_COUNT',
        message: `${ch.id}.pressure_responses가 ${count}개임 — 스키마 설명대로 2~4개여야 함.`,
      });
    }
  }

  // 9. RED_HERRINGS[].suspicion_deepener: lingering_thread(7번)와 같은
  // "최소 1개는 채워야 한다"는 스키마 설명이 있지만, 검사 항목 자체가
  // 없어서 전부 빈 문자열이어도 그냥 통과했다. 하나도 안 채워지면
  // red herring이 actual_reason으로 한 번에 풀려버려서 여러 용의자를
  // 저울질하는 긴장감이 안 생긴다.
  const hasSuspicionDeepener = (master.red_herrings ?? []).some(
    (r: any) => (r.suspicion_deepener ?? '').trim().length > 0,
  );
  if (!hasSuspicionDeepener) {
    issues.push({
      severity: 'warn',
      code: 'NO_SUSPICION_DEEPENER',
      message: `모든 RED_HERRINGS의 suspicion_deepener가 비어 있음 — 의심이 깊어지는 중간 단계 없이 곧장 해소돼서 긴장감이 약할 수 있음.`,
    });
  }

  // 10. FULL_TRUTH.responsible_character_id / CASE_COMPLETE.accusation_requirements.suspect 일치
  if (
    master.full_truth.responsible_character_id !==
    master.case_complete.accusation_requirements.suspect
  ) {
    issues.push({
      severity: 'error',
      code: 'SUSPECT_MISMATCH',
      message: `FULL_TRUTH의 책임자(${master.full_truth.responsible_character_id})와 CASE_COMPLETE의 suspect(${master.case_complete.accusation_requirements.suspect})가 다름.`,
    });
  }

  // 11. opening_scene.narrative에 key_figures(피해자)의 상태가 드러나야 한다.
  // 실플레이 로그(CASE019)에서 opening_scene이 표면 사건(누가 어떤 상태로
  // 발견됐는지)을 전혀 언급하지 않아, 첫 턴부터 플레이어가 피해자 이름조차
  // 모르는 채로 시작하는 사고가 확인됐다 — surface_incident에는 있지만
  // opening_scene 자체에는 없어서 생긴 문제였다. 이름 언급까지는 강제하지
  // 않는다(예: "쓰러진 채 발견된 사람"처럼만 써도 되는 경우가 있다) — 대신
  // surface_incident가 쓰는 발견/상태 어휘(쓰러진/사망/숨진/발견/의식을
  // 잃은 등) 중 하나가 opening_scene에도 나오는지만 확인한다.
  const DISCOVERY_CUE =
    /쓰러|숨지|숨졌|사망|죽었|죽은|변사|주검|시신|시체|발견되|발견됐|발견돼|의식을\s*잃|의식이\s*없|질식|중독|추락|익사|자상|출혈/;
  if (
    (master.surface_incident ?? []).some((line: string) =>
      DISCOVERY_CUE.test(line),
    ) &&
    !DISCOVERY_CUE.test(master.opening_scene.narrative)
  ) {
    issues.push({
      severity: 'error',
      code: 'OPENING_SCENE_MISSING_INCIDENT',
      message: `opening_scene.narrative에 surface_incident가 말하는 발견/사망 상황(쓰러진/숨진/사망/발견 등)이 전혀 안 드러남 — 플레이어가 1턴부터 표면 사건 자체를 모르는 채로 시작하게 됨.`,
    });
  }

  return issues;
}

// ---- 코퍼스 전체 중복도 검사 ----
// CASE061~111 51건이 반복됐던 근본 원인은 하나의 트릭 문구가 아니라, "몰드(mold) 하나를
// 코드 레벨(mk_case() 같은 생성 함수)로 고정해두고 사건마다 명사만 바꿔 채워 넣는" 생성
// 방식 자체였다. 특정 문구 하나를 금지하는 걸로는 다음에 다른 몰드가 나오면 못 잡는다 —
// 그래서 "새 사건의 full_truth 문장이 기존 사건 중 하나와 문장 골격 수준으로 겹치는가"를
// 코퍼스 전체와 비교하는 일반적인 검사를 별도로 둔다. 임계값 0.3은 CASE061~111(명사만
// 바꾼 진짜 중복)이 전부 0.4 이상, 서로 다른 트릭인 나머지 케이스 쌍은 전부 0.16 이하로
// 갈리는 실측 분포를 근거로 잡았다.
const CORPUS_DUPLICATION_THRESHOLD = 0.3;
const CORPUS_DUPLICATION_FIELDS = ['motive', 'method', 'cover_up'] as const;

function tokenizeForDuplicationCheck(text: string): string[] {
  const stripped = text.replace(/[A-Z]\d+/g, '').replace(/\d+/g, '');
  return stripped.match(/[가-힣]{2,}/g) ?? [];
}

function bigramSet(tokens: string[]): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++)
    set.add(`${tokens[i]}_${tokens[i + 1]}`);
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) if (b.has(gram)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 새 사건(master)의 full_truth 문장이 기존 코퍼스(otherCases)의 어느 사건과
 * 문장 골격 수준으로 겹치는지 검사한다. mk_case() 류의 "몰드 + 명사 치환" 생성
 * 방식 전반을 잡기 위한 것이라, 특정 트릭 문구를 하드코딩하지 않는다.
 */
export function checkCorpusDuplication(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
): Issue[] {
  const issues: Issue[] = [];
  for (const field of CORPUS_DUPLICATION_FIELDS) {
    const text: string = master.full_truth?.[field] ?? '';
    const grams = bigramSet(tokenizeForDuplicationCheck(text));
    if (grams.size === 0) continue;

    const matches: string[] = [];
    for (const other of otherCases) {
      if (other.caseId === caseId) continue;
      const otherText: string = other.master.full_truth?.[field] ?? '';
      const otherGrams = bigramSet(tokenizeForDuplicationCheck(otherText));
      if (jaccard(grams, otherGrams) > CORPUS_DUPLICATION_THRESHOLD) {
        matches.push(other.caseId);
      }
    }

    if (matches.length > 0) {
      issues.push({
        severity: 'error',
        code: 'CORPUS_TEMPLATE_DUPLICATION',
        message: `full_truth.${field}가 기존 사건 ${matches.join(', ')}와(과) 문장 골격 수준으로 겹침(명사만 바꾼 재사용으로 의심됨). 코드 레벨 몰드에 명사만 채워 넣는 방식은 금지 — 트릭/동기/은폐 방식을 그 사건만의 것으로 다시 설계할 것.`,
      });
    }
  }
  return issues;
}

/**
 * npcs/locations/cards 같은 런타임용 얇은 뷰를 master에서 코드로 파생시킨다.
 * → LLM에게 이 뷰를 "또" 생성시키지 않는다. 이중 생성 비용도, drift 위험도 없앤다.
 */
export function deriveEngineViews(master: Master) {
  const npcs = master.characters.map((c: any) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    initial_status: 'not_interviewed',
  }));

  const locations = master.locations.map((l: any) => ({
    id: l.id,
    name: l.name,
    description: l.base_description,
  }));

  const cards = master.evidence.map((e: any) => ({
    id: e.id,
    title: e.name,
    category: 'evidence',
    source: e.found_at,
    condition: e.discovery_condition,
    summary: e.content,
  }));

  return { npcs, locations, cards };
}

// ---- CLI 실행부 (npx tsx validate_master.ts CASE171_structured_example.json) ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('node:fs');
  const nodePath = await import('node:path');
  const path = process.argv[2];
  if (!path) {
    console.error('사용법: npx tsx validate_master.ts <master.json>');
    process.exit(1);
  }
  const master = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const caseId: string = master.case_identity?.case_id ?? path;
  const issues = validateMaster(master);

  // 같은 디렉터리(data/pending-cases) 아래 다른 사건들을 전부 읽어와 코퍼스 전체
  // 중복도를 검사한다 — 읽기 실패/형식이 다른 파일은 조용히 건너뛴다(이 검사의
  // 목적이 아니므로 여기서 에러를 내지 않는다).
  const corpusDir = nodePath.join(nodePath.dirname(path), '..');
  const otherCases: { caseId: string; master: Master }[] = [];
  try {
    for (const entry of fs.readdirSync(corpusDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const siblingPath = nodePath.join(
        corpusDir,
        entry.name,
        `${entry.name}.master.json`,
      );
      try {
        const siblingMaster = JSON.parse(fs.readFileSync(siblingPath, 'utf-8'));
        otherCases.push({
          caseId: siblingMaster.case_identity?.case_id ?? entry.name,
          master: siblingMaster,
        });
      } catch {
        // 형식이 다르거나 아직 없는 사건 — 스킵
      }
    }
  } catch {
    // corpusDir 자체가 없으면(단독 파일 검증 등) 코퍼스 중복 검사를 건너뛴다
  }
  if (otherCases.length > 0) {
    issues.push(...checkCorpusDuplication(caseId, master, otherCases));
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warns = issues.filter((i) => i.severity === 'warn');

  console.log(`\n=== ${path} ===`);
  console.log(`errors: ${errors.length}, warnings: ${warns.length}\n`);
  for (const i of [...errors, ...warns]) {
    console.log(`[${i.severity.toUpperCase()}] ${i.code}: ${i.message}`);
  }

  if (errors.length === 0) {
    console.log(
      '\n구조/교차참조 검증 통과. 아래는 코드로 파생한 npcs/locations/cards:\n',
    );
    console.log(JSON.stringify(deriveEngineViews(master), null, 2));
  }

  process.exit(errors.length > 0 ? 1 : 0);
}
