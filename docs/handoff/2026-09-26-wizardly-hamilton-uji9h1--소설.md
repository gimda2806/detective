### 2026-09-26 · claude/wizardly-hamilton-uji9h1 → 소설 루틴

_원본 쪽지 `wizardly-hamilton-uji9h1`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **소설 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

**한 것**

- 소설화 **번호순 회차 — CASE326 한 편**([docs/novels/CASE326.md](../novels/CASE326.md),
  「닻을 올리지 않은 밤」). `docs/novels/README.md`의 표 한 행 · 번호순 「다음 차례」 줄 · 회차 절을
  갱신했고 **줍기 포인터와 판본 대조 갈래의 포인터는 건드리지 않았다**(회차 시작할 때와 PR 직전에 두 번
  셌고, 두 줄 다 비어 있었다).
- **`data/pending-cases/CASE326/CASE326.master.json`을 고쳤다 — 분류 코드 세 축만.** 진상·시각·인물·
  대사·산문은 한 글자도 안 건드렸다. **이 파일을 같이 보고 있는 세션이 있으면 이 세 줄만 충돌한다.**
  - `full_truth.method_archetypes`: `drowning` → `drowning` · `induced_fall`
  - `full_truth.cover_up_target`: `financial_trace` → `evidence` · `identity`
  - `full_truth.cover_up_method`: `false_intrusion` → `false_intrusion` · `evidence_removal` · `concealment_without_staging`

  근거는 전부 `full_truth` 산문의 낱말이고 표로 `docs/archetype-gaps.md`의 **「소설 루틴 검산(CASE326)」**
  절에 적었다. **네 정규식에 안 걸리는 것을 실측으로 확인했다**(`induced_fall`·`financial_trace`·
  `concealment_without_staging`·`evidence_removal` 넷 다 `false`). `validate_master`는 고치기 전
  **errors 0 · warnings 0**, 고친 뒤 **errors 0 · warnings 5**(다섯 다 비율 보고). `check:offline CASE326`
  완주 가능 1·불가 0·텍스트 이상 0. `check:novel`은 이 편 **이상 없음**(경고 0 · info 0).
- `docs/archetype-gaps.md`에 위 검산 절과 **정규식 목록에 없던 낱말 셋**을 더했다
  (`cover_up_target: motive`의 「이름을 숨기」류 · `concealment_without_staging`의 「도움을 청하지」 ·
  `induced_fall`의 「밀치」 어간·「난간」 단독·「중심을 잃」). **정규식은 고치지 않았다.**

**해야 할 것**

- **(생성 루틴)** **CASE326의 진범의 첫 거짓말이 일어나지 않은 사건을 전제로 한다.**
  `characters[0].initial_claims[2]`(`S-CH01-03`)이 「그 사람이랑 갑판에서 마주친 적 없습니다. **발표
  끝나고는** 쭉 선실에 있었어요.」인데, `T04.world_fact`가 발표 시각을 **20:50**으로 못박고 `T06`이
  **20:52**에 피해자를 물에 빠뜨린다 — **이 배에서 발표가 끝난 순간이 없다.** 이 말은 `C02`의 비교
  대상(`requires_comparison.claim_id`)이고 `hidden_until`이 `C01` 뒤로 내주므로, **플레이어는 이 말을
  듣기 전에 이미 발표가 없었다는 것을 안다**(강은주의 `E08`이 「발표 직전에 오빠가 갑자기 일어나더니」다).
  즉 카드 두 장 없이 깨지는 거짓말을 엔진이 카드 두 장으로 잠가 두었다. **「발표가 있을 시간 뒤로는」
  한 줄로 닫힌다.** 이 회차는 **고치지 않았다** — 진범의 대사를 고치는 것은 소설 루틴의 몫이 아니라고
  보았고, 소설은 8장에서 그 말을 원문대로 내놓고 탐정이 미끄러짐을 잡되 거기서 밀지 않는 쪽을 골랐다.
- **(생성 루틴)** **CASE326의 헛다리 하나가 서는 유일한 근거가 같은 사람의 카드에 막혀 있다.**
  `R01`(임태산)은 `F-CH02-01`(선장이 **순찰 중** 그가 후미를 서성이는 것을 봤다) 하나로 서는데,
  마스터가 시각을 적어 둔 유일한 순찰이 `E05`·`E07`의 **20:35**이고 그 순찰의 결론이 **「아무도 없었다」**다.
  `F-CH02-01`에 시각이 없다. **`F-CH02-01`을 출항 직후(`T03` 19:00) 순찰로 적거나 `E05.content`에 저녁
  순찰을 한 줄 더 적으면 닫힌다.** 소설은 앞쪽을 골랐고 **시계 숫자는 쓰지 않았다**(9장에서 임태산이
  「출항하고 얼마 안 됐을 때요」로 답한다).
- 아래 둘은 알림이다.
- **README의 낡은 줄 하나를 고쳤다 — `requires`에 사람 이름을 적은 칸은 이제 「없는 열쇠」가 아니다.**
  113~121 회차 이후 여러 편이 「엔진은 그 칸을 증거·단계 id로만 읽으므로 그 카드는 잠기지 않는다」고
  적어 왔는데, `app/gm/offline-engine.ts`의 `requirementBlock()`은 지금 **id를 먼저 찾고 없으면 `npcs`에서
  이름을 찾아 「그 사람을 면담했는가」로 잠근다.** CASE326의 `L02`·`E06`의 `requires: "강은주"`는 실제로
  걸리는 열쇠다. **앞 회차들이 「이름 칸 = 안 잠김」으로 센 숫자들은 엔진이 바뀐 시점 기준으로 다시
  세야 한다**(이 회차는 CASE326 한 편만 확인했고 코퍼스를 다시 세지 않았다).
- **가설 보드가 없으면 「1막에서 멈춘다」가 아니라 「2막이 없다」다.** 열아홉 번째 줍기 회차와 CASE257
  회차의 소설이 「보드가 없으면 판본이 1막에서 멈춘다」고 적었는데, `hypothesisEnabled()`가 `false`면
  **`actTwo()`는 무조건 `true`**다(`app/gm/offline-hypothesis.ts`). CASE326은 보드가 통째로 없으면서
  `check:offline` 완주 가능 1이다. CLAUDE.md ②의 서술이 맞고 소설 쪽 두 줄이 과했다 — **잃는 것은
  막힘이 아니라 고르는 막이다.** CASE326.md의 해당 절에 그렇게 적었고, **다른 두 편은 건드리지 않았다.**
