'use client';

import {
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Search,
  Sparkles,
  Unplug,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import CaseFileThumb from './CaseFileThumb';
import { type CaseSummary } from './game';

const HIDE_COMPLETED_KEY = 'detective:library:hideCompleted';
const READY_ONLY_KEY = 'detective:library:readyOnly';

// API 없이 도는 판. 이 앱과 같은 사건을 쓰지만 GM 턴을 모델에 물어보지
// 않으므로, 키가 없거나 호출이 막혔을 때 여기로 건너간다. 같은 Worker 안의
// 라우트(/offline)라 상대 경로다.
// 목록 헤더의 한지우 쪽지.
//
// 단은 **비율**로 고른다. 처음에는 해결 건수(10건이면 최상위)로 갈랐는데,
// 그 기준은 사건이 11건이던 디자인 시안에서 나온 것이라 311건짜리 실제
// 코퍼스에서는 19건을 푼 사람에게 "전부 종결. 서류함이 비었어요"를 말했다.
// 6%를 푼 사람에게 할 소리가 아니다.
//
// "전부"라고 말하는 단은 정말로 전부일 때만 쓴다. 숫자를 입에 올리는 줄은
// 실제 값을 넣는다 — 시안처럼 "세 건이요"로 박아 두면 그 단에 들어온 순간
// 말고는 전부 틀린 말이 된다.
//
// 한 단 안에서는 플레이어가 눌러 넘긴다. 첫 줄은 언제나 0번이라 서버 렌더와
// 클라이언트 첫 렌더가 같다 — 난수나 시각으로 고르면 하이드레이션이
// 어긋난다(이 파일에서 이미 한 번 겪었다).
//
// 말투는 탐정에게 반존대(-요)다. 이 비대칭은 유지 결정된 것이므로 반말로
// 바꾸지 말 것 — CLAUDE.md 우선순위 2.
// inProgress 는 "열어만 두고 안 끝낸 것"이다. 목록이 이미 세고 있는데
// 이 쪽지는 쓴 적이 없었다 — 한지우가 가장 자연스럽게 핀잔 줄 수 있는
// 숫자가 그것인데도.
function jiwooLinesFor(
  solved: number,
  total: number,
  unopened: number,
  inProgress: number,
): string[] {
  // 숫자가 0인데 그 숫자를 말하는 줄은 거짓말이 된다. 조건이 맞을 때만
  // 단 뒤에 붙인다 — 단마다 따로 쓰지 않아도 되는 종류의 말이다.
  // 전부 종결 단에는 안 붙는다(그 단은 정의상 inProgress 가 0이다).
  const pending =
    inProgress > 0
      ? [
          `열어만 두고 안 닫은 게 ${inProgress}건 있는데요. 시작은 참 빠르십니다.`,
          `${inProgress}건이 아직 열려 있습니다. 탐정님다운 방식이긴 하네요.`,
          '시작한 건 많은데 마무리가 조금 늦습니다. 평소처럼요.',
          `${inProgress}건은 아직 그대로입니다. 제가 기억해 두겠습니다.`,
          '이것저것 열어 두셨네요. 한 번에 하나만 하시면 심심하십니까?',
          '열어 놓은 건 잊지 마세요. 제가 다 기억하고 있긴 하지만요.',
          `${inProgress}건 남았습니다. 나중에 왜 이걸 열었는지 또 물어보시진 마세요.`,
        ]
      : [];

  if (total > 0 && solved >= total) {
    return [
      '다 끝났네요. 이제 서류함도 비었습니다.',
      '전부 정리됐습니다. 오늘은 좀 쉬셔도 됩니다.',
      '끝까지 하셨네요. 수첩은 제가 정리해 둘게요.',
      '이제 정말 고를 것도 없습니다. 탐정님이 제일 싫어하실 화면이네요.',
      '전부 끝났습니다. 이 화면을 다시 볼 일은 없겠네요.',
      '다 했습니다. 이제 일 말고 다른 것도 좀 하시죠.',
    ];
  }
  // 첫 사건은 한 줄이다(2026-09 사용자 결정). solved 가 0인 상태는 잠깐
  // 지나가는 자리라, 눌러 넘길 것을 쌓아 둘 이유가 없다 — 인사 한 줄이면
  // 된다. 열어만 두고 안 닫은 것이 있으면 그 줄은 여기에도 붙는다.
  if (!solved) {
    return ['커피는 제가 내렸어요. 사건은 직접 고르세요.', ...pending];
  }

  const ratio = total > 0 ? solved / total : 0;
  if (ratio < 0.1) {
    return [
      `${solved}건 끝났네요. 그런데 아직 서류함은 그대로입니다.`,
      `아직 ${unopened}건 남았습니다. 너무 오래 고민하진 마세요.`,
      '탐정님은 고르는 데 시간이 좀 걸리시네요. 시작하면 빠르면서요.',
      '이제 조금 익숙해지셨을 텐데 탐정님 표정은 아직 아닌 거 같네요.',
      '몇 건 안 남은 게 아니라 몇 건 끝난 겁니다. 아직 많아요.',
      '하나씩 줄고 있습니다. 수첩은 하나씩 늘고 있고요.',
      '오늘 다 끝내실 생각은 아니죠? 제가 보기엔 아니실 것 같은데요.',
      '처음보다 찾는 속도는 빨라졌습니다. 제가 괜히 옆에서 보는 건 아니네요.',
      '아직 갈 길이 멉니다. 그러니까 오늘 너무 무리하지 마세요.',
      '탐정님은 일단 시작해 놓고 나중에 정리하는 편이시잖아요. 이번에도 그렇고요.',
      ...pending,
    ];
  }
  if (ratio < 0.35) {
    return [
      `${solved}건이면 이제 꽤 했네요. 그래도 아직 ${unopened}건 남았습니다.`,
      '이제는 제목만 보고 고르시는 경우도 있네요. 전보다 빨라졌습니다.',
      '해결한 것만 다시 읽으시는 거, 제가 모를 줄 아셨습니까?',
      '서류함이 조금 비었네요. 대신 탐정님 수첩은 더 복잡해졌고요.',
      '중간쯤 오면 원래 더 꼼꼼해지십니다. 지금도 그러시고요.',
      `${solved}건입니다. 숫자만 보면 잘하고 계시네요.`,
      '열어 둔 건 많고 끝낸 것도 많고요. 일 벌이는 건 여전하십니다.',
      '예전보다 망설이는 시간이 줄었습니다. 제가 시간을 재 본 건 아니고요.',
      '이제 제가 설명 안 해도 어떤 순서로 보실지 알 것 같습니다.',
      '아직 많습니다. 오늘 다 하시겠다는 표정은 아니길 바랍니다.',
      ...pending,
    ];
  }
  if (ratio < 0.75) {
    return [
      `${solved}건이면 꽤 멀리 왔습니다. 처음 화면이랑 비교해 보셔야겠는데요.`,
      '이제 빈자리가 더 잘 보이네요. 탐정님 눈에도 그렇죠?',
      `${unopened}건 남았습니다. 숫자가 확실히 줄었습니다.`,
      '예전 같으면 여기서 한참 고민하셨을 텐데요. 요즘은 바로 고르시네요.',
      '이 정도면 저도 탐정님 선택을 어느 정도 예상할 수 있습니다.',
      '남은 것보다 끝낸 게 먼저 보이기 시작했네요.',
      '이제 조금 천천히 하셔도 됩니다. 충분히 많이 하셨으니까요.',
      '끝이 보이기 시작하면 또 속도를 올리실 텐데, 그러지 마세요.',
      ...pending,
    ];
  }
  return [
    '이제 얼마 안 남았습니다. 그래서 더 급하게 하실 것 같네요.',
    `${solved}건까지 왔습니다. 여기까지는 꽤 잘 오셨습니다.`,
    '남은 건 적고, 탐정님은 갑자기 더 꼼꼼해지셨고요.',
    '마지막 몇 건은 천천히 하세요. 급하게 끝낼 일은 아니니까요.',
    '처음에 이 화면 보셨을 때보다 훨씬 익숙해 보입니다.',
    '조금 남았습니다. 오늘 다 끝내겠다는 말씀만 안 하시면 됩니다.',
    ...pending,
  ];
}

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
  // 헤더의 숫자는 전부 "지금 제대로 돌아가는 사건"만 센다.
  //
  // 코퍼스 311건 중 지금의 마스터 스키마에 부합하는 것은 39건이다. 나머지는
  // 열리기는 하지만 관계 데이터가 없거나 대립 단계 키가 서술문이라 GM이
  // 즉흥으로 메우는 자리가 남아 있다. 그 272건까지 분모에 넣으면 19건을 푼
  // 사람이 6%가 되는데, 실제로 그가 고를 수 있었던 것 중에서는 절반이다.
  // 세어서 틀린 말을 하느니 셀 수 있는 것만 센다.
  //
  // 목록 자체는 여전히 311건을 다 보여 준다 — 이건 진행도를 재는 자의
  // 눈금이지 서류함의 크기가 아니다. 눈금이 39라는 것은 눈썹줄이 밝힌다.
  const playableCases = useMemo(
    () => cases.filter((item) => item.format_ok),
    [cases],
  );
  const readyCount = playableCases.length;
  const solvedCount = useMemo(
    () => playableCases.filter((item) => item.status_label === '종료').length,
    [playableCases],
  );
  // 종결된 사건도 case_progress를 그대로 들고 있다(저장에서 계산한 값이라
  // 끝냈다고 사라지지 않는다). 그것만 보면 19건을 푼 사람이 "해결 19 ·
  // 수사 중 19"가 되고 미열람이 그만큼 깎인다. 세 숫자는 서로 겹치지 않아야
  // 합이 전체가 된다.
  const inProgressCount = useMemo(
    () =>
      playableCases.filter(
        (item) => item.status_label !== '종료' && item.case_progress,
      ).length,
    [playableCases],
  );
  // 아직 손대지 않은 것 — 라벨은 '수사 전'과 '수사 가능' 둘로 갈리지만
  // 플레이어에게는 "아직 안 연 사건" 하나다.
  const unopenedCount = readyCount - solvedCount - inProgressCount;
  const jiwooLines = jiwooLinesFor(
    solvedCount,
    readyCount,
    unopenedCount,
    inProgressCount,
  );
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
              CASE INDEX / {readyCount} PLAYABLE
            </span>
            {/* 두 방향 다 상대 경로다. 한때 이 알약이 오프라인 배포의
                절대 주소를 물고 있었는데(그리고 반대쪽은 갈 곳이 없다며
                비활성이었는데), 그건 오프라인이 별도 Worker 로 따로 배포되던
                때의 이야기다. 지금은 /, /case/:id, /offline, /offline/:id 가
                **한 Worker 안에** 같이 빌드된다 — 절대 주소는 그래서 어느
                프리뷰에서 눌러도 그 브랜치를 떠나 옛 배포로 가 버렸고,
                오프라인 쪽 변경이 프리뷰에 안 보이는 것처럼 읽혔다. */}
            {variant === 'offline' ? (
              <Link className="offline-switch" href="/">
                <Sparkles aria-hidden="true" size={16} />
                AI GM으로 플레이
              </Link>
            ) : (
              <Link className="offline-switch" href="/offline">
                <Unplug aria-hidden="true" size={16} />
                API 없이 플레이
              </Link>
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
          // 좁은 화면에서는 글자를 감추고 눈 아이콘만 남기므로(globals.css),
          // 이름을 여기 적어 두지 않으면 버튼에 읽을 것이 없어진다.
          aria-label="종료된 사건 숨기기"
          aria-pressed={hideCompleted}
          className={`hide-completed-toggle completed-only-toggle ${
            hideCompleted ? 'active' : ''
          }`}
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
