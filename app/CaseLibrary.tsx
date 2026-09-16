'use client';

import {
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Search,
  Sparkles,
  Unplug,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CaseFileThumb from './CaseFileThumb';
import { type CaseSummary } from './game';

const HIDE_COMPLETED_KEY = 'detective:library:hideCompleted';
const READY_ONLY_KEY = 'detective:library:readyOnly';

// API 없이 도는 판. 이 앱과 같은 사건을 쓰지만 GM 턴을 모델에 물어보지
// 않으므로, 키가 없거나 호출이 막혔을 때 여기로 건너간다. 별도 Worker라
// 같은 라우터 안의 경로가 아니라 절대 주소여야 한다.
// 목록 헤더의 한지우 쪽지.
//
// 해결한 사건 수로 단(段)을 고르고, 그 안에서는 플레이어가 눌러 넘긴다.
// 한 줄을 박아 두면 장식이 되고, 난수나 시각으로 고르면 서버 렌더와
// 클라이언트 첫 렌더가 갈려 하이드레이션이 어긋난다(이 파일에서 이미 한 번
// 겪었다). 그래서 첫 줄은 언제나 0번이고, 그다음은 플레이어의 클릭이 옮긴다.
//
// 말투는 탐정에게 반존대(-요)다. 이 비대칭은 유지 결정된 것이므로 반말로
// 바꾸지 말 것 — CLAUDE.md 우선순위 2.
const JIWOO_TIERS: Array<{ min: number; lines: string[] }> = [
  {
    min: 0,
    lines: [
      '첫 사건이에요. 봉인 붙은 것부터 하나 열어보죠.',
      '긴장되세요? ...저는 좀 되는데요.',
      '커피는 제가 내렸어요. 사건은 직접 고르세요.',
    ],
  },
  {
    min: 1,
    lines: [
      '한 건 끝났네요. 다음 건 조금 더 지저분해요.',
      '봉인이 붙은 건 아직 아무도 안 열어본 거예요. 그쪽부터 보실래요?',
      '밤새워 보실 거예요? ...뭐, 말려도 안 들으시겠지만.',
    ],
  },
  {
    min: 3,
    lines: [
      '세 건이요. 이제 감이 오신다는 얼굴이신데.',
      '해결한 건만 다시 읽으시는 거, 저 봤어요.',
      '미열람이 아직 남았는데 어떻게 그냥 주무세요.',
    ],
  },
  {
    min: 6,
    lines: [
      '여섯 건. 서장님이 당신 이름을 외우기 시작했어요.',
      '남은 건 다 어려운 것들만이에요. ...좋으시겠네요.',
      '이쯤이면 제가 배울 차례인 것 같은데요.',
    ],
  },
  {
    min: 10,
    lines: [
      '전부 종결. 이제 뭘 하실 건데요?',
      '서류함이 비었어요. 이런 날은 좀 쉬셔도 돼요.',
      '다음 사건이 들어오면, 제가 먼저 열어볼게요.',
    ],
  },
];

function jiwooLinesFor(solved: number): string[] {
  let tier = JIWOO_TIERS[0];
  for (const candidate of JIWOO_TIERS) {
    if (solved >= candidate.min) tier = candidate;
  }
  return tier.lines;
}

const OFFLINE_APP_URL =
  'https://claude-game-without-api-sdde5a-detective.hyukgu86.workers.dev/offline';

// 한 번에 그리는 사건 수. 코퍼스가 293건까지 늘면서 목록 한 장이 곧
// 293개 행 + 293개 SVG 썸네일이 됐고, 그게 전부 하이드레이션될 때까지
// 이 페이지의 버튼과 입력은 아무 반응이 없다. 실제로 재 보면 데스크톱에서
// 4.3초, CPU를 4배로 조인 상태(대략 폰)에서 6.8초가 걸렸다 — "완료 사건
// 숨김 버튼이 안 먹는다"는 보고의 정체가 이것이었다. 버튼은 멀쩡했고,
// 그때까지 아직 살아 있지 않았을 뿐이다.
const PAGE_SIZE = 40;

// "대강" 얼마나 지났는지만 보여주면 되는 자리라 초 단위는 다루지 않는다 —
// 분 미만은 전부 "방금 전"으로 뭉뚱그린다.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // 다음에 열었을 때 기억하지 못할 뿐, 이번 토글은 그대로 동작한다.
  }
}

