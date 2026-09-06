'use client';

import { ArrowRight, CheckCircle2, FolderOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type CaseSummary } from './game';

export function CaseLibrary({ cases }: { cases: CaseSummary[] }) {
  const [query, setQuery] = useState('');
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
            <a className="case-row" href={item.path} key={item.id}>
              <span className="case-row-id">{item.id}</span>
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
