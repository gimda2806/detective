# 이 저장소에서 일하는 법

경위·실측치·실플레이 근거는 `docs/decisions-log.md`에 있다. 여기는 **결정과 규칙**만 적는다.
규칙을 바꾸면 여기와 그 규칙을 강제하는 검사기·문서를 같이 고치고, 경위는 로그에 절을 더한다.

**지금은 오프라인이 중심이다**(2026-09-24 사용자). AI 경로(`/`)는 거의 안 쓰고 오프라인(`/offline`)을
플레이한다. 그래서 규칙은 세 갈래로 적는다 — **① 마스터 규칙(공통)**: 두 경로가 같은 마스터 파일을
읽으므로 파일이 담아야 할 것. **② 오프라인 GM**: 엔진·판본·그 검사. **③ AI GM**: 모델을 어떻게
지시하는가. 새 규칙을 적을 때는 이 셋 중 어디인지 먼저 정한다 — 마스터 파일이 담아야 할 것이면 ①,
엔진이나 판본 이야기면 ②, 프롬프트 이야기면 ③. 검사기도 같다: 원본에 도는 검사는 ①, `.offline.json`에만
도는 검사는 ②. 오프라인은 마스터의 빈틈을 못 메우므로 ②가 ①보다 늘 엄격하다.

## 우선순위

1. **게임의 재미.** 정합성은 통과 조건이지 목표가 아니다 — 「게임이 안 돌아갈 정도」만 코드·검사로 막는다.
2. **탐정과 한지우의 티키타카.** 한지우는 **남자**이고 탐정과는 **브로맨스 파트너**다(2026-09 사용자 결정). 오래 같이 일해 설명이 필요 없는 두 남자의 덤덤한 친밀함 — 짧은 농담·핀잔·묵묵히 옆에 있는 방식. `그녀`·여성 표현 금지. 말투는 **비대칭 유지**: 탐정→한지우 반말, 한지우→탐정 반존대(`-요`), 다른 인물에게는 둘 다 존댓말. 「브로맨스니까 서로 반말」로 조용히 바꾸지 말 것. 오프라인에서 두 사람의 말은 엔진의 대사 풀에서 나온다.
3. 나머지(생성 파이프라인 정합성, 비용)는 위 둘을 해치지 않는 선에서만.

## 세션 시작·끝

- **시작하면 `docs/handoff.md`와 `docs/handoff/`부터 읽는다.** 여러 세션과 루틴이 같은 저장소를 고친다. 끝낼 때는 상대 작업에 영향이 가는 변경을 쪽지로 남기고, 상대가 남긴 것을 처리했으면 그 블록을 지운다(지우는 것이 「받았다」는 신호).
- 회차 작업(소설·판본·이주)을 시작할 때는 ① `git fetch` ② README 한 줄이 아니라 **실제 파일 목록**(`ls docs/novels/`·`ls data/pending-cases/`) ③ `docs/handoff/`의 남은 쪽지 — 이 순서로 본다. 겹쳐 쓴 사고 다섯 건이 전부 이 셋 중 하나를 건너뛰어서 났다.
- 세션 간 충돌은 사람이 옮기지 않는다. PR 검사(`.github/workflows/pr-checks.yml`: tsc · oxlint 기준선 · build · 바뀐 마스터의 `check:case`와 `check:offline`)와 충돌 감시 루틴(`docs/conflict-watch-routine.md`)이 맡는다. 오프라인 판본(`Case-No-*.offline.json`)도 폴더 이름으로 같은 id에 모여 검사받는다.
- 코드를 고쳤으면 `graphify update .`(설치돼 있을 때). 코드베이스 질문은 `graphify query`부터.

## ① 마스터 규칙 — 두 경로가 같은 파일을 읽는다

새 사건은 외부에서 JSON으로 써서 `data/pending-cases/<ID>/<ID>.master.json`으로 커밋한다. 스키마 `scripts/case_master.schema.json`, 작성 스펙 `scripts/case_generation_prompt.md`(새 사건을 쓰는 세션은 먼저 읽는다), 검증 `npm run check:case <ID>`. 앱 안의 생성·업로드 파이프라인은 지웠다.

