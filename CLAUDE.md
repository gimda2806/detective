# Priorities

1. **게임의 재미.** 정합성은 통과 조건이지 목표가 아니다 — "게임이 안 돌아갈 정도"만 코드/QA로 막고, 나머지는 재미를 얼마나 살리는지로 판단한다.
2. **탐정과 한지우의 캐릭터·티키타카.** 사건이 아무리 잘 설계돼도 둘의 대화가 기능적이면 재미가 안 산다.
   한지우는 **남자**이고 탐정과는 **브로맨스 파트너**다(2026-09 사용자 결정). 오래 같이 일해서 서로 설명이 필요 없는 두 남자의 덤덤한 친밀함 — 애틋한 말보다 짧은 농담·핀잔·묵묵히 옆에 있는 방식으로 드러난다. `그녀`/여성 표현으로 쓰지 않는다. 말투는 **비대칭 유지**: 탐정은 한지우에게 반말, 한지우는 탐정에게 반존대(`-요`), 다른 인물에게는 둘 다 존댓말. 이 비대칭은 명시적으로 유지 결정된 것이므로 "브로맨스니까 서로 반말로" 식으로 조용히 바꾸지 말 것.
3. 나머지 (Master 생성 파이프라인 정합성, 비용 최적화 등)는 위 둘을 해치지 않는 선에서만 손본다.

## 2026-09 결정: 방향 전환 — 장소 수색에서 인물 관계·서사로

지금까지 만들어진 사건은 **장소를 뒤지는 쪽에 무게가 쏠려 있다.** 코퍼스 282건을 세어 보면 그게 숫자로 드러난다:

- `detail_rules`(장소에서 뒤져서 나오는 것)가 사건당 평균 6개
- `red_herrings`는 **266건이 정확히 2개** (1개 15건, 3개 1건)
- `characters`는 **276건이 정확히 5명**
- **인물 사이의 관계를 적는 필드가 스키마에 아예 없다** — 282건 전부 0개

관계는 `role` 문자열("부매니저 / '광대' 배역")과 `full_truth.motive` 안에만 암시적으로 들어 있다. 적을 자리가 없으니 사건이 자연히 "방을 돌며 물건을 찾는" 구조가 됐다.

앞으로는 **등장인물들의 관계와 서사**에 무게를 옮긴다. 그러려면:

1. **마스터의 이야기가 더 탄탄해야 한다.** 누가 누구에게 무엇을 빚졌고, 무엇을 숨겨 주고 있고, 어떤 사이가 최근에 틀어졌는지가 데이터로 있어야 GM이 그걸 대화에 쓸 수 있다. 지금은 그 자리가 비어 있어서 모델이 매번 즉흥으로 만든다.
2. **범인이 아닌 사람들의 레드헤링이 더 중요해진다.** 진범 말고는 아무도 무게가 없으면 플레이어가 추리할 것이 없다. 2개 고정을 늘리거나, 지금의 두 박자(surface_suspicion → how_to_clear)를 더 깊게 만드는 쪽 둘 다 후보다.
3. **플레이어는 공간을 볼 수 없고 머릿속에 그려야 한다.** 그러니 장소 서술은 무엇이 있는지 나열하는 데서 그치면 안 되고, 어디에 무엇이 있고 무엇이 무엇에 가려져 있는지 — 상대적인 자리가 문장 안에 있어야 한다. 물건 목록을 읽은 플레이어는 공간을 상상하는 대신 이름을 하나씩 골라 보게 된다. `SCENE_AND_OPENING_RULES` 첫 줄이 이걸 말한다.
4. **공간 증거는 줄이되 읽기 쉽게 한다.** 대화형 추리게임이라 "무엇을 더 볼 수 있는지"가 서술 문장 안에 묻힌다. `detail_rules`의 목적어를 런타임이 뽑아 화면에서 밑줄+돋보기로 표시한다(`examinableTargetsHere`). 이미 찾은 것은 빠지므로 표시가 남아 있다는 건 아직 볼 게 있다는 뜻이다. **다만 이 표식은 플레이어가 놓친 것을 줍는 장치이지 서술을 대신하는 게 아니다** — 표식에 기대어 묘사를 줄이면 방이 체크리스트가 되고, 위 3번이 무너진다.

**진행됨 (2026-09)**: `relationships` 필드를 넣었다. 스키마(`scripts/case_master.schema.json`)에서는 `required`, 검사기(`validate_master.ts`의 `checkRelationships`)에서는 **없으면 warn, 있는데 깨져 있으면 error**로 잡는다. 이 비대칭은 의도적이다 — 필드가 생기기 전에 만들어진 282건이 이미 머지돼 있고, 실플레이 피드백으로 그중 하나를 고친 뒤 `check:case`를 다시 돌리는 것이 실제 작업 흐름이라 거기서 막히면 안 된다. 새 사건은 스키마 `required`와 생성 지침이 강제한다.

런타임은 `master-index.ts`가 `[RELATIONSHIPS]`를 파싱하고 `buildActionScopedMaster()`가 매 턴 `relationships`로 넘긴다. `nature`/`public_face`는 항상 넘어가고, `private_strain`/`surfaces_when`은 **지금 탐정 앞에 앉아 있는 인물이 낀 관계에만** 실린다 — `surfaces_when`이 자연어라 서버가 "도달했는지"를 판정할 수 없으니, 적어도 그 자리에서 새어 나올 수 있는 사람 것만 모델 손에 쥐여 주는 쪽을 택했다.

**오프라인 GM은 그 차선조차 쓸 수 없다**(모델이 없으니 눈치로 못 때운다). 그래서 `how_to_clear`가 걸어간 길을 그대로 쓴다 — `surfaces_when` **문장 안에 괄호로 병기된 id**만 읽고, 그 id가 전부 플레이어에게 도달했을 때 관계 질문의 두 번째 박자(「○○과의 사이를 다시 묻는다」)를 연다(`offline-engine.ts`의 `strainReady`). 683개 중 408개(60%)가 이미 id를 달고 있어 그만큼이 지금 돌아가고, id가 없는 274개는 **닫아 둔다** — 조건이 안 적힌 관계가 첫 턴부터 균열을 쏟지 않게 하려는 것이고, 이주 루틴이 id를 달면 그때 저절로 열린다. `private_strain`의 주어는 감추고 있는 쪽 본인이어야 한다(`strainSubject`) — 짝의 반대쪽이 주어면 남의 비밀을 엉뚱한 입으로 흘리는 화자 드리프트가 된다. 밀린 양은 `npm run audit:format`의 `RELATIONSHIPS_SURFACES_NO_ID`/`_UNKNOWN_ID`/`RELATIONSHIPS_STRAIN_NO_SUBJECT`.

## 근거

