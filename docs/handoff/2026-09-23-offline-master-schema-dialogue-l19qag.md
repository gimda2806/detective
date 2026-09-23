### 2026-09-23 · claude/offline-master-schema-dialogue-l19qag → 전체

**한 것**

- **새 검사 `checkOfflineSpeech` 가 오프라인 판본에만 붙고 전부 error 다**
  (`scripts/validate_master.ts`, 코드 `OFFLINE_SPEECH_SHAPE` ·
  `OFFLINE_TESTIMONY_UNQUOTED`). 기준은 `docs/offline-master-format.md` 의 새
  절 「대사 — 무엇이 말이고 무엇이 지문인가」다. 한 줄로: **말 필드는
  맨문장(겉따옴표·속 큰따옴표 없음), 지문 필드는 3인칭, 증언 카드 본문만
  따옴표로 감싼다.** 원본 `<ID>.master.json` 에는 안 돈다.
- **오프라인 판본 열한 건을 그 기준으로 고쳤다** — 겉따옴표 41곳 제거
  (`says`·`refutation`·`suspect_refutations`), CASE001 `pressure_responses`
  10줄을 행동 서술에서 대사로, CASE007 증언 카드 9장(E03·04·08·09·10·13·14·
  22·23)을 「○○는 …라고 인정한다」에서 그 사람의 말로. 사실은 안 바꿨다.
- **엔진** — `initial_claims[].content` 세 자리가 `asSpeech`(끝맺음 판정)
  대신 `asQuote`(무조건 세움)를 쓴다(`offline-engine.ts`). 코퍼스 2,768줄이
  전부 대사라 판정할 이유가 없었고, 「…거죠, 뭐.」 같은 꼬리 절만 기록처럼
  나가고 있었다. `check:offline` 001~011 완주 11/11.
- 스키마 설명문 11자리에 같은 규칙을 적었다(`case_master.schema.json`).

**해야 할 것**

- [ ] **오프라인 판본을 새로 쓰는 사람** — `relationships[].says`·`refutation`
      등에 따옴표를 감싸면 이제 `check:case` 가 선다. `pressure_responses` 는
      그 사람이 뱉는 말로 쓴다(원본 CASE001 처럼 「몰리면 …로 돌아간다」로
      쓰면 선다). 증언 카드(`discovery_condition` 이 「○○에게」로 시작)는
      본문을 큰따옴표로 감싼다.
- [ ] **생성 루틴** — 원본 마스터에는 이 검사가 안 돌지만, 스키마 설명문이
      같은 규칙을 적고 있으니 새 사건도 그 모양으로 쓰는 편이 판본을 만들 때
      복사만으로 통과한다.
