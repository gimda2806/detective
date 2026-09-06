'use client';

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
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { downloadPlayLog, resetGameState, sendGameMessage } from './actions';

type GameData = Awaited<ReturnType<typeof resetGameState>> & {
  suggested_actions?: string[];
};
type InputMode = 'play' | 'meta' | 'case_close';
type Tab = 'cards' | 'people' | 'places' | 'timeline';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'cards', label: '증거' },
  { id: 'people', label: '인물' },
  { id: 'places', label: '장소' },
  { id: 'timeline', label: '타임라인' },
];

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

function CaseIntroContent({ content }: { content: string }) {
  return (
    <div className="case-brief-copy">
      {content
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) => {
          const isDialogue =
            /^[“"].+[”"]$/.test(block) || /^['‘].+['’]$/.test(block);

          return (
            <p
              className={isDialogue ? 'intro-dialogue' : undefined}
              key={index}
            >
              {block}
            </p>
          );
        })}
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
  const quotePattern = /([“"][^”"]+[”"]|['‘][^'’]+['’])/g;
  const isDialogueBlock = (text: string) =>
    /^[“"].+[”"]$/.test(text) || /^['‘].+['’]$/.test(text);
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

export function DetectiveApp({
  caseId,
  initialData,
}: {
  caseId: string;
  initialData: GameData;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [inputMode, setInputMode] = useState<InputMode>('play');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [clock, setClock] = useState('--:--');
  const [isIntroCollapsed, setIntroCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem(`detective:intro:${caseId}`) === 'collapsed',
  );
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

  const usage = useMemo(
    () =>
      `${data.state.api_usage.input_tokens.toLocaleString()} / ${data.state.api_usage.output_tokens.toLocaleString()}`,
    [data.state.api_usage],
  );

  function submit(
    messageOverride?: string,
    modeOverride?: InputMode,
    viaSuggestion = false,
  ) {
    const message = (messageOverride ?? draft).trim();
    const mode = modeOverride ?? inputMode;
    if (!message || isPending) return;

    if (!messageOverride) setDraft('');
    setError('');
    setData((current) => ({
      ...current,
      suggested_actions: [],
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
        setData(await sendGameMessage(caseId, message, mode, viaSuggestion));
      } catch {
        setError('메시지를 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      }
    });
  }

  function pickSuggestion(suggestion: string) {
    submit(suggestion, 'play', true);
  }

  // Fills the draft rather than submitting outright (unlike
  // pickSuggestion) — tapping a person/place card only says who or where
  // the player is interested in, not a fully-formed action. Left in the
  // box so the player can still narrow it down (a specific question, a
  // specific thing to look at) before sending, or send as-is to just go
  // there / start the interview.
  function fillDraftFromCard(text: string) {
    setInputMode('play');
    setDraft(text);
    draftInputRef.current?.focus();
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
      setData(await resetGameState(caseId));
      setActiveTab('cards');
    });
  }

  function downloadLog() {
    if (isExportingLog) return;
    setError('');
    startLogExport(async () => {
      try {
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <Link
            aria-label="사건 목록으로 돌아가기"
            className="back-button"
            href="/"
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
        <section className="chat-pane" aria-label="대화창">
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

          {!isPending && Boolean(data.suggested_actions?.length) && (
            <div className="suggested-actions" aria-label="물어볼 만한 질문">
              {data.suggested_actions?.map((suggestion, index) => (
                <button
                  className="suggestion-chip"
                  disabled={isPending}
                  key={`${index}-${suggestion}`}
                  onClick={() => pickSuggestion(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="mode-switch" role="tablist" aria-label="입력 모드">
              <button
                aria-selected={inputMode === 'play'}
                className={inputMode === 'play' ? 'active' : ''}
                disabled={isPending}
                onClick={() => setInputMode('play')}
                role="tab"
                type="button"
              >
                수사
              </button>
              <button
                aria-selected={inputMode === 'meta'}
                className={inputMode === 'meta' ? 'active' : ''}
                disabled={isPending}
                onClick={() => setInputMode('meta')}
                role="tab"
                type="button"
              >
                GM
              </button>
            </div>
            <input
              autoComplete="off"
              disabled={isPending}
              onChange={(event) => setDraft(event.target.value)}
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
            onSelectPrompt={fillDraftFromCard}
            tab={activeTab}
          />

          <footer className="meter">
            <span>토큰 사용량</span>
            <strong>{usage}</strong>
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

function NotebookPanel({
  data,
  onSelectPrompt,
  tab,
}: {
  data: GameData;
  onSelectPrompt: (text: string) => void;
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
              const title = displayCardTitle(card, data.case.npcs);
              const presentPrompt = currentInterview
                ? `${withObjectParticle(title)} ${currentInterview.name}에게 제시한다`
                : `${withObjectParticle(title)} 제시한다`;
              return (
                <button
                  className="item item-selectable"
                  key={card.id}
                  onClick={() => onSelectPrompt(presentPrompt)}
                  type="button"
                >
                  <strong>{title}</strong>
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
            return (
              <button
                className="item item-selectable"
                key={npc.id}
                onClick={() =>
                  onSelectPrompt(`${withObjectParticle(npc.name)} 만나러 간다`)
                }
                type="button"
              >
                <strong>{npc.name}</strong>
                <p>
                  {npc.role} · {interviewed ? 'interviewed' : 'not interviewed'}
                </p>
                <small>
                  {data.state.npc_statement_stage[npc.id] || 'initial'}
                </small>
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
              key={place.id}
              onClick={() =>
                onSelectPrompt(`${withDirectionParticle(place.name)} 이동한다`)
              }
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
            <article className="item" key={`${note}-${index}`}>
              <p>{note}</p>
            </article>
          ))
        ) : (
          <p className="empty">아직 타임라인 기록이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