CASE017 실플레이 로그로 반복 확인된 것: 실제로 재미를 죽이는 지점은 거의 항상 **Master(사건 생성) 문제가 아니라 GM 런타임 문제**였다.

- 화자 드리프트(다른 사람이 대답), "수사 기록에 확정해 넣지 않는다" 같은 시스템 문구 유출, 기록 조회가 record_review로 분류조차 안 돼 막힘, 플레이어가 스스로 찾은 모순을 GM이 지어낸 설명("최신 장비라 가능하다")으로 봉합 — 전부 런타임(`app/game.ts`, `app/gm/*.ts`) 문제였고, Master 자체엔 이미 답이 있었다.
- 반대로 present_location/found_at 3중 불일치처럼 진짜 Master 생성 문제였던 것도 있었지만, 비율로는 소수다.

그러니 다음 문제가 보이면: **Master를 더 정교하게 만들기 전에, GM 런타임이 이미 있는 Master 정보를 제대로 못 꺼내 쓰고 있는 건 아닌지부터 의심한다.**

## 관련 코드

- `app/game.ts`의 `systemPrompt()` — 한지우 캐릭터 정의, 모순 봉합 금지 규칙 등 런타임 GM 지시문
- `app/gm/jiwoo-examples.ts` — 한지우 톤 레퍼런스
- `app/gm/response-signals.ts` — 응답 검증/재시도 위반 목록 (화자 드리프트, 모순 봉합, 정보 유출 등을 코드로 잡는 백스톱)
- `scripts/audit-converter-coverage.ts` — 마스터에 적힌 값이 실제로 `raw_text`까지 도달하는지 검사한다. **스키마에 필드를 추가할 때는 변환기(`structured-master-converter.ts`) 방출과 `master-index.ts` 파싱을 같이 고쳐야 한다** — 안 그러면 마스터는 채워져 있는데 GM은 그 값을 본 적이 없는 상태가 되고, 에러는 나지 않는다. `pressure_responses`·`comic_tell`·`voice_profile`·`knows[].source`가 전부 그렇게 죽어 있었다(마지막 것은 프롬프트 규칙이 문면에 "see knows[].source"라고 적어 두기까지 했다). 이 검사가 그 네 번째 이후로 생겼다.
- `app/gm/master-index.ts` — Master `raw_text`의 LOCATIONS/CHARACTERS/CONTRADICTION_STAGES/RED_HERRINGS를 런타임에 파싱해서 `buildActionScopedMaster()`가 매 턴 실제 위치·NPC 규칙(`current_location_rules`/`current_npc_knowledge`/`contradiction_stages`)을 GM에게 넘기게 하는 모듈. **CASE059/CASE171 환각(가짜 CCTV 서브플롯, 엉뚱한 위치에서 발견 등)의 진짜 근본 원인**이 여기 있었다 — 이 모듈이 생기기 전에는 일반 플레이 턴에 raw_text가 아예 전달되지 않아서, 모델이 위치 한 줄 설명 말고는 참고할 실제 데이터가 없었다.
- Master 생성은 더 이상 이 앱 안에서 하지 않는다 (2026-09, 아래 참고). 새 사건은 외부에서 구조화 JSON으로 작성해 `data/pending-cases/<CASE_ID>/<CASE_ID>.master.json`으로 git에 직접 커밋하면 배포 시 `app/gm/structured-master-converter.ts`가 자동으로 변환해 로드한다. 스키마는 `scripts/case_master.schema.json`, 프롬프트 레퍼런스는 `scripts/case_generation_prompt.md`, 검증은 `npm run check:case <CASE_ID>`(커밋 전에 돌려볼 것) — `scripts/validate_master.ts`의 교차참조 검증과 `scripts/audit-evidence-leak.ts`의 런타임 유출 검사를 함께 돌린다.

## 오프라인 모드 — AI 없이 도는 두 번째 GM

`/offline`과 `/offline/<CASE_ID>`는 모델을 한 번도 부르지 않는다(`OPENAI_API_KEY` 없이 돈다). 같은 사건 데이터와 같은 저장 계층을 쓰되, 말을 지어내는 모델 대신 규칙표가 대답하고 플레이어는 자유 입력 대신 **마스터가 실제로 허락한 행동 목록에서 고른다**. 그래서 **마스터에 안 적힌 것은 오프라인에 없는 것이다** — AI 경로는 빈틈을 즉흥으로 메우지만 이쪽은 못 메운다. `discovery_condition`·`detail_rules[].action` 같은 필드가 화면에 뜨는 버튼 문구 그대로인 것도 이 때문이다.

- `app/gm/offline-engine.ts` — 규칙 GM 본체. 매 턴 메뉴를 만들고(`buildOfflineActionMenu`) 고른 행동을 실행한다(`runOfflineAction`). 행동 id는 `move`/`observe`/`inspect`/`probe`/`talk`/`summon`/`victim`/`alibi`/`relation`/`ask`/`recall`/`present`/`leave`/`close` 14가지이고 접두사로 갈린다.
- `app/gm/offline-session.ts` — 턴 하나를 대사 배열로 조립한다. **`app/game.ts`에서 아무것도 import하지 않는다** — 순환을 막으려고 일부러 인자로만 받는다.
- `app/gm/offline-hypothesis.ts` — **가설 보드**(누가·언제·왜·어떻게). 마스터에 `motives`/`times`/`methods`가 있는 사건에서만 켜지고, 켜지면 **두 단으로 잠긴다**(2026-09 사용자 결정): **「누가」 한 칸이 굳어야 증거 제시가 열리고**(`suspectNamed`), **네 칸이 다 굳어야 대립 단계가 열린다**(`actTwo`). 제시까지 네 칸을 기다리게 하면 1막 내내 헛다리 해소와 잠긴 진술 열기가 같이 닫히는데 그 둘이 보드를 채울 재료를 캐내는 길이라, 「누가」 한 칸으로 갈랐다 — 탐정은 누구를 의심하는지 정하기 전에는 카드를 들이대지 않는다. 같은 이유로 **대립 단계가 내주기로 한 말(`release`)은 `hidden_until`로 새어 나오지 않는다**(`unlockedByGate`가 건너뛴다) — 1,020개 중 233개(22.8%)가 자기 release를 같은 카드로 열리는 게이트에 같이 걸어 두고 있어서, 카드를 내밀면 단계를 건드리지 않고도 그 말이 먼저 나왔다(CASE002·003·004는 단계 전부가 그렇다). 단계가 깨지면 그 말이 나오므로 갇히지 않는다. 상태는 `completed_actions` 마커. 왜 이렇게 됐는지는 `docs/offline-deduction.md`.
- `app/gm/offline-summon.ts` — 「한지우가 데려온다」. 마스터가 인물에게 `present_location` 하나만 주므로 사람은 원칙적으로 제자리인데, 이미 면담한 사람 **한 명만** 불러올 수 있게 한 유일한 예외다.
- `app/offline/` — 화면과 서버 액션. `actions.ts`가 얇은 것은 의도다(AI 게임이 쓰는 `app/actions.ts`를 영영 안 건드리려고 파일을 갈랐다).
- 저장은 같은 테이블의 **다른 행**이다 — AI는 `CASE142`, 오프라인은 `CASE142::offline`(`saveRowId`). 한 사건을 두 모드로 따로 진행해도 서로 덮어쓰지 않고, 목록 화면의 진행도도 반대쪽 행을 건너뛴다.

