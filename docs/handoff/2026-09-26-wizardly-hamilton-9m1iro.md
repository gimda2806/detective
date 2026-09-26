### 2026-09-26 · claude/wizardly-hamilton-9m1iro → 판본 루틴 · 검사기를 보는 세션 · 생성 루틴

**한 것**

- 소설화 **줍기 회차 — CASE138 한 편**([docs/novels/CASE138.md](../novels/CASE138.md), 「두 번째 잔」).
  `#1271`이 판박이로 지운 번호를 생성 루틴이 **다른 사건으로** 채운 자리라(`#1303`) README 표에
  **행을 새로 더했다**(CASE022·125·137과 같은 자리 — 지워질 때 표 행도 같이 지워졌다).
  런타임이 안 읽는 문서다. 번호순·판본 대조 갈래의 포인터는 건드리지 않았다.
- **`data/pending-cases/CASE138/CASE138.master.json`을 고쳤다 — 분류 코드 다섯 축만.** 진상·시각·
  인물·대사·산문은 한 글자도 안 건드렸다. **이 파일을 같이 보고 있는 세션이 있으면 이 다섯 줄만 충돌한다.**
  - `background.background_archetypes`: `business_negotiation` → + `contract_signing` · `company_event`
  - `background.background_phrasing`: `on_the_day_of` → + `scheduled`
  - `full_truth.motive_archetypes`: `business_control` · `inheritance_change_block` → + `ip_dispute` · `betrayal`
  - `full_truth.cover_up_target`: `responsibility` · `communication_trace` → + `evidence`
  - `full_truth.cover_up_method`: `concealment_without_staging` · `document_falsification` ·
    `digital_record_manipulation` → + `evidence_removal` · `false_accident`
  - 근거와 오탐 둘은 `docs/archetype-gaps.md`의 새 절. **고친 뒤 warnings 3 → 8**(늘어난 다섯은 전부
    비율 보고)이고 errors는 0 그대로다. CLAUDE.md가 「경고를 없애려고 코드를 고르지 말 것」이라 그대로 뒀다.
- 문서 다섯을 건드렸다: `docs/novels/CASE138.md`(새 파일) · `docs/novels/README.md`(표 한 행) ·
  `docs/novels/rounds.md`(회차 절) · `docs/archetype-gaps.md`(새 절) · `docs/handoff-backlog.md`(여섯 줄).
- 코드는 한 줄도 안 고쳤다. `app/`·`scripts/` 무변경.

**해야 할 것 — 판본 루틴 (`Case-No-138.offline.json`을 뜰 때)**

- [ ] **수법 전체가 마스터에 없는 한 줄 위에 서 있다 — 이 번호에서 판본을 막는 첫째 자리.**
      `full_truth.method`는 「대표의 몫으로 정해진 **두 번째 잔 찻잎에만** 섞어 넣었다」인데
      **몫이 왜 나뉘어 있는지**가 카드 열여덟 장·관찰 다섯 줄·타임라인 열아홉 항목에 **0회**다.
      그대로 읽으면 두 번째 잔은 한 주전자에서 두 번째로 따른 잔이고, 그러면 첫 잔을 마신 네 사람도
      같은 물을 마셨어야 한다 — `E02`가 무의미해지고 `C03`의 추궁이 무너진다. **고치는 것은 카드 한 장**:
      `L01`의 `detail_rules` 한 칸(정하늬 증언, `requires: 없음`) — 「명맥차는 한 잔씩 따로 우리고
      잎도 몫대로 봉해 둔다. 손님 잔을 먼저 올리고 주인이 두 번째 잔을 든다」.
- [ ] **사인을 집는 카드가 0장이다 — 일곱 번째**(CASE022·125·131·330·331·137에 이어). 이 편은 한 겹 더
      간다: `E07`이 「병 속 가루가 협죽도」까지만 말하고 **그 가루가 사람을 어떻게 하는지가 마스터 전문에
      0회**다. 사인 소견 카드(`L01`, `requires: 없음`) 한 장이 보드 「어떻게」의 정답 재료가 되고 오답
      「지병 악화」도 같이 부순다 — `surface_incident`가 심어 둔 그 오답이 지금은 반박 재료가 없다.
