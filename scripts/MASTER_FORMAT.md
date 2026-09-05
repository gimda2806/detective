# 마스터(Master) 서식 가이드

이 문서는 CASE901 스타일 마스터 텍스트(사건 정답지)의 공식 서식 스펙입니다.
지금까지는 이 내용이 세 곳에 흩어져 있었습니다 — 실제 예시
(`scripts/reference/CASE901.txt`), 파서/검증 코드
(`scripts/lib/master-parser.mjs`), 생성 프롬프트
(`scripts/generate-case.mjs`의 `buildGenerationInstructions`). 이 문서는 그
세 가지를 한 곳에 정리한 것이며, 실제 진실의 소스는 여전히 그 파일들입니다 —
서식이 바뀌면 이 문서도 같이 갱신해야 합니다.

마스터는 플레이어에게 절대 노출되지 않는 서버 전용 텍스트입니다.
`app/game.ts`는 이 텍스트 전체를 `master.raw_text`로 GM 프롬프트에 그대로
넘기고, `scripts/lib/master-parser.mjs`는 그중 구조화가 필요한 최소한만
(`locations`/`npcs`/`cards`, 그리고 몇 가지 정합성 검사) 파싱합니다.

## 1. 전체 구조 규칙

- 최상위 섹션은 `[SECTION_NAME]` 형태의 줄로만 구분합니다. **닫는 태그
  (`[/SECTION_NAME]`)는 쓰지 않습니다.** (참고: `app/game.ts`의 예전
  `parseTxtMaster`는 닫는 태그를 요구하는 다른 포맷이라 이 서식을 읽지
  못합니다 — 이 서식은 JSON 업로드 경로로만 들어갑니다.)
- 섹션은 정확히 아래 순서·이름으로 13개입니다:

  ```
  CASE_IDENTITY → OPENING_SCENE → SURFACE_INCIDENT → FULL_TRUTH →
  ACTUAL_TIMELINE → CHARACTERS → LOCATIONS → EVIDENCE →
  CONTRADICTION_STAGES → RED_HERRINGS → CASE_COMPLETE →
  FINAL_DEDUCTION → ENDING_EXPLANATION
  ```

- 일부 섹션(`ACTUAL_TIMELINE`, `CHARACTERS`, `LOCATIONS`, `EVIDENCE`,
  `CONTRADICTION_STAGES`, `RED_HERRINGS`)은 그 안에 `[XXNN]` 형태의 하위
  블록을 가집니다. 접두어는 섹션마다 고정: `T`(타임라인), `CH`(인물),
  `L`(장소), `E`(증거), `C`(모순 단계), `R`(오답 서브플롯). 번호는
  `01`, `02`… 두 자리 0패딩입니다.
- 필드는 `key: value` 한 줄 또는 `key:` 다음 줄에 `* 항목` 불릿 목록으로
  씁니다. 파서(`readField`/`readBulletsAfter`)는 이 두 형태만 인식합니다.

## 2. 섹션별 상세

### `[CASE_IDENTITY]`

```
case_no: 901
case_id: CASE901
title_ko: 마지막 박수
title: 마지막 박수
english_title: The Final Applause
genre: 사망 원인 / 자선 공연 / 평판 조작
setting: (사건 배경 한 단락)
detective_entry: 탐정이 사건 현장에 있게 되는 자연스러운 이유
tone: 전체적인 분위기와 한지우의 역할 방향
```

- `case_id`(또는 `case_no`)는 `CASE`로 시작하는 영문/숫자 코드로 정규화됩니다.
- `title_ko`(없으면 `title`)가 실제 게임에 노출되는 제목입니다.

### `[OPENING_SCENE]`

자유 서술 텍스트(플레이 첫 장면). 문단 단위로 그대로 `public_intro`가
됩니다. **여기 적힌 모든 디테일(위치·행동·소리·목격담)은
`[ACTUAL_TIMELINE]`의 해당 시각 항목과 정확히 일치해야 합니다** — 근거
없는 디테일을 넣지 마세요. 결정적 행동을 현재진행형으로 단정하지 말고,
탐정이 목격한 시각이 실제 사건 시각 이후임을 자연스럽게 알 수 있게
쓰세요.

### `[SURFACE_INCIDENT]`

플레이어가 시작 시점에 이미 아는 표면적 사실들의 불릿 목록.

### `[FULL_TRUTH]`

진짜 정답. 플레이어에게 절대 직접 노출되지 않습니다.

```
* 책임자: CH04 차유라
* 동기: ...
* 수법: ...
* 결정적 시간/장소: 21:08 L04 .../ 21:14 L03 ...
* 은폐: ...
* 공범: 없음
```

