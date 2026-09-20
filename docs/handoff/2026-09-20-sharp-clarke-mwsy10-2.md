### 2026-09-20 · sharp-clarke-mwsy10 → 모두

**한 것 — 원격 브랜치 열하나를 지웠다**

원격에 열아홉 개가 쌓여 있었고 그중 열하나가 멈춘 잔재였다(9/7~9/20). **열린 PR이 달린
셋**(`peaceful-edison-gte54u`/#746 · `exciting-pasteur-46xecr`/#845 ·
`amazing-galileo-1itgnb`/#927)과 **오늘 움직인 것**(`game-without-api-sdde5a` ·
`master-format-migration-case250-254` · `laughing-newton-0h2he0`)은 **건드리지 않았다.**

되살릴 좌표를 여기 남긴다. **PR이 있었던 아홉은 브랜치가 없어도
`refs/pull/<번호>/head`로 복구된다** — GitHub이 그 ref를 영구 보관한다. 뒤의 둘은
PR이 한 번도 없어서 이 SHA가 유일한 좌표다.

| 브랜치 | SHA | 마지막 커밋 |
| --- | --- | --- |
| `claude/vigilant-newton-7sbzlg` | `bf6f351f1d5c` | 2026-09-07 |
| `claude/nifty-hamilton-yu2l4q` | `6d5fce0015f3` | 2026-09-13 |
| `claude/herring-evidence-ids` | `a742999b8371` | 2026-09-17 |
| `claude/opening-rewrite-033-039` | `1f1257141d13` | 2026-09-17 |
| `claude/offline-structure-check-10y6wg` | `9c69df5cd698` | 2026-09-19 |
| `claude/laughing-newton-rqyjyd` | `1e80e808cce7` | 2026-09-19 |
| `claude/wizardly-hamilton-4poq6n` | `62536a8cf822` | 2026-09-19 |
| `claude/wizardly-hamilton-y0af1q` | `f6952b3946b4` | 2026-09-20 |
| `claude/next-steps-0w9my4` | `16238fc74d89` | 2026-09-20 |
| **`claude/master-relationships-103-107`** | `be4a1ede4564` | 2026-09-17 (PR 없음) |
| **`claude/master-relationships-121-134`** | `75c512f79449` | 2026-09-17 (PR 없음) |

**PR 없는 둘을 지운 근거**: 앞쪽이 다루던 CASE103~107은 이번 삭제 사태로 마스터 자체가
없어졌고, 뒤쪽의 CASE132·133은 main 에 이미 `relationships` 가 다섯 개씩 들어가 있다.
둘 다 이미 무의미해진 작업이다.

**9/19 이전 브랜치는 main 과 공통 조상이 없다**(언젠가 main 히스토리가 재작성됐다).
그래서 「머지됐는가」를 git 으로는 판정할 수 없고, `git rev-list main..브랜치` 가 내놓는
「고유 커밋 276개·674개」 같은 숫자는 미머지 작업이 아니라 그 단절 때문에 생긴 착시다.
다음에 브랜치를 정리할 때 그 숫자를 근거로 삼지 말 것 — PR 상태로 판정해야 한다.
