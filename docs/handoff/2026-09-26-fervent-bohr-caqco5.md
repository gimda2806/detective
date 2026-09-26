### 2026-09-26 · claude/fervent-bohr-caqco5 → (다음 생성 루틴 세션)

**한 것**

- CASE334 「마지막 테이프를 감던 밤」 생성·검증·레지스트리 등록·PR #1355 머지 완료.
  `npm run next:case-id`는 머지 뒤에도 여전히 **CASE332**를 가리킨다(CASE332를 두고
  경합하던 세 PR #1349·#1351·#1352가 이 시점까지 아직 머지되지 않았다 — 가장 작은
  빈 번호 규칙이 그 세 PR 중 하나가 들어갈 때까지 CASE332에 머문다).
- **CASE332는 건드리지 않았다.** 시작 시점에 CASE332를 두고 세 PR이 경합 중이었고,
  진행 중 **CASE333도 이미 PR #1354(`claude/keen-newton-r01rw9`)로 선점된 것을
  뒤늦게 확인**해 CASE334로 넘어갔다 — `git fetch`·`case_registry.json`·열린 PR
  목록을 커밋 직전과 푸시 직전 두 번 재확인했고 둘 다 CASE334는 비어 있었다.
- 무대 `repair_shop`(코퍼스 3.6%), 진입 경로 `returning_former_affiliate` — 최근
  3건(`employee_or_staff`/`event_attendance`/`personal_stake`)과 겹치지 않는다.
- **최초 초안은 네 축에서 전부 error로 막혔다** — `motive_archetypes: ip_dispute`
  (8.5%), `method_archetypes: electrocution`(8.2%), `location_archetypes:
  production_studio`(5.4%), `cover_up_target: evidence`(2.0배) ·
  `cover_up_method: accident_equipment_failure`/`evidence_removal`(2.3~2.6배).
  살해 기전을 감전에서 **배전함 모서리에 부딪힌 두부 손상**(`blunt_force`, 7.9%)으로
  바꾸고, 동기는 `ownership_dispute`/`contract_breach`/`financial_gain`, 은폐는
  `false_accident`/`concealment_without_staging`으로 다시 설계해 통과시켰다 —
  실측은 `data/case_registry.json`과 각 `pending-cases/*/*.master.json`을 직접
  스캔하는 스크립트로 재 봤다(코퍼스 331건 기준, `npm run check:case`가 내는 비율과
  같은 자리를 짚는다). 관계도 중심은 피해자(남경모)에 두고 범인(오인철) 연결은
  하나만 — `RELATIONSHIPS_CULPRIT_HUB` 회피. 인물 이름(오인철·소하늬·곽태산·백승묵·
  정로아·남경모)은 레지스트리 전체와 스크립트로 겹치지 않는지 확인 후 골랐다.
- `check:case CASE334` errors 0 · warnings 2(둘 다 은폐 축 1.5~1.6배 warn, 새 사건
  error 문턱 2배 밑). `check:offline -- CASE334` 완주 가능. `tsc --noEmit`·
  `lint:baseline`(기준선 49건, 변동 없음) 클린.
- 이 환경도 `node_modules` 없이 시작해 `npm ci`를 먼저 돌렸다(기존 쪽지와 같은 자리).
- 처리한 쪽지: `2026-09-26-keen-newton-c0zs4z.md`(CASE314 머지 완료 알림, 해야 할 것
  없음) — 지웠다.

**해야 할 것**

- 없다.
