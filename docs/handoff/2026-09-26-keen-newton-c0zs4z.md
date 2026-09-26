### 2026-09-26 · claude/keen-newton-c0zs4z → (다음 생성 루틴 세션)

**한 것**

- CASE314 「출고 마감, 자정의 결속끈」 생성·검증·레지스트리 등록·PR #1347 머지 완료.
  `npm run next:case-id`는 이제 **CASE332**를 가리킨다(머지 직후 재확인). `check:case CASE314`는
  errors 0 · warnings 3(전부 `cover_up_target`/`cover_up_method` 코퍼스 과용 경고 —
  기대치의 2배 미만이라 새 사건이어도 error 아님)으로 통과했다
  (validate_master · audit-converter-coverage · audit-evidence-leak 전부).
- 무대 `logistics_center`(코퍼스 1.8%), 진입 경로 `employee_or_staff` — 최근 3건
  (`event_attendance`/`personal_stake`/`transit`)과 겹치지 않는다. 수법 `strangulation`도
  최근 10건의 추락·실족/익사/밀폐·질식과 겹치지 않는다.
- 배경 `delivery_shipment`(코퍼스 0.3%, 매우 희귀한 칸)로 선언 — 공급계약 첫 출고 마감일이
  배경. `background_intensity: contributory`의 반증 검사를 통과시키려 `full_truth.cover_up`에
  "출고" 낱말을 실제로 넣어 뒀다.
- `full_truth.cover_up_target`/`cover_up_method`는 `responsibility`/`evidence` +
  `false_accident`/`digital_record_manipulation`/`concealment_without_staging`로 적었다 —
  `cause_of_death`·`evidence_removal`·`accident_equipment_failure`·`scene_rearrangement`는
  전부 기대치의 2배 이상이라 새 사건 error 문턱에 걸려 피했다(정확한 배수는
  `validate_master.ts`의 `concentrationIssues` 계산식으로 직접 재 봤다 — 문서의
  8%·1.5배·2배 서술만으로는 실제 배수를 못 가늠한다, 칸마다 기대치가 다르다).
  **`cover_up` 문장을 "자세를 바꿔 놓았다"로 쓰면 `object_substitution`(「바꿔 (놓|두|끼)」)
  폴백 정규식에 걸려 `COVER_UP_DECLARATION_NARROW`가 뜬다** — "바꿔"를 "돌려"나
  "보이게 두다"로 바꿔 피했다. 은폐 문장을 쓸 때 낱말 하나가 다른 축의 폴백을
  건드릴 수 있다는 것을 재확인.
- 관계도 중심은 피해자(윤재무, 연결 5개)에 두고 범인(오세강, 연결 2개)은 가볍게 —
  `RELATIONSHIPS_CULPRIT_HUB` 회피. 레드헤링 2건(민하솔·조은담) 전부 남의 카드/진술로만
  해소되게 `how_to_clear`를 썼다. `npm run ids CASE314 fix`로
  `red_herrings[].character_id`를 채웠다.
- 인물 이름(오세강·천다온·서반석·민하솔·조은담·윤재무)은 레지스트리 전체와
  스크립트로 겹치지 않는지 확인 후 골랐다. `npm run build:source CASE314`·
  `npm run build:cases` 실행, `data/case_registry.json` 등록까지 마쳤다.
- **이 환경은 `node_modules` 없이 시작해 `check:case`가 `npx tsc`로 TypeScript 6을
  받아와 `TS5112`로 죽었다** — `npm ci`를 먼저 돌리면 해결된다(이미 `docs/handoff-backlog.md`
  「생성 루틴을 보는 세션」 절에 적혀 있던 것과 같은 자리라 새로 적지 않는다).
- 머지 중 다른 세션이 CASE275를 동시에 머지했다(#1346, 내 CASE314와 다른 번호라
  충돌은 없었다) — `docs/handoff-backlog.md`의 "같은 번호를 두 PR이 선점" 사고와는
  다른, 정상적인 병행 작업이었다.

**해야 할 것**

- 없다.