**방향 — 장소 수색에서 인물 관계·서사로**(2026-09 결정)

- 마스터의 이야기가 데이터로 있어야 한다: 누가 누구에게 무엇을 빚졌고 어떤 사이가 틀어졌는지 → `relationships`(스키마 `required`; 검사기는 등록된 사건 warn·새 사건 error). **관계도의 중심은 피해자다** — 범인 하나만 무거우면 관계도 모양이 범인을 흘린다(`RELATIONSHIPS_CULPRIT_HUB`·`RELATIONSHIPS_ORPHAN_CHARACTER`). `private_strain`의 주어는 감추는 쪽 본인이다(`strainSubject`).
- 범인이 아닌 사람들의 레드헤링이 더 중요하다.
- 플레이어는 공간을 볼 수 없다. 장소 서술은 목록이 아니라 **상대적인 자리**를 문장에 담는다. `detail_rules` 목적어의 밑줄·돋보기 표식(`examinableTargetsHere`)은 놓친 것을 줍는 장치이지 서술을 대신하지 않는다.
- **직제(조직도)를 따로 세우지 않는다.** `tier`/`reports_to` 제안은 실측으로 기각됐다. 다시 제안하지 말 것.

**대립 단계의 질문은 거짓 진술, 답은 카드.** `requires_comparison.claim_id`는 그 사람의 S- lie이고 `requires_heard_claim_ids`에 있어야 한다(`STAGE_COMPARISON_NOT_LIE`, 원본·판본 모두 error). **단계의 요구 카드는 비교 카드와 같다** — 비교에 없는 카드를 요구에 끼우지 않는다(`STAGE_REQUIRES_BEYOND_COMPARISON`, 원본·판본 모두 error). 인정한 사실 뒤에 붙는 변명은 S- lie로 적고 그 사실에 `hidden_until`로 잠근다. 단계가 진술(S-)을 직접 내주는 모양도 된다(그 id로 본문을 쓴다). **단계가 내주는 진술은 그 단계의 질문이 아니라 다음 단계의 질문이다.** 규칙 본문은 `docs/offline-master-format.md` 「단계」 절.

**데이터 모양이 범인을 흘리지 않게.** 진범과 같은 `voice_profile.stance`를 가진 인물이 하나는 있어야 한다(`STANCE_CULPRIT_TELL`). 진범이 CH01에 쏠린 것은 `npcs`를 이름순으로 세워 화면에서 가렸다 — **`CH##`를 다시 매기지 말 것**(사방의 id가 그것을 문다).

**검사기 규칙**

