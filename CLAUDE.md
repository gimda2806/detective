# Priorities

1. **게임의 재미.** 정합성은 통과 조건이지 목표가 아니다 — "게임이 안 돌아갈 정도"만 코드/QA로 막고, 나머지는 재미를 얼마나 살리는지로 판단한다.
2. **탐정과 한지우의 캐릭터·티키타카.** 사건이 아무리 잘 설계돼도 둘의 대화가 기능적이면 재미가 안 산다.
   한지우는 **남자**이고 탐정과는 **브로맨스 파트너**다(2026-09 사용자 결정). 오래 같이 일해서 서로 설명이 필요 없는 두 남자의 덤덤한 친밀함 — 애틋한 말보다 짧은 농담·핀잔·묵묵히 옆에 있는 방식으로 드러난다. `그녀`/여성 표현으로 쓰지 않는다. 말투는 **비대칭 유지**: 탐정은 한지우에게 반말, 한지우는 탐정에게 반존대(`-요`), 다른 인물에게는 둘 다 존댓말. 이 비대칭은 명시적으로 유지 결정된 것이므로 "브로맨스니까 서로 반말로" 식으로 조용히 바꾸지 말 것.
3. 나머지 (Master 생성 파이프라인 정합성, 비용 최적화 등)는 위 둘을 해치지 않는 선에서만 손본다.

## 근거

CASE017 실플레이 로그로 반복 확인된 것: 실제로 재미를 죽이는 지점은 거의 항상 **Master(사건 생성) 문제가 아니라 GM 런타임 문제**였다.

- 화자 드리프트(다른 사람이 대답), "수사 기록에 확정해 넣지 않는다" 같은 시스템 문구 유출, 기록 조회가 record_review로 분류조차 안 돼 막힘, 플레이어가 스스로 찾은 모순을 GM이 지어낸 설명("최신 장비라 가능하다")으로 봉합 — 전부 런타임(`app/game.ts`, `app/gm/*.ts`) 문제였고, Master 자체엔 이미 답이 있었다.
- 반대로 present_location/found_at 3중 불일치처럼 진짜 Master 생성 문제였던 것도 있었지만, 비율로는 소수다.

그러니 다음 문제가 보이면: **Master를 더 정교하게 만들기 전에, GM 런타임이 이미 있는 Master 정보를 제대로 못 꺼내 쓰고 있는 건 아닌지부터 의심한다.**

## 관련 코드

- `app/game.ts`의 `systemPrompt()` — 한지우 캐릭터 정의, 모순 봉합 금지 규칙 등 런타임 GM 지시문
- `app/gm/jiwoo-examples.ts` — 한지우 톤 레퍼런스
- `app/gm/response-signals.ts` — 응답 검증/재시도 위반 목록 (화자 드리프트, 모순 봉합, 정보 유출 등을 코드로 잡는 백스톱)
- `app/gm/master-index.ts` — Master `raw_text`의 LOCATIONS/CHARACTERS/CONTRADICTION_STAGES/RED_HERRINGS를 런타임에 파싱해서 `buildActionScopedMaster()`가 매 턴 실제 위치·NPC 규칙(`current_location_rules`/`current_npc_knowledge`/`contradiction_stages`)을 GM에게 넘기게 하는 모듈. **CASE059/CASE171 환각(가짜 CCTV 서브플롯, 엉뚱한 위치에서 발견 등)의 진짜 근본 원인**이 여기 있었다 — 이 모듈이 생기기 전에는 일반 플레이 턴에 raw_text가 아예 전달되지 않아서, 모델이 위치 한 줄 설명 말고는 참고할 실제 데이터가 없었다.
- Master 생성은 더 이상 이 앱 안에서 하지 않는다 (2026-09, 아래 참고). 새 사건은 외부에서 구조화 JSON으로 작성해 `data/pending-cases/<CASE_ID>/<CASE_ID>.master.json`으로 git에 직접 커밋하면 배포 시 `app/gm/structured-master-converter.ts`가 자동으로 변환해 로드한다. 스키마는 `scripts/case_master.schema.json`, 프롬프트 레퍼런스는 `scripts/case_generation_prompt.md`, 검증은 `npm run check:case <CASE_ID>`(커밋 전에 돌려볼 것) — `scripts/validate_master.ts`의 교차참조 검증과 `scripts/audit-evidence-leak.ts`의 런타임 유출 검사를 함께 돌린다.

## 2026-09 결정: 앱 내 Master 생성/업로드 파이프라인 삭제

Master를 이제 외부에서 직접 작성해 git 커밋으로 배포하는 방식으로 바꾸면서, 앱 안에 있던 AI 기반 Master 생성 파이프라인(OpenAI로 CASE9xx 초안을 뽑고 자체 QA하던 것)과 수동 업로드 폼을 통째로 들어냈다. 삭제된 것: `app/CaseGenerator.tsx`, `app/MasterUpload.tsx`, `app/gm/case-generation.ts`, `app/gm/generate-case-job.ts`, `scripts/generate-case.mjs`, `scripts/ingest-case.mjs`, `scripts/lib/master-parser.mjs`(및 그 테스트), `scripts/reference/CASE901.txt`, `scripts/README.md`, `app/actions.ts`의 관련 서버 액션들, D1의 `generation_jobs`/`case_id_reservations` 테이블 생성 코드. `scripts/case_master.schema.json`과 `scripts/validate_master.ts`는 외부 작성 워크플로에서 그대로 쓰이므로 남겨뒀다. `deriveTagsFromGenre()`(genre 필드로 케이스 목록 해시태그를 자동 생성하는 함수)는 master-parser.mjs에서 `app/gm/structured-master-converter.ts`로 옮겨서 살렸다 — pending-cases 자동 로드 경로가 여전히 쓴다.

