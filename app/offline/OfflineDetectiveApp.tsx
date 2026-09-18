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
} from './actions';

type GameData = Awaited<ReturnType<typeof resetOfflineGameState>>;
type OfflineAction = GameData['available_actions'][number];
type Tab = 'hypothesis' | 'cards' | 'testimony' | 'people' | 'places';
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

// 가설 보드의 칸 넷. `app/gm/offline-hypothesis.ts` 에 같은 상수가 있지만
// 거기서 import 하지 않는다 — 그 파일은 master-index 를 끌고 오므로 클라이언트
// 번들에 서버 전용 코드가 딸려 온다. 화면에 필요한 것은 순서와 이름뿐이다.
const HYPOTHESIS_SLOTS = ['who', 'when', 'why', 'how'] as const;
type HypothesisSlot = (typeof HYPOTHESIS_SLOTS)[number];
const SLOT_LABEL: Record<HypothesisSlot, string> = {
  who: '누가',
  when: '언제',
  why: '왜',
  how: '어떻게',
};
// 칸이 비었을 때 무엇을 고르는 자리인지 한 줄로 알려 준다 — 「왜」만 보고는
// 무엇을 적어야 하는지 모른다.
const SLOT_HINT: Record<HypothesisSlot, string> = {
  who: '이 일을 한 사람',
  when: '그 일이 벌어진 때',
  why: '그렇게 한 까닭',
  how: '그 방법',
};

