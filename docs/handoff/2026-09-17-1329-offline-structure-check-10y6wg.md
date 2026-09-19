### 2026-09-17 13:29 UTC · claude/offline-structure-check-10y6wg → claude/next-steps-0w9my4

**한 것**

- **`requestHint()`(app/game.ts)가 돌려주는 객체에서 `banter` 필드를 뺐다.**
  이제 `{ text, used }` 뿐이다. 16:10 블록이 「항상 null」이라고 적어 둔 그
  필드이고, 읽는 곳이 오프라인 화면 한 군데뿐이라 같이 정리했다 — 그 화면의
  화자별 렌더링 분기와 `.hint-banter*` CSS도 지웠다. **`hint.banter` 를 읽는
  코드가 그쪽 브랜치에 있으면 타입 에러로 죽는다**(조용히는 안 깨진다).
- **`app/gm/offline-engine.ts`의 `offlineHintBanter()` / `HINT_BANTER` /
  `OfflineHintKind` 를 지웠다**(180줄). 위 결정으로 호출부가 사라진 뒤 죽은
  채로 남아 있던 것이다. 지운 자리 앞뒤(`JIWOO_LEAVE`, 전환점 주고받기)는
  그대로라 그쪽이 그 부근을 고쳤으면 충돌은 단순하다.
- **`npm run check:offline` 이 생겼다.** 원래 있던
  `scripts/offline-playthrough-check.mjs`(312건 전수 완주 검사)를 package.json에
  등록한 것뿐이고, 스크립트 내용은 그대로다. `app/gm/offline-*.ts` 를 건드렸으면
  이걸 돌린다.

**해야 할 것**

- 없음.
