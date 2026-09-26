### 2026-09-26 · claude/wizardly-hamilton-ti4rl7 → 생성 루틴 · 판본 루틴

**한 것**
- 소설 세 편 추가(CASE327·328·329). 런타임이 안 읽는 문서라 코드 영향 없음.
- **마스터 세 건의 분류 코드만 고쳤다**(진상·시각·인물 불변, `check:case` 통과).
  - `CASE327`: `motive_archetypes` `reputation` → `report_prevention`+`past_crime_cover` · `background_archetypes` `company_event` → `other` · `background_intensity` `contextual` → `contributory`
  - `CASE329`: `cover_up_target` `relationship`+`access_route` → `cause_of_death`
  - 둘 다 `docs/archetype-gaps.md`에 근거를 남겼고, 고친 뒤 warn이 하나씩 떴다(그대로 둔다 — README).

**해야 할 것 — 생성 루틴(`claude/fervent-bohr-*`)**
- [ ] **문턱 바로 밑의 칸이 근거 없이 선택되고 있다.** CASE327의 `reputation`이 **7.98%**,
      CASE329의 `relationship`·`access_route`·`false_timeline`·`object_substitution`이 **7.62~7.93%**로
      전부 8% 문턱을 아슬하게 밑돌아 **두 마스터가 경고 0으로 들어왔다.** 그런데 앞의 셋은
      `full_truth` 어디에도 근거 낱말이 없다. **CASE328은 같은 압력에 `other` + 실측 기록으로
      답했고 그쪽이 CLAUDE.md의 규칙이다** — 같은 루틴이 두 가지로 답하고 있다.
      경위는 `docs/novels/rounds.md`의 「327~329 회차에서 확인된 것」 6번.
- [ ] **`red_herrings[].character_id`를 생성 단계에서 쓸 것.** 그 키가 없으면
      `checkSuspicionThin()`이 헛다리를 통째로 건너뛴다 — `SUSPICION_THIN`이 조용한 것이
      두꺼워서가 아니라 **검사가 안 켜져서다.** **이주 루틴이 2026-09-26에 371곳을 채웠는데**
      (`d35da5af`) **그 뒤 머지된 CASE327·328·329가 셋 다 비어 있다**(코퍼스 전체로는 아직 30건).
      **채우는 쪽은 이주 루틴이고 비우는 쪽은 생성 루틴이라 새 사건마다 같은 일이 반복된다** —
      고칠 자리는 개별 마스터가 아니라 `scripts/case_generation_prompt.md`다.
- [ ] **`detail_rules[].requires`의 사람 이름이 그 칸이 있는 방에 서 있는 사람이다.**
      CASE328·329 다섯 칸 중 넷이 그렇다(`present_location`이 그 방이다). 잠긴 것처럼 적혀 있지만
      잠기지 않는다.
- [ ] **`points_finger.opens`가 전부 `S-CH##-01`(초기 진술)이다.** 화살이 1막 첫 몇 턴에 한꺼번에
      꽂힌다 — CLAUDE.md ②의 「관계 질문 뒤에 새어 나온다」(2026-09-24 사용자 결정)와 어긋난다.
- [ ] **`CASE329.master.json`의 `REL03.surfaces_when`이 없는 카드를 부른다** — 「장비 구매 결재
      문서(**E08**)」인데 `E08`은 「폐기함 속 그을린 케이블」이다. 같은 id가 `CH02.hidden_until`에도
      쓰여 **헛다리 하나의 동기가 진범 사슬의 마지막 카드로 열린다.** `validate_master`는 id가
      실재하므로 통과시킨다. **이 회차는 소설만 쓰고 마스터의 이 줄은 건드리지 않았다.**

**해야 할 것 — 판본 루틴**
- [ ] 세 편 맨 뒤 「오프라인으로 옮길 것」에 판본 설계도가 있다(새 카드 · `requires` · 보드 후보 ·
      `points_at`/`mismatch` 자리). 특히 **각 편의 「반드시 고칠 자리」 둘씩**은 판본을 뜨기 전에
      원본에서 닫아야 하는 것들이다 — CASE327의 걸쇠, CASE328의 경고음, CASE329의 `E08` 오참조와
      제목이 말하는 사실(시험대 케이블에 탄 자국이 없다)에 카드가 0장인 것.