- [ ] **씻긴 잔 자체를 집는 카드가 0장이다.** `E01`은 시음실의 빈 잔받침, `E05`는 배합실 개수대의 물기까지라
      **`C02`가 「누가 치웠나」에서 멈추고 「그 잔이 어떻게 됐나」로 못 간다.** `L02`에 한 칸(`requires: E01`)이면
      된다 — 선반 끝에 따로 엎어 둔 굽 높은 의식용 잔, 안쪽에 찻물 자국이 없고 밑굽이 잔받침 자국에 맞는다.
- [ ] **문자 삭제를 집는 카드가 0장이다** — `cover_up_target`의 `communication_trace`가 카드로 하나도
      안 내려온다(잔·병·기록 셋은 카드가 있다).
- [ ] 보드 네 칸(정답+오답+재료+반박하는 사람) · `suspect_refutations` 둘(`CH01` 정하늬·`CH04` 백강희는
      헛다리가 아니라 **새로 써야 한다**) · `points_at`/`mismatch`/`weight`/`comic_tell`(다섯 다 `null`)은
      전부 소설 맨 뒤 「오프라인으로 옮길 것」에 있다. **판본 루틴이 이 번호를 열 때 첫 셈을 다시 할 필요가 없다.**
      (차례는 아직 멀다 — `audit:offline`이 「CASE013까지 이어졌고 다음 게이트 16편까지 비는 번호 3건」이다.)

**해야 할 것 — 검사기를 보는 세션**

- [ ] **한 사건 안에서 남의 말버릇이 든 대사.** `REL06.says.CH03`(남준경)이 「**그러니까요**, 특별히 걸리는 건
      없었습니다」인데 `그러니까요`는 같은 사건 `CH02`(오상철)의 `verbal_tic`이다. 백로그의 말버릇 검사는
      **사건끼리 겹치는 것**을 보는데 이것은 **한 사건 안의 드리프트**이고, 관계 질문이 `says`를 그대로
      내보내므로 화면까지 나간다. `says`·`initial_claims`·`pressure_responses`에 다른 인물의 `verbal_tic`
      문자열이 들어 있는가 — 코퍼스 전수에 몇 건인지부터.
- [ ] **`weapon_disposal`의 「폐기」가 「폐기함」이라는 가구 이름에 걸린다.** CASE138은 병을 종이에 싸서
      폐기함에 **숨긴** 것인데 `COVER_UP_DECLARATION_NARROW`가 계속 뜬다 — **낱말이 아니라 경계 문제**라
      「폐기」 뒤에 「함」이 붙었는지만 보면 걸러진다. 같은 편의 `accident_victim_error`(「실수로」) 오탐은
      **주체를 안 보는 것**이고 맞는 칸(`false_accident`)을 선언하니 사라졌다. **이 편에서 그 검사가 잡은
      둘이 둘 다 오탐이었고**, 대신 사람이 읽어 두 칸(씻어냄·탓 돌리기)을 더했다.
- [ ] **증거가 물건 이름으로 적히면 `evidence`·`evidence_removal`이 통째로 샌다** — 두 정규식 다
      `(증거|흔적|자국|지문|잔여물|잔흔|자취)` 뒤에서만 「씻」을 본다. 이 코퍼스에서 씻기는 것은 대개
      잔·그릇·도구다. 나머지 근거 낱말 다섯은 갭 문서의 새 절에 있다.

**해야 할 것 — 생성 루틴**

- [ ] **`T07`과 `T09`가 차를 두 번 우린다**(전날 21:30 「손수 우려 봉인해 두고」 ↔ 당일 09:10 「우리며」).
      봉한 것이 **우린 차가 아니라 몫대로 나눈 잎**이면 둘이 한 줄로 서고 위 판본 절의 첫 빈 카드도 같이
      메워진다. **같은 서류가 두 방에 있는 것**도 같은 편이다 — `T04`는 노윤정이 **배합실**을 정리하다
      「대표 책상 위」 초안을 봤다는데 `E09`·`E11`은 그 초안을 **사무실 책상에 며칠** 둔다.
      `validate_master`는 둘 다 조용하다(id만 본다).
- [ ] **헛다리 둘의 해소가 카드 한 장에 겹쳐 있다** — `R01`(오상철)은 `E14`+`E15`, `R02`(남준경)는
      `E15`+`F-CH01-03`이라 **`E15` 하나가 두 사람을 동시에 푼다.** CASE137이 적어 둔 「두 헛다리의 해소가
      서로를 부순다」와 **반대 방향의 같은 뿌리**다(그쪽은 충돌, 이쪽은 겹침). `E14.proves`에 「표준
      계약서에 그 칸 자체가 없다」 한 줄이면 갈라진다.
