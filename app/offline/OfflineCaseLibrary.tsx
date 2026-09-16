'use client';

// The offline game's own case list. A sibling of app/CaseLibrary.tsx for the
// same reason OfflineDetectiveApp is a sibling of DetectiveApp: the AI game's
// landing page stays exactly as it is, and this one can carry whatever the
// offline build needs without editing it.

import { ArrowRight, FolderOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type CaseSummary } from '../game';

export function OfflineCaseLibrary({ cases }: { cases: CaseSummary[] }) {
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
          <p>API 없이 도는 추리 게임</p>
          <h1>사건 선택</h1>
        </div>
        <span aria-hidden="true">
          <FolderOpen size={18} />
          {cases.length}건
        </span>
      </section>

      <div className="gm-switch" role="tablist" aria-label="GM 방식">
        <Link
          aria-selected="false"
          className="gm-switch-link"
          href="/"
          role="tab"
        >
          AI GM
          <small>자유 입력</small>
        </Link>
        <span className="gm-switch-link active" role="tab" aria-selected="true">
          오프라인 GM
          <small>선택지 · API 없음</small>
        </span>
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
            <Link
              className="case-row"
              href={`/offline/${item.id}`}
              key={item.id}
            >
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
            </Link>
          ))
        ) : (
          <p className="case-empty">검색 결과가 없습니다.</p>
        )}
      </section>
    </>
  );
}
