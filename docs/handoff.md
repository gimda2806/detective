# 세션 간 메모장

두 세션이 같은 저장소를 고친다. 이 파일은 그 둘이 서로에게 남기는 쪽지다 — **내가 한 것 중 네 작업에 영향이 있는 것**, 그리고 **네가 해야 할 것**.

## 규칙 넷

1. **세션을 시작하면 먼저 읽는다.** `git pull` 직후에.
2. **턴을 끝낼 때 적는다.** 상대 작업에 영향이 가는 변경을 했으면 `## 남긴 쪽지` 맨 위에 블록 하나를 추가한다. 영향이 없으면 적지 않는다 — 일지가 아니다.
3. **처리했으면 그 블록을 지운다.** 체크만 하고 남겨 두면 파일이 로그가 되고, 로그가 되면 아무도 안 읽는다. 지우는 것이 "받았다"는 신호다.
4. **자기 블록만 건드린다.** 남의 블록은 지우지도 고치지도 않는다 — 다 처리해서 지우는 경우만 예외이고, 그때는 자기 블록에 "#3 처리함"이라고 한 줄 남긴다.

블록은 이 형태로 쓴다. 새 블록이 **위로** 간다.

```markdown
### <YYYY-MM-DD HH:MM UTC> · <브랜치> → <상대 브랜치>

**한 것**
- 한 줄로. 영향 범위를 함께. (`getCase()`가 동기 → 비동기가 됐다, PR #675)

**해야 할 것**
- [ ] 상대가 무엇을 해야 하는지. 파일·심볼까지.
```

## 무엇을 적나 — 적을 것과 적지 말 것

**적는다** — 상대가 모르면 조용히 깨지는 것:

- 내보낸 심볼의 시그니처·위치 변경 (동기 → 비동기가 가장 위험하다)
- 파일·사건의 삭제나 개명. 특히 **상대 코드가 문자열로 물고 있을 만한 것**
- 빌드·실행 절차 변경 (새 필수 단계, 새 환경 변수, 새 생성물)
- 공유 설정 변경 (`vite.config.ts`, `package.json`, 워크플로)

**적지 않는다** — 기계가 이미 말해 주는 것:

- 타입 오류, 빌드 실패, 린트, 마스터 검증 → PR 검사(`.github/workflows/pr-checks.yml`)가 상대 PR을 빨갛게 만든다
- 열린 PR끼리의 충돌, 지워진 것의 잔존 참조 → 충돌 감시 루틴(`docs/conflict-watch-routine.md`)이 이슈로 올린다
- 그냥 한 일. **영향이 없으면 쪽지가 아니다.**

## 충돌이 잦으면

블록을 맨 위에 쌓는 구조라 둘이 동시에 적으면 git 충돌이 난다. 양쪽 다 살리면 되는 단순한 충돌이지만, 잦아지면 파일을 세션별로 갈라서 각자 자기 파일에만 쓰고 읽기만 양쪽을 하면 된다.

---

## 남긴 쪽지

### 2026-09-16 04:05 UTC · claude/next-steps-0w9my4 → claude/game-without-api-sdde5a

**한 것**

- 없음. 이 쪽지는 요청 두 개다.

**해야 할 것**

- [ ] **GM 전환 UI를 알약 버튼으로 되돌려 주세요.** 오프라인 배포(`claude-game-without-api-sdde5a-...`)의 목록 상단이 「AI GM / 자유 입력」 · 「오프라인 GM / 선택지 · API 없음」 두 칸짜리 큰 스위처로 바뀌어 있는데, **사용자가 그전의 알약 버튼 쪽을 더 좋아한다고 했습니다**(2026-09-16). 메인에는 목록 헤더 오른쪽 알약 줄 끝에 `.offline-switch`(「API 없이 플레이」)가 있습니다 — `app/CaseLibrary.tsx`의 `OFFLINE_APP_URL`과 `app/globals.css`의 `.offline-switch`. 옆의 「311건」·「사건해결 N건」은 상태를 말하는 알약이라 채워져 있고, 이건 눌러서 가는 것이라 테두리만 두는 식으로 갈라 뒀습니다. 두 칸 스위처는 그 자리를 세 줄 가까이 차지합니다.
- [ ] **오프라인 브랜치가 main을 한 번 들여와야 합니다.** 배포된 화면에 「수사 가능」 배지와 「수사 가능만」 필터가 없습니다 — PR #677이 그 브랜치에 없어서입니다. 사용자가 "목록에 수사 가능 뱃지가 안 달려있어"라고 한 것이 이 배포를 보고 한 말이었습니다. 같은 이유로 #673·#676(하이드레이션 #418 수정)과 #675(에셋 파이프라인)도 빠져 있을 수 있습니다. 사건 수도 다릅니다(그쪽 313건 / main 311건).


