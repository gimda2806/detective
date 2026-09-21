### 2026-09-20 · claude/serene-fermat-wam6li → 모든 세션

**한 것 — `scripts/case_generation_prompt.md`**
- 죽은 것만 지웠다: **Claude API 호출 스니펫**과 **구조화 출력 지원/미지원 표**.
  `output_config`·`generateCase` 참조가 저장소에 0건이고, 그 파이프라인은 2026-09에
  들어냈다(CLAUDE.md의 「앱 내 Master 생성/업로드 파이프라인 삭제」). 살아 있던 두 줄은
  「스키마와 검사기의 분담」 절로 옮겼다 — 스키마는 형태만 강제한다는 것과
  `deriveEngineViews()`가 얇은 뷰를 만든다는 것(후자는 `validate_master.ts:4139`에 실재).
- **「시스템 프롬프트」를 「기본 작성 규칙」으로 개명했다.** 아무 데도 안 보내지는데 이름이
  「프롬프트」라 **payload 예시로 오독된다** — 실제로 내가 그렇게 읽고 「13,000자 중복이니
  지우자」고 제안했다가 실측에서 뒤집혔다. 머리말도 「두 층」으로 다시 썼다.

**⚠️ 다음 사람에게: 두 블록은 중복이 아니다**
「루틴 스펙」과 「기본 작성 규칙」이 같은 필드 이름을 많이 공유해서 중복으로 보이는데,
**항목별로 재 보면 「기본 작성 규칙」에만 있는 규칙이 23개**다 — 타임라인 육하원칙과
일반론 문장 반려, `world_fact` 대명사 금지, `relationships.says`, `between`에 `V##`,
`hidden_until` OR 금지, 단계 ≥ 3과 `requires_heard_claim_ids` 이어받기,
`source_type: location`일 때 `discovery_condition`이 `detail_rules[].action`과 완전 일치,
오프닝 명부 금지·줄바꿈·timeline에 없는 것 창작 금지, `ending_scene` 세 출처(a/b/c),
최종 점검 5줄, 하지 말아야 할 것 3줄 등.
**필드 이름 등장 여부로 중복을 판정하지 말 것** — 이름은 양쪽에 다 나오고 규칙은 다르다.
내가 그 측정으로 한 번 틀렸다.

**해야 할 것**
- 없음. 인바운드 포인터(`docs/opening-rewrite.md:26`·`docs/scene-quality.md:82`의
  「`case_generation_prompt.md` 9번」)는 코드 펜스 안 번호라 그대로 유효한 것을 확인했다.
- 쪽지 `2026-09-20-1200-game-without-api-sdde5a.md`의 머리말 작업(코퍼스 235건, 임계는
  믿어도 된다는 한 줄)은 **그대로 보존했다.** 그쪽이 쓴 「뒤쪽 API 레퍼런스」라는 이름만
  개명에 맞춰 「기본 작성 규칙」으로 바꿨다. 그 쪽지의 「해야 할 것」은 원래 비어 있다.
