### 2026-09-20 · claude/serene-fermat-wam6li → 모든 세션

**한 것**
- `CLAUDE.md`의 「자동 케이스 생성 루틴」 절 **본문을 `scripts/case_generation_prompt.md`로 옮겼다.**
  그 절 하나가 CLAUDE.md의 **57%**(25,758자 / 45,040자)였고, 대부분이 새 사건을 쓸 때만 필요한
  필드별 규칙이라 모든 세션이 매 세션 처음부터 읽고 있었다. CLAUDE.md는 45,040자 → **23,609자**(−47.6%).
- 옮긴 것은 루틴 다섯 단계와 그 밑의 필드별 규칙 48줄 **전부이고, 한 줄도 줄이거나 고치지 않았다**
  (비어 있지 않은 48줄이 전부 목적지에 그대로 있는지 대조해 확인했다).
- CLAUDE.md에 남긴 것은 **생성 말고도 걸리는 결론 열 개**다 — `next:case-id`의 빈 번호 규칙,
  `CH##`를 다시 매기지 말 것, `check:case`가 세 검사를 함께 돈다는 것(가운데가 걸리면 변환기를 고친다),
  warn/error 비대칭과 그 예외(`UNKNOWN_ARCHETYPE_KEY`), 코퍼스 313 → 252 삭제, 직제 금지,
  `build:source`의 여덟은 런타임이 안 읽는다, 막힌 사건은 이슈 하나, `audit:duplication`,
  `other` + `archetype-gaps.md`.
- `scripts/case_generation_prompt.md`의 머리말 포인터를 **뒤집었다.** 그 문서가 이제 생성 스펙의
  정본이고, 셋이 어긋나면 **스키마 → 이 문서 → CLAUDE.md** 순으로 믿는다.
  `CLAUDE.md:48`의 「프롬프트 레퍼런스」도 「생성 스펙(새 사건을 쓰기 전에 읽는다)」으로 고쳤다.

**해야 할 것**
- **새 사건을 하나라도 쓰는 세션(생성 루틴 포함)은 `scripts/case_generation_prompt.md`를 먼저 읽는다.**
  CLAUDE.md만 읽고 새 사건을 쓰면 아키타입 칸 목록·임계값·필드별 규칙을 못 본 채 쓰게 된다.
  스텁 첫 문단이 그렇게 지시하고 있지만, 그 지시를 지키는 것은 읽는 쪽이다.
- 그 문서 뒤쪽(「금지: 코드 레벨 몰드」부터)은 원래 있던 Claude API 레퍼런스이고, 그 안의 시스템
  프롬프트 예시가 **아직 `SETTING_BACKDROP_OVERUSE` 은퇴 전 문면을 일부 인용한다.** 머리말에
  「어긋나면 「루틴 스펙」이 최신」이라고 적어 두기만 했고 예시 본문은 손대지 않았다 —
  낡은 문장 감사(`2026-09-20-sharp-clarke-mwsy10.md`)가 맡을 자리와 같은 축이다.
- `docs/opening-rewrite.md:26`·`docs/scene-quality.md:82`가 가리키는 「`case_generation_prompt.md` 9번」은
  코드 펜스 안의 번호라 이번 삽입으로 어긋나지 않았다. 확인함.
