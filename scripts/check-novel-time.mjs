#!/usr/bin/env node
// 소설(docs/novels/*.md)의 시간 흐름을 마스터와 대조해 검사한다.
//
// 왜 필요한가: 소설은 마스터의 시각을 산문으로 옮기면서 새 시각을 지어내거나
// 장 순서를 바꾸다 흐름을 뒤집기 쉽다. 게임은 `actual_timeline`이 순서를 쥐고
// 있지만 산문에는 그걸 붙잡는 것이 아무것도 없다.
//
// 핵심 전제 둘:
//   1) **서술문의 시각은 앞으로만 간다.** 소설은 수사를 시간순으로 따라가므로
//      지문에 찍힌 시각은 단조증가해야 한다.
//   2) **대사 안의 시각은 과거다.** 인물이 말하는 시각은 회상·증언이라 역행이
//      정상이다. 대신 그 시각은 전부 마스터에 있어야 한다 — 없으면 지어낸 것이다.
// 그래서 따옴표 안팎을 갈라서 본다.
//
// 사용:
//   node scripts/check-novel-time.mjs                 (docs/novels 전체)
//   node scripts/check-novel-time.mjs docs/novels/CASE001.md
//   npm run check:novel

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const NOVEL_DIR = "docs/novels";
const CASE_DIR = "data/pending-cases";

/* ── 시각 파싱 ─────────────────────────────────────────────── */

