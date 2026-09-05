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
  severity: "error" | "warn";
  code: string;
  message: string;
}

function collectIds(master: Master) {
  const locationIds = new Set<string>(master.locations.map((l: any) => l.id));
  const characterIds = new Set<string>(master.characters.map((c: any) => c.id));
  const keyFigureIds = new Set<string>((master.key_figures ?? []).map((k: any) => k.id));
  const timelineIds = new Set<string>(master.actual_timeline.map((t: any) => t.id));
  const evidenceIds = new Set<string>(master.evidence.map((e: any) => e.id));
  const contradictionIds = new Set<string>(master.contradiction_stages.map((c: any) => c.id));

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
      if (id.startsWith("F-")) factIds.add(id);
      else if (id.startsWith("S-")) claimIds.add(id);
    }
  }

  return { locationIds, characterIds, keyFigureIds, timelineIds, evidenceIds, contradictionIds, factIds, claimIds };
}

/** fact/claim/evidence/contradiction-stage ID 중 하나로 실제 정의되어 있는지 확인 */
function resolveReference(id: string, ids: ReturnType<typeof collectIds>): boolean {
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
          severity: "error",
          code: "HIDDEN_UNTIL_SINGLE_STEP",
          message: `${ch.id}: ${h.fact_or_claim_id} 의 release_prerequisite(${h.release_prerequisite})와 release_trigger가 동일해 1단계 해금이 됨.`,
        });
      }
      if (!resolveReference(h.release_prerequisite, ids) && !ids.contradictionIds.has(h.release_prerequisite)) {
        issues.push({
          severity: "error",
          code: "UNDEFINED_REFERENCE",
          message: `${ch.id}: hidden_until.release_prerequisite(${h.release_prerequisite})가 문서 어디에도 정의돼 있지 않음.`,
        });
      }
      if (!resolveReference(h.release_trigger, ids)) {
        issues.push({
          severity: "error",
          code: "UNDEFINED_REFERENCE",
          message: `${ch.id}: hidden_until.release_trigger(${h.release_trigger})가 문서 어디에도 정의돼 있지 않음.`,
        });
      }
      if (!resolveReference(h.fact_or_claim_id, ids)) {
        issues.push({
          severity: "error",
          code: "UNDEFINED_REFERENCE",
          message: `${ch.id}: hidden_until.fact_or_claim_id(${h.fact_or_claim_id})가 knows/initial_claims 어디에도 정의돼 있지 않음. (S-/F- 접두어 오타 여부를 확인)`,
        });
      }
    }
  }

  // 2. CONTRADICTION_STAGES: 최소 3단계, 단계마다 증거 조합이 달라야 함
  if (master.contradiction_stages.length < 3) {
    issues.push({
      severity: "error",
      code: "CONTRADICTION_STAGES_TOO_FEW",
      message: `CONTRADICTION_STAGES가 ${master.contradiction_stages.length}단계뿐임 (최소 3단계 필요).`,
    });
  }
  const seenEvidenceCombos = new Map<string, string>();
  for (const c of master.contradiction_stages) {
    const combo = [...c.requires_presented_evidence_ids].sort().join(",");
    if (seenEvidenceCombos.has(combo)) {
      issues.push({
        severity: "error",
        code: "CONTRADICTION_STAGES_DUPLICATE_EVIDENCE",
        message: `${c.id}와 ${seenEvidenceCombos.get(combo)}가 완전히 같은 증거 조합(${combo})을 요구함.`,
      });
    } else {
      seenEvidenceCombos.set(combo, c.id);
    }
    // 단계가 참조하는 evidence/claim id가 실제로 존재하는지
    for (const eid of c.requires_presented_evidence_ids) {
      if (!ids.evidenceIds.has(eid)) {
        issues.push({ severity: "error", code: "UNDEFINED_REFERENCE", message: `${c.id}: 존재하지 않는 증거 ${eid} 참조.` });
      }
    }
    if (!resolveReference(c.release.claim_or_fact_id, ids)) {
      issues.push({
        severity: "error",
        code: "UNDEFINED_REFERENCE",
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
      issues.push({ severity: "error", code: "EVIDENCE_BAD_LOCATION", message: `${ev.id}: found_at(${ev.found_at})이 존재하지 않는 장소.` });
      continue;
    }
    if (ev.source_type === "location") {
      const matchingRule = (loc.detail_rules ?? []).find((r: any) => r.action === ev.discovery_condition);
      if (!matchingRule) {
        issues.push({
          severity: "error",
          code: "EVIDENCE_CONDITION_MISMATCH",
          message: `${ev.id}: discovery_condition("${ev.discovery_condition}")이 ${ev.found_at}의 detail_rules 어떤 action과도 문자 그대로 일치하지 않음. 런타임 조회가 실패할 것.`,
        });
      } else if (matchingRule.release_evidence_id !== ev.id) {
        issues.push({
          severity: "error",
          code: "EVIDENCE_LOCATION_CROSSWIRED",
          message: `${loc.id}의 detail_rule("${matchingRule.action}")은 ${matchingRule.release_evidence_id}를 내주는데 ${ev.id}가 같은 문구를 discovery_condition으로 쓰고 있음(서로 다른 증거인데 문구가 겹침).`,
        });
      }
    } else if (ev.source_type === "testimony") {
      // testimony 증거는 location detail_rule과 매칭될 필요가 없다. 대신 어딘가에서 실제로 소비되는지만 확인.
      const usedInStage = master.contradiction_stages.some((c: any) => c.requires_presented_evidence_ids?.includes(ev.id));
      if (!usedInStage) {
        issues.push({
          severity: "warn",
          code: "TESTIMONY_EVIDENCE_UNUSED",
          message: `${ev.id}(testimony)가 어떤 CONTRADICTION_STAGES에서도 요구되지 않음 — 죽은 증거일 수 있음.`,
        });
      }
    }
  }

  // 4. 모든 location.detail_rules가 실제 evidence로 이어지는지 (죽은 조사 경로 방지)
  for (const loc of master.locations) {
    for (const rule of loc.detail_rules ?? []) {
      if (!ids.evidenceIds.has(rule.release_evidence_id)) {
        issues.push({
          severity: "error",
          code: "DEAD_DETAIL_RULE",
          message: `${loc.id}의 detail_rule("${rule.action}")이 존재하지 않는 증거 ${rule.release_evidence_id}를 가리킴.`,
        });
      }
    }
  }

  // 5. ACTUAL_TIMELINE 원자성 휴리스틱 (접속어 + 서술어 패턴)
  const atomicityPattern = /(하고|한\s?뒤|한\s?후|하며|하고서)\s*\S+(하다|한다|했다|했습니다|합니다)/;
  for (const t of master.actual_timeline) {
    if (atomicityPattern.test(t.actual_action)) {
      issues.push({
        severity: "warn",
        code: "TIMELINE_ATOMICITY_SUSPECT",
        message: `${t.id}: "${t.actual_action}" — 두 행동이 접속어로 이어붙었을 가능성 (수동 확인 요망).`,
      });
    }
    if (!ids.locationIds.has(t.location)) {
      issues.push({ severity: "error", code: "TIMELINE_BAD_LOCATION", message: `${t.id}: location(${t.location})이 존재하지 않는 장소.` });
    }
    for (const actor of t.actors) {
      if (!ids.characterIds.has(actor) && !ids.keyFigureIds.has(actor)) {
        issues.push({
          severity: "error",
          code: "TIMELINE_UNDEFINED_ACTOR",
          message: `${t.id}: actor(${actor})가 CHARACTERS에도 key_figures에도 정의돼 있지 않음.`,
        });
      }
    }
  }

  // 6. opening_scene / ending_scene의 location_id 유효성
  if (!ids.locationIds.has(master.opening_scene.location_id)) {
    issues.push({
      severity: "error",
      code: "OPENING_BAD_LOCATION",
      message: `opening_scene.location_id(${master.opening_scene.location_id})가 존재하지 않는 장소.`,
    });
  }
  if (!ids.locationIds.has(master.ending_scene.location_id)) {
    issues.push({
      severity: "error",
      code: "ENDING_BAD_LOCATION",
      message: `ending_scene.location_id(${master.ending_scene.location_id})가 존재하지 않는 장소.`,
    });
  }

  // 7. RED_HERRINGS 중 최소 하나는 lingering_thread를 채워야 엔딩에 여운을 남길 수 있다.
  const hasLingering = (master.red_herrings ?? []).some((r: any) => (r.lingering_thread ?? "").trim().length > 0);
  if (!hasLingering) {
    issues.push({
      severity: "warn",
      code: "NO_LINGERING_THREAD",
      message: `모든 RED_HERRINGS의 lingering_thread가 비어 있음 — 엔딩에 남길 여운이 없어 결말이 지나치게 깔끔하게 끝날 수 있음.`,
    });
  }

  // 8. FULL_TRUTH.responsible_character_id / CASE_COMPLETE.accusation_requirements.suspect 일치
  if (master.full_truth.responsible_character_id !== master.case_complete.accusation_requirements.suspect) {
    issues.push({
      severity: "error",
      code: "SUSPECT_MISMATCH",
      message: `FULL_TRUTH의 책임자(${master.full_truth.responsible_character_id})와 CASE_COMPLETE의 suspect(${master.case_complete.accusation_requirements.suspect})가 다름.`,
    });
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
    initial_status: "not_interviewed",
  }));

  const locations = master.locations.map((l: any) => ({
    id: l.id,
    name: l.name,
    description: l.base_description,
  }));

  const cards = master.evidence.map((e: any) => ({
    id: e.id,
    title: e.name,
    category: "evidence",
    source: e.found_at,
    condition: e.discovery_condition,
    summary: e.content,
  }));

  return { npcs, locations, cards };
}

// ---- CLI 실행부 (npx tsx validate_master.ts CASE171_structured_example.json) ----
// package.json에 "type": "module"이 설정돼 있어 .ts가 ESM으로 로드되므로
// require.main 대신 import.meta.url로 엔트리포인트 여부를 판별한다.
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("node:fs");
  const path = process.argv[2];
  if (!path) {
    console.error("사용법: npx tsx validate_master.ts <master.json>");
    process.exit(1);
  }
  const master = JSON.parse(fs.readFileSync(path, "utf-8"));
  const issues = validateMaster(master);

  const errors = issues.filter((i) => i.severity === "error");
  const warns = issues.filter((i) => i.severity === "warn");

  console.log(`\n=== ${path} ===`);
  console.log(`errors: ${errors.length}, warnings: ${warns.length}\n`);
  for (const i of [...errors, ...warns]) {
    console.log(`[${i.severity.toUpperCase()}] ${i.code}: ${i.message}`);
  }

  if (errors.length === 0) {
    console.log("\n구조/교차참조 검증 통과. 아래는 코드로 파생한 npcs/locations/cards:\n");
    console.log(JSON.stringify(deriveEngineViews(master), null, 2));
  }

  process.exit(errors.length > 0 ? 1 : 0);
}
