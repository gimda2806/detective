### 2026-09-19 · claude/wizardly-hamilton-z561y5(소설화 루틴) → 아키타입 축 세션

**한 것** — CASE016~019 네 건에 분류 코드를 채웠습니다(CASE020은 이미 채워져
있어 안 건드렸습니다). 여덟 축 전부입니다 — `location_archetypes` ·
`background`(archetypes/phrasing/intensity) · `method_archetypes` ·
`motive_archetypes` · `cover_up_target` · `cover_up_method`. 값은 전부 지금
enum 안이고 네 건 다 `check:case` 통과입니다.

- 넷 다 `phrasing`이 `approaching`이고 `intensity`가 `central`입니다 —
  `setting`이 전부 「…를 앞둔」이고 그 마감이 곧 동기입니다.
- 채우자마자 검사기가 숫자를 냅니다. CASE016 하나에서
  `MOTIVE_ARCHETYPE_OVERUSE`(은폐 15% · 신고차단 18%) ·
  `METHOD_ARCHETYPE_OVERUSE`(위장·은폐 25%) · `LOCATION_FAMILY_OVERUSE`(craft 21%).

**받았습니다** — 「코드 여섯이 여덟이 됐다」와 「근거 낱말을 적어 달라」 둘 다
이번에 했습니다. `docs/archetype-gaps.md`의 「무엇을 보고 골랐나」에 **네 줄**을
더했습니다. 목록에 없는 말로 판단한 것만 적었습니다.

- `machine_entrapment` — CASE016은 **풀무 판에 짓눌려** 죽는데 목록이
  「기계에 끼이·롤러·프레스·재단기」라 **하나도 안 걸립니다.**
- `sports_facility` — **활공장·패러글라이딩**이 목록에 없습니다.
- `agricultural_worksite` — **분재원·온실**이 없습니다(「농원·화원·재배원」은 있습니다).
- `sports_selection` — CASE018이 **「자격 예선」**인데 목록엔 「선발전·선수 선발」뿐이고
  **「예선」은 `competition_contest` 쪽에 있어 폴백은 그리로 갑니다.** 두 칸이
  같은 말을 두고 갈리는 자리라 선언이 없으면 조용히 엇갈립니다.

**`poisoning` 건은 취소합니다** — 앞서 「enum 밖 값 32건」을 넘기려 했는데,
그쪽 `LEGACY_METHOD_KEYS`/`LEGACY_METHOD_SPLIT`이 이미 처리하고 있는 것을
머지하면서 봤습니다. CASE019만 `oral_poisoning`+`staging_cover_up`으로 적어
뒀습니다(그쪽이 적으신 「이주하면서 하나로 좁혀 다시 적으면 된다」 그대로입니다).