**`app/gm/offline-*.ts`를 건드렸으면 `npm run check:offline`을 돌린다.** 사건 전수를 무식한 플레이어로 완주시켜(방 다 들어가고, 뒤질 것 다 뒤지고, 모두에게 모든 카드를 제시) 버튼만으로 마지막 모순 단계까지 갈 수 있는지 본다. 모델이 없으니 여기서 막히는 사건은 **영영 못 깨는 사건**이 되고, 이것 말고는 아무도 그걸 못 잡는다. 두 사람의 대사도 엔진 안의 대사 풀에서 나오므로, 풀을 손댔으면 `npm run check:banter`로 쏠림을 같이 본다.

## 막간과 막 — 사건은 다섯 편씩 열린다 (2026-09 사용자 결정)

목록 화면에 두 가지가 얹혀 있다. **막간**(`app/interludes.ts`)은 사건 하나를 풀면 한 편, 그 뒤로 다섯 건마다 한 편 열리는 탐정과 한지우의 사건 밖 한 문단이다 — 사건 안의 둘은 마스터 문장과 규칙에 묶여 있어 사건 밖의 둘이 보이는 자리는 여기뿐이고, 어느 사건을 풀었든 같은 문단이 읽혀야 하므로 사건 사실은 한 줄도 쓰지 않는다. **막**(`app/gm/case-gate.ts`)은 그 막간을 커튼으로 보고 **번호순 앞 다섯 편만 열어 두는** 게이트다. 다섯 건을 풀면 다음 다섯 편이 열린다. 번호가 곧 플레이 순서라는 이 코퍼스의 규칙이 여기서 플레이어에게 보인다.

**앞 막만 부른다.** 게이트 덕에 N막의 사건은 N-1막을 전부 푼 사람만 연다. 그래서 막간(N×5건 편)과 N막 사건의 오프닝·한지우 대사는 **앞 막의 것**을 불러도 되고(두고 온 필름, 어묵, 빈 꿀병 — 진상은 한 줄도 안 쓴다), **같은 막 안의 사건끼리는 서로 부르면 안 된다**(막 안에서는 순서가 자유다). 1막(CASE001~005)과 2막 첫 편 CASE006은 2026-09에 새 포맷(보드·says·숫자 시각)으로 다 올렸고, 5건 막간이 1막 다섯의 잔향이다. CASE001(양봉장, 말벌 알레르기)은 코퍼스에 없던 번호라 첫 사건으로 직접 썼다 — `next:case-id`는 최소 번호부터 빈 곳을 세므로 루틴은 001을 잡지 않는다.

둘 다 **저장 상태가 없다** — `listCases`가 어차피 모든 저장 행을 읽어 종결 건수를 알고 있으므로 거기서 파생한다(`CaseSummary.locked`/`unlocks_at`). 이미 손댄 사건(진행 중·종결)은 번호가 어디든 잠기지 않는다. 잠긴 사건은 목록에서 링크가 아니고(`RowShell`), 주소로 쳐도 사건 페이지가 `caseGateFor`로 막는다(`app/CaseLocked.tsx`) — 사건 내용은 한 줄도 내보내지 않는다. 다섯 편 중 하나가 못 깨는 사건이면 플레이어가 그 막에 갇히므로, **`check:offline` 312/312 완주가 이 게이트의 안전선이다.**

## 2026-09 결정: 사건 데이터를 Worker 번들 밖으로

사건이 307건이 되자 `import.meta.glob(eager)`로 마스터를 전부 빨아들이던 청크 하나가 번들에서 9.75 MiB(gzip 2.13 MiB)를 차지했다. Worker 스크립트 크기 한도는 **gzip 기준 무료 3 MiB / 유료 10 MiB**이고, 사건 한 건이 8.2 KiB씩 먹고 있었다 — 무료 플랜이면 76건 뒤에 배포가 막힌다. isolate가 뜰 때마다 307건을 전부 `convertStructuredMaster` + `validateUploadedCase`로 돌리는 콜드스타트 비용도 같이 물고 있었다.

지금은 `scripts/build-case-assets.ts`(`npm run build:cases`, `dev`/`build`가 먼저 자동으로 돌린다)가 빌드 때 그 변환·검증을 한 번 해서 두 가지를 떨군다:

- `public/cases/<hash>.json` — 검증까지 끝난 사건 봉투 하나. `dist/client`로 복사되어 정적 에셋으로 배포되고, 스크립트 크기에 들어가지 않는다. `getCase()`가 `env.ASSETS`로 실제로 열리는 사건 하나만 가져온다.
- `app/generated/case-index.json` — 목록 화면 한 줄씩(제목·요약·태그)과 그 hash 대응표. 본문이 없으니 작고, 이건 번들 안에 남는다. 둘 다 gitignore 대상이다.

번들 gzip은 2.40 MiB → 0.42 MiB가 됐고, 사건이 늘어도 이제 인덱스 한 줄씩만 는다.

**파일 이름이 사건 내용의 해시인 것은 장식이 아니다.** 에셋은 주소만 알면 누구나 받는다 — `/cases/CASE302.json`이었다면 URL 한 줄로 그 사건의 진범까지 새어 나간다. `vite.config.ts`에 `assets.run_worker_first: ['/cases/*']`도 걸어 뒀지만 **wrangler dev에서는 그 라우팅이 적용되지 않는 것을 확인했으므로**(`/favicon.svg`를 넣어 봐도 Asset Worker가 그대로 내줬다) 배포 환경의 두 번째 방어선으로만 본다. 실제 방어선은 못 찾을 이름이고, 그 대응표는 Worker 번들 안에만 있다.

`app/gm/case-envelope.ts`는 이것 때문에 생겼다. `CaseData` 타입과 `validateUploadedCase`/`caseTagsFromData`가 원래 `app/game.ts` 안에 있었는데, 그 파일은 최상위에서 `cloudflare:workers`의 `env`를 잡으므로 빌드 스크립트가 불러올 수 없다. **요약·태그를 뽑는 규칙을 빌드 스크립트에 다시 구현하지 말 것** — 갈라지면 목록 화면과 실제 사건이 서로 다른 말을 한다.

