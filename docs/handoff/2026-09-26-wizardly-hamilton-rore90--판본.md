### 2026-09-26 · claude/wizardly-hamilton-rore90 → 판본 루틴

_원본 쪽지 `wizardly-hamilton-rore90`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **판본 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

**한 것**

- 소설화 **번호순 회차 — CASE331 한 편**([docs/novels/CASE331.md](../novels/CASE331.md), 「서명 이후」).
  전날 머지된 새 번호(#1297)라 README 표에 **행을 새로 더했다**. 런타임이 안 읽는 문서다.
  줍기 포인터와 판본 대조 갈래의 포인터는 건드리지 않았다(회차 시작할 때와 PR 직전에 두 번 셌다).
- **`data/pending-cases/CASE331/CASE331.master.json`을 고쳤다 — 분류 코드 세 축만.** 진상·시각·인물·
  대사·산문은 한 글자도 안 건드렸다. **이 파일을 같이 보고 있는 세션이 있으면 이 세 줄만 충돌한다.**
  - `full_truth.motive_archetypes`: `succession_change` → `succession_change` · `position_defense`
  - `full_truth.cover_up_target`: `responsibility` · `communication_trace` → + `evidence`
  - `full_truth.cover_up_method`: `accident_victim_error` · `digital_record_manipulation` → + `scene_rearrangement`
  - 근거는 `docs/archetype-gaps.md`의 새 절에 있고, **고친 뒤 warnings가 1 → 4**(전부 비율 보고)다.
    errors는 0 그대로다. README가 「경고를 없애려고 코드를 고르지 말 것」이라 그대로 뒀다.
- 문서 다섯을 건드렸다: `docs/novels/CASE331.md`(새 파일) · `docs/novels/README.md`(표 한 행) ·
  `docs/novels/rounds.md`(회차 절) · `docs/archetype-gaps.md`(새 절) · `docs/handoff-backlog.md`(세 줄).
- 코드는 한 줄도 안 고쳤다. `app/`·`scripts/` 무변경.

**안 한 것**

- 마스터의 카드·`red_herrings`·`detail_rules`는 손대지 않았다. 위 목록은 전부 **판본이 할 일**이고
  원본을 건드리는 일이 아니다(README 「반대 방향」).
- `docs/novels/feedback.md`에는 안 적었다 — 그 파일은 「그 번호를 나중에 **다시 쓸 때**」를
  전제로 하는데, 이 번호에서 나온 셋은 다 **판본을 뜰 때** 보는 것이라 백로그의 판본 절로 보냈다.

**해야 할 것 — 판본 루틴 (`Case-No-331.offline.json`을 뜰 때)**

- [ ] **「밀렸다」를 집는 카드가 0장이다.** 카드 열일곱 장이 서류·기록 7 · 물건 2 · 증언 8이고
      **사람의 몸을 보는 칸이 0**이다. CASE022·125·131·330에 이은 다섯 번째인데 **축이 다르다** —
      사인(롤러 끼임)은 `surface_incident`로 공개돼 있고, 비어 있는 것은 「혼자 끼였나 밀렸나」다.
      그래서 `C03`의 요구 카드 셋(`E05`·`E07`·`E12`)이 **전부 은폐를 집는 카드**다.
      **고치는 것은 카드 한 장**: `L01.base_description`의 「누군가 서 있었던 듯한 발자국이 어지럽게」를
      `detail_rules` 한 칸으로 끌어올린다(방 서술은 카드가 아니다).
- [ ] **경보와 인터록이 같은 계통이라는 한 줄이 마스터 전문에 0회다.** 「경보음이 꺼져 있다」가
      `opening_scene` 첫 대사·`E06`·`F-CH01-01` 세 군데에 있고 셋 다 결정적인데, 왜 꺼졌는지가 없다.
      **`E04.content`에 한 문장**이면 `E05`·`E06`·`E07`이 한꺼번에 이어진다.
- [ ] **`R02.how_to_clear`가 그 헛다리를 안 보는 카드를 부른다** — `E15`는 반준영이 아니라 유경환을
      본 증언이다. 반준영을 본 것은 `F-CH01-03`이고 카드가 아니다. `E15`는 `C02`의 요구 카드이기도
      하므로 **`how_to_clear`에서 `E15`를 빼고 `F-CH01-03`을 카드로 세우는 쪽**이 낫다.
- [ ] 보드 후보 12개·재료·오답별 반박자, `L03`(로비, `detail_rules` 0개)의 첫 칸, `requires` 한 칸
      제안(`E11`←강필두)은 전부 [소설 맨 뒤](../novels/CASE331.md) 「오프라인으로 옮길 것」에 있다.
      `audit:offline`의 필수 빈 칸은 6(보드·재료·버릇·카드방향·어긋남·헛다리)이고 **차 있는 것이 넷**
      (지목·한계·관계id·지도)이라 이 갈래에서 드문 출발선이다.
