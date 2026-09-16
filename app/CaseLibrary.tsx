'use client';

import {
  ArrowRight,
  CheckCircle2,
  EyeOff,
  FolderOpen,
  Search,
  Unplug,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CaseFileThumb from './CaseFileThumb';
import { type CaseSummary } from './game';

const HIDE_COMPLETED_KEY = 'detective:library:hideCompleted';

// API 없이 도는 판. 이 앱과 같은 사건을 쓰지만 GM 턴을 모델에 물어보지
// 않으므로, 키가 없거나 호출이 막혔을 때 여기로 건너간다. 별도 Worker라
// 같은 라우터 안의 경로가 아니라 절대 주소여야 한다.
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

function readHideCompleted(): boolean {
  try {
    return window.localStorage.getItem(HIDE_COMPLETED_KEY) === '1';
  } catch {
    return false;
  }
}

export function CaseLibrary({ cases }: { cases: CaseSummary[] }) {
  const [query, setQuery] = useState('');
  // 서버는 window가 없어 항상 false로 그리는데 초기화 함수가 클라이언트
  // 첫 렌더에서 localStorage를 읽으면 그 둘이 어긋난다(React #418). 값은
  // 마운트 뒤에 맞춘다 — DetectiveApp에서 같은 이유로 고친 것과 같은 건이다.
  const [hideCompleted, setHideCompleted] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    setHideCompleted(readHideCompleted());
  }, []);
  const solvedCount = useMemo(
    () => cases.filter((item) => item.status_label === '종료').length,
    [cases],
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCases = useMemo(() => {
    return cases
      .filter((item) => !hideCompleted || item.status_label !== '종료')
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
  }, [cases, hideCompleted, normalizedQuery]);
  const shownCases = filteredCases.slice(0, visibleCount);
  const remainingCount = filteredCases.length - shownCases.length;

  function toggleHideCompleted() {
    const next = !hideCompleted;
    setHideCompleted(next);
    setVisibleCount(PAGE_SIZE);
    // 상태 갱신 함수 안이 아니라 밖에서 쓴다. 갱신 함수는 순수해야 하고,
    // React가 그걸 두 번 부를 수 있다. 저장이 막힌 브라우저(사생활 보호
    // 모드 등)에서 setItem이 던지면 그 안에서는 상태 갱신까지 함께 날아간다.
    try {
      window.localStorage.setItem(HIDE_COMPLETED_KEY, next ? '1' : '0');
    } catch {
      // 다음에 열었을 때 기억하지 못할 뿐, 이번 토글은 그대로 동작한다.
    }
  }

  function updateQuery(next: string) {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <section className="library-header">
        <div>
          <p>AI GM Mystery</p>
          <h1>사건 선택</h1>
        </div>
        <div className="library-stats">
          <span aria-hidden="true">
            <FolderOpen size={18} />
            {cases.length}건
          </span>
          {/* Progress across the whole library, not one case. The per-case
              badge already says whether that one is done; nothing anywhere
              told the player how far they had got overall. */}
          <span
            aria-label={`지금까지 해결한 사건 ${solvedCount}건`}
            className="library-stats-solved"
          >
            <CheckCircle2 aria-hidden="true" size={17} />
            사건해결 {solvedCount}건
          </span>
          <a className="offline-switch" href={OFFLINE_APP_URL}>
            <Unplug aria-hidden="true" size={16} />
            API 없이 플레이
          </a>
        </div>
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
                    <strong className="case-status-badge">
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
