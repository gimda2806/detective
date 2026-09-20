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
  // **「낮 1시」는 13시다.** 「낮 12시」는 그대로 두어야 하므로 1~5시만 올린다.
  // 이 한 줄이 없어서 CASE040 의 「낮 1시」가 새벽 1시로 읽혔다.
  if (/낮/.test(word) && hour >= 1 && hour <= 5) return hour + 12;
  // 새벽·아침·오전은 그대로 둔다(0~11시가 이미 오전이다).
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

// ── 장 제목이 곧 시간표다 ──────────────────────────────────────
//
// **이 검사가 보던 것은 13편(14%)뿐이었다.** 장면 시각을 `paragraphs[1]`
// (제목 바로 다음 문단)에서만 찾고 `paragraphs[0]` = 제목 줄은 「장 제목 줄」
// 이라며 일부러 건너뛰었는데, **93편 전부가 제목에 시각을 적는다.**
// 「## 1. 오전 7시 30분」 · 「## 3. 새벽 1시」 · 「## 14. 원장 개인 다실, 낮」.
// 제목까지 읽으면 91편(97.8%)이 보이고, 대부분 한 편에 10~14개씩 달려 있다.
//
// **소설은 마스터를 한 줄로 편 것이라 이 시간표가 마스터의 어긋남을 드러낸다**
// (2026-09 사용자 지적). CASE015 가 그 자리다 — 마스터는 「새벽, 문가온이
// 숨진 채 발견되었다」인데 진입 시각이 23:10 이고, 소설은 1장 23시 10분 →
// 2장 자정 무렵 → 3장 새벽 1시로 흐른다. **새벽은 발견 시각이 아니라 수사가
// 도달한 시각이다.** 필드를 따로 보면 안 보이고 한 줄로 펴야 보인다.
//
// 제목의 시각이 전부 장면 시계인 것은 아니다 — 「8. 22시라는 숫자」 ·
// 「10. 어젯밤 20시」 · 「6. 21시 28분부터 47분까지」는 **이야기 중인** 시각이다.
// 「N. [장소,] <시각>[무렵|쯤|경]」으로 **끝나는** 꼴만 장면 라벨로 본다.
// 93편을 통틀어 이렇게 걸러지는 제목이 아홉 개뿐이라 경계가 깨끗하다.
const TITLE_SCENE =
  /^\s*\d+\.\s*(?:[^,]*,\s*)?(?:(?:다음\s*날|이튿날|그날)\s*)?(?:(새벽|이른 아침|아침|오전|한낮|낮|오후|해질녘|초저녁|저녁|한밤중|한밤|심야|자정|동틀 무렵)\s*)?(?:(\d{1,2})\s*(?::(\d{2})|시(?:\s*(\d{1,2})\s*분)?))?\s*(?:무렵|쯤|경|께)?\s*$/;

// 시간대 말만 있는 제목(「원장 개인 다실, 낮」)은 **점이 아니라 구간**이다.
// 점으로 눌러 버리면 「오전 7시 30분」 다음의 「아침」이 5시로 읽혀 거짓
// 역행이 난다. 구간으로 두고, **구간이 통째로 앞 장면보다 이를 때만** 낸다.
const TITLE_BAND = {
  "새벽": [0, 7], "이른 아침": [4, 9], "아침": [4, 11], "오전": [5, 13],
  "한낮": [10, 16], "낮": [9, 18], "오후": [11, 19], "해질녘": [16, 21],
  "초저녁": [16, 21], "저녁": [16, 22], "밤": [18, 26], "한밤": [21, 29],
  "한밤중": [21, 29], "심야": [21, 29], "자정": [22, 26], "동틀 무렵": [4, 8],
};

