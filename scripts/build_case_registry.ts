/**
 * build_case_registry.ts
 *
 * data/pending-cases/ 와 data/cases/ 아래 모든 사건 JSON을 훑어서 case_registry.json을 만든다.
 * 신규 스키마(case_master.schema.json 형식), 예전 envelope 형식(master.raw_text)과
 * data/cases/*.json.json의 레거시 bundled 형식(top-level npcs + master.raw_text) 셋 다 처리한다.
 * detective_entry_type이 없는 예전 사건은 "unknown"으로 남긴다 — 나중에 채울 수 있다.
 *
 * 실행: npx tsx build_case_registry.ts
 * (프로젝트 루트, 즉 data/ 폴더가 보이는 위치에서 실행)
 */

import fs from "fs";
import path from "path";

const SOURCE_DIRS = [
  path.join(process.cwd(), "data", "pending-cases"),
  // data/cases/*/case.json은 구조화 스키마가 생기기 전의 레거시 bundled
  // 포맷이다 (case_identity/characters[] 없음, top-level npcs[] +
  // master.raw_text 브래킷 프리텍스트). app/game.ts가 두 디렉터리를
  // 모두 훑어 하나의 실행 목록으로 합치므로, 레지스트리도 완전하려면
  // 여기도 같이 봐야 한다.
  path.join(process.cwd(), "data", "cases"),
];
const OUTPUT_PATH = path.join(process.cwd(), "data", "case_registry.json");

interface RegistryEntry {
  case_id: string;
  title: string;
  genre: string;
  setting_keywords: string;
  // case_master.schema.json's case_identity field is "detective_entry" (a
  // full prose sentence describing how the detective walks into the case),
  // not "detective_entry_type" — there is no short categorical field in the
  // schema at all. The original script read case_identity.detective_entry_type,
  // which never exists on any master (old or new), so this column silently
  // came out "unknown" for every single case, not just the old-format ones
  // it was meant to flag. Kept the output key name as detective_entry_type
  // for whatever downstream routine consumes this file, but it now holds
  // the actual prose sentence — bucket/categorize it downstream if a short
  // label is what's actually needed.
  detective_entry_type: string;
  character_names: string[];
  source_file: string;
}

/** 신규 스키마든 예전 envelope든 상관없이 "실제 마스터 내용"을 하나로 통일해서 반환 */
function extractMaster(raw: any): any {
  // 신규 스키마: 최상위가 곧 master (case_identity가 최상위에 있음)
  if (raw?.case_identity) return raw;

  // envelope 형식: raw.master 안에 있음
  if (raw?.master?.case_identity) return raw.master;

  // 가장 예전 형식: raw.master.raw_text (구조화 안 된 프리텍스트) — case_id만 최소한으로 회수
  if (typeof raw?.master?.raw_text === "string") {
    const text = raw.master.raw_text as string;
    const caseIdMatch = text.match(/CASE\d{3}/);
    // data/cases/*/case.json 레거시 포맷은 인물명을 raw_text 안이 아니라
    // top-level npcs[]에 이미 구조화된 형태로 들고 있다 — 있으면 그걸 쓴다.
    const characterNames: string[] = Array.isArray(raw?.npcs)
      ? raw.npcs.map((n: any) => n?.name).filter(Boolean)
      : [];
    return {
      case_identity: {
        case_id: raw.case_id || (caseIdMatch ? caseIdMatch[0] : "UNKNOWN"),
        title: raw.title || "",
        genre: "",
        setting: "",
        detective_entry_type: "unknown",
      },
      characters: characterNames.map((name) => ({ name })),
      _raw_text_only: true,
    };
  }

  return null;
}

function findCaseFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findCaseFiles(fullPath));
    } else if (entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

function buildRegistry() {
  const files = SOURCE_DIRS.flatMap((dir) => findCaseFiles(dir));
  if (files.length === 0) {
    console.error(
      `파일을 못 찾음: ${SOURCE_DIRS.join(", ")} 경로를 확인하세요.`,
    );
    process.exit(1);
  }

  const registry: RegistryEntry[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    // data/cases/index.json은 사건 소스가 아니라 요약문/해시태그만
    // 덮어쓰는 선택적 메타데이터라 case_identity가 없다 — 건너뛴다.
    if (path.basename(file) === "index.json") continue;

    let raw: any;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch (e) {
      warnings.push(`${file}: JSON 파싱 실패 (${(e as Error).message})`);
      continue;
    }

    const master = extractMaster(raw);
    if (!master) {
      warnings.push(`${file}: case_identity를 못 찾음 — 형식을 수동으로 확인 필요`);
      continue;
    }

    const caseId: string = master.case_identity?.case_id || "UNKNOWN";
    const characterNames: string[] = Array.isArray(master.characters)
      ? master.characters.map((c: any) => c.name).filter(Boolean)
      : [];

    if (master._raw_text_only) {
      const hasNames = characterNames.length > 0;
      warnings.push(
        `${file}: 구형 raw_text 사건 — genre/setting/detective_entry_type 자동 추출 불가` +
          (hasNames ? "" : ", 인물명도 추출 불가") +
          ", 수동 보완 필요",
      );
    }

    registry.push({
      case_id: caseId,
      title: master.case_identity?.title || "",
      genre: master.case_identity?.genre || "",
      setting_keywords: master.case_identity?.setting || "",
      detective_entry_type: master.case_identity?.detective_entry || "unknown",
      character_names: characterNames,
      source_file: path.relative(process.cwd(), file),
    });
  }

  // case_id 기준 정렬 (CASE001, CASE002, ... 순서로)
  registry.sort((a, b) => a.case_id.localeCompare(b.case_id));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2), "utf-8");

  console.log(`\n총 ${files.length}개 파일 중 ${registry.length}개 등록 완료 → ${OUTPUT_PATH}\n`);

  const allNames = registry.flatMap((r) => r.character_names);
  const duplicateNames = allNames.filter((name, i) => allNames.indexOf(name) !== i);
  if (duplicateNames.length > 0) {
    console.log(`중복된 인물명 발견: ${[...new Set(duplicateNames)].join(", ")}`);
  }

  const recentEntryTypes = registry.slice(-3).map((r) => r.detective_entry_type);
  console.log(`최근 3건의 detective_entry_type: ${recentEntryTypes.join(", ")}`);

  if (warnings.length > 0) {
    console.log(`\n경고 ${warnings.length}건:`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

buildRegistry();
