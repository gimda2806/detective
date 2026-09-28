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
    // **시간대 말은 그 문장 안에서 뒤에 오는 시각까지 이어진다**(2026-09-26).
    // 전에는 바로 앞 여섯 글자만 봐서, 「주문은 밤 9시 38분인데 도착은 10시
    // 20분요」의 10시 20분이 오전으로 읽혔다. 그래서 고치라는 지적이 곧 「한
    // 문장에 밤을 두 번 쓰라」가 됐고, 그건 사람이 쓰는 문장이 아니다. 같은
    // 규칙이 마스터 쪽 `checkTimeReferences` 에도 있다(CLAUDE.md 「시각은
    // 타임라인과 눈으로 맞춰볼 수 있게 적는다」). **문장을 넘지는 않는다** —
    // 「밤 9시 38분입니다. 10시 20분 도착에」의 뒤 문장은 제 말을 따로 붙여야
    // 한다. 더 가까운 시간대 말이 뒤에 있으면 그쪽이 이긴다(「밤 9시에 자고
    // 아침 7시에 일어났다」).
    const sentenceStart = Math.max(
      ...['.', '?', '!', '…', '\n'].map((mark) => text.lastIndexOf(mark, m.index - 1)),
      -1,
    ) + 1;
    const clause = text.slice(sentenceStart, m.index);
    const near = text.slice(Math.max(0, m.index - 6), m.index);
    // 가장 가까운 시간대 말 하나만 남겨 `applyMeridiem` 에 넘긴다.
    const all = [...clause.matchAll(new RegExp(MERIDIEM_BEFORE.source.replace(/\\s\*\$$/, ''), 'g'))];
    const before = MERIDIEM_BEFORE.test(near)
      ? near
      : all.length
        ? all[all.length - 1][1]
        : near;
    const hadMeridiem = Boolean(before.match(MERIDIEM_BEFORE));
    hour = applyMeridiem(hour, before);
    if (hour === 24) hour = 0;
    // **오전·오후를 알 수 없는 표기인가.** `21:45` 는 그 자체로 24시간제라
    // 뒤집을 여지가 없고, 「밤 9시 45분」도 앞말이 정해 준다. 남는 것은
    // 「9시 45분」처럼 **앞말 없는 1~11시**뿐이다. 아래 notesClock 이 이것만
    // 12시간 뒤집어 인정한다.
    // 고유어 표기(`8시 45분`·`8시`)만 뒤집을 여지가 있다 — `20:45` 는 그
    // 자체로 24시간제다. TIME_RE 의 1·2 가 「N시 M분」, 3 이 「N시」, 4·5 가
    // `HH:MM` 이다(순서를 헷갈리면 조건이 통째로 뒤집힌다).
    const koreanHour = m[1] !== undefined || m[3] !== undefined;
    const ambiguous = koreanHour && !hadMeridiem && hour >= 1 && hour <= 11;
    out.push({ hour, min, raw: m[0].trim(), index: m.index, ambiguous });
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
// 그래서 **시각만으로 이루어진 토막**만 장면 라벨로 본다.
//
// 한때 이것을 「제목이 시각으로 **끝나는** 꼴」로 잡았는데, 그러면 이 폴더에
// 흔한 **「N. <시각> — <장소>」가 통째로 안 잡힌다**(2026-09-23 쪽지
// `wizardly-hamilton-dh2hqo`, 2026-09-26 실측으로 확인). 재 보니 **제목에
// 시각을 적고도 장면 시각이 하나도 안 잡히는 편이 11편**이고, 그 편들은
// 역행 검사와 진입 시각 검사가 **통째로 안 돈 채 「이상 없음」**이 나왔다
// (일부러 역행을 넣어 시험해도 아무것도 안 나왔다). 꼬리가 붙어 일부 장만
// 새던 편이 25편 더 있다.
//
// 그래서 제목을 **구분자(`—`·`–`·`-`·`,`·`·`)로 토막 내고 토막마다** 본다.
// 경계는 그대로다 — 「22시라는 숫자」는 토막 전체가 시각이 아니라 여전히
// 안 걸리고, 「어젯밤 20시」도 `어젯`이 남아 안 걸린다.
const TITLE_LABEL =
  /^(?:(다음\s*날|이튿날|그날)\s*)?(?:(새벽|이른 아침|아침|오전|한낮|낮|오후|해질녘|초저녁|저녁|한밤중|한밤|심야|자정|동틀 무렵|밤)\s*)?(?:(\d{1,2})\s*(?::(\d{2})|시(?:\s*(\d{1,2})\s*분)?))?\s*(?:무렵|쯤|경|께)?$/;

