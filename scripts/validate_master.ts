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

// 런타임과 같은 판정을 써야 하는 검사가 하나 있어서(CLAIM_FACT_DUPLICATE)
// app/에서 함수 하나를 가져온다. 이 파일은 원래 외부 의존이 없었지만,
// 같은 규칙을 두 벌로 두면 검사기와 화면이 서로 다른 말을 하게 된다.
// check-case.mjs가 audit-* 스크립트와 함께 컴파일하므로 경로는 그대로 는다.
import { authoredStatementContainment } from '../app/gm/response-signals';
// 첫 대면이 무엇을 말하는지는 엔진이 이 정규식으로 가른다. 같은 판정을
// 두 벌로 두면 검사기가 통과시킨 사건이 화면에서는 알리바이부터 말한다.
import { ALIBI_HINT } from '../app/gm/offline-engine';

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

// alreadyRegistered는 관계 모양 검사(별 모양·고아 인물) 두 개에만 쓴다 —
// 이미 머지된 사건에서 그 둘이 error가 되면, 실플레이 피드백으로 마스터를
// 고친 뒤 check:case를 다시 돌리는 작업 흐름이 거기서 막힌다. 나머지
// 검사는 이 값과 무관하다.
export function validateMaster(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
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
  if (
    DEADLINE_PRESSURE.test(settingText) &&
    FOUND_DEAD_PHRASE.test(settingText)
  ) {
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
  // (?<![가-힣])가 없으면 낱말 안쪽을 잡는다 — "로그는"의 "그는",
  // "태그가"·"로그가"의 "그가"가 대명사로 걸렸다. 코퍼스에서 17건이 그렇게
  // 잘못 막히고 있었다.
  //
  // 소유격(그의/그녀의)도 본다. world_fact는 런타임이 actual_action과 떼어 내
  // 단독으로 넘기므로(filterSafeTimelineFacts → current_timeline_facts는
  // {id, time, world_fact}만 싣는다) "그의 앞치마 주머니에서…"는 그 문장만
  // 받아 든 모델에게 누구 얘기인지 알 수 없는 문장이 된다. 예전 목록에는
  // 이 둘이 빠져 있어 101건이 그냥 통과했다.
  const PERSON_PRONOUN =
    /(?<![가-힣])(그|그녀)(는|가|를|의|에게|와|도)(?=\s|$)/;
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
    /쓰러|숨지|숨진|숨졌|숨져|숨을\\s*거두|사망|죽었|죽은|변사|주검|시신|시체|발견되|발견됐|발견돼|의식을\s*잃|의식이\s*없|질식|중독|추락|익사|자상|출혈/;
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
  issues.push(...checkDetectiveEntryTime(master, alreadyRegistered));
  issues.push(...checkDiscoveryTimeWord(master, alreadyRegistered));
  issues.push(...checkRelationships(master, alreadyRegistered));
  issues.push(...checkAskableCharacters(master));
  issues.push(...checkStatementGating(master, alreadyRegistered));
  issues.push(...checkOpeningClaim(master, alreadyRegistered));
  issues.push(...checkSuspicionWeight(master, alreadyRegistered));
  issues.push(...checkTestimonyAim(master, alreadyRegistered));
  issues.push(...checkSelfMotiveDisclosure(master, alreadyRegistered));
  issues.push(...checkHerringClearance(master, alreadyRegistered));
  issues.push(...checkHypothesisBoard(master));
  issues.push(...checkOpeningCastRollcall(master, alreadyRegistered));
  issues.push(...checkSceneDialogueBreaks(master));
  issues.push(...checkOpeningHearsayOnly(master, alreadyRegistered));
  issues.push(...checkEmptyLocations(master));

  return issues;
}

// 들어가면 할 수 있는 일이 하나도 없는 방을 잡는다.
//
// observation_rules와 detail_rules가 둘 다 비어 있으면 그 방은 도착
// 서술 한 줄이 전부다. AI 화면은 모델이 뭐라도 지어내 주지만 오프라인
// 게임은 그러지 않으므로, 행동 목록이 통째로 비어 보인다 — 플레이어가
// 들어갔다가 곧바로 나온다.
//
// 코퍼스 1,568개 장소 가운데 35개가 그랬다. 그중 28개는 사람이라도
// 있어서 인물 카드로 만날 수는 있었지만, 7개는 정말로 아무것도 없었다.
// 사람이 있든 없든 방 하나에 볼 것 하나는 있어야 한다고 보고 둘 다
// 잡는다 — 사람을 만나는 것과 방을 보는 것은 다른 행동이다.
export function checkEmptyLocations(master: Master): Issue[] {
  const issues: Issue[] = [];
  const peopleThere = new Set<string>();
  for (const ch of master.characters) peopleThere.add(ch.present_location);
  for (const loc of master.locations) {
    const observations = loc.observation_rules ?? [];
    const details = loc.detail_rules ?? [];
    if (observations.length || details.length) continue;
    // 사람이 있으면 인물 카드로 만날 수는 있으니 방이 완전히 죽지는
    // 않는다. 그래도 방을 보는 것과 사람을 만나는 것은 다른 행동이라
    // 그냥 넘기지 않고 warn으로 남긴다. 이미 머지된 28곳이 여기 걸리는데,
    // 실플레이 피드백으로 마스터 하나를 고친 뒤 check:case를 다시 돌리는
    // 것이 실제 작업 흐름이라 거기서 막히면 안 된다 — checkRelationships가
    // 같은 이유로 같은 비대칭을 쓴다.
    const hasPeople = peopleThere.has(loc.id);
    issues.push({
      severity: hasPeople ? 'warn' : 'error',
      code: 'LOCATION_HAS_NO_ACTION',
      message: hasPeople
        ? `${loc.id}(${loc.name})에 observation_rules도 detail_rules도 없음 — 여기 있는 사람을 만나는 것 말고는 이 방에서 할 일이 없다. 둘러보는 관찰 규칙 하나를 두는 편이 낫다.`
        : `${loc.id}(${loc.name})에 observation_rules도 detail_rules도 없고 있는 사람도 없음 — 들어가도 할 수 있는 일이 하나도 없는 방이 된다. 최소한 그 방을 둘러보는 관찰 규칙 하나는 둘 것.`,
    });
  }

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
  if (
    (marker === '오후' || marker === '저녁' || marker === '밤') &&
    hour < 12
  ) {
    hour += 12;
  }
  if (marker === '새벽' && hour === 12) hour = 0;
  return day * 1440 + hour * 60 + minute;
}

// 발견 문장에 붙은 시간대 말이 실제 발견 시각과 맞는가.
//
// CLAUDE.md가 이름 붙여 둔 실패 — 「오프닝이 이른 아침인데 진입 시각이 23:00이면
// 그 자체로 모순」 — 를 마스터 안에서 잡는다. 소설을 한 글자도 안 보는 규칙이라
// `check:novel`이 아니라 여기 있다(거기 두면 소설이 있는 번호에만 듣는다).
// CASE015는 `surface_incident`가 「새벽, … 숨진 채 발견되었다」인데 타임라인의
// 발견은 23:10이고 진입도 23:10이다. CASE153은 「오늘 새벽 … 숨진 채 발견됐다」
// 인데 22:20이다(2026-09, 041~045 소설화 회차 지적).
//
// **순진하게 짜면 안 된다**(2026-09 실측). `setting`/`surface_incident`의 모든
// 시간대 말을 진입 시각·타임라인과 견주면 38건이 나오는데 표본 다섯 중 넷이
// 오탐이었다 — 「낮 동안 사람들이 남긴 자국」은 장면 시각이 아니라 서술이고,
// 「정오 무렵」 심사 + 「이른 아침」 시료 채취는 피해자 행적 ≠ 발견 ≠ 진입이라
// 셋이 다른 것이 정상이다. 그래서 **발견 문장 하나만** 보고(`발견|쓰러진 채|
// 숨진 채|숨을 거둔`), 경계를 넉넉히 잡는다(「새벽」인데 05:50인 CASE016이
// 좁은 경계에서 걸렸다).
//
// 313건에서 6건이 걸리고 전부 진짜다 — 015·153 둘과, 「…앞둔 밤, ○이 숨진 채
// 발견됐다」처럼 **죽은 때와 발견된 때를 한 시각으로 뭉갠** 셋(006·023·148, 실제
// 발견은 이튿날 아침). 등록된 사건은 warn, 새 사건은 error.
//
// 견주는 시각은 **타임라인의 발견 항목**이고, 없으면 진입 시각이다. 시각은
// 날짜 없이 시계만 읽는다 — `parseTimelineStamp`는 날짜 접두사가 없으면 통째로
// null을 내서(「20:00」·「6시 47분」) 이 자리에서는 쓸 수 없다. CASE226의
// 「6시 47분」이 그래서 오탐으로 잡혔었다.
const DISCOVERY_SENTENCE = /발견|쓰러진 채|숨진 채|숨을 거둔/;
// 타임라인에서 기준으로 삼을 「시신의 발견」. `발견`만으로 고르면 「불일치를
// 발견한다」(CASE319 T01, 3일 전 14:00) 같은 항목이 기준이 되어 167건이 잡혔다.
const BODY_DISCOVERY = /(쓰러|숨진|숨을 거|숨져|시신|주검|의식[을이] 잃|사망|변사|죽은 채|숨이 끊)/;
// 시간대 말 → [시작, 끝) 시. 자정을 넘는 것은 끝이 시작보다 작다. 긴 말이 먼저다.
const TIME_OF_DAY_WORDS: Array<[RegExp, number, number]> = [
  [/이른 새벽/, 0, 7],
  [/새벽/, 0, 8],
  [/이른 아침|아침 일찍/, 4, 10],
  [/아침/, 5, 11],
  [/오전/, 5, 13],
  [/정오|한낮/, 10, 15],
  [/낮/, 9, 19],
  [/이른 오후/, 11, 16],
  [/늦은 오후/, 14, 20],
  [/오후/, 12, 20],
  [/이른 저녁/, 15, 21],
  [/저녁/, 16, 23],
  [/늦은 밤|한밤|심야|깊은 밤/, 20, 5],
  [/자정/, 23, 2],
  [/밤/, 18, 6],
];

/** 날짜와 무관하게 시계만 읽는다. 「23:10」·「6시 47분」·「오후 3시 반」. */
function parseClockOnly(raw: string): number | null {
  const text = String(raw ?? '');
  const clock = /(\d{1,2})\s*:\s*(\d{2})/.exec(text);
  if (clock) return (Number(clock[1]) % 24) * 60 + Number(clock[2]);
  const spoken =
    /(오전|오후|새벽|밤|저녁|아침|낮)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|(반))?/.exec(
      text,
    );
  if (!spoken) return null;
  let hour = Number(spoken[2]);
  const minute = spoken[4] ? 30 : Number(spoken[3] ?? 0);
  const marker = spoken[1];
  if ((marker === '오후' || marker === '저녁' || marker === '밤') && hour < 12) hour += 12;
  if (marker === '새벽' && hour === 12) hour = 0;
  return (hour % 24) * 60 + minute;
}

function hourInRange(hour: number, start: number, end: number): boolean {
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function checkDiscoveryTimeWord(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  // 견줄 시각 — 타임라인의 발견 항목, 없으면 진입 시각.
  const timeline = (master.actual_timeline ?? []) as Array<{
    id?: string;
    time?: string;
    actual_action?: string;
    world_fact?: string;
  }>;
  let ref: { label: string; minutes: number } | null = null;
  for (const t of timeline) {
    // 「발견」은 행동 쪽(`actual_action`)에 있어야 한다 — `world_fact`에만 있으면
    // 죽은 때의 항목이 발견 항목으로 잡힌다(CASE023 T06 「전원을 켠다」, 22:10).
    const said = `${t.actual_action ?? ''} ${t.world_fact ?? ''}`;
    if (!/발견|신고/.test(t.actual_action ?? '') || !BODY_DISCOVERY.test(said)) continue;
    const m = parseClockOnly(t.time ?? '');
    if (m === null) continue;
    ref = { label: `타임라인 ${t.id ?? '?'}("${t.time}")`, minutes: m };
    break;
  }
  if (!ref) {
    const entry = master.opening_scene?.detective_entry_time ?? '';
    const m = parseClockOnly(entry);
    if (m === null) return [];
    ref = { label: `detective_entry_time("${entry}")`, minutes: m };
  }
  const hour = Math.floor(ref.minutes / 60);

  const texts: Array<[string, string]> = [
    ['case_identity.setting', String(master.case_identity?.setting ?? '')],
    ...((master.surface_incident ?? []) as string[]).map(
      (t, i) => [`surface_incident[${i}]`, String(t)] as [string, string],
    ),
  ];
  const issues: Issue[] = [];
  for (const [where, text] of texts) {
    for (const sentence of text.split(/(?<=[.?!])\s+/)) {
      if (!DISCOVERY_SENTENCE.test(sentence)) continue;
      // 문장에 숫자 시각이 같이 있으면 그쪽이 말하는 것이라 시간대 말은 안 본다.
      if (parseClockOnly(sentence) !== null) continue;
      // 한 문장에 시간대 말이 둘이면(「전날 밤 다툰 뒤 아침에 발견」) 발견 동사에
      // 가장 가까운 **앞쪽** 것이 발견의 시각이다. 앞에 없으면 뒤의 첫 것.
      const verbAt = DISCOVERY_SENTENCE.exec(sentence)?.index ?? sentence.length;
      const found: Array<{ at: number; shown: string; start: number; end: number }> = [];
      for (const [re, start, end] of TIME_OF_DAY_WORDS) {
        for (const m of sentence.matchAll(new RegExp(re.source, 'g'))) {
          if (found.some((f) => f.at <= m.index! && m.index! < f.at + f.shown.length)) continue;
          // 「전날 밤」·「어젯밤」·「그날 밤」은 발견의 시각이 아니라 사건의 밤이다.
          if (/(전날|어제|어젯|그날|지난|전\s?날)\s*$/.test(sentence.slice(Math.max(0, m.index! - 4), m.index!))) continue;
          found.push({ at: m.index!, shown: m[0], start, end });
        }
      }
      if (!found.length) continue;
      const before = found.filter((f) => f.at < verbAt).sort((a, b) => b.at - a.at);
      const pick = before[0] ?? found.sort((a, b) => a.at - b.at)[0];
      const { shown, start, end } = pick;
      if (hourInRange(hour, start, end)) continue;
      issues.push({
        severity: overuseSeverity(alreadyRegistered),
        code: 'DISCOVERY_TIME_WORD_MISMATCH',
        message: `${where}의 발견 문장이 「${shown}」이라고 하는데 실제 발견은 ${ref.label}, ${String(hour).padStart(2, '0')}시대다. 오프닝이 이른 아침인데 진입 시각이 23:00이면 그 자체로 모순이다. 죽은 때와 발견된 때가 다른 사건이면(밤에 죽고 이튿날 아침에 발견) 문장이 둘을 한 시각으로 뭉갠 것이니 발견의 시각으로 고쳐 쓰고, 그게 아니면 타임라인·진입 시각 쪽이 틀린 것이다. 문장: 「${sentence.slice(0, 60)}」`,
      });
    }
  }
  return issues;
}

// 탐정이 현장에 들어온 시각은 이 사건의 "지금"이다. 대사 속 오늘·어제·
// 어젯밤이 전부 이 값을 기준으로 읽히므로, 없으면 같은 밤을 인물마다 다르게
// 부르게 된다 — 시각이 곧 단서인 게임에서 그건 서로 다른 두 밤이 된다.
// 그리고 탐정은 사건보다 먼저 도착할 수 없으니, 마지막 타임라인 항목보다
// 앞설 수도 없다.
export function checkDetectiveEntryTime(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
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
  // **시각이 없는 진입 시각은 있어도 없는 것과 같다.** 「사건 당일 아침」은
  // 형식을 지킨 듯 보이지만 HH:MM 이 없어 아래 비교도, `check:novel`의 진입
  // 시각 검사도 조용히 건너뛴다(둘 다 파싱이 안 되면 [] 를 돌려준다). CASE041 은
  // 그래서 발견보다 늦은 진입이 잡히지 않았고, CASE036 은 소설이 1장 시각을
  // 세우고도 견줄 것이 없었다. 코퍼스 27건이 이 꼴이라 등록된 사건은 warn,
  // 새 사건은 error — `relationships`와 같은 비대칭이다.
  if (!/\d{1,2}\s*:\s*\d{2}/.test(entryTime)) {
    return [
      {
        severity: overuseSeverity(alreadyRegistered),
        code: 'DETECTIVE_ENTRY_TIME_NO_CLOCK',
        message: `detective_entry_time("${entryTime}")에 시각이 없음 — 「아침」·「저녁」 같은 시간대 말만으로는 타임라인과 견줄 수 없고, check:novel 의 진입 시각 검사도 건너뛴다. 24시간제 숫자로 적을 것(예: "사건 당일 09:00").`,
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

// 인물 사이의 관계(2026-09 방향 전환). 장소를 뒤지는 게임에서 사람을 읽는
// 게임으로 옮기려면 관계가 마스터에 적혀 있어야 한다 — 적을 데가 없으면
// GM이 매 턴 즉흥으로 만들고, 그러면 십수 년을 같이 일한 사람들이 서로
// 처음 보는 사람처럼 군다.
//
// 없는 것은 error가 아니라 warn이다. 이 필드가 생기기 전에 만들어진 282건이
// 이미 머지돼 있고, 실플레이 피드백으로 그중 하나를 고친 뒤 check:case를
// 다시 돌리는 일이 실제 작업 흐름이라 거기서 막히면 안 된다. 새로 만드는
// 사건에서는 스키마의 required와 생성 지침이 이걸 강제한다. 반대로 적혀
// 있는데 깨져 있으면 그건 error다 — 런타임이 실제로 읽는 값이기 때문이다.
// 면담해도 물어볼 것이 없는 인물. evidence 의 discovery_condition 이 그 인물의
// 이름으로 시작하는 카드가 하나도 없으면, 첫 면담에 initial_claims 를 쏟고 나면
// 그 사람에게 할 수 있는 것이 사라진다 — CASE060 실플레이 신고가 이것이었다
// ("면담 1차에 다 말함, 물어볼 게 없음").
//
// 진범은 세지 않는다. 진범은 contradiction_stages 가 굴리므로 증거를 들이대는
// 것이 그 사람에게 할 일이고, 질문 카드가 없어도 빈손이 아니다.
//
// 코퍼스 1,533명 중 800명(52.2%)이 여기 걸리므로 warn 이다. 기존 사건을
// 손볼 때마다 CI 가 막히면 안 된다 — relationships 검사와 같은 비대칭이고,
// 새 사건은 생성 지침이 막는다.
export function checkAskableCharacters(master: Master): Issue[] {
  const issues: Issue[] = [];
  // 이 파일의 나머지는 (master as any) 로 필드를 꺼내지만 여기서는 쓰지 않는다 —
  // oxlint 기준선이 no-explicit-any 부채를 늘리지 못하게 막고 있다.
  const shape = master as unknown as {
    characters?: Array<{ id: string; name: string }>;
    evidence?: Array<{ discovery_condition?: string }>;
    full_truth?: { responsible_character_id?: string };
  };
  const characters = shape.characters ?? [];
  const evidence = shape.evidence ?? [];
  const culprit = shape.full_truth?.responsible_character_id;
  const conditions = evidence
    .map((item) => (item.discovery_condition ?? '').trim())
    .filter(Boolean);

  const mute = characters.filter(
    (character) =>
      character.id !== culprit &&
      character.name &&
      !conditions.some((condition) => condition.startsWith(character.name)),
  );
  if (mute.length) {
    issues.push({
      severity: 'warn',
      code: 'CHARACTER_WITH_NO_QUESTION',
      message: `${mute
        .map((character) => `${character.id}(${character.name})`)
        .join(
          ', ',
        )}에게 물어볼 증거 카드가 하나도 없음 — discovery_condition 이 그 이름으로 시작하는 evidence 를 만들 것. 첫 면담에 initial_claims 를 쏟고 나면 그 인물에게 할 수 있는 것이 남지 않는다.`,
    });
  }
  return issues;
}

// 레드헤링이 실제로 게임이 되는가.
//
// how_to_clear 는 「이 사람에 대한 의심이 무엇으로 풀리는가」다. 런타임
// (offline-engine 의 herringRequirementsMet)은 그 문장에서 id 만 읽는다 —
// 증거 E## 는 손에 들었는지, 사실·진술 F-/S- 는 들었는지. 그래서 문장이
// 무엇을 가리키느냐가 곧 플레이어가 해야 하는 일이다. 2026-09 에 코퍼스
// 602개를 갈라 보니 셋으로 나뉘었다:
//
//   - id 가 하나도 없음 (194개). 런타임이 「그 사람에게 물어볼 것을 다
//     물어봤는가」로 떨어진다. 버튼이 사라질 때까지 누르면 풀린다 —
//     판단이 아니라 절차다. 문장은 대체로 「A 와 B 를 대조한다」라고 적혀
//     있어서, 대조할 두 쪽에 번호만 붙이면 되는 경우가 많다.
//   - 부르는 것이 전부 주인공 본인 것 (본인 카드 118개 + 본인 진술 13개).
//     「본인이 아니라고 했다」로 풀린다. CASE289 표시온이 그랬다 — 해소
//     조건이 표시온에게 물어서 받은 E01 이라, 메뉴에 「표시온 알리바이
//     증언을 표시온에게 제시한다」가 떴다.
//   - 남의 카드·남의 진술·장소 관찰 사실이 하나라도 낌. 두 사람을 오가거나
//     방을 둘러봐야 하므로 성립한다.
//
// 앞의 둘을 잡는다. 이미 등록된 사건은 warn 이다 — 325개가 걸리므로
// error 면 기존 사건을 손볼 때마다 CI 가 막힌다. 새 사건은 error.
//
// 「주인공」은 surface_suspicion 에 처음 나오는 인물 이름이다. 문장이 두
// 사람을 같이 말하면 틀릴 수 있고(CASE024 R02), 그때는 메시지가 말하는
// 이름을 보고 판단할 것.
export function checkHerringClearance(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    characters?: Array<{
      id: string;
      name: string;
      knows?: Array<{ fact_id?: string }>;
      initial_claims?: Array<{ claim_id?: string }>;
    }>;
    evidence?: Array<{ id: string; discovery_condition?: string }>;
    locations?: Array<{
      observation_rules?: Array<{ release_fact_id?: string }>;
    }>;
    contradiction_stages?: Array<{ id?: string; target_character?: string }>;
    red_herrings?: Array<{
      id?: string;
      surface_suspicion?: string;
      how_to_clear?: string;
    }>;
  };
  const characters = shape.characters ?? [];
  const evidenceById = new Map(
    (shape.evidence ?? []).map((item) => [item.id, item]),
  );
  // id → 누구 것인가. 장소 관찰 사실은 'LOC', 단계는 그 대상 인물.
  const ownerOfId = new Map<string, string>();
  for (const character of characters) {
    for (const fact of character.knows ?? []) {
      if (fact.fact_id) ownerOfId.set(fact.fact_id, character.id);
    }
    for (const claim of character.initial_claims ?? []) {
      if (claim.claim_id) ownerOfId.set(claim.claim_id, character.id);
    }
  }
  for (const location of shape.locations ?? []) {
    for (const rule of location.observation_rules ?? []) {
      if (rule.release_fact_id) ownerOfId.set(rule.release_fact_id, 'LOC');
    }
  }
  for (const stage of shape.contradiction_stages ?? []) {
    if (stage.id && stage.target_character) {
      ownerOfId.set(stage.id, stage.target_character);
    }
  }

  const ID = /\b(?:E\d+|F-[A-Z0-9-]+|S-[A-Z0-9-]+|C\d+)\b/g;
  for (const herring of shape.red_herrings ?? []) {
    const label = herring.id ?? '(id 없음)';
    const ids = [...new Set((herring.how_to_clear ?? '').match(ID) ?? [])];
    if (!ids.length) {
      issues.push({
        severity: overuseSeverity(alreadyRegistered),
        code: 'HERRING_CLEAR_NO_ID',
        message: `${label}의 how_to_clear 가 증거·사실·진술 id 를 하나도 안 부름 — 런타임이 「그 사람에게 물어볼 것을 다 물어봤는가」로 떨어져, 버튼이 사라질 때까지 누르면 풀린다. 문장이 대조한다고 말하는 두 쪽의 id(E##/F-/S-)를 적을 것.`,
      });
      continue;
    }
    // 문장에서 **가장 앞에** 나오는 인물이다. characters.find 로 잡으면 배열
    // 순서라, 「유수현은 성재윤과…」(CASE024 R02)에서 CH02 성재윤이 먼저
    // 걸려 진범이 주인공이 된다 — 그러면 본인 카드 판정이 통째로 틀린다.
    const suspicion = herring.surface_suspicion ?? '';
    const owner = characters
      .map((character) => ({
        character,
        at: suspicion.indexOf(character.name),
      }))
      .filter((item) => item.character.name && item.at >= 0)
      .sort((a, b) => a.at - b.at)[0]?.character;
    if (!owner) continue;
    const unknown = ids.filter(
      (id) => !ownerOfId.has(id) && !evidenceById.has(id),
    );
    if (unknown.length) {
      issues.push({
        severity: 'error',
        code: 'HERRING_CLEAR_UNKNOWN_ID',
        message: `${label}의 how_to_clear 가 정의되지 않은 id 를 부름: ${unknown.join(', ')} — 그 조건은 영원히 안 채워진다.`,
      });
      continue;
    }
    const isOwn = (id: string) => {
      const card = evidenceById.get(id);
      if (card) {
        return (card.discovery_condition ?? '').startsWith(`${owner.name}에게`);
      }
      return ownerOfId.get(id) === owner.id;
    };
    if (ids.every(isOwn)) {
      issues.push({
        severity: overuseSeverity(alreadyRegistered),
        code: 'HERRING_CLEAR_SELF_ONLY',
        message: `${label}(${owner.name})의 how_to_clear 가 부르는 것이 전부 ${owner.name} 본인의 말(${ids.join(', ')}) — 「본인이 아니라고 했다」로 풀린다. 남의 카드, 남의 진술, 또는 장소 관찰 사실(F-L##-OBS-##)을 하나는 부를 것. 주인공 판정은 surface_suspicion 에 처음 나오는 이름이다.`,
      });
    }
  }
  return issues;
}

// 오프닝이 등장인물 명부가 되는 것을 막는다.
//
// 옛 사건은 첫 장면에서 인물을 직함째 줄줄이 소개한다 — "막내 조향 보조 권도영이
// 뛰어나와 도움을 요청했다. 그 뒤를 따라 원장 하유담이 걸어 나왔고, 하유담의 개인
// 매니저 신재이는 안쪽에서 전화를 붙들고 있었다."(CASE020) 네 명을 직함째 소개해
// 버리면 탐정이 그 뒤에 알아낼 것이 남지 않고, 첫 장면이 소개란이 된다.
//
// 코퍼스가 이 습관이 사라진 시점을 보여 준다: 오프닝에 직함이 박힌 인물이
// CASE001~199는 평균 0.5명(네 명 이상 등장 13~18%)인데 CASE200~299는 0.0명(0~2%)이다.
// 그런데 CASE300~은 0.4명 / 10%로 되돌아오고 있어서, 지침만으로는 안 지켜진다.
//
// 피해자(key_figures)는 세지 않는다 — 쓰러진 채 발견되는 것이 오프닝의 사건 자체다.
// 대사와 지문이 한 문단에 뭉친 것을 잡는다.
//
// 오프닝은 예전에 한 번 일괄로 고쳤지만 엔딩은 손대지 않아서, CASE001~199의
// 99~100%가 "…빚 때문이었어요." 서지안이 낮은 목소리로 말했다. "몇 점만…"
// 처럼 한 줄에 다 뭉쳐 있었다(사건당 평균 4줄, 247건 1,309문단을 갈랐다).
// 이건 취향 문제가 아니다 — normalizeParagraphs 는 줄바꿈만 가르므로 뭉친 줄은
// 화면에서도 그대로 한 덩어리로 나온다.
// 사건을 탐정이 보지 않고 전해 듣기만 하는 오프닝을 잡는다.
//
// 이름이 몇 개 나오는지는 자가 아니다 — CASE258은 인물 이름 없이도 장면이 선다
// (협곡, 끊긴 라이브 방송, 뛰쳐나오는 스태프). 갈리는 것은 탐정이 그 자리를
// 보았는가다. 아래는 그렇지 않은 형태로, 서술에는 사건이 한 번도 안 나오고
// 따옴표 안 전언으로만 전달된다:
//
//   한지우가 먼저 로비 안쪽 상황을 살피고 돌아와 다급히 말했다.
//   "수석 배터리관리사님이 스왑랙 앞에서 의식을 잃은 채 발견됐대요." — CASE070
//
// 플레이어는 공간을 볼 수 없고 머릿속에 그려야 하는데(CLAUDE.md 방향 전환 3번)
// 그릴 것이 주어지지 않는다. 코퍼스에서 47건이고 CASE061~111 한 덩어리다.
export function checkOpeningHearsayOnly(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const narrative =
    (master as unknown as { opening_scene?: { narrative?: string } })
      .opening_scene?.narrative ?? '';
  if (!narrative) return issues;

  const DEATH = /쓰러|숨지|숨진|숨졌|숨져|사망|의식을\s*잃|발견/;
  const HEARSAY =
    /대요|댑니다|답니다|래요|라네요|다고\s*(해요|합니다|한다|들었)|는다는데|다는데요/;

  const lines = narrative
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const quoted = lines.filter((line) => line.startsWith('"'));
  const prose = lines.filter((line) => !line.startsWith('"'));

  if (prose.some((line) => DEATH.test(line))) return issues;
  if (!quoted.some((line) => DEATH.test(line) && HEARSAY.test(line))) {
    return issues;
  }

  issues.push({
    severity: overuseSeverity(alreadyRegistered),
    code: 'OPENING_INCIDENT_ONLY_HEARSAY',
    message:
      'opening_scene.narrative의 서술이 사건을 한 번도 보여 주지 않고, 따옴표 안 전언으로만 전달한다 — 탐정이 현장이나 그 문턱을 직접 보게 할 것. 인물 이름을 넣으라는 뜻이 아니다(이름 없이도 장면은 선다). 무엇이 어디에 있고 무엇이 벌어져 있는지가 서술에 있어야 한다.',
  });
  return issues;
}

export function checkSceneDialogueBreaks(master: Master): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    opening_scene?: { narrative?: string };
    ending_scene?: { narrative?: string };
  };
  for (const [label, text] of [
    ['opening_scene', shape.opening_scene?.narrative ?? ''],
    ['ending_scene', shape.ending_scene?.narrative ?? ''],
  ] as const) {
    if (!text) continue;
    const mashed = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => {
        if ((line.match(/"/g) ?? []).length < 2) return false;
        // 따옴표 밖에 지문이 남아 있으면 뭉친 줄이다
        return line.replace(/"[^"]*"/g, '').trim().length > 6;
      });
    if (mashed.length) {
      issues.push({
        severity: 'warn',
        code: 'SCENE_DIALOGUE_MASHED',
        message: `${label}.narrative에 대사와 지문이 한 문단에 뭉친 줄이 ${mashed.length}개 있다 — 서술 한 덩어리, 대사 한 줄을 각각 빈 줄로 나눌 것. 예: ${mashed[0].slice(0, 40)}…`,
      });
    }
  }
  return issues;
}

export function checkOpeningCastRollcall(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    characters?: Array<{ id: string; name: string; role?: string }>;
    opening_scene?: { narrative?: string };
  };
  const narrative = shape.opening_scene?.narrative ?? '';
  if (!narrative) return issues;

  const named = (shape.characters ?? []).filter(
    (character) => character.name && narrative.includes(character.name),
  );

  // "원장 하유담"처럼 직함이 이름 바로 앞에 붙은 것만 센다. 직함에 쓰이는 낱말이
  // 서술 어딘가에 따로 나오는 것까지 세면 애먼 문장이 걸린다.
  const titled = named.filter((character) => {
    // 직함 전체가 아니라 끝 낱말을 본다 — role 은 "조향 스튜디오 원장"인데 서술은
    // "원장 하유담"이라고 쓰므로 통짜로 맞춰 보면 하나도 안 걸린다.
    const parts = (character.role ?? '').split('/')[0].trim().split(/\s+/);
    const role = parts[parts.length - 1] ?? '';
    if (role.length < 2) return false;
    // 첫 등장만 보면 안 된다 — 이름이 먼저 맨몸으로 나오고 뒤에서 직함이 붙는 경우를 놓친다
    for (
      let at = narrative.indexOf(character.name);
      at !== -1;
      at = narrative.indexOf(character.name, at + 1)
    ) {
      if (narrative.slice(Math.max(0, at - 14), at).includes(role)) return true;
    }
    return false;
  });

  if (named.length >= 4) {
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'OPENING_CAST_ROLLCALL',
      message: `opening_scene.narrative에 등장인물 ${named.length}명(${named
        .map((character) => character.name)
        .join(
          ', ',
        )})이 한꺼번에 나온다 — 첫 장면이 등장인물 소개란이 된다. 그 자리에 실제로 있는 사람만 남기고 나머지는 면담에서 만나게 할 것(기본 둘 이하).`,
    });
  }
  if (titled.length) {
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'OPENING_CAST_ROLLCALL',
      message: `opening_scene.narrative가 ${titled
        .map((character) => character.name)
        .join(
          ', ',
        )}의 이름 앞에 직함을 붙여 소개한다 — 이름과 직함은 면담에서 나오게 하고, 오프닝에서는 그 사람이 무엇을 하고 있는지로 드러낼 것.`,
    });
  }
  return issues;
}