- `npm run check:case <ID>`는 셋을 돌린다 — `validate_master.ts`(교차참조·비율·단계 사슬), `audit-converter-coverage.ts`(마스터 값이 `raw_text`까지 도달하는가), `audit-evidence-leak.ts`. 가운데 것이 걸리면 마스터가 아니라 변환기(`structured-master-converter.ts`)를 고친다. **스키마에 필드를 더하면 변환기 방출과 `master-index.ts` 파싱을 같이 고친다.** **`check:case`는 JSON 스키마를 돌리지 않는다** — 스키마의 `required`·설명문은 아무것도 막지 않는다.
- **새로 넣는 검사는 warn으로 두지 않는다**(2026-09-21 사용자 결정). 기본은 등록 여부와 무관한 error이고 걸리는 마스터는 그 자리에서 고친다. warn으로 두려면 먼저 사용자 승인. 읽는 사람 없는 경고는 부채를 세는 일일 뿐이다.
- 이미 있던 코퍼스 비율 검사·뼈대 검사는 **등록된 사건 warn·새 사건 error**. **은폐 두 축(`COVER_UP_TARGET_OVERUSE`·`COVER_UP_METHOD_OVERUSE`)만은 고정 8%가 아니라 칸당 기대치(사건당 평균 라벨 수 ÷ 칸 수) 대비 배수로 센다** — 1.5배 warn, 2배 새 사건 error(2026-09-26 사용자 결정. 칸이 14·20개라 8%가 평균 점유 미만이었고, 그래서 생성 루틴이 `other`로 도망갔다). 짝 검사(`COVER_UP_PAIR_OVERUSE`)는 8% 그대로. 예외로 등록 여부와 무관하게 error인 것: `UNKNOWN_ARCHETYPE_KEY`·`LEGACY_ARCHETYPE_KEY`·`CASE_COMPLETE_UNREACHABLE`·`SETTING_DEADLINE_DISCOVERY_TEMPLATE`·`STAGE_KEY_IS_OWN_TESTIMONY`·`PAIR_TWIN`·`STAGE_COMPARISON_NOT_LIE`·`STAGE_REQUIRES_BEYOND_COMPARISON`.
- 마스터를 손으로 고칠 때 id를 타이핑하지 않는다 — `npm run ids <ID>`(대응표) · `npm run ids <ID> <이름>` · `npm run ids <ID> fix`(`red_herrings[].character_id`). 손으로 고쳤으면 `npm run build:source <ID>`도 다시 돌린다(소스 문서는 쓰기 위한 재료다).
- 아키타입 칸에 안 맞으면 `other`로 적고 `docs/archetype-gaps.md`에 한 줄 — 가장 가까운 칸에 억지로 밀어 넣으면 남의 경고를 만들고 새 칸이 필요하다는 신호는 사라진다(두 번 잃는다). 경고를 없애려고 칸을 내리지 않는다. 표에 없는 키를 지어내지 말 것(옛 이름은 `LEGACY_*` 표가 옮겨 세고 `LEGACY_ARCHETYPE_KEY`가 막는다).
- 같은 문장을 돌려 쓴 자국은 `npm run audit:duplication`. 목록을 들고 일괄 치환하지 말 것 — 그 사건을 다시 쓸 때 같이 고친다.
- 마스터 포맷 부채는 `npm run audit:format`이 센다. 막힌 사건은 `사전 오류로 막힌 사건: 열린 목록` 이슈 하나에 모은다.
- `next:case-id`는 가장 작은 빈 번호(registry에 있던 번호는 건너뛴다). 번호가 곧 플레이 순서다.
- 판박이는 고쳐 쓰지 않고 뒷번호를 지운다(`PAIR_TWIN`·`RANGE_TWIN`·`SETTING_DEADLINE_DISCOVERY_TEMPLATE`로 그렇게 했다). 지운 번호를 코드가 문자열로 물고 있어도 실플레이 근거 주석이면 그대로 둔다.

**배포.** 사건 데이터는 Worker 번들 밖에 있다. `scripts/build-case-assets.ts`(`npm run build:cases`, dev/build가 먼저 돌린다)가 `public/cases/<hash>.json`과 `app/generated/case-index.json`을 만든다. **파일 이름이 내용의 해시인 것은 방어선이다** — 사건 id로 된 URL이면 진범이 샌다. `app/gm/case-envelope.ts`의 요약·태그 규칙(`deriveCaseTags()`는 `case_identity.tags`를 읽는다)을 빌드 스크립트에 다시 구현하지 말 것.

## ② 오프라인 GM — 지금의 중심

`/offline`은 모델을 부르지 않는다. 규칙표가 대답하고 플레이어는 마스터가 허락한 행동에서 고른다. **마스터에 안 적힌 것은 오프라인에 없다** — AI 경로는 빈틈을 즉흥으로 메우지만 이쪽은 못 메운다. 그래서 ①에 더해 아래가 붙는다.

**코드**

- `app/gm/offline-engine.ts` — 메뉴 `buildOfflineActionMenu`·실행 `runOfflineAction`. 행동 id 접두사 `move`/`observe`/`inspect`/`probe`/`talk`/`summon`/`victim`/`alibi`/`relation`/`strain`/`ask`/`echo`/`recall`/`present`/`hypothesis`/`leave`/`close`. 두 사람의 대사는 엔진 안의 풀에서 나온다.
- `offline-session.ts`(턴 조립, `app/game.ts`에서 import 금지) · `offline-hypothesis.ts`(가설 보드) · `offline-summon.ts`(면담한 사람 한 명만 데려온다) · `app/offline/`(화면·서버 액션, `app/actions.ts`와 일부러 가른 파일). 저장은 같은 테이블의 다른 행(`CASE142::offline`).
- **`app/gm/offline-*.ts`를 건드렸으면 `npm run check:offline`** — 전수를 무식한 플레이어로 완주시킨다. 여기서 막히는 사건은 영영 못 깨는 사건이고 번호가 곧 막이라 플레이어가 갇힌다. id를 인자로 주면 그 사건만, 없는 id를 주면 선다. 대사 풀을 손댔으면 `npm run check:banter`.

