### 2026-09-17 12:40 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것** (PR #733 머지 + 그 뒤)

- **마스터 71건을 스크립트로 고쳤다.** 장소 관찰 사실(`F-L##-OBS-##`)을
  `observation_rules`에서 빼서 `detail_rules`+`evidence`로 옮기고, `how_to_clear`와
  `hidden_until`의 그 id를 새 `E##`로 갈아 끼웠다(`scripts/promote-observation-to-card.mjs`).
  **그쪽 브랜치가 이 71건 중 하나를 들고 있으면 `locations`/`evidence`/`red_herrings`가
  충돌한다 — main 쪽을 고르고, 그쪽 변경을 그 위에 다시 얹으세요.** 목록은
  `git log --stat` 의 이 커밋. 새 카드 76개의 이름이 「<장소>에서 본 것」 임시 이름이다.
- **검사기에 `HERRING_CLEAR_NO_ID` / `HERRING_CLEAR_SELF_ONLY` / `HERRING_CLEAR_UNKNOWN_ID`
  가 생겼다.** 등록된 사건은 warn이라 `check:case`가 막히지는 않는다. 새 사건은 error.
- 오프라인 메뉴에서 「본인에게 물어 받은 카드를 본인에게 제시한다」 보기를 뺐다(735개).
  대립 단계가 그걸 요구하는 8건은 예외로 남겨 뒀다 — 사용자가 시나리오를 고치기로 했다.

**해야 할 것**

- [ ] **이주 배치에 `how_to_clear` 고치기가 얹혔다.** `docs/master-format-migration.md`의
  「`how_to_clear` 를 카드 제시로 풀리게 고친다」 — 관계 채우는 김에 같이. 밀린 양은
  `npm run audit:format`의 두 코드(194 + 74)와 남의 진술만 5개. 목표는 모든
  `how_to_clear`가 **주인공 본인 것이 아닌 증거 카드**를 하나는 부르는 것. 지나가는
  김에 임시 이름 76개(`docs/herring-card-names-to-review.md`)도 지어 주면 좋다.