## 자동 케이스 생성 루틴 (Claude Code Routine, 이 세션 밖에서 별도 실행 중)

`data/pending-cases/`에 새 `CASE1xx`가 이 세션과 무관하게 계속 늘어나는 이유 — 사용자가 별도로 설정해둔 Claude Code 루틴이 아래 스펙으로 주기적으로 새 사건을 생성해 커밋·PR·머지까지 자동으로 처리한다:

1. `case_master.schema.json` 형식에 맞는 사건 하나를 생성. `case_id`는 `data/case_registry.json`의 기존 최댓값 + 1(이미 있으면 그다음 값). `case_registry.json`을 읽어 지금까지 쓰인 등장인물 이름 전체, 최근 3건의 `detective_entry_type`, 배경/트릭 계열과 최대한 겹치지 않게 생성. `detective_entry_type`은 스키마 enum 중 최근 3건과 겹치지 않는 값으로. "다급한 연락을 받고/전화를 받고" 같은 상투적 도입 문장 금지. 그 밖에 생성 단계에서 지켜야 할 것:
   - 동기 원형·배경 계열 중복은 검사기가 코퍼스 비율(30% 임계)로만 보기 때문에 코퍼스가 커질수록 안 잡힌다. 회피는 검사기가 아니라 이 1단계의 책임이다.
   - `contradiction_stages`는 `target_character`별로 하나의 사슬이어야 한다. 첫 단계의 `from_stage`는 반드시 문자열 `initial`이고, 각 단계의 `to_stage`가 다음 단계의 `from_stage`와 글자 그대로 같아야 한다. 이 값들은 상태 키지 서술이 아니다 — 짧은 식별자로 쓴다 (예: `initial` → `admits_lending_key` → `admits_presence`).
   - 같은 위치(`found_at`)에 놓이는 증거 카드들은 서술이 서로 구별되어야 한다. 매체·인물·문장 끝맺음을 공유하면 런타임 유출 검사에 걸려 발견이 막힌다.
   - `opening_scene.detective_entry_time`은 필수다. 탐정이 현장에 들어온 시각이고, 이 사건의 "지금"이다 — 대사 속 오늘·어제·어젯밤이 전부 이 시각을 기준으로 읽힌다. `"<날짜> <시각>"` 형식으로, 날짜는 사건 발생일 기준(`사건 당일`/`사건 다음날`), 시각은 24시간제 숫자(`"사건 당일 22:30"`). **`opening_scene.narrative`가 말하는 때와 반드시 맞아야 한다** — 오프닝이 "이른 아침"인데 진입 시각이 `23:00`이면 그 자체로 모순이다.
   - `actual_timeline`은 시간순으로 배열한다. 마지막 항목이 늘 발견인 것은 아니다 — 은폐나 이튿날 공식 발표처럼 탐정이 이미 도착한 뒤의 일이면 그 항목은 진입 시각보다 뒤에 온다.
   - `ending_scene`은 발견 직후가 아니라 수사에 걸린 시간이 지난 뒤다. 진입 시각부터 장소를 돌고 사람들을 만나는 데 몇 시간이 걸렸으므로, 빛과 공기와 사람들의 상태가 그 시간을 반영해야 한다.
   - 시각은 대사든 서술이든 아라비아 숫자로 쓴다(`"오후 8시 30분"`, `"20시 30분"`). `"여덟 시 반"`처럼 고유어로 풀어 쓰지 않는다 — 시각이 곧 단서라 플레이어가 두 시각을 눈으로 바로 맞춰볼 수 있어야 한다.
2. 생성한 JSON을 `data/pending-cases/<CASE_ID>/<CASE_ID>.master.json`으로 저장하고 `npm run check:case <CASE_ID>`로 검증. 종료 코드가 0이 아니면 실패로 본다. 이 명령은 `validate_master.ts`(교차참조·개수·중복·단계 사슬)와 `audit-evidence-leak.ts`(런타임 유출 검사기 재현)를 함께 돌린다.
3. 에러가 있으면 해당 필드만 고쳐 재검증 (전체 재생성 금지, 필드별 수정 최대 3회). 고친 뒤에는 `npm run check:case`를 전체로 다시 돌린다 — 한 카드의 서술을 바꾸면 같은 방의 다른 카드와 새 충돌이 생길 수 있다.
4. 통과하면 `case_registry.json`에 이번 case_id·인물명·entry_type·배경·트릭 계열을 추가하고, 새 브랜치에 커밋해 PR을 열고 메인으로 머지.
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
