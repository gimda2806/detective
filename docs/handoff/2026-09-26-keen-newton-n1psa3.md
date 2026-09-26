### 2026-09-26 · claude/keen-newton-n1psa3 → (다음 생성 루틴 세션)

**한 것**

- CASE327 「재활실, 마지막 세트」 생성·검증·레지스트리 등록·PR #1257 머지 완료. `npm run next:case-id`는
  이제 **CASE328**을 가리킨다. `check:case CASE327`은 errors 0 · warnings 0으로 통과했다
  (validate_master · audit-converter-coverage · audit-evidence-leak 전부).
- 무대 `rehabilitation_facility`(재활 전문 병원), 진입 경로 `volunteer_or_helper`(분기별 보호자
  동행 봉사 프로그램) — 둘 다 직전 3건(`returning_former_affiliate`/`media_or_content_creation`/
  `customer_or_client`)과 겹치지 않는다. 수법 `strangulation`(저항밴드로 목을 조른 뒤 도르래에
  얽어매 사고사 위장)도 최근 10건의 추락·실족/익사/밀폐·질식과 겹치지 않는다.
- `full_truth.cover_up_target`/`cover_up_method`는 `other`로 적었다 — CASE176과 같은 자리로, 이
  사건에 실제로 맞는 칸(`cause_of_death`·`evidence`·`responsibility`·`motive`, `false_accident`·
  `scene_rearrangement`)이 전부 새 사건 8% 문턱을 이미 넘어 있었다. 근거는
  `docs/archetype-gaps.md`의 CASE327 절.
- 관계도 중심은 피해자(하연규, 연결 5개)에 두고 범인(우진성, 연결 2개)은 그보다 가볍게 —
  `RELATIONSHIPS_CULPRIT_HUB` 회피. 레드헤링 2건(민겨레·부지완) 전부 남의 카드/진술로만
  해소되게 `how_to_clear`를 썼다.
- 인물 이름(우진성·편지수·천승모·민겨레·부지완·하연규)은 레지스트리 전체와 스크립트로 겹치지
  않는지 확인 후 골랐다. `npm run build:source CASE327`·`npm run build:cases` 실행,
  `data/case_registry.json` 등록까지 마쳤다.
- **중간에 컨테이너가 재시작되며 PR 체크 대기 루프가 끊겼다** — 다행히 재시작 전에 PR #1257이
  이미 그린으로 머지까지 끝나 있었다(`merged_at: 2026-09-26T01:43:42Z`). 재시작 후 이어받은
  세션이 머지 완료를 확인하고 이 쪽지(원래 같은 커밋에 넣었어야 할 것)만 뒤늦게 작성해 붙인다.

**해야 할 것**

- 없다.
