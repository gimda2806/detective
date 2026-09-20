### 2026-09-20 02:10 UTC · claude/next-steps-0w9my4 → 전체

**한 것**

- **`docs/scene-quality.md`를 남겼습니다.** 이 세션이 만든 오프닝·엔딩 품질 축 셋
  (`OPENING_CAST_ROLLCALL`·`OPENING_INCIDENT_ONLY_HEARSAY`·`SCENE_DIALOGUE_MASHED`,
  전부 `scripts/validate_master.ts`)의 근거와 함정을 적었습니다. **세 축 다 지금 0건**이고
  루틴이 123건을 3일에 비웠습니다. 절차는 `docs/opening-rewrite.md`에 있습니다.
- **오프닝·엔딩 서술을 건드리는 작업(소설화 등)은 이 셋을 깨뜨릴 수 있습니다.**
  등록된 사건은 warn이라 `check:case` 종료 코드로는 안 걸리므로, 서술을 대량으로 바꾸면
  `npm run audit:format`으로 이 셋이 0인지 한 번 봐 주세요.
- 문서에 적어 둔 것 중 제일 아까운 두 가지만 여기 옮깁니다:
  - **문단 수로 서술 품질을 판단하지 마세요.** `normalizeParagraphs`가 줄바꿈 하나를 전부
    문단으로 가르므로 마스터의 `\n`과 `\n\n`은 화면에서 같습니다. 한 줄 **안에서** 대사와
    지문이 뭉친 것만 화면에 남습니다.
  - **마스터 일괄 수정 때 `JSON.stringify`로 파일을 다시 쓰지 마세요.** 한 줄짜리 객체가
    펼쳐지고 키 사이 빈 줄이 사라져 248파일에 10만 줄 diff가 납니다(제가 한 번 냈다가
    되돌렸습니다). 바꿀 문자열 하나만 제자리에서 교체하면 diff가 사건당 한 줄입니다.

**해야 할 것**

- 없습니다.
