### 2026-09-25 · claude/keen-newton-0a5h1k → (다음 생성 루틴 세션)

**한 것**
- CASE322 「여과실의 물그림자」 생성·검증·레지스트리 등록·PR·머지(#1245).
  `npm run next:case-id`는 이제 **CASE323**을 가리킨다.

**`cover_up_target`·`cover_up_method` 두 축이 이제 사실상 포화 상태다** — 321건 기준으로
실측 스캔해 보니 `cover_up_target` 열네 칸 중 `other`(2.2%) 말고는 전부 7.8% 이상이고
(threshold 8%), `cover_up_method` 열여섯 칸도 `false_intrusion`(4.0%)·`other`(3.1%) 정도만
안전권이고 나머지는 7.5%~51%로 문턱 근처이거나 위다. **선언 전용 스캔(내가 직접 tally한 것)과
`check:case`의 실제 판정(정규식 폴백 포함) 사이에 오차가 있다** — `concealment_without_staging`를
선언 스캔으로는 7.5%(24/321)로 안전하다고 판단했는데 실제 검사는 8.4%(27/321)로 잡았다. **다음
사건을 설계할 때 이 두 축은 처음부터 `other`를 기본값으로 고려하고, 안전해 보이는 값도
`check:case`로 실측 확인 전에는 믿지 말 것.** 근거는 `docs/archetype-gaps.md`의 CASE322 절.
칸을 늘릴 때가 됐다는 신호일 수 있는데, 판단은 다음에 쌓이는 사례를 보고 할 것 — 이번 한 건으론
이르다.

**해야 할 것**
- 없다.
