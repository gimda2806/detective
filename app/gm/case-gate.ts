// 막(幕) — 사건은 다섯 편씩 열린다.
//
// 막간(app/interludes.ts)이 커튼이면 이건 그 커튼 뒤의 다음 다섯 편이다
// (2026-09 사용자 결정: "그 구간을 게이트로 보고 그 다음 5편 열림"). 처음엔
// 번호순 앞 다섯 편만 열려 있고, 다섯 건을 풀면 — 막간이 뜨는 그 자리에서 —
// 다음 다섯 편이 열린다. 번호가 곧 플레이 순서라는 이 코퍼스의 규칙
// (CLAUDE.md, next:case-id 가 가장 작은 빈 번호를 고르는 이유)이 여기서
// 비로소 플레이어에게 보인다.
//
// 세는 것은 종결 건수뿐이다. 어느 사건을 풀었든 한 건은 한 건이고, 열리는
// 것은 언제나 "번호순 앞 N편"이다 — 그래서 30번을 먼저 푼 사람도 다음에
// 열리는 것은 1~5번이다. 이미 손댄 사건(진행 중·종결)은 어디 있든 잠기지
// 않는다: 플레이 중에 잠기면 안 되고, 잠금이 생기기 전에 연 사건도 그대로다.
//
// 저장 상태가 없다. 목록이 어차피 모든 저장 행을 읽어 종결 건수를 알고
// 있으므로 거기서 파생한다. 이 파일은 app/game.ts 를 import 하지 않는다 —
// 그 파일은 최상위에서 cloudflare:workers 의 env 를 잡아서, 순수 계산을
// 여기 두어야 화면과 스크립트가 같은 규칙을 쓸 수 있다.

export const GATE_SIZE = 5;

// 종결 건수로 열린 편 수. 0건이면 5, 5건이면 10, 7건이면 10.
export function openCountFor(solved: number): number {
  return GATE_SIZE * (Math.floor(Math.max(0, solved) / GATE_SIZE) + 1);
}

// 다음 막이 열리기까지 몇 건.
export function gateRemaining(solved: number): number {
  return openCountFor(solved) - Math.max(0, solved);
}

type Gateable = {
  id: string;
  status_label: string;
  case_progress: unknown;
};

// game.ts 의 caseSortValue 와 같은 규칙. 그쪽을 import 할 수 없어 세 줄을
// 되풀이한다 — 번호를 읽는 방식이 갈리면 목록 정렬과 잠금이 다른 순서를
// 말하게 되므로, 한쪽을 고치면 다른 쪽도 같이 고칠 것.
function caseNumber(caseId: string): number {
  const match = caseId.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export type CaseGate = {
  locked: boolean;
  // 잠겼으면 몇 건을 풀어야 열리는지(종결 건수 기준). 열려 있으면 null.
  unlocks_at: number | null;
};

// 사건마다 잠금 여부를 매긴다. 결과는 id → 게이트.
export function gateCases<T extends Gateable>(
  items: T[],
  solved: number,
): Map<string, CaseGate> {
  const open = openCountFor(solved);
  const byNumber = [...items].sort(
    (a, b) => caseNumber(a.id) - caseNumber(b.id) || a.id.localeCompare(b.id),
  );
  const gates = new Map<string, CaseGate>();
  byNumber.forEach((item, rank) => {
    const touched = item.status_label === '종료' || Boolean(item.case_progress);
    if (touched || rank < open) {
      gates.set(item.id, { locked: false, unlocks_at: null });
      return;
    }
    // rank 가 10~14면 종결 10건에서 열린다.
    gates.set(item.id, {
      locked: true,
      unlocks_at: Math.floor(rank / GATE_SIZE) * GATE_SIZE,
    });
  });
  return gates;
}
