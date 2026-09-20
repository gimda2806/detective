### 2026-09-20 · claude/wizardly-hamilton-57sxjv(소설화 루틴) → 이주 루틴 · 검사기를 보는 세션 · 생성 루틴

**한 것**

- **CASE127~131 소설화 회차**를 `docs/novels/`에 올렸다. 「다음 차례」는
  **CASE132~136**으로 올려 뒀다. `check:novel` errors 0.
- **그 다섯의 `*.master.json`을 고쳤다.** 같은 파일을 이주 루틴이 잡으면 충돌한다.
  - **분류 코드 여덟**을 다섯 편에 추가(`case_identity.location_archetypes`·
    `background.*` 셋, `full_truth.method_archetypes`·`motive_archetypes`·
    `cover_up_target`·`cover_up_method`). **폴백이 일곱 군데를 틀리고 있었다** —
    특히 CASE127이 「멤버십」 세 글자 때문에 `association_club`으로 세어져
    **체육·동호회 계열 29%를 혼자 올리고 있었다**(선언을 적자 꺼졌다).
  - **이웃 편끼리 겹치던 문장 스물여덟 자리를 갈랐다** — 127↔128 셋, 128↔129 일곱,
    **130↔131 열**(엔딩 세 줄 · `reason_for_limit_or_lie` 셋 · `voice_profile` 셋 ·
    `pressure_responses` 여섯 · `initial_claims` 다섯 · `L06` 두 줄 ·
    `surface_incident` 하나 · `does_not_prove` 하나). **낮은 번호를 남기고 높은
    번호 쪽만 고쳤고, 같은 새 문장을 돌려 쓰지 않았다**(122~126의 치환표 함정).
    **진상은 한 글자도 안 바꿨다.** 네 쌍 다 지금 0줄이다.
  - `CLAIMS_ALIBI_ONLY` 다섯에 **알리바이 아닌 첫마디**를 추가
    (127 CH02·CH04 · 128 CH01·CH05 · 129 CH03). `initial_claims`와
    `initial_interview_range`가 둘 다 늘었다.
  - `RELATIONSHIPS_SURFACES_NO_ID` 열둘에 id 병기(128 셋 · 129 넷 · 130 둘 · 131 셋).
  - **`MOTIVE_SELF_DISCLOSURE` 하나를 잠갔다**(129 `F-CH03-01`) — `F-CH04-01` 뒤로
    밀고 `F-CH03-02`의 `release_trigger`를 `F-CH03-01`로 이어 사슬로 묶었다.
  - **CASE130 `R02.suspicion_deepener`가 없는 증언을 부르던 것을 고쳤다** —
    「휴게실 동료의 증언」 → 「출입카드 재진입 기록(`F-L02-OBS-01`)」.
    **그 사건에 휴게실이라는 장소도 그 증언을 하는 인물도 없었다.**
  - 다섯 건 다 `npm run build:source` 다시 돌렸다.
- `check:case` 다섯 건 errors 0 · `check:novel` errors 0 · `check:spelling` 0건 ·
  `check:offline` 257/257 완주 · `tsc --noEmit` · `npm run build` 통과.

**해야 할 것 — 검사기를 보는 세션**

- [ ] **「두 편이 판박이다」를 볼 수 있는 검사기가 하나도 없다.** 이 회차에서 두 쌍이
      나왔다 — **127↔128**(둘 다 밀폐실에 가두고 질소로 산소를 밀어냄 + 「사흘 앞둔
      심사」 + 그 집의 장이 범인 + 탐정이 손님으로 그 자리에 있음)과
      **130↔131**(진정제로 무력화 후 사고사 위장 + 단계 사슬이 명사만 다름 + `C01`
      `C02` `C03`의 카드 구성까지 같음 + CH01·CH03·CH05의 배역이 같음). 셋 다 못 본다:
      - `audit:duplication`은 **`MIN_CASES = 3`**이라 쌍은 구조적으로 안 보인다.
        130↔131이 **글자까지 같은 문장 열 줄**이었는데 목록에 한 줄도 안 떴다.
      - `NEIGHBOR_TWIN`은 ① 수법 계열이 **선언 없으면 폴백이 굴러 127·128을 아무
        칸에도 안 걸고**, 걸려도 `sedation_then_act`가 10%라 **희귀도 관문**에
        막히며 ② **단계 이름이 명사만 갈리면 다른 사슬**로 센다(6rvhg5 쪽지의
        122~125와 **같은 실패가 네 편에서 또 났다**) ③ 「오너/총괄」·「2인자」는
        76%·72%라 애초에 안 센다.
      - `RANGE_TWIN`은 「±10 안에 **넷 이상**」이라 쌍은 못 센다.
      **`audit:duplication`의 `MIN_CASES`를 「이웃 쌍에 한해 2」로 여는 것이 가장
      싸 보인다** — 이번에 손으로 재 보니 네 쌍에서 스무 줄이 나왔고 오탐이 없었다.
- [ ] **`ALIBI_HINT`가 「내일 아침 10시에 실사단이 와요」를 알리바이로 읽는다.**
      `CLAIMS_ALIBI_ONLY`를 메우려고 넣은 **미래 일정** 한 줄인데 시각 표지 때문에
      그대로 다시 걸렸다(CASE129 CH03). 이 검사가 있는 이유는 「묻지도 않았는데
      **자기 행적**이 인사 다음 줄에 나온다」이므로, **자기 행적이 아닌 시각**은
      빼는 편이 맞아 보인다. 지금은 시각을 지워서 통과시켰다.

**해야 할 것 — 이주 루틴**

- [ ] 이 회차가 손댄 다섯 건(127~131)의 마스터를 같이 잡으면 충돌한다. 다만
      **`CHARACTER_WITH_NO_QUESTION`(2·3·2·2·2명)과 `detail_rules` 0개인 방 열둘,
      `requires` 빈 칸은 그대로 남겨 뒀다** — 각 편의 「오프라인으로 옮길 것」에
      무엇을 어디에 넣을지 칸까지 적어 뒀으니 그대로 쓰면 된다.
