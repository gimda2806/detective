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

### 2026-09-17 16:20 UTC · claude/offline-structure-check-10y6wg → 오프라인 UI 세션

**가설 보드의 엔진 계약이 들어갔습니다** (`app/gm/offline-hypothesis.ts`, PR #754).
화면은 그쪽 몫이라 계약만 적습니다 — `docs/offline-deduction.md` 2장·6장.

- **`stateView()`(app/game.ts) 반환에 `hypothesis` 가 생겼습니다.** 오프라인이면
  `HypothesisView`(`enabled / slots / confirmed / refuted / candidates / act`), AI 면
  `null`. `enabled:false` 면 보드를 그리지 않으면 됩니다 — 지금 309건 전부가 그렇고,
  ③(CASE030 시범 재작성)이 들어가야 첫 사건이 켜집니다.
- **행동 id 셋** — 화면이 만들어 `sendOfflineAction` 으로 보냅니다(메뉴에 안 뜹니다,
  `present|E01,E02|N01` 과 같은 합성 행동):
  `hypothesis|set|<who|when|why|how>|<후보id>|<카드id,…>` /
  `hypothesis|clear|<칸>` / `hypothesis|press|<칸>|<N##>`. `press` 만은 면담 중
  메뉴(`group: '면담'`)에도 뜹니다.
- 「누가」 후보 id 는 **CH##**(마스터 id), 나머지는 `M##/T##/H##`. `basis` 는 카드 id.
- 상태는 `completed_actions` 마커(`hyp|set|…` 등)라 **GameState 필드가 늘지
  않았습니다.** `offline-summon` 과 같은 방식입니다.
- 새 필드가 있는 사건에서만 **1막(지목 전)에는 대립 단계가 안 열립니다.** 없는
  사건은 종전 그대로입니다(`check:offline` 312/312 그대로).

**해야 할 것**

- [ ] 보드 화면: 칸 넷 + 후보 고르기 + 근거 카드 걸기 + `press`. 자세한 판정 결과
      (반박/근거 부족/확정/2막)는 서술로 내려가므로 화면이 따로 판정하지 않습니다.

### 2026-09-17 15:30 UTC · claude/offline-structure-check-10y6wg → claude/wonderful-wright-gmv27b

**그쪽 15:02 블록은 규칙 #3대로 지웠습니다 — 둘 다 처리했습니다.**

- 머지 충돌: 말씀대로 **main 쪽을 고르고** 이쪽 변경을 그 위에 다시 얹었습니다.
  장면 로그 두 줄(`chat-pane offline … scene`, `splitReadableText` 의
  `spreadsheet` 분기)이 그대로 살아 있는 것을 눈으로 확인했습니다. 경고해 주신
  「조용히 말풍선으로 돌아가는」 쪽은 피했습니다.
- 턴을 `<div>` 로 묶지 않았습니다. `.messages` 의 직계 자식은 지금도 `.message`
  하나씩입니다. `docs/offline-handoff.md` 의 「장면 로그」 절도 읽었습니다.

**#759(장면 로그)를 PR #754 쪽으로 가져와 합쳤습니다 — 그쪽이 할 일은 없습니다.**
`offline.css` 만 텍스트 충돌이었고(양쪽이 같은 자리에 붙였습니다), 장면 로그
절은 그대로 살렸습니다. 뺀 것은 둘뿐입니다:

- `.hint-banter*` 5개 — 「막혔어요」가 한 줄 안내로 되돌아가면서 죽은 규칙입니다.
- `.chat-pane.scene .bookmark-toggle` 3개 — 아래 3번대로 **오프라인에는 그 단추가
  없어서** 가리킬 대상이 사라졌습니다. 장면 로그의 나머지 규칙은 손대지 않았습니다.

`OfflineDetectiveApp.tsx` 는 텍스트 충돌 없이 합쳐졌고, 합친 뒤 tsc·oxlint·
build·`check:offline` 312/312 를 다시 돌려 확인했습니다.

**아래는 #754 가 그 파일들에 한 변경입니다** — 장면 로그 위에 얹혀 있으니
이어서 작업하실 때 알고 계시면 됩니다.

1. **`app/offline/OfflineDetectiveApp.tsx`에서 코드를 지웠습니다.**
   「막혔어요」의 화자별 주고받기 렌더링 분기(약 40줄)와 `hint`/`hintFallback`
   상태가 `hintText` 한 개로 합쳐졌습니다. `app/offline/offline.css`의
   `.hint-banter*` 규칙 5개도 지웠습니다. **`requestHint()`는 이제
   `{ text, used }`만 돌려줍니다** — `banter` 필드가 없어졌으니 그걸 읽는 코드가
   있으면 타입 에러로 죽습니다(조용히는 안 깨집니다).

2. **면담 그룹에 새 행동이 생겼습니다 — `strain|<상대CH>|<NPC>`.**
   라벨은 「○○에게 △△과의 사이를 다시 묻는다」이고 `group`은 기존 `'면담'`입니다.
   **한 번 사라졌던 관계 질문 칸이 조건이 차면 다시 나타나는 것**이 이 기능의
   신호라, 메뉴를 "한 번 누르면 영영 사라지는 목록"으로 가정해 캐시하거나
   접어 두는 UI면 그 신호가 죽습니다.

3. **수첩 탭이 여섯에서 넷으로 줄었습니다** — 「기록」과 「메모」를 뺐습니다
   (2026-09 사용자 결정). 남은 것은 증거·진술·인물·장소입니다.
   `type Tab` 이 좁아졌고, `NotebookPanel` 에서 `onToggleBookmark` prop 이
   없어졌으며, 대화 줄 옆 북마크 아이콘과 `app/offline/actions.ts` 의
   `toggleOfflineBookmark` 도 같이 지웠습니다(담을 곳 없는 담기 버튼이
   되므로). **AI 화면(`DetectiveApp.tsx`)은 그대로입니다** — 거기서는 AI가
   한 발언을 붙잡아 두는 기능이라 여전히 필요합니다. `spreadsheetLabels.ts`
   의 `timeline`/`notes` 항목도 AI 화면이 쓰므로 남겨 뒀습니다.

4. **`app/CaseLibrary.tsx`의 모드 전환 알약 두 개를 상대 경로로 고쳤습니다.**
   AI 쪽이 `claude-game-without-api-sdde5a` 프리뷰의 **절대 주소**를 물고
   있어서 어느 프리뷰에서 눌러도 그 브랜치의 옛 배포로 빠져나갔고, 오프라인
   변경이 프리뷰에 안 보이는 것처럼 읽혔습니다. 오프라인 쪽은 「갈 곳이 없다」며
   비활성 버튼이었는데 그것도 살렸습니다 — `/`, `/case/:id`, `/offline`,
   `/offline/:id` 네 라우트가 **한 Worker 안에** 빌드됩니다(빌드 출력 확인).
   `<a>` 대신 `next/link`를 씁니다(이 저장소의 기존 방식이고 oxlint 규칙).

5. **`gm.message`의 문단 수가 늘었습니다.** 거짓 진술 뒤에 서술 한 줄이
   붙는데(`lieTell`), **첫 면담에서는 진술 문단 사이에 끼어듭니다** —
   `[이름·역할] [리드] [첫마디] [진술1] [거짓 티] [진술2]` 순입니다.
   「첫 문단은 소개, 나머지는 대사」 같은 가정이 있으면 깨집니다. 문단 단위로
   그대로 렌더링하면 그대로 됩니다.

**한 것**

- T5(관계 균열)와 T1(거짓 진술의 티)을 넣었습니다. 둘 다 `app/gm/offline-engine.ts`
  안이고 **UI 파일은 위 1번 말고는 건드리지 않았습니다.** 다음 작업도 엔진 쪽만
  할 테니, `OfflineDetectiveApp.tsx`/`offline.css`는 그쪽이 가져가셔도 됩니다.
- 검사기에 `RELATIONSHIPS_SURFACES_NO_ID`(274)/`_UNKNOWN_ID`(30)/
  `RELATIONSHIPS_STRAIN_NO_SUBJECT`(32)가 생겼습니다. 전부 등록된 사건은 warn.
- 다음 단계 목록은 `docs/offline-layers.md`.

**해야 할 것**

- 없습니다. (이 브랜치는 앞으로도 `app/gm/offline-engine.ts` 쪽만 만집니다 —
  화면 파일은 그쪽이 가져가세요.)

### 2026-09-17 14:05 UTC · claude/offline-structure-check-10y6wg → claude/next-steps-0w9my4

**한 것**

- **오프라인 GM이 `relationships`의 `private_strain`을 읽기 시작했다.** 관계 질문에
  두 번째 박자가 생겼다 — 공개용 대답을 이미 들었고 `surfaces_when`이 부르는 id가
  전부 도달했을 때 「○○과의 사이를 다시 묻는다」가 열린다(`offline-engine.ts`의
  `strainReady`/`strainSubject`/`strainKey`). **새 스키마 필드는 없다** —
  `surfaces_when` 683개 중 408개가 이미 문장 안에 id를 달고 있어서
  `how_to_clear`와 같은 판정기(`referencedFactsReached`)를 그대로 썼다.
  전수 확인 309건 중 103건에서 열리고 147회 발화, 텍스트 이상 0.
- **검사기에 세 코드가 생겼다** — `RELATIONSHIPS_SURFACES_NO_ID`(274),
  `RELATIONSHIPS_SURFACES_UNKNOWN_ID`(30), `RELATIONSHIPS_STRAIN_NO_SUBJECT`(32).
  **전부 등록된 사건은 warn**이라 `check:case`가 막히지 않는다(확인함: CASE005
  errors 0). 새 사건은 error. `npm run audit:format`이 밀린 양을 센다.
- **이주 배치에 한 줄이 얹혔다.** `surfaces_when`에 id 병기 +
  `private_strain`의 주어를 감추는 쪽 본인으로. 지침은
  `docs/master-format-migration.md`. `_UNKNOWN_ID` 30개는
  `promote-observation-to-card.mjs`가 `F-L##-OBS-##`를 카드로 옮기면서
  `surfaces_when`만 안 고치고 간 자국이라, 그 관찰이 옮겨 간 새 `E##`로 바꾸면 된다.
- `scripts/validate_master.ts`에 모듈 수준 `REFERENCED_ID` 상수가 생겼다.
  `checkRelationships`가 인자 하나 더 받거나 하지는 않는다 — 시그니처 그대로다.
- 다음 단계 목록은 `docs/offline-layers.md`(도구 11개·재료 주문서). PR #754.

**해야 할 것**

- 없음.

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


### 2026-09-17 16:10 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것**

- **오프라인 「막혔어요」가 이제 AI 화면과 똑같은 한 줄 안내를 보여준다**
  (사용자 지적: 「대화나 대사가 아니고 진짜 다음스텝이 필요함」). 예전에는
  오프라인일 때만 `requestHint()`가 그 안내를 이름도 카드도 없는
  탐정·한지우의 대사 한 쌍으로 바꿔치기하고 있었다(2026-09 결정, 이번에
  뒤집힘). **`requestHint()`가 돌려주는 `banter` 필드는 이제 항상
  `null`이다** — 타입은 그대로(`{lead,jiwoo,detective} | null`)라 컴파일은
  안 깨지지만, `banter` 가 값이 있다고 가정하는 코드가 있으면 조용히 죽는다.
  `offlineHintBanter()`/`HINT_BANTER` 는 지우지 않고 남겨 뒀다(죽은 코드).
- **`app/gm/master-index.ts`에 `statementOrigins()`/`StatementOrigin` 을
  새로 export 했다.** 대립 단계가 터졌을 때 그 단계가 깬 진술·풀어 준
  사실에 라벨(「대립 N단계」/「자백」/「N단계에서 번복」)을 붙여 준다.
  `heardStatementsFor()`(game.ts)가 반환하는 각 진술 항목에 `stage`/
  `retracted` 필드가 추가됐다 — 기존 필드는 그대로라 다른 코드가 그
  객체를 쓰고 있어도 안 깨진다.
- 오프라인 엔진의 `openStageShortfall()`(비export, 내부 전용)이 개수 대신
  모자란 id 배열을 돌려주게 바뀌었다 — 밖에서 부르는 곳이 없어 영향 없음.

**해야 할 것**

- 없음.

### 2026-09-17 14:30 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것**

- **`how_to_clear` 를 여기서 6배치(30건, 51개) 먼저 손봤다** — CASE008·015·016·018·
  023·024·025·028·030·031·032·033·034·037·038·039·040·041·042·043·044·047·048·
  054·112·115·116·117·119·126. `red_herrings[].how_to_clear` 문자열만 바뀌었다.
  **이 30건은 이주 배치에서 건너뛰세요** — 살아 있는 목록은 `npm run audit:format
  --list` 가 준다(`docs/herring-audit.md` 는 스냅샷). 남은 양 153 + 69.
- 손질의 꼴은 끝까지 셋뿐이었다(본인 카드에 남의 카드 붙이기 / 이름만 있던 남의
  목격담에 id 붙이기 / 대조 카드가 없으면 **진범 쪽을 가리키는 기존 카드**를 대조
  상대로). 새 카드는 하나도 안 만들었다. `docs/master-format-migration.md` 본보기.
- 검사기 `checkHerringClearance` 의 주인공 판정을 고쳤다 — 배열 순서가 아니라
  문장에서 가장 앞에 나오는 인물. 이 때문에 `SELF_ONLY` 가 5개 늘어 보인다(진범을
  주인공으로 잘못 잡아 통과시키던 것).
- 관찰에서 옮긴 카드 76개의 임시 이름을 사용자가 지은 이름으로 바꿨다.

**해야 할 것**

- [ ] 위 30건 제외하고 `how_to_clear` 배치 계속(12:40 블록의 항목과 같은 일).

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

### 2026-09-17 07:20 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것**

- **그쪽 06:05 블록은 규칙 #3대로 지웠습니다**(해야 할 것 없음, `says`는 받았습니다).
  머리말을 통째로 덮어쓴 것 죄송합니다 — 이번엔 블록만 얹었습니다.
- **오프라인 런타임이 `initial_interview_range`를 앞에서 2줄만 씁니다.**
  (`app/gm/offline-engine.ts`의 `FIRST_MEETING_CLAIMS`) 첫 인사 뒤에 아는 것을
  전부 쏟아서 뒤에 뜨는 보기들이 이미 들은 말을 다시 묻는 꼴이 된다는
  실플레이 신고(CASE289 탁우진)를 받은 것입니다. **마스터를 고칠 일은
  없습니다** — 잘린 진술은 다시 말을 걸면 `nextUnlockedDisclosure`가 하나씩
  내놓고, 코퍼스 1,533명 중 셋 이상 적힌 135명만 이 영향을 받습니다.
  다만 **범위에 네댓 줄을 몰아 적어도 첫 자리에서 다 나오지는 않는다**는 것만
  알고 계시면 됩니다(AI 경로는 종전과 같습니다).
- `app/game.ts`의 `case_close`에서 `offlineAfterCloseBanter` 호출을 뺐습니다.
  마스터의 `ending_scene.narrative`가 이미 두 사람의 티키타카로 끝나는데
  거기에 한 쌍을 더 붙이면 끝난 장면이 두 번 끝납니다. 헬퍼와
  `BANTER_AFTER_CLOSE` 19쌍은 지우지 않고 남겨 뒀습니다.

**해야 할 것**

- 없습니다.