const tabs: Array<{ id: Tab; label: string }> = [
  // 가설 보드가 맨 앞이다 — 이 사건들에서 플레이어가 하는 일의 본체이고,
  // 나머지 탭(증거·진술·인물·장소)은 그 칸을 채울 재료다. 보드가 꺼진
  // 사건에서는 이 탭을 통째로 걸러낸다(`visibleTabs`), 309건이 그렇다.
  { id: 'hypothesis', label: '가설' },
  { id: 'cards', label: '증거' },
  // 진술 탭이 없어서 들은 말이 화면 어디에도 남지 않았다. 사건 하나를
  // 끝까지 풀면 heard_statements가 17~20건 쌓이는데(CASE305 17, CASE294 20,
  // CASE212 18) 그 전부가 대화 스크롤 속에만 있었다 — 서버는 stateView에서
  // 이미 heard_statements를 내려보내고 있었고 받는 쪽이 없었을 뿐이다.
  { id: 'testimony', label: '진술' },
  { id: 'people', label: '인물' },
  { id: 'places', label: '장소' },
  // 「기록」과 「메모」는 이 화면에서 뺐다(2026-09 사용자 결정). AI 화면
  // (DetectiveApp.tsx)에는 그대로 있고, 뺀 이유가 각각 그 화면과의 차이다.
  //
  // **메모장은 AI 환경에서 AI가 한 발언을 붙잡아 두려고 있던 기능이다.**
  // 거기서는 문장이 매번 새로 생성되므로, 한 번 흘러간 줄은 그 자리에서
  // 잡아 두지 않으면 어디에도 남지 않는다. 오프라인은 반대다 — 나오는
  // 문장이 전부 마스터에 적혀 있고, 들은 말은 「진술」 보드에, 찾은 것은
  // 「증거」에, 사람과 방은 각자 탭에 잘리지 않고 쌓인다. 붙잡아 둘
  // 필요가 있는 즉흥이 없다.
  //
  // 「기록」은 오프라인에서 **늘 비어 있었다.** 엔진이 timeline_notes 를 한
  // 번도 채우지 않으므로 known_public_timeline 이 끝까지 빈 배열이고,
  // 눌러도 "아직 남긴 기록이 없습니다"만 나왔다.
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

const actionGroupOrder = ['면담', '현장', '이동'] as const;

// MessageContent 의 prop 이지 ARIA 속성이 아니다. 리터럴로 적으면
// jsx-a11y(aria-role) 이 `role="assistant"` 를 잘못된 ARIA 역할로 읽는다 —
// 대화 목록 쪽은 `role={item.role}` 이라 걸리지 않았을 뿐이다.
const ASSISTANT_ROLE = 'assistant' as const;

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

// 여기에는 「더 살펴볼 수 있는 대상」 밑줄 표식이 없다. AI 화면에는 있고
// (app/DetectiveApp.tsx 에 같은 이름의 함수들이 있다) 거기서는 필요하다 —
// 자유 입력이라 무엇을 건드릴 수 있는지가 서술 문장 안에 묻히기 때문이다.
//
// 오프라인은 그 목록이 곧 행동 버튼이다. 「창틀 걸쇠를 살펴본다」가 화면
// 아래 서 있는데 서술에서 '창틀 걸쇠'에 또 밑줄을 그으면 같은 말을 두 번
// 하는 것이고, 표식이 남아 있는지 세는 것보다 버튼을 세는 쪽이 빠르다.
// 밑줄이 없어야 헛수고로 섞어 둔 자리(probeTargetsAt)도 진짜와 구별되지
// 않는다 — 밑줄이 붙은 것만 진짜라면 섞어 둔 의미가 없다.

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
}: {
  content: string;
  isMeta: boolean;
  role: 'assistant' | 'user' | 'detective' | 'jiwoo';
  spreadsheet: boolean;
  npcNames: string[];
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
  // 장면 로그에서는 문장 단위로 쪼개지 않는다. AI 화면은 모델이 한 덩어리로
  // 뱉은 긴 문단을 읽히게 하려고 마침표마다 줄을 갈랐지만, 오프라인 서술은
  // 엔진이 이미 문단(`\n\n`)으로 끊어서 준다 — 거기서 또 문장마다 갈라
  // 10px씩 벌려 놓으면 서술부터 이미 끊긴 채로 시작하고, 그 뒤에 붙는
  // 탐정·한지우의 대사가 같은 호흡으로 읽힐 수가 없다. 스프레드시트 위장은
  // 한 줄이 곧 한 행이라 옛 규칙을 그대로 쓴다.
  const splitReadableText = (text: string) =>
    spreadsheet
      ? text
          .replace(/([.!?])\s+/g, '$1\n')
          .split('\n')
          .map((part) => part.trim())
          .filter(Boolean)
      : [text];
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
  // 보드가 켜진 사건은 지금 일곱(CASE001~006 · CASE030)이고 나머지는
  // `enabled: false` 로 내려온다. 꺼져 있으면 탭째로 없앤다 — 빈 보드를
  // 보여 주면 「내가 아직 못 여는 것」처럼 읽힌다.
  const hypothesis = data.hypothesis?.enabled ? data.hypothesis : null;
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
  // 가설 보드가 수첩 탭에서 나와 「보기」 아래 제 자리를 갖는 폭.
  // offline.css 의 세 칸 분기(1400px)와 같은 값이어야 한다 — 어긋나면
  // 보드가 있을 자리가 없는데 탭에서는 빠진 상태가 된다.
  const [isBoardColumnWidth, setBoardColumnWidth] = useState(false);
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
  // 「막혔어요」가 돌려주는 한 줄. 한때 오프라인만 탐정·한지우의 주고받기
  // 한 쌍으로 받았는데, 실제로 막힌 플레이어에게는 그게 안내가 아니라 대화
  // 한 토막이었다(2026-09 사용자 결정으로 되돌림). 지금은 AI 화면과 같이
  // requestHint()가 고른 문장을 그대로 띄운다.
  // 「반박이 준 사실이 그 순간 수첩으로 들어가는 것」을 보이게 하는 자리.
  // 가설을 들이대 반박당하면 GM 서술은 [도입] [그 사람의 반박] [풀려난 사실]
  // 세 문단이 **같은 크기로** 흐르는데, 세 번째가 수첩에 들어간 것이다.
  // 그냥 서술로 읽히면 「틀린 가설이 전진이다」라는 이 게임의 축이 안 보인다.
  //
  // 서버가 그 사실을 대화 항목에 실어 주지는 않으므로(그 계약은 엔진 쪽이고
  // 지금 다른 세션이 들고 있다) 화면이 턴 전후의 `heard_statements` 를 견줘
  // 늘어난 것만 잡는다. 새로고침하면 사라지는데, 이 표식은 「방금 들어왔다」를
  // 말하는 것이라 그게 맞다 — 지나간 것은 진술 탭에 그대로 있다.
  const heardIdsRef = useRef<string[]>(
    initialData.heard_statements.map((item) => item.id),
  );
  const [justHeard, setJustHeard] = useState<string[]>([]);
  const [hintText, setHintText] = useState('');
  const [isHinting, setIsHinting] = useState(false);
  // 대립이 한 칸 나아간 턴에만 카운터가 한 번 뛴다. 화면에서 모순이
  // 성립한 순간을 알려 주는 유일한 신호다.
  const [justAdvancedContradiction, setJustAdvancedContradiction] =
    useState(false);
  const prevContradictionDoneRef = useRef<number | null>(null);
  // 헛다리가 하나 벗겨진 턴도 같은 박자로 한 번 내려친다. 대립과 따로
  // 세는 이유는, 한 턴에 둘 다 움직이는 일이 없기 때문이다 —
  // clearableHerring 은 단계가 안 터졌을 때만 본다.
  const [justAdvancedHerring, setJustAdvancedHerring] = useState(false);
  const prevHerringDoneRef = useRef<number | null>(null);
  const effectiveSpreadsheetTheme = isSpreadsheetTheme && isDesktop;

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setIntroCollapsed(
      window.localStorage.getItem(`detective:intro:${caseId}`) === 'collapsed',
    );
  }, [caseId]);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1400px)');
    // oxlint-disable-next-line react/react-compiler
    setBoardColumnWidth(wide.matches);
    const handleWide = (event: MediaQueryListEvent) =>
      setBoardColumnWidth(event.matches);
    wide.addEventListener('change', handleWide);
    return () => wide.removeEventListener('change', handleWide);
  }, []);

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
    const done = data.case_progress?.herring_done;
    if (done === undefined) return;
    const prev = prevHerringDoneRef.current;
    // oxlint-disable-next-line react/react-compiler
    prevHerringDoneRef.current = done;
    if (prev !== null && done > prev) {
      // oxlint-disable-next-line react/react-compiler
      setJustAdvancedHerring(true);
      const timer = window.setTimeout(
        () => setJustAdvancedHerring(false),
        1600,
      );
      return () => window.clearTimeout(timer);
    }
  }, [data.case_progress?.herring_done]);

  useEffect(() => {
    if (confirming !== 'log') {
      pendingLogRef.current = null;
      return;
    }
    let live = true;
    downloadOfflinePlayLog(caseId)
      .then((log) => {
        if (live) pendingLogRef.current = log;
      })
      .catch(() => {
        // 못 받아 두면 downloadLog 가 눌린 뒤에 다시 받는다. 그쪽이 실패하면
        // 거기서 오류를 띄우므로 여기서는 조용히 넘어간다.
      });
    return () => {
      live = false;
    };
  }, [confirming, caseId]);

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
      setHintText(result.text);
    } catch {
      setHintText('지금은 확인할 수 없습니다. 잠시 뒤 다시 눌러 주세요.');
    } finally {
      setIsHinting(false);
    }
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
  // 종결 턴의 첫 문단. 엔딩은 길어서 맨 아래로 내리면 마지막 줄에서 시작하게
  // 된다 — 사건의 마지막 장면을 첫 줄부터 읽게 하려고 그 문단을 잡아 둔다
  // (2026-09 사용자 결정).
  const endingRef = useRef<HTMLDivElement>(null);
  // 확인 대화를 여는 동안 미리 받아 두는 플레이로그. saveLogFile 의 주석 3번
  // 참고 — 눌린 뒤에 받으면 그 사이에 제스처가 끝난다.
  const pendingLogRef = useRef<{ content: string; filename: string } | null>(
    null,
  );

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

  // 종결 턴은 플레이어의 줄(`role: 'user'`) 하나와 그 뒤의 엔딩 문단들로
  // 들어온다. 마지막 플레이어 줄 다음 항목이 엔딩의 첫 줄이다.
  const isCaseClosed = data.state.case_status === 'complete';
  const endingIndex = useMemo(() => {
    if (!isCaseClosed) return -1;
    for (let i = displayedConversation.length - 1; i >= 0; i -= 1) {
      if (displayedConversation[i].role !== 'user') continue;
      return i + 1 < displayedConversation.length ? i + 1 : i;
    }
    return -1;
  }, [isCaseClosed, displayedConversation]);

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
    if (!node) return;
    // 아직 한 턴도 두지 않았으면 맨 아래로 내리지 않는다. 도입부가 대화창
    // 안으로 들어오면서 첫 화면의 맨 아래는 「가장 최근 턴」이 아니라
    // 「도입부의 마지막 문단」이 됐다 — 사건을 처음 여는 사람이 이야기의
    // 첫 줄을 건너뛴 자리에서 시작하게 된다(측정: 새로 시작한 CASE030 에서
    // scrollTop 745). 한 턴이라도 두면 그때부터는 종전대로 맨 아래다.
    if (displayedConversation.length === 0) return;
    // 종결 턴만 예외다 — 아래 효과가 엔딩의 첫 문단을 창 위로 올린다.
    if (endingIndex >= 0) return;
    node.scrollTop = node.scrollHeight;
  }, [displayedConversation, endingIndex]);

  // 사건이 종결되면 엔딩의 첫 문단이 창 맨 위에 선다. 맨 아래로 내리면
  // 여러 문단짜리 마지막 장면을 끝에서부터 거슬러 읽게 된다.
  useEffect(() => {
    const node = messagesRef.current;
    const anchor = endingRef.current;
    if (!node || !anchor || endingIndex < 0) return;
    node.scrollTop = Math.max(0, anchor.offsetTop - node.offsetTop);
  }, [endingIndex]);

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
        absorb(await sendOfflineAction(caseId, action.id, 'play'));
      } catch {
        setError('행동을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
      }
    });
  }

  // 메뉴에 없는 합성 행동(`present|…`, `hypothesis|…`)을 보내는 자리.
  // `runAction` 은 메뉴가 준 `OfflineAction` 객체를 받으므로 이쪽이 따로 있다.
  //
  // 수첩은 **닫지 않는다.** 가설 보드는 칸 넷을 연달아 채우는 자리이고,
  // 적은 결과가 보드 자체에 바로 나타나므로(칸이 채워지고 후보에 줄이 그어진다)
  // 시트를 닫으면 방금 한 일을 확인하러 다시 열어야 한다. 제시(`presentSelected`)가
  // 닫는 것은 그쪽 대답이 대화창에만 있기 때문이다.
  // 턴이 새로 풀어 준 진술을 잡아 둔다. 늘어난 것이 없으면 표식도 없다.
  function absorb(next: GameData) {
    const before = new Set(heardIdsRef.current);
    const added = next.heard_statements
      .filter((item) => !before.has(item.id))
      .map((item) => item.id);
    heardIdsRef.current = next.heard_statements.map((item) => item.id);
    setJustHeard(added);
    setData(next);
  }

  function runComposedAction(actionId: string) {
    if (isPending) return;
    setError('');
    startTransition(async () => {
      try {
        absorb(await sendOfflineAction(caseId, actionId, 'play'));
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
    // 폰에서는 수첩이 화면을 덮는 시트다. 종결 버튼이 그 안에 있어서
    // 누르고 나면 마지막 장면이 시트 뒤에 가려져 있었다(2026-09 사용자
    // 지적) — 사건의 끝은 수첩이 아니라 대화창에서 읽는 것이다.
    closeNotebook();
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

  // 파일을 실제로 떨구는 부분. 폰에서 내려받아지지 않는다는 신고가 있었고,
  // 여기 세 가지가 겹쳐 있었다.
  //
  //  1. 앵커를 문서에 붙이지 않고 click() 했다. 데스크톱 크롬은 봐주지만
  //     파이어폭스와 일부 모바일 브라우저는 떼어 놓은 앵커의 클릭을 무시한다.
  //  2. revokeObjectURL 을 click() 바로 다음 줄에서 불렀다. 브라우저가 blob 을
  //     읽기도 전에 주소를 없애는 것이라, 느린 기기에서 빈손이 된다.
  //  3. 가장 큰 것 — 아래 downloadLog 에서 await 뒤에 click() 이 있었다.
  //     그 시점에는 사용자 제스처가 이미 끝나 있어서, 제스처 없는 다운로드를
  //     막는 모바일 브라우저가 조용히 취소한다.
  function saveLogFile(log: { content: string; filename: string }) {
    const blob = new Blob([log.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = log.filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function downloadLog() {
    setConfirming(null);
    if (isExportingLog) return;
    setError('');
    // 확인 대화를 여는 순간 미리 받아 둔 것이 있으면 여기서 곧바로 떨군다.
    // click() 이 버튼을 누른 그 제스처 안에서 일어나야 모바일이 막지 않는다.
    const ready = pendingLogRef.current;
    if (ready) {
      // 이 파일이 이미 여러 군데서 쓰는 예외와 같은 것 — ref 를 effect 에서도
      // 읽으므로 컴파일러 규칙이 여기 쓰기를 막는데, 한 번 쓴 것을 버리는
      // 용도라 재렌더와 무관하다.
      // oxlint-disable-next-line react/react-compiler
      pendingLogRef.current = null;
      saveLogFile(ready);
      return;
    }
    startLogExport(async () => {
      try {
        saveLogFile(await downloadOfflinePlayLog(caseId));
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
  // 같은 줄의 두 번째 묶음 — 벗겨 낸 헛다리. 대립이 진범 쪽으로 좁혀 간
  // 걸음이라면 이쪽은 아닌 사람을 지운 걸음이고, 수사는 사실 두 방향으로
  // 동시에 간다. 도장 모양은 같게 두되 묶음 사이를 띄워서 "대립 셋 +
  // 헛다리 둘"이 한 줄의 다섯 칸으로 뭉개지지 않게 한다.
  const herringStamps = Array.from(
    { length: data.case_progress?.herring_total ?? 0 },
    (_unused, index) => ({
      key: `herring-${index}`,
      done: index < (data.case_progress?.herring_done ?? 0),
      fresh: index === (data.case_progress?.herring_done ?? 0) - 1,
    }),
  );

  // 보드를 「보기」 아래 칸으로 내보낼 수 있는가. 넓은 화면이고, 이 사건에
  // 보드가 있고, 위장 테마가 아닐 때 — 세 칸 배치가 서는 조건 그대로다.
  //
  // 내보내면 수첩 탭에서는 뺀다(2026-09-18 사용자 결정: 「인물이랑 증거
  // 카드를 왔다갔다 하면서 보기 너무 어렵다」). 보드는 증거·인물을 보며
  // 채우는 것이라 같은 탭 줄에 있으면 볼 때마다 보던 것을 덮는다.
  const boardInColumn = Boolean(
    hypothesis && isBoardColumnWidth && !effectiveSpreadsheetTheme,
  );
  const visibleTabs =
    hypothesis && !boardInColumn
      ? tabs
      : tabs.filter((tab) => tab.id !== 'hypothesis');
  // 「가설」 탭을 보던 중에 창을 넓히면 그 탭이 사라진다. 그대로 두면
  // 보드가 칸과 수첩 양쪽에 그려지므로 증거 탭으로 내린다. 상태를 고치지
  // 않고 읽을 때만 접는 것은, 창을 도로 좁히면 보던 탭으로 돌아오게
  // 하려는 것이다.
  const shownTab: Tab = visibleTabs.some((entry) => entry.id === activeTab)
    ? activeTab
    : 'cards';

  function tabCount(tab: Tab): number {
    switch (tab) {
      // 굳은 칸 수. 넷이 다 굳으면 2막이 열리므로 이 숫자가 곧 진행도다.
      case 'hypothesis':
        return hypothesis
          ? HYPOTHESIS_SLOTS.filter((slot) => hypothesis.confirmed[slot]).length
          : 0;
      case 'cards':
        return data.acquired_cards.length;
      case 'testimony':
        return data.heard_statements.length;
      case 'people':
        return data.case.npcs.length;
      case 'places':
        return data.case.locations.length;
    }
  }

  // 「보기」가 두 자리 중 하나에 선다. 위장 테마에서는 시트의 행이라
  // 반드시 표 안(`.chat-pane`)에 있어야 하고, 장면 로그에서는 표 밖 —
  // `.workspace` 의 형제 — 로 나가 넓은 화면에서 본문과 수첩 사이의 칸이
  // 된다(offline.css 「보기의 자리」). 엘리먼트를 여기서 한 번만 만들어
  // 두 자리가 같은 것을 받게 한다.
  const actionMenu = (
    <ActionMenu
      actions={data.available_actions}
      disabled={isPending}
      onPick={runAction}
      onStatus={askStatus}
      peopleHere={peopleHere}
      spreadsheet={effectiveSpreadsheetTheme}
    />
  );

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
                  {herringStamps.length > 0 && (
                    <span
                      aria-label={`벗긴 헛다리 ${data.case_progress.herring_done}/${data.case_progress.herring_total}`}
                      className="contradiction-stamps contradiction-stamps--herring"
                    >
                      {herringStamps.map((stamp) => (
                        <span
                          aria-hidden="true"
                          className={[
                            'contradiction-stamp',
                            'contradiction-stamp--cleared',
                            stamp.done ? 'contradiction-stamp--done' : '',
                            justAdvancedHerring && stamp.fresh
                              ? 'contradiction-stamp--fresh'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          key={stamp.key}
                        />
                      ))}
                    </span>
                  )}
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

      <section
        aria-label="추리 게임"
        className={`workspace${boardInColumn ? ' workspace--board' : ''}`}
      >
        {/* `scene` 은 말풍선을 걷어내고 한 턴을 대본 한 토막으로 읽히게 하는
            장면 로그 모드다(offline.css). 스프레드시트 위장일 때는 붙이지
            않는다 — 그쪽은 한 줄이 한 행인 표가 되어야 하고, 장면 로그 규칙이
            그 격자를 덮어써 위장이 무너진다. */}
        <section
          aria-label="대화창"
          className={`chat-pane offline${effectiveSpreadsheetTheme ? '' : ' scene'}`}
        >
          {effectiveSpreadsheetTheme && (
            <div className="ss-col-header" aria-hidden="true">
              <span />
              <span>A</span>
              <span>B</span>
            </div>
          )}
          {/* 스프레드시트 위장에서만 도입부가 접히는 패널로 남는다. 그쪽은
              한 줄이 한 행인 표라 「이야기」라는 것이 성립하지 않고, 위장
              테마가 `.case-brief` 를 표 머리말 행으로 만드는 규칙을 이미
              갖고 있다(globals.css 의 「1. 인트로도 행으로」). */}
          {effectiveSpreadsheetTheme && (
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
          )}

          {/* Same master-format warnings the AI screen shows: these name
              things that actually change runtime behaviour (a location or
              character block that failed to parse, a missing entry time),
              and the offline GM builds its whole menu out of exactly those
              rules, so a broken master shows up here first.

              장면 로그에서는 도입부 패널이 사라지므로 여기로 올라왔다. 이건
              이야기가 아니라 작성자에게 하는 말이라 스크롤 안이 아니라 위에
              붙어 있어야 맞다. */}
          {data.case.format_warnings?.length ? (
            <ul className="format-warnings">
              {data.case.format_warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <div className="messages" ref={messagesRef}>
            {/* 사건의 시작 = 소설의 첫 장. 접히는 패널로 위에 따로 서 있으면
                글자 크기도 대사 처리도 본문과 달라서(13px 인라인 초록 vs 16px
                들여쓴 한 줄) 같은 산문이 두 가지로 보이고, 자기 스크롤막대까지
                따로 가진다 — 한 사건을 처음부터 끝까지 한 편으로 읽는다는
                것이 성립하지 않는다(2026-09-18 사용자 결정). 여기로 들이면
                도입부·수사·종결이 한 흐름, 한 활자가 된다.

                `recent_conversation` 은 창이라 도입부가 곧 그 밖으로 밀려나므로
                `public_intro` 를 직접 그린다. 창 안에 아직 남아 있는 동안은
                `displayedConversation` 이 그 첫 줄을 걸러내므로 겹치지 않는다. */}
            {!effectiveSpreadsheetTheme && (
              <>
                <div className="message scene-slug" key="intro-slug">
                  <div className="message-column">
                    <div className="message-content-row">
                      <p className="message-bubble">사건의 시작</p>
                    </div>
                  </div>
                </div>
                <div className="message assistant" key="intro-body">
                  <div className="message-column">
                    <div className="message-content-row">
                      <MessageContent
                        content={data.case.public_intro}
                        isMeta={false}
                        npcNames={data.case.npcs.map((npc) => npc.name)}
                        role={ASSISTANT_ROLE}
                        spreadsheet={false}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            {displayedConversation.map((item, index) => (
              <div
                className={`message ${item.role} ${item.mode === 'meta' ? 'meta' : ''}`}
                key={`${item.role}-${index}`}
                ref={index === endingIndex ? endingRef : undefined}
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
                      npcNames={data.case.npcs.map((npc) => npc.name)}
                      role={item.role}
                      spreadsheet={effectiveSpreadsheetTheme}
                    />
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
            {/* 방금 턴이 수첩에 넣어 준 진술. 가설을 들이대 반박당한 자리에서
                가장 자주 뜬다 — 그 반박이 사실을 하나 풀어 주기 때문이고,
                그게 이 게임에서 「틀린 가설이 전진이다」의 실체다. 서술에
                섞여 흘러가면 안 보이므로 한 줄로 따로 세운다. */}
            {!isPending && justHeard.length > 0 && (
              <div className="message assistant heard-note">
                <div className="message-column">
                  <span className="evidence-outcome-badge evidence-outcome-badge--acquired">
                    <FileCheck2 aria-hidden="true" size={13} />
                    진술 {justHeard.length}건이 수첩에 들어왔다
                  </span>
                </div>
              </div>
            )}
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

          {effectiveSpreadsheetTheme && actionMenu}
        </section>

        {!effectiveSpreadsheetTheme && actionMenu}

        {/* 가설 보드의 제 자리. 수첩 탭에 있으면 보드를 볼 때마다 증거나
            인물이 덮이는데, 보드는 그 둘을 보면서 채우는 것이다. 넓은
            화면에서는 「보기」 바로 아래에 세워 둘 다 한눈에 둔다. 좁은
            화면에서는 세울 자리가 없으므로 종전대로 수첩의 「가설」 탭으로
            돌아간다(`boardInColumn`). */}
        {boardInColumn && hypothesis && (
          <div className="hypothesis-column">
            <HypothesisBoard
              busy={isPending}
              cards={boardCardsFrom(data)}
              onRun={runComposedAction}
              view={hypothesis}
            />
          </div>
        )}

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
                {/* 「증거」는 수첩 바닥의 「확보한 단서」와 같은 쌍을 쓴다.
                    전에는 case_progress.evidence_done/total 이었는데 그건
                    카드 수가 아니라 종결에 필요한 사실 수라, 방에 들어가기만
                    해도 오르는 관찰 사실이 섞이고(CASE030 은 3개) 증언 카드
                    둘은 빠져서 수첩이 12를 셀 때 이 줄만 13을 셌다. 한 화면에
                    같은 이름으로 다른 총계가 둘 있으면 어느 쪽도 못 믿는다. */}
                {entry.id === 'cards'
                  ? `${data.acquired_cards.length}/${data.case.cards.length}`
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
            // 탭 수가 사건마다 넷 또는 다섯이라 칸 수를 CSS 에 박을 수 없다.
            // 스프레드시트 위장은 이 줄을 flex 로 눕히므로 이 변수를 안 읽는다.
            style={{ '--tab-count': visibleTabs.length } as React.CSSProperties}
          >
            {visibleTabs.map((tab) => (
              <button
                aria-selected={shownTab === tab.id}
                className={[
                  shownTab === tab.id ? 'active' : '',
                  effectiveSpreadsheetTheme ? 'ss-sheet-tab' : '',
                  effectiveSpreadsheetTheme && shownTab === tab.id
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
            onRunAction={runComposedAction}
            onPresent={presentSelected}
            onSelect={selectFromNotebook}
            onToggleEvidence={toggleEvidence}
            resolveAction={offlineActionFor}
            selectedEvidenceIds={selectedEvidenceIds}
            tab={shownTab}
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
          {hintText && (
            <output className="hint-text" style={{ display: 'block' }}>
              {hintText}
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
          <span aria-hidden="true">개수: {tabCount(shownTab)}</span>
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
              {herringStamps.length > 0 && (
                <span
                  aria-label={`벗긴 헛다리 ${data.case_progress.herring_done}/${data.case_progress.herring_total}`}
                  className="contradiction-cells contradiction-cells--herring"
                >
                  {herringStamps.map((stamp) => (
                    <span
                      aria-hidden="true"
                      className={[
                        'contradiction-cell',
                        'contradiction-cell--cleared',
                        stamp.done ? 'contradiction-cell--done' : '',
                        justAdvancedHerring && stamp.fresh
                          ? 'contradiction-cell--fresh'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={stamp.key}
                    />
                  ))}
                </span>
              )}
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
  // 면담 중에는 이동을 내리지 않는다. 대화를 하다 말고 나가는 것은 수첩
  // 「장소」 탭으로 여전히 되지만, 「대화를 마친다」 밑에 다른 방 다섯 개가
  // 같은 무게로 깔리면 지금 하던 대화가 보기 하나로 밀려난다. 면담 그룹이
  // 비어 있지 않다는 것이 곧 대화 중이라는 뜻이다 — 「대화를 마친다」가
  // 언제나 거기 있다.
  const inInterview = actions.some((action) => action.group === '면담');
  const grouped = actionGroupOrder
    .map((group) => ({
      group,
      items:
        group === '이동'
          ? // 이동 보기에서는 방 설명을 떼고 이름만 남긴다. 다섯 방에 두 줄씩
            // 붙으면 이 블록 하나가 화면을 넘긴다 — 여기는 빨리 옮기려고 있는
            // 자리고, 어떤 방인지는 수첩 「장소」 탭이 접근 등급·방문 횟수·
            // 있는 사람과 함께 말한다.
            inInterview
            ? []
            : actions
                .filter((action) => action.group === group)
                .map((action) => ({ ...action, detail: undefined }))
          : actions.filter((action) => action.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  return (
    <section
      className={`action-menu${spreadsheet ? '' : ' action-menu--scene'}`}
      aria-label="할 수 있는 행동"
    >
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

// ---------------------------------------------------------------------------
// 가설 보드 — 누가·언제·왜·어떻게 네 칸
//
// 여기서 하는 것은 **칸을 채우는 것**뿐이다. 채운 칸을 인물에게 들이대는
// `press` 는 면담 행동 목록에 엔진이 직접 올린다(`group: '면담'`) — 사람이
// 앞에 있어야 할 수 있는 일이라 수첩 안에 두면 눌러도 아무 일이 없다.
//
// **접힌 갈래를 목록에서 지우지 않는다.** 줄만 긋고 자리에 남긴다 — 사라지면
// 「내가 무엇을 접었는지」가 안 남고, 칸마다 남은 갈래가 줄어드는 것이 이
// 게임에서 전진의 본체다(docs/offline-deduction.md 1.1). 정답 후보에는
// `refutation` 이 없어서 새 사실을 주는 것은 오답뿐이고, 그래서 틀린 가설을
// 훑은 플레이어의 수첩이 더 찬다. 그 사실이 화면에 보여야 한다.
//
// 엔진은 접힌 후보를 **다시 걸어도 막지 않는다.** 같은 반박을 또 하고 턴만
// 쓰므로 회색으로 죽이는 것은 이쪽 몫이다.
// 보드의 근거 카드 목록. 보드가 「보기」 아래 칸에도, 수첩의 탭에도 설 수
// 있으므로(폭에 따라 하나만 그려진다) 목록을 만드는 규칙은 한 군데 둔다.
function boardCardsFrom(data: GameData) {
  return data.acquired_cards
    .filter((card): card is NonNullable<typeof card> => Boolean(card))
    .map((card) => ({
      id: card.id,
      title: displayCardTitle(card, data.case.npcs),
    }));
}

function HypothesisBoard({
  busy,
  cards,
  onRun,
  view,
}: {
  busy: boolean;
  cards: Array<{ id: string; title: string }>;
  onRun: (actionId: string) => void;
  view: NonNullable<GameData['hypothesis']>;
}) {
  // 칸마다 「고르는 중인 후보」와 「걸어 둔 근거 카드」. 서버에 보내기 전까지만
  // 사는 값이라 상태를 여기 둔다 — 한 칸을 쓰다 다른 탭에 다녀와도 남는다.
  const [draftId, setDraftId] = useState<
    Partial<Record<HypothesisSlot, string>>
  >({});
  const [draftCards, setDraftCards] = useState<
    Partial<Record<HypothesisSlot, string[]>>
  >({});

  const cardTitle = (id: string) =>
    cards.find((card) => card.id === id)?.title || id;

  const confirmedCount = HYPOTHESIS_SLOTS.filter(
    (slot) => view.confirmed[slot],
  ).length;

  return (
    <section className="panel hypothesis-board">
      <h2>가설 ({confirmedCount}/4 굳음)</h2>
      <p className="hypothesis-lead">
        {view.act === 2
          ? '네 칸이 모두 굳었다. 이제 상대의 말을 무너뜨릴 차례다.'
          : '칸을 채우고 사람에게 들이댄다. 틀리면 반박이 돌아오는데, 그 반박이 새 사실을 준다.'}
      </p>

      {HYPOTHESIS_SLOTS.map((slot) => {
        const filled = view.slots[slot];
        const locked = view.confirmed[slot];
        const refuted = new Set(view.refuted[slot]);
        const picked = draftId[slot] ?? null;
        const basis = draftCards[slot] ?? [];

        return (
          <article
            className={`hyp-slot${locked ? ' hyp-slot--locked' : ''}`}
            key={slot}
          >
            <header className="hyp-slot-head">
              <span className="hyp-slot-name">{SLOT_LABEL[slot]}</span>
              {locked ? (
                <span className="hyp-slot-state hyp-slot-state--locked">
                  <FileCheck2 aria-hidden="true" size={13} /> 굳음
                </span>
              ) : filled ? (
                <span className="hyp-slot-state">면담에서 들이대기</span>
              ) : (
                <span className="hyp-slot-state hyp-slot-state--empty">
                  {SLOT_HINT[slot]}
                </span>
              )}
            </header>

            {filled && (
              <div
                className={`hyp-filled${refuted.has(filled.id) ? ' hyp-filled--refuted' : ''}`}
              >
                <strong>{filled.text}</strong>
                {/* 반박당해도 엔진은 칸을 비우지 않는다. 걸린 채로 두면
                    접힌 갈래가 아직 답인 것처럼 보이므로 여기서 말해 준다. */}
                {refuted.has(filled.id) && (
                  <span className="hyp-basis">접혔다 — 지우고 다시 건다</span>
                )}
                {filled.basis.length > 0 && (
                  <span className="hyp-basis">
                    근거: {filled.basis.map(cardTitle).join(', ')}
                  </span>
                )}
                {!locked && (
                  <button
                    className="hyp-clear"
                    disabled={busy}
                    onClick={() => onRun(`hypothesis|clear|${slot}`)}
                    type="button"
                  >
                    지운다
                  </button>
                )}
              </div>
            )}

            {!locked && (
              <>
                <ul className="hyp-candidates">
                  {view.candidates[slot].map((candidate) => {
                    const isRefuted = refuted.has(candidate.id);
                    const isPicked = picked === candidate.id;
                    return (
                      <li key={candidate.id}>
                        <button
                          aria-pressed={isPicked}
                          className={[
                            'hyp-candidate',
                            isRefuted ? 'hyp-candidate--refuted' : '',
                            isPicked ? 'hyp-candidate--picked' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          // 접힌 갈래는 다시 못 고른다. 엔진이 안 막으므로
                          // 여기서 막지 않으면 같은 반박을 또 듣고 턴만 쓴다.
                          disabled={busy || isRefuted}
                          onClick={() =>
                            setDraftId((prev) => ({
                              ...prev,
                              [slot]: isPicked ? undefined : candidate.id,
                            }))
                          }
                          title={isRefuted ? '이미 접힌 갈래다' : undefined}
                          type="button"
                        >
                          {candidate.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {picked && (
                  <div className="hyp-basis-picker">
                    <span className="hyp-basis-label">
                      근거로 걸 카드를 고른다
                    </span>
                    {cards.length === 0 ? (
                      <p className="hyp-basis-empty">
                        아직 확보한 카드가 없다. 하나는 있어야 칸을 채울 수
                        있다.
                      </p>
                    ) : (
                      <ul className="hyp-basis-cards">
                        {cards.map((card) => {
                          const on = basis.includes(card.id);
                          return (
                            <li key={card.id}>
                              <button
                                aria-pressed={on}
                                className={`hyp-basis-card${on ? ' hyp-basis-card--on' : ''}`}
                                disabled={busy}
                                onClick={() =>
                                  setDraftCards((prev) => ({
                                    ...prev,
                                    [slot]: on
                                      ? basis.filter((id) => id !== card.id)
                                      : [...basis, card.id],
                                  }))
                                }
                                type="button"
                              >
                                {card.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <button
                      className="hyp-write"
                      disabled={busy || !basis.length}
                      onClick={() => {
                        onRun(
                          `hypothesis|set|${slot}|${picked}|${basis.join(',')}`,
                        );
                        setDraftId((prev) => ({ ...prev, [slot]: undefined }));
                        setDraftCards((prev) => ({ ...prev, [slot]: [] }));
                      }}
                      type="button"
                    >
                      가설을 적는다
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}

function NotebookPanel({
  busy,
  data,
  onPresent,
  onEndInterview,
  onRunAction,
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
  onEndInterview: () => void;
  onRunAction: (actionId: string) => void;
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

  if (tab === 'hypothesis') {
    // 보드가 꺼진 사건에서는 탭 자체가 없으므로 여기 오지 않는다.
    if (!data.hypothesis?.enabled) return null;
    return (
      <HypothesisBoard
        busy={busy}
        cards={boardCardsFrom(data)}
        onRun={onRunAction}
        view={data.hypothesis}
      />
    );
  }

  if (tab === 'cards') {
    return (
      <section className="panel">
        {/* AI 화면과 같은 제목. "최근 획득"이라고 적혀 있었는데 실제로는
            지금까지 확보한 것 전부를 보여 주므로 틀린 이름이었다. */}
        <h2>증거 ({data.acquired_cards.filter(Boolean).length}개)</h2>
        {/* The tray is what turns a pile of cards into a move. It only exists
            while someone is actually in front of the detective, because there
            is nobody to put anything to otherwise. */}
        {/* 담긴 것이 없을 때는 한 줄로 줄인다. 이 트레이는 목록 위에 고정
            (sticky)돼 있어서 높이가 그대로 가려지는 넓이가 되는데, 폰에서는
            시트 높이가 짧아 빈 슬롯 줄 + 못 누르는 제시 버튼이 카드 내용을
            통째로 덮었다. 담을 것이 없으면 제시할 것도 없으므로 버튼도
            그때까지는 자리를 차지할 이유가 없다. */}
        {currentInterview ? (
          <div
            aria-label="제시할 증거"
            className={`evidence-tray${selectedEvidenceIds.length ? '' : ' evidence-tray--idle'}`}
          >
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
                  카드를 눌러 담으면 {currentInterview.name}에게 제시합니다.
                </p>
              )}
            </div>
            {selectedEvidenceIds.length > 0 && (
              <button
                className="evidence-present"
                disabled={busy}
                onClick={onPresent}
                type="button"
              >
                {currentInterview.name}에게 제시
                {selectedEvidenceIds.length > 1
                  ? ` (${selectedEvidenceIds.length})`
                  : ''}
              </button>
            )}
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
                  <article
                    className={`item testimony-card${statement.retracted ? ' testimony-card-retracted' : ''}`}
                    key={statement.id}
                  >
                    <strong>
                      <span className="item-card-id">{statement.id}</span>
                      {statement.stage && (
                        <span className="testimony-stage">
                          {statement.stage}
                        </span>
                      )}
                      {statement.retracted && (
                        <span className="testimony-stage testimony-stage-retracted">
                          {statement.retracted}
                        </span>
                      )}
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

  // 탭은 넷뿐이고 위에서 전부 돌려준다. TypeScript 가 if 사슬로는 그것을
  // 증명하지 못하므로 남겨 두는 자리다.
  return null;
}