/** 장 제목에서 장면 시각을 뽑는다. 숫자면 점, 시간대 말뿐이면 구간. */
function titleTimeOf(title) {
  const m = title.match(TITLE_SCENE);
  if (!m) return null;
  const [, word, h, mm1, mm2] = m;
  if (h !== undefined) {
    let hour = +h;
    const min = mm1 !== undefined ? +mm1 : mm2 !== undefined ? +mm2 : 0;
    if (hour > 24 || min > 59) return null;
    if (word && /오후|저녁|밤|한밤|심야|해질녘|초저녁/.test(word) && hour < 12) hour += 12;
    // 「낮 1시」= 13시, 「낮 12시」= 12시.
    if (word && /낮/.test(word) && hour >= 1 && hour <= 5) hour += 12;
    if (hour === 24) hour = 0;
    return { hour, min, raw: title.trim(), band: null };
  }
  if (word && TITLE_BAND[word]) {
    const [lo, hi] = TITLE_BAND[word];
    return { hour: lo, min: 0, raw: title.trim(), band: [lo, hi] };
  }
  return null;
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
      // 제목 줄이 먼저다 — 93편 전부가 거기에 시간표를 적는다. 첫 문단의
      // 숫자 시각은 제목에 시각이 없을 때의 차선이다(13편이 그렇다).
      const t =
        titleTimeOf(paragraphs[0] ?? "") ?? sceneTimeOf(paragraphs[1] ?? "");
      return t && { ...t, chapter };
    })
    .filter(Boolean);

  // **회상 장은 흐름에서 뺀다.** 제목이 시각인 장에는 두 종류가 있다 —
  // 「## 3. 새벽 1시」처럼 수사가 도달한 시각과, 「## 6. 21시 25분」처럼
  // 전날 밤을 되짚는 시각이다. 뒤의 것은 대사 속 시각과 같은 성격이라
  // (이 파일 머리의 전제 2) 흐름을 뒤집는 것이 정상이다. **진입 시각보다
  // 이르면서 마스터 타임라인에 있는 시각**이면 재구성으로 본다 — 소설이
  // 지어낸 시각이면 애초에 TIME_NOT_IN_MASTER 가 잡는다.
  // CASE008-ver2 가 그 자리다: 진입이 「사건 다음날 07:00」인데 6장이
  // 「21시 25분」, 10장이 「어젯밤 20시」로 전날을 되짚는다.
  // 진입보다 **앞에 오는 타임라인 항목**의 시각들. 시계 숫자로 견주면 안 된다 —
  // CASE008 은 진입이 「사건 다음날 07:00」이라 전날 21:25 가 숫자로는 더 크다.
  // 타임라인이 시간순 배열이므로(CLAUDE.md) 진입 항목 앞을 그대로 잘라 쓴다.
  const preEntry = new Set();
  {
    const items = master.actual_timeline ?? [];
    const idx = items.findIndex((it) => {
      const t = parseMasterTime(it?.time);
      return t && entry && t.day === entry.day && t.hour === entry.hour && t.min === entry.min;
    });
    for (const it of idx === -1 ? items : items.slice(0, idx)) {
      const t = parseMasterTime(it?.time);
      if (t) preEntry.add(hhmm(t.hour, t.min));
    }
  }
  const isFlashback = (t) => !t.band && preEntry.has(hhmm(t.hour, t.min));

  let day = entry ? entry.day : 0;
  let prev = null;
  let prevRawHour = entry ? entry.hour : 0;
  for (const t of scenes.filter((x) => !isFlashback(x))) {
    let cur = day * 1440 + t.hour * 60 + t.min;
    // 자정을 넘긴 경우: 새벽으로 돌아왔으면 날짜를 하나 올려 본다.
    // **직전 장이 저녁일 때만 올린다.** 조건이 「새벽으로 돌아왔으면」뿐이면
    // 새벽 장이 이어질 때마다 다시 걸려 하루씩 밀어 올리고, 그러면 역행이
    // 통째로 덮인다 — 「새벽 4시 → 새벽 1시」가 이틀에 걸친 것으로 읽혔다.
    // 자정은 한 번만 넘는다.
    if (prev !== null && cur < prev && t.hour < 6 && prevRawHour >= 18) {
      day += 1;
      cur += 1440;
    }
    // 구간(시간대 말뿐인 제목)은 **구간이 통째로** 앞설 때만 역행으로 본다.
    const endOfCur = t.band ? day * 1440 + t.band[1] * 60 : cur;
    if (prev !== null && endOfCur <= prev) {
      add("error", "TIME_BACKWARD", `장면 시각이 역행한다 — "${t.raw}"가 앞 장면보다 이르다.`);
    }
    prev = prev === null ? cur : Math.max(prev, cur);
    prevRawHour = t.hour;
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

  /* 5. 소설이 한 번도 안 쓴 타임라인 시각 — 특히 진입 이후 항목
     타임라인에 날짜 표기가 없는 사건이 있다(옛 형식). 그런 마스터는 시각이
     한 바퀴 돌 때마다 날짜가 넘어간 것으로 본다 — 그러지 않으면 전날 밤
     20:30 이 다음날 06:30 진입보다 "뒤"로 읽힌다. */
  let tlDay = 0;
  let tlPrev = -1;
  const timeline = [];
  for (const item of master.actual_timeline ?? []) {
    const t = parseMasterTime(item.time);
    if (!t) continue;
    const minutes = t.hour * 60 + t.min;
    if (tlPrev >= 0 && minutes < tlPrev) tlDay += 1;
    tlPrev = minutes;
    timeline.push({ item, t: { ...t, day: Math.max(t.day, tlDay) } });
  }

  // 진입 시각의 날짜도 타임라인에 맞춘다. 같은 시각이 타임라인에 있으면 그것이
  // 곧 탐정이 들어온 그 순간이므로(대개 발견 항목이다) 날짜를 그쪽에서 가져온다.
  if (entry) {
    const twin = timeline.find((x) => x.t.hour === entry.hour && x.t.min === entry.min);
    if (twin && twin.t.day > entry.day) entry.day = twin.t.day;
  }

  for (const { item, t } of timeline) {
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