// 자연어 문장이 이름으로 부르는 마스터 id. checkHerringClearance 안의 것과
// 같은 모양이다 — 런타임(offline-engine.ts 의 REFERENCED_MASTER_ID)이 읽는
// 것과 이 셋이 어긋나면 검사기가 통과시킨 문장을 런타임이 못 읽는다.
const REFERENCED_ID = /\b(?:E\d+|F-[A-Z0-9-]+|S-[A-Z0-9-]+|C\d+)\b/g;

// 가설 보드(docs/offline-deduction.md). 후보 목록이 하나라도 있으면 검사한다 —
// 없는 사건은 보드가 안 열리므로 아무 말도 하지 않는다. 전부 error 다: 이
// 필드들은 새 포맷에서만 나오고, 여기서 깨진 것은 런타임이 영영 못 여는
// 칸이 된다(정답이 둘이거나 없으면 확정이 안 되고, 가짜 후보에 반박이 없으면
// 틀린 가설이 전진이 아니라 벽이 된다).
type HypothesisCandidateShape = {
  id?: string;
  text?: string;
  truth?: boolean;
  evidence_for?: string[];
  refutation?: string;
  refutation_releases?: string;
  refuted_by?: string;
};

export function checkHypothesisBoard(master: Master): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    motives?: HypothesisCandidateShape[];
    times?: HypothesisCandidateShape[];
    methods?: HypothesisCandidateShape[];
    suspect_refutations?: Record<string, { text?: string; releases?: string }>;
    full_truth?: {
      responsible_character_id?: string;
      decisive_evidence_ids?: string[];
    };
  };
  const lists: Array<[string, HypothesisCandidateShape[] | undefined]> = [
    ['motives', shape.motives],
    ['times', shape.times],
    ['methods', shape.methods],
  ];
  if (!lists.some(([, list]) => list && list.length)) return issues;

  const evidenceIds = new Set<string>(
    (master.evidence ?? [])
      .map((item: { id?: string }) => item.id ?? '')
      .filter(Boolean),
  );
  const characterIds = new Set<string>(
    (master.characters ?? [])
      .map((item: { id?: string }) => item.id ?? '')
      .filter(Boolean),
  );
  const statementIds = new Set<string>();
  for (const character of master.characters ?? []) {
    const holder = character as {
      knows?: Array<{ fact_id?: string }>;
      initial_claims?: Array<{ claim_id?: string }>;
    };
    for (const fact of holder.knows ?? []) {
      if (fact.fact_id) statementIds.add(fact.fact_id);
    }
    for (const claim of holder.initial_claims ?? []) {
      if (claim.claim_id) statementIds.add(claim.claim_id);
    }
  }
  for (const location of master.locations ?? []) {
    const rules = (
      location as { observation_rules?: Array<{ release_fact_id?: string }> }
    ).observation_rules;
    for (const rule of rules ?? []) {
      if (rule.release_fact_id) statementIds.add(rule.release_fact_id);
    }
  }
  const culprit = shape.full_truth?.responsible_character_id;

  for (const [name, list] of lists) {
    if (!list || !list.length) {
      issues.push({
        severity: 'error',
        code: 'HYPOTHESIS_LIST_MISSING',
        message: `${name} 가 없다. 가설 보드는 「언제·왜·어떻게」 셋이 다 있어야 열린다 — 하나라도 비면 그 칸을 채울 수 없어 2막이 영영 안 열린다.`,
      });
      continue;
    }
    const truths = list.filter((item) => item.truth === true);
    if (truths.length !== 1) {
      issues.push({
        severity: 'error',
        code: 'HYPOTHESIS_TRUTH_COUNT',
        message: `${name} 에 truth:true 가 ${truths.length}개다. 정확히 하나여야 한다 — 없으면 확정이 안 되고, 둘이면 어느 쪽을 걸어도 맞는다.`,
      });
    }
    const seen = new Set<string>();
    for (const item of list) {
      const label = `${name}.${item.id ?? '(id 없음)'}`;
      if (!item.id || seen.has(item.id)) {
        issues.push({
          severity: 'error',
          code: 'HYPOTHESIS_ID_BROKEN',
          message: `${label} 의 id 가 비었거나 겹친다.`,
        });
      }
      if (item.id) seen.add(item.id);
      if (!(item.text ?? '').trim()) {
        issues.push({
          severity: 'error',
          code: 'HYPOTHESIS_TEXT_MISSING',
          message: `${label} 의 text 가 비었다 — 플레이어가 고를 문구다.`,
        });
      }
      for (const id of item.evidence_for ?? []) {
        if (!evidenceIds.has(id)) {
          issues.push({
            severity: 'error',
            code: 'HYPOTHESIS_UNKNOWN_ID',
            message: `${label}.evidence_for 가 없는 카드 ${id} 를 부른다.`,
          });
        }
      }
      if (item.truth) {
        if (!(item.evidence_for ?? []).length) {
          issues.push({
            severity: 'error',
            code: 'HYPOTHESIS_TRUTH_NO_EVIDENCE',
            message: `${label} 은 정답인데 evidence_for 가 비었다 — 무엇을 걸어도 확정이 안 된다.`,
          });
        }
      } else if (!(item.refutation ?? '').trim()) {
        issues.push({
          severity: 'error',
          code: 'HYPOTHESIS_NO_REFUTATION',
          message: `${label} 은 가짜 후보인데 refutation 이 없다. 틀린 가설이 전진이 되려면 반박이 있어야 한다 — 없으면 그 갈래는 벽이다.`,
        });
      }
      if (
        item.refutation_releases &&
        !statementIds.has(item.refutation_releases)
      ) {
        issues.push({
          severity: 'error',
          code: 'HYPOTHESIS_UNKNOWN_ID',
          message: `${label}.refutation_releases 가 없는 사실·진술 ${item.refutation_releases} 를 부른다.`,
        });
      }
      if (item.refuted_by && !characterIds.has(item.refuted_by)) {
        issues.push({
          severity: 'error',
          code: 'HYPOTHESIS_UNKNOWN_ID',
          message: `${label}.refuted_by 가 없는 인물 ${item.refuted_by} 를 가리킨다.`,
        });
      }
    }
  }

  for (const [id, entry] of Object.entries(shape.suspect_refutations ?? {})) {
    if (!characterIds.has(id)) {
      issues.push({
        severity: 'error',
        code: 'HYPOTHESIS_UNKNOWN_ID',
        message: `suspect_refutations.${id} 가 없는 인물이다.`,
      });
      continue;
    }
    if (id === culprit) {
      issues.push({
        severity: 'error',
        code: 'HYPOTHESIS_CULPRIT_REFUTATION',
        message: `suspect_refutations.${id} 는 진범이다. 진범에게 「나는 아니다」를 주면 정답 지목이 반박당한다.`,
      });
    }
    if (!(entry.text ?? '').trim()) {
      issues.push({
        severity: 'error',
        code: 'HYPOTHESIS_NO_REFUTATION',
        message: `suspect_refutations.${id}.text 가 비었다.`,
      });
    }
    if (entry.releases && !statementIds.has(entry.releases)) {
      issues.push({
        severity: 'error',
        code: 'HYPOTHESIS_UNKNOWN_ID',
        message: `suspect_refutations.${id}.releases 가 없는 사실·진술 ${entry.releases} 를 부른다.`,
      });
    }
  }

  for (const id of shape.full_truth?.decisive_evidence_ids ?? []) {
    if (!evidenceIds.has(id)) {
      issues.push({
        severity: 'error',
        code: 'HYPOTHESIS_UNKNOWN_ID',
        message: `full_truth.decisive_evidence_ids 가 없는 카드 ${id} 를 부른다.`,
      });
    }
  }
  return issues;
}

// 면담 한 번에 그 사람이 아는 것이 다 나오는가.
//
// 오프라인 GM 의 「그 밖에 이상한 점은 없었는지 묻는다」(recall) 는 hidden_until
// 에 안 걸린 knows 를 적힌 순서대로 하나씩 내준다. 그래서 잠금이 하나도 없는
// 인물은 버튼을 세 번 누르면 아는 것이 바닥난다 — CASE030 실플레이에서 채이든이
// 그랬다(다섯 개가 연달아 나왔다). 진범은 contradiction_stages 가 굴리므로
// 여기서 세지 않고, 대립 단계가 풀어 주는 사실도 이미 순서가 있으므로 뺀다.
//
// 세 개가 기준인 것은 코퍼스 분포다 — 진범 아닌 인물 1,245명 중 열린 knows 가
// 0~2개인 사람이 1,174명(94%)이고, 3개 이상은 71명(40건)뿐이다.
const UNGATED_KNOWS_LIMIT = 3;

// 첫 대면에서 알리바이 말고 할 말이 있는가.
//
// 오프라인 GM 의 첫 면담은 `initial_interview_range` 안의 진술 중 알리바이꼴이
// **아닌** 것을 먼저 말한다 — 묻지도 않았는데 「그 시각엔 사무실에 있었어요」가
// 인사 다음 줄에 나오던 것을 막으려는 것이다(1,558명 중 335명이 그랬고 그중
// 81명이 진범이었다). 그런데 그 사람의 진술이 전부 알리바이꼴이면 미룰 데가
// 없어 그대로 나온다. 남은 94명이 그 경우다.
//
// 알리바이가 아닌 첫마디를 하나 주면 두 가지가 같이 된다. 첫 대면이 그
// 사람에 대한 한 줄이 되고, 「사건 당시 어디에 있었는지 묻는다」가 처음
// 듣는 말을 내주는 보기가 된다.
export function checkOpeningClaim(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    characters?: Array<{
      id: string;
      name: string;
      initial_claims?: Array<{ claim_id?: string; content?: string }>;
      initial_interview_range?: string[];
    }>;
  };

  for (const character of shape.characters ?? []) {
    const claims = character.initial_claims ?? [];
    if (!claims.length) continue;
    const range = character.initial_interview_range?.length
      ? character.initial_interview_range
      : claims.map((claim) => claim.claim_id ?? '');
    const eligible = claims.filter((claim) =>
      range.includes(claim.claim_id ?? ''),
    );
    if (!eligible.length) continue;
    if (eligible.some((claim) => !ALIBI_HINT.test(claim.content ?? ''))) {
      continue;
    }
    issues.push({
      severity: alreadyRegistered ? 'warn' : 'error',
      code: 'CLAIMS_ALIBI_ONLY',
      message: `${character.name}(${character.id})의 첫 면담 진술이 전부 그날 밤 자기 행적이다 — 탐정이 묻기도 전에 알리바이부터 대고, 「사건 당시 어디에 있었는지 묻는다」는 같은 말을 한 번 더 듣는 보기가 된다. 알리바이가 아닌 첫마디를 하나 넣는다: 그때 자기가 하던 일, 발견 당시 현장의 상태, 피해자에 대한 인상, 그날 이상하게 느낀 것 — 시각도 자기 행적도 말하지 않는 한 줄이면 된다.`,
    });
  }
  return issues;
}

export function checkStatementGating(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    characters?: Array<{
      id: string;
      name: string;
      knows?: Array<{ fact_id?: string }>;
      hidden_until?: Array<{ fact_or_claim_id?: string }>;
    }>;
    contradiction_stages?: Array<{
      release?: { claim_or_fact_id?: string };
    }>;
    full_truth?: { responsible_character_id?: string };
  };
  const culprit = shape.full_truth?.responsible_character_id;
  const staged = new Set(
    (shape.contradiction_stages ?? [])
      .map((stage) => stage.release?.claim_or_fact_id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const character of shape.characters ?? []) {
    if (character.id === culprit) continue;
    const gated = new Set(
      (character.hidden_until ?? [])
        .map((gate) => gate.fact_or_claim_id)
        .filter((id): id is string => Boolean(id)),
    );
    const open = (character.knows ?? [])
      .map((fact) => fact.fact_id)
      .filter((id): id is string => Boolean(id))
      .filter((id) => !gated.has(id) && !staged.has(id));
    if (open.length < UNGATED_KNOWS_LIMIT) continue;
    issues.push({
      severity: alreadyRegistered ? 'warn' : 'error',
      code: 'KNOWS_UNGATED_FLOOD',
      message: `${character.name}(${character.id})의 knows ${open.length}개가 전부 hidden_until 없이 열려 있다(${open.join(', ')}) — 면담 한 번에 아는 것이 다 나온다. 앞의 하나둘만 남기고 나머지는 hidden_until 로 사슬을 만든다: release_trigger 에 앞 진술의 id 를 적어 순서를 세우고, release_prerequisite 에 그것을 여는 열쇠(그 사람에게 내밀 카드 E##, 들어야 할 말 F-/S-, 깨야 할 단계 C##)를 적는다.`,
    });
  }
  return issues;
}

// ─── 오프라인 전용 마스터의 뼈대 셋 ─────────────────────────────────────
//
// 아래 셋은 2026-09 에 CASE001 을 다시 쓰면서 세운 뼈대다(docs/offline-deduction.md).
// 앞의 두 검사는 **새 필드를 쓰는 마스터에만** 듣는다 — `points_at` 이 한 장도
// 없으면 옛 판본이라 판정할 재료가 없고, 그걸 억지로 걸면 313건이 통째로
// 빨개진다. 마지막 검사는 필드가 필요 없어 코퍼스 전체에 듣는다(114건).
//
// 셋 다 `pendingReworkWarnings` 에는 넣지 않는다. 그 목록은 사건을 열 때 화면에
// 뜨는 경고이자 목록의 '수사 가능' 라벨이 읽는 한 벌인데, 이 축은 이주 루틴이
// 아직 손대지 않는다 — 올려 두면 114건에 읽을 사람 없는 줄이 하나씩 더 붙는다.
// 밀린 양은 `npm run audit:format` 의 MOTIVE_SELF_DISCLOSURE 가 센다.