// 시간대 말만 있는 제목(「원장 개인 다실, 낮」)은 **점이 아니라 구간**이다.
// 점으로 눌러 버리면 「오전 7시 30분」 다음의 「아침」이 5시로 읽혀 거짓
// 역행이 난다. 구간으로 두고, **구간이 통째로 앞 장면보다 이를 때만** 낸다.
const TITLE_BAND = {
  "새벽": [0, 7], "이른 아침": [4, 9], "아침": [4, 11], "오전": [5, 13],
  "한낮": [10, 16], "낮": [9, 18], "오후": [11, 19], "해질녘": [16, 21],
  "초저녁": [16, 21], "저녁": [16, 22], "밤": [18, 26], "한밤": [21, 29],
  "한밤중": [21, 29], "심야": [21, 29], "자정": [22, 26], "동틀 무렵": [4, 8],
};

/**
 * 장 제목에서 장면 시각을 뽑는다. 숫자면 점, 시간대 말뿐이면 구간.
 *
 * 「다음 날」·「이튿날」은 **버리지 않고 하루로 읽는다**(`nextDay`). 버리던
 * 동안 「저녁 8시 → 다음 날 아침 9시」가 자정 넘김 어림(직전이 저녁이고
 * 지금이 6시 전일 때만 하루를 올린다)에 안 걸려 **거짓 역행**이 났다.
 */
