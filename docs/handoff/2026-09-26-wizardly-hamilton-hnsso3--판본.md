### 2026-09-26 · claude/wizardly-hamilton-hnsso3 → 판본 루틴

_원본 쪽지 `wizardly-hamilton-hnsso3`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **판본 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

**한 것**

- 소설화 **줍기 회차 — CASE137 한 편**([docs/novels/CASE137.md](../novels/CASE137.md), 「겹친 목소리」).
  `#1271`이 판박이로 지운 번호를 생성 루틴이 **다른 사건으로** 채운 자리라(`#1300`) README 표에
  **행을 새로 더했다**(지워질 때 표 행도 같이 지워졌다 — CASE022와 같은 자리다). 런타임이 안 읽는 문서다.
  번호순·판본 대조 갈래의 포인터는 건드리지 않았다.
- **`data/pending-cases/CASE137/CASE137.master.json`을 고쳤다 — 분류 코드 네 축만.** 진상·시각·인물·
  대사·산문은 한 글자도 안 건드렸다. **이 파일을 같이 보고 있는 세션이 있으면 이 네 줄만 충돌한다.**
  - `case_identity.location_archetypes`: `academy` → + `production_studio`
  - `case_identity.background.background_archetypes`: `company_event` → + `routine_operation`
  - `case_identity.background.background_phrasing`: `on_the_day_of` → + `scheduled`
  - `full_truth.motive_archetypes`: `jealousy` · `rival_removal` → + `position_defense`
  - `full_truth.cover_up_method`: `digital_record_manipulation` · `witness_misdirection`
    → + `scene_rearrangement` · `accident_equipment_failure`
  - 근거는 `docs/archetype-gaps.md`의 새 절. **고친 뒤 warnings가 0 → 7**(전부 비율 보고)이고 errors는
    0 그대로다. CLAUDE.md가 「경고를 없애려고 코드를 고르지 말 것」이라 그대로 뒀다.
- 문서 다섯을 건드렸다: `docs/novels/CASE137.md`(새 파일) · `docs/novels/README.md`(표 한 행) ·
  `docs/novels/rounds.md`(회차 절) · `docs/archetype-gaps.md`(새 절) · `docs/handoff-backlog.md`(세 줄).
- 코드는 한 줄도 안 고쳤다. `app/`·`scripts/` 무변경.

**해야 할 것 — 판본 루틴 (`Case-No-137.offline.json`을 뜰 때)**

- [ ] **질식을 말하는 카드가 0장이다 — 이 번호에서 판본을 막는 유일한 자리.** 카드 21장 중 사인을
      집는 카드가 없고 「질식」은 `full_truth.method`·`T16`에만 있다(둘 다 플레이어가 못 본다).
      `surface_incident`는 「반응이 없는 것을 발견」·「이미 숨을 거둔 뒤」까지고 `L02.base_description`·
      `F-L02-OBS-01`은 장비만 본다. **가설 보드의 「어떻게」 칸이 통째로 이 값에 걸려 있어**, 지금
      그대로 뜨면 정답 후보를 떠올릴 재료가 없다. `L02`의 `detail_rules` 한 칸(`requires: 없음`,
      질식 소견)이면 오답 「지병·급성 질환」도 같이 부순다. CASE022·125·131·330·331에 이은 여섯 번째인데
      **보드를 막는 것은 이 편이 처음이다.**
- [ ] **규칙 두 줄이 마스터 전문에 0회다.** ① **안쪽 레버가 출입증보다 우선**이라는 것 — `E07`은
      「안쪽에서 잠긴 상태」까지라 **안에서 잠겼으면 안에서 열 수 있다**가 되고, 그러면 `C03`이
      자백만 받고 밖에서 잠근 사람이 없는 사건이 된다. ② **밸브에 권한이 걸려 있다**는 것 —
      `E06`(손으로 누른 지문)과 `E10`(원격 접근 권한)이 지금 서로 다른 수법을 말한다. 둘 다
      한 줄이면 이어지고, 소설 2·8장이 그 한 줄을 탁재헌의 입으로 세워 뒀다.
- [ ] **`R01`과 `R02`의 해소가 서로를 부순다.** `R01`(목하영)은 「반소일이 그 시각 라운지에 함께
      있었다」(`E18`)로 풀리고 `R02`(반소일)는 「그 시각 화상회의 중이었다」(`E19`·`E20`)로 풀리는데,
      **회의는 혼자 하는 일이다.** 소설은 「라운지에서 노트북과 헤드셋으로 접속했다」 한 줄로 메웠고
      (`T11`의 라운지 두 사람 + `L06`의 커피잔 두 개가 물증이다), **그 한 줄이 마스터에 없다.**
      `E19.content`나 `E20.content`에 한 줄, 또는 `L06`의 첫 `detail_rules` 칸으로.
- [ ] **`suspect_refutations`가 둘 모자란다.** 판본 규칙은 「진범을 뺀 전원」인데 `red_herrings`가
      `CH03`·`CH05` 둘뿐이다 — `CH01` 탁재헌(발견자다)과 `CH02` 견서인에게 반박이 없다. 재료는 있다
      (`E11`·`F-CH01-01` / `F-CH02-02`). 다만 **`F-CH02-02`가 `C01` 뒤로 잠겨 있어 1막에서는
      견서인의 반박 재료가 없다** — `hidden_until`을 한 칸 당기든지 `E17`에 한 줄을 붙인다.
- [ ] 보드 후보 열여섯(네 칸 × 정답 하나·오답 셋)·재료·오답별 반박자, `L06`(라운지, `detail_rules`
      0개)의 첫 칸, `requires` 한 칸 제안(`E06`←탁재헌)은 전부
      [소설 맨 뒤](../novels/CASE137.md) 「오프라인으로 옮길 것」에 있다. **`requires`를 걸 때는
      `check:offline` 완주를 먼저 돌려 볼 것** — 탁재헌은 `L03`에 있고 `L03`도 제한 구역이다.