// 헛다리 주인공을 가리키는 카드가 둘은 있는가.
//
// 「그럴 만한 사람」과 「그날 그럴 수 있었던 사람」은 다르다. 동기 한 줄만
// 있는 헛다리는 독자가 안 믿는다 — CASE001 첫 판본을 세어 보면 진범만
// 동기·기회·수단·물증 넷을 다 갖고 헛다리 둘은 동기 하나씩이었다. 하나면
// 우연으로 읽히고, **둘이 겹쳐야 사람이 된다.**
export function checkSuspicionWeight(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    characters?: Array<{ id: string; name: string }>;
    evidence?: Array<{ id?: string; points_at?: string }>;
    red_herrings?: Array<{ id?: string; character_id?: string }>;
  };
  const cards = shape.evidence ?? [];
  // 새 필드를 안 쓰는 마스터는 판정할 재료가 없다.
  if (!cards.some((card) => card.points_at)) return issues;
  const nameOf = new Map(
    (shape.characters ?? []).map((item) => [item.id, item.name]),
  );

  for (const herring of shape.red_herrings ?? []) {
    const owner = herring.character_id;
    if (!owner) continue;
    const pointing = cards
      .filter((card) => card.points_at === owner)
      .map((card) => card.id)
      .filter((id): id is string => Boolean(id));
    if (pointing.length >= 2) continue;
    issues.push({
      severity: alreadyRegistered ? 'warn' : 'error',
      code: 'SUSPICION_THIN',
      message: `${herring.id ?? '레드헤링'}: ${nameOf.get(owner) ?? owner}(${owner}) 를 가리키는 카드가 ${pointing.length}장뿐이다(${pointing.join(', ') || '없음'}) — 동기 한 줄만 있는 헛다리는 「그럴 만한 사람」이지 「그날 그럴 수 있었던 사람」이 아니라서 플레이어가 안 믿는다. 그 사람 쪽으로 기울어지는 카드(points_at)를 둘은 둔다. 하나는 우연으로 읽히고 둘이 겹쳐야 사람이 된다.`,
    });
  }
  return issues;
}

// 증언이 서로 다른 곳을 가리키는가.
//
// 추리소설에서 A 의 증언은 B 를 의심하게 만들고 B 의 증언은 C 를 가리킨다.
// 끝에 가서야 한 곳으로 모인다. 코퍼스 775장을 세어 보면 진범을 가리키는
// 것이 54.1%, 다른 사람을 가리키는 것이 5.8%이고, 313건 중 119건은 증언이
// **전부 진범 한 사람만** 가리켰다 — 물어보는 족족 같은 이름이 돌아오면
// 세 번째쯤에 플레이어가 이미 답을 알고, 그 뒤는 확인 작업이 된다.
export function checkTestimonyAim(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    characters?: Array<{ id: string; name: string }>;
    evidence?: Array<{ id?: string; source_type?: string; points_at?: string }>;
    full_truth?: { responsible_character_id?: string };
  };
  const cards = shape.evidence ?? [];
  if (!cards.some((card) => card.points_at)) return issues;
  const culprit = shape.full_truth?.responsible_character_id;
  const nameOf = new Map(
    (shape.characters ?? []).map((item) => [item.id, item.name]),
  );
  const testimony = cards.filter((card) => card.source_type === 'testimony');
  const aimed = testimony.filter((card) => card.points_at);
  if (aimed.length < 2) return issues;

  const atCulprit = aimed.filter((card) => card.points_at === culprit);
  if (atCulprit.length * 2 > aimed.length) {
    issues.push({
      severity: alreadyRegistered ? 'warn' : 'error',
      code: 'TESTIMONY_ALL_AT_CULPRIT',
      message: `방향이 적힌 증언 ${aimed.length}장 중 ${atCulprit.length}장이 진범(${nameOf.get(culprit ?? '') ?? culprit})을 가리킨다 — 절반을 넘으면 물어보는 족족 같은 이름이 돌아와 세 번째쯤에 답이 보인다. 진범 지목을 절반 이하로 두고 나머지를 다른 사람 쪽으로 돌린다.`,
    });
  }
  const others = new Set(
    aimed
      .map((card) => card.points_at)
      .filter((id): id is string => Boolean(id) && id !== culprit),
  );
  if (others.size < 2) {
    issues.push({
      severity: alreadyRegistered ? 'warn' : 'error',
      code: 'TESTIMONY_AIM_NARROW',
      message: `증언이 가리키는 사람이 진범 말고 ${others.size}명뿐이다 — 「아, 이 사람도 수상하네?」가 날 자리가 없다. 진범 아닌 사람 둘 이상이 증언의 대상이 되게 한다. 한 증언이 두 사람을 건드려도 된다(정미래가 곽태섭의 시각과 배준서의 불빛을 한 줄에 말하는 식).`,
    });
  }
  return issues;
}

// 자기 동기와 자기 변호가 본인 입에서 먼저 나오는가.
//
// 동기는 세 사람 손을 거친다: ① 물건이나 남의 입이 씨앗을 뿌리고 ② 플레이어가
// 보드에 조립하고 ③ 그제야 본인이 해명한다. 지금 코퍼스는 ①과 ③이 같은 사람
// 입에서 동시에 나와 ②가 사라진다 — initial_claims 85개와 진범 아닌 인물의
// knows 171개가 자기 동기·변호를 말하고, 그중 152군데가 잠금 없이 열려 있다.
//
// **알리바이·되묻기와 달리 엔진이 못 덮는다.** 그 둘은 뒤로 미루면 됐지만,
// 자기 동기는 두 번째 면담에서 먼저 부는 것도 똑같이 이상하다.
const SELF_MOTIVE_HINT =
  /(다퉜|다투|부딪|언성|싸웠|서운|원망|앙심|빚|돈을|갚|상속|유산|해고|잘렸|밀려났|앙금|틀어졌|배신|속았|가로채|거절당|무시당|원점|이자|유리했)/;

export function checkSelfMotiveDisclosure(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const shape = master as unknown as {
    characters?: Array<{
      id: string;
      name: string;
      initial_claims?: Array<{ claim_id?: string; content?: string }>;
      knows?: Array<{ fact_id?: string; content?: string }>;
      hidden_until?: Array<{ fact_or_claim_id?: string }>;
    }>;
    contradiction_stages?: Array<{ release?: { claim_or_fact_id?: string } }>;
    full_truth?: { responsible_character_id?: string };
  };
  const culprit = shape.full_truth?.responsible_character_id;
  const staged = new Set(
    (shape.contradiction_stages ?? [])
      .map((stage) => stage.release?.claim_or_fact_id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const character of shape.characters ?? []) {
    if (character.id === culprit) continue;
    const gated = new Set(
      (character.hidden_until ?? [])
        .map((gate) => gate.fact_or_claim_id)
        .filter((id): id is string => Boolean(id)),
    );
    const leaks = [
      ...(character.initial_claims ?? []).map((claim) => ({
        id: claim.claim_id ?? '',
        content: claim.content ?? '',
      })),
      ...(character.knows ?? []).map((fact) => ({
        id: fact.fact_id ?? '',
        content: fact.content ?? '',
      })),
    ].filter(
      (item) =>
        item.id &&
        !gated.has(item.id) &&
        !staged.has(item.id) &&
        SELF_MOTIVE_HINT.test(item.content),
    );
    if (!leaks.length) continue;
    issues.push({
      severity: alreadyRegistered ? 'warn' : 'error',
      code: 'MOTIVE_SELF_DISCLOSURE',
      message: `${character.name}(${character.id})가 자기 동기나 자기 변호를 잠금 없이 먼저 말한다(${leaks.map((item) => item.id).join(', ')}) — 의심받기도 전에 해명이 끝나 플레이어가 「응?」 할 자리가 사라진다. 동기는 ① 물건이나 남의 입이 씨앗을 뿌리고 ② 플레이어가 보드에 조립하고 ③ 그제야 본인이 해명하는 순서다. 그 진술을 hidden_until 로 잠그고 열쇠에 씨앗(남의 카드·남의 진술)을 적는다.`,
    });
  }
  return issues;
}

export function checkRelationships(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  const relationships = (master as any).relationships as
    | Array<{
        id: string;
        between: string[];
        nature: string;
        public_face: string;
        says?: Record<string, string>;
        private_strain: string;
        surfaces_when: string;
      }>
    | undefined;

  if (!relationships?.length) {
    return [
      {
        severity: 'warn',
        code: 'RELATIONSHIPS_MISSING',
        message:
          'relationships가 없음 — 이 게임은 장소를 뒤지는 게임이 아니라 사람을 읽는 게임으로 가기로 했다(2026-09). 최소 3개, 범인이 낀 관계가 적어도 하나. 각 항목은 id/between/nature/public_face/private_strain/surfaces_when.',
      },
    ];
  }

  // between에는 피해자(key_figures, V##)도 올 수 있다 — 범인과 피해자
  // 사이가 사건의 심장인 경우가 대부분이라 그 관계를 못 적으면 이 필드가
  // 반쪽이 된다.
  const characterIds = new Set<string>(
    master.characters.map((c: any) => c.id as string),
  );
  const personIds = new Set<string>([
    ...characterIds,
    ...((master as any).key_figures ?? []).map((k: any) => k.id as string),
  ]);
  const culprit = master.full_truth?.responsible_character_id;
  const seenPairs = new Set<string>();
  let culpritCovered = false;

  // surfaces_when 이 부르는 id 가 실재하는지 보려고 모아 둔다 —
  // checkHerringClearance 가 ownerOfId 를 만드는 것과 같은 재료다.
  const knownIds = new Set<string>();
  for (const evidence of master.evidence ?? []) {
    if (evidence.id) knownIds.add(evidence.id);
  }
  for (const character of master.characters ?? []) {
    const holder = character as {
      knows?: Array<{ fact_id?: string }>;
      initial_claims?: Array<{ claim_id?: string }>;
    };
    for (const fact of holder.knows ?? []) {
      if (fact.fact_id) knownIds.add(fact.fact_id);
    }
    for (const claim of holder.initial_claims ?? []) {
      if (claim.claim_id) knownIds.add(claim.claim_id);
    }
  }
  for (const location of master.locations ?? []) {
    const rules = (
      location as { observation_rules?: Array<{ release_fact_id?: string }> }
    ).observation_rules;
    for (const rule of rules ?? []) {
      if (rule.release_fact_id) knownIds.add(rule.release_fact_id);
    }
  }
  const stages = (master as { contradiction_stages?: Array<{ id?: string }> })
    .contradiction_stages;
  for (const stage of stages ?? []) {
    if (stage.id) knownIds.add(stage.id);
  }

  for (const rel of relationships) {
    for (const characterId of rel.between ?? []) {
      if (!personIds.has(characterId)) {
        issues.push({
          severity: 'error',
          code: 'RELATIONSHIPS_BROKEN',
          message: `${rel.id}.between이 없는 인물 ${characterId}를 가리킨다.`,
        });
      }
      if (characterId === culprit) culpritCovered = true;
    }
    if ((rel.between ?? []).length !== 2) {
      issues.push({
        severity: 'error',
        code: 'RELATIONSHIPS_BROKEN',
        message: `${rel.id}.between은 정확히 두 명이어야 한다(지금 ${(rel.between ?? []).length}명). 관계는 둘 사이의 것이다.`,
      });
      continue;
    }
    if (rel.between[0] === rel.between[1]) {
      issues.push({
        severity: 'error',
        code: 'RELATIONSHIPS_BROKEN',
        message: `${rel.id}.between이 같은 인물 둘을 가리킨다.`,
      });
    }
    const pair = [...rel.between].sort().join('-');
    if (seenPairs.has(pair)) {
      issues.push({
        severity: 'error',
        code: 'RELATIONSHIPS_DUPLICATE_PAIR',
        message: `${rel.id}이 이미 적힌 쌍(${pair})을 또 적는다. 한 쌍은 한 번만 — 같은 두 사람 사이에 관계가 여럿일 리 없다.`,
      });
    }
    seenPairs.add(pair);

    const strain = (rel.private_strain ?? '').trim();
    if (!strain) {
      issues.push({
        severity: 'error',
        code: 'RELATIONSHIPS_SHALLOW',
        message: `${rel.id}.private_strain이 비어 있다. 겉모습만 있는 관계는 서사에 아무것도 보태지 않는다 — 둘 사이에 실제로 무엇이 걸려 있는지를 적을 것.`,
      });
    } else if (strain === (rel.public_face ?? '').trim()) {
      issues.push({
        severity: 'error',
        code: 'RELATIONSHIPS_SHALLOW',
        message: `${rel.id}.private_strain이 public_face와 같은 말이다. 겉으로 보이는 것과 실제로 걸려 있는 것이 같으면 플레이어가 파낼 것이 없다.`,
      });
    }
    // surfaces_when 은 이 균열이 언제 새어 나오는지를 적는다. 자연어라
    // 규칙 엔진이 "도달했는가"를 판정할 수 없으므로, 오프라인 GM 은
    // `how_to_clear` 와 같은 방식으로 **문장 안에 적힌 id** 만 읽는다
    // (offline-engine.ts 의 strainReady). id 가 하나도 없으면 그 균열은
    // 오프라인에서 영원히 안 나온다 — 683개 중 274개(40%)가 지금 그렇다.
    //
    // AI 경로는 문장을 그대로 모델에게 넘기므로 손해가 없다. 그래서 이것은
    // 사건이 틀렸다는 말이 아니라 **한쪽 GM 이 못 읽는다**는 말이고,
    // 등록된 사건은 warn 이다(relationships·how_to_clear 와 같은 비대칭).
    const surfaces = (rel.surfaces_when ?? '').trim();
    const surfaceIds = [...new Set(surfaces.match(REFERENCED_ID) ?? [])];
    if (!surfaceIds.length) {
      issues.push({
        severity: overuseSeverity(alreadyRegistered),
        code: 'RELATIONSHIPS_SURFACES_NO_ID',
        message: `${rel.id}.surfaces_when 이 증거·사실·진술 id 를 하나도 안 부름 — 오프라인 GM 은 이 문장에서 id 만 읽으므로 그 균열은 영원히 안 나온다. 문장이 가리키는 것의 id(E##/F-/S-)를 괄호로 병기할 것("…재감정 메모(E03)를 제시할 때").`,
      });
    } else {
      const unknown = surfaceIds.filter((id) => !knownIds.has(id));
      if (unknown.length) {
        issues.push({
          // 등록된 사건은 warn 이다. 이 30개는 대부분 새로 생긴 실수가
          // 아니라 promote-observation-to-card.mjs 가 관찰 사실을 카드로
          // 옮기면서 how_to_clear·hidden_until 의 id 만 갈아 끼우고
          // surfaces_when 을 두고 간 자국이다(F-L##-OBS-## 가 남아 있다).
          // 여기서 막으면 그 사건을 실플레이 피드백으로 고치는 작업이
          // 같이 막힌다 — relationships·how_to_clear 와 같은 비대칭.
          severity: overuseSeverity(alreadyRegistered),
          code: 'RELATIONSHIPS_SURFACES_UNKNOWN_ID',
          message: `${rel.id}.surfaces_when 이 정의되지 않은 id 를 부름: ${unknown.join(', ')} — 그 조건은 영원히 안 채워진다. 옮겨 간 카드의 새 id 로 갈아 끼울 것.`,
        });
      }
    }
    // 이 균열을 말할 사람. private_strain 은 3인칭 산문이고 주어가 곧
    // 감추고 있는 쪽이라, 오프라인 GM 은 **문장에서 이름이 가장 앞에 나오는
    // 인물**에게만 이 말을 시킨다(surface_suspicion·how_to_clear 와 같은
    // 규칙). 그 사람이 between 밖이면 아무도 말할 수 없어 문이 안 열린다 —
    // 짝이 아닌 제3자를 주어로 세운 경우로, 683개 중 32개가 그렇다.
    if (strain) {
      const subject = (master.characters as Array<{ id: string; name: string }>)
        .map((character) => ({
          id: character.id,
          at: strain.indexOf(character.name),
        }))
        .filter((item) => item.at >= 0)
        .sort((a, b) => a.at - b.at)[0];
      if (!subject || !(rel.between ?? []).includes(subject.id)) {
        issues.push({
          severity: overuseSeverity(alreadyRegistered),
          code: 'RELATIONSHIPS_STRAIN_NO_SUBJECT',
          message: `${rel.id}.private_strain 의 첫 이름이 between(${(rel.between ?? []).join(', ')}) 밖이다 — 이 문장을 말할 사람이 없어 오프라인에서 안 나온다. 감추고 있는 쪽을 문장의 주어로 세울 것.`,
        });
      }
    }
    // says 는 이 관계를 **그 사람 입으로** 말하면 어떻게 나오는가다. 없으면
    // 런타임이 nature+public_face 를 그대로 읽는데, 그건 "…로만 알려져 있다"
    // 같은 3인칭 설명문이라 인물이 아니라 해설자의 목소리로 읽히고, 무엇보다
    // 짝에 적힌 값이라 **양쪽이 글자 하나 안 틀리고 같은 말을 한다.**
    // CASE290 실플레이에서 서지완과 임소민이 서로에 대해 같은 문장을 말했다.
    //
    // 있는데 깨져 있으면 error, 아예 없으면 아무 말도 하지 않는다 —
    // relationships 자체가 아직 204건에 없어서 여기에 warn 을 더 얹으면
    // 신호가 묻힌다. 밀린 양은 audit:format 이 따로 센다.
    if (rel.says) {
      const between = rel.between ?? [];
      const keys = Object.keys(rel.says);
      // 피해자(V##)는 면담할 수 없으니 말을 못 한다. 빠져 있어도 된다.
      // personIds 와 달리 여기서는 characters 만 본다. any 를 새로 쓰지
      // 않으려고 위에서 만든 집합을 재료로 쓴다.
      const speakers = between.filter((id) => characterIds.has(id));
      const stray = keys.filter((id) => !between.includes(id));
      const missing = speakers.filter((id) => !(rel.says?.[id] ?? '').trim());
      if (stray.length) {
        issues.push({
          severity: 'error',
          code: 'RELATIONSHIPS_SAYS_BROKEN',
          message: `${rel.id}.says 가 between(${between.join(', ')})에 없는 ${stray.join(', ')}를 가리킨다.`,
        });
      }
      if (missing.length) {
        issues.push({
          severity: 'error',
          code: 'RELATIONSHIPS_SAYS_BROKEN',
          message: `${rel.id}.says 에 ${missing.join(', ')}의 한 마디가 없다. 면담할 수 있는 인물은 빠짐없이 있어야 한다 — 없으면 그 사람만 여전히 해설자의 목소리로 말한다.`,
        });
      }
      const lines = speakers
        .map((id) => (rel.says?.[id] ?? '').trim())
        .filter(Boolean);
      if (lines.length === 2 && lines[0] === lines[1]) {
        issues.push({
          severity: 'error',
          code: 'RELATIONSHIPS_SAYS_BROKEN',
          message: `${rel.id}.says 의 두 값이 같은 말이다. 갈라 쓰는 이유가 그것이다 — 같은 사이라도 아랫사람과 윗사람이 같은 문장으로 말하지 않는다.`,
        });
      }
    }
    if (!(rel.surfaces_when ?? '').trim()) {
      issues.push({
        severity: 'error',
        code: 'RELATIONSHIPS_SHALLOW',
        message: `${rel.id}.surfaces_when이 비어 있다. 무엇을 묻거나 무엇을 보여줘야 이 균열이 새어 나오는지가 없으면 런타임은 이 관계를 영영 꺼내지 못한다.`,
      });
    }
  }

  if (relationships.length < 3) {
    issues.push({
      severity: 'error',
      code: 'RELATIONSHIPS_SHALLOW',
      message: `relationships가 ${relationships.length}개뿐이다. 최소 3개 — 관계가 하나뿐이면 다른 인물들은 배경으로 남고, 범인이 아닌 사람의 레드헤링에 무게가 실리지 않는다.`,
    });
  }
  if (culprit && !culpritCovered) {
    issues.push({
      severity: 'error',
      code: 'RELATIONSHIPS_SHALLOW',
      message: `범인(${culprit})이 낀 관계가 하나도 없다. 그러면 동기가 허공에 뜬다 — 범인과 피해자, 또는 범인과 다른 인물 사이의 관계를 적을 것.`,
    });
  }

  // 관계도의 중심은 피해자여야 한다.
  //
  // 마이그레이션 루틴이 관계를 전부 범인에게 붙였다 — 루틴이 쓴 20건에서
  // 범인 연결이 평균 3.05, 피해자가 1.70이었다. 원래 있던 39건은 정반대로
  // 피해자 2.90, 범인 2.13이다. 사람이 쓰면 자연히 피해자 중심이 되는데
  // 기계가 뒤집은 것이다.
  //
  // 뒤집히면 두 가지가 무너진다. 첫째, 관계도 모양만 보고 범인이 짚인다 —
  // 가장 많이 연결된 사람이 답이다. S-/F- 접두사가 진실과 거짓을 갈라
  // 보여주던 것과 같은 종류의 유출이고, 이건 데이터 모양 자체가 흘리는 것이라
  // 런타임이 가릴 수도 없다. 둘째, 수상해 보여야 할 사람이 아무하고도
  // 얽히지 않는다. 여러 사람이 저마다 피해자와 걸린 것이 있어야 저마다
  // 동기처럼 보이고, 그래야 플레이어가 가릴 것이 생긴다.
  //
  // 그래서 재는 것은 "범인이 낀 관계가 있는가"가 아니라 두 사람의 연결
  // 수를 견주는 것이다. 이 기준으로 기존 코퍼스는 39건 중 7건만 걸리고
  // 루틴이 쓴 20건은 13건이 걸린다 — 드리프트만 골라낸다.
  const degree = new Map<string, number>();
  for (const rel of relationships) {
    for (const person of rel.between ?? []) {
      degree.set(person, (degree.get(person) ?? 0) + 1);
    }
  }
  const victimIds = ((master.key_figures ?? []) as Array<{ id: string }>).map(
    (figure) => figure.id,
  );
  const culpritDegree = culprit ? (degree.get(culprit) ?? 0) : 0;
  const victimDegree = victimIds.reduce(
    (best, id) => Math.max(best, degree.get(id) ?? 0),
    0,
  );
  if (culprit && victimIds.length && victimDegree < culpritDegree) {
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'RELATIONSHIPS_CULPRIT_HUB',
      message: `범인(${culprit})이 관계 ${culpritDegree}개에 걸려 있는데 피해자는 ${victimDegree}개뿐이다. 관계도의 중심은 피해자여야 한다 — 그래야 여러 사람이 저마다 동기처럼 보이고, 관계도 모양만으로 범인이 짚이지 않는다. 범인에게 붙인 관계를 줄이거나, 다른 인물과 피해자 사이에 걸린 것을 적을 것.`,
    });
  }

  // 면담 태도(voice_profile.stance)가 범인을 흘리지 않게 한다.
  //
  // 313건을 세어 보면 작성자가 무의식적으로 범인을 침착하게, 애먼 사람을
  // 떨게 쓴다 — 진범 313명 중 skittish 가 둘뿐이고(0.6%), 다른 인물은
  // 11.1%가 skittish 다. 뒤집으면 「떠는 사람은 범인이 아니다」가 되고,
  // 이건 첫인사 한 줄만 보고 쓸 수 있는 규칙이다. 데이터 모양 자체가
  // 흘리는 것이라 런타임이 가릴 수도 없다(관계도 쏠림과 같은 자리).
  //
  // 막는 방법은 한 사건 안에서 진범의 태도를 다른 인물도 하나는 갖게 하는
  // 것이다. 그러면 태도로는 아무도 못 가린다. 지금 코퍼스에서 이미 71%가
  // 그 조건을 만족한다.
  const stanceOf = new Map<string, string>();
  for (const person of master.characters as Array<{
    id: string;
    voice_profile?: { stance?: string };
  }>) {
    const stance = (person.voice_profile?.stance || '').trim();
    if (stance) stanceOf.set(person.id, stance);
  }
  const culpritStance = culprit ? stanceOf.get(culprit) : undefined;
  if (culpritStance) {
    const shared = [...stanceOf].some(
      ([id, stance]) => id !== culprit && stance === culpritStance,
    );
    if (!shared) {
      issues.push({
        severity: overuseSeverity(alreadyRegistered),
        code: 'STANCE_CULPRIT_TELL',
        message: `범인(${culprit})만 voice_profile.stance 가 '${culpritStance}'이고 같은 태도인 인물이 없다. 태도 하나로 범인이 짚인다 — 다른 인물 한 명에게 같은 태도를 주거나, 범인의 태도를 흔한 쪽으로 바꿀 것.`,
      });
    }
  }

  // 아무 관계에도 안 나오는 인물은 그 사건에서 이름과 역할만 있는 사람이다.
  const inRelationships = new Set<string>();
  for (const rel of relationships) {
    for (const person of rel.between ?? []) inRelationships.add(person);
  }
  // master는 any라 c도 추론으로 any가 된다 — 명시적 any를 적으면
  // oxlint 기준선이 하나 올라간다.
  const orphans = (master.characters as Array<{ id: string }>)
    .map((character) => character.id)
    .filter((id) => !inRelationships.has(id));
  if (orphans.length) {
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'RELATIONSHIPS_ORPHAN_CHARACTER',
      message: `${orphans.join(', ')}이(가) 어느 관계에도 나오지 않는다. 등장인물 전원이 적어도 하나의 관계에 들어가야 그 사람에게 물어볼 것이 생긴다.`,
    });
  }

  return issues;
}

