### 2026-09-27 · claude/wizardly-hamilton-pmnhot → 되먹임 루틴

**한 것**

- 소설화 **번호순 회차 — CASE345 한 편**([docs/novels/CASE345.md](../novels/CASE345.md),
  「발판이 마르기 전에」, 14장).
- **`CASE345.master.json`을 두 자리 고쳤다.** 이 번호를 되먹임 회차로 여는 세션이 **같은 것을 다시
  재지 않도록** 적어 둔다.
  1. **`verbal_tic` 두 인물이 똑같아서 다시 골랐다.** 고재이(`CH01`)·추영빈(`CH04`)이 둘 다
     `'그러니까'`였고 `pressure_responses` 첫 줄까지 같은 꼴이었다. `VERBAL_TIC_TWIN`은 **다른 사건과만
     견주므로** 한 사건 안의 중복을 못 본다(그 검사기 항목은 백로그 「검사기를 보는 세션」에 있다).
     고재이는 「수조 생물을 '애들'이라 부르며 말을 잇는다」, 추영빈은 「'결과적으로는'을 자주
     앞세운다」로 바꿨고 **선언만이 아니라 대사도 같이 고쳤다** — `pressure_responses` 두 줄과
     `S-CH01-01`·`S-CH04-04`의 `content`다. **id는 하나도 바뀌지 않았다.**
  2. **은폐 두 축의 선언에 한 칸씩 더했다** — `cover_up_target`에 `communication_trace`,
     `cover_up_method`에 `accident_equipment_failure`. 근거 문장은
     [docs/archetype-gaps.md](../archetype-gaps.md) 맨 뒤 절에 있다. **`COVER_UP_METHOD_OVERUSE`가
     하나 새로 선 것은 이 때문이고, 되돌리지 않았다**(경고는 사실 보고다).
- 검사: `check:case CASE345` errors 0 · warnings 3(열 때 2) · `check:novel` errors 0 · warnings 0 ·
  info 0 · `check:offline CASE345` 완주 가능 1 · `check:codes` 통과 · `build:source CASE345` 재생성.

**해야 할 것**

- [ ] **백로그 「마스터가 어긋난 자리」의 CASE345 줄을 그 번호 회차에서 집을 것.** 다섯 항목이고
      가장 큰 것은 **`hidden_until`이 잠근 사실 셋이 증언 카드(`E07`·`E11`·`E04`)로 그대로 새어
      나가는 것**이다 — `E11`은 `C02`의 필수 카드라 이 사건은 `E06`·`E10`을 한 번도 안 보고도 `C02`까지
      간다. **CASE339의 같은 항목(네 자리)과 한 덩어리로 보면 고치는 방향이 한 번에 정해진다.**
- [ ] **위 두 자리는 이미 고쳤으니 다시 재지 말 것.** 되먹임 회차가 CASE345를 열 때
      `verbal_tic`과 은폐 선언은 건드릴 것이 없다.
