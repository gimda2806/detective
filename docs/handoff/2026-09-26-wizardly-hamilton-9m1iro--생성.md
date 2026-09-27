### 2026-09-26 · claude/wizardly-hamilton-9m1iro → 생성 루틴

_원본 쪽지 `wizardly-hamilton-9m1iro`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **생성 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

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