### 2026-09-16 03:10 UTC · claude/next-steps-0w9my4 → claude/game-without-api-sdde5a

**한 것**

- 진술 보드가 같은 말을 두 줄로 내놓던 건(CASE305 제보) 처리했다. 마스터가 한 인물의 `knows`와 `initial_claims`에 어미만 바꾼 같은 문장을 담은 경우다 — 코퍼스 308건에서 **17줄(14건)**, 보드 전체 5,907줄의 0.3%다. 전반적인 문제는 아니었다.
- `heardStatementsFor`가 같은 인물의 줄 중 **다른 줄에 이미 다 들어 있는 것**만 접는다. 대칭 유사도가 아니라 포함율(0.9)이라, 사실 쪽이 시각이나 발견 사실을 더 갖고 있는 쌍은 둘 다 남는다 — 접히는 17줄 전부 남는 줄이 그 내용을 갖고 있다. `state.heard_statements`는 그대로다.
- `app/gm/response-signals.ts`에 `authoredStatementContainment()`를 추가했다. `hasContentOverlap`은 이 판정에 못 쓴다(유출 탐지용 30% 겹침이라 주제만 같아도 같다고 한다).
- `scripts/validate_master.ts`가 `../app/gm/response-signals`를 import하게 됐다. 이 파일은 원래 외부 의존이 없었다 — 같은 규칙을 두 벌로 두면 검사기와 화면이 다른 말을 하게 되므로 같은 함수를 쓴다.

**해야 할 것**

- 없음. 오프라인 경로가 `heardStatementsFor`를 그대로 쓰면 자동으로 적용된다.

### 2026-09-16 02:20 UTC · claude/next-steps-0w9my4 → claude/game-without-api-sdde5a

**한 것**

- 사건 데이터를 Worker 번들 밖으로 뺐다 (PR #675). `builtInCases`·`builtInCaseSummaries`가 사라지고 `builtInCase(id): Promise<CaseData | null>`·`builtInCaseIndex: CaseIndexRow[]`로 바뀌었다. **`getCase()` 안이 동기 맵 조회에서 비동기 에셋 페치가 됐다.**
- `CaseData`·`validateUploadedCase`·`caseTagsFromData`·`isObject`·`getStringField`·`getStringArrayField`·`firstNonEmpty`·`nonSpoilerTags`가 `app/game.ts` → `app/gm/case-envelope.ts`, `masterFormatWarnings`가 → `app/gm/master-index.ts`로 옮겨졌다 (로직 변경 없음).
- `npm run dev`/`build` 앞에 `node scripts/build-case-assets.mjs`가 붙었다. 그 산출물(`public/cases/`, `app/generated/case-index.json`, 둘 다 gitignore)이 없으면 **사건이 0건으로 뜬다.**
- 레거시 `data/cases/CASE014/case.json`을 지우고 `data/pending-cases/CASE014/`로 새로 썼다 (PR #673). 제목·배경이 완전히 다르다 — 「한 집 반」, 동네 기원, 진범 CH04 백주안.
- 하이드레이션 오류(React #418)를 고쳤다 (PR #673, #676). `app/DetectiveApp.tsx`·`app/CaseLibrary.tsx`의 `useState` 초기화 함수가 렌더 중에 `window`를 읽던 것이다.
- PR 검사를 붙였다 (PR #679). 이제 시그니처 드리프트는 서로 알릴 필요 없이 상대 PR이 빨개진다.

**해야 할 것**

- [ ] `app/game.ts`의 `mockGm`이 옛 CASE014 인물 **`백지훈`/`임채원`**을 하드코딩하고 있다. 그 사건은 이제 없다. `tsc`도 git도 여기에 대해 아무 말을 하지 않으므로 사람이 봐야 한다. 새 CASE014에 맞추든 `case_id !== 'CASE014'` 예외 자체를 없애든 판단이 필요하다 — 그 조건을 지우면 뒤가 unreachable이 되므로 같이 정리해야 한다. (자세히: 이슈 #678)
- [ ] `vinext build`를 직접 부르는 경로가 오프라인 쪽에 있으면 앞에 `node scripts/build-case-assets.mjs`를 붙여야 한다.
