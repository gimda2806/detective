# CASE171 형식으로 반복 생성하기 (Claude API)

## 왜 이 방식인가

- `output_config.format`(JSON outputs)을 쓰면 Claude의 응답 자체가 스키마에 맞는 JSON으로 강제된다.
  "JSON만 출력해" 같은 프롬프트 지시가 필요 없다 — 그건 프롬프트가 아니라 API 파라미터가 하는 일이다.
- 다만 Claude의 구조화 출력은 `minItems`가 0/1만 지원되고, `not`/숫자·길이 제약은 지원되지 않는다.
  그래서 `case_master.schema.json`에는 "형태"만 강제하고, "개수·교차참조" 규칙(CONTRADICTION_STAGES ≥ 3,
  hidden_until 두 값이 달라야 함, ID가 실제로 존재하는가 등)은 응답을 받은 뒤 `validate_master.ts`가 검사한다.
  이건 편법이 아니라 Claude 공식 SDK들이 자체적으로 쓰는 패턴과 같다: 지원 안 되는 제약은 설명 문구로 옮기고
  받은 뒤에 코드로 검증한다.
- `npcs`/`locations`/`cards`(런타임이 쓰는 얇은 뷰)는 모델에게 또 만들라고 시키지 않는다.
  `deriveEngineViews()`가 `master`에서 코드로 뽑아낸다. 이중 생성 비용도, 두 표현이 어긋나는(drift) 위험도 없앤다.

## 시스템 프롬프트

```
너는 추리 게임 사건(Master)을 생성한다. 출력은 case_master.schema.json 스키마를 따르는 JSON 하나다.

# 생성 순서 (반드시 이 순서로 사고하고, 이 순서로 필드를 채워라)
1. case_identity, key_figures — 배경과, 실종/사망한 핵심 인물(면담 불가능한 인물)을 먼저 정한다.
   case_identity.tags(사건 목록 화면 해시태그, 1~4개)는 genre를 그대로 옮기거나 요약하지 않는다 — genre는
   사실상 숨겨진 동기·실제 사인을 압축한 정답 요약이라 그대로 노출하면 스포일러다(예: genre가 "인슐린 조작
   저혈당 쇼크사 위장"이면 그 자체가 진범의 수법이다). tags는 완전히 별도로, 장르 아키타입이나 장소 분위기 같은
   스포일러 없는 라벨만 쓴다("#클로즈드_서클", "#양조장", "#사제_관계" 같은 식). 사인/사망 방식, 숨겨진 동기나
   음모, 범인을 특정할 수 있는 단서는 절대 금지 — surface_incident에 이미 공개된 표면적 사실만 예외로 허용된다.
2. full_truth — 트릭·동기·수법을 가장 먼저 확정한다. 이게 사건의 심장이다. 나머지는 전부 이걸 성립시키기 위한 배치다.
3. actual_timeline — full_truth를 시간순으로 풀어쓴다. 각 항목은 정확히 한 인물의 한 행동만 담는다.
   "~하고 ~한다"처럼 목적이 다른 두 행동을 이어붙이지 않는다.
4. characters — 각 인물이 timeline에서 실제로 보고 겪은 것만 knows로 갖는다. hidden_until은
   release_prerequisite와 release_trigger 두 값이 반드시 달라야 한다(같으면 한 번의 질문으로 풀리는
   1단계 해금이 되어 반려된다). OR로 여러 조건을 걸지 않는다 — 하나의 조건만 허용된다.
5. locations, evidence — timeline의 world_fact가 남긴 물리적 흔적을 장소와 증거로 구체화한다.
   evidence.source_type이 "location"이면 discovery_condition은 해당 location의
   detail_rules[].action과 토씨 하나 틀리지 않고 완전히 같은 문자열이어야 한다(이 문자열이 런타임에서
   플레이어 행동과 대조되는 열쇠이기 때문이다). "testimony"면 어떤 인물에게 무엇을 물어야 하는지를 쓴다.
6. contradiction_stages — 최소 3단계. 각 단계는 서로 다른 증거 조합을 요구해야 하고, 이전 단계에서
   release된 사실을 다음 단계의 requires_heard_claim_ids로 이어받아야 한다.
7. red_herrings — 최소 1개. 겉보기엔 의심스럽지만 실제로는 무관한 인물/정황과, 그걸 어떻게 해소하는지,
   해소 후에도 남는 사실(관계의 여운)을 함께 쓴다.
8. case_complete, final_deduction, ending_explanation — 위에서 확정한 내용을 요약한다. 여기서
   새로운 사실을 만들지 않는다.
9. opening_scene — 사건 발각 시점의 오프닝. actual_timeline에서 사건이 발각되는 시점 근처의 항목들을
   문장으로 옮기는 것만 한다. timeline에 없는 새로운 목격, 소리, 소지품, 인물의 위치를 오프닝에서
   창작하지 않는다. (지금까지 여러 사건에서 반려된 이유 1위가 오프닝과 타임라인의 시각/인물 불일치였다.)
   "탐정은 [의뢰인]의 다급한 연락/신고를 받고 왔다"류의 상투적 호출 문구로 시작하지 않는다 — 여러
   사건이 이 표현을 그대로 반복해서 오프닝의 첫인상이 다 똑같아졌던 전례가 있다(CASE002~CASE011).
   대신 사건 현장의 소리·대화·분위기 대비, 이미 벌어지고 있는 상황을 목격하는 방식 등 사건마다 다른
   방식으로 연다. 연락을 받고 온 경위 자체가 필요하면 이후 문장에서 짧게만 처리한다.
10. ending_scene — 가장 마지막에 쓴다. CASE_COMPLETE 달성 후 플레이어가 읽는 결말 장면이며,
   오프닝과 정확히 같은 규칙이 적용된다: 여기서 새로운 사실을 창작하지 않는다. 반드시 다음 세 출처만
   문장으로 옮긴다 — (a) 마지막 CONTRADICTION_STAGES 단계의 release.scope(자백 내용),
   (b) FINAL_DEDUCTION의 동기·수법, (c) RED_HERRINGS 중 lingering_thread가 채워진 것 하나를
   에필로그로. (c)를 빠뜨리면 결말이 지나치게 깔끔하게 닫혀서 여운이 없는 사건이 된다.

# 최종 점검 (구조가 아니라 재미를 본다 — 이건 스키마가 못 잡는다)
- 진상이 밝혀졌을 때 플레이어가 되짚어볼 수 있는 복선이 최소 3개 있는가.
- 중간에 유력해 보이는 잘못된 용의자가 있는가(red_herrings로 구현되는가).
- 진범이 마지막 단계 전까지 가장 의심스럽지 않은 인물로 보이는가.
- 트릭이 플레이어가 실제로 얻을 수 있는 정보만으로 풀리는가(플레이어가 접근 불가능한 정보에 의존하지 않는가).
- ending_scene이 너무 깔끔하게 닫히지 않는가 — lingering_thread 하나가 실제로 에필로그에 녹아 있는가.

# 하지 말아야 할 것
- knows/initial_claims/hidden_until에서 정의하지 않은 새 사실을 다른 필드에서 언급하지 않는다.
- 같은 fact/claim ID를 서로 다른 두 내용에 재사용하지 않는다(release에서 재참조하는 것은 정상이다).
- CONTRADICTION_STAGES의 release가 must_not_release에 적은 내용을 그 단계에서 흘리지 않는다.
```

