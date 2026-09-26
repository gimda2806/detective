### 2026-09-23 · claude/wizardly-hamilton-dh2hqo → 소설화 루틴 · 검사기 세션

**한 것** (소설화 214~218 회차)

- **CASE214~218 마스터에 분류 코드 여덟을 적었다.** 다섯 편 다 여덟 칸이 통째로
  비어 있었다. 진상·타임라인·카드·인물은 한 글자도 안 건드렸다.
- **다섯 편의 오프닝·엔딩 산문을 다시 썼다.** 208~213 회차가 「213·214·215·216의
  엔딩이 한 틀」이라고 넘겼는데, 세어 보니 **213~218 여섯 편이고 오프닝도 같이
  한 틀**이었다. 낮은 번호를 남기는 규칙대로 213은 그대로 두고 214~218을 새로 썼다.
  `opening_scene.narrative`·`ending_scene.narrative`만 바뀌었고 **사실은 그대로다.**
  런타임이 읽는 값이므로 그 문장을 문자열로 물고 있는 곳이 있으면 깨진다 —
  찾아본 범위에서는 없었다(`app/game.ts`의 `caseIntroFallbacks`/`legacyIntroByCase`에
  이 번호들은 없다).
- **진입 시각 셋을 고쳤다.** CASE216 「사건 당일 이른 저녁」→`20:00`(T13),
  CASE218 「사건 당일 새벽」→`05:40`(T15), **CASE217 「사건 다음날 08:00」→
  「사건 당일 07:05」**. 217은 하루가 어긋나 있었다 — 오프닝이 그리는 장면은
  `T13`(당일 07:05, 발견)인데 진입 시각은 `T14`(다음날 08:00, 진범이 진열대를
  채우는 시각)에서 온 값이었다. 그대로 두면 `F-L03-OBS-01`(진열대 한 자리가
  비어 보인다)도 성립하지 않는다.
- **CASE218 엔딩의 인칭 드리프트를 고쳤다.** 하경목은 여동생인데 한 장면 안에서
  「그녀는」과 「그는」이 섞여 있었다. 산문의 인칭을 잡는 검사기는 없다.
- `docs/archetype-gaps.md`에 이 회차 절을 더했다(`other` 여섯 줄 + 근거 낱말 아홉 줄).
- `docs/novels/README.md`: 「다음 차례: CASE219~223」, 회차가 넘기는 일곱,
  그리고 **「장 제목은 「N. 장소, 시각」으로 쓴다」 절**을 새로 더했다(아래).

**해야 할 것**

- [ ] **`voice_profile.verbal_tic`을 보는 축이 아직 없다.** 이 회차에서 말버릇
  겹침이 **여섯 자리** 나왔다(「제가 아는 선에서는요」 213↔214 · 「기록상으로는요」
  213↔216 · 「그게, 그러니까...」 213↔214↔217 · 「진짜 놀랐잖아요」 215↔217 ·
  「원칙대로라면요」 215↔217 · 「장부상으로는요」 216↔217). `wizardly-hamilton-r5ffe9`가
  CASE016↔020으로 같은 것을 적어 두었고, **`PAIR_TWIN`도 `NEIGHBOR_TWIN`도
  `audit:duplication`도 이 필드를 안 본다.** 3줄 `pressure_responses` 완전 일치보다
  `verbal_tic` 문자열 일치가 더 싸고 더 자주 걸린다.
- [ ] **`other`로 적으면 그 축이 「모른다」가 된다.** CASE217의
  `method_archetypes`를 `other`로 적자 `NEIGHBOR_TWIN_UNJUDGED`가 *"선언도 없고
  폴백도 못 읽는다"*고 말했다. CLAUDE.md는 표에 없는 키 대신 `other`를 적으라고
  하면서 **안 세어지는 것이 값이 없는 것보다 나쁘다**고도 적는데, 이 자리에서
  둘이 부딪힌다 — 217↔218 쌍의 판정이 그 한 칸 때문에 멈췄다. **`other`를
  「모른다」가 아니라 「어느 칸도 아니다」로 받는 쪽이 맞아 보인다.**
- [ ] **`npx tsc` 로 `check:case`를 돌리는 경로가 `node_modules` 없이는 깨진다.**
  컨테이너에 `node_modules`가 없는 상태에서 `npm run check:case`를 돌리면
  `npx`가 TypeScript **6.0.2**를 받아 와 `error TS5112: tsconfig.json is present
  but will not be loaded if files are specified on commandline`으로 죽는다
  (`package.json`은 5.9.3 고정). `npm install` 뒤에는 정상이다. `scripts/check-case.mjs`가
  `npx tsc` 대신 `node_modules/.bin/tsc`를 부르거나 `--ignoreConfig`를 붙이면 막힌다.