// 이 사건에 아직 손볼 것이 남아 있는가 — 목록의 '수사 가능' 라벨이 보는 것.
//
// masterFormatWarnings(app/gm/master-index.ts)는 raw_text만 보므로 "관계가
// 있는가 / 단계 키가 상태 키인가"까지밖에 못 본다. 관계의 **모양**이나
// 레드헤링이 카드로 풀리는지는 구조화 마스터를 봐야 알 수 있고, 그건
// 빌드 때만 손에 있다. 그래서 scripts/build-case-assets.ts가 이 목록을
// masterFormatWarnings의 결과와 합쳐 봉투(CaseData.format_warnings)에
// 싣고, 목록 라벨과 사건 화면의 경고가 그 한 벌을 같이 읽는다 —
// 갈라지면 목록은 준비됐다고 하는데 들어가면 경고가 뜬다.
//
// **문면에 인물 이름도 증거 id도 넣지 않는다.** 이 문자열은 플레이어
// 화면에 그대로 뜬다(DetectiveApp.tsx). 검사기 본문의 메시지는 작성자용
// 진단이라 「R01(표건율)의 how_to_clear가 부르는 것이 전부 … E07」처럼
// 답을 흘린다. 여기서는 무엇이 남았는지만 말한다.
const REWORK_MESSAGES: Array<[string, string]> = [
  [
    'HERRING_CLEAR_NO_ID',
    '레드헤링이 증거 카드 제시로 풀리지 않는다 — 그 인물에게 물어볼 것을 다 물어보면 풀린다.',
  ],
  [
    'HERRING_CLEAR_SELF_ONLY',
    '레드헤링이 본인의 말만으로 풀린다 — 다른 사람의 카드를 맞춰 볼 자리가 없다.',
  ],
  [
    'HERRING_CLEAR_UNKNOWN_ID',
    '레드헤링을 푸는 조건이 없는 것을 가리킨다 — 그 의심은 영원히 안 풀린다.',
  ],
  [
    'STANCE_CULPRIT_TELL',
    '범인만 그 면담 태도라 태도 하나로 범인이 짚인다.',
  ],
  [
    'RELATIONSHIPS_CULPRIT_HUB',
    '관계도가 피해자가 아니라 범인 쪽으로 몰려 있다 — 모양만 보고 범인이 짚인다.',
  ],
  [
    'RELATIONSHIPS_ORPHAN_CHARACTER',
    '어느 관계에도 나오지 않는 인물이 있다 — 그 사람은 사건에 얽힌 데가 없다.',
  ],
  ['RELATIONSHIPS_SAYS_BROKEN', '관계에 달린 인물의 한 마디가 깨져 있다.'],
  [
    'RELATIONSHIPS_NO_SAYS',
    '관계에 그 인물이 직접 하는 말이 없다 — 관계가 해설자의 목소리로 설명된다.',
  ],
  [
    'OPENING_CAST_ROLLCALL',
    '오프닝이 등장인물 명부가 되어 있다 — 이름과 직함이 면담 전에 먼저 나온다.',
  ],
  [
    'OPENING_INCIDENT_ONLY_HEARSAY',
    '오프닝이 사건을 전해 들은 말로만 전한다 — 탐정이 현장을 직접 보지 않는다.',
  ],
];

export function pendingReworkWarnings(master: Master): string[] {
  const codes = new Set<string>();
  for (const issue of [
    ...checkRelationships(master, true),
    ...checkHerringClearance(master, true),
    ...checkOpeningCastRollcall(master, true),
    ...checkOpeningHearsayOnly(master, true),
    ...checkStatementGating(master, true),
    ...checkOpeningClaim(master, true),
  ]) {
    codes.add(issue.code);
  }

  // says 가 비어 있는 것은 어느 검사도 코드를 내지 않는다 — relationships
  // 자체가 아직 없는 사건이 많아 warn 을 더 얹으면 신호가 묻혀서다
  // (scripts/audit-master-format.ts 도 같은 이유로 여기만 따로 센다).
  const shape = master as unknown as {
    relationships?: Array<{ between?: string[]; says?: Record<string, string> }>;
    characters?: Array<{ id?: string }>;
  };
  const speakerIds = new Set((shape.characters ?? []).map((item) => item.id));
  const missingSays = (shape.relationships ?? []).some((rel) =>
    (rel.between ?? [])
      .filter((id) => speakerIds.has(id))
      .some((id) => !(rel.says?.[id] ?? '').trim()),
  );
  if (missingSays) codes.add('RELATIONSHIPS_NO_SAYS');

  return REWORK_MESSAGES.filter(([code]) => codes.has(code)).map(
    ([, message]) => message,
  );
}

// 한 인물의 knows 항목이 그 인물의 initial_claims 항목과 사실상 같은 말인지.
//
// 어미만 바꾼 같은 문장이 양쪽에 들어 있는 경우가 코퍼스에 있다
// ("...봤다고 말한다" / "...봤다는 것을 안다"). 런타임은 진술 보드에서
// 그런 줄을 접지만(heardStatementsFor), 접힌다고 문제가 없어진 것은
// 아니다 — 같은 문장이 매 턴 모델에게 두 번 실리고, 무엇보다 그 인물은
// 묻지 않아도 다 말해 버리는 사람이 된다. knows는 그 사람이 아는 것이지
// 그 사람이 먼저 꺼내는 것이 아니다.
//
// 판정은 런타임과 같은 함수·같은 임계값을 쓴다. 여기서 따로 구현하면
// 검사기는 통과시킨 것을 화면은 접고, 검사기가 잡은 것을 화면은 두 줄로
// 내놓는 상태가 된다.
export function checkDuplicateClaimFact(
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const issues: Issue[] = [];
  for (const character of master.characters ?? []) {
    for (const fact of character.knows ?? []) {
      for (const claim of character.initial_claims ?? []) {
        const factInClaim = authoredStatementContainment(
          fact.content,
          claim.content,
        );
        const claimInFact = authoredStatementContainment(
          claim.content,
          fact.content,
        );
        if (Math.max(factInClaim, claimInFact) < 0.9) continue;
        issues.push({
          severity: overuseSeverity(alreadyRegistered),
          code: 'CLAIM_FACT_DUPLICATE',
          message: `${character.id} ${character.name}: ${fact.fact_id}이 ${claim.claim_id}과 같은 말이다(어미만 다름). 진술 보드는 둘 중 하나만 보여 준다. knows는 그 인물이 먼저 꺼내지 않는 것을 담아야 한다 — 주장보다 정확한 시각이든, 주장이 감춘 한 조각이든. 보탤 것이 정말 없으면 knows 쪽을 지운다.`,
        });
      }
    }
  }
  return issues;
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
      const index = remaining.findIndex(
        (stage) => stage.from_stage === current,
      );
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
// **동기도 마스터가 직접 선언할 수 있다**(2026-09 사용자 제안). 원래 이 자리는
// 「폭로/신고 예고 → 발각 차단」 **한 종류**만 정규식으로 보고 있었다. 그래서
// 코퍼스의 26%가 거기 뭉쳐 있다는 것만 알 뿐, 나머지 74%가 무엇으로 갈리는지는
// 아무도 세지 않았다. 스물로 나눠 보니 실제 모습이 나왔다 — 폭로 방지는 나누고
// 나서 오히려 **37.7%**로 올라갔고(신고·제출·통보까지 같은 골격이다),
// 범죄·비리 은폐 12.1%와 배신에 대한 응징 10.5%가 그다음이다.
//
// 다섯 축으로 묶어 읽으면 사건을 설계할 때 고르기 쉽다 — 경제 / 사회·경쟁 /
// 은폐 / 관계 / 신념.
const MOTIVE_ARCHETYPES: Array<[string, RegExp]> = [
  // ── 경제
  ['금전적 이익', /돈을\s*(얻|챙|가로|받)|금전적\s*이익|수익[을를]|현금|차액을\s*챙/],
  ['상속·재산 승계', /상속|유산|재산을\s*물려/],
  ['채무·빚 청산', /빚|채무|사채|대출|갚[아을]/],
  ['사업권·지분 확보', /지분|경영권|사업권|계약을\s*따|인수/],
  ['보험·보상금 편취', /보험금|보상금|산재/],
  ['재개발·개발 이익', /재개발|개발\s*이익|지가|부동산/],
  // ── 사회·경쟁
  ['승진·직위 경쟁', /승진|후임|자리를\s*차지|직위|발탁/],
  ['경쟁자 제거', /경쟁자|입찰|낙찰|선발|후보에서/],
  ['사회적 평판 보호', /명예|평판|경력이|체면|이름에\s*흠/],
  ['실패·책임 전가', /책임을\s*떠|뒤집어씌|전가/],
  ['평가·심사 결과 조작', /결과를\s*조작|심사를\s*조작|순위를\s*바꾸|점수를\s*고치|판정을\s*바꾸/],
  ['공로·성과 가로채기', /성과를\s*가로채|공로|자기\s*이름으로\s*발표|단독\s*등재|이름을\s*올리/],
  ['조직 내부 권력 장악', /실권|의사결정권|이사회|장악/],
  ['후계자 교체', /후계자|승계자|다음\s*대표|후계/],
  // **잃지 않으려는 쪽**. 마흔 칸이 거의 다 「얻으려고」 아니면 「들통날까 봐」라
  // 적혀 있어서, **지금 가진 자리를 지키려는 동기**가 갈 곳이 없었다 — 다른
  // 세션이 CASE021·024·025를 전부 `사회적 평판 보호`로 내리면서 「후계」 축이
  // 통계에서 사라진다고 짚어 줬다(`succession_change`는 방향이 반대다).
  // 13건이 여기 해당한다. **평판·유산·직업 비밀은 지키는 쪽이지만 대상이
  // 한정돼 있고**, `승진·직위 경쟁`과 `경쟁자 제거`는 올라가려는 쪽이다.
  [
    '지위·자리 상실 방지',
    /(자리|지위|후계|대표 자리|입지|경영권|주도권)[^.]{0,14}(잃|빼앗|내주|넘어가|물러나|박탈)|밀려나|쫓겨나|자리[를을] 지키|지위[를을] 지키/,
  ],
  // ── 권리
  ['계약·약속 파기', /계약을\s*깨|약속을\s*어기|파기/],
  ['소유권 분쟁', /소유권|내\s*것이라|권리를\s*다투/],
  ['저작권·지식재산 분쟁', /저작권|특허|표절|지식재산|도용/],
  // ── 은폐
  [
    '범죄·비리 은폐',
    /횡령|비리|부정[을이]|조작(해|한|하며|해\s)|뇌물|담합|빼돌|꾸며|무면허|밀거래|사기[를가]|속여\s*팔|무자격|미인증/,
  ],
  [
    '비밀 폭로 방지',
    /폭로|알리겠다|공개하겠다|밝히겠다|들통|발각|알려지면|드러나면|알리려/,
  ],
  [
    '신고·고발 차단',
    /신고(하겠|를\s*하려|할|를\s*예고|가)|고발|제보|제출하겠다|통보하/,
  ],
  ['증거 인멸', /증거를\s*없애|기록을\s*없애|인멸/],
  ['목격자 제거', /목격/],
  ['자격·신분 은폐', /학력|면허|경력을\s*위조|신원을?\s*세탁|다른\s*이름으로\s*근무/],
  ['과거 범죄 은폐', /과거에?\s*저지른|예전에\s*저지른|오래된\s*사건|신원\s*재조회|옛\s*사고/],
  ['공범 관계 정리', /공범|함께\s*저지른|같이\s*한\s*일/],
  ['협력자 이탈 방지', /빠져나가|손을\s*떼|협조를\s*거부|발을\s*빼/],
  ['계획 실패 책임 회피', /계획이\s*틀어|실패를\s*덮/],
  ['직업적 비밀 보호', /업무상\s*비밀|환자[의]?\s*정보|의뢰인|비밀유지/],
  // ── 관계
  ['복수·보복', /복수|되갚|앙갚음|원한/],
  ['배신에 대한 응징', /배신|속았|등을\s*돌/],
  ['질투·경쟁심', /질투|시기[심하]|열등감/],
  ['관계의 단절', /관계를\s*끊|헤어지|정리하려/],
  ['애정·집착', /집착|불륜|연인|삼각/],
  ['보호·은폐', /지키려|보호하려|감싸려|막으려|적히는\s*것을\s*막/],
  ['강요·협박의 해소', /협박|강요|약점을\s*잡|압박에서/],
  ['통제·지배 욕구', /통제|지배|마음대로|휘두르/],
  ['유산·가족관계 변경 방지', /유언을?\s*(바꾸|고치)|상속인을\s*바꾸|가족관계를\s*정리/],
  ['이혼·별거 조건 회피', /이혼|별거|위자료|재산\s*분할/],
  ['양육권·가족권리 확보', /양육권|친권|아이를\s*데려/],
  // ── 신념
  ['개인적 신념·목적', /신념|바로잡|지켜야\s*할|전통|명맥|영영\s*사라/],
];


const MOTIVE_ARCHETYPE_KEYS: Record<string, string> = {
  // 경제
  financial_gain: '금전적 이익',
  inheritance: '상속·재산 승계',
  debt: '채무·빚 청산',
  business_control: '사업권·지분 확보',
  insurance_fraud: '보험·보상금 편취',
  development_profit: '재개발·개발 이익',
  // 사회·경쟁
  promotion: '승진·직위 경쟁',
  rival_removal: '경쟁자 제거',
  reputation: '사회적 평판 보호',
  blame_shift: '실패·책임 전가',
  result_rigging: '평가·심사 결과 조작',
  credit_theft: '공로·성과 가로채기',
  power_seizure: '조직 내부 권력 장악',
  succession_change: '후계자 교체',
  position_defense: '지위·자리 상실 방지',
  // 권리
  contract_breach: '계약·약속 파기',
  ownership_dispute: '소유권 분쟁',
  ip_dispute: '저작권·지식재산 분쟁',
  // 은폐
  crime_cover: '범죄·비리 은폐',
  secret_exposure: '비밀 폭로 방지',
  report_prevention: '신고·고발 차단',
  evidence_destruction: '증거 인멸',
  witness_removal: '목격자 제거',
  identity_concealment: '자격·신분 은폐',
  past_crime_cover: '과거 범죄 은폐',
  accomplice_cutoff: '공범 관계 정리',
  defection_prevention: '협력자 이탈 방지',
  plan_failure_blame: '계획 실패 책임 회피',
  professional_secrecy: '직업적 비밀 보호',
  // 관계
  revenge: '복수·보복',
  betrayal: '배신에 대한 응징',
  jealousy: '질투·경쟁심',
  relationship_end: '관계의 단절',
  obsession: '애정·집착',
  protection: '보호·은폐',
  coercion_escape: '강요·협박의 해소',
  control: '통제·지배 욕구',
  inheritance_change_block: '유산·가족관계 변경 방지',
  divorce_avoidance: '이혼·별거 조건 회피',
  custody: '양육권·가족권리 확보',
  // 신념
  conviction: '개인적 신념·목적',
  other: '그 밖',
};

/** 선언된 동기 계열이 있으면 그것을, 없으면 정규식 판정을 라벨 집합으로. */
function motiveArchetypeLabels(master: Master): Set<string> {
  const declared = (master.full_truth as { motive_archetypes?: unknown })
    ?.motive_archetypes;
  if (Array.isArray(declared) && declared.length > 0) {
    const labels = new Set<string>();
    for (const key of declared) {
      if (typeof key !== 'string' || key === 'other') continue;
      labels.add(MOTIVE_ARCHETYPE_KEYS[key] ?? key);
    }
    return labels;
  }
  const text: string = master.full_truth?.motive ?? '';
  const labels = new Set<string>();
  for (const [label, pattern] of MOTIVE_ARCHETYPES) {
    if (pattern.test(text)) labels.add(label);
  }
  return labels;
}

const MOTIVE_ARCHETYPE_OVERUSE_THRESHOLD = 0.08;

/**
 * "폭로/신고 예고 → 발각 차단을 위해 살해" 동기 골격이 코퍼스에서 이미 과반에
 * 가깝게 쓰였는데 새 사건이 또 같은 골격을 쓰는지 검사한다.
 */
// 임계값을 0.3에서 0.1로 내렸다(2026-09 사용자 결정). 0.3에서는 폭로 동기가
// 26.7%, 심사·인증 배경이 21.2%까지 차올라도 아무것도 걸리지 않았다 — 코퍼스가
// 커질수록 비율이 희석돼 검사가 사실상 잠드는 구조였다.
//
// 다만 내리는 순간 이미 머지된 147건이 전부 error가 된다. 실플레이 피드백으로
// 마스터 하나를 고치고 check:case를 다시 돌리는 것이 실제 작업 흐름이라 거기서
// 막히면 안 된다(relationships 때와 같은 판단). 그래서 case_registry.json에
// 이미 올라간 사건은 warn으로 낮추고, 아직 등록되지 않은 새 사건만 error로
// 막는다. 루틴은 4단계에서 registry에 올리므로, 생성 시점에는 언제나 error다.
// 이 파일은 top-level import를 두지 않는다(맨 위 주석 참고). registry를 여기서
// 읽지 않고 호출자가 판정해 넘긴다 — otherCases와 같은 방식이다.
function overuseSeverity(alreadyRegistered: boolean): 'error' | 'warn' {
  return alreadyRegistered ? 'warn' : 'error';
}

export function checkMotiveArchetypeOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const mine = motiveArchetypeLabels(master);
  const comparableCases = otherCases.filter((o) => o.caseId !== caseId);
  if (comparableCases.length === 0) return [];
  const issues: Issue[] = [];
  for (const label of mine) {
    const matching = comparableCases.filter((o) =>
      motiveArchetypeLabels(o.master).has(label),
    ).length;
    const ratio = matching / comparableCases.length;
    if (ratio < MOTIVE_ARCHETYPE_OVERUSE_THRESHOLD) continue;
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'MOTIVE_ARCHETYPE_OVERUSE',
      message: `full_truth.motive가 "${label}" 계열인데, 이미 코퍼스의 ${(ratio * 100).toFixed(0)}%(${matching}/${comparableCases.length}건)가 같은 계열이다. 덜 쓰인 동기로 다시 설계할 것 — 경제(금전·상속·채무·지분) / 사회·경쟁(승진·경쟁자·평판·책임 전가) / 은폐(비리·폭로·증거) / 관계(복수·배신·질투·단절·집착·보호·협박·지배) / 신념 다섯 축에서 고른다.`,
    });
  }
  return issues;
}

// case_identity.setting이 "곧 있을 진위 감정/자격 심사/인증 검사에서 부정이 들통날
// 상황"을 시간 압박 장치로 쓰는 배경이 코퍼스 167건 중 64건(38%)을 차지한다 —
// **은퇴함** — 이 자리에 있던 SETTING_BACKDROP_OVERUSE 는 「심사·인증·감정」
// **한 칸**만 보는 검사였다. 그 장치를 안 쓰면 무조건 통과라, 계약·서명식
// 17.3%, 경기·선발전 14.7%, 복원·보수 10.2%가 전부 세어지지 않은 채
// 지나갔다. BACKGROUND_ARCHETYPE_OVERUSE(44칸)의 review_certification 과
// inspection_audit 이 같은 것을 더 넓게 본다. 함수를 남겨 두면 한 사건이
// 같은 말을 두 코드로 듣는다.

