'use client';

// The offline game's screen. A deliberate sibling of app/DetectiveApp.tsx
// rather than a branch inside it: that file is the one the AI game changes
// most often, and the two screens want different things anyway — this one has
// no composer, no GM/수사 mode switch, no suggested-question chips and no
// token meter, because the player picks from what Master actually permits
// (see app/gm/offline-engine.ts) instead of typing. The shell, notebook and
// message styling are still the shared ones from app/globals.css.

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileCheck2,
  MapPin,
  PencilLine,
  Clock,
  Lightbulb,
  Minus,
  RefreshCcw,
  Search,
  SearchX,
  Table2,
  Target,
  Undo2,
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
import { caseHeaderStyle } from '../caseAccent';
import { effectiveNpcLocation } from '../gm/offline-summon';
import {
  spreadsheetSpeakerLabel,
  spreadsheetTabLabel,
} from '../spreadsheetLabels';
import {
  downloadOfflinePlayLog,
  endOfflineInterview,
  requestOfflineHint,
  resetOfflineGameState,
  sendOfflineAction,
  toggleOfflineBookmark,
} from './actions';

type GameData = Awaited<ReturnType<typeof resetOfflineGameState>>;
type OfflineAction = GameData['available_actions'][number];
type Tab = 'cards' | 'testimony' | 'people' | 'places' | 'timeline' | 'notes';
// What a notebook entry stands for, so a tap can be turned into the matching
// authorised action instead of a sentence the player would have to type.
type NotebookKind = 'card' | 'npc' | 'place';

// 스프레드시트 위장의 소품. 실제로 무언가 하는 것은 '파일' 하나뿐이고
// 나머지는 tabIndex={-1}·aria-hidden으로 키보드 순서와 접근성 트리에서
// 빠져 있다. app/DetectiveApp.tsx와 같은 목록을 쓴다 — 두 화면이 같은
// 프로그램인 척해야 하므로 리본이 서로 달라서는 안 된다.
const SS_RIBBON_TABS = ['파일', '홈', '삽입', '수식', '데이터', '검토', '보기'];

// 정보판 바닥의 세 버튼은 전부 한 번 물어보고 실행한다. 사건 종결과 새로
// 시작은 되돌릴 수 없고, 플레이로그는 되돌릴 것이 없는 대신 파일이 하나
// 떨어지는 조작이라 실수로 눌렸을 때 무슨 일이 일어났는지 알려 줄 필요가
// 있다. AI 화면은 '새로 시작' 하나만 묻는데, 거기서도 같은 자리에 세
// 버튼이 붙어 있어 오발이 실제로 보고된 적이 있다.
//
// 문구는 globals.css의 .reset-confirm 계열을 그대로 쓴다 — 새 스타일을
// 만들면 두 화면의 같은 대화가 서로 달라 보인다.
type ConfirmKind = 'close' | 'log' | 'reset';

const CONFIRM_COPY: Record<
  ConfirmKind,
  { title: string; body: string; note?: string; cancel: string; accept: string }
> = {
  close: {
    title: '사건을 종결할까요?',
    body: '지금까지 모은 것으로 사건의 전말이 공개됩니다. 종결한 뒤에는 더 수사할 수 없습니다.',
    cancel: '계속 수사하기',
    accept: '사건 종결',
  },
  log: {
    title: '플레이로그를 내려받을까요?',
    body: '여기까지의 대화와 모은 기록 전부가 텍스트 파일 하나로 저장됩니다.',
    cancel: '취소',
    accept: '내려받기',
  },
  reset: {
    title: '사건을 다시 시작할까요?',
    body: '지금까지의 수사 기록, 획득한 증거, 대화가 모두 지워지고 사건이 처음 상태로 돌아갑니다. 되돌릴 수 없습니다.',
    note: '기록을 남기려면 먼저 플레이로그를 내려받으세요.',
    cancel: '계속 수사하기',
    accept: '새로 시작',
  },
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'cards', label: '증거' },
  // 진술 탭이 없어서 들은 말이 화면 어디에도 남지 않았다. 사건 하나를
  // 끝까지 풀면 heard_statements가 17~20건 쌓이는데(CASE305 17, CASE294 20,
  // CASE212 18) 그 전부가 대화 스크롤 속에만 있었다 — 서버는 stateView에서
  // 이미 heard_statements를 내려보내고 있었고 받는 쪽이 없었을 뿐이다.
  { id: 'testimony', label: '진술' },
  { id: 'people', label: '인물' },
  { id: 'places', label: '장소' },
  { id: 'timeline', label: '기록' },
  // 대화가 recent_conversation 창 밖으로 밀려나면 그 줄로 돌아갈 방법이
  // 플레이로그를 내려받는 것밖에 없다. 메모장은 플레이어가 직접 고른,
  // 잘리지 않는 목록이다.
  { id: 'notes', label: '메모' },
];

// What the action menu shows, in reading order: what is happening in front of
// the detective right now, then the room, then who else is in it.
//
// 이동 and 증거 제시 are deliberately absent. They are still real actions — the
// server sends them and the notebook runs them — but listing them here put a
// row of places and a row of cards in the same flat column as "이 서랍을
// 확인한다", and a playtest found it hard to tell what kind of turn was even
// being taken. They belong to the notebook's own tabs, where a place is a place
// and a card is a card: tapping either does the move or the presentation, the
// way the AI screen's 장소/증거 cards have always worked.
// 행동 목록에 남는 것은 지금 앞에 앉아 있는 사람과 이 방뿐이다.
//
// 인물은 수첩의 인물 탭으로 옮겼다 — 이동이 장소 카드로, 제시가 증거
// 카드로 간 것과 같은 이유다. 한 사람을 만나러 가는 것과 서랍을 열어
// 보는 것이 같은 열에 같은 무게로 놓이면 무슨 종류의 턴을 밟고 있는지
// 읽히지 않는다. 카드를 누르면 그 자리에서 할 수 있는 쪽(같은 방이면
// 대화, 아니면 한지우를 보내 데려오기)이 그대로 실행된다.
//
// '사건'도 비었다. 종결은 정보판 바닥의 전용 버튼이 맡는다.
// 받침을 보고 주어 조사를 고른다. 엔진에도 같은 함수가 있지만 그 모듈은
// 마스터 파서를 통째로 끌고 오므로 화면 번들에 넣을 것이 아니다.
function subjectParticle(word: string): string {
  const last = (word || '').trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '가';

  return (code - 0xac00) % 28 === 0 ? '가' : '이';
}

