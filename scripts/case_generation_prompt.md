# CASE171 형식으로 반복 생성하기 (Claude API)

## 금지: 코드 레벨 몰드(mold) + 명사 치환 방식

CASE061~111 51건이 반복됐던 근본 원인은 특정 트릭 문구 하나가 아니라, **하나의 몰드를
`mk_case()` 같은 생성 함수/템플릿으로 코드에 고정해두고, 사건마다 계기·장소·장치 같은
명사만 갈아 끼워 채워 넣는 생성 방식 자체**였다. 이 방식은 일반적으로 금지한다 — 트릭뿐
아니라 동기(motive)·은폐 방식(cover_up) 등 full_truth의 어떤 문장이든, 그 사건만의 인과
구조로 매번 새로 설계해야 하며, 기존 사건 문장의 명사만 바꿔 재사용해서는 안 된다.
`validate_master.ts`의 `checkCorpusDuplication()`이 새 사건의 motive/method/cover_up
문장을 기존 코퍼스 전체와 2-gram 유사도로 비교해 이 패턴을 code-level로 잡아낸다(임계값
0.3 이상이면 error) — 몰드를 코드로 고정하는 방식 자체가 이 검사에 걸리도록 설계됐으니,
검사를 우회하려고 하지 말고 애초에 사건마다 처음부터 다시 구상할 것.

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
   case_identity.setting은 "OOO 행사/마감/심사를 하루(사흘) 앞둔 시점의 폐쇄된 소규모 공간에서
   피해자가 숨진 채 발견된다"류 골격을 쓰지 않는다 — 코퍼스 170건 중 148건(87%)이 이 세 요소
   (임박한 마감 + 폐쇄공간 + "숨진 채 발견된다")를 그대로 반복해서, 배경 소재(양조장/갤러리/
   천문대 등)만 바뀔 뿐 사건마다 첫인상이 똑같아졌다는 실플레이 피드백이 있었다(validate_master.ts의
   SETTING_DEADLINE_DISCOVERY_TEMPLATE이 이 골격을 code-level로 차단한다). 시간 압박 장치 자체가
   금지된 건 아니지만, 마감 압박 없이 다른 계기로 열거나 발견 경위 자체를 다르게 쓰는 등 매번
   다른 방식으로 설계할 것.
   특히 "곧 있을 진위 감정/자격 심사/인증 검사에서 부정이 발각된다"는 배경 장치는 코퍼스의
   38%(64/167건)를 차지할 만큼 편중돼 있다(validate_master.ts의 SETTING_BACKDROP_OVERUSE가
   코퍼스 비중이 30%를 넘으면 차단한다) — 배경 소재를 바꿔도 "심사/감정/인증"이라는 장치
   자체를 재사용하면 걸린다. 개인적 약속, 사적 재회, 우연한 방문 등 심사·감정·인증이 아닌
   다른 계기를 우선 고려할 것.
   사인(死因)도 마찬가지다 — data/case_registry.json에 이미 질식사·중독이 과반을 차지하니,
   새 사건을 구상하기 전 최근 사건들의 사인을 확인하고 겹치지 않는 방식을 우선 고려한다.
   case_identity.tags(사건 목록 화면 해시태그, 1~4개)는 genre를 그대로 옮기거나 요약하지 않는다 — genre는
   사실상 숨겨진 동기·실제 사인을 압축한 정답 요약이라 그대로 노출하면 스포일러다(예: genre가 "인슐린 조작
   저혈당 쇼크사 위장"이면 그 자체가 진범의 수법이다). tags는 완전히 별도로, 장르 아키타입이나 장소 분위기 같은
   스포일러 없는 라벨만 쓴다("클로즈드_서클", "양조장", "사제_관계" 같은 식 — 공백이나 "_"로 단어를 구분해서
   쓰면 런타임이 알아서 "#클로즈드#서클"처럼 단어마다 "#"를 붙여 표시하므로, 이 필드에 "#"를 직접 넣을 필요는
   없다). 사인/사망 방식, 숨겨진 동기나
   음모, 범인을 특정할 수 있는 단서는 절대 금지 — surface_incident에 이미 공개된 표면적 사실만 예외로 허용된다.
2. full_truth — 트릭·동기·수법을 가장 먼저 확정한다. 이게 사건의 심장이다. 나머지는 전부 이걸 성립시키기 위한 배치다.
   motive를 "누군가 부정행위를 발견하고 폭로/신고를 예고하자 발각을 막기 위해 살해한다"는 골격으로만
   채우지 않는다 — 코퍼스 167건 중 80건(48%)이 이미 이 골격이라, 결말이 매번 "의도한 게 아니었다,
   들킬까봐 무서워서 그랬다"는 인상으로 수렴한다는 실플레이 피드백이 있었다(validate_master.ts의
   MOTIVE_ARCHETYPE_OVERUSE가 코퍼스 비중이 30%를 넘으면 이 골격의 추가 사용을 code-level로
   차단한다). 복수, 치정, 상속·재산 다툼, 신념·집착, 보호 동기(다른 사람을 지키려다 저지른 범행)
   등 다른 동기 아키타입을 먼저 고려할 것 — 발각 위협이라는 계기 자체를 아예 빼거나, 계기는
   비슷해도 범인의 행동 동기(막으려는 것이 발각이 아니라 다른 무언가)를 다르게 설계하는 방향도 있다.
   금지: "범인이 관제실에서 계기 표시값을 조작하는 프로그램을 실행하고, 장소의 안전장치를 수동으로
   조작해 안전 확인 절차를 건너뛰게 만든다. 피해자는 정상 수치를 믿고 최종 점검을 위해 안전 확인 없이
   들어갔다가 의식을 잃은 채 발견돼 병원에서 사망한다"는 트릭 골격. CASE061~CASE111 51건이 계기/장소/
   장치 이름만 바꿔 이 골격을 그대로 반복해서 실플레이 재미를 크게 해쳤다(validate_master.ts의
   METHOD_GAUGE_TAMPER_TEMPLATE가 이 골격을 code-level로 차단한다). 센서/계기 조작이라는 소재 자체가
   금지된 건 아니지만, "표시값 조작 → 안전장치 수동 우회 → 피해자가 정상 수치를 믿고 진입"이라는 인과
   구조 전체를 재사용하지 않는다.