// 수법 계열 — **마흔 칸**(2026-09 사용자 결정). 여덟 → 스물하나 → 마흔이다.
//
// 스물하나에서도 다섯 칸이 임계를 넘었다(밀폐·질식 21.4% · 약물·진정 18.2% ·
// 추락 15.0% · 낙하물 14.4% · 타격 10.5%). **칸이 모자란 것이 아니라 한 칸이
// 너무 넓었다** — 「밀폐·질식」 하나가 가스 축적·산소결핍·물리적 기도 폐쇄
// 셋을 한꺼번에 담고 있었고, 「중독」이 경구·흡입·경피를 다 담았다. 경로를
// 갈라야 「같은 수법을 또 썼다」가 보인다.
//
// **마지막 한 칸(`staging_cover_up`)은 살해 기전이 아니라 은폐다.** 처음에는
// 기록·출입·환경·원인전환·사후조작 다섯으로 두었는데, 한 사건이 대여섯 칸에
// 걸려 수법 분포를 흐려서 하나로 묶었다(2026-09 사용자 결정). 이 칸만
// `full_truth.cover_up` 도 같이 본다 — method 문장에는 어떻게 죽였나만 적힌다.
//
// [키, 사람이 읽을 이름, 정규식, cover_up 도 보는가]
const METHOD_ARCHETYPES: Array<[string, string, RegExp, boolean]> = [
  ['oral_poisoning', '경구 독살', /음독|마시게|먹게 하|복용하게|삼키게|차에 타|잔에 타|음료에|음식에 (넣|섞)/, false],
  ['drug_overdose', '약물 과다투여', /과다\s?투여|치사량|용량을 (올|높|늘)|고용량|정량의 몇 배|복용량을 (바꾸|늘)/, false],
  ['injection_infusion', '수액·주사 주입', /수액|주사(기|침|를 놓)|정맥|앰플|링거|카테터|주입하/, false],
  ['inhalation_toxin', '흡입성 물질', /흡입하게|들이마시게|증기를|연무|스프레이를 뿌|기화(시|하)/, false],
  ['dermal_contact', '피부 접촉성 물질', /경피|피부[에를]|바르게|장갑 안|상처[에를]|크림에|손에 묻/, false],
  ['toxic_gas_buildup', '유해가스 축적', /가스가? (차|고이|정체|누출)|일산화탄소|이산화탄소|황화수소|암모니아|오존|훈증|매연이 (차|고)/, false],
  ['oxygen_deprivation', '산소결핍 환경', /산소 ?농도|산소가 (떨어|부족|모자)|환기[^.]{0,10}(차단|끄|꺼|막|정지)|질소로 (치환|채)|저산소/, false],
  ['sedation_then_act', '진정·수면 유도 후 범행', /진정제|수면제|수면유도|의식을\s*(잃|흐리)|정신을\s*잃|재운|재워|몽롱하게/, false],
  ['strangulation', '교살·목 압박', /목[을를]?\s*조르|교살|목\s*압박|끈으로\s*조르|목을\s*졸|경부 압박/, false],
  ['suffocation', '질식(기도 폐쇄)', /입[과와]? 코를|코와 입을|비닐을 씌|베개로 (누르|막)|기도를 막|눌러 숨을/, false],
  ['drowning', '익사', /익사|물에 빠|수조 안으로|물속에 (밀|가두|방치)|잠긴 채 숨/, false],
  ['induced_fall', '추락 유도', /추락|실족|낙상|밀쳐 (넘어|떨어)|떨어뜨[려리]|난간을|발판을 (치우|빼)/, false],
  ['drowning_staged', '익사 위장', /익사(한 것|처럼|로 보이)|물에 빠진 (것처럼|사고로)|수영 중 사고처럼/, true],
  ['stabbing', '자상·관통상', /자상|찔[려린러]|칼[에로]|흉기로|날붙이|송곳|관통/, false],
  ['blunt_force', '둔기 공격', /가격|둔기|내리쳐|강타|후려|머리를 (치|때)/, false],
  ['exsanguination', '절단·대량출혈', /절상|베[여인어]|출혈|대량 출혈|동맥을|지혈되지/, false],
  ['arson', '화재 이용', /발화|방화|불이 붙|불을 (지르|놓)|인화물질|점화/, false],
  ['smoke_staged', '연기·질식 위장', /연기[에로]|화재 사고(처럼|로 보)|연기를 마신 것처럼|소사(燒死)?로 보이/, true],
  ['electrocution', '감전', /감전|전류가 흐|전기가 통|누전되게/, false],
  ['electrical_tampering', '전기설비 조작', /접지선|접지를|누전차단기|배선을 (끊|바꾸|벗기)|전원[을를] (조작|바꾸)|절연[을이]? (벗|깎|제거)/, false],
  ['hypothermia', '냉각·저체온 유도', /저체온|동상|냉동고|급속냉|온도를 최저|얼어붙|한랭/, false],
  ['hyperthermia', '고온·열 노출', /열사병|고온[에로]|가마 안|건조실 온도|온도를 (올|높)|열에 노출/, false],
  ['pressure_change', '압력 변화', /감압|가압|기압[을이]|챔버|잠수병|압력을 (낮|올)/, false],
  ['machine_entrapment', '기계 끼임·절단', /기계에\s*끼이|끼이게|롤러|재단기|절단기|프레스|벨트에\s*말려|회전체/, false],
  ['machine_malfunction', '기계 오작동 유도', /오작동|인터록|안전\s*(센서|장치)[를을]? (끄|해제|무력)|리밋스위치|고정핀을 (빼|풀)|안전핀/, false],
  ['vehicle_collision', '차량 충돌 유도', /차량\s*충돌|차에\s*치이|추돌|치여|들이받/, false],
  ['brake_tampering', '제동장치 조작', /브레이크|제동(장치|력)|유압 라인|패드를 (갈|빼)/, false],
  ['steering_tampering', '조향장치 조작', /조향|운전대|핸들[을이]|타이어를 (찢|손)/, false],
  ['structural_collapse', '구조물 붕괴 유도', /천장이?\s*붕괴|벽체|구조물이?\s*붕괴|무너[져진]|선반이 (쓰러|넘어)|지지(목|대)를 (자르|빼)/, false],
  ['falling_object', '낙하물 이용', /낙하|깔[린려]|무게추|트러스가? 떨어|쏟아져|위에서 떨어지/, false],
  ['water_system', '수중 설비 이용', /배수(구|로|밸브)|펌프를|수위를|수조를|급수(를|관)|물을 빼/, false],
  ['medical_procedure_tampering', '의료처치 조작', /처방[을를]?\s*바꾸|투약\s*오류|차트[를을]?\s*(고치|바꾸)|수액[을를]?\s*바꾸|약을\s*바꿔|용법을 바꾸/, false],
  ['surgical_accident_staged', '시술 사고 위장', /의료사고(처럼|로 보)|시술 중 사고|합병증(처럼|으로 보)|부작용으로 보이/, true],
  ['delayed_rescue', '응급처치 지연 유도', /(펜|약|주사기|구급함|제세동|연락 수단|무전|안전로프)[^.]{0,14}(치우|빼[내돌 ]|숨기|가져|꺼내)|배터리를 빼|구조를 (막|늦|부르지)|신고를 늦/, false],
  ['automation_tampering', '자동화 시스템 조작', /자동\s*(제어|운전|급이|잠금)|프로그램을 (바꾸|고치)|설정값을|타이머를|제어\s*(로직|프로그램)/, false],
  // 36~40은 한 칸으로 묶었다(2026-09 사용자 결정). 전산 기록·출입·환경 조작과
  // 사고 원인 전환·사후 상태 조작은 **어떻게 죽였나가 아니라 어떻게 감췄나**라,
  // 앞의 서른다섯과 층위가 다르다. 나눠 두면 한 사건이 대여섯 칸에 걸려
  // 수법 분포를 흐린다. 이 칸만 `full_truth.cover_up` 도 같이 본다 —
  // method 문장에는 어떻게 죽였나만 적히기 때문이다.
  [
    'staging_cover_up',
    '위장·은폐 조작',
    /로그[를을]\s*(지우|고치|바꾸|덧|조작)|기록[을를]\s*(지우|고치|바꾸|조작)|타임스탬프|시각을 (바꿔|고쳐)|덧씌|백업을 지|출입(기록|카드|증)[을를]?\s*(바꾸|빌리|도용|조작)|잠금장치를|보안(카드|시스템)[을를]?\s*(끄|해제)|CCTV[를을]?\s*(끄|돌려|가리)|온도[를을]\s*(바꾸|조작)|조명[을를]\s*(끄|낮|바꾸)|사고(처럼|로) (꾸미|보이|위장)|지병(으로|처럼)|자연사(처럼|로)|자살(처럼|로) (꾸미|보이)|다른 원인으로|현장을 (정리|치우|되돌|복구)|자세를 (바꾸|고치)|흔적을 지우/,
    true,
  ],
  [
    'allergen_exposure',
    '알레르기 유발',
    /알레르기|알러지|아나필락시스|과민\s*반응|알레르겐/,
    false,
  ],
];

const METHOD_ARCHETYPE_OVERUSE_THRESHOLD = 0.08;

// 스물한 칸이던 시절의 키로 적힌 마스터가 31건 있다. 그대로 두면 새 표에서
// 떨어져 통계에 안 잡히므로 옮겨 읽는다. 옛 칸이 더 넓었던 자리
// (`asphyxiation` 가 가스 축적과 산소결핍을 같이 담았다)는 **좁은 쪽**으로
// 보낸다 — 넓게 잡으면 새로 쪼갠 뜻이 없다.
// 옛 칸이 **두 칸으로 갈린** 자리는 한쪽으로 몰지 않고 **양쪽으로 센다** —
// 선언만 봐서는 어느 쪽인지 알 수 없고, 한쪽으로 몰면 조용히 틀린다.
// 실제로 그랬다:
//   `temperature_exposure` → CASE109(고온 왁스 배출관)·CASE186(착유기)이
//                            **고온**인데 `hypothermia`(저온)로 갈 뻔했다
//   `asphyxiation`         → CASE115(청산가리 가스)·CASE152(도료 증기)는
//                            산소결핍이 아니라 **가스 축적**이다
//   `crush`                → CASE308(압반)은 낙하물이 아니라 **기계 압착**이다
// 정규식 폴백으로 미루는 쪽도 해 봤는데, 그 문장들을 정규식이 못 잡아
// **미분류가 되어 더 나빴다.** 양쪽으로 세면 한 사건이 두 칸에 들어가 비율이
// 조금 높게 잡히지만, 그쪽이 조용히 틀리는 것보다 낫다 — 과용 검사는
// 넘치게 경고하는 편이 안전하다. 이주하면서 하나로 좁혀 다시 적으면 된다.
const LEGACY_METHOD_SPLIT: Record<string, string[]> = {
  asphyxiation: ['oxygen_deprivation', 'toxic_gas_buildup'],
  temperature_exposure: ['hypothermia', 'hyperthermia'],
  crush: ['falling_object', 'machine_entrapment'],
};

const LEGACY_METHOD_KEYS: Record<string, string> = {
  fall: 'induced_fall',
  poisoning: 'oral_poisoning',
  fire: 'arson',
  denial_of_rescue: 'delayed_rescue',
  bleeding: 'exsanguination',
  injection: 'injection_infusion',
  sedation: 'sedation_then_act',
  vehicle: 'vehicle_collision',
  machinery: 'machine_entrapment',
  chemical_exposure: 'dermal_contact',
  medical_tampering: 'medical_procedure_tampering',
  allergen: 'allergen_exposure',
  // 한때 다섯으로 나눠 두었던 은폐 칸
  log_tampering: 'staging_cover_up',
  access_control_tampering: 'staging_cover_up',
  environmental_tampering: 'staging_cover_up',
  cause_substitution: 'staging_cover_up',
  postmortem_staging: 'staging_cover_up',
};

// **수법은 마스터가 직접 선언할 수 있다**(2026-09 사용자 결정).
// 정규식은 `full_truth.method` 문장을 **추측**하는 것이라 두 군데서 어긋난다 —
// 문장이 계열의 말을 안 쓰면 아무 데도 안 걸리고, 걸려도 틀릴 수 있다
// (CASE020 은 핸드크림을 바르는 **경피** 중독인데 「중독(경구)」로 잡혔다).
// `full_truth.method_archetypes` 에 키를 적어 두면 그것을 쓰고, 없으면 정규식
// 으로 떨어진다.
function methodArchetypeLabels(master: Master): Set<string> {
  const declared = (master.full_truth as { method_archetypes?: unknown })
    ?.method_archetypes;
  if (Array.isArray(declared) && declared.length > 0) {
    const labels = new Set<string>();
    const add = (k: string) => {
      const row = METHOD_ARCHETYPES.find(([id]) => id === k);
      labels.add(row ? row[1] : k);
    };
    for (const key of declared) {
      if (typeof key !== 'string' || key === 'other') continue;
      const split = LEGACY_METHOD_SPLIT[key];
      if (split) {
        for (const k of split) add(k);
        continue;
      }
      add(LEGACY_METHOD_KEYS[key] ?? key);
    }
    return labels;
  }
  const how = methodText(master);
  const hide = `${how} ${master.full_truth?.cover_up ?? ''}`;
  const labels = new Set<string>();
  for (const [, label, pattern, alsoCoverUp] of METHOD_ARCHETYPES) {
    if (pattern.test(alsoCoverUp ? hide : how)) labels.add(label);
  }
  return labels;
}

function methodText(master: Master): string {
  return `${master.full_truth?.method ?? ''} ${master.case_identity?.genre ?? ''}`;
}

/**
 * full_truth.method가 쓰는 수법 계열이 코퍼스에서 이미 임계값 넘게 쓰였는지
 * 검사한다. 한 사건이 여러 계열에 걸릴 수 있으므로 걸린 것마다 따로 낸다.
 */
export function checkMethodArchetypeOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const mine = methodArchetypeLabels(master);
  const comparableCases = otherCases.filter((o) => o.caseId !== caseId);
  if (comparableCases.length === 0) return [];
  const issues: Issue[] = [];
  for (const label of mine) {
    if (METHOD_OVERUSE_EXEMPT.has(label)) continue;
    const matching = comparableCases.filter((o) =>
      methodArchetypeLabels(o.master).has(label),
    ).length;
    const ratio = matching / comparableCases.length;
    if (ratio < METHOD_ARCHETYPE_OVERUSE_THRESHOLD) continue;
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'METHOD_ARCHETYPE_OVERUSE',
      message: `full_truth.method가 "${label}" 계열인데, 이미 코퍼스의 ${(ratio * 100).toFixed(0)}%(${matching}/${comparableCases.length}건)가 같은 계열이다. 덜 쓰인 계열로 다시 설계할 것 — npm run recent:avoid가 최근 10건에서 무엇이 반복됐는지 알려 준다.`,
    });
  }
  return issues;
}

// 무대 계열 과용 — "어디서 벌어지나".
//
// 위 셋(동기·배경 장치·수법)은 있는데 **장소를 세는 검사가 없었다.** 그 사이로
// 이 코퍼스에서 가장 큰 반복이 자랐다 — 313건에서 공예 공방이 95건(30.4%)이다.
// 제목 틀 25%나 「…를 앞둔」 49%보다 깊은 자리의 반복이다: **무대가 같으면
// 인물 구성(대표–수제자–막내)도, 사람들이 그날 거기 있는 이유도 따라서 닮는다.**
//
// 칸이 예순인 것은 쏠린 자리를 쪼갰기 때문이다(2026-09 사용자 결정) — 공예를
// 재료로 일곱, 식품 제조를 넷으로 나눴다. 반대로 구분이 모호한데 건수가 적은
// 것은 애초에 나누지 않았다(병원/의원/약국은 다 합쳐 일곱 건이다).
//
// **칸만 세면 검사가 잠든다.** 예순으로 쪼개면 공예 95건이 일곱으로 갈려
// 전부 7% 밑으로 내려가고, 정작 잡아야 할 최대 반복에 아무것도 안 걸린다.
// 그래서 **칸(10%)과 계열(20%)을 같이 센다** — 계열은 `craft_`·`food_`·`hotel_`
// 접두사와 아래 LOCATION_FAMILIES 의 묶음이다.
const LOCATION_ARCHETYPES: Array<[string, RegExp]> = [
  // ── 주거 ──
  ['private_house', /단독주택|자택|살림집|한옥집|가정집/],
  ['apartment_residence', /아파트|원룸|오피스텔|연립/],
  ['luxury_residence', /펜트하우스|대저택|고급 주택|별서/],
  ['villa_townhouse', /빌라|타운하우스|전원주택/],
  ['vacation_home', /별장|세컨드하우스|펜션|산장/],
  ['residential_common_area', /주거 단지|아파트 단지|공동현관|단지 내/],
  // ── 공예 공방 (재료로 일곱) ──
  ['craft_ceramics', /도자|장작가마|가마|옹기|청자|백자|자기 공방|요장/],
  ['craft_glass', /유리공예|유리 공방|스테인드|글라스|블로잉|냉각로/],
  [
    'craft_metal',
    /은세공|대장간|금속공예|주조|범종|도검|나이프|단조|귀금속|주얼리|세공|칠보|활자/,
  ],
  ['craft_wood', /목공|원목가구|목선반|가구 공방|현악기|활 제작|각궁|국궁방|소목/],
  ['craft_paper_lacquer', /한지|지소|칠기|나전|옻칠|표구|한지 공방|배접/],
  ['craft_textile', /자수|한복|염색|쪽빛|쪽염|매듭|펠트|중절모|가죽공방|재봉|직조|누비/],
  [
    'craft_restoration',
    /복원 공방|복원 전문|시계 복원|회중시계|태엽|오르골|인형 복원|고서적|고문서|빈티지카|오락기 복원|악기 복원|파이프오르간/,
  ],
  // ── 식품 제조 (넷) ──
  ['food_bakery', /초콜릿|쇼콜라|파티시에|제과|베이커리|디저트|젤라또|과자 공방/],
  ['food_brewery', /양조|와이너리|막걸리|주조장|증류|맥주 공방|청주/],
  ['food_fermentation', /장류|된장|간장|발효실|치즈 공방|숙성동|김치|젓갈|훈연/],
  ['food_rice_mill', /방앗간|참기름|들기름|정미소|착유|떡집|만두/],
  // ── 소규모 사업·상점 ──
  ['repair_shop', /수리점|수리소|정비소|정비동|개러지|세탁소|시계방|구두방|중고차|스왑 스테이션/],
  [
    'agricultural_worksite',
    /양봉|양식장|염전|농원|화원|과수원|목장|축사|해녀|종자|버섯|재배장|재배원|텃밭|스마트팜|사육|브리더/,
  ],
  ['private_office', /설계사무소|법무사|회계사무소|중개소|컨설팅|1인 사무실|통역센터|사무소/],
  ['photo_video_studio', /현상소|사진관|암실|인화실|필름 사진|사진 스튜디오/],
  ['beauty_personal_service', /헤어살롱|미용실|네일|타투|에스테틱|이발소|피부관리/],
  ['specialty_shop', /골동품|고미술|전당포|감정 공방|수선센터|악기점|서점|책방|화방/],
  ['retail_shop', /매장|판매점|직판장|백화점|상점|쇼룸|편집숍|아케이드|굿즈/],
  // ── 음식·숙박 ──
  ['restaurant', /식당|레스토랑|한정식|오마카세|스시|조리실|주방|전문점/],
  ['cafe_bar', /카페|주점|와인바|포차|전용 바|바 겸|찻집|다도/],
  ['hotel_guest_room', /호텔 객실|객실|료칸|게스트하우스|숙소동/],
  ['hotel_common_area', /호텔|로비 라운지|연회장|웨딩홀|회관/],
  ['resort_facility', /리조트|휴양|워터파크|찜질방|사우나|목욕탕|온천|스파/],
  // ── 의료·돌봄 ──
  ['hospital', /종합병원|대학병원|응급실|수술실/],
  ['clinic', /의원|한의원|클리닉|동물병원|치과|보건소/],
  ['pharmacy', /약국|조제실|제약/],
  ['care_facility', /요양|돌봄|복지관|보호센터|어린이집|보호소/],
  ['rehabilitation_facility', /재활병원|재활센터|재활원|재활전문|물리치료/],
  // ── 교육·연구 ──
  ['school', /초등학교|중학교|고등학교|교실|학교/],
  ['university', /대학|캠퍼스|연구동/],
  ['academy', /학원|교습소|아카데미|원데이클래스|레슨|연습생|트레이닝센터/],
  [
    'research_laboratory',
    /연구소|실험실|연구실|배양|실험동|시험동|클린룸|프루빙그라운드|테스트트랙|시험발사/,
  ],
  // ── 산업·물류 ──
  ['factory', /공장|제조|생산라인|생산센터|가공장|반도체|웨이퍼|제작소/],
  // workshop 은 **정비·조립 작업장**이다. 공예는 craft_* 가 맡는다 —
  // 둘 다 「공방」을 잡으면 95건이 두 계열에 동시에 걸려 계열 판정이 흐려진다.
  ['workshop', /조립동|조립·시험|정비작업장|기계실|공작실|장비 정비동|작업장 겸/],
  ['warehouse', /창고|보관창고|저장고|수장고|보관시설|보관동/],
  ['logistics_center', /물류|배송|택배|집하|물류단지/],
  ['construction_site', /공사현장|건설현장|비계|시공 현장|철거 현장/],
  ['utility_facility', /발전소|변전|정수장|가스 공급|열병합|데이터센터|수처리/],
  // ── 공공·법률 ──
  ['government_office', /관공서|시청|구청|행정복지|노동부|지자체 청사/],
  ['police_facility', /경찰|지구대|파출소|유치장|수사대/],
  ['court_legal_facility', /법원|법정|검찰|청사 형사|재판/],
  // ── 문화·스포츠·종교 ──
  [
    'museum_exhibition',
    /박물관|미술관|도서관|기록관|전시관|갤러리|체험관|생태원|동물원|경매하우스|전시홀/,
  ],
  ['performance_venue', /극장|공연장|콘서트홀|소극장|발레단|서커스|연희단|컴퍼니|무대동/],
  [
    'sports_facility',
    /체육관|경기장|링크|훈련원|훈련센터|훈련캠프|훈련장|훈련트랙|연습장|합숙소|수영|다이빙|볼링장|활터|풍동|승마|마장|골프|클라이밍|짚라인|서핑파크|레이스파크|슬라이딩센터|어드벤처파크|필라테스|복싱|서바이벌/,
  ],
  ['religious_facility', /교회|성당|사찰|산사|법당|사당|암자|재실|시제|장례식장|메모리얼/],
  ['association_club', /동호회|협회|회원제|클럽|동아리|보존회|기원|합평|길드|프라이빗/],
  // ── 촬영·미디어 ──
  ['broadcast_studio', /방송국|생중계|라디오|중계실|송출실|라이브커머스/],
  [
    'production_studio',
    /촬영 스튜디오|녹음|편집실|모션캡처|특수분장|디자인 스튜디오|콘텐츠 스튜디오|방탈출|이스케이프룸|활판|인쇄소/,
  ],
  // ── 교통 ──
  ['transport_hub', /역 대합실|기차역|공항|터미널|항구|부두|정거장/],
  ['vehicle_interior', /열차 안|버스 안|선박|선실|객차|크루즈|차량 내부|기내/],
  // ── 야외·특수 ──
  ['public_outdoor', /공원|광장|산책로|놀이터|야외광장|옥상|재개발구역|거리 한복판/],
  [
    'natural_outdoor',
    /산자락|숲|해변|강가|호수|산기슭|갈대밭|하천가|무인도|등대|산골짜기|폐터널|방공호|동굴|산악|고지대|활공장|채석장/,
  ],
  ['restricted_site', /출입제한|보안구역|통제구역|비공개 시설|금고실|콜드월렛/],
  ['temporary_site', /팝업|임시 사무실|임시 숙소|가설|이동 서커스|이동식/],
];

// 계열 — 칸만 세면 검사가 잠들기 때문에 같이 본다. 위 목록의 주석 묶음 그대로다.
// 계열 — 칸만 세면 검사가 잠들기 때문에 같이 본다.
// **계열은 「옮겨서 풀 수 있는 단위」여야 한다** — 한때 「문화·스포츠·종교」를
// 한 묶음으로 뒀더니 125건(39.9%)이 되면서 체육관 무대가 어느 칸으로 옮겨도
// 경고가 안 풀렸다. 고칠 길이 없는 경고는 경고가 아니다.
// [분류 코드, 사람이 읽을 이름, 멤버] — 데이터는 코드로, 메시지는 이름으로.
const LOCATION_FAMILIES: Array<[string, string, string[]]> = [
  [
    'residence',
    '주거',
    ['private_house', 'apartment_residence', 'luxury_residence', 'villa_townhouse', 'vacation_home', 'residential_common_area'],
  ],
  [
    'craft',
    '공예 공방',
    ['craft_ceramics', 'craft_glass', 'craft_metal', 'craft_wood', 'craft_paper_lacquer', 'craft_textile', 'craft_restoration'],
  ],
  [
    'food_production',
    '식품 제조',
    ['food_bakery', 'food_brewery', 'food_fermentation', 'food_rice_mill'],
  ],
  [
    'small_trade',
    '소규모 사업·상점',
    ['repair_shop', 'agricultural_worksite', 'private_office', 'photo_video_studio', 'beauty_personal_service', 'specialty_shop', 'retail_shop'],
  ],
  [
    'hospitality',
    '음식·숙박',
    ['restaurant', 'cafe_bar', 'hotel_guest_room', 'hotel_common_area', 'resort_facility'],
  ],
  [
    'medical_care',
    '의료·돌봄',
    ['hospital', 'clinic', 'pharmacy', 'care_facility', 'rehabilitation_facility'],
  ],
  [
    'education_research',
    '교육·연구',
    ['school', 'university', 'academy', 'research_laboratory'],
  ],
  [
    'industrial_logistics',
    '산업·물류',
    ['factory', 'workshop', 'warehouse', 'logistics_center', 'construction_site', 'utility_facility'],
  ],
  [
    'civic_legal',
    '공공·법률',
    ['government_office', 'police_facility', 'court_legal_facility'],
  ],
  [
    'culture_exhibition',
    '문화·전시',
    ['museum_exhibition', 'performance_venue'],
  ],
  [
    'sports_social',
    '체육·동호회',
    ['sports_facility', 'association_club'],
  ],
  [
    'religious_ritual',
    '종교·제례',
    ['religious_facility'],
  ],
  [
    'media_production',
    '촬영·미디어',
    ['broadcast_studio', 'production_studio'],
  ],
  [
    'transit',
    '교통',
    ['transport_hub', 'vehicle_interior'],
  ],
  [
    'outdoor_special',
    '야외·특수',
    ['public_outdoor', 'natural_outdoor', 'restricted_site', 'temporary_site'],
  ],
];

export const LOCATION_ARCHETYPE_KEYS: string[] = LOCATION_ARCHETYPES.map(
  ([key]) => key,
);

