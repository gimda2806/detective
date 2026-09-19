### 2026-09-19 22:00 UTC · claude/wizardly-hamilton-4poq6n → 상대 브랜치

**한 것**
- 소설화 회차 **CASE054·055·060·061·062**(`docs/novels/`). 번호가 또 끊겨 있어
  054~058이 아니라 이 다섯이 한 회차다 — `CASE056`~`CASE059`는 폴더도 registry
  기록도 없다. **다음 회차는 CASE063~067**(다섯 다 있는 것을 확인했다).
- **그 다섯의 `*.master.json`을 고쳤다.** 진상은 한 글자도 안 건드렸고, 바뀐 것은
  ①분류 코드 여덟(`method_archetypes`·`motive_archetypes`·`location_archetypes`·
  `background{archetypes,phrasing,intensity}`·`cover_up_{target,method}`) ②겹치는
  문장 새로 쓰기 ③시각 오류 셋이다. 다섯 다 `check:case` errors 0,
  `check:offline` 313/313, `check:novel` errors 0, `tsc --noEmit`·`build` 통과.
- **문자열로 물고 있을 만한 것**: 아래 `initial_claims`·`evidence[].content`·
  `locations[].detail_rules[].result`의 본문이 바뀌었다. id는 하나도 안 바뀌었다.
  - CASE060 `S-CH04-01`, CASE061 `S-CH01-01`·`S-CH04-01`·`S-CH05-01`,
    CASE062 `S-CH02-01`·`S-CH04-01`·`S-CH05-01`
  - CASE061 `E04`·`E06`, CASE062 `E04`·`E06`(짝이 되는 `detail_rules[].result`도 같이)
  - CASE060 `E02`(시각 오류 — `21시 40분`은 표시값 스크립트 시각이고 밸브는 `22시`다)
  - CASE060 `opening_scene.narrative`(진입 시각 07:00과 어긋나 밤으로 읽히던 것),
    CASE054 `ending_scene.narrative`, CASE061·062 `ending_scene.narrative`

**해야 할 것**
- [ ] **`NEIGHBOR_TWIN`이 CASE060·061·062를 못 잡는다** — 이 셋은 타임라인 열한
      항목의 시각·배역과 대립 단계 모양과 헛다리 둘이 **거의 그대로 같은데**
      검사기가 조용하다. 직접 돌려 보니 060–061이 축 1개, 061–062가 2개로 셋에서
      멈춘다. **겹치는데 안 세는 축이 셋 있어서다**: 진입 시각 `사건 당일 07:00`
      (코퍼스 13.1%, 임계 8%), 단계 이름 `admits_dispute`(17.3%)·`admits_reentry`
      (12.8%), 그리고 `neighborRoleSet`의 네 칸(막내·보조/외부 감사·심사/외부
      방문자/가족·측근)에 **셰프·엔지니어·물류팀장이 하나도 안 들어간다.**
      뼈대가 대량 복제되면 그 값이 곧 흔한 값이 되므로 **복제가 심할수록 검사기가
      조용해진다.** 고칠 자리는 `scripts/validate_master.ts`의
      `NEIGHBOR_ROLE_KEYWORDS`(산업 낱말 대신 **사건 안의 기능**으로 — 무마하는
      윗사람 / 언쟁을 들은 외부인 / 최초 발견자 / 기록 점검 담당)와, 흔한 값이라도
      **여럿이 한꺼번에** 겹치면 축으로 세는 규칙이다. 근거와 숫자는
      `docs/novels/README.md`의 「CASE054~062 회차에서 적은 것」에 표로 적어 뒀다.
      **이 회차는 코드를 고치지 않았다.**
- [ ] (알림만) 폴백 정규식이 **저산소 질식(CASE060)과 경구 중독(CASE061)을 둘 다
      `sedation_then_act`로** 잡고 있었다. 선언을 넣어 고쳤으므로 그 칸의 17%에서
      둘이 빠진다 — 다른 사건의 과용 경고 숫자가 조금 움직인다.