3. actual_timeline — full_truth를 시간순으로 풀어쓴다. 각 항목은 정확히 한 인물의 한 행동만 담는다.
   "~하고 ~한다"처럼 목적이 다른 두 행동을 이어붙이지 않는다.
   각 항목은 육하원칙을 갖춰야 한다 — 언제/어디서/누가는 time/location/actors 필드가 이미 맡으니,
   actual_action 문장 자체에는 반드시 "무엇을" + 장면 차원의 "어떻게"(그 순간 그 장소에만 있는 구체적
   계기·동작·수단)를 담는다. 다른 사건에 이름만 바꿔 그대로 옮겨 써도 말이 되는 일반론적 문장은 반려
   대상이다 — 실제로 CASE121/122/123/125가 "3일 전 16:00, [피해자]가 [장소]에서 우연히 [증거]를
   발견한다" / "사고 당일 21:50, [범인]이 순찰 중 쓰러진 [피해자]를 발견한다"는 문장을 시각까지 토씨
   하나 안 틀리고 그대로 재사용해 반복 문제가 됐다. "순찰 중 쓰러진 OO를 발견한다" 대신 "정기 순찰
   경로에서 평소와 달리 불이 꺼진 안쪽에 인기척이 없어 문을 열어보다 쓰러진 OO를 발견한다"처럼, 왜 그
   시각에 그 자리에 있었는지와 무엇이 계기가 됐는지를 매 항목마다 그 사건만의 것으로 채운다.
   단, "왜"(진짜 동기)와 범행 메커니즘의 "어떻게"는 다르다 — 그건 full_truth가 따로 담당하는 스포일러이므로,
   범인 쪽 항목이라고 해서 여기서 동기나 수법의 원리까지 미리 설명할 필요는 없다. 예를 들어 "자금난을
   해결하려고 진품을 빼돌리려 한다" 같은 동기 설명은 timeline이 아니라 full_truth.motive의 몫이고,
   timeline 쪽은 "여원상이 자재보관실에서 촉진제 병 라벨을 바꿔치기한다"처럼 관찰 가능한 행동만 담아도
   충분하다. 즉 이 항목이 요구하는 "무엇을/어떻게"는 사건마다 다르게 만드는 장면적 계기(왜 그 순찰이었고
   왜 그 시간이었는지)이지, 아직 감춰야 할 동기·수법의 해설이 아니다 — 스포일러라서 생략하는 것과 성의
   없이 짧게 쓰는 것은 다르다.
   world_fact(선택 필드)는 "그는/그녀는/그가/그녀가/그를/그녀를/그에게/그녀에게" 같은 인물
   대명사를 문장 어디에도 — 시작이든 중간이든 — actors의 실제 이름 없이 쓰지 않는다. "안에서는/
   그곳에서는"류의 모호한 장소 지시어는 문장 시작에서 금지된다. 같은 항목의 actual_action 바로
   다음 줄에 있어서 그 안에서는 대명사가 누구를 가리키는지 명확해 보이지만, 이 문장은 raw_text
   변환이나 GM의 회상 등에서 actual_action과 떨어진 채 단독으로 다뤄질 수 있다(validate_master.ts의
   WORLD_FACT_VAGUE_SUBJECT가 이를 자동으로 차단한다 — 코퍼스 175건 중 124건에서 실제로 이 문제가
   발견됐고, 문장 중간에 대명사가 오는 경우도 실플레이에서 추가로 확인됨). actors에 있는 실제
   이름과 구체적 장소명을 써서, 이 문장 하나만 떼어놔도 뜻이 통하게 쓸 것.