// **무대만 5%다**(2026-09 사용자 결정). 나머지 축은 8%로 통일했지만, 56칸이면
// 균등해도 1.8%라 8%는 균등의 4.5배로 너무 느슨하다 — 8%로 두면 걸리는 칸이
// 여덟에서 둘로 줄어 `warehouse`(8.0%)·`craft_paper_lacquer`(7.0%) 같은
// 실제 쏠림이 통째로 빠진다. 칸 수가 다르면 임계도 달라야 한다.
const LOCATION_ARCHETYPE_OVERUSE_THRESHOLD = 0.05;
const LOCATION_FAMILY_OVERUSE_THRESHOLD = 0.2;

// 선언(`case_identity.location_archetypes`) 우선, 없으면 `setting` 문장에서
// 정규식으로 떨어진다 — 수법·동기와 같은 모양이다.
function locationArchetypeKeys(master: Master): Set<string> {
  const declared = (
    master.case_identity as { location_archetypes?: unknown } | undefined
  )?.location_archetypes;
  if (Array.isArray(declared) && declared.length > 0) {
    const keys = new Set<string>();
    for (const key of declared) {
      if (typeof key !== 'string' || key === 'other') continue;
      keys.add(key);
    }
    return keys;
  }
  const text = master.case_identity?.setting ?? '';
  const keys = new Set<string>();
  for (const [key, pattern] of LOCATION_ARCHETYPES) {
    if (pattern.test(text)) keys.add(key);
  }
  return keys;
}

function locationFamilies(keys: Set<string>): Set<string> {
  const families = new Set<string>();
  for (const [code, , members] of LOCATION_FAMILIES) {
    if (members.some((m) => keys.has(m))) families.add(code);
  }
  return families;
}

/**
 * 사건의 무대가 코퍼스에서 이미 임계값 넘게 쓰였는지 검사한다.
 * 칸(10%)과 계열(20%)을 따로 낸다 — 칸으로는 흩어져 보이는데 계열로는 한곳에
 * 몰린 상태가 이 코퍼스의 실제 모습이라(공예 공방 30.4%), 칸만 세면 잠든다.
 */
export function checkLocationArchetypeOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const comparableCases = otherCases.filter((o) => o.caseId !== caseId);
  if (comparableCases.length === 0) return [];
  const otherKeys = comparableCases.map((o) => locationArchetypeKeys(o.master));
  const mine = locationArchetypeKeys(master);
  const issues: Issue[] = [];

  for (const key of mine) {
    const matching = otherKeys.filter((k) => k.has(key)).length;
    const ratio = matching / comparableCases.length;
    if (ratio < LOCATION_ARCHETYPE_OVERUSE_THRESHOLD) continue;
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'LOCATION_ARCHETYPE_OVERUSE',
      message: `사건의 무대가 "${key}"인데, 이미 코퍼스의 ${(ratio * 100).toFixed(0)}%(${matching}/${comparableCases.length}건)가 같은 칸이다. 무대가 같으면 인물 구성과 사람들이 그날 거기 있는 이유까지 따라서 닮는다 — 덜 쓰인 칸으로 옮길 것.`,
    });
  }

  const myFamilies = locationFamilies(mine);
  const otherFamilies = otherKeys.map((k) => locationFamilies(k));
  for (const family of myFamilies) {
    const matching = otherFamilies.filter((f) => f.has(family)).length;
    const ratio = matching / comparableCases.length;
    if (ratio < LOCATION_FAMILY_OVERUSE_THRESHOLD) continue;
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'LOCATION_FAMILY_OVERUSE',
      message: `무대가 "${family}"(${LOCATION_FAMILIES.find(([c]) => c === family)?.[1] ?? family}) 계열인데, 이미 코퍼스의 ${(ratio * 100).toFixed(0)}%(${matching}/${comparableCases.length}건)가 같은 계열이다. 칸을 옆으로 옮기는 것(도자 공방 → 유리 공방)으로는 풀리지 않는다 — 계열 자체를 바꿀 것.`,
    });
  }
  return issues;
}

// 배경 — "무슨 상황이 배경인가 / 어떻게 서술했나 / 사건과 얼마나 붙어 있나".
//
// 원래 이 자리에는 SETTING_BACKDROP_OVERUSE 하나뿐이었고, 그것은 「심사·인증」
// **한 칸**만 보고 있었다. 그 장치를 안 쓰면 무조건 통과라, 계약·서명식 17.3%,
// 경기·선발전 14.7%, 복원·보수 10.2%가 전부 세어지지 않은 채 지나갔다.
//
// **세 갈래로 가른 것이 핵심이다**(2026-09 사용자 결정). 재 보면 이 축의 실패는
// 서로 다른 층위 둘이었다 — 「심사 배경이 20.8%」는 *무엇을* 쓰느냐의 문제고,
// 「…를 앞둔 49.5%」는 *어떻게 쓰느냐*의 문제다. 한 축에 묶여 있으니 둘 중
// 하나는 반드시 안 잡혔다. archetypes 가 전자를, phrasing 이 후자를 맡는다.
//
// intensity 는 **자동 판정하지 않는다**. 「때문에」 한 마디로 contributory 를
// 매기면 평범한 문장이 다 걸린다. 마스터 선언값만 읽고, 없으면 아무것도 세지
// 않는다 — 대신 선언이 있으면 **그것이 거짓인지는 검사할 수 있다**(아래).
// 수법·동기·무대가 전부 자기신고로만 굴러가는 것과 다른 유일한 칸이다.
const BACKGROUND_ARCHETYPES: Array<[string, string[]]> = [
  ['regular_day', ['평범한 날', '평상시', '평소처럼', '평소와 다름없이', '특별한 일정 없이', '일상적으로', '특별한 행사', '특별할 것 없']],
  ['routine_meeting', ['정기 회의', '정례 회의', '주간 회의', '월례 회의', '회의 일정', '회의가 열리', '합평', '정기 모임']],
  ['routine_operation', ['평상 영업', '정상 영업', '정상 운영', '근무 중', '업무 중', '영업 중', '통상 업무', '영업이 끝난']],
  // 「수확철」만 있어서 CASE001의 「채밀」이 안 걸렸다 — 1차 산업 무대가
  // 24건이라 수확 어휘를 도메인까지 넓힌다.
  [
    'seasonal_peak',
    [
      '성수기',
      '비수기',
      '시즌',
      '연말',
      '연초',
      '휴가철',
      '명절',
      '주말 특수',
      '대목',
      '수확',
      '채밀',
      '첫물',
      '제철',
      '출하철',
      '한여름',
    ],
  ],
  ['review_certification', ['심사', '인증', '허가 심사', '승인 심사', '검증', '인증 절차', '갱신']],
  ['appraisal', ['감정', '감정평가', '가치 평가', '재산 감정', '물건 감정', '진위']],
  ['inspection_audit', ['점검', '안전 점검', '시설 점검', '감사', '회계 감사', '실사', '검진']],
  ['evaluation', ['평가', '성과 평가', '평가 기간', '평가 결과', '등급 평가']],
  ['investigation', ['조사', '내부 조사', '현장 조사', '진상 조사', '사실 확인', '조사 중']],
  ['contract_signing', ['계약', '계약 체결', '계약식', '서명식', '계약 서명', '협약 체결', '협약식', '조인식']],
  ['acquisition_transfer', ['인수', '인계', '양도', '양수', '소유권 이전', '사업 인수', '경영권 이전', '합병']],
  ['business_negotiation', ['협상', '협의', '거래 협의', '조건 협상', '사업 협상', '가격 협상', '투자 유치', '투자 라운드']],
  ['delivery_shipment', ['납품', '출고', '배송', '출하', '선적', '공급계약']],
  ['relocation', ['이전', '이사', '사업장 이전', '사무실 이전', '이전 작업', '이전 준비']],
  ['closure_demolition', ['폐업', '폐점', '철거', '영업 종료', '폐쇄', '폐교', '마지막 영업']],
  ['restoration_repair', ['복원', '보수', '보수 공사', '복원 작업', '수리 공사', '문화재 복원']],
  ['construction_renovation', ['공사', '건설', '시공', '리모델링', '개보수', '증축', '개축', '리뉴얼']],
  ['opening_completion', ['개장', '개원', '준공', '개관', '개업', '개장식', '개원식', '준공식', '개관식', '재개장', '첫 영업']],
  ['sports_match', ['경기', '시합', '매치', '경기 일정', '경기 당일', '경기 중']],
  ['sports_selection', ['선발전', '대표 선발', '출전 경쟁', '선수 선발', '선발 경기']],
  ['competition_contest', ['공모', '공모전', '경연', '대회', '콘테스트', '출품', '예선', '결선', '챔피언십', '명인전', '박람회', '비엔날레']],
  ['exam', ['시험', '고사', '입시', '자격시험', '시험 기간']],
  ['audition', ['오디션', '캐스팅', '선발 오디션']],
  ['festival_celebration', ['축제', '기념 행사', '기념식', '축하 행사', '지역 축제', '시상식', '어워드', '페스티벌']],
  ['private_gathering', ['사적인 모임', '친목 모임', '가족 모임', '지인 모임', '회식', '파티', '잔치']],
  ['conference_seminar', ['컨퍼런스', '세미나', '학술대회', '포럼', '발표회', '브리핑', '데모데이']],
  ['workshop', ['워크숍', '워크샵', '연수회', '실습', '교육 행사', '원데이클래스', '체험 프로그램']],
  ['company_event', ['회사 행사', '사내 행사', '창립기념', '창립 행사', '송년회', '신년회', '사내 파티']],
  ['performance_rehearsal', ['공연', '무대', '리허설', '공연 준비', '공연 당일', '연주회']],
  ['filming', ['촬영', '촬영 현장', '촬영장', '녹화']],
  ['broadcast', ['방송', '생방송', '생중계', '프로그램 촬영', '방송국', '라이브커머스']],
  ['exhibition', ['전시', '전시회', '전시 개막', '전시 준비', '개막식', '프리뷰', '개인전', '특별전', '비엔날레', '아트페어']],
  ['auction', ['경매', '입찰', '낙찰']],
  ['product_launch', ['신제품 출시', '출시 행사', '제품 출시', '출시일', '론칭', '런칭', '발표 행사', '발매', '상장 발표']],
  ['product_demo', ['시연', '공개 시연', '데모', '시제품 공개', '시연회', '시식회', '베타테스트']],
  ['inheritance', ['상속', '유산', '유산 분배', '상속 절차', '상속 재산', '물려받', '유언']],
  ['funeral_memorial', ['장례', '장례식', '발인', '빈소', '추모', '추도식', '제사', '시제', '기일', '5주기', '세상을 뜬', '세상을 떠난', '작고한', '별세한']],
  ['family_event', ['가족 행사', '결혼식', '돌잔치', '환갑', '칠순', '팔순']],
  ['allegation_complaint', ['의혹', '고발', '고소', '신고', '폭로', '제보', '문제 제기', '민원', '스캔들', '내부고발']],
  ['trial_legal_proceeding', ['재판', '공판', '법정', '소송', '법적 절차', '심리', '판결', '선고', '결심', '기소']],
  ['training_retreat', ['합숙', '수련', '연수', '훈련', '연수원', '수련회', '전지훈련']],
  ['emergency_response', ['비상', '긴급 대응', '비상 대응', '사고 대응', '재난 대응', '구조 작업']],
  ['evacuation_blackout', ['대피', '대피령', '정전', '전력 중단', '비상 대피', '대피 훈련']],
  ['security_lockdown', ['출입 통제', '봉쇄', '보안 통제', '경계 강화', '출입 제한', '통제구역']],
];

const BACKGROUND_PHRASING: Array<[string, string[]]> = [
  ['approaching', ['앞두고', '앞둔', '다가오는', '다가온', '임박한', '얼마 남지 않은', '하루 전', '전야']],
  ['in_progress', ['진행되던', '진행 중', '열리던', '열리고 있던', '진행하고 있던', '한창']],
  ['immediately_after', ['직후', '막 끝난 뒤', '끝난 직후', '마친 직후', '끝나고 얼마 지나지 않아']],
  ['recently_completed', ['마친 뒤', '마친 후', '끝난 뒤', '끝난 후', '완료된 뒤', '완료 직후']],
  ['scheduled', ['예정되어 있던', '예정된', '예정인', '일정이 잡혀 있던', '일정이 잡힌', '계획되어 있던', '계획된']],
  ['during_preparation', ['준비하던', '준비 중', '준비하고 있던', '준비가 한창이던', '준비로', '준비를 마']],
  ['result_review', ['결과를 확인하던', '결과를 검토하던', '결과가 발표된', '결과 발표를 앞두고', '결과를 기다리던']],
  ['gathering_for', ['때문에 모인', '을 위해 모인', '를 위해 모인', '참석하기 위해 모인', '한자리에 모인', '모이는']],
  ['restricted_for', ['을 위해 통제된', '출입이 제한된', '일부 구역이 통제된', '통제된 상태에서', '폐쇄된 상태에서', '통제된 가운데']],
  ['triggered_by', ['계기로', '때문에 시작된', '발생한 직후', '문제로 인해', '사건 이후']],
  ['alongside', ['와 함께', '과 함께', '동시에', '한편', '와 맞물려', '와 병행해', '와 겹쳐']],
  ['amid', ['한가운데', '와중에', '분위기 속에서', '상황에서', '혼잡한 가운데', '가운데']],
  ['following', ['이후', '뒤이어', '발생한 후', '발생 이후']],
  ['during', ['동안', '진행되는 동안', '진행 중에', '행사 중', '업무 중']],
  ['on_the_day_of', ['당일', '그날', '행사 당일', '경기 당일', '시험 당일', '개장 당일']],
];

// 배경 계열 — 무대와 같은 이유로 칸과 같이 센다. 「평가받는 자리」가
// review_certification·inspection_audit·appraisal·evaluation·exam·audition 여섯으로
// 흩어져 있어 칸으로는 각각 20% 밑인데, 합치면 39.3%다.
const BACKGROUND_FAMILIES: Array<[string, string, string[]]> = [
  [
    'evaluation_review',
    '평가·심사',
    ['review_certification', 'appraisal', 'inspection_audit', 'evaluation', 'exam', 'audition'],
  ],
  [
    'transaction_contract',
    '거래·계약',
    ['contract_signing', 'acquisition_transfer', 'business_negotiation', 'delivery_shipment'],
  ],
  [
    'competition_match',
    '경쟁·시합',
    ['sports_match', 'sports_selection', 'competition_contest'],
  ],
  [
    'performance_media',
    '공연·미디어',
    ['performance_rehearsal', 'filming', 'broadcast'],
  ],
  [
    'exhibition_launch',
    '전시·출시',
    ['exhibition', 'auction', 'product_launch', 'product_demo'],
  ],
  [
    'facility_change',
    '시설 변경',
    ['relocation', 'closure_demolition', 'restoration_repair', 'construction_renovation', 'opening_completion'],
  ],
  [
    'ceremony_family',
    '의례·가족',
    ['funeral_memorial', 'family_event', 'private_gathering', 'festival_celebration', 'inheritance'],
  ],
  [
    'academic_training',
    '학술·교육',
    ['conference_seminar', 'workshop', 'training_retreat'],
  ],
  [
    'legal_dispute',
    '법·분쟁',
    ['allegation_complaint', 'trial_legal_proceeding', 'investigation'],
  ],
  [
    'emergency_control',
    '비상·통제',
    ['emergency_response', 'evacuation_blackout', 'security_lockdown'],
  ],
  [
    'routine_daily',
    '일상',
    ['regular_day', 'routine_meeting', 'routine_operation', 'seasonal_peak'],
  ],
  [
    'company_event',
    '사내 행사',
    ['company_event'],
  ],
];

// 사건과 배경이 얼마나 붙어 있는가. 선언 전용 — 키워드로 매기지 않는다.
export const BACKGROUND_INTENSITY_KEYS: Array<[string, string]> = [
  ['incidental', '그날이 하필 그날이었을 뿐, 배경을 걷어내도 사건이 그대로 선다'],
  ['contextual', '배경이 그 자리의 공기를 만든다 — 사람이 몰렸거나 비어 있었다'],
  ['contributory', '배경이 기회를 만든다 — 그것 때문에 문이 열렸거나 자리가 비었다'],
  ['central', '배경이 곧 동기다 — 그것이 없으면 죽일 이유가 없다'],
];

// 칸이 43개라 균등하면 2.3%다. 8%는 균등의 **3.4배**로, 동기 축(34칸에
// 10% = 3.4배)과 같은 엄격도다 — 10%로 두면 `restoration_repair`(8.9%)처럼
// 이미 서른 건 가까이 쌓인 것이 안 걸린다. 칸을 잘게 쪼갤수록 임계도 같이
// 내려야 한다는 것이 무대 축(56칸에 5%)에서 이미 나온 결론이다.
const BACKGROUND_ARCHETYPE_OVERUSE_THRESHOLD = 0.08;
const BACKGROUND_FAMILY_OVERUSE_THRESHOLD = 0.2;
// 칸이 열다섯뿐이라(균등해도 6.7%) 무대·동기의 10%를 그대로 쓸 수 없다.
// 30%면 지금 approaching(49.5%)과 in_progress(30.0%) 둘이 걸린다 — 그 둘이
// 코퍼스의 79%를 먹고 있으므로 둘 다 걸리는 것이 맞다.
const BACKGROUND_PHRASING_OVERUSE_THRESHOLD = 0.3;

type BackgroundBlock = {
  background_archetypes?: unknown;
  background_phrasing?: unknown;
  background_intensity?: unknown;
};

function backgroundBlock(master: Master): BackgroundBlock | undefined {
  return (master.case_identity as { background?: BackgroundBlock } | undefined)
    ?.background;
}

function declaredList(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const out = value.filter(
    (v): v is string => typeof v === 'string' && v !== 'other',
  );
  return out.length > 0 ? out : undefined;
}

function matchKeywords(
  table: Array<[string, string[]]>,
  text: string,
): Set<string> {
  const keys = new Set<string>();
  for (const [key, words] of table) {
    if (words.some((w) => text.includes(w))) keys.add(key);
  }
  return keys;
}

function backgroundArchetypeKeys(master: Master): Set<string> {
  const declared = declaredList(backgroundBlock(master)?.background_archetypes);
  if (declared) return new Set(declared);
  return matchKeywords(
    BACKGROUND_ARCHETYPES,
    master.case_identity?.setting ?? '',
  );
}

function backgroundPhrasingKeys(master: Master): Set<string> {
  const declared = declaredList(backgroundBlock(master)?.background_phrasing);
  if (declared) return new Set(declared);
  return matchKeywords(BACKGROUND_PHRASING, master.case_identity?.setting ?? '');
}

function backgroundFamilies(keys: Set<string>): Set<string> {
  const families = new Set<string>();
  for (const [code, , members] of BACKGROUND_FAMILIES) {
    if (members.some((m) => keys.has(m))) families.add(code);
  }
  return families;
}

function ratioIssues(
  code: string,
  mine: Set<string>,
  others: Array<Set<string>>,
  threshold: number,
  alreadyRegistered: boolean,
  render: (key: string, pct: string, matching: number, total: number) => string,
): Issue[] {
  const issues: Issue[] = [];
  for (const key of mine) {
    const matching = others.filter((o) => o.has(key)).length;
    const ratio = matching / others.length;
    if (ratio < threshold) continue;
    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code,
      message: render(key, (ratio * 100).toFixed(0), matching, others.length),
    });
  }
  return issues;
}

/**
 * 배경 세 갈래를 각각 센다 — 칸(10%) · 계열(20%) · 서술 꼴(30%).
 * intensity 는 비율을 보지 않고, 선언이 full_truth 와 어긋나는지만 본다.
 */
export function checkBackgroundOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const comparableCases = otherCases.filter((o) => o.caseId !== caseId);
  if (comparableCases.length === 0) return [];
  const otherArch = comparableCases.map((o) =>
    backgroundArchetypeKeys(o.master),
  );
  const mineArch = backgroundArchetypeKeys(master);

  const issues: Issue[] = [
    ...ratioIssues(
      'BACKGROUND_ARCHETYPE_OVERUSE',
      mineArch,
      otherArch,
      BACKGROUND_ARCHETYPE_OVERUSE_THRESHOLD,
      alreadyRegistered,
      (key, pct, m, t) =>
        `배경 상황이 "${key}"인데, 이미 코퍼스의 ${pct}%(${m}/${t}건)가 같은 칸이다. 덜 쓰인 상황으로 바꿀 것 — case_identity.background.background_archetypes 에 적어 두면 추측 대신 그 값으로 센다.`,
    ),
    ...ratioIssues(
      'BACKGROUND_FAMILY_OVERUSE',
      backgroundFamilies(mineArch),
      otherArch.map(backgroundFamilies),
      BACKGROUND_FAMILY_OVERUSE_THRESHOLD,
      alreadyRegistered,
      (key, pct, m, t) =>
        `배경이 "${key}"(${BACKGROUND_FAMILIES.find(([c]) => c === key)?.[1] ?? key}) 계열인데, 이미 코퍼스의 ${pct}%(${m}/${t}건)가 같은 계열이다. 칸을 옆으로 옮기는 것(인증 심사 → 안전 점검)으로는 풀리지 않는다 — 계열 자체를 바꿀 것.`,
    ),
    ...ratioIssues(
      'BACKGROUND_PHRASING_OVERUSE',
      backgroundPhrasingKeys(master),
      comparableCases.map((o) => backgroundPhrasingKeys(o.master)),
      BACKGROUND_PHRASING_OVERUSE_THRESHOLD,
      alreadyRegistered,
      (key, pct, m, t) =>
        `배경을 "${key}" 꼴로 서술했는데, 이미 코퍼스의 ${pct}%(${m}/${t}건)가 같은 꼴이다. **배경 자체가 아니라 문장 구조의 반복이다** — 같은 상황이라도 다르게 들어갈 수 있다(끝난 직후, 결과를 기다리던, 당일, 그 일로 사람들이 모인).`,
    ),
  ];
  return issues;
}

/**
 * background_intensity 는 작성자가 선언하는 값인데, **유일하게 반증할 수 있다** —
 * 「central(배경이 곧 동기다)」이라고 적었는데 그 배경어가 full_truth 에 한 번도
 * 안 나오면 그 선언은 거짓이다. 수법·동기·무대는 적으면 그만이라 기계가 받아
 * 적을 뿐인데, 이 칸만은 아니다. 반대 방향(incidental 인데 진상에 깊이 얽힘)은
 * 보지 않는다 — 배경어가 진상에 나오는 것 자체는 흔해서 오탐이 된다.
 */