export function CaseLibrary({
  cases,
  variant = 'ai',
}: {
  cases: CaseSummary[];
  // 어느 GM으로 사건을 여는 목록인가. 두 라우트가 이 한 벌을 같이 쓴다 —
  // 다른 것은 알약이 가리키는 방향뿐이고, 각 행이 열 경로와 그 GM 쪽
  // 진행도는 cases가 이미 맞게 들고 온다(listCases의 variant).
  variant?: 'ai' | 'offline';
}) {
  const [query, setQuery] = useState('');
  // 서버는 window가 없어 항상 false로 그리는데 초기화 함수가 클라이언트
  // 첫 렌더에서 localStorage를 읽으면 그 둘이 어긋난다(React #418). 값은
  // 마운트 뒤에 맞춘다 — DetectiveApp에서 같은 이유로 고친 것과 같은 건이다.
  const [hideCompleted, setHideCompleted] = useState(false);
  const [readyOnly, setReadyOnly] = useState(false);
  // 0에서 시작하므로 서버와 클라이언트 첫 렌더가 같다. 넘기는 것은 클릭뿐이다.
  const [jiwooIndex, setJiwooIndex] = useState(0);

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setHideCompleted(readFlag(HIDE_COMPLETED_KEY));
    // oxlint-disable-next-line react/react-compiler
    setReadyOnly(readFlag(READY_ONLY_KEY));
  }, []);
  const solvedCount = useMemo(
    () => cases.filter((item) => item.status_label === '종료').length,
    [cases],
  );
  const readyCount = useMemo(
    () => cases.filter((item) => item.format_ok).length,
    [cases],
  );
  const inProgressCount = useMemo(
    () => cases.filter((item) => item.case_progress).length,
    [cases],
  );
  // 아직 손대지 않은 것 — 라벨은 '수사 전'과 '수사 가능' 둘로 갈리지만
  // 플레이어에게는 "아직 안 연 사건" 하나다.
  const unopenedCount = cases.length - solvedCount - inProgressCount;
  const jiwooLines = jiwooLinesFor(solvedCount);
  const jiwooLine = jiwooLines[jiwooIndex % jiwooLines.length];
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCases = useMemo(() => {
    return cases
      .filter((item) => !hideCompleted || item.status_label !== '종료')
      .filter((item) => !readyOnly || item.format_ok)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [
          item.id,
          item.title,
          item.summary,
          item.status_label,
          ...item.tags,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [cases, hideCompleted, readyOnly, normalizedQuery]);
  const shownCases = filteredCases.slice(0, visibleCount);
  const remainingCount = filteredCases.length - shownCases.length;

  function toggleHideCompleted() {
    const next = !hideCompleted;
    setHideCompleted(next);
    setVisibleCount(PAGE_SIZE);
    // 상태 갱신 함수 안이 아니라 밖에서 쓴다. 갱신 함수는 순수해야 하고,
    // React가 그걸 두 번 부를 수 있다. 저장이 막힌 브라우저(사생활 보호
    // 모드 등)에서 setItem이 던지면 그 안에서는 상태 갱신까지 함께 날아간다.
    writeFlag(HIDE_COMPLETED_KEY, next);
  }

  function toggleReadyOnly() {
    const next = !readyOnly;
    setReadyOnly(next);
    setVisibleCount(PAGE_SIZE);
    writeFlag(READY_ONLY_KEY, next);
  }

  function updateQuery(next: string) {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <section className="library-header">
        <div className="library-header-main">
          {/* 서류철 색인의 머리글. 총계는 여기 한 줄로 올리고, 아래 통계
              스트립이 "지금 어디쯤"을 맡는다. */}
          <div className="library-header-rule">
            <span className="library-header-index">
              CASE INDEX / {cases.length} FILES
            </span>
            {/* 오프라인 배포 안에서는 두 목록이 같은 Worker에 있으므로
                돌아가는 길만 상대 경로다. 반대 방향은 별도 Worker라
                절대 주소여야 한다. */}
            {variant === 'offline' ? (
              <a className="offline-switch" href="/">
                <Sparkles aria-hidden="true" size={16} />
                AI GM으로 플레이
              </a>
            ) : (
              <a className="offline-switch" href={OFFLINE_APP_URL}>
                <Unplug aria-hidden="true" size={16} />
                API 없이 플레이
              </a>
            )}
          </div>

          <div className="library-header-title">
            <h1>사건 파일</h1>
            <span aria-hidden="true">CASE FILES</span>
          </div>

          {/* 예전에는 "311건"과 "사건해결 N건" 알약 둘이었다. 세 숫자를
              나란히 놓아야 해결 19건이 많은 건지 적은 건지가 읽힌다.
              미열람은 '수사 전'과 '수사 가능'을 합친 값이다 — 플레이어에게는
              아직 안 연 사건 하나고, 라벨이 둘로 갈리는 건 그다음 문제다. */}
          <div className="library-stats-strip">
            <div className="library-stat solved">
              <strong>{solvedCount}</strong>
              <span>SOLVED · 해결</span>
            </div>
            <div className="library-stat open">
              <strong>{inProgressCount}</strong>
              <span>OPEN · 수사 중</span>
            </div>
            <div className="library-stat sealed">
              <strong>{unopenedCount}</strong>
              <span>SEALED · 미열람</span>
            </div>
            <div className="library-stat-stamp">
              <span aria-hidden="true">{unopenedCount ? '미결' : '종결'}</span>
            </div>
          </div>
        </div>

        {/* 한지우가 목록에서도 한마디 한다. 이 게임의 절반은 둘의 티키타카인데
            사건을 고르는 화면에서만 그가 없을 이유가 없다. 누르면 다음 줄로
            넘어간다 — 읽고 나면 끝인 문구가 아니라 말을 거는 쪽이 낫다. */}
        <button
          // 접근성 이름. 안의 글자는 매번 바뀌는 대사라 이름 구실을 못 하고,
          // 규칙(control-has-associated-label)도 중첩 span만으로는 못 찾는다.
          aria-label="한지우의 다음 한마디 보기"
          className="jiwoo-note"
          onClick={() => setJiwooIndex((index) => index + 1)}
          type="button"
        >
          <span className="jiwoo-note-paper">
            <span aria-hidden="true" className="jiwoo-note-tape" />
            <span
              className="jiwoo-note-line"
              key={`${solvedCount}-${jiwooIndex}`}
            >
              {jiwooLine}
            </span>
            <span className="jiwoo-note-foot">
              <span aria-hidden="true" className="jiwoo-note-dot" />
              눌러서 한 마디 더<em>— 한지우</em>
            </span>
          </span>
        </button>
      </section>

      <section className="library-search" aria-label="사건 검색">
        <Search aria-hidden="true" size={18} />
        <input
          autoComplete="off"
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="CASE 번호, 제목, #태그 검색"
          value={query}
        />
        <button
          aria-label={`수사 가능한 사건 ${readyCount}건만 보기`}
          aria-pressed={readyOnly}
          className={`hide-completed-toggle ready-only-toggle ${readyOnly ? 'active' : ''}`}
          onClick={toggleReadyOnly}
          title={`지금의 마스터 스키마에 부합하는 사건 ${readyCount}건`}
          type="button"
        >
          <Sparkles aria-hidden="true" size={15} />
          <span className="hide-completed-toggle-label">
            수사 가능만 ({readyCount})
          </span>
        </button>
        <button
          aria-pressed={hideCompleted}
          className={`hide-completed-toggle ${hideCompleted ? 'active' : ''}`}
          onClick={toggleHideCompleted}
          type="button"
        >
          <EyeOff aria-hidden="true" size={15} />
          <span className="hide-completed-toggle-label">
            종료된 사건 숨기기
          </span>
        </button>
      </section>

      <section className="case-list" aria-label="사건 목록">
        {filteredCases.length ? (
          shownCases.map((item) => (
            <a className="case-row" href={item.path} key={item.id}>
              {/* The 86px slot already existed for the id alone. Putting the
                  file thumbnail above it costs no layout and gives the list
                  something to recognize a case by at a glance — and, through
                  the seal, whether it has been opened at all. case_progress is
                  null for a case with no save, which is exactly the sealed
                  state, so no extra flag is needed. */}
              <span className="case-row-file">
                <CaseFileThumb
                  caseId={item.id}
                  complete={item.status_label === '종료'}
                  height={52}
                  progress={item.case_progress?.overall_percent ?? null}
                  width={78}
                />
                <span className="case-row-id">{item.id}</span>
              </span>
              <div className="case-row-main">
                <div className="case-row-title">
                  <h2>{item.title}</h2>
                  {item.status_label === '종료' ? (
                    <strong className="case-status-badge complete">
                      <CheckCircle2 aria-hidden="true" size={13} />
                      완료
                    </strong>
                  ) : (
                    <strong
                      className={`case-status-badge ${
                        item.status_label === '수사 가능' ? 'ready' : ''
                      }`}
                    >
                      {item.status_label}
                    </strong>
                  )}
                </div>
                <p>{item.summary}</p>
                {item.status_label !== '종료' && item.case_progress && (
                  <div
                    aria-label={`수사 진행도 ${item.case_progress.overall_percent}%`}
                    className="case-progress-mini"
                  >
                    <progress
                      className="case-progress-mini-bar"
                      max={100}
                      value={item.case_progress.overall_percent}
                    />
                    <span aria-hidden="true">
                      {item.case_progress.overall_percent}%
                    </span>
                  </div>
                )}
                {item.last_played_at && (
                  <p className="case-last-played">
                    최근 플레이 {formatRelativeTime(item.last_played_at)}
                  </p>
                )}
                {item.tags.length > 0 && (
                  <div className="case-tags" aria-label="사건 태그">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          ))
        ) : (
          <p className="case-empty">검색 결과가 없습니다.</p>
        )}
      </section>

      {remainingCount > 0 && (
        <button
          className="case-list-more"
          onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          type="button"
        >
          {remainingCount}건 더 보기
        </button>
      )}
    </>
  );
}
