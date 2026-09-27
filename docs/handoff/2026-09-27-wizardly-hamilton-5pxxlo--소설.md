### 2026-09-27 · claude/wizardly-hamilton-5pxxlo → 소설 루틴

**한 것**

- 소설화 **번호순 회차 — CASE341 한 편**([docs/novels/CASE341.md](../novels/CASE341.md),
  「가려진 조리법」). 세 줄은 시작할 때 **① 0 · ② 0 · ③ 큐 14**였고 PR 직전에 **큐 13**이었다.
  README 표에 행을 더했다.
- **마스터 산문은 오타 세 글자만 고쳤다** — `opening_scene`의 「부딫히는」→「부딪히는」·
  「반쯘」→「반쯤」, `E10.content`의 「6시 25분쯓」→「6시 25분쯤」. `audit:duplication`을 먼저
  돌렸고 **CASE341은 상위 15에도 겹침 목록에도 없다.** 네 회차 연속이다.
- **분류 코드 여섯을 더했다** — `contract_signing` · `product_demo` · `on_the_day_of` ·
  `betrayal` · `business_control` · `staging_cover_up`(여섯 개 이름 중 `product_demo`까지가
  배경 두 축이다). `docs/archetype-gaps.md`에 근거 낱말 셋(**파인다이닝 · 예정돼 · 몫**)과
  **오탐 하나**(`accident_victim_health`의 `알레르기`)를 적었다.
- 검사: `check:case CASE341` errors 0 · **warnings 2 → 4** · `check:novel` **errors 0 ·
  warnings 0 · info 0** · `check:codes` 통과 · `build:source CASE341` 돌렸고 소스 문서는
  무변경 · `check:offline CASE341` 손으로 돌렸다(완주 가능 1 · 텍스트 이상 0).
  `check:banter`는 조건이 아니라 안 돌렸다.
- 백로그 「마스터가 어긋난 자리」에 **CASE341 한 줄**(아홉 갈래).
- **처리한 쪽지 하나를 지웠다** — `y9ohx5`. 그 쪽지의 「다음 회차가 바로 쓸 것」을 전부 따랐다
  (세는 것부터 · 새 브랜치를 이름만 읽지 않고 열어 봄 · `audit:duplication` 먼저 ·
  `npm install` 먼저 · **오프라인 필수 표를 여덟 축과 따로 셈**(`grep -c '"points_finger"'`) ·
  **선언이 폴백을 끄고 있는지 축마다 봄** · 진입 뒤 타임라인 항목의 순서 · 「~을 조작해」로
  끝나는 method · 헛다리 `how_to_clear`에 그 사람을 현장에 세우는 카드가 끼었는지 ·
  `voice_profile`·`initial_claims`·`pressure_responses`를 나란히 · `presentation_effect`가 빈
  카드가 `decisive_evidence_ids`에 있는지 · `actual_timeline`에서 HH:MM 없는 항목을 먼저 셈 ·
  장 제목 시각과 본문 시각을 가름 · 「이상 없음」을 재어 봄 · PR 전에 커밋을 하나로 모음).

**다음 회차가 바로 쓸 것**

- **큐는 열셋이고 다음은 CASE342다 — 갈래는 그대로 번호순(③)이다.** 회차 도중에 새 브랜치
  하나(`claude/keen-edison-stlr8z`)가 떴다. 이름만 읽지 말 것 — 열어 보니 CASE120·123·126·127·
  129의 마스터를 고치는 회차라 이 번호와 겹치지 않았지만 **`docs/handoff-backlog.md`를 같이
  고치므로 그 파일에서 충돌이 날 수 있다.**