export function checkBackgroundIntensity(
  _caseId: string,
  master: Master,
  alreadyRegistered = false,
): Issue[] {
  const declared = backgroundBlock(master)?.background_intensity;
  if (typeof declared !== 'string') return [];
  if (declared !== 'central' && declared !== 'contributory') return [];

  // **`setting` 산문이 아니라 배경 계열의 키워드를 댄다**(2026-09 사용자 제안).
  //
  // 두 번 틀렸던 자리다. 처음에는 `setting` **첫 문장**만 읽었는데, 001~020쯤의
  // 마스터는 첫 문장이 **장소 소개**이고 배경은 셋째 문장쯤에 와서 참 선언이
  // 반증에 걸렸다(CASE002는 `motive`가 「배수 공사로 바닥이 드러나면」이라고
  // 대놓고 적는데도 걸렸다). 그래서 `setting` **전체**로 넓혔더니, 이번에는
  // 90자 산문의 어느 한 낱말은 거의 항상 진상에 울려서 **반증이 0건이 됐다** —
  // 정확해진 것이 아니라 검사가 죽은 것이다.
  //
  // 재료가 이미 있었다. `background_archetypes` 가 「무슨 상황이 배경인가」를
  // 코드로 적고, 그 코드마다 키워드 목록이 붙어 있다. **그 키워드를 진상에
  // 대면** 「심사를 앞두고」라고 적어 놓고 진상에서는 심사가 한 번도 안 나오는
  // 경우가 그대로 잡힌다. 장소 이름이나 「오래된」 같은 말이 우연히 울려서
  // 통과하는 일도 없다.
  //
  // 선언이 없으면 `setting` 에서 추측한 계열로 같은 검사를 한다 — 313건 중
  // 배경을 선언한 것은 아직 몇 건뿐이다.
  //
  // 돌려 보니 **걸리는 것이 intensity 가 아니라 계열 선택이었다.** 선언 8건 중
  // 둘이 걸리는데, CASE027 은 `product_launch` 라 적었지만 동기가 말하는 것은
  // 「독점 협업 계약」(contract_signing)이고, CASE001 은 `seasonal_peak` 인데
  // 진상이 쓰는 말은 「채밀」이라 계절이 아니라 **그날의 일**이다. 둘 다 배경이
  // 사건에 얽혀 있는 것은 맞으므로 intensity 는 옳고, 계열이 헐거웠다. 그래서
  // 메시지가 세 갈래를 다 가리킨다.
  const archetypes = backgroundArchetypeKeys(master);
  if (archetypes.size === 0) return [];
  const keywords: string[] = [];
  for (const [key, words] of BACKGROUND_ARCHETYPES) {
    if (archetypes.has(key)) keywords.push(...words);
  }
  if (keywords.length === 0) return [];

  const ft = master.full_truth as Record<string, unknown> | undefined;
  const truth = [
    'motive',
    'method',
    'cover_up',
    'summary',
    'opportunity',
    'ending_explanation',
  ]
    .map((k) => (typeof ft?.[k] === 'string' ? (ft[k] as string) : ''))
    .join(' ');
  if (keywords.some((w) => truth.includes(w))) return [];

  return [
    {
      severity: overuseSeverity(alreadyRegistered),
      code: 'BACKGROUND_INTENSITY_UNSUPPORTED',
      message: `background_intensity를 "${declared}"로 적었는데, background_archetypes가 가리키는 배경(${[...archetypes].join(', ')})이 full_truth에 한 번도 나오지 않는다. 셋 중 하나다 — ① 배경이 실제로는 사건에 안 얽혀 있다(intensity를 incidental/contextual로 내릴 것) ② 얽혀 있는데 진상 산문이 그것을 안 쓴다(동기·수법·은폐 중 어딘가에 물릴 것) ③ **계열을 잘못 골랐다.** 실제로 ③이 잦다 — CASE027은 product_launch라 적었는데 동기가 말하는 것은 「독점 협업 계약」이라 contract_signing 쪽이고, CASE001은 seasonal_peak인데 진상이 쓰는 말은 「채밀」이라 계절이 아니라 그날의 일이다. 먼저 계열이 맞는지부터 볼 것.`,
    },
  ];
}

// 은폐를 두 축으로 내려 본다 — **무엇을 감췄나 / 어떻게 감췄나**(2026-09 사용자 결정).
//
// `staging_cover_up` 이 24.6%인데, 이 숫자는 「은폐 사건이 너무 많다」는 경고로
// 읽으면 안 된다 — 거의 모든 사건이 무언가를 감추므로 **옮겨서 풀 수 있는
// 단위가 아니다.** 그래서 그 칸은 수법 과용 판정에서 뺀다(METHOD_OVERUSE_EXEMPT).
//
// 대신 그 아래를 센다. 상위를 지우는 것이 아니라 **너무 넓어서 다양성을 잡아먹는
// 상위 밑에 실제 차이를 내려 주는 것**이고, 이것은 `small_business` 110건을
// 재료별로 쪼갠 것과 같은 원리다. 「계단에서 밀고 사고처럼 꾸며 현장을 정돈」과
// 「죽인 뒤 CCTV 기록만 지움」은 둘 다 staging_cover_up 인데 전혀 다른 사건이다.
const COVER_UP_TARGETS: Array<[string, string, RegExp]> = [
  ['identity', '신원', /신원|누구인지|정체[를가]|이름[^.]{0,8}(숨|감추|바꾸)/],
  ['motive', '동기', /동기[^.]{0,8}(숨|감추|가리)|이유[^.]{0,8}(숨|감추)|까닭[^.]{0,8}(숨|감추)/],
  ['time', '시각', /시각[^.]{0,12}(바꾸|고치|속이|어긋|조작|찍히게|남게)|시간대[^.]{0,8}(바꾸|옮|속)|사망 추정 시각|시점[^.]{0,8}(바꾸|속이)/],
  ['location', '장소', /장소[^.]{0,8}(바꾸|속이|감추)|위치[^.]{0,8}(바꾸|속이|옮)|어디서 (죽|벌어|있었)/],
  ['cause_of_death', '사인', /사인|사고사|지병|자연사|사망 원인|병사로|심장마비/],
  ['weapon', '흉기', /흉기|무기[를을]|범행 도구|사용한 도구/],
  ['access_route', '출입 경로', /출입|드나든|동선|들어간 경로|잠금장치|열쇠[^.]{0,8}(숨|치우|돌려)|카드[^.]{0,8}(빌리|도용|바꾸)/],
  ['relationship', '관계', /관계[^.]{0,8}(숨|감추|부인)|사이[^.]{0,8}(숨|감추|부인)|친분|내연|빚진|채무 관계/],
  ['evidence', '증거', /(증거|흔적|자국|지문|잔여물|잔흔)[^.]{0,12}(지우|없애|치우|제거|닦|씻|태우|태웠|폐기)/],
  ['responsibility', '책임', /책임[^.]{0,8}(돌리|피하|벗)|과실[^.]{0,8}(감추|돌리)|탓으로|뒤집어(씌|쓰)|누명/],
  ['financial_trace', '금전 흔적', /송금|자금|장부|입출금|계좌|영수증|돈의 흐름|정산 자료|거래 내역/],
  ['communication_trace', '연락 흔적', /통화|메시지|문자|메일|연락 기록|통신 기록|채팅|녹취/],
  ['victim_behavior', '피해자의 행동', /스스로[^.]{0,10}(한|했|갔|올라|들어)|본인이[^.]{0,8}(한|했)|자발적으로|혼자[^.]{0,8}(한|했|들어|올라)/],
  ['crime_scene', '현장', /현장[^.]{0,10}(정리|치우|되돌|복구|정돈|손보|꾸미)|방[을를][^.]{0,8}(정리|치우)|자리[^.]{0,8}(되돌|정돈)|어질러진/],
];


const COVER_UP_METHODS: Array<[string, string, RegExp]> = [
  ['scene_rearrangement', '현장 재배치', /현장[^.]{0,10}(정리|치우|되돌|복구|정돈)|자세[^.]{0,8}(바꾸|고치|돌려)|물건[^.]{0,10}(제자리|옮|치워|돌려)|배치[^.]{0,8}바꾸|원래대로 (돌려|놓)/],
  ['evidence_removal', '증거 제거', /(증거|흔적|자국|지문|잔여물|잔흔|자취)[^.]{0,12}(지우|없애|치우|제거|닦|씻|폐기)|태워 없|불태|난로에 태|소각/],
  ['evidence_placement', '증거 심기', /심어 (놓|두)|가져다 (놓|두)|일부러[^.]{0,8}(남|흘|두)|흘려 (놓|두)|누명[을를]? (씌|쓰)/],
  ['false_accident', '사고 위장', /사고(처럼|로)[^.]{0,10}(꾸미|보이|위장|처리|만들)|실족(한 것|처럼)|미끄러진 것처럼|사고사로|전복 사고처럼|오작동(처럼|으로)/],
  ['false_suicide', '자살 위장', /자살(처럼|로|한 것)|유서|스스로 목숨/],
  ['false_intrusion', '침입 위장', /침입(한 것|처럼|으로)|외부인의 소행|강도|도둑이 든 것처럼|창(문)?을 깨/],
  ['false_timeline', '시각 조작', /시각[^.]{0,12}(바꿔|고쳐|앞당|늦|속이|조작|찍히게|남게)|시간대[^.]{0,8}(바꾸|옮)|타임스탬프|순서[를을] 바꾸|알람[을를]/],
  ['false_alibi', '알리바이 조작', /알리바이[^.]{0,8}(만들|꾸미|세우)|증인[을를][^.]{0,6}(세|만들)|같이 있었다고|함께 있었다고|내내[^.]{0,12}있었다고 (주장|말)/],
  ['object_substitution', '물건 바꿔치기', /바꿔치기|바꿔 (놓|두|끼)|같은 것으로[^.]{0,6}(갈|바꾸)|대체품|모조|새것으로 (갈|바꾸)|멀쩡한 것으로/],
  ['document_falsification', '서류 위조', /서류[^.]{0,10}(위조|조작|고치|바꾸)|장부[^.]{0,10}(고치|바꾸|조작)|기록부[^.]{0,10}(고치|바꾸|조작)|서명[^.]{0,8}(위조|흉내|대신)|일지[^.]{0,10}(고치|바꾸|조작)|명단[^.]{0,8}(고치|바꾸)/],
  ['digital_record_manipulation', '전산 기록 조작', /로그[를을]|CCTV|영상[^.]{0,8}(지우|삭제|돌려)|파일[^.]{0,8}(지우|삭제)|백업[를을]?|전산|데이터[^.]{0,8}(지우|바꾸)|카메라[^.]{0,8}(끄|가리|돌려)|단말기[^.]{0,10}(시각|기록)/],
  ['witness_misdirection', '목격자 유도', /다른 사람[을를][^.]{0,6}(지목|가리)|엉뚱한 (사람|쪽)|주의[를을][^.]{0,6}(돌|끌)|거짓 증언|말[을를] 맞추|입[을를] 맞추/],
  ['body_movement', '시신 이동', /시신[^.]{0,10}(옮|끌|눕|이동)|몸[을를][^.]{0,6}옮|다른 곳으로 옮겨|끌어다 (눕|놓)/],
  ['weapon_disposal', '흉기 처분', /(흉기|도구|주사기|칼|병|주사기)[^.]{0,10}(버리|치우|숨기|폐기|가져가)/],
  ['contamination', '오염·덮어쓰기', /덮어(씌|쓰)|섞어[^.]{0,6}(넣|놓|버)|오염(시|되)|물로[^.]{0,6}(씻|흘려)|헹궈|세척|미리 씻어/],
  ['concealment_without_staging', '손대지 않고 감추기', /그대로 (두|둔)|아무것도[^.]{0,8}(하지|건드리지|손대지)|모른 척|숨기고 (나|물러|있)|신고하지 (않|아니)|알리지 (않|아니)/],
];


// 이 칸은 수법 과용 판정에서 뺀다 — 옮겨서 풀 수 있는 단위가 아니다.
const METHOD_OVERUSE_EXEMPT = new Set(['위장·은폐 조작']);

const COVER_UP_OVERUSE_THRESHOLD = 0.08;
// 둘이 함께 쓰이는 짝. 낱개로는 흔해도 **짝이 굳으면** 그것이 틀이다.
const COVER_UP_PAIR_OVERUSE_THRESHOLD = 0.08;

function coverUpText(master: Master): string {
  const ft = master.full_truth as Record<string, unknown> | undefined;
  const pick = (k: string) => (typeof ft?.[k] === 'string' ? (ft[k] as string) : '');
  return `${pick('cover_up')} ${pick('method')}`;
}

function declaredOr(
  master: Master,
  field: string,
  table: Array<[string, string, RegExp]>,
): Set<string> {
  const ft = master.full_truth as Record<string, unknown> | undefined;
  const declared = ft?.[field];
  if (Array.isArray(declared) && declared.length > 0) {
    const out = new Set<string>();
    for (const key of declared) {
      if (typeof key !== 'string' || key === 'other') continue;
      const row = table.find(([id]) => id === key);
      out.add(row ? row[1] : key);
    }
    return out;
  }
  const text = coverUpText(master);
  const out = new Set<string>();
  for (const [, label, pattern] of table) {
    if (pattern.test(text)) out.add(label);
  }
  return out;
}

const coverUpTargets = (m: Master) =>
  declaredOr(m, 'cover_up_target', COVER_UP_TARGETS);
const coverUpMethods = (m: Master) =>
  declaredOr(m, 'cover_up_method', COVER_UP_METHODS);

function methodPairs(keys: Set<string>): Set<string> {
  const sorted = [...keys].sort();
  const out = new Set<string>();
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      out.add(`${sorted[i]} + ${sorted[j]}`);
    }
  }
  return out;
}

/**
 * 은폐를 두 축으로 센다 — 무엇을 감췄나(`cover_up_target`),
 * 어떻게 감췄나(`cover_up_method`), 그리고 **그 둘이 굳은 짝**.
 */
export function checkCoverUpOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const comparableCases = otherCases.filter((o) => o.caseId !== caseId);
  if (comparableCases.length === 0) return [];
  const otherT = comparableCases.map((o) => coverUpTargets(o.master));
  const otherM = comparableCases.map((o) => coverUpMethods(o.master));
  const mineM = coverUpMethods(master);
  return [
    ...ratioIssues(
      'COVER_UP_TARGET_OVERUSE',
      coverUpTargets(master),
      otherT,
      COVER_UP_OVERUSE_THRESHOLD,
      alreadyRegistered,
      (key, pct, m, t) =>
        `은폐가 감추려는 것이 "${key}"인데, 이미 코퍼스의 ${pct}%(${m}/${t}건)가 같은 것을 감춘다. 무엇을 감추느냐가 곧 플레이어가 무엇을 되찾아야 하는가이므로, 같으면 수사의 모양도 같아진다.`,
    ),
    ...ratioIssues(
      'COVER_UP_METHOD_OVERUSE',
      mineM,
      otherM,
      COVER_UP_OVERUSE_THRESHOLD,
      alreadyRegistered,
      (key, pct, m, t) =>
        `은폐 방식이 "${key}"인데, 이미 코퍼스의 ${pct}%(${m}/${t}건)가 같은 방식이다. 수법(어떻게 죽였나)을 바꾸는 것으로는 풀리지 않는다 — 감추는 손놀림 자체를 바꿀 것.`,
    ),
    ...ratioIssues(
      'COVER_UP_PAIR_OVERUSE',
      methodPairs(mineM),
      otherM.map(methodPairs),
      COVER_UP_PAIR_OVERUSE_THRESHOLD,
      alreadyRegistered,
      (key, pct, m, t) =>
        `은폐 방식 "${key}" 짝이 이미 코퍼스의 ${pct}%(${m}/${t}건)에 같이 나온다. 낱개로는 흔해도 **짝이 굳으면 그것이 틀이다** — 둘 중 하나를 다른 것으로 바꿀 것.`,
    ),
  ];
}

// 제목 틀 과용 — 「○가 삼킨 △」가 76건(24.3%)이다.
//
// CLAUDE.md 가 2026-09에 「제목 틀 25%」라고 적어 두고도 **아무도 세지 않던**
// 축이다. 과용 검사 아홉이 전부 사건의 **내용**을 보는데, 제목은 플레이어가
// 목록에서 **가장 먼저 보는 것**이라 겹치면 그 자리에서 티가 난다.
//
// 틀은 「조사 + 관형형 서술어」로 본다 — 명사는 ○로 가리고 조사는 격으로
// 묶는다(`이/가` → 주격). 그래야 「발효실이 삼킨 진실」과 「재단기가 삼킨
// 유언장」이 **한 틀**로 잡힌다. **서술어가 남지 않은 틀은 세지 않는다** —
// 「○ ○ ○」 같은 것은 낱말 수일 뿐이라 겹쳐도 아무 뜻이 없다.
//
// 임계가 비율이 아니라 **5건**인 것은(2026-09 사용자 결정) 제목이 내용 축과
// 다르기 때문이다. 수법이 8% 겹치는 것은 장르가 좁아서지만, 같은 제목 틀이
// 다섯 번 나오는 것은 **그냥 안 지은 것**이다.
const TITLE_TEMPLATE_VERB =
  /(삼킨|감춘|가린|덮은|지킨|지운|멈춘|멎은|잠근|막힌|끊긴|부른|놓친|사라진|새긴|새겨진|남은|남긴|잃은|깨진|묻힌|지워진|꺼진|식은|식던|잠긴|걸린|풀리던|끓어오르던|돌아온|빠진|무너진|터진|닫힌|열린|굳은|썩은|타버린|얼어붙은)$/;

const TITLE_PARTICLE_CLASSES: Array<[string[], string]> = [
  [['이', '가'], '주'],
  [['을', '를'], '목'],
  [['은', '는'], '보'],
  [['와', '과'], '접'],
  [['에서'], '처'],
  [['에'], '여'],
  [['의'], '관'],
];

const TITLE_TEMPLATE_LIMIT = 5;

/** 제목을 「조사 격 + 관형형 서술어」 틀로 바꾼다. 서술어가 없으면 null. */
function titleTemplate(master: Master): string | null {
  const title = master.case_identity?.title ?? '';
  if (!title.trim()) return null;
  let hasVerb = false;
  const parts = title
    .trim()
    .split(/\s+/)
    .map((word: string) => {
      for (const [particles, tag] of TITLE_PARTICLE_CLASSES) {
        for (const p of particles) {
          if (word.length > p.length + 1 && word.endsWith(p)) return `○${tag}`;
        }
      }
      if (TITLE_TEMPLATE_VERB.test(word)) {
        hasVerb = true;
        return word;
      }
      return '○';
    });
  return hasVerb ? parts.join(' ') : null;
}

// ─── 분류 코드가 실재하는 칸인가 ──────────────────────────────────────
//
// 여덟 축은 전부 **선언이 있으면 정규식을 건너뛴다.** 그래서 선언된 키가
// 어느 표에도 없으면 그 사건은 **어느 칸에도 안 세어진다** — 값이 없는 것보다
// 나쁘다. 없으면 정규식이라도 돌아 비슷한 칸에는 들어가는데, 오타 하나가
// 그 마지막 통로까지 닫는다.
//
// 실제로 그렇게 죽어 있었다. `method_archetypes` 에 enum 밖 값을 적은 사건이
// 소설화 루틴에서 붙어 있는 두 번호에서 연달아 나왔고(2026-09 쪽지
// `wizardly-hamilton-0uy23d`), 코퍼스를 세어 보니 `location_archetypes` 에도
// 하나 있었다 — CASE020 의 `food_production` 은 **향수 공방인데 식품 칸**이라
// 뜻까지 틀렸는데, 칸 자체가 없어서 아무 검사도 그 말을 못 했다.
//
// **등록 여부로 severity 를 가르지 않는다.** 다른 축의 비대칭은 「사건을 읽고
// 다시 써야 하는 부채」라 기존 건을 막으면 작업 흐름이 선다는 이유인데,
// 이것은 **한 글자 고치면 끝나는 오타**라 막는 편이 싸다.
//
// `other` 는 어느 축에서나 허용한다 — 「어느 칸에도 안 맞으면 `other` 로 적고
// docs/archetype-gaps.md 에 한 줄 남긴다」가 이 코퍼스의 규칙이다.
// 수법 축만 **옛 키를 같이 허용한다**(`LEGACY_METHOD_KEYS`·
// `LEGACY_METHOD_SPLIT`). 그것들은 오타가 아니라 옮겨 읽기로 살아 있는 값이다.
type ArchetypeAxis = {
  path: string;
  values: unknown;
  allowed: Set<string>;
};

function archetypeAxes(master: Master): ArchetypeAxis[] {
  const identity = (master.case_identity ?? {}) as Record<string, unknown>;
  const background = (identity.background ?? {}) as Record<string, unknown>;
  const truth = (master.full_truth ?? {}) as Record<string, unknown>;
  const keysOf = (rows: Array<[string, ...unknown[]]>) =>
    new Set<string>([...rows.map(([key]) => key), 'other']);

  return [
    {
      path: 'case_identity.location_archetypes',
      values: identity.location_archetypes,
      allowed: keysOf(LOCATION_ARCHETYPES),
    },
    {
      path: 'case_identity.background.background_archetypes',
      values: background.background_archetypes,
      allowed: keysOf(BACKGROUND_ARCHETYPES),
    },
    {
      path: 'case_identity.background.background_phrasing',
      values: background.background_phrasing,
      allowed: keysOf(BACKGROUND_PHRASING),
    },
    {
      path: 'case_identity.background.background_intensity',
      values: background.background_intensity,
      // 이 축만 `other` 가 없다 — 안 맞으면 필드를 비운다.
      allowed: new Set(BACKGROUND_INTENSITY_KEYS.map(([key]) => key)),
    },
    {
      path: 'full_truth.method_archetypes',
      values: truth.method_archetypes,
      allowed: new Set<string>([
        ...METHOD_ARCHETYPES.map(([key]) => key),
        ...Object.keys(LEGACY_METHOD_KEYS),
        ...Object.keys(LEGACY_METHOD_SPLIT),
        'other',
      ]),
    },
    {
      path: 'full_truth.motive_archetypes',
      values: truth.motive_archetypes,
      allowed: new Set<string>([...Object.keys(MOTIVE_ARCHETYPE_KEYS), 'other']),
    },
    {
      path: 'full_truth.cover_up_target',
      values: truth.cover_up_target,
      allowed: keysOf(COVER_UP_TARGETS),
    },
    {
      path: 'full_truth.cover_up_method',
      values: truth.cover_up_method,
      allowed: keysOf(COVER_UP_METHODS),
    },
  ];
}

export function checkArchetypeKeys(master: Master): Issue[] {
  const issues: Issue[] = [];
  for (const axis of archetypeAxes(master)) {
    if (axis.values === undefined || axis.values === null) continue;
    const list = Array.isArray(axis.values) ? axis.values : [axis.values];
    for (const value of list) {
      if (typeof value !== 'string') continue;
      if (axis.allowed.has(value)) continue;
      const near = [...axis.allowed]
        .filter((key) => key !== 'other')
        .filter(
          (key) =>
            key.includes(value) ||
            value.includes(key) ||
            key.split('_')[0] === value.split('_')[0],
        )
        .slice(0, 5);
      issues.push({
        severity: 'error',
        code: 'UNKNOWN_ARCHETYPE_KEY',
        message: `${axis.path} 에 "${value}" 가 있는데 그런 칸이 없다 — 선언이 있으면 폴백 정규식을 건너뛰므로, 이 사건은 이 축에서 **어느 칸에도 안 세어진다**(값이 없는 것보다 나쁘다). ${near.length ? `가까운 칸: ${near.join(', ')}. ` : ''}맞는 칸이 정말 없으면 "other" 로 적고 docs/archetype-gaps.md 에 한 줄 남긴다.`,
      });
    }
  }
  return issues;
}

/**
 * 같은 제목 틀이 코퍼스에 다섯 건 이상 있으면 낸다. 비율이 아니라 개수다 —
 * 같은 틀이 다섯 번 나오는 것은 장르가 좁아서가 아니라 그냥 안 지은 것이다.
 */
export function checkTitleTemplateOveruse(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const mine = titleTemplate(master);
  if (!mine) return [];
  const others = otherCases.filter((o) => o.caseId !== caseId);
  const matching = others.filter((o) => titleTemplate(o.master) === mine);
  if (matching.length < TITLE_TEMPLATE_LIMIT) return [];
  const sample = matching
    .slice(0, 3)
    .map((o) => o.master.case_identity?.title ?? o.caseId);
  return [
    {
      severity: overuseSeverity(alreadyRegistered),
      code: 'TITLE_TEMPLATE_OVERUSE',
      message: `제목이 "${mine}" 틀인데 코퍼스에 이미 ${matching.length}건 있다(${sample.join(' / ')} …). 제목은 플레이어가 목록에서 **가장 먼저 보는 것**이라 겹치면 그 자리에서 티가 난다 — 명사만 바꾸지 말고 문장 꼴을 바꿀 것.`,
    },
  ];
}

