'use client';

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Lightbulb,
  FileCheck2,
  MapPin,
  MessageSquare,
  Minus,
  PencilLine,
  RefreshCcw,
  Search,
  SearchX,
  Send,
  Table2,
  Undo2,
  Target,
  Unlock,
  UserRound,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  downloadPlayLog,
  endInterviewState,
  requestHintForCase,
  resetGameState,
  sendGameMessage,
  toggleBookmarkState,
} from './actions';
import { caseHeaderStyle } from './caseAccent';
import {
  spreadsheetSpeakerLabel,
  spreadsheetTabLabel,
} from './spreadsheetLabels';
import type { ClientIntent } from './game';

type GameData = Awaited<ReturnType<typeof resetGameState>>;
type InputMode = 'play' | 'meta' | 'case_close';
type Tab = 'cards' | 'testimony' | 'people' | 'places' | 'notes';

// Pure chrome for the spreadsheet skin — inert buttons whose only job is to
// look like the thing they are imitating. tabIndex={-1} and aria-hidden keep
// them out of the keyboard order and the accessibility tree, since none of
// them does anything.
const SS_RIBBON_TABS = ['파일', '홈', '삽입', '수식', '데이터', '검토', '보기'];

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'cards', label: '증거' },
  { id: 'testimony', label: '진술' },
  { id: 'people', label: '인물' },
  { id: 'places', label: '장소' },
  { id: 'notes', label: '메모' },
];

const KEY_FIGURE_STATUS_LABEL: Record<string, string> = {
  deceased: '사망 (피해자)',
  missing: '실종',
};

// Korean object/direction particle agreement (을/를, 로/으로), based on
// whether the word's last syllable has a batchim (final consonant).
// Used to phrase a tapped 인물/장소 card as a natural sentence in the
// input box, instead of a bare name the player has to build a sentence
// around themselves.
function hasBatchim(word: string): boolean {
  const lastChar = word.trim().slice(-1);
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function withObjectParticle(word: string): string {
  return `${word}${hasBatchim(word) ? '을' : '를'}`;
}

// Several of this case format's confrontation steps require presenting two
// pieces of evidence together in one action (see player_action fields in
// contradiction_stages), not one card per turn — a real user asked for
// multi-select on evidence cards for exactly this reason. Builds "A와 B를
// 함께 [NPC에게] 제시한다" from however many titles are currently picked;
// a single title falls back to the plain single-card phrasing.
// Kept short on purpose. The full sentence form ("A와 B와 C와 D와 E와 F를 함께
// 서지오에게 제시한다") filled the composer with 78 characters of particles for
// a six-card confrontation, and the player is picking cards, not writing prose.
// The confirmation strip above the input already spells out exactly which cards
// and which target are going to be sent. "제시" still classifies the turn as
// present_evidence (see action-scope.ts), and the leading "N에게" is still what
// conversationTarget reads for the addressee, so nothing downstream changes.
// The sentence the picker writes into the input uses the card CODES
// ("강태선에게 E02 제시"), not the titles. A full title makes the input line
// long enough to wrap on a phone for a single card and unreadable for two or
// three, while the code is what the player already sees on the card and can
// retype by hand. The contents still reach the model in full — the server
// expands the validated intent's ids into presented_cards_this_turn — and the
// confirmation strip right above the input keeps showing the titles, so
// nothing about what was picked becomes guesswork.
function buildPresentSentence(codes: string[], targetName?: string): string {
  const named = codes.filter(Boolean).join(', ');
  if (!named) return '';
  // "…제시"로 끝내면 무엇을 하려는 턴인지가 문장에 안 적힌다. 카드를 고른
  // 플레이어의 의도는 상대 진술을 깨는 것이고, 그 의도가 문장에 있어야
  // 탐정 대사도 대조하는 말투로 나온다. 다른 채워넣기 문장들("…으로
  // 이동한다", "…를 만나러 간다")과 같은 평서형으로 맞춘다.
  const tail = `${named} 제시하며 진술을 무너트린다`;
  return targetName ? `${targetName}에게 ${tail}` : tail;
}

// Shown right above the input as a confirmation strip whenever the draft
// still exactly matches a structured intent an unambiguous UI action
// produced (see fillDraftFromNpcCard/toggleEvidenceSelection) — the player
// should be able to see exactly what will be sent as a hard signal, not just
// trust that the pre-filled sentence matches their intent, and can cancel it
// (reverting to a plain free-text send) with one tap if it doesn't.
function describeClientIntent(intent: ClientIntent, data: GameData): string {
  if (intent.type === 'switch_interview') {
    const npc = data.case.npcs.find((item) => item.id === intent.target_npc_id);
    return `🎯 면담 대상 전환: ${npc?.name || intent.target_npc_id}`;
  }
  const titles = intent.evidence_ids.map((id) => {
    const title = data.case.cards.find((card) => card.id === id)?.title;
    return title ? `${id} ${title}` : id;
  });
  const target = data.state.current_interview
    ? data.case.npcs.find((npc) => npc.id === data.state.current_interview)
        ?.name
    : null;
  return `📎 증거 제시${target ? ` (${target}에게)` : ''}: ${titles.join(', ')}`;
}

function withDirectionParticle(word: string): string {
  const lastChar = word.trim().slice(-1);
  const code = lastChar.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const finalConsonantIndex = (code - 0xac00) % 28;
    if (finalConsonantIndex === 0 || finalConsonantIndex === 8) {
      return `${word}로`;
    }
  }
  return `${word}으로`;
}

// 오프닝 한 장면은 한 덩어리로 읽혀야 한다. 줄마다 <p>를 하나씩 내면
// 스프레드시트 테마에서 그 <p>가 각각 한 행이 되어, 일곱 줄짜리 도입부가
// 행 번호 1~7로 쪼개져 나온다 (structured-master-converter의
// normalizeParagraphs가 마스터의 줄바꿈 하나하나를 문단 경계로 바꿔 놓기
// 때문이다). 장면 하나가 표 일곱 칸으로 흩어지면 읽는 흐름이 끊긴다.
//
// 그래서 문단을 나누되 출력은 한 덩어리로 합친다 — 줄바꿈은 pre-line 으로
// 살리고, 대사 줄만 span 으로 감싸 기존 .intro-dialogue 스타일을 그대로
// 받게 한다.
function CaseIntroContent({ content }: { content: string }) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="case-brief-copy">
      <p>
        {blocks.map((block, index) => {
          const isDialogue =
            /^[“"].+[”"]$/.test(block) || /^['‘].+['’]$/.test(block);

          return (
            <Fragment key={index}>
              {index > 0 && '\n'}
              {isDialogue ? (
                <span className="intro-dialogue">{block}</span>
              ) : (
                block
              )}
            </Fragment>
          );
        })}
      </p>
    </div>
  );
}

// 아직 더 살펴볼 수 있는 대상에 돋보기를 붙인다. 대화로만 굴러가는
// 게임이라 무엇이 상호작용 대상인지가 서술 문장 안에 묻히는데, 마스터가
// 이미 갖고 있는 목록이라 지어낼 여지가 없다. 이미 찾은 것은 서버에서
// 빠지므로, 표시가 남아 있다는 건 아직 볼 게 있다는 뜻이다.
// 마스터의 detail 대상은 수식어와 위치어가 붙은 긴 구다 — "환풍구 스위치와
// 덮개", "낡은 공구함 서랍", "재떨이 주변". 그런데 서술은 핵심 명사만 쓴다 —
// "환풍구는", "낡은 공구함이", "재떨이가". 정확히 일치하는 말을 찾으면 표식이
// 거의 붙지 않는다: CASE302 실플레이에서 실제로 6개 중 1개만 붙었고, 환풍구와
// 문 안쪽은 방을 세 번 드나드는 동안 한 번도 표시되지 않았다.
//
// 그래서 대상의 앞에서부터 단어를 잘라 내려가며 서술에 실제로 있는 가장 긴
// 조각을 찾는다. 앞에서부터인 이유는 한국어 명사구의 핵이 앞에 오기 때문이고
// ("환풍구 스위치와 덮개" → "환풍구"), 뒤에서 자르면 "안쪽"이나 "주변" 같은
// 위치어만 남아 엉뚱한 곳에 밑줄이 간다. 두 글자 미만은 버린다 — "문" 한 글자는
// "문서", "출입문", "문이" 어디에나 걸린다.
//
// 단어 단위로만 자르므로 "재떨"처럼 낱말 중간에서 끊기는 일이 없고, 조사는
// 자연히 밑줄 밖에 남는다("【재떨이】가").
function resolveExaminable(target: string, text: string) {
  const words = target.split(/\s+/).filter(Boolean);
  for (let size = words.length; size >= 1; size -= 1) {
    const candidate = words.slice(0, size).join(' ');
    if (candidate.replace(/\s/g, '').length < 2) continue;
    if (text.includes(candidate)) return candidate;
  }
  return null;
}