**판본 — 오프라인 전용 마스터**

- `data/pending-cases/<ID>/Case-No-<NNN>.offline.json`이 있으면 오프라인만 그것을 보고 AI 경로·목록 화면은 원본을 본다. **판본이 몇 건인지는 문서에 적지 않는다** — `ls data/pending-cases/*/Case-No-*.offline.json`이 센다(2026-09-26 사용자 결정. 적어 둔 수가 두 번 낡았다).
- **포맷 기준은 `docs/offline-master-format.md`.** 규칙은 그 문서를 고치고, 검사기를 맞추고, 벗어난 판본을 고친다(이 순서). 필수 표(`points_finger`·`comic_tell`·`knowledge_limits`·`points_at`·`mismatch`·헛다리 `weight`·`access_level`·`connects_to`·보드 `motives`/`times`/`methods`)와 대사 모양(말 필드는 맨문장, 지문 필드는 3인칭, 증언 카드만 따옴표)이 거기 있고, `.offline.json`에만 붙는 검사(`checkOfflineSkeleton`·`checkOfflineSpeech`)가 강제한다.
- 소설이 먼저 있는 번호는 `docs/novels/<ID>.md` 끝의 「오프라인으로 옮길 것」이 판본의 설계도다(CASE012가 첫 예). 원본은 건드리지 않는다. **판본을 만든 PR이 판본 노트 `Case-No-<NNN>.offline.md`(판본 파일 옆)를 같이 쓴다**(2026-09-26 사용자 결정 — 소설 루틴의 일이 아니고 소설에 덧붙이지 않는다. 소설 끝에는 가리키는 한 줄만).
- 판본 뼈대 검사(`SUSPICION_THIN`·`TESTIMONY_ALL_AT_CULPRIT`/`TESTIMONY_AIM_NARROW`·`MOTIVE_SELF_DISCLOSURE`)는 `evidence[].points_at`을 쓰는 마스터에만 듣는다 — 헛다리 주인을 가리키는 카드가 둘, 증언의 진범 지목은 절반 이하, 자기 동기는 본인 입에서 먼저 나오지 않는다.

**놀이 규칙**

- **가설 보드**(누가·언제·왜·어떻게): `motives`/`times`/`methods`가 있는 사건에서만 켜지고, **네 칸이 다 굳어야 증거 제시와 대립 단계가 함께 열린다**(`actTwo`). 1막은 고르는 막, 2막은 내미는 막. **가설 제시와 증거 제시는 갈라져 있다**(2026-09-25 사용자 결정): 사람에게 들이대면(`press`) 그 사람의 반박이나 부인만 받고 카드는 안 본다 — 정답과 남의 몫인 오답이 같은 모양으로 들려야 한다. 굳히는 것은 보드의 「굳힌다」(`confirm`)이고 거기서만 손에 든 카드(`evidence_for`)를 본다(`judgeConfirm`). 「누가」는 본인에게만·한 번만, 접히지 않는다. **1막의 화폐는 말**: 후보는 떠올리게 하는 재료(`suggested_by`, 들은 말 F-/S- 기본·카드 E 가능)가 수첩에 닿아야 적고 들이댈 수 있다(`candidateLocked`). 재료 중 하나는 1막에서 들을 수 있어야 한다(`BOARD_SUGGESTER_ACT2_ONLY`). 판본 전부 이어져 있고 `BOARD_SUGGESTER_*`가 지킨다. 대립 단계의 `release`는 `hidden_until`로 새어 나오지 않는다(`unlockedByGate`). 근거: `docs/offline-deduction.md`.
- **변명 진술**: 엔진(`excuseClaimsFor`)이 단계 돌파 턴에 인정과 함께 그 사실에 잠긴 S- lie를 그 사람 입으로 내주고 다음 단계가 그것을 질문으로 건다.
- **관계**: `surfaces_when` 문장 안의 괄호 id가 전부 도달했을 때만 두 번째 박자(「사이를 다시 묻는다」)가 열린다(`strainReady`). id가 없는 관계는 닫아 둔다.
- **`points_finger`는 보기가 아니라 관계 질문 뒤에 새어 나온다**(2026-09-24 사용자 결정). 「○○과 어떤 사이였는지 묻는다」의 답 뒤에 상대가 `at`이면 붙는다(`pendingFinger`, 관계 문이 먼저 닫혔으면 `opens`가 들리는 턴 말끝). `says`는 질문의 답이 아니라 사이 얘기 끝에 새는 험담 모양으로 쓴다. 엔진은 판정하지 않고 한지우는 받아 적기만 한다. 카드 제시나 오답 반응에 얹는 안은 택하지 않았다(로그).
- **헛다리**: 1막 「누가」 지목은 `how_to_clear`의 카드가 다 제시됐을 때만 헛다리를 터뜨리므로 남의 카드가 낀 헛다리는 1막에서 안 터진다 → **`suspect_refutations`는 진범을 뺀 전원**이 갖는다. `how_to_clear`는 해소 카드만 부르고 의심 카드는 `suspicion_deepener`에 적는다. `detail_rules[].requires`에 대립 단계(`C##`)를 걸지 않는다(완주 검사기가 2막에서 방을 다시 뒤지지 않는다).

