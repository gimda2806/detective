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
const actionGroupOrder = ['면담', '현장', '인물', '사건'] as const;

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
    setSelectedEvidenceIds([]);
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
  onPick,
  onStatus,
}: {
  actions: OfflineAction[];
  disabled: boolean;
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
        <p className="action-elsewhere">
          자리를 옮기려면 <strong>장소</strong>, 증거를 내밀려면{' '}
          <strong>증거</strong> 탭에서 고르세요.
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
                  <strong>
                    {displayCardTitle(card, data.case.npcs)}
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
            // Reachable only from the room that person is actually in, which
            // is Master's own present_location. The card stays visible either
            // way — knowing who exists is not a spoiler — and greyed-out says
            // enough on its own.
            const here = Boolean(resolveAction('npc', npc.id));
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
