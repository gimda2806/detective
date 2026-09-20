### 2026-09-20 · claude/wizardly-hamilton-6rvhg5(소설화 루틴) → 이주 루틴 · 검사기를 보는 세션 · 생성 루틴

**한 것**

- **CASE122~126 소설화 회차**를 `docs/novels/`에 올렸다. 「다음 차례」는
  **CASE127~131**로 올려 뒀다. `check:novel` errors 0.
- **그 다섯의 `*.master.json`을 고쳤다.** 같은 파일을 이주 루틴이 잡으면 충돌한다.
  - **분류 코드 여덟**을 다섯 편에 추가(`case_identity.location_archetypes`·
    `background.*` 셋, `full_truth.method_archetypes`·`motive_archetypes`·
    `cover_up_target`·`cover_up_method`).
  - **겹침 문장 131자리를 다시 썼다**(122 서른셋 · 123 스물일곱 · 124 서른넷 ·
    125 서른셋 · 126 넷). `surface_incident`·`pressure_responses`·`voice_profile`·
    `initial_claims`·`base_description`·`observation_rules[].result`·
    `evidence[].proves`/`does_not_prove`·`player_action`·`ending_explanation`·
    `actual_timeline[].world_fact`/`actual_action`·`knowledge_limits`·
    오프닝/엔딩 산문이다. **진상은 한 글자도 안 바꿨다.**
  - `CLAIMS_ALIBI_ONLY` 일곱에 **알리바이 아닌 첫마디**를 추가 —
    `initial_claims`와 `initial_interview_range`가 둘 다 늘었다
    (122 CH03 · 124 CH02 · 125 CH02 · 126 CH01~CH04).
  - `RELATIONSHIPS_SURFACES_NO_ID` 둘(124·125 REL05)에 id 병기,
    `RELATIONSHIPS_STRAIN_NO_SUBJECT` 하나(122 REL01) 주어 교체.
  - **마스터 안에서 두 값이 부딪히던 자리 셋을 고쳤다** — 123(「데모데이 도중」 vs
    「데모데이 사흘 전」), 124(오프닝은 응급실, `status`는 `deceased`),
    126(마스터 전체가 「어젯밤」인데 탐정은 눈앞에서 본다).
  - **진입 시각 둘을 숫자로 고쳤다** — 123 「사건 당일 저녁」 → `21:55`,
    126 `23:05` → `22:56`(원래 값이 `T09`와 같은 분이라 탐정이 그 자리에 있을 수
    없었다).
  - CASE126 `E07`의 빈 `proves`·`does_not_prove`를 채웠다.
  - 다섯 건 다 `npm run build:source` 다시 돌렸다.
- `docs/archetype-gaps.md`에 **무대 칸이 없는 셋**(VR 체험관 · 동물원 · 극단)과
  **폴백 오분류 열**을 더했다.
- `check:case` 다섯 건 errors 0 · `check:novel` errors 0 · `check:spelling` 0건 ·
  `check:offline` 256/256 완주 · `tsc --noEmit` · `npm run build` 통과.

**해야 할 것 — 검사기를 보는 세션**

- [ ] **`RANGE_TWIN`이 122~125를 한 건도 안 잡는다.** 네 편이 인물 5·진범 CH01·
      `T01`~`T17`·진입 시각 08:00·타임라인 시각(21:00/21:10/21:15/21:20/21:40/
      22:05/22:15/22:20/다음날 08:00)까지 같은데, **단계 이름이
      `admits_blade_order`·`admits_valve_order`·`admits_cycle_order`·
      `admits_cartridge_order`로 명사만 갈려 사슬이 서로 다른 값으로 세어진다.**
      CLAUDE.md의 「이름만 바꾸면 검사만 조용해진다」가 **처음부터 그렇게 생성된**
      경우다. 사슬 축을 **`initial`/`final_*`만 빼고 나머지를 위치로 세거나**,
      「한 칸만 다른 사슬」을 같은 골격으로 묶는 쪽을 볼 만하다. 이 회차는 진상을
      건드리지 않고는 못 고쳐서 그대로 뒀다.
- [ ] **수법 폴백이 「찔려」를 보고 `stabbing`으로 센다**(124 감염 · 125 약물 과다).
      **이 오분류가 `NEIGHBOR_TWIN`(124↔125)을 만들고 있었다** — 선언을 적자
      경고가 사라졌다. 즉 **`NEIGHBOR_TWIN`의 오탐 중 일부는 폴백 오분류가
      만든다.** 선언이 없는 사건끼리 걸린 쌍을 한 번 훑어볼 값이 있다.
- [ ] **무대 폴백이 `setting`의 방 열거까지 읽는다**(126이 「골동 인형 보관창고」의
      '창고' 때문에 `warehouse`로 세어지고 있었다). CASE080·085·116의 세 건은
      전부 고유명사였는데 이번은 방 이름이라, 「따옴표 안을 건너뛰게 하기」로는
      안 막힌다. `docs/archetype-gaps.md`에 적어 뒀다.

**소설화 루틴 다음 회차(127~131) 블록은 처리해서 지웠다** — 127~131 회차 PR에서 받았다.
