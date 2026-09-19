### 2026-09-19 17:00 UTC · claude/wizardly-hamilton-8kkrnr → 상대 브랜치

**한 것**

- 소설화 회차(CASE054·055·060·061·062)를 올리면서 **그 다섯의 `*.master.json`을 고쳤다.**
  같은 파일을 이주 루틴이 잡으면 충돌한다.
  - **분류 코드 여덟**을 다섯 편에 추가(`case_identity.location_archetypes`·`background.*`,
    `full_truth.method_archetypes`·`motive_archetypes`·`cover_up_target`·`cover_up_method`).
    다섯 다 `check:case` errors 0.
  - **겹치던 문장 28줄을 새로 썼다**(`ending_scene`·`opening_scene`·`initial_claims`·
    `observation_rules[].result`·`evidence[].content`). 060·061·062가 `audit:duplication`
    목록에서 **0건**이 됐고(061은 313건 중 1위였다), 060~079 구간 평균이 21% → 18%,
    겹치는 문장 종류가 181종 → 178종이 됐다.
  - **마스터가 자기 안에서 어긋난 자리 셋을 고쳤다.** CASE060 `E02.content`의 시각
    (21:40 → 22시경, `T07`과 `key_time_location`이 22:00이다), CASE060 오프닝 산문의
    시간대 말 셋(진입이 다음 날 07:00인데 사고 당일 밤처럼 쓰여 있었다),
    CASE061 `full_truth.cover_up`의 「사고 다음 날 아침 일찍」(나머지 다섯 필드가 전부
    사고 당일 밤 22:10이다).
  - `npm run build:source`를 다섯 건 다시 돌려 `*.source.md`를 맞췄다(CASE061만 바뀐다).
- `docs/novels/README.md`·`docs/archetype-gaps.md`에 회차 절을 각각 하나씩 덧붙였다.
  **둘 다 파일 끝에 붙였으므로** 상대가 같은 파일에 적어도 자리 충돌은 안 난다.
- **코드는 한 줄도 안 고쳤다.** `tsc --noEmit`·`build:cases`·`check:novel`·
  `check:spelling` 전부 통과.

**해야 할 것**

- [ ] 이주 루틴이 CASE054·055·060·061·062를 잡을 차례면 **이 브랜치가 머지된 뒤에 시작할 것.**
      다섯 다 `relationships`는 이미 있고 이번에 손대지 않았다.
- [ ] (검사기 쪽을 보는 세션에게) **`NEIGHBOR_TWIN`에 다섯 번째 축을 제안한다** —
      `actual_timeline`의 시각 골격. CASE060·061·062가 **타임라인 열한 항목이 같고 그중
      여덟 개의 시각이 겹치는데** 네 축 어디에도 안 걸린다(수법 계열이 셋 다 달라서 0,
      진입 시각 `사건 당일 07:00`은 흔해서 제외, 단계 이름 `admits_dispute` 17.3%·
      `admits_reentry` 12.8%는 「흔한 이름」으로 제외, 인물 배치는 `role` 문자열이 달라서).
      근거와 수치는 `docs/novels/CASE061.md` 맨 뒤 「세 편이 한 틀에서 나왔다」.
- [ ] (같은 세션에게) **`audit:duplication`에 일곱 번째 자리로 `voice_profile`을 넣는 것**도
      같이 제안한다. 지금 여섯 자리 어디에도 없는데, **완전히 같은 `voice_profile` 객체를
      18명이 나눠 쓴다**(2위 14명, 3위 9명). CASE060·061은 다섯 인물이 다섯 다 같다.
      문장이 아니라 **객체 단위 완전 일치**만 세면 되므로 구현이 가장 싸다.
