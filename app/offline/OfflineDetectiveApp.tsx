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
  downloadOfflinePlayLog,
  resetOfflineGameState,
  sendOfflineAction,
} from './actions';

type GameData = Awaited<ReturnType<typeof resetOfflineGameState>>;
type OfflineAction = GameData['available_actions'][number];
type Tab = 'cards' | 'people' | 'places' | 'timeline';
// What a notebook entry stands for, so a tap can be turned into the matching
// authorised action instead of a sentence the player would have to type.
type NotebookKind = 'card' | 'npc' | 'place';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'cards', label: '증거' },
  { id: 'people', label: '인물' },
  { id: 'places', label: '장소' },
  { id: 'timeline', label: '기록' },
];

// Order the action menu reads in: what is happening in front of the detective
// right now first, the room second, then people, then leaving.
const actionGroupOrder = [
  '면담',
  '증거 제시',
  '현장',
  '인물',
  '이동',
  '사건',
] as const;

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
}: {
  content: string;
  isMeta: boolean;
  role: 'assistant' | 'user' | 'detective' | 'jiwoo';
}) {
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
        {isMeta && <span className="message-label">GM</span>}
        {role === 'detective' && (
          <span className="message-label detective-label">탐정</span>
        )}
        {role === 'jiwoo' && (
          <span className="message-label jiwoo-label">한지우</span>
        )}
        {content}
      </p>
    );
  }

  return (
    <div className="message-bubble structured-message">
      {isMeta && <span className="message-label">GM</span>}
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

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setIntroCollapsed(
      window.localStorage.getItem(`detective:intro:${caseId}`) === 'collapsed',
    );
  }, [caseId]);
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
        ? `present|${id}|${data.state.current_interview}`
        : kind === 'npc'
          ? `talk|${id}`
          : `move|${id}`;

    return (
      data.available_actions.find(
        (action) => action.id === wanted && !action.disabled,
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
    if (isPending) return;
    setError('');
    startTransition(async () => {
      setData(await resetOfflineGameState(caseId));
      setActiveTab('cards');
    });
  }

  function downloadLog() {
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <Link
            aria-label="사건 목록으로 돌아가기"
            className="back-button"
            href="/offline"
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </Link>
          <div className="case-heading">
            <p>{data.case.case_id}</p>
            <h1>{data.case.title}</h1>
          </div>
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
        </div>
      </header>

      <section className="workspace" aria-label="추리 게임">
        <section className="chat-pane offline" aria-label="대화창">
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
                <MessageContent
                  content={item.content}
                  isMeta={item.mode === 'meta'}
                  role={item.role}
                />
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
            markers={data.evidence_stage_markers || {}}
            onPick={runAction}
            onStatus={askStatus}
          />
        </section>

        <aside className="notebook" aria-label="사건 수첩">
          <div className="tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <NotebookPanel
            data={data}
            onSelect={selectFromNotebook}
            resolveAction={offlineActionFor}
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
            onClick={closeCase}
            type="button"
          >
            {data.state.case_status === 'complete'
              ? '사건 종결 완료'
              : '사건 종결'}
          </button>
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
            onClick={reset}
            type="button"
          >
            <RefreshCcw aria-hidden="true" size={16} />
            새로 시작
          </button>
        </aside>
      </section>
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
  markers,
  onPick,
  onStatus,
}: {
  actions: OfflineAction[];
  disabled: boolean;
  // app/game.ts's own evidenceStageMarkers, reused rather than recomputed:
  // spent = the stage this card belongs to actually opened, ready = it has
  // been shown and that stage is next, early = shown but an earlier stage in
  // the chain has not broken yet. Every acquired card stays presentable to
  // everyone (hiding the useless ones would mark out the useful ones), so
  // without these a player sweeps every card against every person.
  markers: Record<string, string>;
  onPick: (action: OfflineAction) => void;
  onStatus: () => void;
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
            {items.map((action) => {
              const marker =
                action.group === '증거 제시'
                  ? markers[action.id.split('|')[1]]
                  : undefined;

              return (
                <button
                  className={`action-button action-${action.group === '증거 제시' ? 'present' : 'default'}${marker === 'spent' ? ' item-spent' : ''}`}
                  disabled={disabled || action.disabled}
                  key={action.id}
                  onClick={() => onPick(action)}
                  title={action.hint}
                  type="button"
                >
                  <span className="action-label">
                    {action.label}
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
                  </span>
                  {(action.hint || action.detail) && (
                    <span className="action-detail">
                      {action.hint || action.detail}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button
        className="action-status"
        disabled={disabled}
        onClick={onStatus}
        type="button"
      >
        수사 상황 정리
      </button>
    </section>
  );
}

function NotebookPanel({
  data,
  onSelect,
  resolveAction,
  tab,
}: {
  data: GameData;
  onSelect: (kind: NotebookKind, id: string) => void;
  resolveAction: (kind: NotebookKind, id: string) => OfflineAction | null;
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
        <div className="stack">
          {data.acquired_cards.length ? (
            data.acquired_cards.map((card) => {
              if (!card) return null;
              return (
                <button
                  className="item item-selectable"
                  disabled={!resolveAction('card', card.id)}
                  key={card.id}
                  onClick={() => onSelect('card', card.id)}
                  type="button"
                >
                  <strong>{displayCardTitle(card, data.case.npcs)}</strong>
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
                      {card
                        ? displayCardTitle(card, data.case.npcs)
                        : '제시한 단서'}
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
            return (
              <button
                className="item item-selectable"
                disabled={!resolveAction('npc', npc.id)}
                key={npc.id}
                onClick={() => onSelect('npc', npc.id)}
                type="button"
              >
                <strong>{npc.name}</strong>
                <p>
                  {npc.role} · {interviewed ? '면담함' : '아직 만나지 않음'}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (tab === 'places') {
    return (
      <section className="panel">
        <h2>현재 장소</h2>
        <div className="stack">
          {data.case.locations.map((place) => (
            <button
              className={`item item-selectable ${place.id === data.state.current_location ? 'current' : ''}`}
              disabled={!resolveAction('place', place.id)}
              key={place.id}
              onClick={() => onSelect('place', place.id)}
              type="button"
            >
              <strong>{place.name}</strong>
              <p>{place.description}</p>
            </button>
          ))}
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
