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

## 2026-09 결정: 앱 내 Master 생성/업로드 파이프라인 삭제

Master를 이제 외부에서 직접 작성해 git 커밋으로 배포하는 방식으로 바꾸면서, 앱 안에 있던 AI 기반 Master 생성 파이프라인(OpenAI로 CASE9xx 초안을 뽑고 자체 QA하던 것)과 수동 업로드 폼을 통째로 들어냈다. 삭제된 것: `app/CaseGenerator.tsx`, `app/MasterUpload.tsx`, `app/gm/case-generation.ts`, `app/gm/generate-case-job.ts`, `scripts/generate-case.mjs`, `scripts/ingest-case.mjs`, `scripts/lib/master-parser.mjs`(및 그 테스트), `scripts/reference/CASE901.txt`, `scripts/README.md`, `app/actions.ts`의 관련 서버 액션들, D1의 `generation_jobs`/`case_id_reservations` 테이블 생성 코드. `scripts/case_master.schema.json`과 `scripts/validate_master.ts`는 외부 작성 워크플로에서 그대로 쓰이므로 남겨뒀다. `deriveTagsFromGenre()`(genre 필드로 케이스 목록 해시태그를 자동 생성하는 함수)는 master-parser.mjs에서 `app/gm/structured-master-converter.ts`로 옮겨서 살렸다 — pending-cases 자동 로드 경로가 여전히 쓴다.

## 자동 케이스 생성 루틴 (Claude Code Routine, 이 세션 밖에서 별도 실행 중)

`data/pending-cases/`에 새 `CASE1xx`가 이 세션과 무관하게 계속 늘어나는 이유 — 사용자가 별도로 설정해둔 Claude Code 루틴이 아래 스펙으로 주기적으로 새 사건을 생성해 커밋·PR·머지까지 자동으로 처리한다:

1. `case_master.schema.json` 형식에 맞는 사건 하나를 생성. `case_id`는 `npm run next:case-id`가 고른다 — **가장 작은 빈 번호, 없으면 최댓값 + 1**이다(2026-09 결정). 번호가 곧 플레이 순서라(`sortCaseSummaries`가 미착수 그룹을 번호순으로 정렬한다) 서로 너무 닮은 사건을 뒷번호로 옮기고 그 앞자리를 새 사건이 채우는 것이 이 코퍼스의 정리 방식인데, 최댓값+1로는 비운 자리가 영영 비어 있다. `case_registry.json`에 있는 번호는 폴더가 없어도 건너뛴다 — 한 번 쓰인 번호다(`CASE014`가 그렇다. 앱에 내장된 사건이라 `pending-cases`에 없다). 같은 번호를 다른 사건이 물려받아도 옛 저장이 새 사건에 붙지는 않는다 — `app/game.ts`의 `isStateForDifferentCase`가 제목으로 갈라 버린다. `case_registry.json`을 읽어 지금까지 쓰인 등장인물 이름 전체, 최근 3건의 `detective_entry_type`, 배경/트릭 계열과 최대한 겹치지 않게 생성. `detective_entry_type`은 스키마 enum 중 최근 3건과 겹치지 않는 값으로. "다급한 연락을 받고/전화를 받고" 같은 상투적 도입 문장 금지. 그 밖에 생성 단계에서 지켜야 할 것:
   - 동기 원형·배경 계열 중복은 검사기가 코퍼스 비율로만 본다. 임계값은 **10%**다(2026-09에 30%에서 내렸다 — 30%에서는 폭로 동기가 26.7%, 심사·인증 배경이 21.2%까지 차올라도 아무것도 안 걸렸다). 이미 `case_registry.json`에 올라간 사건은 warn, 아직 등록되지 않은 새 사건은 error다 — 루틴은 4단계에서 registry에 올리므로 생성 시점에는 언제나 error다. 임계값이 낮아졌다고 회피 책임이 검사기로 넘어간 것은 아니다. 검사기는 두 골격(폭로 예고 동기, 심사·인증 마감 배경)만 알고, 나머지 반복은 여전히 이 1단계가 막아야 한다.
   - `contradiction_stages`는 `target_character`별로 하나의 사슬이어야 한다. 첫 단계의 `from_stage`는 반드시 문자열 `initial`이고, 각 단계의 `to_stage`가 다음 단계의 `from_stage`와 글자 그대로 같아야 한다. 이 값들은 상태 키지 서술이 아니다 — 짧은 식별자로 쓴다 (예: `initial` → `admits_lending_key` → `admits_presence`).
   - `relationships`는 최소 3개, 서로 다른 인물 쌍, 범인이 낀 관계가 적어도 하나. `nature`/`public_face`는 누구에게 물어도 나오는 공개 정보고, `private_strain`은 인물이 먼저 꺼내지 않는 것(`surfaces_when`이 가리키는 것을 탐정이 실제로 건드렸을 때만 새어 나온다). `private_strain`이 비었거나 `public_face`와 같은 말이면 그 관계는 서사에 아무것도 보태지 않으므로 검사기가 반려한다. 이게 있어야 범인이 아닌 인물의 레드헤링에 무게가 실린다.
   - 같은 위치(`found_at`)에 놓이는 증거 카드들은 서술이 서로 구별되어야 한다. 매체·인물·문장 끝맺음을 공유하면 런타임 유출 검사에 걸려 발견이 막힌다.
   - `opening_scene.detective_entry_time`은 필수다. 탐정이 현장에 들어온 시각이고, 이 사건의 "지금"이다 — 대사 속 오늘·어제·어젯밤이 전부 이 시각을 기준으로 읽힌다. `"<날짜> <시각>"` 형식으로, 날짜는 사건 발생일 기준(`사건 당일`/`사건 다음날`), 시각은 24시간제 숫자(`"사건 당일 22:30"`). **`opening_scene.narrative`가 말하는 때와 반드시 맞아야 한다** — 오프닝이 "이른 아침"인데 진입 시각이 `23:00`이면 그 자체로 모순이다.
   - `actual_timeline`은 시간순으로 배열한다. 마지막 항목이 늘 발견인 것은 아니다 — 은폐나 이튿날 공식 발표처럼 탐정이 이미 도착한 뒤의 일이면 그 항목은 진입 시각보다 뒤에 온다.
   - `ending_scene`은 발견 직후가 아니라 수사에 걸린 시간이 지난 뒤다. 진입 시각부터 장소를 돌고 사람들을 만나는 데 몇 시간이 걸렸으므로, 빛과 공기와 사람들의 상태가 그 시간을 반영해야 한다.
   - 시각은 대사든 서술이든 아라비아 숫자로 쓴다(`"오후 8시 30분"`, `"20시 30분"`). `"여덟 시 반"`처럼 고유어로 풀어 쓰지 않는다 — 시각이 곧 단서라 플레이어가 두 시각을 눈으로 바로 맞춰볼 수 있어야 한다.
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