// 고유어 시각 표기. CLAUDE.md: 시각은 아라비아 숫자로 쓴다.
// `시간`(경과)·`시절`은 물론 `던져 두시니까`(동사 어미)도 걸리면 안 되므로,
// 뒤에 시각다운 것(공백·반·경·쯤·문장부호)이 와야만 시각으로 본다.
const NATIVE_HOUR =
  /(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두)\s*시(?=\s|반|경|쯤|께|[.,?!"'“”]|$)/g;

const MERIDIEM_BEFORE = /(새벽|아침|오전|낮|오후|저녁|밤)\s*$/;

// "8시 30분" / "8시" / "08:30" 셋을 모두 잡는다.
const TIME_RE = /(\d{1,2})\s*시\s*(\d{1,2})\s*분|(\d{1,2})\s*시(?![간절점기])|(\d{1,2}):(\d{2})/g;

/** 앞머리의 오전/오후 표시를 보고 24시간제로 올린다. */
function applyMeridiem(hour, before) {
  const m = before.match(MERIDIEM_BEFORE);
  if (!m) return hour;
  const word = m[1];
  if (/오후|저녁|밤/.test(word) && hour < 12) return hour + 12;
  // 새벽·아침·오전·낮은 그대로 둔다(0~11시가 이미 오전이다).
  return hour;
}

/** 텍스트에서 시각을 뽑는다. [{ hour, min, raw, index }] */
function extractTimes(text) {
  const out = [];
  for (const m of text.matchAll(TIME_RE)) {
    let hour, min;
    if (m[1] !== undefined) {
      hour = +m[1];
      min = +m[2];
    } else if (m[3] !== undefined) {
      hour = +m[3];
      min = 0;
    } else {
      hour = +m[4];
      min = +m[5];
    }
    if (hour > 24 || min > 59) continue;
    const before = text.slice(Math.max(0, m.index - 6), m.index);
    hour = applyMeridiem(hour, before);
    if (hour === 24) hour = 0;
    out.push({ hour, min, raw: m[0].trim(), index: m.index });
  }
  return out;
}

// 장면이 열리는 시각은 이 코퍼스에서 늘 **문단 첫머리**에 선다
// ("아침 8시 30분. 산길 끝에서…"). 반대로 문단 중간의 시각은 기록지를 읽거나
// 지난 일을 적는 자리라 과거를 가리킨다 — 흐름 검사는 앞의 것만 본다.
const SCENE_HEAD =
  /^[#>*\-\s]*(?:(새벽|아침|오전|낮|오후|저녁|밤)\s*)?(\d{1,2})\s*(?:시\s*(\d{1,2})\s*분|시(?![간절점기])|:(\d{2}))/;

/** 문단 첫머리에 선 시각만 뽑는다. 없으면 null. */
function sceneTimeOf(paragraph) {
  const m = paragraph.match(SCENE_HEAD);
  if (!m) return null;
  let hour = +m[2];
  const min = m[3] !== undefined ? +m[3] : m[4] !== undefined ? +m[4] : 0;
  if (hour > 24 || min > 59) return null;
  if (m[1] && /오후|저녁|밤/.test(m[1]) && hour < 12) hour += 12;
  if (hour === 24) hour = 0;
  return { hour, min, raw: m[0].trim() };
}

/** 따옴표 안(대사)과 밖(서술)을 가른다. 여는/닫는 큰따옴표 둘 다 본다. */
function splitQuoted(text) {
  let narration = "";
  let dialogue = "";
  let inQuote = false;
  for (const ch of text) {
    if (ch === '"' || ch === "“" || ch === "”") {
      inQuote = !inQuote;
      // 따옴표 자체는 어느 쪽에도 넣지 않는다.
      continue;
    }
    if (inQuote) dialogue += ch;
    else narration += ch;
  }
  return { narration, dialogue };
}

/* ── 마스터에서 시각 모으기 ────────────────────────────────── */

function parseMasterTime(s) {
  if (typeof s !== "string") return null;
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const day = /다음\s*날|다음날|이튿날/.test(s) ? 1 : 0;
  return { day, hour: +m[1], min: +m[2] };
}

const toMinutes = (t) => t.day * 1440 + t.hour * 60 + t.min;
const hhmm = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** 마스터 전체에서 언급되는 모든 "HH:MM"을 모은다(본문 문자열 포함). */
function collectMasterClock(master) {
  const set = new Set();
  const walk = (v) => {
    if (typeof v === "string") {
      for (const m of v.matchAll(/(\d{1,2}):(\d{2})/g)) set.add(hhmm(+m[1], +m[2]));
      // 마스터 산문도 "오후 2시 10분"처럼 쓰므로 앞머리를 보고 24시간제로 올린다.
      for (const m of v.matchAll(/(\d{1,2})\s*시\s*(\d{1,2})\s*분/g)) {
        const hour = applyMeridiem(+m[1], v.slice(Math.max(0, m.index - 6), m.index));
        set.add(hhmm(hour === 24 ? 0 : hour, +m[2]));
      }
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(master);
  return set;
}

/* ── 마스터 찾기 ───────────────────────────────────────────── */

/**
 * 소설 파일 이름에서 사건 번호와 어느 마스터를 볼지 정한다.
 * README 규칙: `remaster*`는 오프라인 전용 마스터를 읽고, 나머지는 원본을 읽는다.
 */
function resolveMaster(novelFile) {
  const name = basename(novelFile, ".md");
  const num = name.match(/(\d{3})/);
  if (!num) return null;
  const caseId = `CASE${num[1]}`;
  const dir = join(CASE_DIR, caseId);
  const offline = join(dir, `Case-No-${num[1]}.offline.json`);
  const plain = join(dir, `${caseId}.master.json`);
  const wantsOffline = /^remaster/i.test(name);
  const path = wantsOffline && existsSync(offline) ? offline : plain;
  if (!existsSync(path)) return null;
  return { caseId, path, variant: wantsOffline ? "offline" : "master" };
}

/* ── 검사 ──────────────────────────────────────────────────── */

function checkNovel(novelFile) {
  const findings = [];
  const add = (level, code, message) => findings.push({ level, code, message });

  const resolved = resolveMaster(novelFile);
  if (!resolved) {
    add("error", "MASTER_NOT_FOUND", `${basename(novelFile)}에 대응하는 마스터를 찾지 못했다.`);
    return { file: novelFile, findings };
  }

  const master = JSON.parse(readFileSync(resolved.path, "utf8"));
  const raw = readFileSync(novelFile, "utf8");

  // 「보탠 것」·「무엇이 바뀌었나」 같은 해설 절은 사건 시간이 아니라 작업 기록이라
  // 검사에서 뺀다. 첫 번째 `## 사건의 정리` 또는 `## 보탠 것`부터 잘라 낸다.
  const cut = raw.search(/^##\s*(사건의 정리|보탠 것|무엇이 바뀌었나)/m);
  const body = cut === -1 ? raw : raw.slice(0, cut);

  const { narration, dialogue } = splitQuoted(body);
  const masterClock = collectMasterClock(master);
  const entry = parseMasterTime(master.opening_scene?.detective_entry_time);

  /* 1. 고유어 시각 표기 (CLAUDE.md 규칙) */
  for (const m of body.matchAll(NATIVE_HOUR)) {
    add("error", "TIME_NATIVE_NUMERAL", `고유어 시각 표기 "${m[0]}" — 아라비아 숫자로 쓴다.`);
  }

  /* 2. 장면 시각의 단조증가 (진짜 시간 흐름 검사)
     문단 첫머리에 선 시각만 본다 — 문단 중간의 시각은 기록지를 읽거나 지난
     일을 말하는 자리라 역행이 정상이다. */
  // 장면 시각은 `## N. 제목` 바로 다음 문단에만 선다. 본문 중간에서 시각으로
  // 시작하는 문단은 기록을 옮겨 적거나("22:00 — 자동에서 수동.") 탐정이 시각을
  // 따지는 자리라("21:20에 퇴근한 사람도 아니다") 흐름과 무관하다.
  const scenes = body
    .split(/^##\s+/m)
    .slice(1)
    .map((section, chapter) => {
      const paragraphs = section.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const t = sceneTimeOf(paragraphs[1] ?? ""); // [0]은 장 제목 줄
      return t && { ...t, chapter };
    })
    .filter(Boolean);

  let day = entry ? entry.day : 0;
  let prev = null;
  for (const t of scenes) {
    let cur = day * 1440 + t.hour * 60 + t.min;
    // 자정을 넘긴 경우: 새벽으로 돌아왔으면 날짜를 하나 올려 본다.
    if (prev !== null && cur < prev && t.hour < 6) {
      day += 1;
      cur += 1440;
    }
    if (prev !== null && cur < prev) {
      add("error", "TIME_BACKWARD", `장면 시각이 역행한다 — "${t.raw}"가 앞 장면보다 이르다.`);
    }
    prev = prev === null ? cur : Math.max(prev, cur);
  }

  /* 3. 오프닝이 진입 시각과 맞는가
     1장이 시각 없이 산문으로 열리는 것은 정상이므로(마스터 오프닝이 그런 경우가
     있다) 1장에 시각이 찍혀 있을 때만 본다. */
  if (entry && scenes.length && scenes[0].chapter === 0) {
    const first = scenes[0];
    if (first.hour !== entry.hour || first.min !== entry.min) {
      add(
        "warn",
        "ENTRY_TIME_MISMATCH",
        `첫 장면 시각 "${first.raw}"이 진입 시각 ${hhmm(entry.hour, entry.min)}과 다르다.`,
      );
    }
  }

  /* 4. 마스터와 대조 — 12시간제 혼용과 지어낸 시각
     CLAUDE.md는 "플레이어가 두 시각을 눈으로 바로 맞춰볼 수 있어야 한다"고
     적는다. 마스터가 21:08인데 소설이 "9시 8분"이면 맞춰볼 수가 없다. */
  const seen = new Set();
  for (const t of [...extractTimes(narration), ...extractTimes(dialogue)]) {
    const key = hhmm(t.hour, t.min);
    if (seen.has(key)) continue;
    seen.add(key);
    if (t.min === 0) continue; // "6시 넘어서" 같은 어림수는 넘어간다
    if (masterClock.has(key)) continue;
    const pm = t.hour < 12 ? hhmm(t.hour + 12, t.min) : null;
    if (pm && masterClock.has(pm)) {
      add(
        "error",
        "TIME_12H_MISMATCH",
        `"${t.raw}"은 마스터의 ${pm}과 같은 시각인데 12시간제로 적혀 눈으로 맞춰볼 수 없다.`,
      );
      seen.add(pm);
      continue;
    }
    add("warn", "TIME_NOT_IN_MASTER", `마스터에 없는 시각 "${t.raw}" (${key}).`);
  }

  /* 5. 소설이 한 번도 안 쓴 타임라인 시각 — 특히 진입 이후 항목 */
  for (const item of master.actual_timeline ?? []) {
    const t = parseMasterTime(item.time);
    if (!t) continue;
    const key = hhmm(t.hour, t.min);
    if (seen.has(key)) continue;
    const afterEntry = entry && toMinutes(t) > toMinutes(entry);
    add(
      afterEntry ? "warn" : "info",
      afterEntry ? "TIMELINE_AFTER_ENTRY_UNUSED" : "TIMELINE_TIME_UNUSED",
      `${item.id} ${item.time} — 소설이 이 시각을 한 번도 쓰지 않았다${
        afterEntry ? " (탐정이 도착한 뒤의 일이다)" : ""
      }.`,
    );
  }

  return { file: novelFile, caseId: resolved.caseId, variant: resolved.variant, findings };
}

/* ── 실행 ──────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const files = args.length
  ? args
  : readdirSync(NOVEL_DIR)
      .filter((f) => f.endsWith(".md") && f !== "README.md")
      .sort()
      .map((f) => join(NOVEL_DIR, f));

const ICON = { error: "✗", warn: "!", info: "·" };
let errors = 0;
let warns = 0;

for (const file of files) {
  const r = checkNovel(file);
  const shown = r.findings.filter((f) => f.level !== "info");
  errors += r.findings.filter((f) => f.level === "error").length;
  warns += r.findings.filter((f) => f.level === "warn").length;
  const infoCount = r.findings.length - shown.length;

  const head = `${basename(file)}${r.variant === "offline" ? " (offline master)" : ""}`;
  if (!shown.length) {
    console.log(`  ${head} — 이상 없음${infoCount ? ` (info ${infoCount})` : ""}`);
    continue;
  }
  console.log(`\n${head}`);
  for (const f of shown) console.log(`  ${ICON[f.level]} [${f.code}] ${f.message}`);
  if (infoCount) console.log(`  · (info ${infoCount}건 생략 — 진입 이전 타임라인 미사용)`);
}

console.log(`\nerrors: ${errors}, warnings: ${warns}`);
process.exit(errors ? 1 : 0);