**막간과 막**(2026-09 사용자 결정)

- 막간(`app/interludes.ts`)은 1건, 그 뒤 5건마다 한 편 열리는 사건 밖 한 문단 — 사건 사실은 한 줄도 쓰지 않는다.
- 막(`app/gm/case-gate.ts`)은 번호순 앞 N편만 연다: 처음 1편 → 6 → 11 → 16. 앞 막의 것은 불러도 되고 같은 막 안의 사건끼리는 서로 부르지 않는다. 둘 다 저장 상태 없이 `listCases`에서 파생한다.
- 한 막에 못 깨는 사건이 하나라도 있으면 플레이어가 갇힌다 — **`check:offline` 전건 완주가 이 게이트의 안전선이다.**

## ③ AI GM — 지금은 거의 안 쓴다

마스터를 읽고 모델이 말을 짓는 경로다. 규칙은 그대로 살아 있고 검사도 돌지만, 새 작업의 무게는 ②에 둔다.

- `app/game.ts` `systemPrompt()` — 한지우 캐릭터·모순 봉합 금지 등 지시문. `nextHint()` — 힌트 사다리(그 단계의 카드를 한 번 내밀어 본 경우에만 대립 칸이 순서를 앞지른다). `computeCaseProgress` — 진행도 사다리에 `heard_statements` 칸이 있어야 `knows` 사실이 켜진다.
- `app/gm/master-index.ts` — `raw_text`의 12개 섹션을 파싱해 매 턴 실제 위치·NPC 규칙을 GM에게 넘긴다(`buildActionScopedMaster`). `private_strain`·`surfaces_when`은 앞에 앉은 인물이 낀 관계에만 싣는다. **`CASE_IDENTITY`·`FULL_TRUTH`는 안 읽는다** — `genre`·`setting`·`tone`·`detective_entry`와 `full_truth` 산문은 쓰기 위한 재료다.
- `app/gm/jiwoo-examples.ts` — 한지우 톤 레퍼런스. `app/gm/response-signals.ts` — 화자 드리프트·모순 봉합·정보 유출을 잡는 백스톱.
- **첫 의심은 런타임.** 이 경로에서 재미를 죽인 자리는 거의 항상 마스터가 아니라 런타임이 이미 있는 값을 못 꺼내 쓴 것이었다(화자 드리프트, 시스템 문구 유출, 힌트 사다리 순서, 진행도의 빠진 칸). 마스터를 정교하게 만들기 전에 런타임부터 의심한다.

## 이 세션 밖에서 도는 루틴