4. characters — 각 인물이 timeline에서 실제로 보고 겪은 것만 knows로 갖는다. hidden_until은
   release_prerequisite와 release_trigger 두 값이 반드시 달라야 한다(같으면 한 번의 질문으로 풀리는
   1단계 해금이 되어 반려된다). OR로 여러 조건을 걸지 않는다 — 하나의 조건만 허용된다.
   role에 부가 설명(직함 외 신분, 관계, 상태 등)을 덧붙일 때는 항상 " / "로 잇는다("운영실장 / 시신
   발견자", "수석 제자 / 다도문화원 부원장"처럼). 괄호 "()"는 쓰지 않는다 — 런타임의 스포일러 방지용
   문자열 절단 로직이 절 경계로 오인해서 괄호 중간을 잘라 화면에 안 닫힌 "("만 남기는 사고가 실제로 있었다.
5. locations, evidence — timeline의 world_fact가 남긴 물리적 흔적을 장소와 증거로 구체화한다.
   evidence.source_type이 "location"이면 discovery_condition은 해당 location의
   detail_rules[].action과 토씨 하나 틀리지 않고 완전히 같은 문자열이어야 한다(이 문자열이 런타임에서
   플레이어 행동과 대조되는 열쇠이기 때문이다). "testimony"면 어떤 인물에게 무엇을 물어야 하는지를 쓴다.
   같은 장소(found_at)에 놓이는 증거들의 content는 서로 구별되게 쓴다. 한 방에서 카드 한 장을 집을 때
   런타임 유출 검사기가 같은 방의 다른 카드 서술까지 이미 나온 것으로 오인하면, 그 카드는 정확히
   찾아도 발견 자체가 막힌다. 실제로 CASE029의 E02/E03/E04가 셋 다 "어젯밤 … 위지안의 계정으로 …
   기록이 남아 있다" 꼴이라 이 사고가 났다. 각 증거는 "무엇을 통해 드러나는지"(접근 로그인지 종이
   문서인지, 어떤 대상을 관찰해서 나오는지)와 어떤 인물을 가리키는지를 문장에 드러내고, 문장
   끝맺음까지 서로 다르게 쓴다. `npm run check:case <CASE_ID>`가 런타임 검사기를 그대로 불러 이걸
   검사한다.
