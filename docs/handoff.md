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

### 2026-09-17 20:40 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **`data/cases/`의 옛 봉투 사건 3건을 지우고 이야기까지 새로 썼다(사용자 결정).**
  CASE002·003·004가 이제 `data/pending-cases/<ID>/<ID>.master.json` 구조화
  마스터다. **`data/cases/` 아래에는 이제 `index.json` 하나만 남아 있고 사건
  폴더가 없다** — 그쪽 코드가 `data/cases/CASE00X/case.json` 을 문자열로 물고
  있으면 깨진다. 빌드는 그 디렉터리가 비어도 정상이다(확인함).
- `data/cases/index.json`은 **지우지 않았다.** CASE005~011의 목록 요약·태그가
  거기서 오고 `caseIndexRow`가 그걸로 파생값을 덮는다. 3건의 항목은 새 이야기에
  맞춰 제목·요약·태그만 갈아 끼웠다.
- 이야기가 전부 바뀌었으므로 **그 번호의 옛 저장은 남아 있어도 붙지 않는다**
  (`isStateForDifferentCase`가 제목으로 가른다).
- `case_registry.json`에 3건을 등록했다(인물명 15명 전부 기존 1,843명과 겹치지
  않는 것으로 골랐다).
- 결과: 빌드가 세던 **「포맷 부합」이 24 → 27건**이 됐고, **구조화 원본이 없어
  새 검사를 못 돌리던 사건이 0건**이 됐다. 19:05 블록에 적어 둔 구멍이 닫혔다.

**해야 할 것**

- 없음.

### 2026-09-17 19:05 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **'수사 가능' 판정 기준을 올렸다(사용자 결정).** 관계·단계 키뿐 아니라
  **손볼 것이 남은 사건은 전부 '수사 전'** 이다 — 레드헤링이 카드로 안 풀리는
  것, 관계 모양(범인 허브·고아 인물·says 없음), 오프닝 명부·전언. 목록의
  **'수사 가능'이 159건 → 24건**이 됐다. 이주가 진행되면 그만큼 올라간다.
- **`CaseData.format_warnings`가 생겼다(선택 필드).** 빌드가 한 번 판정해
  봉투에 싣고, 사건 화면의 경고와 목록 라벨이 그 한 벌을 같이 읽는다.
  `publicCase()`는 이제 `selectedCase.format_warnings ?? masterFormatWarnings(index)`
  다 — **D1 업로드분만 예전처럼 좁은 쪽으로 떨어진다.**
- **`scripts/validate_master.ts`에 `pendingReworkWarnings()`를 export 했다.**
  구조화 마스터를 받아 스포일러 없는 경고 문면을 돌려준다. `masterFormatWarnings`
  는 raw_text만 보므로 관계의 모양·레드헤링 해소를 볼 수 없어서 생긴 함수다.
  **문면에 인물 이름과 증거 id를 넣지 말 것** — 이 문자열은 플레이어 화면에
  그대로 뜬다(검사기 본문 메시지는 「R01(표건율)의 … E07」처럼 답을 흘린다).
- **`npm run audit:format`의 '부합' 수가 같은 정의로 바뀌었다** (159 → 24).
  종류별 개수는 그대로다 — 밀린 양을 보는 자리는 예전과 같다.
- `data/cases/`의 옛 봉투 사건 3건은 구조화 원본이 없어 새 검사 없이
  예전 기준으로 판정된다.

**해야 할 것**

- 없음.

### 2026-09-17 18:10 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **`how_to_clear` 배치 7·8을 여기서 처리했다 — CASE127·130·131·132·133 ·
  CASE135·136·137·138·140 (10건 19개).** **이 10건은 배치에서 건너뛰세요.**
  14:30 블록의 30건과 같은 일이고, 손질의 꼴도 거기 적힌 셋을 벗어나지 않았다 —
  문장이 이미 「A와 B를 대조한다」라고 말하고 있어서 그 A·B에 id를 붙였을 뿐이고,
  **새 카드는 하나도 만들지 않았다.** `red_herrings[].how_to_clear` 문자열만
  바뀌었다(diff 19줄). `HERRING_CLEAR_NO_ID` 153 → 134, `SELF_ONLY` 69는 그대로
  (이번 대상 아님). 10건 모두 `check:case` 세 검사 통과.
- **CASE134는 배치에서 뺐다.** `how_to_clear` 손질 자체는 문제가 없었지만,
  `case_identity.setting`이 기존 `SETTING_DEADLINE_DISCOVERY_TEMPLATE` **에러**에
  걸려 `check:case`가 선(先)실패한다. PR 검사가 바뀐 마스터에 `check:case`를
  돌리므로 포함하면 PR이 빨개진다. 손댄 것은 되돌려 뒀다.
- 원문이 부르던 것 중 카드가 아예 없던 유령 참조 둘(CASE131 R02 「원장실 PC 작업
  로그」, CASE133 R02 「냉장 보관실 온도기록계」)은 실재하는 카드로 바꿔 적었다.
- CASE130↔131, CASE134↔135는 인물 구성·증거 배치는 물론 레드헤링 문장까지
  거의 복제 관계인 쌍이다. 두 건이 같은 문장 틀이 되지 않게 따로 썼다.
  이 근처를 맡으면 같은 것을 보게 될 것이다.

**해야 할 것**

- 없음. (아래는 쪽지가 아니라 참고 — `SETTING_DEADLINE_DISCOVERY_TEMPLATE`가
  등록된 사건에서도 `error`라 CASE121·122·134·153·167이 `check:case`를 통과할
  수 없다. 같은 부류의 코퍼스 반복 검사는 전부 `overuseSeverity(alreadyRegistered)`를
  거쳐 warn으로 내려오는데 이것만 `validate_master.ts:383`에 error로 박혀 있다.
  이주 루틴이 이것 때문에 매 실행마다 같은 이슈를 새로 연다 — 지금 11개. 정책
  변경이라 사용자 판단을 기다리는 중이다.)

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

