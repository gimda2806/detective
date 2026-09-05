# Priorities

1. **게임의 재미.** 정합성은 통과 조건이지 목표가 아니다 — "게임이 안 돌아갈 정도"만 코드/QA로 막고, 나머지는 재미를 얼마나 살리는지로 판단한다.
2. **탐정과 한지우의 캐릭터·티키타카.** 사건이 아무리 잘 설계돼도 둘의 대화가 기능적이면 재미가 안 산다.
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
- Master 생성은 더 이상 이 앱 안에서 하지 않는다 (2026-09, 아래 참고). 새 사건은 외부에서 구조화 JSON으로 작성해 `data/pending-cases/<CASE_ID>/<CASE_ID>.master.json`으로 git에 직접 커밋하면 배포 시 `app/gm/structured-master-converter.ts`가 자동으로 변환해 로드한다. 스키마는 `scripts/case_master.schema.json`, 프롬프트 레퍼런스는 `scripts/case_generation_prompt.md`, 교차참조 검증은 `scripts/validate_master.ts`(커밋 전에 돌려볼 것) 참고.

## 2026-09 결정: 앱 내 Master 생성/업로드 파이프라인 삭제

Master를 이제 외부에서 직접 작성해 git 커밋으로 배포하는 방식으로 바꾸면서, 앱 안에 있던 AI 기반 Master 생성 파이프라인(OpenAI로 CASE9xx 초안을 뽑고 자체 QA하던 것)과 수동 업로드 폼을 통째로 들어냈다. 삭제된 것: `app/CaseGenerator.tsx`, `app/MasterUpload.tsx`, `app/gm/case-generation.ts`, `app/gm/generate-case-job.ts`, `scripts/generate-case.mjs`, `scripts/ingest-case.mjs`, `scripts/lib/master-parser.mjs`(및 그 테스트), `scripts/reference/CASE901.txt`, `scripts/README.md`, `app/actions.ts`의 관련 서버 액션들, D1의 `generation_jobs`/`case_id_reservations` 테이블 생성 코드. `scripts/case_master.schema.json`과 `scripts/validate_master.ts`는 외부 작성 워크플로에서 그대로 쓰이므로 남겨뒀다. `deriveTagsFromGenre()`(genre 필드로 케이스 목록 해시태그를 자동 생성하는 함수)는 master-parser.mjs에서 `app/gm/structured-master-converter.ts`로 옮겨서 살렸다 — pending-cases 자동 로드 경로가 여전히 쓴다.

## 2026-09 결정: 방어 규칙 완화 (되돌리지 말 것)

`master-index.ts`로 실제 Master 데이터가 매 턴 전달되게 된 뒤, 그 전에 환각을 막으려고 넣었던 일부 방어 규칙이 과하게 기계적이라고 판단해서 **의도적으로 완화**했다 (PR #41). 구체적으로 `systemPrompt()`의 `ACTION_SCOPE_RULES`(행동 병합 허용), `OUTPUT_FORMAT_RULES`(짧은 문장 강제 금지), `NPC_KNOWLEDGE_AND_ANSWER_SCOPE_RULES`/`NPC_STATEMENT_DISCIPLINE_RULES`(허용 범위 안에서 자연스러운 연결 허용) 네 곳.

**이후 세션에서 이 네 규칙 근처를 다시 손대야 하는 상황(예: 다시 환각/턴 낭비가 보고돼서 규칙을 더 엄격하게 되돌리고 싶어지는 경우)이 오면, 조용히 되돌리지 말고 먼저 사용자에게 알릴 것.** 이건 실플레이 로그 기반 버그 수정이 아니라 명시적 사용자 요청으로 완화한 것이므로, 재수정 여부도 사용자 판단을 거쳐야 한다.