function withExaminableMarks(text: string, targets: string[]) {
  if (!targets.length) return text;
  const resolved = [
    ...new Set(
      targets
        .map((target) => resolveExaminable(target, text))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  if (!resolved.length) return text;
  // 긴 것부터 찾아야 "원료 증명 서류함"이 "서류함"으로 잘리지 않는다.
  const sorted = [...resolved].sort((a, b) => b.length - a.length);
  const parts: Array<string | { target: string }> = [];
  let rest = text;
  outer: while (rest) {
    let best: { index: number; target: string } | null = null;
    for (const target of sorted) {
      const index = rest.indexOf(target);
      if (index === -1) continue;
      if (!best || index < best.index) best = { index, target };
    }
    if (!best) break outer;
    if (best.index > 0) parts.push(rest.slice(0, best.index));
    parts.push({ target: best.target });
    rest = rest.slice(best.index + best.target.length);
  }
  if (!parts.length) return text;
  parts.push(rest);
  return parts.map((part, index) =>
    typeof part === 'string' ? (
      part
    ) : (
      <mark className="examinable" key={index} title="더 살펴볼 수 있다">
        {part.target}
      </mark>
    ),
  );
}

function MessageContent({
  content,
  isMeta,
  role,
  npcNames,
  spreadsheet,
  examinableHere = [],
}: {
  content: string;
  isMeta: boolean;
  role: 'assistant' | 'user' | 'detective' | 'jiwoo';
  npcNames: string[];
  spreadsheet: boolean;
  examinableHere?: string[];
}) {
  // The A-column label is text, not styling, so the spreadsheet skin cannot
  // reach it from CSS — and "탐정" sitting under a green Excel ribbon gives
  // the whole disguise away in one glance. See spreadsheetLabels.ts.
  const label = (roleId: string, plain: string) =>
    spreadsheet ? spreadsheetSpeakerLabel(roleId, plain) : plain;
  // Double quotes ("..."/"...") are this app's one consistent spoken-dialogue
  // marker (every dialogue example in the system prompt uses them). Single
  // curly quotes ('...') are never used to mark speech — only to scare-quote
  // a specific written term or label inline in narration (e.g. a logbook
  // entry's exact text, "'고상빈'이 '퇴장'으로 적혀 있으며..."). Splitting on
  // single quotes too used to tear a single flowing narration sentence into
  // one line per quoted name, with the bare commas between them stranded as
  // their own empty-looking lines — a real playtest screenshot showed
  // exactly this on a document-reading turn.
  const quotePattern = /([“"][^”"]+[”"])/g;
  const isDialogueBlock = (text: string) => /^[“"].+[”"]$/.test(text);
  const isSpeakerLabel = (text: string) =>
    npcNames.some((name) => name && text === name);
  const splitReadableText = (text: string) =>
    text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);
  const lines = content.split(/\r?\n/).flatMap((line) => {
    const text = line.trim();
    if (!text) return [''];

    return text
      .replace(quotePattern, '\n$1\n')
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean)
      .flatMap((part) =>
        isDialogueBlock(part) ? [part] : splitReadableText(part),
      );
  });

  if (role === 'user' || role === 'detective' || role === 'jiwoo') {
    return (
      <p className="message-bubble">
        {isMeta && <span className="message-label">{label('gm', 'GM')}</span>}
        {role === 'detective' && (
          <span className="message-label detective-label">
            {label('detective', '탐정')}
          </span>
        )}
        {role === 'jiwoo' && (
          <span className="message-label jiwoo-label">
            {label('jiwoo', '한지우')}
          </span>
        )}
        {content}
      </p>
    );
  }

  return (
    <div className="message-bubble structured-message">
      {isMeta && <span className="message-label">{label('gm', 'GM')}</span>}
      {lines.map((line, index) => {
        const text = line.trim();
        if (!text) {
          return (
            <span aria-hidden="true" className="message-break" key={index} />
          );
        }

        if (isSpeakerLabel(text)) {
          return (
            <span className="message-line speaker-label" key={index}>
              {text}
            </span>
          );
        }

        const isDialogue = isDialogueBlock(text);

        return (
          <span
            className={`message-line ${isDialogue ? 'dialogue' : 'narration'}`}
            key={index}
          >
            {isDialogue ? text : withExaminableMarks(text, examinableHere)}
          </span>
        );
      })}
    </div>
  );
}

function displayCardTitle(
  card: { id: string; title: string; summary: string; source?: string },
  npcs: Array<{ id: string; name: string }>,
) {
  const title = card.title.trim();
  const statementMatch = `${card.id} ${card.title} ${card.source || ''}`.match(
    /S-CH0*([0-9]+)-/i,
  );
  if (statementMatch) {
    const characterNumber = Number(statementMatch[1]);
    const npc = npcs.find((item, index) => {
      const npcNumber = Number(item.id.match(/[0-9]+/)?.[0] || index + 1);
      return npcNumber === characterNumber;
    });

    return npc ? `${npc.name}의 진술` : '관계자 진술';
  }

  const withoutCode = title
    .replace(/^(?:C|CO)[0-9A-Z_-]+(?:\s+|_)+/i, '')
    .replace(/^[A-Z][0-9A-Z_-]+(?:\s+|_)+/i, '')
    .trim();

  return withoutCode || card.summary || '확인한 단서';
}

function displayCardSummary(summary: string) {
  return summary
    .replace(/피해자\s*붕괴/g, '피해자 쓰러짐')
    .replace(/붕괴/g, '쓰러짐');
}

const MATCH_QUALITY_RANK: Record<'hit' | 'held' | 'irrelevant', number> = {
  hit: 2,
  held: 1,
  irrelevant: 0,
};

// Picks the single strongest match_quality across every evidence item
// presented in one turn (a turn can present several cards to the same or
// different targets at once) — 'hit' outranks 'held' outranks
// 'irrelevant', and undefined (an item presented before this field
// existed, or a location target rather than an NPC) is simply skipped.
function bestPresentedMatchQuality(
  items?: Array<{ match_quality?: 'hit' | 'held' | 'irrelevant' }>,
) {
  let best: 'hit' | 'held' | 'irrelevant' | undefined;
  for (const item of items || []) {
    if (!item.match_quality) continue;
    if (
      !best ||
      MATCH_QUALITY_RANK[item.match_quality] > MATCH_QUALITY_RANK[best]
    ) {
      best = item.match_quality;
    }
  }
  return best;
}

function PresentedEvidenceBadge({
  outcome,
  matchQuality,
}: {
  outcome?: 'advanced' | 'no_change';
  matchQuality?: 'hit' | 'held' | 'irrelevant';
}) {
  if (outcome === 'advanced') {
    return (
      <span className="evidence-outcome-badge">
        <Unlock aria-hidden="true" size={13} />
        반응이 달라졌어요
      </span>
    );
  }
  if (matchQuality === 'hit') {
    return (
      <span className="evidence-outcome-badge evidence-outcome-badge--hit">
        <Target aria-hidden="true" size={13} />
        맞는 방향이에요
      </span>
    );
  }
  if (matchQuality === 'held') {
    return (
      <span className="evidence-outcome-badge evidence-outcome-badge--held">
        <Clock aria-hidden="true" size={13} />
        아직 꺼낼 때는 아니에요
      </span>
    );
  }
  if (matchQuality === 'irrelevant') {
    return (
      <span className="evidence-outcome-badge evidence-outcome-badge--neutral">
        <Minus aria-hidden="true" size={13} />
        이 사람에게는 의미 없는 자료예요
      </span>
    );
  }
  if (outcome === 'no_change') {
    return (
      <span className="evidence-outcome-badge evidence-outcome-badge--neutral">
        <Minus aria-hidden="true" size={13} />
        별다른 반응은 없었어요
      </span>
    );
  }
  return null;
}

export function DetectiveApp({
  caseId,
  initialData,
}: {
  caseId: string;
  initialData: GameData;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<Tab>('people');
  const [inputMode, setInputMode] = useState<InputMode>('play');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  // 이 셋은 예전에 useState 초기값에서 곧바로 window를 읽었다. 서버 렌더에서는
  // typeof window === 'undefined'라 언제나 false가 나오고, 클라이언트의 첫
  // 렌더에서는 실제 값이 나오므로 두 트리가 어긋난다 — React 하이드레이션
  // 오류 #418이 거기서 났다. isDesktop은 조건이 matchMedia('(min-width:769px)')라
  // PC로 접속한 사람 전원에게 터진다.
  //
  // 그래서 초기값은 서버가 그리는 값(false)으로 두고, 마운트 뒤 effect에서
  // 실제 값으로 맞춘다. 접힌 도입부나 스프레드시트 테마가 한 프레임 늦게
  // 적용되는 대신 두 트리가 같아진다.
  const [isIntroCollapsed, setIntroCollapsed] = useState(false);
  // 스프레드시트 테마는 PC 전용 선택 스킨 — 좁은 화면에서는 토글 자체를
  // 보여주지 않고, 이미 켜져 있던 상태로 화면이 좁아져도 즉시 꺼지도록
  // isDesktop을 따로 추적해 실제 적용 여부(effectiveSpreadsheetTheme)를
  // 매번 다시 계산한다. globals.css의 [data-theme="spreadsheet"] 룰셋도
  // 769px 미만에서는 아예 존재하지 않도록 미디어 쿼리로 한 번 더 막아뒀다.
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSpreadsheetTheme, setSpreadsheetTheme] = useState(false);
  const effectiveSpreadsheetTheme = isSpreadsheetTheme && isDesktop;

  useEffect(() => {
    const query = window.matchMedia('(min-width: 769px)');
    // 초기값도 여기서 맞춘다 — useState 초기값에서 읽으면 서버 렌더와 어긋난다.
    // react-compiler의 EffectSetState는 "effect 본문에서 setState 하지 말라"고
    // 하지만, 브라우저에만 있는 값을 마운트 뒤에 읽어 오는 것이 바로 그 규칙이
    // 허용하는 "외부 시스템과 동기화"다. 초기값 쪽으로 되돌리면 #418이 다시 난다.
    // oxlint-disable-next-line react/react-compiler
    setIsDesktop(query.matches);
    // oxlint-disable-next-line react/react-compiler
    setSpreadsheetTheme(
      window.localStorage.getItem('detective:theme') === 'spreadsheet',
    );
    const handleChange = (event: MediaQueryListEvent) =>
      setIsDesktop(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // 위와 같은 이유 — 마운트 뒤에 읽는다.
    // oxlint-disable-next-line react/react-compiler
    setIntroCollapsed(
      window.localStorage.getItem(`detective:intro:${caseId}`) === 'collapsed',
    );
  }, [caseId]);

  // A one-shot celebratory pulse on the 대립 counter itself whenever it
  // actually increases — case_progress.contradiction_done was already a
  // real, spoiler-safe global counter (it never breaks down by NPC, so it
  // can't reveal which one holds the contradiction chain), but it just sat
  // there as a small static number with no payoff moment. This ties it to
  // the exact turn that earned it, right when the "반응이 달라졌어요" badge
  // also appears, instead of the player having to separately notice the
  // number changed.
  const [justAdvancedContradiction, setJustAdvancedContradiction] =
    useState(false);
  const prevContradictionDoneRef = useRef<number | null>(null);
  useEffect(() => {
    const done = data.case_progress?.contradiction_done;
    if (done === undefined) return;
    const prev = prevContradictionDoneRef.current;
    prevContradictionDoneRef.current = done;
    if (prev !== null && done > prev) {
      setJustAdvancedContradiction(true);
      const timer = window.setTimeout(
        () => setJustAdvancedContradiction(false),
        1600,
      );
      return () => window.clearTimeout(timer);
    }
  }, [data.case_progress?.contradiction_done]);

  // 카드를 가로지르는 줄은 "방금 막 쓰였다"는 신호라 한 번만 그어야 한다.
  // 계속 붙여 두면 탭을 오갈 때마다 다시 그어진다. 대립 카운터 펄스와 같은
  // 방식으로, 새로 spent가 된 id만 잠깐 표시했다가 뗀다.
  const spentCardIds = useMemo(
    () =>
      Object.entries(data.evidence_stage_markers || {})
        .filter(([, marker]) => marker === 'spent')
        .map(([id]) => id)
        .sort(),
    [data.evidence_stage_markers],
  );
  // 사건의 전말은 종결 직후 대화창에 같이 쏟지 않고 버튼 뒤에 둔다 —
  // 자백과 마지막 대화를 읽는 자리에 "책임자/수법/동기" 목록이 붙으면
  // 엔딩이 장면이 아니라 보고서로 읽힌다.
  const [isTruthOpen, setTruthOpen] = useState(false);
  useEffect(() => {
    if (!isTruthOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTruthOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isTruthOpen]);

  const [newlySpentCardIds, setNewlySpentCardIds] = useState<string[]>([]);
  const prevSpentCardIdsRef = useRef<string[] | null>(null);
  useEffect(() => {
    const prev = prevSpentCardIdsRef.current;
    prevSpentCardIdsRef.current = spentCardIds;
    if (!prev) return;
    const added = spentCardIds.filter((id) => !prev.includes(id));
    if (!added.length) return;
    setNewlySpentCardIds(added);
    const timer = window.setTimeout(() => setNewlySpentCardIds([]), 1200);
    return () => window.clearTimeout(timer);
  }, [spentCardIds]);

  function toggleSpreadsheetTheme() {
    setSpreadsheetTheme((current) => {
      const next = !current;
      window.localStorage.setItem('detective:theme', next ? 'spreadsheet' : '');
      return next;
    });
  }
  // Mobile-only bottom sheet for the 증거/인물/장소/타임라인 notebook — see
  // .notebook-summary-bar / .notebook.sheet-open in globals.css. Has no
  // effect above the 860px breakpoint, where the notebook stays an
  // always-visible sidebar.
  const [isNotebookOpen, setNotebookOpen] = useState(false);
  // 새로 시작 sat directly under 사건 종결/플레이로그 다운로드 as the only solid,
  // full-weight button in that column — the heaviest target in the sidebar was
  // also the only irreversible one, and a user reported hitting it by mistake.
  // It is now a quiet secondary button, set apart, and it asks first.
  const [isResetConfirmOpen, setResetConfirmOpen] = useState(false);
  // 스프레드시트 위장에서 '파일' 탭이 실제로 열리는 메뉴. 사건 종결 /
  // 플레이로그 / 새로 시작은 원래 정보판 맨 아래 큰 버튼 셋이었는데,
  // 스프레드시트에 둥근 대형 버튼은 없어서 위장이 거기서 깨진다. 소품으로
  // 놀고 있던 파일 탭에 옮기면 소품이 기능이 되고 버튼도 사라진다.
  const [isFileMenuOpen, setFileMenuOpen] = useState(false);
  // Evidence card ids picked for a combined "present together" action — see
  // buildPresentSentence. Keyed by card.id (stable), not the display title
  // (titles can collide/change per NPC context via displayCardTitle).
  // Cleared on submit, on any close of the notebook sheet, and whenever the
  // player edits the draft by hand, so a stale selection never silently
  // carries into a later, unrelated turn.
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  // A structured signal for the one turn that exactly matches an
  // unambiguous UI action (an evidence multi-select or an NPC "만나러 간다"
  // card click), paired with the exact draft text it produced
  // (pendingIntentText). Sent to the server alongside the message only if
  // the player still sends that exact text unedited — see submit(). Typing
  // anything by hand clears it, so a hand-edited message never carries a
  // stale structured claim about what the player meant.
  const [pendingIntent, setPendingIntent] = useState<ClientIntent | null>(null);
  const [pendingIntentText, setPendingIntentText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isExportingLog, startLogExport] = useTransition();
  const messagesRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);
  // Compared against full_dialogue_log[0] (the actual persisted opening
  // line, never trimmed) rather than the live data.case.public_intro:
  // if a case's public_intro text is edited after a session already
  // started, recent_conversation[0] still holds whatever was shown at
  // session start, which no longer matches the now-current public_intro.
  // Comparing against the current text broke this dedup exactly then —
  // the 사건의 시작 panel would show the updated intro while the chat log
  // showed the same stale entry a second time, uncollapsed.
  const originalIntro = data.state.full_dialogue_log[0];
  useEffect(() => {
    if (!isFileMenuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFileMenuOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isFileMenuOpen]);

  const displayedConversation = useMemo(
    () =>
      data.state.recent_conversation.filter(
        (item, index) =>
          !(
            index === 0 &&
            item.role === 'assistant' &&
            originalIntro?.role === 'assistant' &&
            item.content === originalIntro.content
          ),
      ),
    [originalIntro, data.state.recent_conversation],
  );

  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [displayedConversation]);

  // 장소 탭은 스스로 열리지 않는다. 방을 옮길 때도, 새 장소가 풀릴 때도
  // 시트가 올라와 방금 읽은 장면을 덮으면서 흐름이 끊겼다 — 어디로 갈지는
  // 플레이어가 정하는 것이고, 갈 곳이 늘었다는 것도 장면이 말해 준다.
  // 화면이 대신 알릴 일이 아니다. 그래서 이 함수를 부르는 곳은 플레이어의
  // 행동 하나뿐이다: submit()에서 "지도"를 친 경우. (탭을 직접 누르는
  // 길은 노트북 자체가 갖고 있다.) 상태 변화를 지켜보다 여는 장치는
  // 없앴다.
  function openMapTab() {
    setActiveTab('places');
    setNotebookOpen(true);
  }

  // A stale evidence selection or interview-target intent from before the
  // scene changed (a real risk raised during review — the sheet can be
  // closed via the backdrop/X button without clearing it, then the player
  // moves or switches who they're talking to before reopening it) should
  // never carry into a scene it no longer applies to. Adjusted during
  // render against a snapshot (React's own "did a prop/state value change"
  // shape, which costs no extra render pass the way a useEffect would), rather
  // than in a useEffect.
  const [sceneKey, setSceneKey] = useState(() => ({
    location: data.state.current_location,
    interview: data.state.current_interview,
  }));
  if (
    sceneKey.location !== data.state.current_location ||
    sceneKey.interview !== data.state.current_interview
  ) {
    setSceneKey({
      location: data.state.current_location,
      interview: data.state.current_interview,
    });
    setSelectedEvidenceIds([]);
    setPendingIntent(null);
    setPendingIntentText('');
  }

  // input_tokens는 캐시 적중분까지 정가로 함께 센 값이다. 이 앱은 프롬프트
  // 앞쪽 대부분(시스템 규칙 + append-only 대화 창)이 매 턴 그대로라 그 몫이
  // 큰데, 합계 하나만 띄우면 그게 전부 새로 낸 토큰인 것처럼 읽힌다. 실제로
  // 값이 매겨지는 건 캐시를 뺀 쪽이므로 그 숫자를 앞에 세우고, 캐시로 덮인
  // 몫은 비율과 함께 괄호에 남긴다.
  const usage = useMemo(() => {
    const { input_tokens, cached_input_tokens, output_tokens } =
      data.state.api_usage;
    const fresh = Math.max(0, input_tokens - cached_input_tokens);
    const hitRate = input_tokens
      ? Math.round((cached_input_tokens / input_tokens) * 100)
      : 0;
    const cachePart = cached_input_tokens
      ? ` (+캐시 ${cached_input_tokens.toLocaleString()}, ${hitRate}%)`
      : '';
    return `${fresh.toLocaleString()}${cachePart} / ${output_tokens.toLocaleString()}`;
  }, [data.state.api_usage]);

  function tabCount(tab: Tab): number {
    switch (tab) {
      case 'cards':
        return data.acquired_cards.filter(Boolean).length;
      case 'testimony':
        return data.heard_statements.length;
      case 'people':
        return data.case.npcs.length;
      case 'places':
        return data.case.locations.length;
      case 'notes':
        return data.state.bookmarks.length;
    }
  }

  function submit(messageOverride?: string, modeOverride?: InputMode) {
    const message = (messageOverride ?? draft).trim();
    const mode = modeOverride ?? inputMode;
    if (!message || isPending) return;

    // "지도" as a meta question is answered entirely from state already on
    // the client (the same 장소 map rendered below) — spending a model call
    // to describe it back in prose would be slower and less useful than
    // just showing it.
    if (mode === 'meta' && /지도/.test(message)) {
      if (!messageOverride) setDraft('');
      setError('');
      openMapTab();
      return;
    }

    // Only attach the structured intent if the player is sending exactly the
    // text the UI action generated — any hand edit means we can no longer be
    // sure the click's original meaning still applies, so it falls back to
    // ordinary free-text inference like any other typed message.
    const intentToSend =
      !messageOverride && pendingIntent && message === pendingIntentText
        ? pendingIntent
        : null;

    if (!messageOverride) setDraft('');
    setSelectedEvidenceIds([]);
    setPendingIntent(null);
    setPendingIntentText('');
    setError('');
    setData((current) => ({
      ...current,
      state: {
        ...current.state,
        recent_conversation: [
          ...current.state.recent_conversation,
          { role: 'user' as const, content: message, mode },
        ].slice(-30),
      },
    }));

    startTransition(async () => {
      try {
        const result = await sendGameMessage(
          caseId,
          message,
          mode,
          intentToSend,
        );
        setData(result);
        // 사건 종결(case_close)은 게임서버 쪽에서 조건 없이 곧장 엔딩씬을
        // 출력한다(game.ts: 진행도 게이트 없이 항상 case_complete_candidate).
        // 그러니 플레이어가 따로 "플레이로그 다운로드" 버튼을 누르지 않아도
        // 엔딩까지 담긴 로그를 바로 받아갈 수 있게 자동으로 내려받는다.
        // 실패해도 수동 다운로드 버튼이 남아 있으니 조용히 넘어간다.
        if (mode === 'case_close') {
          try {
            await triggerLogDownload();
          } catch {
            // 수동 다운로드 버튼으로 대체 가능 — 여기서 에러를 띄우지 않는다.
          }
        }
      } catch {
        setError('메시지를 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      }
    });
  }

  // Fills the draft rather than submitting outright — tapping a person/place
  // card only says who or where the player is interested in, not a fully-
  // formed action. Left in the
  // box so the player can still narrow it down (a specific question, a
  // specific thing to look at) before sending, or send as-is to just go
  // there / start the interview.
  //
  // On mobile, a card tap only ever happens from inside the notebook
  // bottom sheet — without closing it here, the filled draft lands behind
  // the still-open sheet and the player has no way to see or send it
  // without first closing the sheet themselves. Closing it here reconnects
  // "pick a card" directly to "see it in the input, ready to send."
  function fillDraftFromCard(text: string) {
    // Tapping a card whose sentence is already sitting untouched in the
    // draft is a deselect, not a re-select — same click-again-to-cancel
    // behavior as toggleEvidenceSelection/fillDraftFromNpcCard, for the
    // remaining card type (장소) that only ever prefills a plain sentence.
    if (draft === text) {
      setDraft('');
      setNotebookOpen(false);
      draftInputRef.current?.focus();
      return;
    }

    setInputMode('play');
    setDraft(text);
    setSelectedEvidenceIds([]);
    setPendingIntent(null);
    setPendingIntentText('');
    setNotebookOpen(false);
    draftInputRef.current?.focus();
  }

  // Same as fillDraftFromCard, but for the one card tap (an NPC) that maps to
  // an unambiguous structured intent: the player picked this exact person
  // from a list, so there's no need to re-guess who they mean from the
  // "만나러 간다" text afterwards — see ClientIntent/detectInterviewTargetDrift
  // in game.ts. pendingIntentText must match verbatim what submit() actually
  // sends, or the intent is dropped there as a hand-edited message.
  function fillDraftFromNpcCard(npc: { id: string; name: string }) {
    // Tapping the same NPC that's already the pending target (the exact
    // prefilled sentence still sitting untouched in the draft) is a
    // deselect, not a re-select — mirrors toggleEvidenceSelection's
    // click-again-to-cancel behavior for evidence cards.
    const alreadyPending =
      pendingIntent?.type === 'switch_interview' &&
      pendingIntent.target_npc_id === npc.id &&
      draft === pendingIntentText;
    if (alreadyPending) {
      setDraft('');
      setPendingIntent(null);
      setPendingIntentText('');
      setNotebookOpen(false);
      draftInputRef.current?.focus();
      return;
    }

    const text = `${withObjectParticle(npc.name)} 만나러 간다`;
    setInputMode('play');
    setDraft(text);
    setSelectedEvidenceIds([]);
    setPendingIntent({ type: 'switch_interview', target_npc_id: npc.id });
    setPendingIntentText(text);
    setNotebookOpen(false);
    draftInputRef.current?.focus();
  }

  // Several confrontation steps require presenting two pieces of evidence
  // together in one action, not one card per turn — a user asked for
  // multi-select on evidence cards specifically for this. Unlike
  // fillDraftFromCard, this does not close the notebook: the player keeps
  // picking cards, watching the draft update after each tap, until they
  // are ready to close the sheet themselves and send. Selection is keyed by
  // card.id (stable) rather than the display title, which can collide.
  function toggleEvidenceSelection(cardId: string) {
    setInputMode('play');
    setSelectedEvidenceIds((current) => {
      const next = current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId];
      const interview = data.state.current_interview
        ? data.case.npcs.find((npc) => npc.id === data.state.current_interview)
        : null;
      const sentence = buildPresentSentence(next, interview?.name);
      setDraft(sentence);
      if (next.length > 0) {
        setPendingIntent({ type: 'present_evidence', evidence_ids: next });
        setPendingIntentText(sentence);
      } else {
        setPendingIntent(null);
        setPendingIntentText('');
      }
      return next;
    });
  }

  // Closing the sheet without picking anything (backdrop tap, X button) —
  // as opposed to fillDraftFromCard/fillDraftFromNpcCard, which close it as
  // part of actually making a selection — should drop any in-progress
  // evidence selection rather than leave it visually selected and stale the
  // next time the sheet opens.
  function closeNotebook() {
    setNotebookOpen(false);
    setSelectedEvidenceIds([]);
    setPendingIntent(null);
    setPendingIntentText('');
  }

  function toggleIntro() {
    setIntroCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        `detective:intro:${caseId}`,
        next ? 'collapsed' : 'expanded',
      );
      return next;
    });
  }

  async function triggerLogDownload() {
    const log = await downloadPlayLog(caseId);
    const blob = new Blob([log.content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = log.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // A user reported accidentally hitting 새로 시작 and losing their
  // progress — resetting wipes the saved state with no undo, so it now
  // downloads the play log first as a safety net. Best-effort: a failed
  // download must not block the reset the player actually asked for.
  useEffect(() => {
    if (!isResetConfirmOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setResetConfirmOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isResetConfirmOpen]);

  function reset() {
    if (isPending) return;
    setResetConfirmOpen(false);
    setError('');
    startTransition(async () => {
      try {
        await triggerLogDownload();
      } catch {
        // Reset proceeds regardless — see comment above.
      }
      const fresh = await resetGameState(caseId);
      setData(fresh);
      setActiveTab('cards');
    });
  }

  // 막혔을 때 누르는 버튼. 서버가 상태를 보고 한 칸만 알려준다 — 모델을
  // 부르지 않으므로 즉시 돌아오고, 카드나 단계를 주지도 않는다.
  const [hint, setHint] = useState<string | null>(null);
  const [isHinting, setIsHinting] = useState(false);
  async function askHint() {
    if (isHinting) return;
    setIsHinting(true);
    try {
      const result = await requestHintForCase(caseId);
      setHint(result.text);
    } catch {
      setHint('지금은 확인할 수 없습니다. 잠시 뒤 다시 눌러 주세요.');
    } finally {
      setIsHinting(false);
    }
  }

  function downloadLog() {
    if (isExportingLog) return;
    setError('');
    startLogExport(async () => {
      try {
        await triggerLogDownload();
      } catch {
        setError(
          '플레이로그를 내려받지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
        );
      }
    });
  }

  function closeCase() {
    if (isPending || data.state.case_status === 'complete') return;
    // When to close is entirely the player's call — there's no completeness
    // gate here or on the server. A typed theory rides along if there is
    // one, but closing with nothing typed just asks to see how it ends.
    const deduction = draft.trim();
    setDraft('');
    submit(
      deduction ? `${deduction} 사건을 종결한다.` : '사건을 종결한다.',
      'case_close',
    );
  }

  const statusRowNpc = data.state.current_interview
    ? data.case.npcs.find((npc) => npc.id === data.state.current_interview)
    : null;

  function endInterview() {
    if (isPending) return;
    startTransition(async () => {
      const fresh = await endInterviewState(caseId);
      setData(fresh);
    });
  }

  function toggleBookmark(
    content: string,
    role: 'assistant' | 'jiwoo' | 'detective' | 'user',
  ) {
    if (isPending) return;
    startTransition(async () => {
      const fresh = await toggleBookmarkState(caseId, content, role);
      setData(fresh);
    });
  }

  function isBookmarked(content: string, role: string) {
    return data.state.bookmarks.some(
      (item) => item.role === role && item.content === content,
    );
  }

  // The formula bar shows whatever the "selected cell" holds, which here is
  // the last line on screen — a real spreadsheet behavior that also happens to
  // put the most recent line back in front of the player.
  const lastLine =
    displayedConversation.at(-1)?.content.trim().split('\n')[0] ?? '';
  const selectedCellRef = `A${10 + displayedConversation.length}`;

  const isCaseComplete = data.state.case_status === 'complete';
  // A completed case reads as fully sealed again, so the band runs the whole
  // way and the seal sits at the end rather than wherever the last save left
  // the counters. No save at all means 0 — an untouched, unbroken band.
  const headerProgressPercent = isCaseComplete
    ? 100
    : (data.case_progress?.overall_percent ?? 0);

  return (
    <main
      className="app-shell"
      data-theme={effectiveSpreadsheetTheme ? 'spreadsheet' : undefined}
      style={caseHeaderStyle(data.case.case_id, headerProgressPercent)}
    >
      {effectiveSpreadsheetTheme && (
        <div className="ss-titlebar">
          <span className="ss-titlebar__case">
            {data.case.case_id.toLowerCase()}.{data.case.title}
          </span>
        </div>
      )}
      <header className={`topbar${isCaseComplete ? ' case-complete' : ''}`}>
        {effectiveSpreadsheetTheme && (
          <>
            <div className="ss-ribbon-tabs">
              {SS_RIBBON_TABS.map((name) =>
                name === '파일' ? (
                  <button
                    aria-expanded={isFileMenuOpen}
                    aria-haspopup="menu"
                    className={isFileMenuOpen ? 'active' : ''}
                    key={name}
                    onClick={() => setFileMenuOpen((open) => !open)}
                    type="button"
                  >
                    {name}
                  </button>
                ) : (
                  // 나머지는 소품이다. 키보드 순서와 접근성 트리에서 빼둔다.
                  <button
                    aria-hidden="true"
                    className={name === '홈' ? 'active' : ''}
                    key={name}
                    tabIndex={-1}
                    type="button"
                  >
                    {name}
                  </button>
                ),
              )}
            </div>
            {isFileMenuOpen && (
              <>
                <button
                  aria-label="메뉴 닫기"
                  className="ss-menu-scrim"
                  onClick={() => setFileMenuOpen(false)}
                  type="button"
                />
                <div className="ss-file-menu" role="menu">
                  <button
                    disabled={isPending || isCaseComplete}
                    onClick={() => {
                      setFileMenuOpen(false);
                      closeCase();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    {isCaseComplete ? '사건 종결 완료' : '사건 종결'}
                  </button>
                  <button
                    disabled={isExportingLog}
                    onClick={() => {
                      setFileMenuOpen(false);
                      downloadLog();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    내보내기 — 플레이로그
                  </button>
                  <span className="ss-file-menu-divider" />
                  <button
                    disabled={isPending}
                    onClick={() => {
                      setFileMenuOpen(false);
                      setResetConfirmOpen(true);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    새로 시작
                  </button>
                </div>
              </>
            )}
          </>
        )}
        <div className="topbar-main">
          <div className="topbar-left">
            <Link
              aria-label="사건 목록으로 돌아가기"
              className="back-button"
              href="/"
            >
              <ArrowLeft aria-hidden="true" size={18} />
            </Link>
            {!effectiveSpreadsheetTheme && (
              <div className="case-heading">
                <p>{data.case.case_id}</p>
                <h1>{data.case.title}</h1>
              </div>
            )}
            <div className="status-row">
              {/* 이 사건의 "지금". 오늘/어제/어젯밤이 전부 이 시각을 기준으로
                  말해지므로, 플레이어도 그 기준을 계속 보고 있어야 인물들의
                  시각 진술을 서로 맞춰볼 수 있다. */}
              {data.case.detective_entry_time && (
                <span className="entry-time">
                  <Clock aria-hidden="true" size={16} />
                  {data.case.detective_entry_time}
                </span>
              )}
              <span>
                <MapPin aria-hidden="true" size={16} />
                {data.current_location.name}
              </span>
              {statusRowNpc && (
                <span>
                  <UserRound aria-hidden="true" size={16} />
                  {statusRowNpc.name}
                  <button
                    aria-label="면담 종료"
                    className="status-row-end-interview"
                    onClick={endInterview}
                    type="button"
                  >
                    <X aria-hidden="true" size={12} />
                  </button>
                </span>
              )}
              {/* 증거 N/M · 대립 N/M moved here when the progress bar row it
                  used to live in was replaced by the seal band. The band says
                  "how far", these say "how far in what" — and the 대립 pulse is
                  the only on-screen beat that marks a contradiction landing, so
                  neither is something the band can absorb. */}
              {data.case_progress && !isCaseComplete && (
                <span className="status-row-counts">
                  증거 {data.case_progress.evidence_done}/
                  {data.case_progress.evidence_total} ·{' '}
                  <span
                    className={
                      justAdvancedContradiction
                        ? 'contradiction-count contradiction-count--pulse'
                        : 'contradiction-count'
                    }
                  >
                    대립 {data.case_progress.contradiction_done}/
                    {data.case_progress.contradiction_total}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="topbar-right">
            <strong className="status-badge">
              {data.state.case_status === 'complete'
                ? '종료'
                : data.case.status_label}
              {data.case_progress &&
                data.state.case_status !== 'complete' && (
                  // The one place the percentage is still a number. The
                  // seal band along the header's bottom edge shows the same
                  // value as position, which is easier to feel than to read
                  // off — this keeps the exact figure available next to it.
                  <span className="status-badge-progress">
                    {` ${data.case_progress.overall_percent}%`}
                  </span>
                )}
            </strong>
            {isDesktop && (
              <button
                aria-label={
                  isSpreadsheetTheme
                    ? '스프레드시트 테마 끄기'
                    : '스프레드시트 테마 켜기'
                }
                aria-pressed={isSpreadsheetTheme}
                className="ss-theme-toggle meta-toggle"
                onClick={toggleSpreadsheetTheme}
                type="button"
              >
                <Table2 aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        </div>
        {/* The band along the bottom edge is the progress readout now, so it
            needs the semantics the removed <progress> element carried. */}
        <span
          aria-label="사건 진행률"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={headerProgressPercent}
          className="case-seal"
          role="progressbar"
        />
      </header>

      {effectiveSpreadsheetTheme && (
        <>
          <div className="ss-toolbar">
            {/* 되돌리기 자리에 앉은 진짜 버튼. 스프레드시트에 당연히 있는
                위치라 눌러서 목록으로 나가도 어색하지 않다. */}
            <Link
              aria-label="사건 목록으로 돌아가기"
              className="back-button"
              href="/"
            >
              <Undo2 aria-hidden="true" size={14} />
            </Link>
            <span className="divider" />
            <span aria-hidden="true" className="ss-field">
              맑은 고딕
            </span>
            <span aria-hidden="true" className="ss-field">
              11
            </span>
            <span className="divider" />
            <span aria-hidden="true">
              <strong>B</strong> <em>I</em> <u>U</u>
            </span>
            <span className="divider" />
            <span aria-hidden="true">정렬</span>
            <span aria-hidden="true">나누기</span>
            {/* 켜져 있는 상태로 둔다. 오른쪽 시트의 행 높이가 제각각인
                이유를 화면 안에서 설명해 주는 소품이다 — 엑셀도 자동
                줄바꿈을 켜면 정확히 그렇게 된다. */}
            <span aria-hidden="true" className="active">
              줄 바꿈
            </span>
            <span aria-hidden="true" className="active">
              필터
            </span>
            <span className="divider" />
            {/* The only way back out of the skin, so it cannot live in the
                parts of the header this theme hides. */}
            <button
              aria-label="스프레드시트 테마 끄기"
              className="ss-theme-toggle meta-toggle"
              onClick={toggleSpreadsheetTheme}
              type="button"
            >
              <Table2 aria-hidden="true" size={14} />
            </button>
          </div>

          <div className="ss-formula-bar">
            {/* 엑셀의 이름 상자는 셀 주소만이 아니라 명명된 범위의
                이름도 띄운다. 현재 위치가 거기 있는 건 정품 동작이고,
                명명된 범위에 공백을 못 쓴다는 제약이 '회전 복도' →
                '회전복도'로 붙여 쓰게 만들어 오히려 위장을 돕는다. */}
            <span className="ss-name-box" title={data.current_location.name}>
              {data.current_location.name
                ? data.current_location.name.replace(/\s/g, '')
                : selectedCellRef}
            </span>
            <span aria-hidden="true" className="fx">
              fx
            </span>
            <span className="divider" />
            <span aria-hidden="true" className="value">
              {lastLine}
            </span>
          </div>
        </>
      )}

      <section className="workspace" aria-label="추리 게임">
        <section className="chat-pane" aria-label="대화창">
          {effectiveSpreadsheetTheme && (
            <div className="ss-col-header" aria-hidden="true">
              <span />
              <span>A</span>
              <span>B</span>
            </div>
          )}
          <section
            className={`case-brief ${isIntroCollapsed ? 'collapsed' : ''}`}
            aria-label="사건의 시작"
          >
            <button
              aria-expanded={!isIntroCollapsed}
              className="case-brief-toggle"
              onClick={toggleIntro}
              type="button"
            >
              <span>사건의 시작</span>
              {isIntroCollapsed ? (
                <ChevronDown aria-hidden="true" size={16} />
              ) : (
                <ChevronUp aria-hidden="true" size={16} />
              )}
            </button>
            {!isIntroCollapsed && (
              <CaseIntroContent content={data.case.public_intro} />
            )}
            {/* 지금 포맷 기준으로 이 마스터에 빠진 것. 플레이를 막지 않고
                알려만 준다 — 서버의 masterFormatWarnings 주석 참고. */}
            {!isIntroCollapsed && data.case.format_warnings?.length ? (
              <ul className="format-warnings">
                {data.case.format_warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="messages" ref={messagesRef}>
            {displayedConversation.map((item, index) => (
              <div
                className={`message ${item.role} ${item.mode === 'meta' ? 'meta' : ''}`}
                key={`${item.role}-${index}`}
              >
                {item.role === 'jiwoo' && (
                  <span aria-label="한지우" className="avatar jiwoo-avatar">
                    <PencilLine size={15} />
                  </span>
                )}
                {item.role === 'detective' && (
                  <span className="avatar detective-avatar" aria-hidden="true">
                    <Search size={15} />
                  </span>
                )}
                <div className="message-column">
                  <div className="message-content-row">
                    <MessageContent
                      content={item.content}
                      isMeta={item.mode === 'meta'}
                      role={item.role}
                      examinableHere={data.examinable_here}
                      npcNames={data.case.npcs.map((npc) => npc.name)}
                      spreadsheet={effectiveSpreadsheetTheme}
                    />
                    {item.role !== 'user' && (
                      <button
                        aria-label={
                          isBookmarked(item.content, item.role)
                            ? '메모장에서 빼기'
                            : '메모장에 저장'
                        }
                        aria-pressed={isBookmarked(item.content, item.role)}
                        className={`bookmark-toggle${isBookmarked(item.content, item.role) ? ' bookmarked' : ''}`}
                        onClick={() => toggleBookmark(item.content, item.role)}
                        type="button"
                      >
                        {isBookmarked(item.content, item.role) ? (
                          <BookmarkCheck aria-hidden="true" size={15} />
                        ) : (
                          <Bookmark aria-hidden="true" size={15} />
                        )}
                      </button>
                    )}
                  </div>
                  {/* 이 방은 더 뒤질 것이 없다. 방에 막 들어왔거나 방금
                      마지막 하나를 찾은 턴에만 서버가 붙인다(Dialogue의
                      location_cleared 주석 참고) — 아무것도 못 찾고 방을
                      나가면서 뭘 놓친 건지 아닌지를 모르는 것이 실제
                      불만이었다. 남은 개수는 싣지 않으므로 아직 남은 방은
                      아무 표시도 없다. */}
                  {item.location_cleared && (
                    <span className="evidence-outcome-badge evidence-outcome-badge--cleared">
                      <SearchX aria-hidden="true" size={13} />
                      {item.location_cleared === 'none'
                        ? '이 장소에는 살펴볼 것이 없다'
                        : '이 장소에서 살펴볼 것은 다 봤다'}
                    </span>
                  )}
                  {item.acquired_cards?.map((cardId) => {
                    const card = data.case.cards.find((c) => c.id === cardId);
                    return (
                      <span
                        className="evidence-outcome-badge evidence-outcome-badge--acquired"
                        key={cardId}
                      >
                        <FileCheck2 aria-hidden="true" size={13} />
                        {cardId}{' '}
                        {card ? displayCardTitle(card, data.case.npcs) : ''}{' '}
                        획득
                      </span>
                    );
                  })}
                  <PresentedEvidenceBadge
                    outcome={item.presented_evidence_outcome}
                    matchQuality={bestPresentedMatchQuality(
                      item.presented_evidence,
                    )}
                  />
                </div>
              </div>
            ))}
            {isPending && (
              <div className="message assistant pending">
                <span className="avatar" aria-hidden="true">
                  <PencilLine size={15} />
                </span>
                <p className="message-bubble">
                  한지우가 기록을 훑고 있습니다...
                </p>
              </div>
            )}
          </div>

          {error && <p className="error-line">{error}</p>}

          {pendingIntent && draft === pendingIntentText && (
            <div className="intent-confirm-strip">
              <span>{describeClientIntent(pendingIntent, data)}</span>
              <button
                aria-label="구조화 액션 취소하고 일반 텍스트로 보내기"
                onClick={() => {
                  setPendingIntent(null);
                  setPendingIntentText('');
                }}
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
          )}

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <button
              aria-label={
                inputMode === 'play' ? 'GM 모드로 전환' : '수사 모드로 전환'
              }
              aria-pressed={inputMode === 'meta'}
              className={`mode-toggle ${inputMode === 'meta' ? 'meta' : ''}`}
              disabled={isPending}
              onClick={() =>
                setInputMode((current) =>
                  current === 'play' ? 'meta' : 'play',
                )
              }
              type="button"
            >
              {inputMode === 'play' ? (
                <Search aria-hidden="true" size={18} />
              ) : (
                <MessageSquare aria-hidden="true" size={18} />
              )}
            </button>
            <input
              autoComplete="off"
              disabled={isPending}
              onChange={(event) => {
                setDraft(event.target.value);
                if (event.target.value !== pendingIntentText) {
                  setPendingIntent(null);
                  setPendingIntentText('');
                }
              }}
              placeholder={
                inputMode === 'play'
                  ? '무엇을 할까?'
                  : 'GM에게 무엇을 물어볼까?'
              }
              ref={draftInputRef}
              value={draft}
            />
            <button
              aria-label="메시지 전송"
              disabled={isPending || !draft.trim()}
              type="submit"
            >
              <Send aria-hidden="true" size={18} />
            </button>
          </form>
        </section>

        <button
          aria-expanded={isNotebookOpen}
          className="notebook-summary-bar"
          onClick={() => setNotebookOpen(true)}
          type="button"
        >
          {/* Built from the same `tabs` array the sheet's tablist uses, so a
              tab can never again exist in the sheet without showing here —
              this bar was still listing the hardcoded 인물/증거/장소 from
              before 진술 landed, and on a phone that
              bar is the only hint of what the sheet holds. */}
          <span className="notebook-summary-counts">
            {tabs.map((tab) => (
              <span key={tab.id}>
                {tab.label}{' '}
                {tab.id === 'cards' && data.case_progress
                  ? `${data.case_progress.evidence_done}/${data.case_progress.evidence_total}`
                  : tabCount(tab.id)}
              </span>
            ))}
          </span>
          <ChevronUp aria-hidden="true" size={16} />
        </button>

        {isNotebookOpen && (
          <div
            aria-hidden="true"
            className="sheet-backdrop"
            onClick={closeNotebook}
          />
        )}

        <aside
          aria-label="사건 수첩"
          className={`notebook ${isNotebookOpen ? 'sheet-open' : ''}`}
        >
          {/* 분할 창은 원래 각 영역이 서로 다른 위치를 보여주는 기능이라,
              왼쪽이 A·B열이고 오른쪽이 J·K·L열인 게 정상이다. */}
          {effectiveSpreadsheetTheme && (
            <div className="ss-col-header" aria-hidden="true">
              <span />
              <span>J</span>
              <span>K</span>
              <span>L</span>
            </div>
          )}
          <div className="notebook-sheet-handle">
            <span>사건 수첩</span>
            <button
              aria-label="사건 수첩 닫기"
              className="sheet-close"
              onClick={closeNotebook}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <div
            className={`tabs ${effectiveSpreadsheetTheme ? 'ss-sheet-tabs' : ''}`}
            role="tablist"
          >
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={[
                  activeTab === tab.id ? 'active' : '',
                  effectiveSpreadsheetTheme ? 'ss-sheet-tab' : '',
                  effectiveSpreadsheetTheme && activeTab === tab.id
                    ? 'ss-sheet-tab--active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {effectiveSpreadsheetTheme ? (
                  // 시트 이름에 괄호 숫자가 붙어 있으면 시트로 안 읽힌다.
                  // 숫자는 상태 표시줄의 '개수:'가 맡는다.
                  spreadsheetTabLabel(tab.id, tab.label)
                ) : (
                  <>
                    {tab.label} ({tabCount(tab.id)})
                  </>
                )}
              </button>
            ))}
          </div>

          {/* A user explicitly asked to keep the spreadsheet theme's chat
              styling but drop the grid/table look for the notebook sheet
              specifically — the card-list NotebookPanel now renders
              regardless of theme; only the chat pane's own [data-theme]
              CSS still varies. */}
          <NotebookPanel
            data={data}
            newlySpentCardIds={newlySpentCardIds}
            draft={draft}
            onSelectNpc={fillDraftFromNpcCard}
            onSelectPrompt={fillDraftFromCard}
            onToggleBookmark={toggleBookmark}
            onToggleEvidence={toggleEvidenceSelection}
            pendingInterviewTargetId={
              pendingIntent?.type === 'switch_interview' &&
              draft === pendingIntentText
                ? pendingIntent.target_npc_id
                : null
            }
            onEndInterview={endInterview}
            selectedEvidenceIds={selectedEvidenceIds}
            tab={activeTab}
          />

          <footer className="meter">
            <span>토큰 사용량</span>
            <strong>{usage}</strong>
          </footer>

          {!effectiveSpreadsheetTheme && (
            <>
              <button
                className="case-close-button"
                disabled={isPending || data.state.case_status === 'complete'}
                onClick={closeCase}
                type="button"
              >
                {data.state.case_status === 'complete'
                  ? '사건 종결 완료'
                  : '사건 종결'}
              </button>
              {data.state.case_status === 'complete' &&
                data.state.case_truth && (
                  <button
                    className="case-truth-button"
                    onClick={() => setTruthOpen(true)}
                    type="button"
                  >
                    <FileCheck2 aria-hidden="true" size={16} />
                    사건의 전말
                  </button>
                )}
              <button
                className="hint-button"
                disabled={isHinting || data.state.case_status === 'complete'}
                onClick={askHint}
                type="button"
              >
                <Lightbulb aria-hidden="true" size={16} />
                {isHinting ? '보는 중…' : '막혔어요'}
              </button>
              {hint && (
                <p className="hint-text" role="status">
                  {hint}
                </p>
              )}
              <button
                className={`log-download-button ${data.state.case_status === 'complete' ? 'complete' : ''}`}
                disabled={isExportingLog}
                onClick={downloadLog}
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                플레이로그 다운로드
              </button>
              <button
                className="reset-button"
                disabled={isPending}
                onClick={() => setResetConfirmOpen(true)}
                type="button"
              >
                <RefreshCcw aria-hidden="true" size={16} />
                새로 시작
              </button>
            </>
          )}
        </aside>
      </section>

      {effectiveSpreadsheetTheme && (
        <div className="ss-status-bar">
          {/* 엑셀이 모드를 띄우는 자리다. 셀에 입력 중이면 '편집'이
              되는데, 면담 중 = 편집 중으로 읽힌다. */}
          <span className={`mode${statusRowNpc ? ' editing' : ''}`}>
            {statusRowNpc ? `편집 · ${statusRowNpc.name}` : '준비'}
          </span>
          {data.case.detective_entry_time && (
            <span
              aria-label={`탐정 진입 시각 ${data.case.detective_entry_time}`}
            >
              기준: {data.case.detective_entry_time}
            </span>
          )}
          <span aria-hidden="true">개수: {tabCount(activeTab)}</span>
          {/* 종이 테마에서 .status-row 에 얹혀 있던 증거/대립 카운터가, 이
              테마가 .status-row 를 통째로 끄는 바람에 화면에서 사라져 있었다
              (패치 5가 현재 위치와 면담자는 되살렸지만 이 칸은 빠졌다).
              배율 슬라이더에 숨은 진행률은 "얼마나"만 말하고 "무엇이 얼마나"는
              말하지 않는다. 엑셀 상태 표시줄이 선택 범위의 평균·개수·합계를
              늘어놓는 자리라, 개수 옆에 나란히 놓으면 위장을 깨지 않는다. */}
          {data.case_progress && !isCaseComplete && (
            <span className="ss-progress-counts">
              증거 {data.case_progress.evidence_done}/
              {data.case_progress.evidence_total} ·{' '}
              <span
                className={
                  justAdvancedContradiction
                    ? 'contradiction-count contradiction-count--pulse'
                    : 'contradiction-count'
                }
              >
                대립 {data.case_progress.contradiction_done}/
                {data.case_progress.contradiction_total}
              </span>
            </span>
          )}
          {/* 정보판 바닥의 .meter는 이 테마에서 꺼져 있어 토큰 사용량이
              아예 안 보였다. 엑셀 상태 표시줄이 선택 범위의 평균·개수와
              함께 합계를 띄우는 자리가 바로 여기라, 숫자 두 개가 슬래시로
              이어진 이 값이 그 칸에 그대로 들어맞는다. */}
          <span aria-label={`토큰 사용량 ${usage}`} className="ss-sum">
            합계: {usage}
          </span>
          <span className="spacer" />
          {/* 진행률이 배율 슬라이더 자리에 숨는다. 손잡이 위치가 곧 진행률이라
              정보량은 그대로지만, 이 화면에서 유일하게 남은 진행 표시라
              스크린 리더에는 진짜 값을 그대로 알린다. */}
          <span
            aria-label="사건 진행률"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={headerProgressPercent}
            className="ss-zoom"
            role="progressbar"
          />
          <span aria-hidden="true">{headerProgressPercent}%</span>
        </div>
      )}

      {isTruthOpen && (
        <div className="reset-confirm-backdrop">
          <button
            aria-label="닫기"
            className="reset-confirm-scrim"
            onClick={() => setTruthOpen(false)}
            type="button"
          />
          <dialog
            aria-labelledby="case-truth-title"
            className="reset-confirm case-truth"
            open
          >
            <h2 id="case-truth-title">사건의 전말</h2>
            <div className="case-truth-body">
              {data.state.case_truth
                .split(/\n{2,}/)
                .map((block) => block.trim())
                .filter(Boolean)
                .map((block, index) => (
                  <p key={index}>{block}</p>
                ))}
            </div>
            <div className="reset-confirm-actions">
              <button
                autoFocus
                className="reset-confirm-cancel"
                onClick={() => setTruthOpen(false)}
                type="button"
              >
                닫기
              </button>
            </div>
          </dialog>
        </div>
      )}

      {isResetConfirmOpen && (
        <div className="reset-confirm-backdrop">
          <button
            aria-label="닫기"
            className="reset-confirm-scrim"
            onClick={() => setResetConfirmOpen(false)}
            type="button"
          />
          <dialog
            aria-labelledby="reset-confirm-title"
            className="reset-confirm"
            open
          >
            <h2 id="reset-confirm-title">사건을 다시 시작할까요?</h2>
            <p>
              지금까지의 수사 기록, 획득한 증거, 대화가 모두 지워지고 사건이
              처음 상태로 돌아갑니다. 되돌릴 수 없습니다.
            </p>
            <p className="reset-confirm-note">
              시작하기 전에 플레이로그는 자동으로 내려받아 둡니다.
            </p>
            <div className="reset-confirm-actions">
              <button
                autoFocus
                className="reset-confirm-cancel"
                onClick={() => setResetConfirmOpen(false)}
                type="button"
              >
                계속 수사하기
              </button>
              <button
                className="reset-confirm-accept"
                disabled={isPending}
                onClick={reset}
                type="button"
              >
                <RefreshCcw aria-hidden="true" size={16} />
                새로 시작
              </button>
            </div>
          </dialog>
        </div>
      )}
    </main>
  );
}

function NotebookPanel({
  onEndInterview,
  newlySpentCardIds,
  data,
  draft,
  onSelectNpc,
  onSelectPrompt,
  pendingInterviewTargetId,
  selectedEvidenceIds,
  onToggleEvidence,
  onToggleBookmark,
  tab,
}: {
  data: GameData;
  draft: string;
  onSelectNpc: (npc: { id: string; name: string }) => void;
  onSelectPrompt: (text: string) => void;
  pendingInterviewTargetId: string | null;
  selectedEvidenceIds: string[];
  onToggleEvidence: (cardId: string) => void;
  onToggleBookmark: (
    content: string,
    role: 'assistant' | 'jiwoo' | 'detective' | 'user',
  ) => void;
  onEndInterview: () => void;
  newlySpentCardIds: string[];
  tab: Tab;
}) {
  const npcById = new Map(data.case.npcs.map((npc) => [npc.id, npc]));
  const locationById = new Map(
    data.case.locations.map((location) => [location.id, location]),
  );
  const cardById = new Map(data.case.cards.map((card) => [card.id, card]));
  // 카드의 source는 found_at, 즉 장소 id다. 카드 목록에서 "이걸 어디서
  // 주웠더라"가 안 보여서, 쌍을 맞추려 할 때마다 대화 기록을 거슬러
  // 올라가야 했다.
  const locationNameById = new Map(
    data.case.locations.map((place) => [place.id, place.name]),
  );
  const currentInterview = data.state.current_interview
    ? npcById.get(data.state.current_interview)
    : null;

  // 진술 is not a slice of the evidence list — everything with an E code stays
  // in 증거, where it can still be picked for presentation. This tab is the
  // other half: what people actually told the detective, by Master's own
  // statement id, including the claims that never become a card.
  if (tab === 'testimony') {
    // 한 사람에게서 들은 것끼리 붙여 놓아야 "이 사람이 지금까지 뭐라고
    // 했는지"가 한눈에 잡힌다. heardStatementsFor가 이미 인물 → 들은 순서로
    // 정렬해 주므로 순서대로 훑으며 화자가 바뀌는 지점에서 끊으면 된다.
    const groups: Array<{
      npcId: string;
      speaker: string;
      rows: typeof data.heard_statements;
    }> = [];
    for (const statement of data.heard_statements) {
      const last = groups[groups.length - 1];
      if (last && last.npcId === statement.npcId) last.rows.push(statement);
      else
        groups.push({
          npcId: statement.npcId,
          speaker: statement.speaker,
          rows: [statement],
        });
    }
    return (
      <section className="panel">
        <h2>들은 진술 ({data.heard_statements.length}개)</h2>
        {groups.length ? (
          groups.map((group) => (
            <div className="testimony-group" key={group.npcId}>
              <h3 className="testimony-group-name">
                {group.speaker}
                <span>{group.rows.length}</span>
              </h3>
              <div className="stack">
                {group.rows.map((statement) => (
                  <article className="item testimony-card" key={statement.id}>
                    <strong>
                      <span className="item-card-id">{statement.id}</span>
                    </strong>
                    <p className="testimony-quote">{statement.content}</p>
                  </article>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="empty">아직 들은 진술이 없습니다.</p>
        )}
      </section>
    );
  }

  if (tab === 'cards') {
    return (
      <section className="panel">
        <h2>증거 ({data.acquired_cards.filter(Boolean).length}개)</h2>
        {selectedEvidenceIds.length > 1 && (
          <p className="evidence-multiselect-hint">
            {selectedEvidenceIds.length}개를 함께 제시하도록 입력창에 채워
            넣었습니다. 더 고르거나, 시트를 닫고 그대로 보내세요.
          </p>
        )}
        <div className="stack">
          {data.acquired_cards.length ? (
            data.acquired_cards.map((card) => {
              if (!card) return null;
              const title = displayCardTitle(card, data.case.npcs);
              const isSelected = selectedEvidenceIds.includes(card.id);
              // spent = 이 카드가 낀 단계가 실제로 열렸다.
              // ready = 이미 내밀어 뒀고 이제 그 단계 차례다.
              // early = 내밀었지만 아직 앞 단계가 안 깨졌다.
              const marker = (data.evidence_stage_markers || {})[card.id];
              const isSpent = marker === 'spent';
              const justSpent = newlySpentCardIds.includes(card.id);
              return (
                <button
                  className={`item item-selectable${isSelected ? ' item-selected' : ''}${
                    isSpent ? ' item-spent' : ''
                  }${justSpent ? ' item-spent--enter' : ''}`}
                  key={card.id}
                  onClick={() => onToggleEvidence(card.id)}
                  type="button"
                >
                  <strong>
                    <span className="item-card-id">{card.id}</span>{' '}
                    <span className="item-card-title">{title}</span>
                    {marker === 'spent' && (
                      <span className="item-spent-badge">사용 완료</span>
                    )}
                    {marker === 'ready' && (
                      <span className="item-spent-badge item-ready-badge">
                        반응이 달라졌어요
                      </span>
                    )}
                    {marker === 'early' && (
                      <span className="item-spent-badge item-early-badge">
                        아직 꺼낼 때는 아니에요
                      </span>
                    )}
                  </strong>
                  <p>{displayCardSummary(card.summary)}</p>
                  {/* 진술 카드는 displayCardTitle이 이미 누구에게 들은
                      것인지를 제목에 달아 주므로 장소를 또 붙이지 않는다.
                      장소가 실제로 정보인 쪽은 물건 증거다. */}
                  {card.category !== 'testimony' &&
                    locationNameById.has(card.source) && (
                      <p className="card-found-at">
                        <MapPin aria-hidden="true" size={12} />
                        {locationNameById.get(card.source)}
                      </p>
                    )}
                  {card.proves_fact_ids?.map((fact, index) => (
                    <p
                      className="card-proof card-proof--proves"
                      key={`proves-${index}`}
                    >
                      <Check aria-hidden="true" size={12} />
                      증명함 — {fact}
                    </p>
                  ))}
                  {card.does_not_prove_fact_ids?.map((fact, index) => (
                    <p
                      className="card-proof card-proof--not-proves"
                      key={`not-proves-${index}`}
                    >
                      <X aria-hidden="true" size={12} />
                      증명 못 함 — {fact}
                    </p>
                  ))}
                </button>
              );
            })
          ) : (
            <p className="empty">아직 획득한 증거가 없습니다.</p>
          )}
        </div>

        <h2 className="section-title">제시한 증거</h2>
        <div className="stack">
          {data.state.presented_evidence.length ? (
            data.state.presented_evidence.map((record, index) => {
              const card = cardById.get(record.evidence_id);
              const target =
                (record.target_id && npcById.get(record.target_id)?.name) ||
                (record.target_id &&
                  locationById.get(record.target_id)?.name) ||
                '대상 미지정';

              return (
                <article
                  className="item evidence-presented"
                  key={`${record.evidence_id}-${index}`}
                >
                  <FileCheck2 aria-hidden="true" size={16} />
                  <div>
                    <strong>
                      {card
                        ? displayCardTitle(card, data.case.npcs)
                        : '제시한 단서'}
                    </strong>
                    <p>{target}에게 제시됨</p>
                    <PresentedEvidenceBadge
                      outcome={record.outcome}
                      matchQuality={record.match_quality}
                    />
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty">아직 누군가에게 제시한 증거는 없습니다.</p>
          )}
        </div>
      </section>
    );
  }

  if (tab === 'people') {
    return (
      <section className="panel">
        {data.case.key_figures.length > 0 && (
          <>
            <h2>주요 인물</h2>
            <div className="stack">
              {data.case.key_figures.map((figure) => (
                <article className="item key-figure-card" key={figure.id}>
                  <strong>{figure.name}</strong>
                  <p>
                    {figure.role} ·{' '}
                    {KEY_FIGURE_STATUS_LABEL[figure.status] || figure.status}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
        <h2
          className={
            data.case.key_figures.length > 0 ? 'section-title' : undefined
          }
        >
          면담 상태
        </h2>
        {currentInterview && (
          <div className="interview-strip">
            <span>현재 면담</span>
            <strong>{currentInterview.name}</strong>
            <button
              aria-label="면담 종료"
              className="status-row-end-interview"
              onClick={onEndInterview}
              type="button"
            >
              <X aria-hidden="true" size={12} />
            </button>
          </div>
        )}
        <div className="stack">
          {data.case.npcs.map((npc) => {
            // npc_status/npc_statement_stage only change when the GM
            // model itself chooses to include an npc_updates entry —
            // there's no code path forcing it to, so it stayed stuck on
            // its initial value even after a real interview happened.
            // interviewed_characters is different: applyGmResponse pushes
            // to it deterministically whenever the scene actually records
            // an interview with this NPC, regardless of what the model
            // said, so it's what "면담완료" should be based on.
            const interviewed = data.state.interviewed_characters.includes(
              npc.id,
            );
            const isPendingTarget = pendingInterviewTargetId === npc.id;
            // Whether this NPC's statement_stage has moved past its
            // starting value at all — deliberately not the raw stage id
            // (see the comment above this map): only the culprit's NPC
            // ever has more than one contradiction stage authored for
            // them at all in every case checked so far, so simply showing
            // "which stage" or "how many stages remain" would single them
            // out from turn one, long before any real confrontation
            // happens. This binary "진술에 변화 있음"/no-badge instead only
            // ever differs from every other NPC as a direct, visible
            // consequence of the player's own play (a real advance they
            // caused), never as a static fact revealed up front — every
            // NPC starts identical with no badge at all.
            const statementProgressed =
              (data.state.npc_statement_stage[npc.id] || 'initial') !==
              'initial';
            return (
              <button
                className={`item item-selectable${isPendingTarget ? ' item-selected' : ''}`}
                key={npc.id}
                onClick={() => onSelectNpc(npc)}
                type="button"
              >
                <strong>{npc.name}</strong>
                <p>
                  {npc.role} · {interviewed ? '면담 완료' : '면담 전'} · 진술{' '}
                  {
                    data.heard_statements.filter(
                      (statement) => statement.npcId === npc.id,
                    ).length
                  }
                </p>
                {statementProgressed && (
                  <small className="npc-statement-progress">
                    진술에 변화가 있었음
                  </small>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (tab === 'places') {
    // present_location groups an NPC under a location card so "이미 만난
    // 인물" can render per-place instead of only in the separate 인물 tab.
    const npcsByLocation = new Map<string, typeof data.case.npcs>();
    for (const npc of data.case.npcs) {
      if (!npc.present_location) continue;
      const list = npcsByLocation.get(npc.present_location) || [];
      list.push(npc);
      npcsByLocation.set(npc.present_location, list);
    }
    const ACCESS_LABEL: Record<string, string> = {
      open: '개방',
      restricted: '제한 구역',
      sealed: '통제 구역',
    };
    return (
      <section className="panel">
        <h2>장소 지도</h2>
        <div className="stack stack-grid">
          {data.case.locations.map((place) => {
            const accessLevel = place.access_level || 'open';
            const visited = data.state.visited_locations.includes(place.id);
            // A location the player can freely walk into from the start is
            // shown in full immediately; one that's restricted/sealed off
            // stays an unlabeled "미확인" slot — its name only, no
            // description or connections — until the player actually goes
            // there once. This keeps every location's existence visible
            // (a complete, navigable map from turn one) without handing
            // out what a locked room contains before it's earned.
            const revealed = accessLevel === 'open' || visited;
            const visitCount = data.state.location_visit_counts[place.id] || 0;
            const metNpcs = (npcsByLocation.get(place.id) || []).filter((npc) =>
              data.state.interviewed_characters.includes(npc.id),
            );
            const connectedNames = (place.connects_to || [])
              .map(
                (id) =>
                  data.case.locations.find((item) => item.id === id)?.name,
              )
              .filter((name): name is string => Boolean(name));
            const moveSentence = `${withDirectionParticle(place.name)} 이동한다`;
            const isSelected = draft === moveSentence;
            return (
              <button
                className={`item item-selectable ${place.id === data.state.current_location ? 'current' : ''} ${revealed ? '' : 'item-locked'} ${isSelected ? 'item-selected' : ''}`}
                key={place.id}
                onClick={() => onSelectPrompt(moveSentence)}
                type="button"
              >
                <strong>
                  {place.name}
                  <span className={`access-badge access-${accessLevel}`}>
                    {ACCESS_LABEL[accessLevel] || accessLevel}
                  </span>
                  {revealed && visitCount > 0 && (
                    <span className="place-visit-count">
                      방문 {visitCount}회
                    </span>
                  )}
                </strong>
                {revealed ? (
                  <>
                    <p>{place.description}</p>
                    {connectedNames.length > 0 && (
                      <small>연결: {connectedNames.join(', ')}</small>
                    )}
                    {metNpcs.length > 0 && (
                      <small>
                        만난 인물: {metNpcs.map((npc) => npc.name).join(', ')}
                      </small>
                    )}
                  </>
                ) : (
                  <p>아직 확인하지 못한 장소</p>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>수사 메모장</h2>
      <div className="stack">
        {data.state.bookmarks.length ? (
          [...data.state.bookmarks].reverse().map((bookmark) => (
            <article className="item bookmark-card" key={bookmark.id}>
              <p>{bookmark.content}</p>
              <button
                aria-label="메모장에서 빼기"
                className="bookmark-remove"
                onClick={() =>
                  onToggleBookmark(bookmark.content, bookmark.role)
                }
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </article>
          ))
        ) : (
          <p className="empty">
            아직 저장한 메모가 없습니다. 대화창에서 북마크 아이콘을 눌러 나중에
            다시 볼 대사를 저장하세요.
          </p>
        )}
      </div>
    </section>
  );
}