`CHxx 이름` 형태로 인물을 지칭할 때 그 이름은 `[CHARACTERS]`에 등록된
`name:`과 **한 글자도 다르면 안 됩니다** — 다르면 `NPC_NAME_MISMATCH`
에러입니다 (아래 4절 참고).

### `[ACTUAL_TIMELINE]` — `[T01]`, `[T02]`…

```
[T05]
time: 21:08
location: L04
actors: CH04
actual_action: 차유라가 하린이 잠시 자리를 비운 사이 안정제 한 알을 가져간다.
world_fact: 차유라는 복도에서 백정우의 심장약 케이스를 열어 그 알약으로 바꾼다.
```

- `actors`는 `CHxx`(인물) 또는 `V01`(피해자 등 CH가 아닌 등장인물) 콤마
  구분 목록.
- **한 항목 = 한 인물의 한 행동.** 서로 다른 두 인물의 행동을 한 항목에
  섞거나(`"~하고 나서"`), 같은 인물이라도 목적이 다른 두 작업을 이어
  붙이면 안 됩니다. 위반 시 목적별로 별도 `T0x`로 분리하고, 그 사실을
  참조하던 다른 인물의 `related_timeline`도 새 번호로 갱신해야 합니다.
  (코드 검증 항목이지만 지금은 경고 수준 — 4절 참고)

### `[CHARACTERS]` — `[CH01]`, `[CH02]`…

```
[CH04]
name: 차유라
role: 서하린의 매니저 / 후원회 창구 담당
present_location: L04 대기실 앞 복도
knows:

* fact_id: F-CH04-01
content: 백정우가 후원금 전용 정황을 발견해 이사회에 알리겠다고 했다.
source: 직접 대화
related_timeline: T03

initial_claims:
* claim_id: S-CH04-01
content: 공연이 끝난 뒤부터 하린 곁을 지켰고, 백정우와는 이야기하지 않았다고 말한다.
truth_status: lie
reason_for_limit_or_lie: 범행과 후원금 전용을 숨기기 위해서다.

initial_interview_range:
* S-CH04-01

hidden_until:
* fact_or_claim_id: S-CH04-03
release_prerequisite: C01
release_trigger: E03

knowledge_limits:
* 하린이 대기실 밖에서 자신의 동선을 보지 못했다는 것만 안다.
```

필드 설명:

- `knows`: 이 인물이 아는 사실들. 각 항목은 `fact_id`(형식
  `F-CHxx-순번`), `content`, `source`(어떻게 알게 됐는지),
  `related_timeline`(관련 `T0x` 또는 "없음").
- `initial_claims`: 처음 인터뷰에서 하는 진술. `claim_id`(형식
  `S-CHxx-순번`), `content`, `truth_status`(`truth`/`partial_truth`/`lie`
  중 하나), `reason_for_limit_or_lie`.
- `initial_interview_range`: 위 `initial_claims` 중 지금 당장 물어보면
  나오는 것들의 `claim_id` 목록.
- `hidden_until`: 지금 당장은 안 나오는 `fact_id`/`claim_id`가 **언제
  풀리는지**. 각 항목은 `fact_or_claim_id` + `release_prerequisite`(이미
  확보돼 있어야 하는 선행 ID) + `release_trigger`(그 상태에서 실제로
  제시/추궁해야 풀리는 대상 ID). **두 ID는 반드시 서로 달라야
  합니다** — 최소 2단계 진행을 강제하기 위함입니다. (예전에는 자유
  문장 `release_condition` 하나였지만 지금은 이 두 필드로 대체됨)
- `knowledge_limits`: 이 인물이 절대 모르는 것 — GM이 이 인물 입으로
  넘겨짚어 말하지 않게 하는 안전장치.

### `[LOCATIONS]` — `[L01]`, `[L02]`…

```
[L02]
name: 무대 뒤 복도
access: 시작부터 가능
base_description:

* 공연장, 대기실, 음악실로 이어지는 좁은 복도.

observation_rules:
* action: 복도 동선을 확인한다
release_fact_id: F-L02-OBS-01
result: 대기실 문턱과 음악실 입구가 서로 보이지 않는다.

detail_rules:
* action: 복도 출입 태그 기록을 확인한다
requires: 김태호의 협조
release_evidence_id: E02
result: 21:08 차유라의 관리 태그가 서비스함에서 인식된 기록이 있다.
```

