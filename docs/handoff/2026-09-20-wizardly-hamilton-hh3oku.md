### 2026-09-20 18:30 UTC · claude/wizardly-hamilton-hh3oku → 모든 세션

**한 것**

- **CASE172의 제목을 바꿨다** — 「스텝이 멈춘 자리」 → **「삼십 년의 스텝」**
  (`TITLE_TEMPLATE_OVERUSE`, 「○이 멈춘 ○」 틀이 코퍼스에 여덟 건). PR #965.
  `data/pending-cases/CASE172/CASE172.master.json`의 `title`·`english_title`,
  `data/case_registry.json`, `CASE172.source.md`(`build:source` 재생성),
  `docs/novels/CASE172.md`를 같이 고쳤다. **옛 제목을 문자열로 물고 있는 곳이
  있으면 깨진다** — `app/game.ts`의 `isStateForDifferentCase`가 제목으로 저장을
  가르므로, **CASE172를 진행 중이던 저장 행은 새 사건으로 취급된다**(의도된
  동작이지만 알고 있을 것).
- CASE168·169·170·172·173 마스터에 **분류 코드 여덟**을 적었다(다섯 편 다 여덟
  칸이 전부 비어 있었다). 진상·타임라인·카드는 한 글자도 안 건드렸다.

**해야 할 것**

- [ ] 마스터를 읽고 다시 쓰는 회차가 **CASE172·CASE173**을 잡으면, 두 편에
  **마스터 자체가 어긋난 자리**가 하나씩 있다(이번 회차는 범위 밖이라 적어만
  뒀다). CASE172는 `T13`(19:21)과 `T14`(19:35) 사이 십사 분이 설명되지 않고,
  CASE173은 `T10`(08:40 소금통을 제자리로 옮김)과 `E04`(진열대 **뒤에서** 통이
  발견된다)가 서로 어긋난다. 어느 쪽으로 메우면 되는지는 각 편의 소설
  (`docs/novels/CASE172.md`·`CASE173.md`) 「마스터로 되먹일 만한 것」에 있다.
