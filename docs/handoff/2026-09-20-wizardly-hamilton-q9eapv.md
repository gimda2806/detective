### 2026-09-20 20:40 UTC · wizardly-hamilton-q9eapv → 모두

**한 것** (PR #972, 소설화 182~186 회차)

- **사건 제목 셋을 바꿨다.** `TITLE_TEMPLATE_OVERUSE`가 셋 다 잡았고,
  마스터·`data/case_registry.json`·`english_title`을 같이 고친 뒤
  `npm run build:source`를 다시 돌렸다.
  - CASE183 「다듬질실이 삼킨 약속」 → **「한때의 다짐」**
  - CASE184 「조합대에 남은 침묵」 → **「12년 전의 필체」**
    (CASE018 「이륙대에 남은 침묵」과 **낱말 하나만 달랐다**)
  - CASE185 「핀이 멈춘 밤」 → **「버튼 위의 먼지」**
- **CASE186의 `full_truth.method_archetypes`를 `temperature_exposure`에서
  `["induced_fall", "hyperthermia"]`로 좁혔다.** 옛 키라
  `validate_master.ts`의 `LEGACY_METHOD_SPLIT`이 `hypothermia`·`hyperthermia`
  **양쪽으로** 세고 있었고, 그래서 **저온 칸의 비율을 이 고온 사건이 올리고
  있었다.** 그 코드 주석이 이 사건을 이름으로 부르며 좁히라고 적어 둔 자리다.
- CASE182~186 다섯 편에 분류 코드 여덟 칸을 적었고, `key_time_location`의
  24/12시간제 혼용(184·185·186), `REL01.private_strain` 주어(182·183·185·186),
  `REL01.nature`의 성별 어긋남(184), `T12.world_fact`의 인물 어긋남(186)을 고쳤다.
  **진상은 한 글자도 안 바뀌었다.**

**해야 할 것**

- [ ] **`case_registry.json`이나 사건 제목을 문자열로 물고 있는 코드가 있으면
      CASE183·184·185 셋을 확인할 것.** `app/game.ts`의
      `isStateForDifferentCase`가 제목으로 사건을 가르므로, **이 셋의 진행 중
      저장 행은 새 사건으로 읽혀 초기화된다** — 실플레이 중이던 저장이 있으면
      그쪽이다. 코드 쪽 하드코딩은 `grep`으로 찾아본 범위에서는 없었다.
- [ ] **`validate_master.ts`에 「한 문자열 안에 13 이상의 시와 12 이하의 시가
      같이 나오면」 검사 한 줄이 있으면 좋겠다.** `key_time_location`이 한 문장에서
      24시간제와 12시간제를 섞는 것이 **184·185·186 세 편 연속**이고 세 번 다
      뒤쪽 끝이다. `check:novel`은 소설에 대고 이것을 `TIME_12H_MISMATCH`로 잡는데
      마스터에는 같은 검사가 없다. (이 회차가 셋을 손으로 고쳤다 — 다음 생성
      회차가 또 만들 자리다.)
