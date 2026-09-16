'use client';

import { ArrowRight, FolderOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type CaseSummary } from './game';

export function CaseLibrary({ cases }: { cases: CaseSummary[] }) {
  const [query, setQuery] = useState('');
  // Which GM a case opens with. CaseSummary.path always points at the AI
  // route; 'offline' rewrites it to the no-API one. Remembered per browser
  // so a play session does not mean re-picking on every visit.
  const [gm, setGm] = useState<'ai' | 'offline'>(() =>
    typeof window !== 'undefined' &&
    window.localStorage.getItem('detective:gm') === 'offline'
      ? 'offline'
      : 'ai',
  );

  function chooseGm(next: 'ai' | 'offline') {
    setGm(next);
    window.localStorage.setItem('detective:gm', next);
  }

  const pathFor = (item: CaseSummary) =>
    gm === 'offline' ? `/offline/${item.id}` : item.path;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCases = useMemo(() => {
    if (!normalizedQuery) return cases;

    return cases.filter((item) =>
      [item.id, item.title, item.summary, item.status_label, ...item.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [cases, normalizedQuery]);

  return (
    <>
      <section className="library-header">
        <div>
          <p>AI GM Mystery</p>
          <h1>사건 선택</h1>
        </div>
        <span aria-hidden="true">
          <FolderOpen size={18} />
          {cases.length}건
        </span>
      </section>

      <div className="gm-switch" role="tablist" aria-label="GM 방식">
        <button
          aria-selected={gm === 'ai'}
          className={gm === 'ai' ? 'active' : ''}
          onClick={() => chooseGm('ai')}
          role="tab"
          type="button"
        >
          AI GM
          <small>자유 입력</small>
        </button>
        <button
          aria-selected={gm === 'offline'}
          className={gm === 'offline' ? 'active' : ''}
          onClick={() => chooseGm('offline')}
          role="tab"
          type="button"
        >
          오프라인 GM
          <small>선택지 · API 없음</small>
        </button>
      </div>

      <section className="library-search" aria-label="사건 검색">
        <Search aria-hidden="true" size={18} />
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="CASE 번호, 제목, #태그 검색"
          value={query}
        />
      </section>

      <section className="case-list" aria-label="사건 목록">
        {filteredCases.length ? (
          filteredCases.map((item) => (
            <a className="case-row" href={pathFor(item)} key={item.id}>
              <span className="case-row-id">{item.id}</span>
              <div className="case-row-main">
                <div className="case-row-title">
                  <h2>{item.title}</h2>
                  <strong>{item.status_label}</strong>
                </div>
                <p>{item.summary}</p>
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
    </>
  );
}
