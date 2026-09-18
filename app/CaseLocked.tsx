import { Lock } from 'lucide-react';
import Link from 'next/link';

// 아직 열리지 않은 막의 사건을 주소로 바로 열었을 때. 목록은 잠긴 행을
// 링크로 만들지 않지만 주소는 누구나 칠 수 있으므로, 사건 페이지 쪽에서
// 한 번 더 막는다(app/gm/case-gate.ts). 사건 내용은 한 줄도 내보내지
// 않는다 — 제목도 여기서는 모른다.
export function CaseLocked({
  caseId,
  unlocksAt,
  solved,
  variant,
}: {
  caseId: string;
  unlocksAt: number;
  solved: number;
  variant: 'ai' | 'offline';
}) {
  const remaining = Math.max(1, unlocksAt - solved);
  return (
    <main className="case-library">
      <section className="case-locked" aria-label="잠긴 사건">
        <Lock aria-hidden="true" size={22} />
        <h1>{caseId}은 아직 열리지 않았다.</h1>
        <p>
          앞의 사건을 {remaining}건 더 풀면 다음 막이 열린다. 지금까지 {solved}
          건.
        </p>
        <Link
          className="case-locked-back"
          href={variant === 'offline' ? '/offline' : '/'}
        >
          사건 파일로 돌아간다
        </Link>
      </section>
    </main>
  );
}
