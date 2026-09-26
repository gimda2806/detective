### 2026-09-25 · claude/wizardly-hamilton-u90dvb → 전체

**한 것**

- 소설화 **서른 번째 줍기 회차 — CASE278 한 편**([docs/novels/CASE278.md](../novels/CASE278.md),
  「옥상에서 울리던 벨소리」). `docs/novels/README.md`의 표 한 행 · 줍기 포인터 · 회차 절을 갱신했고
  **번호순 회차의 「다음 차례」 줄과 판본 대조 갈래의 포인터는 건드리지 않았다.**
- **`data/pending-cases/CASE278/CASE278.master.json`을 한 칸 고쳤다.** 다른 세션이 이 파일을 들고
  있으면 충돌할 수 있어 적어 둔다. `full_truth.cover_up_target`이 **`["other"]` → `["time", "victim_behavior"]`**다.
  **진상·시각·인물·수법·산문은 한 글자도 안 건드렸다.** 고친 이유는 `docs/archetype-gaps.md`의
  그 사건 줄에 **「내용상 맞는 칸은 `victim_behavior`인데 비율 경고가 떠서 `other`로 내렸다」**고
  적혀 있었기 때문이다 — CLAUDE.md가 두 번 금지하는 자리이고(「경고를 없애려고 칸을 내리지 않는다」),
  **CASE278은 registry에 등록돼 있어 이 비율 검사는 warn이라 CI를 막지도 않는다.**
  `npm run build:source CASE278`을 다시 돌렸고 `.source.md`는 바뀌지 않았다(분류 칸은 소스 문서에 안 나간다).
- `docs/archetype-gaps.md`에 「소설 루틴이 뒤에 고친 것」 절 하나(위 근거 + 코퍼스 실측 비율표).
- `npm run check:novel`은 이 편 **errors 0 · warnings 0**.

**해야 할 것**

- 없다. 아래는 알림이다.
- **(생성 루틴 앞) `cover_up_target` 축은 칸 수와 임계가 구조적으로 부딪힌다.** 317건을 직접 세었다 —
  위쪽 셋(`cause_of_death` 42.59% · `evidence` 27.13% · `responsibility` 22.08%)이 절반을 먹고
  **남은 열한 칸이 7.89~9.15%에 붙어 있다**(임계 8%). 열네 칸에 고르게 퍼져도 한 칸이 7.1%다.
  **맞는 칸을 적으면 거의 무조건 경고가 뜨므로** `other`가 7건(2.21%)까지 늘었고 그중 셋
  (CASE211·232·267)이 **같은 이유**를 적어 두었다. **`other`의 개수가 이 축의 압력계**이니,
  칸을 쪼개든 이 축만 임계를 올리든 비율 검사 쪽에서 볼 자리다. **이 루틴은 코드를 고치지 않았다.**
- **(이주 루틴 앞) CASE278도 가설 보드가 통째로 없다** — `motives`·`times`·`methods`·`resolution`·
  `suspect_refutations` 다섯이 전부 없다. 150~161 구간과 같은 자리이고 **재료는 이 편이 특히 단단하다**:
  `surface_incident` 셋째 줄이 **가짜 시각 오답(22:20)을 통째로 말해 준다.** 네 칸을 채운 표가
  소설 맨 뒤 「오프라인으로 옮길 것」 첫 절에 있다. 같은 표에 **헛다리가 셋뿐인데 진범 아닌 인물은
  넷**이라는 것도 적어 뒀다(연서해 CH05만 없다).
- **`npm run check:case`가 이 환경에서 여전히 안 돈다**(`tsc` TS5112 — `tsconfig.json`이 있는데 파일을
  명령줄로 넘겨 죽는다). 그래서 위 비율은 `check:case`가 아니라 **코퍼스를 직접 세어** 얻었다.
  마스터를 고쳤으므로 **PR 검사의 `check:case CASE278`이 이 회차의 첫 실검사**가 된다.
- **`docs/handoff/2026-09-25-wizardly-hamilton-z3vpff.md`는 지우지 않았다.** 그 쪽지의 알림
  (「`opening_scene.narrative`와 `detective_entry_time`을 맞대 보는 검사가 없다」)이 **검사기를 가진
  쪽 앞으로 된 항목**이라, 그쪽이 받기 전에 지우면 사라진다.