## 2026-09 결정: 앱 내 Master 생성/업로드 파이프라인 삭제

Master를 이제 외부에서 직접 작성해 git 커밋으로 배포하는 방식으로 바꾸면서, 앱 안에 있던 AI 기반 Master 생성 파이프라인(OpenAI로 CASE9xx 초안을 뽑고 자체 QA하던 것)과 수동 업로드 폼을 통째로 들어냈다. 삭제된 것: `app/CaseGenerator.tsx`, `app/MasterUpload.tsx`, `app/gm/case-generation.ts`, `app/gm/generate-case-job.ts`, `scripts/generate-case.mjs`, `scripts/ingest-case.mjs`, `scripts/lib/master-parser.mjs`(및 그 테스트), `scripts/reference/CASE901.txt`, `scripts/README.md`, `app/actions.ts`의 관련 서버 액션들, D1의 `generation_jobs`/`case_id_reservations` 테이블 생성 코드. `scripts/case_master.schema.json`과 `scripts/validate_master.ts`는 외부 작성 워크플로에서 그대로 쓰이므로 남겨뒀다. 케이스 목록 해시태그는 `app/gm/structured-master-converter.ts`의 `deriveCaseTags()`가 만든다. **`case_identity.tags`를 읽지 `genre`를 읽지 않는다** — 한때 `deriveTagsFromGenre()`가 genre에서 뽑았고 이 문단도 그렇게 적혀 있었지만, 그 함수는 지금 코드베이스에 없다(2026-09 확인). `genre`는 런타임이 한 번도 읽지 않는다: `master-index.ts`가 파싱하는 12개 섹션에 `CASE_IDENTITY`가 없고 `buildActionScopedMaster`도 싣지 않으므로, `setting`/`tone`/`detective_entry`와 같은 부류다. 지금 `genre`를 읽는 것은 `case_registry.json` 기록과 `validate_master.ts`의 `METHOD_ARCHETYPE_OVERUSE`(그것도 `full_truth.method`가 주 신호이고 genre는 덤)뿐이라, 옛 형식으로 쓰인 112건을 굳이 새 형식으로 고칠 이유가 없다.

## 세션을 시작하면 `docs/handoff.md`부터 읽는다

두 세션이 같은 저장소를 고친다. 상대가 무엇을 바꿨고 나에게 무엇을 남겼는지가 거기 있다. **끝낼 때는 상대 작업에 영향이 가는 변경을 같은 파일에 적고, 상대가 남긴 것을 처리했으면 그 블록을 지운다** — 지우는 것이 "받았다"는 신호이고, 안 지우면 파일이 일지가 되어 아무도 안 읽는다. 무엇을 적고 무엇을 적지 않는지는 그 파일 앞머리에 있다.

## 기존 마스터를 현재 스키마로 올리는 중 (Routine, 이 세션 밖에서 실행 중)

코퍼스 308건 중 39건만 지금 스키마에 부합한다. `npm run audit:format`이 항목별로 세어 준다 — 걸리는 것은 **`relationships` 없음 269건**과 **단계 키가 서술문 73건**(전부 관계도 같이 없음) 둘뿐이고, 진입 시각과 raw_text 파싱은 308건 전부 통과한다.

269건 전부가 관계 때문이고 그건 스크립트로 못 만든다 — `private_strain`이 비었거나 `public_face`와 같으면 검사기가 반려하므로 사건을 읽고 써야 한다. 그래서 Routine이 한 번에 5건씩 맡는다. 지침은 `docs/master-format-migration.md`.

**이 작업은 빠진 필드를 채우는 것이지 사건을 다시 쓰는 것이 아니다.** 관계는 `full_truth.motive`와 `actual_timeline`에 이미 암시적으로 들어 있는 것을 명시적으로 옮겨 적는 것이고, 사건의 진상이 바뀌면 안 된다.

**관계도의 중심은 피해자다.** 첫 20건에서 루틴이 이걸 뒤집었다 — 범인 연결이 평균 3.05, 피해자가 1.70이었다(원래 있던 39건은 피해자 2.90, 범인 2.13이다. 사람이 쓰면 자연히 피해자 중심이 된다). 뒤집히면 **관계도 모양만 보고 범인이 짚이고**, 이건 데이터 모양 자체가 흘리는 것이라 런타임이 가릴 수도 없다. 그리고 여러 사람이 저마다 피해자와 걸린 것이 있어야 저마다 동기처럼 보인다 — 범인 하나만 무거우면 플레이어가 가릴 것이 없다. `validate_master.ts`의 `RELATIONSHIPS_CULPRIT_HUB`가 피해자 연결 수와 범인 연결 수를 견주고, `RELATIONSHIPS_ORPHAN_CHARACTER`가 어느 관계에도 안 나오는 인물을 잡는다. 둘 다 등록된 사건은 warn, 새 사건은 error다.

## 2026-09 결정: 세션 간 충돌은 사람이 옮기지 않는다

두 세션이 같은 저장소를 동시에 고치고 사건 생성 루틴까지 주기적으로 머지한다. "공유 파일을 건드리기 전에 서로 알린다" 같은 약속은 **사용자가 전달책이 되어야 해서** 지속되지 않는다(2026-09 사용자 지적). 그래서 기계가 할 수 있는 것은 전부 기계로 내렸다.

**`.github/workflows/pr-checks.yml`** — PR과 main push에 `tsc --noEmit` · oxlint 기준선(`.github/oxlint-baseline.txt`) · `npm run build` · 바뀐 마스터의 `check:case`를 돌린다. 이 저장소에 원래 PR 검사가 아예 없었다(있던 워크플로 하나는 2026-09에 삭제된 `scripts/generate-case.mjs`를 부르는 죽은 것이라 같이 지웠다). **시그니처 드리프트는 여기서 죽는다** — main에서 `getCase()`가 동기에서 비동기로 바뀌었는데 다른 브랜치의 호출부가 그대로면 깨뜨린 PR이 스스로 빨개진다. 아무도 알릴 필요가 없다. oxlint는 기존 부채를 그대로 두고 **늘어나는 것만** 막는다.

**`docs/conflict-watch-routine.md`** — PR 검사가 구조적으로 못 보는 둘만 맡는 감시 루틴의 지침. (1) **컴파일이 통과하는 의미 충돌** — 한쪽이 지운 것을 다른 쪽이 문자열로 물고 있는 경우로, `data/cases/CASE014/case.json`이 삭제됐는데 `mockGm`이 옛 인물 `백지훈`/`임채원`을 하드코딩한 채 남아 텍스트 충돌 없이 양쪽 다 머지된 것이 그 예다. (2) **열린 PR끼리의 충돌** — PR 검사는 자기 PR만 보므로 두 PR이 같은 파일이나 같은 사건 번호를 잡는 것은 어느 쪽도 모른다. 발견은 `충돌 감시: 열린 항목` 이슈 하나에 모아 매 실행 본문을 갈아 끼우고, 없으면 닫는다. **이 루틴은 코드를 고치거나 푸시하지 않는다.**

