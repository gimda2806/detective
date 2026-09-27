### 2026-09-27 · claude/offline-master-schema-dialogue-l19qag → 생성 루틴

**한 것**

- **입구 막기**(사용자 결정). 새 원본은 오프라인 필수 표를 갖고 태어나야 한다. `check:case`가 **등록되지 않은 원본**에
  판본과 같은 뼈대·대사 검사(`checkOfflineSkeleton`·`checkOfflineSpeech`)를 error로 돈다. CI는 PR에서 **새로 추가된
  마스터 파일**을 `check:case <ID> --new`로 돌려, registry 등록이 같은 PR에 들어 있어도 새 사건으로 본다 — 그래서
  코퍼스 비율 검사(E/W)도 처음으로 CI에서 새 사건에 error가 된다. 규칙은 그대로고 집행 자리가 생긴 것이다.
- 스펙 `scripts/case_generation_prompt.md` 루틴 스펙 1단계에 **「오프라인 필수 표를 처음부터 채운다」** 항목을 넣었다.
  채울 필드 목록과 대사 모양 셋이 거기 있고, 모양의 정본은 `docs/offline-master-format.md` 「필수」 표·「대사 필드 표」다.

**해야 할 것**

- [ ] 다음 회차부터 1단계에서 필수 표를 같이 쓴다. 2단계 `check:case`가 `OFFLINE_SKELETON_MISSING`·`OFFLINE_WEIGHT_EMPTY`·
      `OFFLINE_SPEECH_*`를 내면 그 필드만 채워 재검증(전체 재생성 금지, 필드별 3회 — 기존 절차 그대로).
- [ ] `points_at`은 어느 쪽으로도 안 기울면 **`null`로 적는다** — 키가 없으면 error, `null`이면 통과다. 가장 흔히 걸릴 자리.
- [ ] 지금 열려 있는 새 사건 PR(#1349·#1351·#1359·#1364·#1371)은 main을 받으면 이 검사에 걸린다. 그 사건들도 필수 표를
      채워야 머지된다 — 판본으로 따로 메우는 길은 새 번호에는 없다.
- [ ] **CASE343·CASE345 는 게이트를 지나쳐 들어왔다.** 두 PR 이 CI 실행이 끝나기 전에 머지돼 검사가 빈 diff 로 통과했다
      (결정 로그 09-27 「빈 diff」 절). 로컬 `npm run check:case CASE343 -- --new` 는 27개, CASE345 는 19개 error 다 —
      뼈대 8(`points_finger`·`comic_tell`·보드 셋·`points_at`·`mismatch`·헛다리 `weight`/`clearing_points_at`) + 대사 모양
      (`pressure_responses`·`says` 가 따옴표에 싸임). 등록된 채라 검사가 소급되지 않으니 **다음 회차에 이 둘을 필수 표까지
      채우는 것**이 먼저다. 그리고 **PR 은 `check` 가 초록으로 끝난 뒤에 머지한다**(CLAUDE.md 세션 절).

