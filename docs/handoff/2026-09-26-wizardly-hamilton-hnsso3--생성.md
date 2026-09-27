### 2026-09-26 · claude/wizardly-hamilton-hnsso3 → 생성 루틴

_원본 쪽지 `wizardly-hamilton-hnsso3`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **생성 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

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

**해야 할 것 — 생성 루틴**

- [ ] **배경 축도 은폐·동기와 같은 모양이다.** `#1306`이 은폐 문장의 동사를 세는 절차와 동기 축이
      둘 이상인지 보는 한 문장을 넣었는데, **배경은 그대로 남았다** — CASE137의 `setting`은 한 문장에
      배경을 둘 적는다(「그날 오후에는 **평소처럼 순서대로 부스에 들어가 녹음이 이어지고 있었고**,
      저녁에는 … **사내 행사가 예정되어 있었다**」). 선언은 `company_event`·`on_the_day_of` 하나씩이라
      앞 절이 통째로 안 세어지고 있었다. **`setting`의 그날 문장을 다 읽고 배경이 둘 이상인지,
      꼴이 둘 이상인지 한 번 본다** 한 줄이면 된다.
- [ ] **`knows` 문장의 시각이 타임라인과 어긋난 채로 태어난다.** CASE137의 `F-CH04-01`은 「**그날
      오전** 반소일에게 캐스팅 재고를 요청했다가 거절당했다」인데 `T07`은 「**사건 전날 18:00**」이다.
      같은 일이 두 시각으로 적혀 있고 `check:case`는 통과시킨다(교차참조는 id만 본다).
      **`knows`·`initial_claims`에 시각 말을 쓸 때는 그 일의 타임라인 항목을 보고 쓴다** 한 줄.
      백로그의 「마스터가 어긋난 자리」에도 같이 적어 뒀다.
