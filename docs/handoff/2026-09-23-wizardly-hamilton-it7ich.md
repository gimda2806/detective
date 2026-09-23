# 2026-09-23 · `claude/wizardly-hamilton-it7ich` (소설화 262~266 회차)

**한 것 중 남의 작업에 영향이 가는 것**

- **`scripts/validate_master.ts`의 `BACKGROUND_ARCHETYPES` 표를 한 줄 고쳤다** — `product_demo`
  낱말 목록에 **`시식`**을 더했다(「시식회」는 있는데 「시식」이 없어서 CASE262에
  `BACKGROUND_INTENSITY_UNSUPPORTED`가 울고 있었다). **코퍼스에서 `setting`에 「시식」이 있는
  사건은 넷이고 이 편 말고 셋은 전부 선언이 있어 폴백을 안 탄다**(017·041·148) — 그래서
  **새로 세어지는 사건은 0건**이고 사라진 경고는 CASE262의 한 줄이다. 더한 뒤
  `tsc --noEmit`과 다섯 편 `check:case`로 새 error 0건을 확인했다. 이 파일을 같이 고치는
  세션이 있으면 그 한 줄만 충돌한다.
- **사건 제목 둘을 바꿨다.** `CASE262` 「가나슈가 삼킨 이름」 → **「후견인이라는 이름」**,
  `CASE264` 「태엽이 멈춘 자리」 → **「정전보다 먼저」**. 마스터와 **`data/case_registry.json`**
  둘 다 고치고 `build:source`를 다시 돌렸다. **코드가 이 제목을 문자열로 물고 있는 자리는
  없다**(확인함). 저장 상태는 제목으로 갈리므로(`app/game.ts`의 `isStateForDifferentCase`)
  이 둘을 진행 중이던 저장은 새 사건으로 취급된다 — **미머지 사건이라 실플레이 저장은 없다.**
- **`CASE264`의 `case_identity.setting` 끝 문장과 `opening_scene.narrative`를 고쳤다** —
  「건너편 **표구점**에서 비명이 터져 나온다」가 사건 장소를 틀리게 가리키고 있었다(비명은
  태엽소리 뒷문에서 났고 시신도 거기 있다). `data/case_registry.json`의 `setting`에도 같은
  문장이 복사돼 있어 같이 고쳤다.
- **`CASE266`의 `ending_scene.narrative`에서 화자 드리프트를 고쳤다** — 도경우의 대답 뒤
  지문이 그 말을 **탐정이 한 것**으로 만들고 있었다. 엔딩 산문은 런타임이 그대로 내보낸다.

**해야 할 것** — 없다. 위 넷은 전부 이 브랜치에서 끝났고, 다음 소설화 회차가 이어받을 것은
`docs/novels/README.md`의 「다음 차례」 줄(**CASE268 · 269 · 270 · 271 · 272**, 267은 폴더가
없는 번호)과 [`docs/novels/CASE266.md`](../novels/CASE266.md) 맨 뒤 「262~266 회차 대조표」다.
