### 2026-09-19 · claude/amazing-galileo-1itgnb → 오프라인 뼈대 세션 · 소설화 세션

**한 것**
- `Case-No-004.offline.json`과 `Case-No-005.offline.json`을 썼습니다. 소설의
  「오프라인으로 옮길 것」을 그대로 따랐고, 뼈대(`points_at`·`mismatch`·
  `points_finger`·헛다리 `weight`/`cleared_by`/`clearing_points_at`)를 같이
  채웠습니다. 오프라인 전용 5건이 됐습니다(001~005).
- CASE005는 `CHARACTER_WITH_NO_QUESTION`(최도현·백승모)·`KNOWS_UNGATED_FLOOD`
  (최도현 6개·박기웅 4개)·`MOTIVE_SELF_DISCLOSURE` 둘이 같이 걸려 있어서 그
  넷도 오프라인 판본에서 풀었습니다. 헛다리를 셋으로 늘렸습니다 — 보드의
  `M02`가 최도현의 동기인데 그를 짊어지는 헛다리가 없었습니다.
- `check:case` 0 errors · `check:offline` 313/313 · `check:spelling` 0건.

**찾은 것 하나 — 가설 보드의 `refutation_releases`가 오프라인에서 죽어 있습니다.**

`master-index.ts:714`가 파싱은 하는데(`refutationReleases`), `app/gm/offline-*.ts`
전체에서 **참조가 0건**입니다. `presentation_effect`와 같은 종류인데 그쪽보다
결과가 무겁습니다 — 오답 가설을 깨면 그 인물이 한 마디 해 주기로 되어 있는데,
그 말이 `heard_statements`에 들어가지 않아 **뒤에서 그것을 조건으로 쓸 수가
없습니다.**

코퍼스에 144개 / 16건이 걸려 있고, 그중 **진범이 말하는 것이 10개 / 5건**입니다.
이 열 개는 **나올 길이 아예 없습니다** — `recallableFacts`가 진범을 통째로
제외하므로(CASE290의 자백 유출을 막으려고 그렇게 돼 있습니다) 보드 반박이
유일한 통로인데 그 통로가 안 이어져 있습니다.

CASE004에서 실제로 부딪혔습니다. 소설 설계도가 **「C02의 `player_action`이
진범 자신의 설비 설명(`F-CH05-05`·`F-CH05-06`)을 같이 부르게」**라고 적어
두었고 — 「사람이 다칠 줄 몰랐다」를 깨는 것이 새 증거가 아니라 그가 먼저 한
말이라는 것이 이 사건의 노림수입니다 — 그대로 `requires_heard_claim_ids`에
넣었더니 `check:offline`이 313 → 312로 떨어졌습니다(CASE004 모순단계 1/3).
두 사실이 영영 `heard`가 되지 않아 C02가 닫혀 버린 것입니다. **되돌렸습니다.**
지금 판본은 그 의도를 `player_action` 산문으로만 적어 두었고, 모델이 읽는
AI 경로에서만 듣습니다.

**해야 할 것**
- [ ] `offline-engine.ts`에서 보드 판정(`grade()`) 뒤에 그 가설의
      `refutationReleases`를 `heard_statements`에 넣어 주세요. 그러면 위
      열 개가 살아나고, **오답을 골라 보는 것이 수사가 됩니다** — 지금은
      오답을 깨도 화면에 말만 나오고 상태가 남지 않습니다.
- [ ] 그 뒤에 CASE004 `C02`의 `requires_heard_claim_ids`를
      `["S-CH05-02", "F-CH05-05", "F-CH05-06"]`로 되돌려 주세요. 되돌린 뒤
      `check:offline`이 313/313이면 설계도대로 물린 것입니다.
- [ ] 저는 `app/gm/offline-*.ts`를 건드리지 않았습니다(313건이 걸려 있어
      마스터 작업과 같은 PR에 섞지 않았습니다). 그쪽 차례에 같이 봐 주세요.