## 자동 케이스 생성 루틴 (Claude Code Routine, 이 세션 밖에서 별도 실행 중)

`data/pending-cases/`에 새 `CASE1xx`가 이 세션과 무관하게 계속 늘어나는 이유 — 사용자가 별도로 설정해둔 Claude Code 루틴이 아래 스펙으로 주기적으로 새 사건을 생성해 커밋·PR·머지까지 자동으로 처리한다:

1. `case_master.schema.json` 형식에 맞는 사건 하나를 생성. `case_id`는 `npm run next:case-id`가 고른다 — **가장 작은 빈 번호, 없으면 최댓값 + 1**이다(2026-09 결정). 번호가 곧 플레이 순서라(`sortCaseSummaries`가 미착수 그룹을 번호순으로 정렬한다) 서로 너무 닮은 사건을 뒷번호로 옮기고 그 앞자리를 새 사건이 채우는 것이 이 코퍼스의 정리 방식인데, 최댓값+1로는 비운 자리가 영영 비어 있다. `case_registry.json`에 있는 번호는 폴더가 없어도 건너뛴다 — 한 번 쓰인 번호다(`CASE014`가 그렇다. 앱에 내장된 사건이라 `pending-cases`에 없다). 같은 번호를 다른 사건이 물려받아도 옛 저장이 새 사건에 붙지는 않는다 — `app/game.ts`의 `isStateForDifferentCase`가 제목으로 갈라 버린다. **`npm run recent:avoid`를 먼저 돌리고 거기 나온 것을 피한다.** 최근 10건에서 반복된 수법 계열·제목 틀·배경 장치·오프닝 도입·진범 위치·진입 경로를 세어 준다. 검사기는 코퍼스 비율을 보기 때문에 307건쯤 되면 같은 것을 또 써도 비율이 안 움직여 사실상 잠든다. 반면 "최근 N건과 겹치지 마라"는 코퍼스 크기와 무관하게 똑같이 듣는다 — 근거가 코퍼스 안에 있다. `detective_entry_type`만 이 지시를 받아 온 필드인데 307건에서 최다값이 5%로 고르게 흩어진 반면, 아무도 세지 않는 축은 쏠렸다: 제목 틀 「OO이 삼킨 △△」 25%, 배경 "…를 앞둔" 48%(그중 "사흘 앞둔"만 29%), 진범 CH01 52%, 밀폐·질식 수법 21%, 인물 5명 98%, 장소 5곳 73%. **이 중 진범 자리만은 2026-09에 화면에서 막았다** — 313건에서 진범이 CH01 163·CH02 80·CH03 61·CH04 5·CH05 4 라 「첫 번째 사람부터 의심하라」가 절반 맞았고, 그 순서가 그대로 보이는 자리가 셋이었다(수첩 인물 탭, 행동 메뉴, 가설 보드의 「누가」 후보). `case-envelope.ts`의 `validateUploadedCase`가 `npcs`를 이름순으로 세우므로 지금은 64/58/63/61/67 로 고르다. **그러니 마스터의 CH## 를 다시 매기지 말 것** — 그 id 는 `F-CH01-03`·`S-CH02-01`·`relationships.between`·`contradiction_stages.target_character`·`hidden_until`·`full_truth` 가 전부 물고 있어 한 글자만 어긋나도 사건이 깨지고, 보이는 순서는 이미 고쳐져 있다. 새 사건도 진범을 CH01에 두어도 된다. `case_registry.json`의 `characters`/`key_figures` 전체와 인물 이름이 겹치지 않게 하고, `detective_entry_type`은 스키마 enum 중 최근 3건과 겹치지 않는 값으로. "다급한 연락을 받고/전화를 받고" 같은 상투적 도입 문장 금지. 그 밖에 생성 단계에서 지켜야 할 것:
   - 동기 원형·배경 계열 중복은 검사기가 코퍼스 비율로만 본다. 임계값은 **10%**다(2026-09에 30%에서 내렸다 — 30%에서는 폭로 동기가 26.7%, 심사·인증 배경이 21.2%까지 차올라도 아무것도 안 걸렸다). 이미 `case_registry.json`에 올라간 사건은 warn, 아직 등록되지 않은 새 사건은 error다 — 루틴은 4단계에서 registry에 올리므로 생성 시점에는 언제나 error다. 임계값이 낮아졌다고 회피 책임이 검사기로 넘어간 것은 아니다. 검사기는 세 축(폭로 예고 동기, 심사·인증 마감 배경, 그리고 2026-09에 추가한 수법 계열 `METHOD_ARCHETYPE_OVERUSE` — 밀폐·질식/추락/낙하물/타격/감전/중독/익사/화재 여덟 가지를 `full_truth.method`로 분류한다)만 알고, 제목 틀·오프닝 도입·진범 위치 같은 나머지 반복은 여전히 이 1단계가 `recent:avoid`를 보고 막아야 한다.
   - `contradiction_stages`는 `target_character`별로 하나의 사슬이어야 한다. 첫 단계의 `from_stage`는 반드시 문자열 `initial`이고, 각 단계의 `to_stage`가 다음 단계의 `from_stage`와 글자 그대로 같아야 한다. 이 값들은 상태 키지 서술이 아니다 — 짧은 식별자로 쓴다 (예: `initial` → `admits_lending_key` → `admits_presence`).
   - `relationships`는 최소 3개, 서로 다른 인물 쌍, 범인이 낀 관계가 적어도 하나. `nature`/`public_face`는 누구에게 물어도 나오는 공개 정보고, `private_strain`은 인물이 먼저 꺼내지 않는 것(`surfaces_when`이 가리키는 것을 탐정이 실제로 건드렸을 때만 새어 나온다). **`surfaces_when`에는 그것의 id를 괄호로 병기하고**(없으면 오프라인 GM이 영영 못 연다), `private_strain`의 주어는 감추고 있는 쪽 본인으로 쓴다. `private_strain`이 비었거나 `public_face`와 같은 말이면 그 관계는 서사에 아무것도 보태지 않으므로 검사기가 반려한다. 이게 있어야 범인이 아닌 인물의 레드헤링에 무게가 실린다.
   - 같은 위치(`found_at`)에 놓이는 증거 카드들은 서술이 서로 구별되어야 한다. 매체·인물·문장 끝맺음을 공유하면 런타임 유출 검사에 걸려 발견이 막힌다.
   - `opening_scene.detective_entry_time`은 필수다. 탐정이 현장에 들어온 시각이고, 이 사건의 "지금"이다 — 대사 속 오늘·어제·어젯밤이 전부 이 시각을 기준으로 읽힌다. `"<날짜> <시각>"` 형식으로, 날짜는 사건 발생일 기준(`사건 당일`/`사건 다음날`), 시각은 24시간제 숫자(`"사건 당일 22:30"`). **`opening_scene.narrative`가 말하는 때와 반드시 맞아야 한다** — 오프닝이 "이른 아침"인데 진입 시각이 `23:00`이면 그 자체로 모순이다.
   - `actual_timeline`은 시간순으로 배열한다. 마지막 항목이 늘 발견인 것은 아니다 — 은폐나 이튿날 공식 발표처럼 탐정이 이미 도착한 뒤의 일이면 그 항목은 진입 시각보다 뒤에 온다.
   - `ending_scene`은 발견 직후가 아니라 수사에 걸린 시간이 지난 뒤다. 진입 시각부터 장소를 돌고 사람들을 만나는 데 몇 시간이 걸렸으므로, 빛과 공기와 사람들의 상태가 그 시간을 반영해야 한다.
   - 시각은 대사든 서술이든 아라비아 숫자로 쓴다(`"오후 8시 30분"`, `"20시 30분"`). `"여덟 시 반"`처럼 고유어로 풀어 쓰지 않는다 — 시각이 곧 단서라 플레이어가 두 시각을 눈으로 바로 맞춰볼 수 있어야 한다.
   - `base_description`에 **그 방에 있는 사람을 쓴다**(2026-09 사용자 결정). 사람이 있는 장소 1,138곳 가운데 그 사람이 서술에 나오는 것이 49곳(4.3%)뿐이고, 그나마 대부분 "하유담의 개인 사무실"처럼 소유격이지 지금 거기 서 있다는 말이 아니다. CASE294 실플레이에서 이것이 실제로 사람을 놓치게 만들었다 — 앞마당에 진범의 유일한 목격자가 있는데 서술이 순찰 기록판과 벤치만 말해서, 플레이어가 들어갔다가 2초 만에 나가고 힌트를 쓴 뒤에야 돌아왔다. 물건 목록에 사람 한 줄을 끼워 넣으라는 말이 아니라, **그 사람이 무엇을 하고 있는지가 방의 상태를 말하게** 쓴다("창가 자리에 앉은 설온유는 아까부터 같은 자리를 지키고 있다"). 런타임이 도착 서술 끝에 `이곳에는 ○○이 있다.`를 붙이지만(`peopleHereLine`) 그건 놓친 것을 줍는 장치이고, 방향 전환 3번이 말하는 "머릿속에 그려지는 공간"은 서술이 해야 한다.
   - `knows[].content`는 **그 인물이 가진 사실을 그대로** 쓴다. `~는 사실을 안다`로 감싸지 않는다(2026-09 사용자 결정). 「들은 진술」 보드가 이 값을 그대로 띄우는데, 그 껍데기는 작성자가 자기한테 하는 말이라 화면에서는 "…지켜봐 왔다는 사실을 안다."처럼 읽힌다. GM에게 넘어가는 `current_npc_knowledge.knows`에도 껍데기 없는 쪽이 맞다 — 거기서도 그 인물이 말할 수 있는 사실 목록이다. 3,359개 중 2,495개가 그렇게 쓰여 있던 것을 한 번에 고쳤다. 쓸 때는 `21시경 밸브를 잠갔다.` 처럼 끝맺는다.
   - **한 인물의 `knows`는 사슬로 묶는다**(2026-09 사용자 결정). 오프라인 GM의 「그 밖에 이상한 점은 없었는지 묻는다」는 `hidden_until`에 안 걸린 `knows`를 적힌 순서대로 하나씩 내주므로, 잠금이 없는 인물은 면담 한 번에 아는 것이 바닥난다 — CASE030 실플레이에서 채이든이 다섯 개를 연달아 쏟았다. **`hidden_until` 한 항목이 순서와 열쇠를 같이 쥔다**: `release_trigger`에 **앞 진술의 id**(사슬의 첫 칸은 그 인물의 `S-CH0N-01`)를 적어 순서를 세우고, `release_prerequisite`에 **그것을 여는 열쇠** — 그 사람에게 내밀 카드(`E##`, 「제시했다」는 뜻이지 「손에 넣었다」가 아니다)·다른 데서 들어야 할 말(`F-`/`S-`)·깨야 할 단계(`C##`) — 를 적는다. 맨 앞의 한둘은 열어 둔다(만나서 물으면 나오는 것이 없으면 첫 면담이 벽이 된다). 진범은 `contradiction_stages`가 굴리므로 세지 않는다. 열린 것이 3개 이상이면 `KNOWS_UNGATED_FLOOD`, 등록된 사건은 warn 새 사건은 error다. **헛다리 주인공에게는 그 헛다리의 `how_to_clear`가 부르는 카드를 열쇠로 쓰지 않는다** — 그 카드를 내미는 순간 헛다리가 풀려서, 잠긴 진술이 남아 있는 동안 닫혀 있던 의심이 짙어지는 박자(`hasUnheardGatedKnowledge`)가 영영 건너뛰어진다.
   - **알리바이 아닌 첫마디를 하나는 준다**(2026-09 사용자 결정). 오프라인 GM의 첫 면담은 `initial_interview_range` 안의 진술 중 **알리바이꼴이 아닌 것을 먼저** 말한다 — 묻지도 않았는데 「그 시각엔 사무실에 있었어요」가 인사 다음 줄에 나오던 것을 막으려는 것이고, 1,558명 중 335명이 그랬고 그중 81명이 진범이었다(캐물어 끄집어내야 할 거짓말이 저절로 나왔다). 그래서 `initial_claims`에 **시각도 자기 행적도 말하지 않는 한 줄**이 하나는 있어야 한다: 그때 자기가 하던 일, 발견 당시 현장의 상태, 피해자에 대한 인상, 그날 이상하게 느낀 것. 그 한 줄이 그 인물의 `voice_profile`대로 들리면 첫 대면이 그대로 사람 소개가 된다. 알리바이 진술을 지우라는 말이 아니다 — 「사건 당시 어디에 있었는지 묻는다」가 그것을 그대로 내주고, 그 보기는 한 번 쓸 때까지 메뉴에 남는다. 전부 알리바이꼴이면 `CLAIMS_ALIBI_ONLY`, 등록된 사건은 warn 새 사건은 error다. 판정은 엔진의 `ALIBI_HINT`를 검사기가 그대로 import해서 쓰므로 두 벌로 갈리지 않는다.
   - **`initial_claims`를 「되묻는 꼴」로 쓰지 않는다**(2026-09 사용자 지적). 「명 코치님요? 그냥 인사하는 사이죠.」는 「피해자는 어떤 사람이었나」의 답이지 첫 대면에서 혼자 꺼낼 말이 아니다. 되묻는 첫머리(`~요?`·`~죠?`로 시작하는 짧은 되받음)는 작성자가 질문을 머릿속에 두고 썼다는 표식이라, 그 질문이 실제로 나오기 전에 답이 먼저 나온다. 코퍼스 2,606개 중 52개(2.0%)가 이 꼴이고 그중 37개가 첫 면담 자리였다. 엔진의 `ECHO_HINT`가 알리바이와 같은 방식으로 **빼지 않고 뒤로만 민다** — 다시 찾아가 물으면 그대로 나오므로 기존 사건이 깨지지는 않는다. 새로 쓸 때는 질문을 되받지 말고 **그 인물이 가진 사실을 그대로** 쓴다.
   - **방도 같은 방식으로 층을 만든다.** `detail_rules[].requires`에 id를 적으면 그 칸은 조건이 찰 때까지 잠긴다(`E##`는 여기서는 「손에 넣었다」, `F-`/`S-`는 들은 말, `C##`는 깬 단계, 사람 이름은 그 사람을 만났는가). `detail_rules` 1,956개 중 `requires`가 「없음」이 아닌 것은 34개뿐이고, 카드가 3장 이상 놓인 방 105곳(전체 1,592곳) 중 하나라도 적힌 방은 3곳이다 — 방이 들어서는 순간 뒤질 것이 전부 펼쳐지는 체크리스트가 된다. 적어도 한 칸은 사람에게서 나온 id가 열게 한다 — **방이 사람을 열고, 사람이 방을 연다**가 이 두 항목이 같이 노리는 것이다.
   - **진범이 아닌 인물에게도 물어볼 카드를 하나는 만든다.** `evidence`의 `discovery_condition`이 그 인물 이름으로 시작하는 카드가 하나도 없으면, 첫 면담에 `initial_claims`를 쏟고 나면 그 사람에게 할 수 있는 것이 사라진다 — CASE060 실플레이 신고가 이것이었다("면담 1차에 다 말함, 물어볼 게 없음"). 진범은 예외다: `contradiction_stages`가 굴리므로 증거를 들이대는 것이 그 사람에게 할 일이다. 코퍼스 1,533명 중 800명(52.2%)이 여기 걸리므로 `CHARACTER_WITH_NO_QUESTION`은 warn이고(기존 사건을 손볼 때 CI가 막히면 안 된다 — `relationships`와 같은 비대칭) 새 사건은 이 지침이 막는다. 카드 내용은 그 인물의 `knows` 중 `hidden_until`에도 안 걸려 나올 길이 없는 것을 쓰면 죽은 데이터가 같이 살아난다. 다만 아무 데도 안 쓰이는 카드는 `ISOLATED_TESTIMONY_EVIDENCE`로 걸리므로, `ending_explanation`이나 다른 증거의 `proves`에 그 카드가 무엇을 메워 주는지 한 줄 물려 둘 것.
   - **`red_herrings[].how_to_clear`는 남의 것을 하나는 부른다**(2026-09 사용자 결정). 런타임(`herringRequirementsMet`)은 그 문장에서 id만 읽으므로, id가 없으면 「그 사람에게 물어볼 것을 다 물어봤는가」로 떨어지고(194개), 부르는 게 전부 본인의 말이면 「본인이 아니라고 했다」로 풀린다(74개) — CASE289 표시온이 그랬다(메뉴에 「표시온 알리바이 증언을 표시온에게 제시한다」가 떴다). 둘 다 판단이 아니라 절차다. 남의 카드·남의 진술·장소 관찰 사실(`F-L##-OBS-##`) 중 하나가 들어가야 플레이어가 두 사람을 오가거나 방을 둘러봐야 풀린다. `HERRING_CLEAR_NO_ID`/`HERRING_CLEAR_SELF_ONLY`는 등록된 사건은 warn, 새 사건은 error — `relationships`와 같은 비대칭. 밀린 목록은 `docs/herring-audit.md`. **목표 상태는 「레드헤링은 오직 카드 제시로만 풀린다」다**(2026-09 사용자 결정). 지금 런타임은 조건이 차면 다시 말을 걸어도 풀어 주는데, 그건 카드가 없는 273개(`audit:format`의 두 코드 + 남의 진술만 5개)를 못 푸는 상태로 만들지 않으려는 과도기다. 이주 루틴이 그 273개를 지우면(지침은 `docs/master-format-migration.md`) 런타임을 제시로만 바꾸고 검사기를 「남의 **카드**」로 좁힌다 — 그 순서를 바꾸지 말 것. 장소 관찰 사실만 부르던 77개 중 76개는 `scripts/promote-observation-to-card.mjs`로 카드로 옮겨 뒀다(복사가 아니라 이동 — 유출 검사기가 관찰 결과를 공개 문장으로 본다).
   - **`voice_profile.stance`는 면담 태도를 코드로 적는다**(2026-09 사용자 결정). 일곱 중 하나다 — `forthcoming`(먼저 말을 붙인다) · `courteous`(예의 바르게 성실히) · `procedural`(직무로 답한다, 기록·절차·수치) · `unruffled`(서두르지 않는다) · `guarded`(선을 긋는다) · `imperious`(따지거나 가르친다) · `skittish`(겁먹었거나 눈치를 본다). 런타임이 이 값으로 첫마디·카드 턴의 지문·탐정이 묻는 어투 셋을 고른다. **평소를 적는다** — 몰렸을 때의 변화는 `pressure_responses`가 맡는다. 값이 없으면 엔진이 말투 산문에서 키워드로 짐작하는데, 1,558명 중 596명(38%)이 아무 표시도 안 걸려 `courteous`로 떨어지고 있었다(그중 194명은 「밝고 사교적인 존댓말」처럼 성격이 분명한데 키워드 목록에 그 말이 없는 경우다 — `forthcoming`이 그래서 생겼다). **진범의 stance는 같은 사건의 다른 인물도 하나는 가져야 한다**(`STANCE_CULPRIT_TELL`, 등록된 사건은 warn 새 사건은 error). 313건을 세어 보면 진범 중 `skittish`가 둘뿐이고(0.6%) 다른 인물은 11.1%라, 「떠는 사람은 범인이 아니다」가 첫인사 한 줄로 성립한다 — 관계도 쏠림과 같이 데이터 모양 자체가 흘리는 것이라 런타임이 가릴 수 없다.
   - **증거 카드의 `reaction`은 두 축으로 쓴다**(2026-09 사용자 결정). 카드를 주운 턴에 두 사람이 주고받는 말이고, 없으면 엔진의 공용 대사 풀로 떨어진다 — 풀은 2,604장이 같이 쓰므로 무엇을 찾았든 물건을 입에 올릴 수 없다. **매체가 쓸지 말지를 정한다**: `reaction`은 **물증 카드의 것**이다 — 방에서 혼자 발견하는 자리라 두 사람의 두 줄이 그 턴의 전부고, 거기가 이 필드가 필요했던 자리다. **증언 카드에는 원칙적으로 달지 않는다.** 면담 중이라 이미 상대의 말이 있었고, 두 줄이 더 붙으면 한 턴에 대화가 둘이 된다 — 이 자리에서 이미 두 번 겪어 `offline-engine.ts` 주석에 적혀 있는 병이다. 증언에서 인물이 드러나야 할 자리는 반응이 아니라 **증언 본문 자체**다(아래 별도 항목). 취향이 아니라 제약이다. **역할이 온도를 정한다, 길이가 아니라**: `decisive_evidence_ids`·`contradiction_stages[].player_action`·`red_herrings[].how_to_clear`·보드 후보의 `evidence_for`·`ending_explanation` 중 몇 군데가 그 카드를 부르는지 세면 기계로 나온다. 셋 이상이면 온도를 올리고(한지우가 들은 말을 그대로 되뇌고 탐정이 한마디로 자른다 — 서른 자로도 방이 조용해진다), 하나 이하인 배경 카드는 두 사람이 물건만 확인하고 지나간다. CASE001 첫 판에서 길이가 매체로만 갈리고 역할은 아무것도 정하지 않아, 결정적 증거가 밑에서 세 번째로 짧았다. **한지우는 물건에 반응하고 뜻에는 반응하지 않는다** — 무엇이 결정적이다·이제 됐다·저 사람이 걸렸다는 전부 탐정 몫이고, 이 자리가 그가 선을 넘기 가장 쉬운 곳이다. AI 경로에는 싣지 않는다(레이어가 더 탄탄해진 뒤에 붙인다).
   - `discovery_condition`에 **`캐묻는다`를 쓰지 않는다. `묻는다`로 쓴다**(2026-09 사용자 결정). 이 필드는 플레이어가 고르는 행동의 문구 그대로 화면에 뜨는데, 탐정이 매번 상대를 몰아붙이는 것처럼 읽힌다. 77건 195군데가 그렇게 쓰여 있던 것을 한 번에 고쳤고, `묻는다`는 원래 이 자리에서 가장 많이 쓰이던 형태다(고치기 전 464회 → 지금 652회).
