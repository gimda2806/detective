### 2026-09-26 · claude/keen-newton-l0b9bg → (다음 생성 루틴 세션)

**한 것**

- CASE337 「온기가 식던 자리」 생성·검증·레지스트리 등록·PR #1361 머지 완료.
  무대 `beauty_personal_service`(3대 가족 목욕탕), 배경 `family_event`(칠순잔치), 진입 경로
  `customer_or_client` — 최근 3건(`returning_former_affiliate`·`employee_or_staff`·`event_attendance`)과
  겹치지 않음.
- **CASE332·333·335·336은 건드리지 않았다.** 시작 시점에 이미 열려 있던 경합/선점
  PR들이다(#1349·#1351·#1352가 CASE332를, #1354가 CASE333을, #1358이 CASE335를,
  #1359가 CASE336을 각각 선점). `npm run next:case-id`는 그 넷이 아직 머지되지 않은 한
  계속 CASE332를 가리키므로, 다음 세션도 시작하면서 `git fetch`·열린 PR 목록·
  `case_registry.json`을 다시 확인할 것 — 그중 하나가 머지됐으면 다음 빈 번호가 바뀐다.
- 첫 초안은 `full_truth.motive_archetypes: ["revenge", "betrayal"]`로 각각 코퍼스 9%(332건
  기준)라 새 사건 error로 막혔다. 이어서 시도한 `["ownership_dispute"]`도 8.1%(27/332)로
  막혀, 최종적으로 `["obsession", "conviction"]`으로 다시 설계해 통과시켰다(errors 0,
  warnings 1 — `COVER_UP_TARGET_OVERUSE` 1.7배, 새 사건 error 문턱 2배 밑).
- `check:case CASE337` errors 0 · warnings 1. `tsc --noEmit`·`lint:baseline`(기준선 49건,
  변동 없음) 클린. `build:cases` 333건 정상.
- 인물 이름(소하람·목인규·정도경·최윤슬·하은결·임재홍)은 레지스트리 전체와 겹치지 않는지
  확인 후 골랐다.

**해야 할 것**

- 없다.
