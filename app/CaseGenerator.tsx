'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { generateCaseFromSeed, getCaseGenerationProgress } from './actions';
import { useAdminToken } from './useAdminToken';

const POLL_INTERVAL_MS = 3000;

export function CaseGenerator() {
  const [seed, setSeed] = useState('');
  const [status, setStatus] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const [caseHref, setCaseHref] = useState('');
  const [progressStage, setProgressStage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useAdminToken();
  const jobIdRef = useRef('');

  // Polls a second, lightweight request for the job's current stage while
  // the main generateCaseFromSeed call is still in flight — the D1 row it
  // reads is updated by that same in-progress request as it goes, so this
  // works without any background/waitUntil execution.
  useEffect(() => {
    if (!isPending) return;
    const jobId = jobIdRef.current;
    let cancelled = false;

    const poll = async () => {
      const progress = await getCaseGenerationProgress(jobId).catch(() => null);
      if (!cancelled && progress) setProgressStage(progress.stage);
    };
    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isPending]);

  function handleGenerate() {
    if (!seed.trim() || isPending) return;

    setStatus('');
    setIssues([]);
    setCaseHref('');
    setProgressStage('시작 준비 중');
    jobIdRef.current = crypto.randomUUID();

    startTransition(async () => {
      try {
        const result = await generateCaseFromSeed(
          seed,
          token,
          jobIdRef.current,
        );
        setStatus(result.message);
        setIssues(result.issues || []);
        setCaseHref(result.ok && result.path ? result.path : '');
        if (result.ok) setSeed('');
      } catch {
        setStatus('사건을 생성하지 못했습니다. 다시 시도해 주세요.');
      }
    });
  }

  return (
    <section className="upload-panel" aria-label="사건 생성">
      <label className="admin-token-row" aria-label="관리자 토큰">
        <input
          autoComplete="off"
          name="admin-token"
          onChange={(event) => setToken(event.target.value)}
          placeholder="관리자 토큰"
          type="password"
          value={token}
        />
      </label>

      <div>
        <p>Case Generator</p>
        <h2>시드로 새 사건 만들기</h2>
      </div>

      <label className="seed-input-wrap" aria-label="사건 시드">
        <input
          className="seed-input"
          disabled={isPending}
          onChange={(event) => setSeed(event.target.value)}
          placeholder="예: 폐쇄된 스키 리조트, 사망 원인 (트릭은 AI가 알아서 설계)"
          type="text"
          value={seed}
        />
      </label>

      <button
        className="upload-button"
        disabled={isPending || !seed.trim()}
        onClick={handleGenerate}
        type="button"
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="spin" size={17} />
        ) : (
          <Sparkles aria-hidden="true" size={17} />
        )}
        {isPending ? progressStage || '생성 중' : '생성'}
      </button>

      {status && (
        <div className={`upload-status ${caseHref ? 'success' : 'error'}`}>
          <p>
            {status}
            {caseHref && <a href={caseHref}>바로 시작</a>}
          </p>
          {issues.length > 0 && (
            <ul aria-label="생성 실패 사유">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
