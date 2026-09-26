### 2026-09-25 · claude/keen-newton-3ryr1j → (다음 생성 루틴 세션)

**한 것**

- CASE324 「정착액이 마르기 전」 생성·검증·레지스트리 등록. `npm run next:case-id`는 이제 **CASE325**를
  가리킨다. `check:case CASE324`는 errors 0 · warnings 0으로 통과.
- 진범(CH02 황윤서)의 `knows`를 1건 채웠고, 대립 단계 마지막 칸(`C03`)이 내주는 `F-CH02-01`은
  스펙이 허용하는 「단계가 진술을 직접 내주는 모양」으로 그 자리에 본문을 썼다 —
  CASE319~322가 반복했던 「진범 `knows`가 `[]`」 패턴은 이번엔 없다.
- `cover_up_target`·`cover_up_method` 포화 문제(0a5h1k·0e5ajk 절에서 받은 것)를 실측으로 다시
  겪었다 — `cause_of_death`(43%)·`evidence`(28%)·`responsibility`(22%)·`victim_behavior`(9%)
  전부 문턱 위였고, `cover_up_method`도 `false_accident`(53%)·`evidence_removal`(24%)·
  `scene_rearrangement`(20%) 전부 문턱 위였다. 둘 다 `other`로 굳혔다 — 근거는
  `docs/archetype-gaps.md` CASE324 절. **CASE322·323에 이어 세 번째 연속 `other`다.**
  `2026-09-25-wizardly-hamilton-yuudvb.md`가 남긴 「비율 검사가 새 사건에서 error인 것이 자기 모집단을 깎는다」 판단 요청은
  아직 사용자 결정 전이므로 손대지 않았다.
- `location_archetypes`도 처음 시도(`photo_video_studio`+`warehouse`, `small_trade` 계열
  20%)·두 번째(`workshop`, 6%)·세 번째(`production_studio`, 5.3%)가 전부 문턱 위였고,
  `warehouse` 하나만 남기자 통과했다(개별 칸·계열 둘 다 문턱 밑). `method_archetypes`도
  `blunt_force`(8%)·`induced_fall`(11%) 둘 다 문턱 위라 `exsanguination`으로 바꿨다(사인을
  「충격」이 아니라 「방치된 채 흘린 피」로 적어 실측과 서사를 같이 맞췄다).
- 인물 이름(남지호·황윤서·조태은·신가율·전소현·구본율)은 레지스트리 전체 1,573+330명과
  겹치지 않게 스크립트로 확인 후 골랐다.
- `data/case_registry.json`·`docs/archetype-gaps.md` 갱신, `npm run build:source CASE324` 실행.
  git commit·push까지는 했고, PR은 호출자가 별도로 처리한다(이 세션 지시).
- **처리한 쪽지 지움**: `2026-09-25-keen-newton-0a5h1k.md`·`2026-09-26-keen-newton-0e5ajk.md` —
  둘 다 「해야 할 것: 없다」였고 내용을 이번 CASE324 생성에 그대로 반영했다.

**해야 할 것**

- 없다. (cover_up 포화·knows=[] 옛 사건 백로그는 여전히 `2026-09-25-wizardly-hamilton-yuudvb.md`가
  들고 있다 — 그 쪽지는 CASE319~322를 되짚거나 사용자가 비율-검사 판단을 내릴 몫이라 이번 세션은
  건드리지 않았다.)
