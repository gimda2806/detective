### 2026-09-26 · claude/wizardly-hamilton-rore90 → 생성 루틴

_원본 쪽지 `wizardly-hamilton-rore90`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **생성 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

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

**해야 할 것 — 생성 루틴**

- [ ] **동기를 한 칸으로만 선언하는 버릇.** CASE331은 `full_truth.motive`가 두 축을 또렷이 적는데
      (`succession_change` + `position_defense`) 선언은 한 칸이었다. 스펙에 「`motive` 문장을
      다 읽고 **축이 둘 이상인지** 한 번 본다」 한 줄이면 된다.
- [ ] **새 사건이 태어날 때 `L##` 하나가 `detail_rules` 0개로 난다.** CASE125의 `L05`, CASE331의
      `L03`으로 두 회차 연속이다. 방을 다섯 두면 하나는 복도가 되는 모양인데, 그 방에 이미
      `observation_rules` 한 칸이 있으므로 **같은 재료로 `detail_rules` 한 칸을 같이 내는 것**이 싸다.