2. 생성한 JSON을 `data/pending-cases/<CASE_ID>/<CASE_ID>.master.json`으로 저장하고 `npm run check:case <CASE_ID>`로 검증. 종료 코드가 0이 아니면 실패로 본다. 이 명령은 세 검사를 함께 돌린다 — `validate_master.ts`(교차참조·개수·중복·단계 사슬), `audit-converter-coverage.ts`(마스터에 적힌 값이 raw_text까지 도달하는지), `audit-evidence-leak.ts`(런타임 유출 검사기 재현). 가운데 것이 걸리면 그건 사건 내용 문제가 아니라 변환기 문제이니, 필드를 지우지 말고 `structured-master-converter.ts`를 고칠 것.
3. 에러가 있으면 해당 필드만 고쳐 재검증 (전체 재생성 금지, 필드별 수정 최대 3회). 고친 뒤에는 `npm run check:case`를 전체로 다시 돌린다 — 한 카드의 서술을 바꾸면 같은 방의 다른 카드와 새 충돌이 생길 수 있다.
4. 통과하면 `npm run build:source <CASE_ID>`로 이야기 소스를 뽑고(아래 참고), `case_registry.json`에 이번 case_id·인물명·entry_type·배경·트릭 계열을 추가하고, 새 브랜치에 커밋해 PR을 열고 메인으로 머지.

   `build:source`는 마스터에서 `case_identity`의 `setting`/`tone`/`detective_entry`와 `full_truth`의 산문 다섯을 `<CASE_ID>.source.md`로 뽑아낸다. 이 여덟은 런타임이 한 번도 읽지 않는다 — `master-index.ts`가 파싱하는 12개 섹션에 `CASE_IDENTITY`와 `FULL_TRUTH`가 없고(후자에서는 `responsible_character_id` 하나만 꺼낸다), `buildActionScopedMaster`도 싣지 않는다. 마스터를 **쓰기 위한 재료**이지 마스터가 담아야 할 데이터가 아니다. 지금은 마스터에 그대로 두고 사본만 뽑는다 — 생성 스키마를 건드리지 않는 쪽을 택했다(2026-09 사용자 결정). 실플레이 피드백으로 마스터를 고칠 때 "원래 무슨 이야기였는지"를 한 장으로 보는 용도이고, 나중에 마스터에서 그 여덟을 뺄 때의 준비이기도 하다. 마스터를 손으로 고쳤으면 이 명령을 다시 돌려 소스를 맞춰 둘 것.

