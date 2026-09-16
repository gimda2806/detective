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
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileCheck2,
  MapPin,
  PencilLine,
  RefreshCcw,
  Search,
  Table2,
  Undo2,
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
import { effectiveNpcLocation } from '../gm/offline-summon';
import {
  spreadsheetSpeakerLabel,
  spreadsheetTabLabel,
} from '../spreadsheetLabels';
import {
  downloadOfflinePlayLog,
  resetOfflineGameState,
  sendOfflineAction,
} from './actions';

type GameData = Awaited<ReturnType<typeof resetOfflineGameState>>;
type OfflineAction = GameData['available_actions'][number];
type Tab = 'cards' | 'testimony' | 'people' | 'places' | 'timeline';
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

function MessageContent({
  content,
  isMeta,
  role,
  spreadsheet,
}: {
  content: string;
  isMeta: boolean;
  role: 'assistant' | 'user' | 'detective' | 'jiwoo';
  spreadsheet: boolean;
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

        const isDialogue = isDialogueBlock(text);

        return (
          <span
            className={`message-line ${isDialogue ? 'dialogue' : 'narration'}`}
            key={index}
          >
            {text}
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
  const [confirming, setConfirming] = useState<ConfirmKind | null>(null);
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
    if (!confirming) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setConfirming(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirming]);

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
    setSelectedEvidenceIds([]);
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
    if (action) runAction(action);
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
    }
  }

  return (
    <main
      className="app-shell"
      data-theme={effectiveSpreadsheetTheme ? 'spreadsheet' : undefined}
    >
      {effectiveSpreadsheetTheme && (
        <div className="ss-titlebar">
          <span className="ss-titlebar__case">
            {data.case.case_id.toLowerCase()}.{data.case.title}
          </span>
        </div>
      )}
      <header className="topbar">
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
        </div>
        <div className="status-row">
          <span>
            <Clock3 aria-hidden="true" size={16} />
            {clock}
          </span>
          <span>
            <MapPin aria-hidden="true" size={16} />
            {data.current_location.name}
          </span>
          <strong>
            {data.state.case_status === 'complete'
              ? '종료'
              : data.case.status_label}
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
                  <MessageContent
                    content={item.content}
                    isMeta={item.mode === 'meta'}
                    role={item.role}
                    spreadsheet={effectiveSpreadsheetTheme}
                  />
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
            spreadsheet={effectiveSpreadsheetTheme}
          />
        </section>

        <aside className="notebook" aria-label="사건 수첩">
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
            onPresent={presentSelected}
            onSelect={selectFromNotebook}
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
              증거 {data.case_progress.evidence_done}/
              {data.case_progress.evidence_total} · 대립{' '}
              {data.case_progress.contradiction_done}/
              {data.case_progress.contradiction_total}
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
  spreadsheet,
}: {
  actions: OfflineAction[];
  disabled: boolean;
  onPick: (action: OfflineAction) => void;
  onStatus: () => void;
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
  onSelect,
  onToggleEvidence,
  resolveAction,
  selectedEvidenceIds,
  tab,
}: {
  busy: boolean;
  data: GameData;
  onPresent: () => void;
  onSelect: (kind: NotebookKind, id: string) => void;
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
  const currentInterview = data.state.current_interview
    ? npcById.get(data.state.current_interview)
    : null;

  if (tab === 'cards') {
    return (
      <section className="panel">
        <h2>최근 획득</h2>
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
        <h2>면담 상태</h2>
        {currentInterview && (
          <div className="interview-strip">
            <span>현재 면담</span>
            <strong>{currentInterview.name}</strong>
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
                  {npc.role} · {interviewed ? '면담함' : '아직 만나지 않음'}
                  {fetched ? ' · 한지우가 데려온다' : ''}
                </p>
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
