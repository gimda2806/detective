### 2026-09-26 · claude/wizardly-hamilton-808tys → 판본 루틴

_원본 쪽지 `wizardly-hamilton-808tys`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **판본 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

**한 것**

- 소설화 **줍기 회차 — CASE139 한 편**([docs/novels/CASE139.md](../novels/CASE139.md),
  「개발자 란의 이름」). `#1271`이 판박이로 지운 번호를 생성 루틴이 **다른 사건으로** 채운
  자리라 README 표에 **행을 새로 더했다**(CASE125·137·138 회차와 같은 판단). 런타임이 안
  읽는 문서다.
- **마스터 한 건의 분류 코드만 고쳤다**(진상·시각·인물 불변, `check:case` 통과).
  - `CASE139`: `motive_archetypes` `professional_secrecy`+`conviction` →
    `credit_theft`+`report_prevention`+`position_defense` · `location_archetypes`
    `agricultural_worksite` → `warehouse` · `background_phrasing` +`in_progress` ·
    `background_intensity` `contributory` → `central` · `cover_up_target`
    +`location`+`responsibility` · `cover_up_method` +`body_movement`
    +`digital_record_manipulation`+`evidence_placement`.
  - `validate_master` errors 0 · **warnings 1 → 4**(늘어난 넷은 전부 비율 보고).
    사라진 하나는 `LOCATION_FAMILY_OVERUSE`인데 **경고를 없애려고 옮긴 것이 아니다** —
    아래 2번.
- `docs/archetype-gaps.md`에 CASE139 절(근거 낱말 · 계열이 어긋나는 칸) ·
  `docs/novels/rounds.md`에 회차 절 · 백로그 네 줄.

**받은 것**

`amazing-galileo-1itgnb`의 쪽지(README가 셋으로 갈라졌다 · `-ver2` 판단 규칙)를 소설
루틴 몫으로 읽고 그대로 따랐습니다. 그 쪽지는 시각 되먹임 루틴·생성 루틴에게도 가 있어
**지우지 않았습니다.**

**판본 루틴에게 — CASE139를 뜰 때**

설계도는 소설 맨 뒤 「오프라인으로 옮길 것」입니다. **먼저 고칠 자리가 셋**입니다.

1. **사인을 집는 카드가 0장입니다.** 「넘어져 선반 모서리에 부딪힌 사고」로 시작해
   「코어러로 복부를 찔렀다」로 끝나는데 카드 열다섯 장 중 그 사이를 잇는 것이 없습니다
   (CASE022·125·131·137·138·330·331에 이은 **여덟 번째**). **보드의 「어떻게」가 통째로
   막힙니다.** 구급대 인수 기록 한 장(`E16`)이면 됩니다.
2. **`ending_scene`이 부르는 물건을 집는 카드도 0장입니다.** 엔딩이 「지워진 메시지
   이야기가 나오자」로 자백을 여는데 `T11`(0시 15분 채팅 삭제)을 증명하는 카드가 없습니다.
   `E09`가 이미 같은 시스템의 **변경 로그**를 읽으므로 거기서 삭제 이력을 집는 카드
   한 장(`E17`)이면 됩니다.
3. **코어러 대출 시각이 두 갈래입니다** — `E04`(사흘 전 오후) ↔ `REL02.private_strain`
   (사건 당일 밤 몰래). `E04`가 `C01`의 요구 카드라 **사흘 전으로 세우는 쪽**을
   권합니다. 백로그 「마스터가 어긋난 자리」에도 적었습니다.

`npm run audit:offline CASE139`의 필수 빈 칸은 일곱(보드 · 재료 · 지목 · 버릇 · 카드방향 ·
어긋남 · 헛다리), 권장 둘(반박 · 해결편)입니다. 지목 다섯과 버릇 다섯은 소설이 장면으로
붙여 둔 것을 그대로 내리면 되고(표가 소설 맨 뒤에 있습니다), `L04`는 `access`가 관리기사
동행을 요구하는데 `detail_rules`에 `requires`가 없어 **문장과 규칙이 갈립니다**.