5. 3회 수정 후에도 검증이 계속 실패하면 마지막 에러 목록과 재현 명령(`npm run check:case <CASE_ID>`)을 PR 대신 이슈로 남기고 중단.

이 루틴이 만든 케이스는 스키마/교차참조 검증은 통과했지만 이번 세션에서 발견한 것과 같은 종류의 문제(오프닝 문장 논리 오류, 문단 줄바꿈, 트릭 중복 등)는 자동으로 걸러지지 않을 수 있다 — 실플레이 피드백이 들어오면 이 세션에서 하던 대로 해당 마스터 파일을 직접 고치면 된다.

## 2026-09 결정: 방어 규칙 완화 (되돌리지 말 것)

`master-index.ts`로 실제 Master 데이터가 매 턴 전달되게 된 뒤, 그 전에 환각을 막으려고 넣었던 일부 방어 규칙이 과하게 기계적이라고 판단해서 **의도적으로 완화**했다 (PR #41). 구체적으로 `systemPrompt()`의 `ACTION_SCOPE_RULES`(행동 병합 허용), `OUTPUT_FORMAT_RULES`(짧은 문장 강제 금지), `NPC_KNOWLEDGE_AND_ANSWER_SCOPE_RULES`/`NPC_STATEMENT_DISCIPLINE_RULES`(허용 범위 안에서 자연스러운 연결 허용) 네 곳.

**이후 세션에서 이 네 규칙 근처를 다시 손대야 하는 상황(예: 다시 환각/턴 낭비가 보고돼서 규칙을 더 엄격하게 되돌리고 싶어지는 경우)이 오면, 조용히 되돌리지 말고 먼저 사용자에게 알릴 것.** 이건 실플레이 로그 기반 버그 수정이 아니라 명시적 사용자 요청으로 완화한 것이므로, 재수정 여부도 사용자 판단을 거쳐야 한다.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
