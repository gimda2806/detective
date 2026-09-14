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

/**
 * 증거(testimony든 location이든)가 CONTRADICTION_STAGES 요구 조건 말고 다른 어떤 경로로도
 * 이 사건에서 "쓰이지" 않는지 확인한다. red_herring 해소, 다른 증거의 proves/does_not_prove,
 * final_deduction/ending_explanation/ending_scene 텍스트 중 하나라도 이 증거의 id 또는
 * name을 참조하면 "고립된 카드"가 아니다.
 */
function isIsolatedEvidence(master: Master, ev: any): boolean {
  const usedInStage = master.contradiction_stages.some(
    (c: any) =>
      c.requires_presented_evidence_ids?.includes(ev.id) ||
      c.requires_comparison?.evidence_ids?.includes(ev.id),
  );
  if (usedInStage) return false;

  const needles = [ev.id, ev.name].filter(Boolean);
  const mentionedIn = (text: unknown): boolean =>
    typeof text === 'string' && needles.some((n) => text.includes(n));

  const usedInRedHerring = (master.red_herrings ?? []).some(
    (rh: any) =>
      mentionedIn(rh.surface_suspicion) ||
      mentionedIn(rh.actual_reason) ||
      mentionedIn(rh.how_to_clear) ||
      mentionedIn(rh.must_not_imply) ||
      mentionedIn(rh.lingering_thread) ||
      mentionedIn(rh.suspicion_deepener),
  );
  if (usedInRedHerring) return false;

  const usedInOtherEvidence = (master.evidence ?? []).some(
    (other: any) =>
      other.id !== ev.id &&
      ((other.proves ?? []).some((p: string) => needles.includes(p)) ||
        (other.does_not_prove ?? []).some((p: string) => needles.includes(p))),
  );
  if (usedInOtherEvidence) return false;

  if (mentionedIn(master.final_deduction?.key_connection)) return false;
  if ((master.ending_explanation ?? []).some(mentionedIn)) return false;
  if (mentionedIn(master.ending_scene?.narrative)) return false;

  return true;
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
      // location 증거는 testimony와 달리 detail_rule 매칭만 통과하면 발견은 되지만,
      // 발견 이후 아무 데도 안 쓰이는("제시해도 아무 일도 안 일어나는") 죽은 카드가 될 수
      // 있다 — CASE101의 E06이 실제 사례(시각 데이터 없이 "시각이 남아있다"고만 되어
      // 있어 알리바이 확인에 못 쓰임). testimony와 같은 isIsolatedEvidence 기준으로 검사.
      if (isIsolatedEvidence(master, ev)) {
        issues.push({
          severity: 'warn',
          code: 'ISOLATED_LOCATION_EVIDENCE',
          message: `${ev.id}(location)가 CONTRADICTION_STAGES 요구 조건에도, RED_HERRINGS 해소 근거에도, 다른 EVIDENCE의 proves/does_not_prove에도, FINAL_DEDUCTION/ENDING_EXPLANATION/ENDING_SCENE 어디에도 등장하지 않음 — 완전히 고립된 죽은 카드로 의심됨.`,
        });
      }
    } else if (ev.source_type === 'testimony') {
      // testimony 증거는 location detail_rule과 매칭될 필요가 없다. 대신 어딘가에서 실제로 소비되는지만
      // 확인한다 — 다만 "어떤 CONTRADICTION_STAGES에서도 요구되지 않는다"만으로 경고하면, 실제로는
      // red_herring 해소나 다른 증거의 뒷받침 근거로 쓰이는(그래서 플레이어가 모아도 되는 이유가 있는)
      // 증언까지 전부 "죽은 카드"로 잘못 걸린다. 힌트를 엄격하게 제한한 런타임에서는 "이게 이 사건에
      // 중요한가?"를 판단할 다른 단서가 없으니, 이 경고는 정말로 아무 데도 등장하지 않는 완전히 고립된
      // 카드만 걸러야 한다 — isIsolatedEvidence가 그 판단을 한다.
      if (isIsolatedEvidence(master, ev)) {
        issues.push({
          severity: 'warn',
          code: 'ISOLATED_TESTIMONY_EVIDENCE',
          message: `${ev.id}(testimony)가 CONTRADICTION_STAGES 요구 조건에도, RED_HERRINGS 해소 근거에도, 다른 EVIDENCE의 proves/does_not_prove에도, FINAL_DEDUCTION/ENDING_EXPLANATION/ENDING_SCENE 어디에도 등장하지 않음 — 완전히 고립된 죽은 카드로 의심됨.`,
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

  // 6a-2. case_identity.setting: "OOO 행사/마감/심사를 하루(사흘) 앞둔 시점의 폐쇄된
  //       소규모 공간에서 피해자가 숨진 채 발견된다"류 오프닝 프리미스 템플릿 금지.
  //       코퍼스 170건 중 148건(87%)이 이 세 요소(임박한 마감 + 폐쇄공간 + "숨진 채
  //       발견된다")를 그대로 반복해, 배경 소재(양조장/갤러리/천문대 등)만 바뀔 뿐
  //       사건들이 "명사만 바뀐 같은 이야기"로 느껴진다는 실플레이 피드백으로 확인됐다.
  //       시간 압박이라는 장치 자체가 금지된 건 아니다 — 매번 이 세 요소를 한 문장에
  //       다 욱여넣는 골격 자체를 다양화해야 한다(발견 경위를 다르게 쓰거나, 마감
  //       압박 없이 다른 계기로 열거나 등).
  const DEADLINE_PRESSURE = /(앞둔|앞두고|전야|하루\s*전|사흘\s*전|이틀\s*전)/;
  const FOUND_DEAD_PHRASE = /숨진\s*채\s*발견/;
  const settingText: string = master.case_identity?.setting ?? '';
  if (DEADLINE_PRESSURE.test(settingText) && FOUND_DEAD_PHRASE.test(settingText)) {
    issues.push({
      severity: 'error',
      code: 'SETTING_DEADLINE_DISCOVERY_TEMPLATE',
      message: `case_identity.setting이 "OOO를 앞둔 시점 + 숨진 채 발견"이라는, 코퍼스 87%가 반복해온 오프닝 골격을 그대로 쓰고 있음. 마감 압박 요소를 빼거나, 발견 경위·문장 구조를 이 사건만의 것으로 다르게 쓸 것.`,
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

  // 6b-4. actual_timeline[].world_fact: 대명사("그는/그녀는/안에서는/그곳에서는" 등)로
  //       시작하는 문장 금지. world_fact는 스키마상 같은 항목의 actual_action
  //       바로 다음 줄에 붙어 있어서 그 안에서는 대명사가 누구를 가리키는지
  //       명확해 보이지만, 이 문장은 raw_text 변환·GM 회상 등에서 actual_action과
  //       분리된 채 단독으로 다뤄질 수 있다 — 실제로 코퍼스 175건 중 124건(71%,
  //       256곳)이 이 패턴이었고, CASE023을 실제로 읽어보면 "그는 곧바로 119에
  //       신고한다"만 나중에 다시 보면 주어를 알 수 없다는 문제가 확인됐다.
  //       actors에 있는 실제 이름을, 장소도 location_id 대신 구체적 이름을 써서
  //       이 문장 하나만 떼어놔도 뜻이 통하게 만들 것.
  // 한글은 \w/\b 대상이 아니라 "\b"가 경계로 인식되지 않는다 — 뒤에 공백/문장
  // 끝이 오는지를 lookahead로 직접 확인한다.
  //
  // 문장 시작만 검사하는 걸로는 부족했다 — 실플레이(CASE043)에서 "작업실
  // 메모지에 그가 남긴 메모가 발견된다"처럼 대명사가 문장 중간(부사구 뒤)에
  // 오는 경우를 그대로 통과시켰는데, 문장 앞에 오든 중간에 오든 actual_action과
  // 떨어져 단독으로 다뤄지면 똑같이 누구인지 알 수 없다. 인물 대명사는 이제
  // 위치와 무관하게 검사하되, 그 actors의 실제 이름이 같은 문장 안에 실제로
  // 있으면(대명사가 문장 안에서 이미 해소된 경우) 오탐이 아니므로 통과시킨다.
  // 장소를 가리키는 모호한 지시어("안에서"/"그곳에서" 등)는 문장 시작에서만
  // 여전히 검사한다 — 문장 중간의 "~안에서"는 대개 앞에 나온 구체적 명사에
  // 붙는 조사구라 정상적인 한국어 표현이고, 여기까지 넓히면 오탐이 크게 는다.
  const PERSON_PRONOUN =
    /(그는|그녀는|그가|그녀가|그를|그녀를|그에게|그녀에게)(?=\s|$)/;
  const LOCATION_VAGUE_OPENER =
    /^(안에서는|안에서|그곳에서는|거기에서는|그곳에서|거기에서)(?=\s|$)/;
  const actorNameById = new Map<string, string>();
  for (const ch of master.characters ?? []) actorNameById.set(ch.id, ch.name);
  for (const kf of master.key_figures ?? []) actorNameById.set(kf.id, kf.name);
  for (const t of master.actual_timeline ?? []) {
    const worldFact: string = (t.world_fact ?? '').trim();
    if (!worldFact) continue;
    const actorNames = (t.actors ?? [])
      .map((id: string) => actorNameById.get(id))
      .filter((name: string | undefined): name is string => Boolean(name));
    const hasUnresolvedPronoun =
      PERSON_PRONOUN.test(worldFact) &&
      !actorNames.some((name: string) => worldFact.includes(name));
    if (hasUnresolvedPronoun || LOCATION_VAGUE_OPENER.test(worldFact)) {
      issues.push({
        severity: 'error',
        code: 'WORLD_FACT_VAGUE_SUBJECT',
        message: `actual_timeline.${t.id}.world_fact("${worldFact}")가 대명사/모호한 지시어를 쓰면서 actors의 실제 이름은 문장 안에 없음 — actual_action과 떨어뜨려 놓으면 누구/어디 얘기인지 알 수 없다. actors의 실제 이름과 구체적 장소명을 써서 이 문장만 봐도 뜻이 통하게 고칠 것.`,
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

  // 7/9. RED_HERRINGS[].lingering_thread / suspicion_deepener: 원래는 "케이스 전체에서
  // 최소 하나만 채우면 통과"(.some())였는데, 실제로는 레드헤링이 여러 개일 때 한쪽만
  // 채워지고 나머지는 빈 채로 남는 사례가 코퍼스 전체에서 다수 확인됐다(CASE101의 R02가
  // R01은 채워져 있어서 케이스 단위 체크를 통과했던 실사례). 항목별로 채워야 그 레드헤링
  // 개별적으로 의심 심화(suspicion_deepener) → 여운(lingering_thread)의 2막 아크가 완성된다.
  for (const rh of master.red_herrings ?? []) {
    const emptyFields = ['lingering_thread', 'suspicion_deepener'].filter(
      (field) => !(rh[field] ?? '').trim(),
    );
    if (emptyFields.length) {
      issues.push({
        severity: 'warn',
        code: 'RED_HERRING_INCOMPLETE_ARC',
        message: `${rh.id}의 ${emptyFields.join(', ')}이(가) 비어 있음 — 의심 심화/여운 없이 1막으로 끝날 수 있음.`,
      });
    }
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

  issues.push(...checkContradictionStageChain(master));
  issues.push(...checkTimelineOrder(master));
  issues.push(...checkDetectiveEntryTime(master));

  return issues;
}

// CONTRADICTION_STAGES가 하나의 사슬로 이어지는지, 그리고 그 머리가
// 'initial'인지 검사한다.
//
// 런타임은 state.npc_statement_stage를 문자열 'initial'에서 시작시키고
// from_stage와 문자열로 맞춘다. 그래서 첫 from_stage가 'initial'이 아니거나
// C01의 to_stage가 C02의 from_stage가 아니면 어떤 단계도 도달 가능해지지
// 않는다 — 대질 사다리가 시작조차 안 되고, required_established_facts가
// 전부 단계 release fact인 사건에서는 진행도가 0%에 박힌다. 실제로 코퍼스
// 274건 중 84건이 이 상태였고(67건은 사슬이 끊겨 있었고 17건은 이름만
// 달랐다), CASE155 실플레이에서 0%가 보고돼서야 드러났다.
//
// 스키마는 이 두 필드를 그냥 string으로 두므로 여기서 막지 않으면
// 생성 루틴이 같은 사건을 계속 만들어 낸다.
// actual_timeline은 시간순이어야 한다. 배열 순서가 곧 사건의 순서로 읽히고,
// 증거·인물 지식이 related_timeline으로 그 항목을 가리키기 때문에, 한 항목이
// 엉뚱한 자리에 있으면 "발견보다 은폐가 먼저" 같은 모순이 조용히 들어앉는다.
// CASE066이 그랬다 — 은폐 청소가 D-day 새벽인데 항목은 D-1 21:50에 박혀
// 있어서, 최초 발견자의 진술이 물리적으로 불가능해졌다.
//
// 시각 표기가 실제로 391가지라 모든 항목을 읽을 수는 없다. 날짜 접두사와
// 시각을 둘 다 확실히 읽어낸 항목끼리만 비교하고, 못 읽은 항목은 조용히
// 건너뛴다 — 오탐 하나가 검사 전체를 무시하게 만드는 쪽이 미탐보다 나쁘다.
const TIMELINE_DAY_PATTERNS: Array<[RegExp, number | 'neg' | 'negweek']> = [
  [/^D-day\b/, 0],
  [/^D\s*-\s*(\d+)/, 'neg'],
  [/^(?:사건|사고|범행|기일)\s*당일/, 0],
  [/^(?:당일|오늘|그날)/, 0],
  [/^(?:전날|어제)/, -1],
  [/^그저께/, -2],
  [/^(\d+)\s*일\s*전/, 'neg'],
  [/^(\d+)\s*주\s*전/, 'negweek'],
  [/^(?:사건|사고|범행)?\s*(?:다음\s*날|다음날|이튿날)/, 1],
];

function parseTimelineStamp(raw: string): number | null {
  let rest = (raw || '').trim();
  if (!rest) return null;
  let day: number | null = null;
  for (const [pattern, value] of TIMELINE_DAY_PATTERNS) {
    const match = pattern.exec(rest);
    if (!match) continue;
    if (value === 'neg') day = -Number(match[1]);
    else if (value === 'negweek') day = -7 * Number(match[1]);
    else day = value;
    rest = rest.slice(match[0].length).replace(/^[\s,·]+/, '');
    break;
  }
  if (day === null) return null;
  const clock = /(\d{1,2})\s*:\s*(\d{2})/.exec(rest);
  if (clock) return day * 1440 + Number(clock[1]) * 60 + Number(clock[2]);
  const spoken =
    /(오전|오후|새벽|밤|저녁|아침|낮)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|(반))?/.exec(
      rest,
    );
  if (!spoken) return null;
  let hour = Number(spoken[2]);
  const minute = spoken[4] ? 30 : Number(spoken[3] ?? 0);
  const marker = spoken[1];
  if ((marker === '오후' || marker === '저녁' || marker === '밤') && hour < 12) {
    hour += 12;
  }
  if (marker === '새벽' && hour === 12) hour = 0;
  return day * 1440 + hour * 60 + minute;
}

// 탐정이 현장에 들어온 시각은 이 사건의 "지금"이다. 대사 속 오늘·어제·
// 어젯밤이 전부 이 값을 기준으로 읽히므로, 없으면 같은 밤을 인물마다 다르게
// 부르게 된다 — 시각이 곧 단서인 게임에서 그건 서로 다른 두 밤이 된다.
// 그리고 탐정은 사건보다 먼저 도착할 수 없으니, 마지막 타임라인 항목보다
// 앞설 수도 없다.
export function checkDetectiveEntryTime(master: Master): Issue[] {
  const entryTime = master.opening_scene?.detective_entry_time;
  if (!entryTime) {
    return [
      {
        severity: 'error',
        code: 'DETECTIVE_ENTRY_TIME_MISSING',
        message:
          'opening_scene.detective_entry_time이 없음 — 탐정이 현장에 들어온 시각이 이 사건의 "지금"이고, 대사 속 오늘/어제/어젯밤이 전부 그 시각을 기준으로 읽힌다. "<날짜> <시각>" 형식으로 적을 것(예: "사건 당일 22:30", "사건 다음날 08:00").',
      },
    ];
  }
  // 마지막 타임라인 항목과 비교하지 않는다. 마지막 항목이 늘 발견인 건
  // 아니고, 은폐나 이튿날 공식 발표처럼 탐정이 이미 도착한 뒤에 벌어지는
  // 일인 경우가 많다(CASE086/094/123/216/218/287이 그랬다). 확실히 말할 수
  // 있는 건 하나뿐이다 — 탐정은 사건의 첫 사건보다 먼저 도착할 수 없다.
  const entryStamp = parseTimelineStamp(entryTime);
  const first = (master.actual_timeline ?? [])[0];
  const firstStamp = first ? parseTimelineStamp(first.time) : null;
  if (entryStamp === null || firstStamp === null) return [];
  if (entryStamp < firstStamp) {
    return [
      {
        severity: 'error',
        code: 'DETECTIVE_ENTRY_TIME_BEFORE_INCIDENT',
        message: `detective_entry_time("${entryTime}")이 첫 타임라인 항목 ${first.id}("${first.time}")보다 앞선다. 탐정은 사건이 시작되기 전에 도착할 수 없다.`,
      },
    ];
  }
  return [];
}

export function checkTimelineOrder(master: Master): Issue[] {
  const issues: Issue[] = [];
  let previous: { id: string; time: string; stamp: number } | null = null;
  for (const entry of master.actual_timeline ?? []) {
    const stamp = parseTimelineStamp(entry.time);
    if (stamp === null) continue;
    if (previous && stamp < previous.stamp) {
      issues.push({
        severity: 'error',
        code: 'TIMELINE_OUT_OF_ORDER',
        message: `actual_timeline이 시간순이 아님 — ${previous.id}("${previous.time}") 다음에 ${entry.id}("${entry.time}")가 온다. 배열 순서가 곧 사건 순서로 읽히고 증거가 related_timeline으로 이 항목을 가리키므로, 항목을 제 시각 자리로 옮기거나 time 표기를 바로잡을 것(날짜 접두사가 틀린 경우가 많다 — 발견이 다음 날 아침이면 "당일"이 아니라 "다음날"이다).`,
      });
    }
    previous = { id: entry.id, time: entry.time, stamp };
  }
  return issues;
}

export function checkContradictionStageChain(master: Master): Issue[] {
  const issues: Issue[] = [];
  type Stage = { id: string; from_stage: string; to_stage: string };
  const byCharacter = new Map<string, Stage[]>();
  for (const stage of master.contradiction_stages ?? []) {
    const list = byCharacter.get(stage.target_character) ?? [];
    list.push(stage);
    byCharacter.set(stage.target_character, list);
  }
  for (const [character, stages] of byCharacter) {
    const toStages = new Set(stages.map((stage) => stage.to_stage));
    const heads = stages.filter((stage) => !toStages.has(stage.from_stage));
    if (heads.length !== 1) {
      issues.push({
        severity: 'error',
        code: 'CONTRADICTION_STAGE_CHAIN_BROKEN',
        message: `${character}의 단계들이 하나의 사슬로 이어지지 않음 — 시작점이 ${heads.length}개다(${heads.map((s) => s.id).join(', ') || '없음'}). 각 단계의 to_stage가 다음 단계의 from_stage와 문자 그대로 같아야 한다.`,
      });
      continue;
    }
    if (heads[0].from_stage !== 'initial') {
      issues.push({
        severity: 'error',
        code: 'CONTRADICTION_STAGE_CHAIN_BROKEN',
        message: `${character}의 첫 단계(${heads[0].id})의 from_stage가 "initial"이 아님("${heads[0].from_stage}"). 런타임이 모든 NPC를 'initial'에서 시작시키므로 이 값이 아니면 그 사건은 진행도가 0%에서 움직이지 않는다.`,
      });
    }
    let current: string | undefined = heads[0].from_stage;
    const remaining = [...stages];
    let visited = 0;
    while (current !== undefined) {
      const index = remaining.findIndex((stage) => stage.from_stage === current);
      if (index === -1) break;
      const [next] = remaining.splice(index, 1);
      current = next.to_stage;
      visited += 1;
    }
    if (visited !== stages.length) {
      issues.push({
        severity: 'error',
        code: 'CONTRADICTION_STAGE_CHAIN_BROKEN',
        message: `${character}의 단계 ${stages.length}개 중 ${visited}개만 시작점에서 이어진다. 끊긴 단계: ${remaining.map((s) => s.id).join(', ')}.`,
      });
    }
  }
  return issues;
}

// 여기 있던 checkCrossLocationEvidenceCollision은 걷어냈다.
//
// 서로 다른 장소의 location 증거 두 개가 한글 토큰을 양방향 40% 이상 공유하면
// 런타임 유출 검사기가 혼동할 것이라고 보고 경고했는데, 코퍼스 전체로 대조해
// 보니 예측이 맞지 않았다: 경고가 붙은 28개 사건과 실제로 오탐이 나는 13개
// 사건의 교집합이 0이었다.
//
// 이유는 두 가지다. 첫째, app/game.ts의 detectUndiscoveredEvidenceLeak는 증거를
// 획득하는 턴에 다른 방 후보를 통째로 건너뛴다(locationsAcquiringNow 가드).
// 이 검사가 실사례로 인용하던 CASE043이 바로 그 가드가 들어간 계기였으니,
// 이미 닫힌 구멍을 계속 가리키고 있었던 셈이다. 둘째, 실제로 터지는 오탐은
// 전부 "같은 방" 쌍인데, 같은 방 쌍으로 조건을 뒤집어 다시 재봐도 실제 오탐
// 19쌍 중 0쌍만 잡혔다 — 런타임은 여기 있던 단순 토큰 비율이 아니라
// hasContentOverlap(어절 단위 실제 포함)과 hasDistinctiveKeywordOverlap
// (어미·조사 제거 + 상투어 제외)으로 판정하기 때문에, 손으로 옮긴 근사치로는
// 무엇이 걸릴지 예측할 수 없다.
//
// 대신 scripts/audit-evidence-leak.ts를 쓴다. 그쪽은 근사치가 아니라 런타임이
// 매 턴 호출하는 evidenceLeakDetected를 그대로 불러 세 가지 상황(도착/발견/
// 미탐)을 재현하므로 정의상 일치한다. 사건 하나만 검사하려면 id를 인자로 준다:
//
//   node <compiled>/scripts/audit-evidence-leak.js CASE123
//
// (컴파일 방법은 그 파일 상단 주석 참고. 오탐이 있으면 종료 코드 1.)


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

// "폭로/신고 예고 → 발각 차단을 위해 살해"라는 동기 골격이 코퍼스 167건 중 80건
// (48%)을 차지한다는 사실이 실플레이 피드백("의도한 게 아니었어요, 사고였어요"
// "들킬까봐 무서워서 그랬어요"라는 결론이 너무 많다)으로 확인됐다. 이 동기 자체가
// 나쁜 게 아니라 — 협박당해 우발적으로 손을 댄다는 설정은 자연스러운 트릭이다 —
// 이미 코퍼스 절반 가까이가 이 골격이라 계속 같은 동기를 골라서는 결말의 다양성이
// 나아지지 않는다는 게 문제다. 그래서 이미 쓰인 비중이 임계값을 넘으면, 그 골격을
// "또" 쓰는 새 사건을 코드 레벨로 막고 다른 동기 아키타입(복수, 치정, 상속·재산
// 다툼, 신념·집착, 보호 동기 등)을 강제한다.
const WHISTLEBLOWER_MOTIVE =
  /폭로|신고하겠다|알리겠다|통보|고발|공개하겠다|밝히겠다|경찰에\s*넘기겠다/;
const MOTIVE_ARCHETYPE_OVERUSE_THRESHOLD = 0.3;

/**
 * "폭로/신고 예고 → 발각 차단을 위해 살해" 동기 골격이 코퍼스에서 이미 과반에
 * 가깝게 쓰였는데 새 사건이 또 같은 골격을 쓰는지 검사한다.
 */
export function checkMotiveArchetypeOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
): Issue[] {
  const motiveText: string = master.full_truth?.motive ?? '';
  if (!WHISTLEBLOWER_MOTIVE.test(motiveText)) return [];
  const comparableCases = otherCases.filter((o) => o.caseId !== caseId);
  if (comparableCases.length === 0) return [];

  const matching = comparableCases.filter((o) =>
    WHISTLEBLOWER_MOTIVE.test(o.master.full_truth?.motive ?? ''),
  ).length;
  const ratio = matching / comparableCases.length;
  if (ratio >= MOTIVE_ARCHETYPE_OVERUSE_THRESHOLD) {
    return [
      {
        severity: 'error',
        code: 'MOTIVE_ARCHETYPE_OVERUSE',
        message: `full_truth.motive가 "폭로/신고 예고 → 발각 차단을 위해 살해"라는 동기 골격을 쓰는데, 이미 코퍼스의 ${(ratio * 100).toFixed(0)}%(${matching}/${comparableCases.length}건)가 같은 골격이다. 다른 동기 아키타입(복수, 치정, 상속·재산 다툼, 신념·집착, 보호 동기 등)으로 다시 설계할 것.`,
      },
    ];
  }
  return [];
}

// case_identity.setting이 "곧 있을 진위 감정/자격 심사/인증 검사에서 부정이 들통날
// 상황"을 시간 압박 장치로 쓰는 배경이 코퍼스 167건 중 64건(38%)을 차지한다 —
// MOTIVE_ARCHETYPE_OVERUSE가 잡는 "폭로 위협" 동기와 짝을 이뤄 반복되는 배경
// 골격이다("무엇을 숨기려 했는가"의 대상만 바뀔 뿐 "곧 있을 심사/감정에서
// 발각된다"는 장치 자체는 계속 재사용됨). 배경 소재(공방/경매하우스/박물관 등)
// 자체는 이미 다양하니 이 장치를 금지하는 게 아니라, 코퍼스 비중이 임계값을
// 넘으면 같은 장치를 또 쓰는 새 사건을 코드 레벨로 막는다.
const CERTIFICATION_DEADLINE_BACKDROP = /심사|인증|감정/;
const SETTING_BACKDROP_OVERUSE_THRESHOLD = 0.3;

/**
 * case_identity.setting이 "곧 있을 심사/인증/감정에서 부정이 발각된다"는 배경
 * 장치를 코퍼스에서 이미 임계값 넘게 쓰는데 새 사건이 또 같은 장치를 쓰는지 검사한다.
 */
export function checkSettingBackdropOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
): Issue[] {
  const settingText: string = master.case_identity?.setting ?? '';
  if (!CERTIFICATION_DEADLINE_BACKDROP.test(settingText)) return [];
  const comparableCases = otherCases.filter((o) => o.caseId !== caseId);
  if (comparableCases.length === 0) return [];

  const matching = comparableCases.filter((o) =>
    CERTIFICATION_DEADLINE_BACKDROP.test(o.master.case_identity?.setting ?? ''),
  ).length;
  const ratio = matching / comparableCases.length;
  if (ratio >= SETTING_BACKDROP_OVERUSE_THRESHOLD) {
    return [
      {
        severity: 'error',
        code: 'SETTING_BACKDROP_OVERUSE',
        message: `case_identity.setting이 "곧 있을 진위 감정/자격 심사/인증 검사에서 부정이 발각된다"는 배경 장치를 쓰는데, 이미 코퍼스의 ${(ratio * 100).toFixed(0)}%(${matching}/${comparableCases.length}건)가 같은 장치다. 심사·감정·인증이 아닌 다른 시간 압박 장치(개인적 약속, 사적 재회, 우연한 방문 등)로 다시 설계할 것.`,
      },
    ];
  }
  return [];
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
    issues.push(...checkMotiveArchetypeOveruse(caseId, master, otherCases));
    issues.push(...checkSettingBackdropOveruse(caseId, master, otherCases));
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