const KEY_FIGURE_STATUS_LABEL: Record<string, string> = {
  deceased: '사망 (피해자)',
  missing: '실종',
};

const actionGroupOrder = ['면담', '현장'] as const;

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

// ---------------------------------------------------------------------------
// 아래 넷은 app/DetectiveApp.tsx에서 글자 그대로 가져왔다.
//
// 공통 모듈로 빼지 않은 것은 의도다 — 그러려면 AI 화면 쪽 파일을 고쳐야
// 하고, 그 파일은 이 브랜치가 건드리지 않기로 한 셋 중 하나다. 여기서
// import 해 오는 것도 안 된다: DetectiveApp은 클라이언트 컴포넌트라
// 오프라인 번들이 AI 화면을 통째로 끌고 들어온다. 이 파일이 MessageContent를
// 이미 같은 이유로 복사해 두고 있어서, 같은 규칙을 따른다.
// ---------------------------------------------------------------------------

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

function MessageContent({
  content,
  isMeta,
  role,
  spreadsheet,
  npcNames,
  examinableHere = [],
}: {
  content: string;
  isMeta: boolean;
  role: 'assistant' | 'user' | 'detective' | 'jiwoo';
  spreadsheet: boolean;
  npcNames: string[];
  examinableHere?: string[];
}) {
  // A열 라벨은 스타일이 아니라 글자라 CSS가 닿지 않는다. 초록 리본 아래
  // '탐정'이 찍혀 있으면 위장이 한눈에 무너진다 — spreadsheetLabels.ts.
  const label = (roleId: string, plain: string) =>
    spreadsheet ? spreadsheetSpeakerLabel(roleId, plain) : plain;
  // Double quotes are this app's one spoken-dialogue marker; single curly
  // quotes only ever scare-quote a written term inline in narration, and
  // splitting on those tore a flowing sentence into one line per quoted name.
  // Kept identical to app/DetectiveApp.tsx, which fixed this from a real
  // playtest screenshot.
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

export function OfflineDetectiveApp({
  caseId,
  initialData,
}: {
  caseId: string;
  initialData: GameData;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [error, setError] = useState('');
  const [clock, setClock] = useState('--:--');
  // 서버는 window가 없어 항상 false로 그리는데 초기화 함수가 클라이언트 첫
  // 렌더에서 localStorage를 읽으면 그 둘이 어긋난다(React #418). 값은 마운트
  // 뒤에 맞춘다 — app/DetectiveApp.tsx가 같은 이유로 고친 것과 같은 건이다.
  const [isIntroCollapsed, setIntroCollapsed] = useState(false);
  // 스프레드시트 위장은 PC 전용 선택 스킨이다. AI 화면과 같은 규칙으로
  // 돌린다 — 좁은 화면에서는 토글 자체를 안 보여주고, 켜 둔 채로 창이
  // 좁아지면 즉시 꺼진다(globals.css의 [data-theme='spreadsheet'] 전체가
  // min-width: 769px 안에 들어 있어 CSS 쪽에서도 한 번 더 막힌다).
  //
  // 저장 키(`detective:theme`)를 AI 화면과 공유하는 것은 일부러다. 세이브는
  // 두 판을 갈라 놓지만 이건 세이브가 아니라 화면 취향이고, GM을 바꿨다고
  // 위장이 풀리면 그게 더 이상하다.
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSpreadsheetTheme, setSpreadsheetTheme] = useState(false);
  const [isFileMenuOpen, setFileMenuOpen] = useState(false);
  // 좁은 화면에서 수첩을 아래에서 끌어올리는 시트. 860px 위에서는 수첩이
  // 계속 옆에 붙어 있으므로 아무 효과가 없다(globals.css의
  // .notebook-summary-bar / .notebook.sheet-open).
  //
  // 이 화면에서는 특히 빠질 수 없다 — 이동도 제시도 인물도 전부 수첩
  // 안에 있어서, 폰에서 수첩을 못 열면 할 수 있는 일이 방 살펴보기와
  // 지금 앞에 앉은 사람에게 묻기뿐이다.
  const [isNotebookOpen, setNotebookOpen] = useState(false);
  const [confirming, setConfirming] = useState<ConfirmKind | null>(null);
  // 사건의 전말은 종결 직후 대화창에 같이 쏟지 않고 버튼 뒤에 둔다 —
  // 자백과 마지막 대화를 읽는 자리에 "책임자/수법/동기" 목록이 붙으면
  // 엔딩이 장면이 아니라 보고서로 읽힌다.
  const [isTruthOpen, setTruthOpen] = useState(false);
  const [hint, setHint] = useState('');
  const [isHinting, setIsHinting] = useState(false);
  // 대립이 한 칸 나아간 턴에만 카운터가 한 번 뛴다. 화면에서 모순이
  // 성립한 순간을 알려 주는 유일한 신호다.
  const [justAdvancedContradiction, setJustAdvancedContradiction] =
    useState(false);
  const prevContradictionDoneRef = useRef<number | null>(null);
  const effectiveSpreadsheetTheme = isSpreadsheetTheme && isDesktop;

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setIntroCollapsed(
      window.localStorage.getItem(`detective:intro:${caseId}`) === 'collapsed',
    );
  }, [caseId]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 769px)');
    // 초기값을 useState 쪽에서 읽으면 서버 렌더(window 없음 → false)와
    // 클라이언트 첫 렌더가 어긋나 하이드레이션 오류 #418이 난다. AI 화면이
    // 같은 이유로 여기까지 내려와 있다.
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
    const done = data.case_progress?.contradiction_done;
    if (done === undefined) return;
    const prev = prevContradictionDoneRef.current;
    prevContradictionDoneRef.current = done;
    if (prev !== null && done > prev) {
      // oxlint-disable-next-line react/react-compiler
      setJustAdvancedContradiction(true);
      const timer = window.setTimeout(
        () => setJustAdvancedContradiction(false),
        1600,
      );
      return () => window.clearTimeout(timer);
    }
  }, [data.case_progress?.contradiction_done]);

  useEffect(() => {
    if (!isTruthOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTruthOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isTruthOpen]);

  useEffect(() => {
    if (!confirming) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setConfirming(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirming]);

  function endInterviewNow() {
    if (isPending) return;
    startTransition(async () => {
      setData(await endOfflineInterview(caseId));
    });
  }

  async function askHint() {
    if (isHinting) return;
    setIsHinting(true);
    try {
      const result = await requestOfflineHint(caseId);
      setHint(result.text);
    } catch {
      setHint('지금은 확인할 수 없습니다. 잠시 뒤 다시 눌러 주세요.');
    } finally {
      setIsHinting(false);
    }
  }

  function isBookmarked(content: string, role: string) {
    return data.state.bookmarks.some(
      (item) => item.role === role && item.content === content,
    );
  }

  function toggleBookmarkLine(content: string, role: string) {
    if (isPending) return;
    startTransition(async () => {
      setData(
        await toggleOfflineBookmark(
          caseId,
          content,
          role as 'assistant' | 'user' | 'detective' | 'jiwoo',
        ),
      );
    });
  }

  function toggleSpreadsheetTheme() {
    setSpreadsheetTheme((current) => {
      const next = !current;
      window.localStorage.setItem('detective:theme', next ? 'spreadsheet' : '');
      return next;
    });
  }
  // Cards picked out for the next presentation. Master states a stage's
  // requirement as a set (CASE305's C01 wants two together), so the notebook
  // fills slots and sends them as one gesture rather than one card per turn.
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isExportingLog, startLogExport] = useTransition();
  const messagesRef = useRef<HTMLDivElement>(null);

  // Compared against full_dialogue_log[0] (the persisted opening line) rather
  // than the live public_intro: if a case's intro text is edited after a
  // session started, the stored first entry no longer matches the current
  // text, and comparing against the current one would show it twice.
  const originalIntro = data.state.full_dialogue_log[0];
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
    const tick = () => {
      setClock(
        new Intl.DateTimeFormat('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
    };

    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [displayedConversation]);

  // Walking away, or someone else sitting down, empties the slots — the pile
  // was assembled for whoever was in front of the detective.
  const interviewId = data.state.current_interview;
  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setSelectedEvidenceIds([]);
  }, [interviewId]);

  // No optimistic player bubble here, unlike the AI screen: the client sends
  // an opaque action id, so echoing it would read as "present|E03|N01". The
  // server answers with the action's own label as the player's line.
  function runAction(action: OfflineAction) {
    if (isPending || action.disabled) return;
    setError('');
    if (action.id === 'close') {
      closeCase();
      return;
    }
    startTransition(async () => {
      try {
        setData(await sendOfflineAction(caseId, action.id, 'play'));
      } catch {
        setError('행동을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      }
    });
  }

  function toggleEvidence(cardId: string) {
    if (isPending) return;
    setSelectedEvidenceIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId],
    );
  }

  function presentSelected() {
    if (isPending || !interviewId || !selectedEvidenceIds.length) return;
    setError('');
    const actionId = `present|${selectedEvidenceIds.join(',')}|${interviewId}`;
    // 제시도 같은 이유로 시트를 닫는다 — 상대가 어떻게 반응했는지가 이 턴의
    // 전부인데 수첩이 그것을 가리고 있으면 카드만 사라진 것처럼 보인다.
    closeNotebook();
    startTransition(async () => {
      try {
        setData(await sendOfflineAction(caseId, actionId, 'play'));
      } catch {
        setError('증거를 제시하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      }
    });
  }

  function askStatus() {
    if (isPending) return;
    setError('');
    startTransition(async () => {
      try {
        setData(
          await sendOfflineAction(caseId, '수사 상황을 정리한다', 'meta'),
        );
      } catch {
        setError('상황을 정리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      }
    });
  }

  function closeCase() {
    setConfirming(null);
    if (isPending || data.state.case_status === 'complete') return;
    setError('');
    startTransition(async () => {
      try {
        setData(
          await sendOfflineAction(caseId, '사건을 종결한다', 'case_close'),
        );
      } catch {
        setError('사건을 종결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      }
    });
  }

  // A notebook tap is a shortcut to an action the player already has, never a
  // new one: it only fires when the server actually offered that exact move
  // this turn (present this evidence to whoever is here, go to that room, talk
  // to that person).
  function offlineActionFor(kind: NotebookKind, id: string) {
    const wanted =
      kind === 'card'
        ? [`present|${id}|${data.state.current_interview}`]
        : kind === 'npc'
          ? // Someone in this room is talked to; someone the detective has
            // already met but who is elsewhere is fetched by 한지우. One card,
            // either verb, and the label below says which one it will be.
            [`talk|${id}`, `summon|${id}`]
          : [`move|${id}`];

    return (
      data.available_actions.find(
        (action) => wanted.includes(action.id) && !action.disabled,
      ) || null
    );
  }

  function selectFromNotebook(kind: NotebookKind, id: string) {
    const action = offlineActionFor(kind, id);
    if (!action) return;
    runAction(action);
    // 폰에서는 수첩이 화면을 덮는 시트라, 카드를 눌러 턴이 돌아도 그 결과가
    // 시트 뒤에 가려진다. 인물·장소 카드를 누르는 것은 "가서 만난다"는
    // 행동이므로 그 턴의 대화가 바로 보여야 한다. 데스크톱에서는 수첩이
    // 옆에 붙은 판이고 sheet-open 을 CSS 가 쓰지 않으므로 이 호출이
    // 화면을 바꾸지 않는다.
    closeNotebook();
  }

  function closeNotebook() {
    setNotebookOpen(false);
    setSelectedEvidenceIds([]);
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

  function reset() {
    setConfirming(null);
    if (isPending) return;
    setError('');
    setSelectedEvidenceIds([]);
    startTransition(async () => {
      setData(await resetOfflineGameState(caseId));
      setActiveTab('cards');
    });
  }

  function downloadLog() {
    setConfirming(null);
    if (isExportingLog) return;
    setError('');
    startLogExport(async () => {
      try {
        const log = await downloadOfflinePlayLog(caseId);
        const blob = new Blob([log.content], {
          type: 'text/plain;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = log.filename;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        setError(
          '플레이로그를 내려받지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
        );
      }
    });
  }

  // 지금 이 방에 서 있는 사람들. 면담 중인 사람은 뺀다 — 이미 눈앞에
  // 있고 상단 상태줄이 그 이름을 들고 있다.
  const peopleHere = data.case.npcs
    .filter(
      (npc) =>
        npc.id !== data.state.current_interview &&
        effectiveNpcLocation(
          npc.present_location || undefined,
          data.state.completed_actions,
          npc.id,
        ) === data.state.current_location,
    )
    .map((npc) => npc.name);

  const isCaseComplete = data.state.case_status === 'complete';
  const statusRowNpc = data.state.current_interview
    ? data.case.npcs.find((npc) => npc.id === data.state.current_interview)
    : null;
  const headerProgressPercent = isCaseComplete
    ? 100
    : (data.case_progress?.overall_percent ?? 0);
  // 수식 입력줄의 두 칸. 이름 상자는 현재 위치가 없을 때만 셀 주소로
  // 떨어지고, 값 칸은 화면의 마지막 줄을 그대로 보여준다.
  const lastLine =
    displayedConversation.at(-1)?.content.trim().split('\n')[0] ?? '';
  const selectedCellRef = `A${10 + displayedConversation.length}`;

  // 도장 한 칸씩. 개수·완료·"방금 찍힌 칸"을 한 자리에서 정해 둔다 —
  // JSX 안에서 세면 data.case_progress 가 null 일 수 있다는 것을 콜백
  // 안에서는 타입이 기억하지 못한다.
  const contradictionStamps = Array.from(
    { length: data.case_progress?.contradiction_total ?? 0 },
    (_unused, index) => ({
      key: `contradiction-${index}`,
      done: index < (data.case_progress?.contradiction_done ?? 0),
      fresh: index === (data.case_progress?.contradiction_done ?? 0) - 1,
    }),
  );

  function tabCount(tab: Tab): number {
    switch (tab) {
      case 'cards':
        return data.acquired_cards.length;
      case 'testimony':
        return data.heard_statements.length;
      case 'people':
        return data.case.npcs.length;
      case 'places':
        return data.case.locations.length;
      case 'timeline':
        return data.state.known_public_timeline.length;
      case 'notes':
        return data.state.bookmarks.length;
    }
  }

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
          {/* 종결 뒤에만 생기는 버튼이라 수첩 아래쪽에 두면 거기서만
              목록이 한 칸 밀린다. 제목줄 오른쪽은 스프레드시트 위장에서
              원래 비어 있던 자리이고, 여기 두면 다른 버튼들의 자리가
              바뀌지 않는다. */}
          {isCaseComplete && data.state.case_truth && (
            <button
              className="ss-titlebar__truth"
              onClick={() => setTruthOpen(true)}
              type="button"
            >
              <FileCheck2 aria-hidden="true" size={14} />
              사건의 전말
            </button>
          )}
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
                {/* 이 테마는 정보판 바닥의 세 버튼을 감추므로, 그것들이
                    갈 곳이 여기다. 오프라인에는 '새로 시작' 확인 대화가
                    없어 곧바로 부른다. */}
                <div className="ss-file-menu" role="menu">
                  <button
                    disabled={isPending || isCaseComplete}
                    onClick={() => {
                      setFileMenuOpen(false);
                      setConfirming('close');
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
                      setConfirming('log');
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
                      setConfirming('reset');
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
              href="/offline"
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
                <Clock3 aria-hidden="true" size={16} />
                {clock}
              </span>
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
                    onClick={endInterviewNow}
                    type="button"
                  >
                    <X aria-hidden="true" size={12} />
                  </button>
                </span>
              )}
              {/* 띠는 "얼마나"를, 이 둘은 "무엇이 얼마나"를 말한다. 대립
                카운터의 한 번 뛰는 연출은 모순이 성립한 순간을 알려 주는
                화면상 유일한 신호라 어느 쪽도 띠가 대신할 수 없다. */}
              {data.case_progress && !isCaseComplete && (
                <span className="status-row-counts">
                  {/* 증거 개수는 세지 않는다. 진행을 말하는 자리가 둘이면
                      눈이 두 번 멈추고, 어느 쪽이 사건의 진척인지도 흐려진다
                      — 대립이 그 답이라 그것만 남긴다. 증거는 수첩의 증거
                      탭이 제 개수를 이미 달고 있다.
                      대립은 숫자 대신 도장 자국으로 센다. 하나 깨질 때마다
                      한 칸이 찍히고, 방금 찍힌 것만 한 번 내려친다. 남은
                      칸이 몇 개인지가 한눈에 보이는 것이 숫자를 읽는 것보다
                      빠르다. 값 자체는 aria-label 로 그대로 남는다. */}
                  <span
                    aria-label={`대립 ${data.case_progress.contradiction_done}/${data.case_progress.contradiction_total}`}
                    className="contradiction-stamps"
                  >
                    {contradictionStamps.map((stamp) => (
                      <span
                        aria-hidden="true"
                        className={[
                          'contradiction-stamp',
                          stamp.done ? 'contradiction-stamp--done' : '',
                          justAdvancedContradiction && stamp.fresh
                            ? 'contradiction-stamp--fresh'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        key={stamp.key}
                      />
                    ))}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="topbar-right">
            {/* 종결 뒤에만 생기는 버튼. 수첩 아래에 두면 거기서만 목록이 한
                칸 밀리므로, 스프레드시트 위장이 제목줄 오른쪽에 두는 것과
                같은 자리 — 헤더 오른쪽 — 로 맞춘다. 위장 쪽은 제목줄에서
                따로 그리므로 여기서는 기본 테마일 때만 그린다. */}
            {!effectiveSpreadsheetTheme &&
              isCaseComplete &&
              data.state.case_truth && (
                <button
                  className="case-truth-button case-truth-button--header"
                  onClick={() => setTruthOpen(true)}
                  type="button"
                >
                  <FileCheck2 aria-hidden="true" size={16} />
                  사건의 전말
                </button>
              )}
            <strong className="status-badge">
              {isCaseComplete ? '종료' : data.case.status_label}
              {data.case_progress &&
                !isCaseComplete && (
                  // 백분율이 숫자로 남는 유일한 자리. 아래 띠가 같은 값을
                  // 위치로 보여 주는데, 읽어내기보다 느끼기 쉬운 쪽이라
                  // 정확한 값은 여기에 남겨 둔다.
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
        {/* 헤더 아래 모서리의 띠가 진행률 표시다. AI 화면은 여기에
            role="progressbar"를 얹었는데 여기서는 안 얹는다 —
            규칙(prefer-tag-over-role)이 <progress>를 쓰라고 하고
            .case-seal은 봉인 도장을 span 하나에 그리는 CSS라 바꿀 수가
            없다. 같은 값이 바로 위 .status-badge-progress에 숫자로 이미
            읽히므로 이 띠는 장식으로 둔다. */}
        <span aria-hidden="true" className="case-seal" />
      </header>

      {effectiveSpreadsheetTheme && (
        <>
          <div className="ss-toolbar">
            {/* 되돌리기 자리에 앉은 진짜 버튼. 스프레드시트에 당연히 있는
                위치라 눌러서 목록으로 나가도 어색하지 않다. */}
            <Link
              aria-label="사건 목록으로 돌아가기"
              className="back-button"
              href="/offline"
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
            <span aria-hidden="true" className="active">
              줄 바꿈
            </span>
            <span aria-hidden="true" className="active">
              필터
            </span>
            <span className="divider" />
            {/* 이 테마는 위 상태줄을 감추므로, 스킨에서 빠져나오는 길이
                여기밖에 남지 않는다. */}
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
            {/* 엑셀의 이름 상자는 명명된 범위의 이름도 띄운다. 현재 위치가
                거기 있는 건 정품 동작이고, 명명된 범위에 공백을 못 쓴다는
                제약이 '휴게 라운지' → '휴게라운지'로 붙여 쓰게 만들어
                오히려 위장을 돕는다. */}
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
        <section className="chat-pane offline" aria-label="대화창">
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
            {/* Same master-format warnings the AI screen shows: these name
                things that actually change runtime behaviour (a location or
                character block that failed to parse, a missing entry time),
                and the offline GM builds its whole menu out of exactly those
                rules, so a broken master shows up here first. */}
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
                      examinableHere={data.examinable_here}
                      isMeta={item.mode === 'meta'}
                      npcNames={data.case.npcs.map((npc) => npc.name)}
                      role={item.role}
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
                        onClick={() =>
                          toggleBookmarkLine(item.content, item.role)
                        }
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
                  {/* 이 방은 더 뒤질 것이 없다. 아무것도 못 찾고 방을
                      나가면서 뭘 놓친 건지 아닌지를 모르는 것이 실제
                      불만이었다. 남은 개수는 싣지 않는다 — "아직 세 개
                      있다"는 찾는 재미를 대신해 버린다. */}
                  {item.location_cleared && (
                    <span className="evidence-outcome-badge evidence-outcome-badge--cleared">
                      <SearchX aria-hidden="true" size={13} />
                      {item.location_cleared === 'none'
                        ? '이 장소에는 살펴볼 것이 없다'
                        : '이 장소에서 살펴볼 것은 다 봤다'}
                    </span>
                  )}
                  {/* 무엇을 찾았는지는 서술 안에 녹아 있고, 그것이
                      수첩에 카드로 들어갔는지는 수첩을 열어 봐야 알 수
                      있었다. AI 화면이 같은 자리에 붙이는 칩을 그대로
                      쓴다 — 어느 턴이 무엇을 줬는지가 기록에 남는다.
                      `acquired_cards`는 offline-session.ts가 이미 그 턴의
                      대화 항목에 싣고 있어서 화면만 없었다. */}
                  {item.acquired_cards?.map((cardId) => {
                    const card = data.case.cards.find(
                      (entry) => entry.id === cardId,
                    );
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
                    matchQuality={bestPresentedMatchQuality(
                      item.presented_evidence,
                    )}
                    outcome={item.presented_evidence_outcome}
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

          <ActionMenu
            actions={data.available_actions}
            disabled={isPending}
            onPick={runAction}
            onStatus={askStatus}
            peopleHere={peopleHere}
            spreadsheet={effectiveSpreadsheetTheme}
          />
        </section>

        <button
          aria-expanded={isNotebookOpen}
          className="notebook-summary-bar"
          onClick={() => setNotebookOpen(true)}
          type="button"
        >
          {/* 시트의 탭 목록과 같은 배열에서 만든다. 폰에서는 이 줄이
              수첩 안에 무엇이 있는지 알려 주는 유일한 표시다. */}
          <span className="notebook-summary-counts">
            {tabs.map((entry) => (
              <span key={entry.id}>
                {entry.label}{' '}
                {entry.id === 'cards' && data.case_progress
                  ? `${data.case_progress.evidence_done}/${data.case_progress.evidence_total}`
                  : tabCount(entry.id)}
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
          {/* 분할 창은 각 영역이 서로 다른 위치를 보여주는 기능이라,
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
                  // 시트 이름에 괄호 숫자가 붙으면 시트로 안 읽힌다.
                  // 그 자리는 상태 표시줄의 '개수:'가 맡는다.
                  spreadsheetTabLabel(tab.id, tab.label)
                ) : (
                  <>
                    {tab.label} ({tabCount(tab.id)})
                  </>
                )}
              </button>
            ))}
          </div>

          <NotebookPanel
            busy={isPending}
            data={data}
            onEndInterview={endInterviewNow}
            onPresent={presentSelected}
            onSelect={selectFromNotebook}
            onToggleBookmark={toggleBookmarkLine}
            onToggleEvidence={toggleEvidence}
            resolveAction={offlineActionFor}
            selectedEvidenceIds={selectedEvidenceIds}
            tab={activeTab}
          />

          <footer className="meter">
            <span>확보한 단서</span>
            <strong>
              {data.acquired_cards.length} / {data.case.cards.length}
            </strong>
          </footer>

          <button
            className="case-close-button"
            disabled={isPending || data.state.case_status === 'complete'}
            onClick={() => setConfirming('close')}
            type="button"
          >
            {data.state.case_status === 'complete'
              ? '사건 종결 완료'
              : '사건 종결'}
          </button>
          {/* 규칙으로 고르는 한 칸짜리 안내. 모델을 부르지 않으므로
              오프라인에서도 AI 화면과 똑같이 동작한다. */}
          <button
            className="hint-button"
            disabled={isHinting || isCaseComplete}
            onClick={askHint}
            type="button"
          >
            <Lightbulb aria-hidden="true" size={16} />
            {isHinting ? '보는 중…' : '막혔어요'}
          </button>
          {/* <output>은 role="status"를 기본으로 갖는다. AI 화면은 <p>에
              role을 얹었지만 규칙이 이 태그를 권하고, 스타일은 클래스로
              걸려 있어 태그를 바꿔도 그대로다(다만 인라인 기본값이라
              블록으로 되돌린다). */}
          {hint && (
            <output className="hint-text" style={{ display: 'block' }}>
              {hint}
            </output>
          )}
          <button
            className={`log-download-button ${data.state.case_status === 'complete' ? 'complete' : ''}`}
            disabled={isExportingLog}
            onClick={() => setConfirming('log')}
            type="button"
          >
            <Download aria-hidden="true" size={16} />
            플레이로그 다운로드
          </button>
          <button
            className="reset-button"
            disabled={isPending}
            onClick={() => setConfirming('reset')}
            type="button"
          >
            <RefreshCcw aria-hidden="true" size={16} />
            새로 시작
          </button>
        </aside>
      </section>

      {effectiveSpreadsheetTheme && (
        <div className="ss-status-bar">
          {/* 엑셀이 모드를 띄우는 자리. 셀에 입력 중이면 '편집'이 되는데,
              면담 중 = 편집 중으로 읽힌다. */}
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
          {data.case_progress && !isCaseComplete && (
            <span className="ss-progress-counts">
              {/* 위장 중에도 도장은 찍힌다. 다만 여기서 도장은 동그란
                  잉크 자국이 아니라 체크 칸이다 — 엑셀이 진행을 보여 주는
                  방식(조건부 서식 아이콘, 체크박스 열)이 그것이고, 칸은
                  칸답게 각지고 줄이 맞아야 셀로 읽힌다. 찍히는 박자는
                  같고, 손으로 그은 표시라는 것만 체크 기울기로 남긴다. */}
              <span
                aria-label={`대립 ${data.case_progress.contradiction_done}/${data.case_progress.contradiction_total}`}
                className="contradiction-cells"
              >
                {contradictionStamps.map((stamp) => (
                  <span
                    aria-hidden="true"
                    className={[
                      'contradiction-cell',
                      stamp.done ? 'contradiction-cell--done' : '',
                      justAdvancedContradiction && stamp.fresh
                        ? 'contradiction-cell--fresh'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={stamp.key}
                  />
                ))}
              </span>
            </span>
          )}
          {/* AI 화면은 여기 '합계:'에 토큰 사용량을 띄운다. 오프라인은
              모델을 부르지 않아 그 숫자가 늘 0이라 이 칸이 비었다. 확보
              단서 수로 채워 봤지만 바로 왼쪽의 '증거 n/m'과 분모가 달라
              (진행률 쪽은 증거 외 항목도 센다) 나란히 놓으면 둘 중 하나가
              틀린 것처럼 읽힌다. 그래서 비워 둔다 — 엑셀도 선택이 없으면
              이 자리에 아무것도 안 띄운다. */}
          <span className="spacer" />
          {/* 진행률이 배율 슬라이더 자리에 숨는다. 손잡이 위치가 곧
              진행률이라 눈으로 보는 정보량은 AI 화면과 같다. 다만 저쪽은
              이 막대에 role="progressbar"를 얹었고 여기서는 그러지
              않는다 — 규칙(prefer-tag-over-role)이 <progress>를 쓰라고
              하는데 .ss-zoom은 엑셀 배율 슬라이더를 span 하나에 그리는
              CSS라 바꿀 수가 없다. 대신 옆의 숫자를 숨기지 않고 읽히게
              두었다. 화면에 이미 있던 글자라 보이는 것은 그대로고,
              스크린 리더에는 막대 대신 그 값이 간다. */}
          <span aria-hidden="true" className="ss-zoom" />
          <span aria-label={`사건 진행률 ${headerProgressPercent}%`}>
            {headerProgressPercent}%
          </span>
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

      {confirming && (
        <div className="reset-confirm-backdrop">
          <button
            aria-label="닫기"
            className="reset-confirm-scrim"
            onClick={() => setConfirming(null)}
            type="button"
          />
          <dialog
            aria-labelledby="offline-confirm-title"
            className="reset-confirm"
            open
          >
            <h2 id="offline-confirm-title">{CONFIRM_COPY[confirming].title}</h2>
            <p>{CONFIRM_COPY[confirming].body}</p>
            {CONFIRM_COPY[confirming].note && (
              <p className="reset-confirm-note">
                {CONFIRM_COPY[confirming].note}
              </p>
            )}
            <div className="reset-confirm-actions">
              {/* 취소 쪽에 처음 초점이 간다. 되돌릴 수 없는 조작을 여는
                  대화에서 Enter 한 번이 그대로 실행이 되면 안 된다. */}
              <button
                autoFocus
                className="reset-confirm-cancel"
                onClick={() => setConfirming(null)}
                type="button"
              >
                {CONFIRM_COPY[confirming].cancel}
              </button>
              <button
                className="reset-confirm-accept"
                disabled={confirming === 'log' ? isExportingLog : isPending}
                onClick={
                  confirming === 'close'
                    ? closeCase
                    : confirming === 'log'
                      ? downloadLog
                      : reset
                }
                type="button"
              >
                {confirming === 'log' && (
                  <Download aria-hidden="true" size={16} />
                )}
                {confirming === 'reset' && (
                  <RefreshCcw aria-hidden="true" size={16} />
                )}
                {CONFIRM_COPY[confirming].accept}
              </button>
            </div>
          </dialog>
        </div>
      )}
    </main>
  );
}

// The whole of the offline game's input. The server already decided what
// Master permits from here, so this only has to group it and render it —
// nothing is filtered or invented client-side, and a button the player can see
// is a move the GM will accept.
function ActionMenu({
  actions,
  disabled,
  onPick,
  onStatus,
  peopleHere,
  spreadsheet,
}: {
  actions: OfflineAction[];
  disabled: boolean;
  onPick: (action: OfflineAction) => void;
  onStatus: () => void;
  peopleHere: string[];
  spreadsheet: boolean;
}) {
  const grouped = actionGroupOrder
    .map((group) => ({
      group,
      items: actions.filter((action) => action.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  return (
    <section className="action-menu" aria-label="할 수 있는 행동">
      {grouped.map(({ group, items }) => (
        <div className="action-group" key={group}>
          <h3>{group}</h3>
          <div className="action-list">
            {items.map((action) => (
              <button
                className="action-button"
                disabled={disabled || action.disabled}
                key={action.id}
                onClick={() => onPick(action)}
                title={action.hint}
                type="button"
              >
                <span className="action-label">{action.label}</span>
                {(action.hint || action.detail) && (
                  <span className="action-detail">
                    {action.hint || action.detail}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="action-footer">
        <button
          className="action-status"
          disabled={disabled}
          onClick={onStatus}
          type="button"
        >
          수사 상황 정리
        </button>
        {/* 누가 이 방에 있는지는 도착 서술이 한 번 말하지만, 그 줄은
            곧 위로 밀려 올라간다. CASE294 실플레이에서 플레이어가 앞마당에
            선 채로 40분을 보냈다 — 연도희가 바로 거기 있었고, 화면에는
            "앞마당을 둘러본다" 한 줄뿐이었다. 행동 목록 옆에 계속 붙어
            있어야 하는 정보라 여기에 둔다. 버튼으로 만들지는 않는다 —
            사람을 만나는 것은 인물 카드의 몫이다. */}
        {peopleHere.length > 0 && (
          <p className="action-elsewhere action-here">
            이 방에 <strong>{peopleHere.join(', ')}</strong>
            {subjectParticle(peopleHere[peopleHere.length - 1])} 있습니다.
          </p>
        )}
        {/* 탭 이름을 그대로 적으면 위장에서 틀린 안내가 된다 — 이
            테마의 수첩에는 '장소'도 '증거'도 없고 '위치'와 '항목'이
            있다. 가리키는 곳이 실제로 화면에 있는 이름이어야 한다. */}
        <p className="action-elsewhere">
          사람을 만나려면{' '}
          <strong>
            {spreadsheet ? spreadsheetTabLabel('people', '인물') : '인물'}
          </strong>
          , 자리를 옮기려면{' '}
          <strong>
            {spreadsheet ? spreadsheetTabLabel('places', '장소') : '장소'}
          </strong>
          , 증거를 내밀려면{' '}
          <strong>
            {spreadsheet ? spreadsheetTabLabel('cards', '증거') : '증거'}
          </strong>{' '}
          탭에서 고르세요.
        </p>
      </div>
    </section>
  );
}

function NotebookPanel({
  busy,
  data,
  onPresent,
  onEndInterview,
  onSelect,
  onToggleBookmark,
  onToggleEvidence,
  resolveAction,
  selectedEvidenceIds,
  tab,
}: {
  busy: boolean;
  data: GameData;
  onPresent: () => void;
  onSelect: (kind: NotebookKind, id: string) => void;
  onEndInterview: () => void;
  onToggleBookmark: (content: string, role: string) => void;
  onToggleEvidence: (cardId: string) => void;
  resolveAction: (kind: NotebookKind, id: string) => OfflineAction | null;
  selectedEvidenceIds: string[];
  tab: Tab;
}) {
  const npcById = new Map(data.case.npcs.map((npc) => [npc.id, npc]));
  const locationById = new Map(
    data.case.locations.map((location) => [location.id, location]),
  );
  const cardById = new Map(data.case.cards.map((card) => [card.id, card]));
  const locationNameById = new Map(
    data.case.locations.map((location) => [location.id, location.name]),
  );
  const currentInterview = data.state.current_interview
    ? npcById.get(data.state.current_interview)
    : null;

  if (tab === 'cards') {
    return (
      <section className="panel">
        {/* AI 화면과 같은 제목. "최근 획득"이라고 적혀 있었는데 실제로는
            지금까지 확보한 것 전부를 보여 주므로 틀린 이름이었다. */}
        <h2>증거 ({data.acquired_cards.filter(Boolean).length}개)</h2>
        {/* The tray is what turns a pile of cards into a move. It only exists
            while someone is actually in front of the detective, because there
            is nobody to put anything to otherwise. */}
        {currentInterview ? (
          <div className="evidence-tray" aria-label="제시할 증거">
            <div className="evidence-slots">
              {selectedEvidenceIds.length ? (
                selectedEvidenceIds.map((cardId) => {
                  const card = cardById.get(cardId);
                  return (
                    <button
                      className="evidence-slot"
                      disabled={busy}
                      key={cardId}
                      onClick={() => onToggleEvidence(cardId)}
                      type="button"
                    >
                      {card ? displayCardTitle(card, data.case.npcs) : cardId}
                      <span aria-hidden="true">×</span>
                    </button>
                  );
                })
              ) : (
                <p className="evidence-slots-empty">
                  아래에서 카드를 골라 담으세요.
                </p>
              )}
            </div>
            <button
              className="evidence-present"
              disabled={busy || !selectedEvidenceIds.length}
              onClick={onPresent}
              type="button"
            >
              {currentInterview.name}에게 제시
              {selectedEvidenceIds.length > 1
                ? ` (${selectedEvidenceIds.length})`
                : ''}
            </button>
          </div>
        ) : (
          <p className="evidence-hint">
            면담 중일 때 카드를 골라 상대에게 제시할 수 있습니다.
          </p>
        )}
        <div className="stack">
          {data.acquired_cards.length ? (
            data.acquired_cards.map((card) => {
              if (!card) return null;
              // Same three markers the AI screen shows, from app/game.ts's own
              // evidenceStageMarkers: spent = this card's stage already opened,
              // ready = it is shown and that stage is next, early = shown but
              // an earlier stage in the chain has not broken yet.
              const marker = (data.evidence_stage_markers || {})[card.id];
              const picked = selectedEvidenceIds.includes(card.id);
              return (
                <button
                  className={`item item-selectable evidence-card${picked ? ' item-selected' : ''}${marker === 'spent' ? ' item-spent' : ''}`}
                  disabled={busy || !currentInterview}
                  key={card.id}
                  onClick={() => onToggleEvidence(card.id)}
                  type="button"
                >
                  {/* 코드와 제목을 각각 span으로 나눈다. AI 화면이 쓰는
                      것과 같은 구조이고, 스프레드시트 테마의
                      `strong:has(.item-card-id)` 규칙이 이 두 span을
                      J열(코드)과 K열(제목)에 따로 앉힌다. 이게 없으면
                      제목이 장소 이름 기준으로 잡힌 72px 칸에 들어가
                      한 단어씩 줄바꿈된다. */}
                  <strong>
                    <span className="item-card-id">{card.id}</span>{' '}
                    <span className="item-card-title">
                      {displayCardTitle(card, data.case.npcs)}
                    </span>
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
                      <span className="item-card-id">{record.evidence_id}</span>{' '}
                      <span className="item-card-title">
                        {card
                          ? displayCardTitle(card, data.case.npcs)
                          : '제시한 단서'}
                      </span>
                    </strong>
                    <p>{target}에게 제시됨</p>
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

  if (tab === 'testimony') {
    // 한 사람에게서 들은 것끼리 붙여 놓아야 "이 사람이 지금까지 뭐라고
    // 했는지"가 한눈에 잡힌다. heardStatementsFor가 이미 인물 → 들은 순서로
    // 정렬해 주므로 순서대로 훑으며 화자가 바뀌는 지점에서 끊으면 된다.
    // AI 화면과 같은 마크업이라 globals.css의 .testimony-* 를 그대로 받는다.
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
            const interviewed = data.state.interviewed_characters.includes(
              npc.id,
            );
            // Reachable from the room that person is actually in, or — once
            // they have been met — by sending 한지우 to fetch them. The card
            // stays visible either way (knowing who exists is not a spoiler),
            // and greyed-out says enough on its own.
            const action = resolveAction('npc', npc.id);
            const here = Boolean(action);
            const fetched = action?.id.startsWith('summon|') ?? false;
            const talking = npc.id === data.state.current_interview;
            return (
              <button
                className={`item item-selectable${talking ? ' item-selected' : ''}`}
                disabled={busy || !here}
                key={npc.id}
                onClick={() => onSelect('npc', npc.id)}
                type="button"
              >
                <strong>{npc.name}</strong>
                <p>
                  {npc.role} · {interviewed ? '면담함' : '아직 만나지 않음'} ·
                  진술{' '}
                  {
                    data.heard_statements.filter(
                      (statement) => statement.npcId === npc.id,
                    ).length
                  }
                  {fetched ? ' · 한지우가 데려온다' : ''}
                </p>
                {/* 어느 단계인지도, 몇 단계가 남았는지도 쓰지 않는다 —
                    지금까지 확인한 모든 사건에서 대립 단계가 둘 이상 적힌
                    인물은 진범뿐이라, 그걸 쓰면 첫 턴부터 진범이 드러난다.
                    변화가 있었다/없었다 두 갈래만 두면 그 차이는 언제나
                    플레이어가 직접 만들어 낸 결과로만 생긴다. */}
                {(data.state.npc_statement_stage[npc.id] || 'initial') !==
                  'initial' && (
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
    // Ported from app/DetectiveApp.tsx's own 장소 지도 rather than reinvented:
    // this copy had been a flat column of six full descriptions, which is the
    // same six paragraphs of grey prose whether the player has been there or
    // not, and a playtest said the room they were standing in did not read at
    // all. The grid, the access badges and the reveal gate are what make it
    // scannable — most cards carry no prose until the place has been entered.
    // Every class used here already lives in the shared globals.css.
    // Where each person is standing now, which is Master's present_location
    // until 한지우 has walked one of them somewhere else.
    const npcsByLocation = new Map<string, typeof data.case.npcs>();
    for (const npc of data.case.npcs) {
      const standing = effectiveNpcLocation(
        npc.present_location || undefined,
        data.state.completed_actions,
        npc.id,
      );
      if (!standing) continue;
      const list = npcsByLocation.get(standing) || [];
      list.push(npc);
      npcsByLocation.set(standing, list);
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
            // Somewhere the player can walk into from the start shows in full
            // immediately; a restricted or sealed one stays an unlabeled slot
            // until they have actually been. The map is complete from turn
            // one without handing out what a locked room holds.
            const revealed = accessLevel === 'open' || visited;
            const visitCount = data.state.location_visit_counts[place.id] || 0;
            // Everyone Master puts in this room, not only the ones already
            // met — knowing where to go looking is most of what a map is for.
            // Gated on `revealed` like the description is, so it never says
            // who is behind a door the detective has not opened.
            const presentNpcs = npcsByLocation.get(place.id) || [];
            const connectedNames = (place.connects_to || [])
              .map(
                (id) =>
                  data.case.locations.find((item) => item.id === id)?.name,
              )
              .filter((name): name is string => Boolean(name));
            const here = place.id === data.state.current_location;

            return (
              <button
                className={`item item-selectable ${here ? 'current' : ''} ${revealed ? '' : 'item-locked'}`}
                disabled={busy || !resolveAction('place', place.id)}
                key={place.id}
                onClick={() => onSelect('place', place.id)}
                type="button"
              >
                <strong>
                  {place.name}
                  <span className={`access-badge access-${accessLevel}`}>
                    {ACCESS_LABEL[accessLevel] || accessLevel}
                  </span>
                  {/* main shows a count only once somewhere has been
                      entered, which leaves "open but never been" looking the
                      same as "here". Both states are named instead. */}
                  {revealed && (
                    <span
                      className={`place-visit-count${visitCount ? '' : ' place-visit-none'}`}
                    >
                      {visitCount ? `방문 ${visitCount}회` : '미방문'}
                    </span>
                  )}
                </strong>
                {revealed ? (
                  <>
                    <p>{place.description}</p>
                    {connectedNames.length > 0 && (
                      <small>연결: {connectedNames.join(', ')}</small>
                    )}
                    {presentNpcs.length > 0 && (
                      <small>
                        있는 사람:{' '}
                        {presentNpcs
                          .map((npc) =>
                            data.state.interviewed_characters.includes(npc.id)
                              ? `${npc.name}(면담함)`
                              : npc.name,
                          )
                          .join(', ')}
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

  if (tab === 'timeline') {
    return (
      <section className="panel">
        <h2>기록</h2>
        <div className="stack">
          {data.state.known_public_timeline.length ? (
            data.state.known_public_timeline.map((note, index) => (
              <article className="item" key={`${note.text}-${index}`}>
                <p>
                  {note.time ? `${note.time} · ` : ''}
                  {note.text}
                </p>
              </article>
            ))
          ) : (
            <p className="empty">아직 남긴 기록이 없습니다.</p>
          )}
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