- **생성 루틴** — `data/pending-cases/`에 새 사건을 만들어 PR·머지까지. 스펙은 `scripts/case_generation_prompt.md`. 다섯 단계: 생성(`next:case-id`, `recent:avoid`) → `check:case` → 실패한 필드만 고쳐 재검증(전체 재생성 금지, 필드별 3회) → `build:source`·`case_registry.json` 등록·PR → 막히면 이슈 하나에 모으고 중단.
- **이주 루틴** — 옛 마스터를 지금 스키마로. 지침 `docs/master-format-migration.md`. 빠진 필드를 채우는 것이지 사건을 다시 쓰는 것이 아니다. 5건씩.
- **소설 루틴** — `docs/novels/`에 번호순 5편씩. 지침 `docs/novels/README.md`(회차 기록은 `rounds.md`, 되먹일 목록은 `feedback.md`로 갈랐다 — 2026-09-26), 검사 `npm run check:novel`. 런타임은 읽지 않는다. 판본의 설계도다. 겹쳐 쓴 판본(`-ver2`)은 어느 쪽도 지우지 말 것.
- **충돌 감시 루틴** — `docs/conflict-watch-routine.md`. 코드를 고치거나 푸시하지 않는다.
- **판본 루틴**(2026-09-26 사용자 결정) — 오프라인 판본을 **번호순으로, 다음 막에 비는 번호만** 만든다. 지침 `docs/offline-version-routine.md`, 입력은 `npm run audit:offline`(원본이 오프라인 필수 표를 얼마나 갖췼는지 번호순으로 세고 다음 게이트까지 비는 번호를 찍는다. 판본이 있으면 판본을 본다). 한 회차 한 번호, 원본은 건드리지 않고, 판본 노트를 같이 쓴다. 새 원본이 오프라인 완제품으로 태어나게 하는 것(생성 스펙 + 새 원본 error)은 아직 결정 전이다.
- **시각 되먹임 루틴**(2026-09-24 사용자 결정) — 소설이 메운 시각을 마스터 `actual_timeline`으로. 지침 `docs/novel-time-feedback-routine.md`, 입력은 `check:novel`의 `TIME_NOT_IN_MASTER`(257개, 2026-09-26)를 많은 편부터 5편씩. **되먹이는 방법은 소설 루틴에 이미 있어 다시 쓰지 않았다** — 없던 것은 차례다(`docs/novels/feedback.md`가 「그 번호를 나중에 다시 쓸 때」를 전제로 쓰여 있는데 그 시점이 대부분의 번호에는 오지 않는다). 시각만은 그 조건 없이 지금 되먹일 수 있다 — `actual_timeline`의 빠진 칸은 두 경로가 같이 읽는 **원본의 결함**이고 소설이 자리를 짚어 뒀다(CASE008의 21:03: `T10`이 21:00에 제다실 `L03`에서 다호에 섞었다는데 다호는 마당 건너 `L02`다). 근거 없이 지어낸 `TIME_UNRECORDED` 62개는 같은 편을 여는 김에 적든지 뺀다.

## 되돌리지 말 것

- 한지우 말투 비대칭, 직제 미도입, 막 게이트 1→6→11, 근거 카드 걸기 삭제, 지목 버튼 삭제, 오프라인 중심 — 전부 사용자 결정이다.
- (AI GM) `systemPrompt()`의 `ACTION_SCOPE_RULES`·`OUTPUT_FORMAT_RULES`·`NPC_KNOWLEDGE_AND_ANSWER_SCOPE_RULES`/`NPC_STATEMENT_DISCIPLINE_RULES` 완화(PR #41)는 명시적 사용자 요청이다. 다시 엄격하게 하고 싶으면 먼저 사용자에게 알린다.

## graphify

graphify 가 설치돼 있으면 `graphify-out/`에 지식 그래프가 있다(빌드 산출물이라 저장소에는 없다 — `.gitignore`). 없으면 이 절은 건너뛴다. 코드베이스 질문은 `graphify query "<질문>"`부터, 관계는 `graphify path`, 개념은 `graphify explain`. `graphify-out/wiki/index.md`가 있으면 넓은 탐색은 그것으로. `GRAPH_REPORT.md`는 전체 구조를 볼 때만. 코드를 고쳤으면 `graphify update .`.
