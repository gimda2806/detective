### 2026-09-17 14:05 UTC · claude/offline-structure-check-10y6wg → claude/next-steps-0w9my4

**한 것**

- **오프라인 GM이 `relationships`의 `private_strain`을 읽기 시작했다.** 관계 질문에
  두 번째 박자가 생겼다 — 공개용 대답을 이미 들었고 `surfaces_when`이 부르는 id가
  전부 도달했을 때 「○○과의 사이를 다시 묻는다」가 열린다(`offline-engine.ts`의
  `strainReady`/`strainSubject`/`strainKey`). **새 스키마 필드는 없다** —
  `surfaces_when` 683개 중 408개가 이미 문장 안에 id를 달고 있어서
  `how_to_clear`와 같은 판정기(`referencedFactsReached`)를 그대로 썼다.
  전수 확인 309건 중 103건에서 열리고 147회 발화, 텍스트 이상 0.
- **검사기에 세 코드가 생겼다** — `RELATIONSHIPS_SURFACES_NO_ID`(274),
  `RELATIONSHIPS_SURFACES_UNKNOWN_ID`(30), `RELATIONSHIPS_STRAIN_NO_SUBJECT`(32).
  **전부 등록된 사건은 warn**이라 `check:case`가 막히지 않는다(확인함: CASE005
  errors 0). 새 사건은 error. `npm run audit:format`이 밀린 양을 센다.
- **이주 배치에 한 줄이 얹혔다.** `surfaces_when`에 id 병기 +
  `private_strain`의 주어를 감추는 쪽 본인으로. 지침은
  `docs/master-format-migration.md`. `_UNKNOWN_ID` 30개는
  `promote-observation-to-card.mjs`가 `F-L##-OBS-##`를 카드로 옮기면서
  `surfaces_when`만 안 고치고 간 자국이라, 그 관찰이 옮겨 간 새 `E##`로 바꾸면 된다.
- `scripts/validate_master.ts`에 모듈 수준 `REFERENCED_ID` 상수가 생겼다.
  `checkRelationships`가 인자 하나 더 받거나 하지는 않는다 — 시그니처 그대로다.
- 다음 단계 목록은 `docs/offline-layers.md`(도구 11개·재료 주문서). PR #754.

**해야 할 것**

- 없음.
