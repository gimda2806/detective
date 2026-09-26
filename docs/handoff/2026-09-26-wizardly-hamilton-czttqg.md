### 2026-09-26 · claude/wizardly-hamilton-czttqg → 생성 루틴 · 아무나

**한 것**

- 소설화 **줍기 회차 — CASE022 한 편**([docs/novels/CASE022.md](../novels/CASE022.md), 「풀린 로프」).
  지워졌다 새 사건으로 다시 채워진 번호라 README 표에 **행을 새로 더했다**. 런타임이 안 읽는 문서다.
- **`data/pending-cases/CASE022/CASE022.master.json`을 고쳤다 — 분류 코드 세 줄만.** 진상·시각·인물·
  대사·산문은 한 글자도 안 건드렸다. **이 파일을 같이 보고 있는 세션이 있으면 이 세 줄만 충돌한다.**
  - `case_identity.location_archetypes`: `warehouse` → `production_studio` · `warehouse`
  - `full_truth.cover_up_target`: `victim_behavior` · `relationship` → `cause_of_death` · `weapon` · `motive`
  - `full_truth.cover_up_method`: `accident_victim_error` → `accident_victim_error` · `body_movement` ·
    `evidence_removal` · `weapon_disposal`

  근거표는 `docs/archetype-gaps.md`의 「소설 루틴 검산 (CASE022)」. 고치기 전 `validate_master`
  errors 0 · warnings 0, 고친 뒤 errors 0 · warnings 3(셋 다 비율 보고). `check:case CASE022` 검사
  모두 통과 · `check:offline CASE022` 완주 가능 1 · `check:novel` 이상 없음.

**해야 할 것 — 생성 루틴**

- [ ] **틀린 분류 선언이 경고 0으로 통과했다.** `cover_up_target`의 두 칸(`victim_behavior`·
      `relationship`)이 **마스터 문장에 근거가 없는데** 선언이 폴백을 건너뛰게 해서 아무 데도 안
      걸렸다. 백로그 「생성 루틴」 절의 **「틀린 선언은 값이 없는 것보다 나쁘다」**에 CASE022를 더한다.
      그리고 같은 은폐 문장 하나에 손놀림이 **넷**(사고 위장 · 시신 이동 · 증거 제거 · 흉기 처분)인데
      선언은 하나였다 — **은폐 문장을 쓴 뒤 그 문장에서 동사를 세는 단계**가 스펙에 없다.
- [ ] **CASE022의 진상이 두 가지로 적혀 있다** — 백로그 「마스터가 어긋난 자리」에 줄을 더해 뒀다.
      렌치가 있는 판(`full_truth`·`T13`)과 없는 판(`final_deduction`·엔딩·자백)이고, 로프를 푼 **순서**도
      자백과 `T14`가 다르다. 소설은 엔딩 산문을 원문대로 살리고 본문에서 렌치를 찾지 않았다.

**해야 할 것 — 아무나(닫힌 항목 하나)**

- [x] **`check:case`의 `TS5112`는 툴체인 문제가 아니다.** 여러 회차가 「`npx tsc` 6.0.2가 죽는다,
      스크립트를 못 고친다」로 적어 왔는데, 백로그 **「아무나」 절 첫 줄**이 이미 답이었다 —
      `node_modules` 없이 돌리면 `npx`가 TypeScript 6을 받는다. **`npm ci` 한 줄이면 그대로 돈다.**
      확인했고 회차 기록(`docs/novels/rounds.md` CASE022 절 8번)에 적었다. **백로그 줄은 그대로 둔다.**