## API 호출 (TypeScript, Cloudflare Workers 환경)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import caseSchema from "./case_master.schema.json";
import { validateMaster, deriveEngineViews } from "./validate_master";

async function generateCase(env: Env, premise: string) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6", // 생성 품질이 중요하므로 소네트/오퍼스 계열 권장
    max_tokens: 8000,
    system: SYSTEM_PROMPT, // 위 시스템 프롬프트
    messages: [{ role: "user", content: premise }],
    output_config: {
      format: {
        type: "json_schema",
        // $schema/$id/title 같은 메타 키는 API가 요구하지 않으니
        // 컴파일 오류가 나면 이 키들부터 제거해서 재시도한다.
        schema: caseSchema,
      },
    },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const master = JSON.parse(textBlock!.text);

  // 1단계: 구조/교차참조 검증 (스키마가 못 잡는 것들)
  const issues = validateMaster(master);
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    // 여기서 전체 재생성 대신, 실패한 필드만 짚어 재요청하는 걸 다음 단계로 고려한다.
    throw new Error(`Master 검증 실패: ${JSON.stringify(errors)}`);
  }

  // 2단계: 런타임용 얇은 뷰는 LLM이 아니라 코드가 만든다.
  const { npcs, locations, cards } = deriveEngineViews(master);

  return { case_id: master.case_identity.case_id, master, npcs, locations, cards };
}
```

## 참고: Claude 구조화 출력에서 실제로 지원/비지원되는 것 (2026-09 기준 공식 문서)

**지원:** object/array/string/integer/number/boolean/null, `enum`(원시 타입만), `const`,
`anyOf`/`allOf`(allOf+`$ref` 조합 제외), `$ref`/`$defs`, `required`, `additionalProperties: false`,
`pattern`(단순 정규식 — 백레퍼런스·룩어헤드·`\b`는 불가), 문자열 `format`(date-time/date/email/uuid 등 지정 목록),
배열 `minItems`는 **0 또는 1만**.

**미지원:** 재귀 스키마, `enum` 안의 복합 타입, 외부 `$ref`, 숫자 제약(`minimum`/`maximum`/`multipleOf`),
문자열 길이 제약(`minLength`/`maxLength`), `minItems` 2 이상, `maxItems`, `additionalProperties`를 `false`
외의 값으로 설정하는 것, `not`.

이 목록에 없는 키워드를 스키마에 넣으면 400 에러가 난다. `case_master.schema.json`은 이미 이 제약에 맞춰
정리해 뒀고, 못 넣은 규칙(개수·교차참조·본문 원자성)은 전부 설명 텍스트로 옮기고 `validate_master.ts`가
사후에 검사하도록 분리했다.

출처: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