- `access`: 접근 제약(없으면 "시작부터 가능"). 다른 인물이 예외적으로
  그 장소/설비를 쓰는 경우, 그 정당한 사유를 여기나 관련 `CHxx`에
  명시해야 합니다 — 설명 없는 예외 금지.
- `base_description`: 들어가면 바로 보이는 일반 묘사.
- `observation_rules`: 가볍게 관찰만 해도 나오는 사실
  (`release_fact_id`, 형식 `F-Lxx-OBS-순번`).
- `detail_rules`: 더 깊이 조사해야 나오는 증거 (`release_evidence_id` →
  `[EVIDENCE]`의 `Exx`). `requires`로 전제 조건(누구의 협조 등)을 명시.
- (선택, 코드가 강제하진 않지만 `app/game.ts`의 GM이 인식하는 필드)
  `VISIBLE_ON_ENTRY`: 입장 즉시 보이는 디테일을 더 명시적으로 쓰고 싶을
  때 쓰는 필드명. 없으면 GM은 `base_description`과 일반 상식 수준의
  묘사만 입장 시 보여줍니다.

### `[EVIDENCE]` — `[E01]`, `[E02]`…

```
[E02]
name: 대기실 앞 서비스함 태그 기록
found_at: L02
discovery_condition: 김태호 협조 후 기록 확인
related_timeline: T05
content: 21:08 차유라의 관리 태그가 서비스함에서 인식되었다.
proves:

* 차유라가 '공연 뒤부터 하린 곁에만 있었다'는 주장과 맞지 않는다.

does_not_prove:
* 서비스함에서 무엇을 꺼냈는지 또는 약을 바꿨는지

presentation_effect:
* C01의 제시 증거
```

- `found_at`: 이 증거가 **실제로 발견되는 유일한 장소**. 다른 섹션
  서술이 같은 물건을 다른 장소에도 있는 것처럼 묘사하면 안 됩니다 —
  물건이 이동했다면 그 이동 자체를 `T0x`로 명시하고 `found_at`은 최종
  발견 장소로 맞추세요.
- `proves` / `does_not_prove`: 이 증거가 증명하는 것과 증명하지 않는
  것을 명확히 분리 — GM이 과잉 추론하지 않게 하는 안전장치.
- `presentation_effect`: 이 증거를 제시했을 때 어느 `CONTRADICTION_STAGES`
  단계에 쓰이는지.

### `[CONTRADICTION_STAGES]` — `[C01]`, `[C02]`…

```
[C01]
target_character: CH04
from_stage: initial
to_stage: after_corridor_admission
requires_heard_claim_ids:

* S-CH04-01

requires_presented_evidence_ids:
* E02
* E04

requires_comparison:
claim_id: S-CH04-01
evidence_ids: E02, E04

player_action: 차유라에게 서비스함 태그 기록과 정산 메모를 제시하여 대조한다.

release:
* claim_or_fact_id: S-CH04-03
scope: 21:05경 백정우와 정산 이야기를 했고, 21:08 복도로 간 사실까지만 인정한다.

must_not_release:
* 안정제를 가져간 사실
* 후원금 전용
* 약 교체
```

- 각 단계는 이전 진술(`requires_heard_claim_ids`)과 증거
  (`requires_presented_evidence_ids`)를 요구하고, 그 조합
  (`requires_comparison`)을 실제로 제시했을 때만 다음 단계로 넘어갑니다.
- `release`는 이 단계에서 새로 풀리는 사실/진술, `must_not_release`는
  이 단계에서 **아직** 나오면 안 되는 것 — 한 번에 다 자백하지 않게
  막는 장치입니다.
- 최소 3단계를 권장하고, 각 단계는 서로 다른 증거 조합을 요구하는 게
  좋습니다 (지금은 코드 경고 수준 — 4절 참고).

### `[RED_HERRINGS]` — `[R01]`, `[R02]`…

```
[R01]
surface_suspicion: 강도윤은 상속 문제로 백정우와 다퉜고 재단 발표의 실무 책임자다.
actual_reason: 백정우가 강도윤을 후임 이사장으로 세우지 않으려 해 다퉜다. 그러나 핵심 시각에는 무대 진행을 했다.
how_to_clear: E01과 강도윤의 S-CH02-01을 대조한다.
must_not_imply: 가족 갈등만으로 약 교체의 접근 기회를 뜻하지 않는다.
```

오답 용의자/서브플롯. `actual_reason`은 진범이 아니지만 의심받을 만한
진짜 이유, `how_to_clear`는 플레이어가 실제로 그 의심을 해소하는 방법.

### `[CASE_COMPLETE]`