6. contradiction_stages — 최소 3단계. 각 단계는 서로 다른 증거 조합을 요구해야 하고, 이전 단계에서
   release된 사실을 다음 단계의 requires_heard_claim_ids로 이어받아야 한다.
   from_stage/to_stage는 서술이 아니라 상태 키다. target_character별로 하나의 사슬을 이뤄야 하고,
   첫 단계의 from_stage는 반드시 문자열 "initial", 각 단계의 to_stage는 다음 단계의 from_stage와
   글자 그대로 같아야 한다(예: initial → admits_lending_key → admits_presence). 여기에 문장을
   넣으면 런타임이 단계를 못 찾아 진행도가 0%에 박힌다 — 실제로 84건이 그 상태로 배포됐었다.
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
   (피해자 직함/역할을 플레이어가 알 수 있게 하는 건 오프닝 문장에 강제로 넣기보다 앱의 "주요 인물"
   패널에서 key_figures로 노출하는 쪽으로 처리한다 — 오프닝은 상황에 따라 직함을 자연스럽게
   생략할 수도 있어야 하므로.)
   한지우는 남자다. 탐정과는 브로맨스 파트너 — 오래 같이 일해서 서로 설명이 필요 없는 두 남자의
   덤덤한 친밀함이고, 애틋한 말보다 짧은 농담·핀잔·묵묵히 옆에 있는 방식으로 드러난다. "그녀",
   "여자/여성" 같은 표현으로 쓰지 않는다. 대명사가 필요하면 "그" 또는 그냥 "한지우"를 쓴다.
   말투는 비대칭이다: 탐정은 한지우에게 반말, 한지우는 탐정에게 반존대("-요")를 쓴다. 다른
   인물에게는 탐정도 한지우도 존댓말을 쓴다.
   줄바꿈: 지문(서술)과 대사, 서로 다른 화자의 대사가 한 문단에 다 뭉쳐 있으면 안 된다. 서술 한
   덩어리, 대사 한 줄, 그다음 서술이나 다른 화자의 대사를 각각 \n\n으로 분리한 별도 문단으로 쓴다.
   틀린 예: "한지우가 중얼거렸다. \"이건 이상한데요.\" \"나도 그래.\" 탐정이 답했다." 옳은 예:
   "한지우가 중얼거렸다.\n\n\"이건 이상한데요.\"\n\n\"나도 그래.\"\n\n탐정이 답했다." (CASE120에서
   실제로 반려된 형태.)
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
import Anthropic from '@anthropic-ai/sdk';
import caseSchema from './case_master.schema.json';
import { validateMaster, deriveEngineViews } from './validate_master';

async function generateCase(env: Env, premise: string) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6', // 생성 품질이 중요하므로 소네트/오퍼스 계열 권장
    max_tokens: 8000,
    system: SYSTEM_PROMPT, // 위 시스템 프롬프트
    messages: [{ role: 'user', content: premise }],
    output_config: {
      format: {
        type: 'json_schema',
        // $schema/$id/title 같은 메타 키는 API가 요구하지 않으니
        // 컴파일 오류가 나면 이 키들부터 제거해서 재시도한다.
        schema: caseSchema,
      },
    },
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const master = JSON.parse(textBlock!.text);

  // 1단계: 구조/교차참조 검증 (스키마가 못 잡는 것들)
  const issues = validateMaster(master);
  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    // 여기서 전체 재생성 대신, 실패한 필드만 짚어 재요청하는 걸 다음 단계로 고려한다.
    throw new Error(`Master 검증 실패: ${JSON.stringify(errors)}`);
  }

  // 2단계: 런타임용 얇은 뷰는 LLM이 아니라 코드가 만든다.
  const { npcs, locations, cards } = deriveEngineViews(master);

  return {
    case_id: master.case_identity.case_id,
    master,
    npcs,
    locations,
    cards,
  };
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