// 옆 번호와 뼈대가 같은가.
//
// 위의 세 과용 검사(동기·배경·수법)는 **코퍼스 비율**을 본다. 313건쯤 되면
// 한 건이 더 늘어도 비율이 거의 안 움직여, 바로 옆 번호와 판박이인 사건도
// "코퍼스에 흔한 계열" 한 줄로만 지나간다. CASE019와 CASE020이 그랬다 —
// 진범이 조직의 장, 피해자가 2인자, 전날 밤 매일 쓰는 물건에 약을 타고,
// 새벽에 사고처럼 꾸미고, 기계 기록이 그 시각을 잡고, 감사역이 하필 그날
// 아침에 와 있는 구조가 인물 배치와 진입 시각(06:10)까지 같은데 수법 계열
// 검사는 0건이었다.
//
// **번호가 곧 플레이 순서라** 이 중복은 코퍼스 어딘가의 중복과 무게가 다르다.
// 한 막(5편)을 연달아 푸는 사람은 같은 사건을 두 번 푼 것처럼 느낀다. 그래서
// 비율이 아니라 **이웃**을 본다 — 같은 막이거나 번호가 바로 붙어 있는 쌍만.
//
// 축 넷 중 셋이 겹치면 낸다. 하나둘이 겹치는 것은 흔하고(수법 계열은 여덟
// 가지뿐이다) 셋부터가 "같은 틀에 다른 소품"이다.
// **코퍼스에 거의 다 있는 자리는 세지 않는다.** 처음 돌렸을 때 17쌍이
// 나왔는데 열여섯이 오탐이었고, 원인이 후보 라벨 둘이었다 —
//   · 「우두머리」 = 그 무대의 장. 대표 169 · 총괄 51 · 원장 20 · 관장 17 ·
//     주인 14 · 센터장 12 · 회장 · 사장 · 공방장 → **313건 중 76.4%**
//   · 「2인자」 = 그 바로 밑. 팀장 85 · 수석 84 · 매니저 69 · 실장 27 ·
//     총무 27 → **72.2%**
// 넷 중 셋꼴로 있으니 그것이 두 사건에서 겹치는 것은 「이 사건에 대표가
// 있다」는 말과 다르지 않다. 둘을 빼자 17쌍 → 1쌍이 됐다.
// **그래서 이 둘은 아래 목록에 일부러 없다** — 숫자만 주석에 남기면 다음에
// 읽는 사람이 「우두머리가 뭔데」에서 걸리므로 직함을 같이 적어 둔다.
// 남겨 둔 칸은 전부 40% 이하라 겹치면 뜻이 있다.
//
// **넷에서 열둘로 늘렸다**(2026-09). 넷일 때 이 축은 **사실상 꺼져 있었다** —
// 라벨이 셋 이상 붙는 사건이 313건 중 15건(4.8%)뿐이라 양쪽 다 그 4.8%에
// 들어야 하는 규칙을 통과할 수가 없었고, 실제로 걸린 18쌍 중 1쌍에서만
// 켜졌다. `role` 에 적히는 말이 직함이라(담당 18% · 대표 8.2% · 수석 5.5%)
// 구조적 자리를 넷으로 읽기에는 칸이 모자랐다.
//
// **「최초 발견자」는 일부러 넣지 않았다.** `role` 에 150번(9.6%) 나와 가장
// 큰 미분류 덩어리로 보이지만, 사건 단위로 세면 **48.2%**다 — 거의 모든
// 사건에 발견자가 있으므로 그것이 겹치는 것은 「사건에 시신이 있다」는 말과
// 같다. 우두머리 72%를 뺀 것과 같은 이유로 뺀다.
const NEIGHBOR_ROLE_KEYWORDS: Array<[string, RegExp]> = [
  ['막내·보조', /막내|보조|인턴|수습|신입|조수/],
  ['제자·후계', /제자|도제|견습|후계|승계|차기|대를 잇|물려/],
  ['가족·측근', /아내|남편|아들|딸|조카|형수|매형|사위|며느리|손자|손녀|이모|삼촌|고모|동생|남매|부부/],
  ['외부 감사·심사', /감사역|감사|심사|검수|인증|품질관리|감정사|심사위원/],
  ['외부 방문자', /방문|거래처|후원|협력|경쟁|의뢰인|바이어|납품|외주/],
  ['파견·계약', /파견|계약직|외부 업체|하청|용역/],
  ['기록·점검 담당', /기록|점검|일지|대장|장부|검침|계측/],
  ['시설·정비', /시설|정비|설비|기사|보수|수리/],
  ['회계·총무', /회계|총무|경리|정산|재무/],
  ['단골·회원', /단골|회원|손님|고객|수강생|참가자/],
  ['야간·교대', /야간|당직|교대|심야/],
  ['보안·경비', /보안|경비|수위|순찰|경호/],
];

// 한 축이 「같다」고 말하려면 그 값이 코퍼스에서 드물어야 한다. 진입 시각
// 07:00은 313건 중 41건(13%)이라, 둘 다 07:00인 것은 우연히도 자주 생긴다.
const NEIGHBOR_COMMON_VALUE_RATIO = 0.08;
// 단계 이름이 이보다 희귀하면 **하나만 겹쳐도** 축으로 센다.
const NEIGHBOR_RARE_STAGE_RATIO = 0.02;

// **피해자도 배역의 한 자리다**(2026-09 사용자 지적). 피해자는 `characters`
// 가 아니라 `key_figures` 에 있어서 이 축이 한 번도 읽지 않고 있었다 — 다섯
// 자리 중 하나가 통째로 안 보이던 셈이다. 하필 이 검사를 만든 계기가
// CASE019↔020 의 「**진범이 조직의 장, 피해자가 2인자**」인데, 그 2인자가
// 바로 `key_figures` 쪽이라 정작 그 짝을 축으로는 볼 수 없었다. 313건 전부에
// `key_figures[].role` 이 있고, 같이 읽으면 38건(12.1%)에서 라벨이 는다.
function neighborRoleSet(master: Master): Set<string> {
  const cast = [
    ...((master.characters ?? []) as Array<{ role?: string }>),
    ...(((master as unknown as { key_figures?: Array<{ role?: string }> })
      .key_figures ?? []) as Array<{ role?: string }>),
  ];
  const text = cast.map((c) => c.role ?? '').join(' ');
  const set = new Set<string>();
  for (const [label, pattern] of NEIGHBOR_ROLE_KEYWORDS) {
    if (pattern.test(text)) set.add(label);
  }
  return set;
}

function neighborMethodSet(master: Master): Set<string> {
  return methodArchetypeLabels(master);
}

function caseNumber(caseId: string): number | null {
  const m = /^CASE(\d+)$/.exec(caseId);
  return m ? Number(m[1]) : null;
}

/** 같은 막(5편 묶음)이거나 번호가 바로 붙어 있으면 이웃으로 본다. */
function isNeighbor(a: number, b: number): boolean {
  if (a === b) return false;
  if (Math.abs(a - b) === 1) return true;
  return Math.floor((a - 1) / 5) === Math.floor((b - 1) / 5);
}


// 대립 단계가 굴러가는 이름들. `initial` 과 마무리 이름은 규칙이 정해 둔
// 자리라 세지 않는다 — 어느 사건이나 쓰므로 겹쳐도 아무 뜻이 없다.
const NEIGHBOR_COMMON_STAGE_NAMES = new Set([
  'initial',
  'full_confession',
  'final_break',
  'confession',
  'admits_all',
]);

// 코퍼스에서 흔한 이름은 세지 않는다 — 진입 시각과 같은 관문이다. 이름만
// 지워 두면 모자라서, `final_break` 55.9% · `admits_dispute` 17.3% ·
// `admits_reentry` 12.8% · `final_confession` 10.9%가 그대로 새어 들어온다.
// 그것이 겹치는 것은 「대립 단계가 있다」는 말과 같다. 8% 관문을 걸면 이웃
// 쌍이 137 → 44로 줄고, 남는 것은 `admits_log_falsified` 처럼 그 사건만의
// 이름이 둘 이상 겹치는 자리다.
function stageNameFrequency(
  cases: { caseId: string; master: Master }[],
  name: string,
): number {
  return cases.filter((o) => neighborStageSet(o.master).has(name)).length;
}

function neighborStageSet(master: Master): Set<string> {
  const out = new Set<string>();
  for (const stage of master.contradiction_stages ?? []) {
    for (const key of [stage.from_stage, stage.to_stage]) {
      if (typeof key !== 'string') continue;
      const k = key.trim();
      if (!k || NEIGHBOR_COMMON_STAGE_NAMES.has(k)) continue;
      out.add(k);
    }
  }
  return out;
}

export function checkNeighborTwin(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const self = caseNumber(caseId);
  if (self === null) return [];
  const myMethods = neighborMethodSet(master);
  const myRoles = neighborRoleSet(master);
  const myMotives = motiveArchetypeLabels(master);
  const myStages = neighborStageSet(master);
  const myEntry = master.opening_scene?.detective_entry_time ?? '';
  const issues: Issue[] = [];

  for (const other of otherCases) {
    const n = caseNumber(other.caseId);
    if (n === null || !isNeighbor(self, n)) continue;
    // 한 쌍을 두 번 내지 않는다 — 작은 번호 쪽에서만 낸다.
    if (n < self) continue;

    const shared: string[] = [];
    const methods = [...myMethods].filter((x) =>
      neighborMethodSet(other.master).has(x),
    );
    if (methods.length > 0) shared.push(`수법 계열(${methods.join(', ')})`);
    const motives = [...myMotives].filter((x) =>
      motiveArchetypeLabels(other.master).has(x),
    );
    if (motives.length > 0) shared.push(`동기 계열(${motives.join(', ')})`);
    const otherEntry = other.master.opening_scene?.detective_entry_time ?? '';
    if (myEntry && myEntry === otherEntry) {
      const sameEntry = otherCases.filter(
        (o) => (o.master.opening_scene?.detective_entry_time ?? '') === myEntry,
      ).length;
      if (sameEntry / otherCases.length < NEIGHBOR_COMMON_VALUE_RATIO) {
        shared.push(`진입 시각(${myEntry})`);
      }
    }
    // **단계 사슬의 이름이 같은가**(2026-09, 소설화 루틴 제안).
    // CASE031·032가 `admits_log_falsified` · `admits_touched_safety_gear` 둘을
    // **글자까지 같이** 쓴다 — 무대도 수법도 다른데 **자백이 풀려 나가는 순서가
    // 같으면 두 번째 사건은 첫 번째의 되풀이로 읽힌다.** 이 축을 넣으면
    // 031·032가 걸리고 034·035는 안 걸린다(034는 `after_visit_admission→…`,
    // 035는 세 단계다). `initial`·`full_confession` 처럼 규칙이 정해 둔 이름과
    // 어느 사건이나 쓰는 흔한 이름은 세지 않는다 — 그것이 겹치는 것은
    // 「대립 단계가 있다」는 말과 같다.
    const otherStages = neighborStageSet(other.master);
    const sharedStages = [...myStages].filter((x) => otherStages.has(x));
    const stageHit = sharedStages.filter(
      (x) =>
        stageNameFrequency(otherCases, x) / otherCases.length <
        NEIGHBOR_COMMON_VALUE_RATIO,
    );
    // **아주 희귀한 이름은 하나로도 센다.** CASE037·038·039가 그 자리다 —
    // 셋 다 `after_<장소>_admission → after_errand_admission → final_break`
    // 세 칸이고, 가운데 이름이 코퍼스에 **5건(1.6%)**뿐인데 둘 개수를
    // 요구하는 규칙에 걸려 셋 다 빠져나갔다(앞뒤는 장소 이름이 달라서 다르고
    // `final_break`는 55.9%라 제외된다). 그런데 그 이름은 **같은 트릭의
    // 이름이다** — 누군가를 심부름 보내 현장을 비우고 갇힌 사람이 구조받지
    // 못하게 한다. 실제로 셋 다 `delayed_rescue`(구호 지연)를 같이 선언했고,
    // 그 수법을 선언한 여섯 건 중 셋이 이 셋이다. 2% 미만이면 우연히 같은
    // 이름을 고를 일이 아니므로 하나로도 축을 센다(이웃 쌍 33개가 는다).
    const veryRareHit = sharedStages.filter(
      (x) =>
        stageNameFrequency(otherCases, x) / otherCases.length <
        NEIGHBOR_RARE_STAGE_RATIO,
    );
    if (stageHit.length >= 2 || veryRareHit.length >= 1) {
      shared.push(`단계 이름(${(stageHit.length >= 2 ? stageHit : veryRareHit).join('·')})`);
    }
    const otherRoles = neighborRoleSet(other.master);
    const roleHit = [...myRoles].filter((x) => otherRoles.has(x));
    // **자카드 비율 관문을 뺐다**(2026-09). 칸을 넷에서 열둘로 늘리면서
    // 같이 봤더니, 비율 관문이 **칸을 늘린 이득을 그대로 먹고 있었다** —
    // 라벨이 늘면 합집합이 같이 커져 「75% 이상 겹쳐라」가 오히려 더 어려워
    // 진다. 셋 이상 붙는 사건이 4.8% → 49.8%로 열 배가 됐는데 이웃 쌍에서
    // 축이 켜지는 비율은 1.6% → 1.6%로 그대로였다. 관문을 빼면 5.6%다.
    // 「작은 쪽 기준 비율」로 바꿔도 38 → 37쌍이라 거의 같아서, 가장 단순한
    // 쪽을 골랐다 — **열두 칸 중 셋이 겹치면 같은 자리로 짠 배역이다.**
    if (roleHit.length >= 3) {
      shared.push(`인물 배치(${roleHit.join('·')})`);
    }
    if (shared.length < 3) continue;

    issues.push({
      severity: overuseSeverity(alreadyRegistered),
      code: 'NEIGHBOR_TWIN',
      message: `${other.caseId}와 뼈대가 겹친다 — ${shared.join(' / ')}. 번호가 곧 플레이 순서라(같은 막이거나 바로 붙은 번호) 연달아 푸는 사람은 같은 사건을 두 번 푼 것처럼 느낀다. 코퍼스 비율을 보는 과용 검사들은 이 중복을 못 잡는다. 둘 중 하나의 뼈대를 옮기거나 번호를 떨어뜨릴 것.`,
    });
  }
  return issues;
}

// 번호 **구간**이 한 틀인가.
//
// `NEIGHBOR_TWIN`은 이웃 쌍(같은 막·붙은 번호)만 보고, 축이 「같다」고
// 말하려면 그 값이 코퍼스에서 드물어야 한다(8% 관문). 그 둘이 합쳐지면
// **구간 전체가 한 틀로 찍혀 나온 것**을 구조적으로 못 본다 — 코퍼스에
// 그게 있다(2026-09, 054~062 소설화 회차가 실측):
//
//   initial → admits_dispute → admits_reentry → final_break   39건, CASE061~110에 100%
//   initial → admits_early_presence → admits_manipulation → full_confession   6건, 013~022
//   initial → after_presence_admission → after_motive_admission → final_break   4건, 173~176
//
// 39건 덩어리에서 단계 이름 축으로 **한 쌍도 안 걸린다** — `admits_dispute`
// 17.3% · `admits_reentry` 12.8%라 희귀도 관문에 막히는데, **그 이름이 흔해진
// 이유가 바로 그 덩어리다.** 뼈대가 대량 복제되면 그 뼈대의 값이 곧 「흔한
// 값」이 되어 복제가 심할수록 검사기가 조용해진다. 희귀도 관문 자체는 옳다
// (없으면 `final_break` 55.9%가 다 걸린다) — 덩어리 복제에만 정확히 반대로
// 작동한다. 그래서 축을 더 넣는 것으로는 안 풀리고, **희귀도를 안 쓰고
// 「가까운 번호에 같은 골격이 몇 건 몰려 있나」를 직접 센다.**
//
// 골격 셋을 본다. 셋 다 마스터에 이미 있는 값이라 계열 선언이나 정규식에
// 기대지 않는다:
//   · 단계 사슬 — `target_character`별 `from_stage → to_stage → …` 전체.
//     이름 하나가 아니라 사슬이라 `initial`·`final_break` 같은 흔한 이름을
//     빼지 않아도 된다(사슬 전체가 같아야 한다).
//   · 진입 시각 — `detective_entry_time` 그대로. 「사건 당일 07:00」은 코퍼스
//     13%라 이웃 검사에서는 빠지는데, 41건 중 35건이 060~111에 있다.
//   · 타임라인 시각 골격 — `actual_timeline[].time`에서 `HH:MM`만 순서대로
//     이은 것(다섯 개 이상일 때만). 8kkrnr이 제안한 다섯 번째 축을 이 자리에
//     둔다 — 이웃 쌍의 축이 아니라 구간의 골격으로. 순서까지 같은 것이
//     064·069·070·072 넷이다.
//
// 판정: 내 번호 ±`RANGE_WINDOW` 안의 다른 사건 m건 중 같은 골격이 k건일 때,
// k ≥ `RANGE_MIN_OTHERS`, k/m ≥ `RANGE_MIN_DENSITY`, 그리고 k/m이 코퍼스
// 전체 비율의 `RANGE_OVER_GLOBAL`배 이상. 마지막 관문이 「어디서나 고르게
// 흔한 값」을 거른다 — 그건 구간이 아니라 과용이고 다른 검사의 몫이다.
// 실측(313건): 단계 사슬 49건·3종, 진입 시각 43건·3종, 타임라인 4건·1종이고
// 셋 다 위 덩어리 그대로라 오탐이 없다.
//
// **이름만 바꾸면 검사만 조용해진다.** 단계 키는 상태 키라 `hidden_until`도
// 카드도 물지 않으므로 글자를 갈아 끼우는 것은 공짜인데, 그러면 틀은 그대로
// 남는다(`audit:duplication`이 문장을 보므로 문장을 다시 쓰면 0건이 되는데
// 사슬은 남는 것과 같다). 걸리면 자백이 풀리는 **순서 자체**를 다르게 짜거나,
// 진입 시각·타임라인을 그 사건의 실제 사정에 맞춰 옮길 것.
const RANGE_WINDOW = 10; // 내 번호 ± 이만큼을 「구간」으로 본다
const RANGE_MIN_OTHERS = 3; // 나 말고 이만큼은 있어야 덩어리다(나까지 넷)
const RANGE_MIN_DENSITY = 0.15; // 구간 안 비율
const RANGE_OVER_GLOBAL = 2; // 구간 비율이 코퍼스 비율의 몇 배여야 하나

function rangeStageChains(master: Master): string[] {
  const byTarget = new Map<string, string[]>();
  for (const stage of master.contradiction_stages ?? []) {
    const target = String(
      (stage as { target_character?: string }).target_character ?? '?',
    );
    if (!byTarget.has(target)) byTarget.set(target, []);
    const chain = byTarget.get(target)!;
    if (chain.length === 0) chain.push(String(stage.from_stage ?? ''));
    chain.push(String(stage.to_stage ?? ''));
  }
  return [...byTarget.values()]
    .filter((chain) => chain.length >= 3)
    .map((chain) => chain.join(' → '));
}

function rangeTimelineSkeleton(master: Master): string[] {
  const times = ((master as unknown as { actual_timeline?: Array<{ time?: unknown }> })
    .actual_timeline ?? [])
    .map((t) => (typeof t.time === 'string' ? /\d{1,2}:\d{2}/.exec(t.time)?.[0] ?? '' : ''))
    .filter(Boolean);
  return times.length >= 5 ? [times.join(' ')] : [];
}

const RANGE_AXES: Array<[string, (master: Master) => string[]]> = [
  ['단계 사슬', rangeStageChains],
  [
    '진입 시각',
    (m) => [String(m.opening_scene?.detective_entry_time ?? '').trim()].filter(Boolean),
  ],
  ['타임라인 시각 골격', rangeTimelineSkeleton],
];

export function checkRangeTwin(
  caseId: string,
  master: Master,
  otherCases: { caseId: string; master: Master }[],
  alreadyRegistered = false,
): Issue[] {
  const self = caseNumber(caseId);
  if (self === null) return [];
  const others = otherCases
    .map((o) => ({ ...o, n: caseNumber(o.caseId) }))
    .filter((o): o is { caseId: string; master: Master; n: number } =>
      o.n !== null && o.caseId !== caseId,
    );
  if (others.length === 0) return [];
  const window = others.filter((o) => Math.abs(o.n - self) <= RANGE_WINDOW);
  const issues: Issue[] = [];

  for (const [axis, extract] of RANGE_AXES) {
    for (const sig of extract(master)) {
      const sameInWindow = window.filter((o) => extract(o.master).includes(sig));
      if (sameInWindow.length < RANGE_MIN_OTHERS || window.length === 0) continue;
      const density = sameInWindow.length / window.length;
      if (density < RANGE_MIN_DENSITY) continue;
      const sameAll = others.filter((o) => extract(o.master).includes(sig)).length;
      const global = sameAll / others.length;
      if (density < RANGE_OVER_GLOBAL * global) continue;
      const nums = sameInWindow
        .map((o) => o.n)
        .sort((a, b) => a - b)
        .map((n) => `CASE${String(n).padStart(3, '0')}`);
      issues.push({
        severity: overuseSeverity(alreadyRegistered),
        code: 'RANGE_TWIN',
        message: `${axis}이 번호 구간에 몰려 있다 — 「${sig}」을 ±${RANGE_WINDOW} 안에서 ${sameInWindow.length}건이 같이 쓴다(${nums.join('·')}; 구간 ${Math.round(density * 100)}%, 코퍼스 ${Math.round(global * 100)}%). 한 생성 회차가 같은 틀을 돌려 쓴 자국이고, NEIGHBOR_TWIN은 이 값이 흔하다는 이유로 못 잡는다 — 흔해진 이유가 바로 이 덩어리다. 이름만 바꾸지 말고 ${axis === '단계 사슬' ? '자백이 풀리는 순서 자체를 다르게 짤 것' : '그 사건의 실제 사정에 맞춰 시각을 옮길 것'}.`,
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
  // 이미 registry에 올라간 사건이면 warn으로 낮춘다 — overuseSeverity 주석 참고.
  // 코퍼스 비교와 무관한 검사도 이 값을 쓰므로 블록 밖에서 구한다.
  let alreadyRegistered = false;
  try {
    const registry = JSON.parse(
      fs.readFileSync(nodePath.join('data', 'case_registry.json'), 'utf-8'),
    );
    alreadyRegistered = Object.prototype.hasOwnProperty.call(
      registry.cases ?? {},
      caseId,
    );
  } catch {
    // registry를 못 읽으면 새 사건으로 보고 막는 쪽이 안전하다
  }
  const issues = validateMaster(master, alreadyRegistered);

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
  issues.push(...checkDuplicateClaimFact(master, alreadyRegistered));

  if (otherCases.length > 0) {
    issues.push(...checkCorpusDuplication(caseId, master, otherCases));
    issues.push(
      ...checkMotiveArchetypeOveruse(
        caseId,
        master,
        otherCases,
        alreadyRegistered,
      ),
    );
    issues.push(
      ...checkMethodArchetypeOveruse(
        caseId,
        master,
        otherCases,
        alreadyRegistered,
      ),
    );
    issues.push(
      ...checkLocationArchetypeOveruse(
        caseId,
        master,
        otherCases,
        alreadyRegistered,
      ),
    );
    issues.push(
      ...checkBackgroundOveruse(caseId, master, otherCases, alreadyRegistered),
    );
    issues.push(
      ...checkCoverUpOveruse(caseId, master, otherCases, alreadyRegistered),
    );
    issues.push(
      ...checkTitleTemplateOveruse(caseId, master, otherCases, alreadyRegistered),
    );
    issues.push(...checkBackgroundIntensity(caseId, master, alreadyRegistered));
    issues.push(...checkArchetypeKeys(master));
    issues.push(
      ...checkNeighborTwin(caseId, master, otherCases, alreadyRegistered),
    );
    issues.push(
      ...checkRangeTwin(caseId, master, otherCases, alreadyRegistered),
    );
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