- **「여덟 축이 선언됐는가」로 세면 안 보이는 자리가 둘이다 — 이 회차에서 가장 큰 발견이다.**
  ① **선언이 폴백보다 좁은 축**: CASE341은 여덟 축이 다 선언돼 있는데 **네 축이 좁았고 더한
  여섯 칸 전부가 폴백이 세던 값**이었다. ② **폴백이 아무것도 못 잡는 축**: `location`은
  `restaurant`가 맞게 적혀 있는데 선언을 지우면 **아무 칸도 아니게 된다**(목록에 「파인다이닝」이
  없다). 세는 법은 한 축에 한 줄이다 — `validate_master.ts`의 표(`MOTIVE_ARCHETYPES`·
  `METHOD_ARCHETYPES`·`LOCATION_ARCHETYPES`·`BACKGROUND_ARCHETYPES`·`BACKGROUND_PHRASING`·
  `scripts/cover-up-tables.ts`)를 `node -e`로 떼어 그 사건의 해당 필드에 직접 돌리고
  **선언된 값과 집합으로 견준다.** 폴백이 읽는 텍스트가 축마다 다른 것도 같이 볼 것 —
  `method`는 `full_truth.method` + **`genre`** + (이 칸만) `cover_up`, `location`·`background`는
  **`setting`만**이다.
- **폴백이 잡은 값을 그대로 다 적지 말 것 — 오탐이 섞인다.** CASE341에서 폴백이 잡은
  `accident_victim_health`는 **알레르기가 위장의 내용이 아니라 수법 자체**여서 걸린 오탐이었다.
  「X로 죽은 사건」과 「X 탓으로 돌린 사건」을 가르는 질문 하나면 갈린다. 오탐이면 칸을 더하지
  말고 갭 문서에 낱말을 적는다.
- **살해 도구를 집는 카드가 있는지 볼 것.** CASE341은 독이 든 소스 냄비를 집는 카드가 열두 장
  중 하나도 없다. **`full_truth.method`의 목적어를 `evidence[].content` 전문에서 찾아 0회면
  그 자리다.** 흉기가 물·음식·공기처럼 씻기거나 사라지는 사건에서 특히 잘 빈다.
- **헛다리가 부르는 명사를 `detail_rules`에서 찾아볼 것.** `R01`의 `surface_suspicion`이
  「세척 기록」을 전제하는데 그 기록판을 집는 칸이 없었다. `surface_suspicion`·
  `suspicion_deepener`의 명사를 방의 행동 문장에서 한 번 찾으면 30초에 갈린다.
- **`connects_to`가 사슬이면 출입 기록 카드가 무엇을 증명하는지 다시 물을 것.** CASE341은
  창고가 조리실로만 이어져서, 조리실 태그 기록만으로는 「창고에 있었다」가 안 깨진다.
- **`REL##.says`·`private_strain`을 그 사람의 `initial_claims`와 나란히 놓는 것은 이제 고정
  절차다.** CASE128 · CASE340 · CASE341 **세 회차 연속으로** 같은 자리가 걸렸다(관계 질문이
  대립 단계의 비교 진술을 먼저 내놓는다).
- **`verbal_tic`이 대사에 박혀 있는지 셀 것** — `grep -o '<어구>' <마스터> | wc -l`이 1이면
  선언뿐이고, 오프라인에서는 그 말버릇이 한 번도 안 들린다. CASE341은 다섯 다 그랬다.
- **코퍼스 `check:novel`의 코드별 수는 앞 회차와 같다** — `TIME_NOT_IN_MASTER` **348** ·
  `TIME_UNRECORDED` **85** · `TIMELINE_AFTER_ENTRY_UNUSED` **27**. 이 편이 셋 다 0으로 들어왔다.
  CLAUDE.md의 시각 되먹임 루틴 줄은 아직 「233개(2026-09-26, 소설 320편)」다.
- **`check:novel`은 인자로 파일 경로를 받는다** — `npm run check:novel CASE341`은 ENOENT로
  죽는다. `npm run check:novel docs/novels/CASE341.md`.

**PR**

앞 회차의 처방을 그대로 따랐다 — 회차의 모든 변경을 **한 커밋**에 담아 한 번만 푸시하고 PR을
열었다. 열고 나서 고칠 것이 생기면 GitHub API(`create_or_update_file`)로 올린다(그쪽은
`synchronize`를 만들어 `check`가 헤드에서 돈다). 빈 커밋·닫았다 열기는 둘 다 금지다.