```
required_established_facts:

* E02
* E03
* E05
* E06
* F-CH04-02

required_contradiction_stages:
* C01
* C02
* C03

accusation_requirements:
suspect: CH04 차유라
method_fact: 서하린의 안정제를 백정우의 심장약 케이스에 바꿔 넣었다.
motive_fact: 후원금 전용이 발각되어 공개되기 직전이었다.
```

최종 지목이 성립하기 위한 조건들. `app/game.ts`가 이 조건들을 기준으로
플레이어의 최종 추리를 판정합니다.

### `[FINAL_DEDUCTION]`

```
answer:

* 책임자: 차유라
* 수법: ...
* 동기: ...
* 핵심 연결: ...
```

케이스 종료 후 플레이어에게 보여줄 정답 설명.

### `[ENDING_EXPLANATION]`

번호를 매긴 문단으로, 표면 사건에서 진상까지 이어지는 요약 (엔딩
크레딧처럼 보여줄 수 있는 정리).

## 3. ID 명명 규칙 정리

| 접두어 | 뜻 | 정의되는 곳 | 예시 |
|---|---|---|---|
| `CASE###` | 사건 코드 | `CASE_IDENTITY` | `CASE901` |
| `CH##` | 인물 | `CHARACTERS`의 하위 블록 | `CH04` |
| `V##` | CH가 아닌 등장인물(피해자 등) | 필요시 `actors`에서만 사용 | `V01` |
| `L##` | 장소 | `LOCATIONS`의 하위 블록 | `L03` |
| `E##` | 증거 | `EVIDENCE`의 하위 블록 | `E02` |
| `C##` | 모순 단계 | `CONTRADICTION_STAGES`의 하위 블록 | `C01` |
| `R##` | 오답 서브플롯 | `RED_HERRINGS`의 하위 블록 | `R01` |
| `T##` | 타임라인 항목 | `ACTUAL_TIMELINE`의 하위 블록 | `T05` |
| `F-CHxx-##` | 인물이 아는 사실 | `CHARACTERS`의 `knows` | `F-CH04-01` |
| `F-Lxx-OBS-##` | 장소 관찰로 풀리는 사실 | `LOCATIONS`의 `observation_rules` | `F-L02-OBS-01` |
| `S-CHxx-##` | 인물의 초기 진술 | `CHARACTERS`의 `initial_claims` | `S-CH04-01` |

다른 섹션의 ID를 참조하는 모든 필드(`requires_presented_evidence_ids`,
`requires_heard_claim_ids`, `related_timeline`, `release_prerequisite`,
`release_trigger` 등)는 그 ID가 **정의된 곳의 표기와 하이픈·자릿수까지
완전히 동일**해야 합니다. 자릿수만 틀린 경우(`E2` vs `E02`)는
`repairReferencedIds()`가 자동으로 고쳐주지만, 아예 정의되지 않은 ID를
참조하면 고쳐주지 않습니다.

## 4. 검증 규칙

"정합성은 통과 조건일 뿐, 재미가 목표"라는 원칙에 따라, 게임이 실제로
망가지는 것만 반려(에러)로 두고 나머지는 경고(통과는 시키되 표시만
함)로 낮춰뒀습니다. 정확한 항목별 분류는 코드가 자주 바뀌는 부분이라
이 문서에 따로 옮겨 적지 않습니다 — `scripts/lib/master-parser.mjs`의
`validateMasterText` 함수를 실제 기준으로 보세요.

생성 파이프라인(`scripts/generate-case.mjs`)의 자체 QA는 이제 정합성이
아니라 **재미 4항목**만 봅니다: 되짚을 복선 3개 이상 / 유력한 오답
용의자 존재 / 진범이 마지막까지 가장 덜 의심스러움 / 트릭이 플레이어가
얻을 수 있는 정보만으로 풀림. 자세한 내용은 `scripts/README.md`의
"Design philosophy" 절 참고.

## 5. 참고 파일

- `scripts/reference/CASE901.txt` — 실제 예시 원문 (이 문서의 모든
  스니펫이 여기서 나왔습니다)
- `scripts/lib/master-parser.mjs` — 파서/검증 코드 (진짜 소스 오브
  트루스)
- `scripts/lib/master-parser.test.mjs` — 검증 규칙에 대한 회귀 테스트
- `scripts/generate-case.mjs` / `app/gm/case-generation.ts` — LLM에게
  이 서식을 지시하는 프롬프트 (CLI/인앱 두 곳에 중복 구현돼 있음)
- `scripts/README.md` — 파이프라인 사용법과 설계 철학
