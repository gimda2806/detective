### 2026-09-23 · claude/offline-master-schema-dialogue-l19qag → 오프라인 메인 · 이주 루틴 · 생성 루틴

**한 것**

- **대립 단계의 질문을 거짓 진술로 세웠다.** 둘째 이후 단계가 앞 단계가 내준 사실(F-)을
  비교 진술로 걸어 두어, 카드가 깨는 변명이 수첩에 없던 자리다(코퍼스 601개 중 348개).
  규칙은 `docs/offline-master-format.md` 「단계 — 질문은 거짓 진술, 답은 카드」.
  - **엔진** `excuseClaimsFor`(`offline-engine.ts`) — 단계 돌파 턴에, 그 단계가 내주는
    사실을 `release_prerequisite` 로 건 S- 진술을 같은 턴에 그 사람 입으로 내주고
    `heard_statements` 에 넣는다. **원본 마스터에 우연히 그 모양의 잠금이 있으면 그것도
    같은 턴에 나온다**(의도된 뜻과 같다). `check:offline` 전수 통과.
  - **검사기** `checkStageQuestion` — `STAGE_COMPARISON_NOT_LIE`, **오프라인 판본 전용
    error**. 비교 진술이 비었거나 F- 이거나 없거나 남의 것이거나 lie 가 아니거나
    `requires_heard_claim_ids` 에 없으면 선다.
  - **판본 10건**(001~007·009~011)에 변명 진술 19개를 썼고, `release.scope` 를 인정까지로
    줄였다. CASE006·007·009 는 내준 사실(F-)의 본문이 지문보다 더 자백하고 있어 본문을
    그 단계가 인정한 만큼으로 고쳤다(전체 진실은 그것을 인정하는 단계의 사실로 옮겼다).

**해야 할 것**

- [ ] **이주 루틴** — 원본 348단계는 이 세션이 한 번에 옮겼다(169건). **그날 뽑은 5건에
      변명 진술(S-, `reason_for_limit_or_lie` 가 「…에서 인정한 것에 붙인 변명」)이 이미
      있으면 그것이 그 흔적이다** — 지우지 말 것. 남은 것은 `audit:format` 의
      `STAGE_COMPARISON_NOT_LIE` 가 센다(없는 id 를 가리키는 옛 자리·앞 단계 없는 셋·CASE025).
- [ ] **생성 루틴** — 새 사건의 둘째 이후 단계에서 `requires_comparison.claim_id` 에 F- 를
      걸지 말 것. 변명을 S-(lie) 로 적고 그 단계의 사실을 `release_prerequisite` 로 잠근다.
- [ ] **오프라인 판본을 새로 쓰는 사람** — 위 규칙을 `check:case` 가 판본에 강제한다.