function titleTimeOf(title) {
  const body = title.trim().replace(/^\s*\d+\.\s*/, "");
  if (body === title.trim()) return null; // 「N.」으로 시작하지 않으면 장 제목이 아니다
  for (const piece of body.split(/\s*[—–]\s*|\s*[,·]\s*|\s+-\s+/)) {
    const m = piece.trim().match(TITLE_LABEL);
    if (!m) continue;
    const [, dayWord, word, h, mm1, mm2] = m;
    const nextDay = /다음\s*날|이튿날/.test(dayWord ?? "") ? 1 : 0;
    if (h !== undefined) {
      let hour = +h;
      const min = mm1 !== undefined ? +mm1 : mm2 !== undefined ? +mm2 : 0;
      if (hour > 24 || min > 59) continue;
      if (word && /오후|저녁|밤|한밤|심야|해질녘|초저녁/.test(word) && hour < 12) hour += 12;
      // 「낮 1시」= 13시, 「낮 12시」= 12시.
      if (word && /낮/.test(word) && hour >= 1 && hour <= 5) hour += 12;
      if (hour === 24) hour = 0;
      return { hour, min, raw: title.trim(), band: null, nextDay };
    }
    if (word && TITLE_BAND[word]) {
      const [lo, hi] = TITLE_BAND[word];
      return { hour: lo, min: 0, raw: title.trim(), band: [lo, hi], nextDay };
    }
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
  // 날짜 말이 적혀 있으면 그대로 믿는다. 「전날」을 안 읽던 때는 「사건 전날
  // 21:30」이 「사건 당일 09:00」 진입보다 *뒤*로 읽혀, CASE036 의 사건 시각 다섯이
  // 전부 「탐정이 도착한 뒤의 일」로 나왔다. `explicit` 은 5번 검사가 옛 형식
  // (날짜 없는 "20:30")에만 자정 넘김 추정을 쓰게 하려는 표지다.
  // 「D-1」·「사흘 전」·「전날」은 전부 -1 로 뭉친다 — 이 검사기가 날짜로 하는 일은
  // 「진입보다 앞인가 뒤인가」뿐이라 며칠 앞인지는 안 쓴다. 「오전」의 「전」은
  // 날짜가 아니므로 뒤에 공백·문장부호가 오는 낱말 끝 「전」만 본다.
  const day = /다음\s*날|다음날|이튿날|익일|D\+\d+/.test(s)
    ? 1
    : /D-\d+|전날|전일|어젯밤|어제|그제|(?<!오)전(?=[\s,·]|$)/.test(s)
      ? -1
      : 0;
  const explicit = day !== 0 || /당일|그날|D-day/i.test(s);
  return { day, hour: +m[1], min: +m[2], explicit };
}

const toMinutes = (t) => t.day * 1440 + t.hour * 60 + t.min;
const hhmm = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** 한 장의 본문이 그 시각에 닿는가 — 「오후 10시 35분」·「22:35」 둘 다 본다. */
function sceneReachesTime(section, t) {
  for (const m of section.matchAll(TIME_RE)) {
    const h = m[1] !== undefined ? +m[1] : m[3] !== undefined ? +m[3] : +m[4];
    const min = m[2] !== undefined ? +m[2] : m[5] !== undefined ? +m[5] : 0;
    if (min !== t.min) continue;
    // 소설은 12시간제로 적고(「오후 10시 35분」) 마스터는 24시간제다.
    if (h === t.hour || h + 12 === t.hour) return true;
  }
  return false;
}

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

  const masterClock = collectMasterClock(master);
  const entry = parseMasterTime(master.opening_scene?.detective_entry_time);

  // 진입 시각에 HH:MM 이 없으면(「사건 당일 아침」) 아래 3·5번 검사가 통째로
  // 조용히 건너뛰어진다 — 27건이 그렇고 그중 여섯은 소설이 있다. 마스터 쪽은
  // `validate_master`의 DETECTIVE_ENTRY_TIME_NO_CLOCK 이 잡지만, 이 검사기를
  // 돌리는 사람이 「이상 없음」을 「맞다」로 읽으면 안 되므로 여기서도 낸다.
  if (!entry) {
    add(
      "warn",
      "ENTRY_TIME_UNPARSED",
      `detective_entry_time "${master.opening_scene?.detective_entry_time ?? ""}"에 시각이 없어 진입 시각 검사(ENTRY_TIME_MISMATCH·TIMELINE_AFTER_ENTRY_UNUSED)를 건너뛴다.`,
    );
  }

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
  const sections = body.split(/^##\s+/m).slice(1);
  const scenes = sections
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
    // **진입 항목을 못 찾으면 타임라인 전체를 회상으로 삼지 않는다.** 위 `findIndex`
    // 는 시·분이 **정확히 같은** 항목을 찾는데, 진입 시각이 타임라인의 어느 항목과도
    // 안 겹치는 편이 373편 중 238편이다(2026-09-28 실측). 그때 `idx === -1`이 되어
    // 옛 코드가 `items` 전체를 `preEntry`에 넣었고, 그러면 `isFlashback`이 **제목
    // 시각이 마스터에 있는 장을 전부** 회상으로 빼서 그 편은 역행 검사가 통째로
    // 안 돌았다. 그렇게 진입 **뒤** 항목까지 새어 들어간 편이 94편, 그래서 실제로
    // 장이 빠진 편이 27편·36장이다. CASE363 이 그 자리다(진입 13:50, 그 시각의
    // 항목 없음 — 5장 제목을 마스터에 있는 값으로 바꿔도 TIME_BACKWARD 가 안 떴다).
    //
    // 그래서 못 찾았을 때는 **진입보다 뒤인 첫 항목**에서 자른다. 타임라인이 시간순
    // 배열이라는 전제(CLAUDE.md)는 그대로 쓰고, 자를 자리만 「같은 시각」에서 「진입을
    // 넘어서는 자리」로 넓힌 것이다. 뒤인 항목이 아예 없으면 `-1`이 그대로 남아
    // 전체가 `preEntry`가 되는데, 그때는 타임라인이 통째로 진입 전이라 **그것이 맞다**
    // (범행이 다 끝난 뒤 탐정이 들어오는 보통의 모양이다).
    //
    // **시계 숫자로 걸러 내는 쪽은 택하지 않았다.** 「진입보다 시각이 큰 항목은 담지
    // 않는다」로 하면 CASE012(진입 「사건 당일 06:10」, T01~T08 이 날짜 말 없는 맨
    // "20:00"~"22:35")처럼 **옛 형식으로 적힌 전날 저녁**이 숫자만 크다는 이유로
    // 빠진다 — 그렇게 어긋나는 항목이 46개, 그중 43개가 날짜 말 없는 옛 형식이었다.
    // 배열 순서가 날짜 말보다 믿을 만하다.
    let cut = idx;
    if (cut === -1 && entry) {
      cut = items.findIndex((it) => {
        const t = parseMasterTime(it?.time);
        return t && toMinutes(t) > toMinutes(entry);
      });
    }
    for (const it of cut === -1 ? items : items.slice(0, cut)) {
      const t = parseMasterTime(it?.time);
      if (t) preEntry.add(hhmm(t.hour, t.min));
    }
  }
  const isFlashback = (t) => !t.band && preEntry.has(hhmm(t.hour, t.min));

  const baseDay = entry ? entry.day : 0;
  let day = baseDay;
  let prev = null;
  let prevRawHour = entry ? entry.hour : 0;
  for (const t of scenes.filter((x) => !isFlashback(x))) {
    let cur = day * 1440 + t.hour * 60 + t.min;
    // **제목이 「이튿날」이라고 적었으면 그 말을 믿는다.** 아래 자정 넘김
    // 어림은 「직전이 저녁이고 지금이 6시 전」일 때만 도는데, 「저녁 8시 →
    // 이튿날 아침 9시」는 그 조건에 안 걸려 거짓 역행이 났다(2026-09-26
    // 실측 — 217·228·233·234 넷에서 여섯 건). **모자랄 때만 올린다**:
    // 이튿날 장이 연달아 와도 두 번 올리지 않고, 이미 앞선 장이 자정을
    // 넘겨 뒀으면 그대로 둔다.
    // **하루는 장마다 한 번만 올린다 — 「앞 장보다 이르면」이 조건이면 안 된다.**
    // 옛 조건은 `t.nextDay && cur <= prev` 였는데 **역행이 곧 그 조건**이라, 이튿날
    // 장이 연달아 오다가 하나가 앞 장보다 이르면 그때마다 하루를 더 올려 역행이
    // 보정에 먹혔다. CASE347 이 그 자리다 — 6장이 「다음 날 새벽 1시 40분」인데
    // 7장을 「다음 날 새벽 0시 10분」으로 당겨도 아무것도 안 떴다(제목에 「다음 날」이
    // 둘 이상인 편이 코퍼스에 20편이고, 그 편들의 자정 이후 구간이 전부 그랬다).
    // 「다음 날」은 **사건 다음 날**을 가리키는 말이지 「한 밤 더」가 아니므로,
    // 아직 그날에 안 갔을 때(`day === baseDay`)만 올린다. 앞 장이 아래 자정 넘김
    // 어림으로 이미 넘겨 뒀으면 그대로 두는 것도 같은 한 줄이 맡는다.
    if (t.nextDay && day === baseDay) {
      day += 1;
      cur += 1440;
    } else if (prev !== null && cur < prev && t.hour < 6 && prevRawHour >= 18) {
      // 자정을 넘긴 경우: 새벽으로 돌아왔으면 날짜를 하나 올려 본다.
      // **직전 장이 저녁일 때만 올린다.** 조건이 「새벽으로 돌아왔으면」뿐이면
      // 새벽 장이 이어질 때마다 다시 걸려 하루씩 밀어 올리고, 그러면 역행이
      // 통째로 덮인다 — 「새벽 4시 → 새벽 1시」가 이틀에 걸친 것으로 읽혔다.
      // 자정은 한 번만 넘는다.
      day += 1;
      cur += 1440;
    }
    // **자정을 넘긴 뒤에 오는 날짜 말 없는 저녁·밤 장은 그 전날 밤으로 읽는다.**
    // `day` 는 장을 건너 살아남으므로, 위 어림이 한 번 돌아 `day` 가 오르면 그
    // 뒤의 「밤 11시 40분」이 **이튿날 밤**으로 계산돼 늘 앞으로 간다 — 그래서
    // 역행이 안 잡힌다. CASE358 이 그 자리다(진입 밤 11시 35분, 14장 중 12장이
    // 자정 이후): 4장이 「새벽 0시 35분」인데 5장을 「밤 11시 40분」으로 당겨도
    // 아무것도 안 떴다. 날짜 말을 적은 장(`nextDay`)은 그 말을 믿고 그대로 둔다 —
    // 「다음 날 저녁 7시」로 진짜 하루 뒤를 적는 편이 이 줄에 안 걸려야 한다.
    if (!t.nextDay && day > baseDay && t.hour >= 18 && !t.band) {
      cur -= 1440;
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
     있다) 1장에 시각이 찍혀 있을 때만 본다.

     **1장이 진입보다 일찍 열리는 것은 정상일 수 있다.** `detective_entry_type`이
     「이미 그 자리에 있었다」류면(초대받아 앉아 있었다·마감을 기다리고 있었다)
     소설은 탐정이 **기다리는 데서** 열고 사건이 터지는 순간에 닿는다 —
     CASE302 의 1장은 「밤 8시 30분」에 회중시계를 찾으러 서 있다가
     「두 시간 남짓 흐른 오후 10시 35분」에 비명을 듣는데, 그 10시 35분이
     마스터의 진입 시각이다. CASE190 도 같다(1장 4시 32분, 진입 4시 40분이
     같은 장 안에 있다). 그래서 **1장이 이르면 그 장 안에서 진입 시각에
     닿는지**를 보고, 닿으면 넘긴다. 1장이 진입보다 **늦은** 것은 그대로
     경고다 — 소설이 진입 자체를 건너뛴 것이다. */
  if (entry && scenes.length && scenes[0].chapter === 0) {
    const first = scenes[0];
    // **구간 제목(「자정」·「이른 아침」)은 점과 견주지 않는다 — 품는지만 본다.**
    // 구간의 `hour` 는 아래끝일 뿐이라 점으로 읽으면 「자정」(22~26시)이 22시가
    // 되어 진입 00:06 과 다르다고 운다. 2026-09-26 에 제목 읽기를 고쳐 이
    // 편들이 처음 검사에 들어오자마자 그 꼴로 둘 나왔다(208·213). 자정을
    // 넘는 구간이 있으므로 +24 도 같이 본다.
    const bandHolds =
      first.band &&
      ((entry.hour >= first.band[0] && entry.hour <= first.band[1]) ||
        (entry.hour + 24 >= first.band[0] && entry.hour + 24 <= first.band[1]));
    if (!bandHolds && (first.hour !== entry.hour || first.min !== entry.min)) {
      const firstMin = first.hour * 60 + first.min;
      const entryMin = entry.hour * 60 + entry.min;
      const reachesEntry =
        firstMin < entryMin && sceneReachesTime(sections[0] ?? "", entry);
      if (!reachesEntry) {
        add(
          "warn",
          "ENTRY_TIME_MISMATCH",
          `첫 장면 시각 "${first.raw}"이 진입 시각 ${hhmm(entry.hour, entry.min)}과 다르다.`,
        );
      }
    }
  }

  /* 4. 마스터와 대조 — 12시간제 혼용과 지어낸 시각
     CLAUDE.md는 "플레이어가 두 시각을 눈으로 바로 맞춰볼 수 있어야 한다"고
     적는다. 마스터가 21:08인데 소설이 "9시 8분"이면 맞춰볼 수가 없다. */
  // **장 제목의 시각은 여기서 보지 않는다.** 「## 7. 오전 10시 50분」은 수사가
  // 거기까지 걸린 시간을 소설이 재어 놓은 것이라 마스터에 있을 리가 없고, 있어야
  // 하는 것도 아니다(README 「장 제목이 곧 시간표다」). 2026-09-20 에 세어 보니
  // 이 경고 728건 중 660건(91%)이 그것이었다 — 진짜 확인할 68건이 그 밑에 묻혀
  // 아무도 안 읽었다. 제목의 시각은 2번(역행)·3번(진입 시각)이 따로 본다.
  const bodyNoTitles = body.replace(/^##\s+.*$/gm, "");
  const { narration, dialogue } = splitQuoted(bodyNoTitles);
  // 소설이 지어낸 시각은 「보탠 것」·「오프라인으로 옮길 것」에 적혀 있어야 한다 —
  // 그 절이 이주의 설계도라(README), 거기 없는 시각은 마스터가 놓친 타임라인이라도
  // 아무도 되먹이지 못한다. 2026-09-20 에 68건을 대조하니 37건이 그 절에 없었고,
  // 그중 CASE019 의 표건우 도착 06:20 은 `R01.how_to_clear` 가 「도착 시각을
  // 대조한다」고 부르는데 마스터 어디에도 그 시각이 없는 자리였다. 그래서 둘로
  // 가른다 — 적혀 있으면 TIME_NOT_IN_MASTER(확인됐다는 뜻), 없으면 TIME_UNRECORDED.
  // **12시간 뒤집기는 모호한 표기에만 준다**(2026-09-24). 전에는 노트의 모든
  // 시각에 ±12 변형을 같이 넣어서, 그 절에 `21:45` 가 적혀 있으면 소설 본문의
  // `09:45` 까지 「적혀 있다」로 통과했다 — 여덟 자리가 그렇게 새고 있었다.
  // 그렇다고 확장을 통째로 빼면 멀쩡한 것이 깨진다: 노트는 표 칸이라 짧게
  // 「8시 45분」이라고만 적는 일이 잦고(CASE142 의 20:45, CASE187 의 21:51),
  // 그건 파서가 08:45·09:51 로 읽는다. 그래서 **앞말 없는 1~11시**만 뒤집는다.
  const notesClock = new Set(
    extractTimes(cut === -1 ? "" : raw.slice(cut)).flatMap((t) => {
      const keys = [hhmm(t.hour, t.min)];
      if (t.ambiguous) keys.push(hhmm(t.hour + 12, t.min));
      return keys;
    }),
  );
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
    if (notesClock.has(key)) {
      add("warn", "TIME_NOT_IN_MASTER", `마스터에 없는 시각 "${t.raw}" (${key}) — 「보탠 것」에 적혀 있다.`);
    } else {
      add(
        "warn",
        "TIME_UNRECORDED",
        `마스터에도 「보탠 것」에도 없는 시각 "${t.raw}" (${key}) — 마스터가 놓친 타임라인이면 「오프라인으로 옮길 것」에 적을 것.`,
      );
    }
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
    timeline.push({ item, t: { ...t, day: t.explicit ? t.day : Math.max(t.day, tlDay) } });
  }

  // 진입 시각의 날짜도 타임라인에 맞춘다. 같은 시각이 타임라인에 있으면 그것이
  // 곧 탐정이 들어온 그 순간이므로(대개 발견 항목이다) 날짜를 그쪽에서 가져온다.
  if (entry) {
    const twin = timeline.find((x) => x.t.hour === entry.hour && x.t.min === entry.min);
    if (twin && twin.t.day > entry.day) entry.day = twin.t.day;
  }

  // 「소설이 이 시각을 썼는가」는 장 제목까지 센다 — 타임라인의 시각은 대개
  // 「## 8. 19시 40분」처럼 제목에 놓인다. 위 4번의 `seen`은 제목을 뺀 것이라
  // 여기서 그대로 쓰면 제목에만 있는 시각이 「한 번도 안 썼다」로 나온다.
  const usedClock = new Set(extractTimes(body).map((t) => hhmm(t.hour, t.min)));
  for (const { item, t } of timeline) {
    const key = hhmm(t.hour, t.min);
    if (usedClock.has(key)) continue;
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
      // 사건 번호가 붙은 것만 소설이다 — README.md·time-gaps.md 같은 문서는 건너뛴다.
      .filter((f) => f.endsWith(".md") && /\d{3}/.test(f))
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
