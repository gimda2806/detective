# 검사기·판정기 전체 목록 — 무엇이 어디서 무엇을 보나

이 저장소의 검사는 세 층이다(어느 단계에서 도는지는 0절). **① 마스터 파일을 보는 검사**(`npm run check:case <ID>` 셋과 `validate_master.ts`의
판정 코드 92개), **② 놀 수 있는가를 보는 검사**(`npm run check:offline` 완주), **③ 코퍼스·문서·환경을 세는 감사**
(`audit:*`·`check:novel`·`check:spelling`·`check:banter`·`lint:baseline`). PR 검사(`.github/workflows/pr-checks.yml`)는
tsc → oxlint 기준선 → build(전 마스터 변환) → 바뀐 마스터의 `check:case`와 `check:offline`을 돈다.

**심각도 표기.** `E` 언제나 error · `E/W` 새 사건 error, 등록된 사건(`case_registry.json`) warn · `W` 언제나 warn ·
`E*` 등록 무관 error인 예외 여덟(CLAUDE.md 「검사기 규칙」). 새로 넣는 검사는 warn으로 두지 않는다(2026-09-21 사용자 결정).
**AI GM 런타임 신호 39개는 여기 적지 않는다** — `app/game.ts`·`app/gm/response-signals.ts` 가
정본이다(`FABRICATED_PROPER_NOUN`·`UNDISCOVERED_EVIDENCE_LEAK`·`INTERVIEW_TARGET_DRIFT` 등).
마스터를 막는 검사가 아니라 **모델이 지어낸 말을 잡는 백스톱**이라 층이 다르다(CLAUDE.md ③).
`npm run check:banter` 의 대사 슬롯 이름(`BANTER_*`·`EXCHANGE_*` 20개)도 판정 코드가 아니라
데이터 키라 적지 않는다.

**검사가 안 잡는 것**(알려진 구멍)은 `docs/handoff-backlog.md` 「검사기」 절에 있다 — 여기 없는 것을 찾으면 그쪽을 먼저 본다.

검사를 더하거나 바꾸면 **이 문서의 그 줄**과 CLAUDE.md 「검사기 규칙」을 같이 고친다. **`npm run check:codes`가 `validate_master.ts`의 판정 코드가 전부 여기 적혀 있는지 대조한다**(PR 검사에 들어 있다 — 코드를 만들고 줄을 안 쓰면 빨개진다, 2026-09-26 사용자 결정).

---

## 0. 어느 단계에서 도나

비유하면 공장의 검수대가 넷이다 — 작업대(로컬), 출고 게이트(PR 검사), 포장 라인(빌드), 매장(런타임). 같은 판정 코드라도 어느 검수대에서 걸리는지가 다르다.

| 단계 | 언제 | 무엇이 돈다 | 걸리면 |
| --- | --- | --- | --- |
| **① 로컬 — 쓰는 사람의 작업대** | 생성 루틴 2단계 · 마스터를 손으로 고친 뒤 · 판본을 만든 뒤 | `npm run check:case <ID>` = `validate_master` → converter coverage → evidence leak **셋을 다 돌리고**(첫 실패에서 멈추지 않는다) 판본(`.offline.json`)이 있으면 그 파일에도 앞의 둘을 다시 돈다. 그다음 `npm run check:offline <ID>` | 하나라도 error면 exit 1. 생성 루틴은 실패한 필드만 고쳐 재검증(필드별 3회) |
| **② PR 검사 — 출고 게이트** (`.github/workflows/pr-checks.yml`) | 모든 PR과 main push | 순서대로: `check:codes`(판정 코드↔문서 대조) → `tsc --noEmit` → `lint:baseline`(oxlint 기준선 49) → `npm run build`(③ 포함) → **바뀐 마스터만** `check:case`와 `check:offline`(`*.master.json`과 `*.offline.json`을 폴더 이름의 id로 모아서; 20건 초과면 건너뛰고 손으로) | 어느 단계든 실패면 PR이 빨갛다. main에서 머지된 것끼리의 의미 충돌은 여기서 안 잡힌다(충돌 감시 루틴) |
| **③ 빌드 — 포장 라인** (`scripts/build-case-assets.ts`, `npm run build:cases`) | `dev`·`build` 앞, ②의 build 단계 | **전 마스터**를 변환(`convertStructuredMaster`) → `validateUploadedCase`(런타임 봉투 검증, `validate_master`가 아니다) → `masterFormatWarnings`·`pendingReworkWarnings`를 사건 색인에 싣는다 | 변환·봉투 검증에 실패한 마스터는 **번들에서 빠진다**(`skipped` 경고) — 게임에 그 사건이 안 보인다. `validate_master` 코드는 여기서 안 돈다 |
| **④ 런타임 — 매장** | 사건을 열 때 · 매 턴 | 목록의 「수사 가능」 라벨(`pendingReworkWarnings`) · 사건을 열 때 포맷 경고 넷(`masterFormatWarnings`) · AI GM 응답마다 `response-signals`·`evidenceLeakDetected` · 오프라인은 규칙표라 판정기가 없다(마스터에 안 적힌 것은 없는 것) | 화면에 경고로 뜨거나 응답을 고쳐 쓴다. 막지는 않는다 |
| **⑤ 루틴·감사 — 정기 점검** | 루틴 회차 시작·끝, 사람이 손으로 | `check:novel`(소설 루틴·되먹임 루틴) · `audit:offline`(판본 루틴 입력) · `audit:format`(이주 루틴 입력) · `audit:duplication` · `check:spelling` · `check:banter`(대사 풀을 고친 뒤) · `recent:avoid`·`next:case-id`(생성 1단계) | 센다. CI에 없다 — 읽는 사람이 그 루틴이다 |

**`validate_master`의 판정 코드 99개는 전부 ①과 ②(바뀐 마스터)에서만 돈다.** 코퍼스 비율·판박이 검사는 그 한 파일을 보면서 **나머지 전 마스터를 `otherCases`로 읽어** 견준다(그래서 새 사건 하나 검사에 몇 초가 든다). 심각도의 등록 여부는 `data/case_registry.json`에 그 id가 있는가로 정한다 — 등록되면 비율·뼈대 검사가 warn으로 내려온다(채우면 끝나는 부채용 비대칭. 골격을 다시 써야 풀리는 `E*` 여덟은 내려오지 않는다).

절마다 다르게 도는 것: **2-9 가설 보드**는 `motives`/`times`/`methods`가 있는 마스터에만, **2-10 판본 전용**은 파일 이름이 `.offline.json`일 때만, **2-6·2-8의 `points_at` 검사**(`MOTIVE_SELF_DISCLOSURE`·`SUSPICION_THIN`·`TESTIMONY_*`)는 `evidence[].points_at`을 쓰는 마스터에만 붙는다. 나머지는 모든 마스터에 돈다.

## 1. `npm run check:case <ID>` — 마스터 하나를 커밋 전에

셋을 한 번에 돈다. 가운데 것이 걸리면 마스터가 아니라 변환기를 고친다.

| 검사 | 무엇을 보나 | 걸리는 예 |
| --- | --- | --- |
| `validate_master.ts` | 스키마가 못 잡는 교차참조·개수·순서·중복 골격·코퍼스 비율 (아래 2절) | `E03.found_at`이 없는 방 `L09` |
| `audit-converter-coverage.ts` | 마스터에 적힌 값이 `structured-master-converter.ts`를 거쳐 `raw_text`까지 **실제로 도달**하는가. 스키마에 필드를 더하고 변환기가 싣는 것을 잊어 GM이 몇 달을 못 본 사고가 네 번 있었다(`pressure_responses`·`comic_tell`·`voice_profile`·`knows[].source`) | 새 필드 `suggested_by`를 스키마에만 더하고 변환기 방출을 안 했다 → 이 검사가 선다 |
| `audit-evidence-leak.ts` | 런타임의 유출 감지기(`evidenceLeakDetected`)를 세 상황으로 재현 — **ARRIVAL**(방 서술만으로 유출로 보이면 안 됨) · **DISCOVERY**(내준 카드 결과문을 다른 카드의 유출로 오인하면 안 됨) · **MISS**(내주지 않은 카드 내용이 서술에 나오면 잡아야 함) | 방 `base_description`에 카드 `E05` 본문의 한 구절이 그대로 들어가 ARRIVAL에서 유출로 잡힌다 |

## 2. `validate_master.ts` 판정 코드 — 주제별

### 2-1. 교차참조·구조 (id가 있는 것을 가리키는가, 순서가 맞는가)

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `UNDEFINED_REFERENCE` | `hidden_until.release_prerequisite`가 어디에도 정의되지 않은 id | `F-CH01-03`의 전제가 `E17`인데 카드는 `E16`까지 | E |
| `HIDDEN_UNTIL_SINGLE_STEP` | 전제와 트리거가 같아 한 단계로 해금됨 | `release_prerequisite: C02`, `release_trigger: C02` | E |
| `EVIDENCE_BAD_LOCATION` · `TIMELINE_BAD_LOCATION` · `OPENING_BAD_LOCATION` · `ENDING_BAD_LOCATION` | 카드·타임라인·오프닝·엔딩이 없는 장소를 가리킴 | `opening_scene.location_id: L06`인데 방은 다섯 | E |
| `TIMELINE_UNDEFINED_ACTOR` | 타임라인 `actors`에 인물도 피해자도 아닌 id | `actors: ["CH07"]` | E |
| `TIMELINE_OUT_OF_ORDER` | `actual_timeline`이 시간순이 아님(배열 순서가 곧 사건 순서로 읽힌다) | `T05`(21:00) 다음에 `T06`(20:30) | E |
| `TIMELINE_ATOMICITY_SUSPECT` | 한 항목에 두 행동이 접속어로 이어붙은 듯함 | 「밸브를 잠그고 사무실로 올라간다」 | W |
| `SUSPECT_MISMATCH` | `full_truth.responsible_character_id`와 `case_complete…suspect`가 다름 | 진범 `CH01`, 종결 조건 `CH02` | E |
| `CASE_COMPLETE_UNREACHABLE` | `required_established_facts`의 id를 이 사건 어디서도 얻을 수 없음(카드도 knows도 진술도 단계 release도 아님) → 진행도가 영영 모자람 | `F-CH04-05`를 요구하는데 아무도 그 사실을 모른다 | E* |
| `REFERENCE_OWNERSHIP` | id가 **그 자리에 올 수 있는 것인가** — `points_finger.at`(존재·자기 아님)·`because/opens`(그 인물 자신의 것)·`clearing_points_at`·`weight.means`(그 인물을 가리키는 카드) | `CH02.points_finger.at: CH02` | E |
| `INVALID_ACCESS_LEVEL` | `access_level`이 `open/restricted/sealed` 밖 | `"locked"` | E |
| `PRESSURE_RESPONSES_COUNT` | `pressure_responses`가 2~4개가 아님 | 한 줄 또는 여섯 줄 | E |
| `CONTRADICTION_STAGES_TOO_FEW` | 대립 단계가 3개 미만 | 단계 둘 | E |
| `CONTRADICTION_STAGES_DUPLICATE_EVIDENCE` | 두 단계가 완전히 같은 카드 조합을 요구 | `C01`·`C02` 둘 다 `[E03, E05]` | E |
| `CONTRADICTION_STAGE_CHAIN_BROKEN` | 한 인물의 단계가 한 사슬로 이어지지 않음(`to_stage`≠다음 `from_stage`) | `C01.to_stage: admits_visit`, `C02.from_stage: admit_visit` | E |

### 2-2. 카드와 장소 (카드가 실제로 나오는가)

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `EVIDENCE_CONDITION_MISMATCH` | `discovery_condition`이 그 방 `detail_rules`의 어느 `action`과도 글자 그대로 같지 않음 → 런타임 조회 실패 | 카드 「서랍을 연다」, 방 규칙 「서랍을 열어 본다」 | E |
| `EVIDENCE_LOCATION_CROSSWIRED` | 같은 문구를 두 카드가 쓰는데 방 규칙은 다른 카드를 내줌 | `E04`·`E07`이 같은 「장부를 확인한다」 | E |
| `DEAD_DETAIL_RULE` | 방 규칙이 없는 카드를 내줌 | `release_evidence_id: E21`인데 카드는 `E20`까지 | E |
| `LOCATION_HAS_NO_ACTION` | 관찰도 수색도 없고 **사람도 없는** 방(들어가도 할 것이 없다). 사람이 있으면 통과 — 복도 같은 방이지 막힌 방이 아니다(2026-09-26) | `L05`에 규칙이 둘 다 빈 배열이고 아무도 없다 | E |
| `ISOLATED_LOCATION_EVIDENCE` · `ISOLATED_TESTIMONY_EVIDENCE` | 카드가 어느 단계·헛다리·다른 카드·엔딩에도 안 쓰임 | 주웠는데 아무 데도 안 닿는 `E12` | W |
| `STAGE_KEY_IS_OWN_TESTIMONY` | 단계가 **본인에게 물어 받은 카드를 본인에게 제시**하라고 요구 → 오프라인은 그 보기를 안 띄워 영영 안 열림 | `C02`가 `E06`(김철수의 증언)을 김철수에게 | E* |

### 2-3. 오프닝·엔딩·서술

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `OPENING_CLICHE` | 「다급한 연락/신고를 받고 왔다」류 호출 문구 | 「급한 전화를 받고 현장으로 향했다」 | E |
| `OPENING_SCENE_MISSING_INCIDENT` | 오프닝에 표면 사건(쓰러진·숨진·발견)이 전혀 안 드러남 | 오프닝이 날씨와 건물 묘사로 끝난다 | E |
| `OPENING_CAST_ROLLCALL` | 오프닝이 등장인물 명부가 됨 | 첫 문단에 다섯 명이 직함과 함께 줄줄이 | E/W |
| `OPENING_INCIDENT_ONLY_HEARSAY` | 사건이 전해 들은 말로만 나오고 현장이 없음 | 「관리인이 말하기로는 …」만 있음 | E/W |
| `SCENE_DIALOGUE_MASHED` | 대사와 지문이 한 문단에 뭉침(오프라인 화면에서 말풍선이 깨진다) | 「"…" 그가 말했다. "…"」 한 줄 | E (2026-09-26, 전수 0건이라 올림) |
| `WORLD_FACT_VAGUE_SUBJECT` | `world_fact`가 대명사·지시어만 쓰고 `actors`의 이름이 없음(따로 떼어 놓으면 누구 얘기인지 모름) | 「그가 그것을 거기 두었다」 | E |
| `CLAIM_FACT_DUPLICATE` | `knows`의 사실이 `initial_claims`의 진술과 어미만 다른 같은 말 | 진술 「9시에 나갔어요」·사실 「9시에 나갔다」 | E/W |

### 2-4. 탐정 진입 시각

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `DETECTIVE_ENTRY_TIME_MISSING` | `detective_entry_time`이 없음 | 필드 자체가 없다 | E |
| `DETECTIVE_ENTRY_TIME_NO_CLOCK` | 시각이 없음(시간대 말만) → 타임라인과 견줄 수 없고 `check:novel`도 건너뜀 | 「사건 당일 오후」 | E/W |
| `DETECTIVE_ENTRY_TIME_BEFORE_INCIDENT` | 진입이 첫 타임라인 항목보다 앞섬 | 진입 06:00, `T01` 07:00 | E |
| `DISCOVERY_TIME_WORD_MISMATCH` | `setting`·`surface_incident`의 **발견 문장**의 시간대 말이 실제 발견 시각과 어긋남(죽은 때와 발견된 때를 뭉갠 문장) | 「밤, 숨진 채 발견」인데 발견은 이튿날 08시 | E/W |

### 2-5. 대립 단계 — 질문은 거짓 진술, 답은 카드

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `STAGE_COMPARISON_NOT_LIE` | `requires_comparison.claim_id`가 없거나 그 사람의 S- lie가 아니거나 `requires_heard_claim_ids`에 없음 | 비교 진술이 참 진술 `S-CH01-01`(truth) | E* |
| `STAGE_REQUIRES_BEYOND_COMPARISON` | 요구 카드에 비교 카드가 아닌 것이 끼어 있음 → 진술을 깰 카드를 다 내밀어도 안 열림(CASE008 `C01` 실플레이) | 비교 `[E03,E04]`, 요구 `[E03,E04,E07]` | E* |

### 2-6. 진술·아는 것

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `CLAIMS_ALIBI_ONLY` | 첫 면담 진술이 전부 그날 밤 자기 행적(묻기도 전에 알리바이) | 진술 셋이 「9시에…」「10시에…」「11시엔…」 | E/W |
| `KNOWS_UNGATED_FLOOD` | `knows`가 넷 이상 전부 `hidden_until` 없이 열려 면담 한 번에 다 나옴 | 잠금 없는 사실 여섯 | E (2026-09-26, 전수 0건이라 올림) |
| `MOTIVE_SELF_DISCLOSURE` | 자기 동기·자기 변호가 잠금 없이 본인 입에서 먼저 나옴(`points_at` 있는 마스터만) | 진범의 첫 진술 「제가 유산 문제로 다툰 건 맞지만…」 | E/W |

### 2-7. 관계·인물 — 관계도의 중심은 피해자

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `RELATIONSHIPS_MISSING` | `relationships`가 없음 | 필드 없음 | E/W |
| `RELATIONSHIPS_BROKEN` · `RELATIONSHIPS_SAYS_BROKEN` | `between`·`says`가 없는 인물 / `between` 밖 인물을 가리킴 | `says.CH06` | E |
| `RELATIONSHIPS_DUPLICATE_PAIR` | 같은 두 사람 쌍을 두 번 적음 | `REL02`·`REL05` 둘 다 CH01–CH03 | E |
| `RELATIONSHIPS_SHALLOW` | `private_strain`이 비어 겉모습만 있음 | `public_face`만 있다 | E |
| `RELATIONSHIPS_SURFACES_NO_ID` · `RELATIONSHIPS_SURFACES_UNKNOWN_ID` | `surfaces_when`이 id를 하나도 안 부름 / 없는 id를 부름(오프라인은 괄호 id만 읽는다) | 「재감정 메모를 보면」(id 없음) | E/W |
| `RELATIONSHIPS_STRAIN_NO_SUBJECT` | `private_strain`의 첫 이름이 `between` 밖 — 말할 사람이 없음 | 주어가 피해자 | E/W |
| `RELATIONSHIPS_SAYS_ECHOES_CLAIM` | `says`가 그 사람의 첫 진술과 같은 말(관계 질문 턴이 버려짐) | `says.CH02`가 `S-CH02-01` 그대로 | E/W |
| `RELATIONSHIPS_NO_SAYS` | 면담 가능한 인물이 낀 관계에 그 사람의 `says`가 없음(`audit:format`이 센다) | `REL03`에 `says.CH04` 없음 | 감사만 |
| `RELATIONSHIPS_CULPRIT_HUB` | 범인이 피해자보다 관계가 많음 → 관계도 모양이 범인을 흘림 | 범인 4개, 피해자 2개 | E/W |
| `RELATIONSHIPS_ORPHAN_CHARACTER` | 어느 관계에도 안 나오는 인물 | `CH05`가 관계 0개 | E/W |
| `STANCE_CULPRIT_TELL` | 범인만 가진 `voice_profile.stance` — 태도 하나로 범인이 짚힘 | 범인만 `imperious` | E/W |
| `CHARACTER_WITH_NO_QUESTION` | 이름으로 열리는 증언 카드가 한 장도 없는 인물(물을 것이 없다) | 진범 앞에서 물을 카드 0장 | W |

### 2-8. 헛다리 (레드헤링)

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `RED_HERRING_INCOMPLETE_ARC` | `suspicion_deepener`·`lingering_thread` 등이 비어 1막으로 끝남 | 여운 없음 | W |
| `HERRING_CLEAR_NO_ID` | `how_to_clear`가 id를 하나도 안 부름 → 「다 물어봤는가」로 떨어져 버튼만 누르면 풀림 | 「알리바이를 대조하면 풀린다」(id 없음) | E/W |
| `HERRING_CLEAR_UNKNOWN_ID` | 없는 id를 부름 → 영원히 안 풀림 | `E19` 없음 | E |
| `HERRING_CLEAR_SELF_ONLY` | 부르는 것이 전부 본인의 말 → 「본인이 아니라고 했다」로 풀림 | `S-CH03-01`·`S-CH03-02`만 | E/W |
| `HERRING_CLEAR_SHARES_STAGE_CARDS` | 해소 카드가 전부 대립 단계 카드 → 진범을 깨면 헛다리가 저절로 풀려 따로 지워 본 적이 없어짐 | `how_to_clear: E03, E04` = `C02` 카드 | E/W |
| `TESTIMONY_ALL_AT_CULPRIT` · `TESTIMONY_AIM_NARROW` | 방향(`points_at`) 있는 증언 중 진범 지목이 절반을 넘음 / 증언이 가리키는 사람이 진범 말고 둘 미만 → 물어보는 족족 같은 이름. `points_at` 있는 마스터만 | 증언 여섯 중 다섯이 진범을 가리킴 | E/W |
| `SUSPICION_THIN` | 헛다리 주인을 가리키는 카드가 둘 미만(동기 한 줄만 있는 「그럴 만한 사람」). `points_at` 있는 마스터만 | 오지수를 가리키는 카드 한 장 | E/W |
| `HERRING_OWNER_MISMATCH` | `character_id`가 `surface_suspicion` 문장의 이름과 다른 사람(`.offline.json`만) | 문장은 「곽지완이…」, id는 신아영 | E |

### 2-9. 가설 보드 (`motives`/`times`/`methods`가 있는 마스터에만 돈다)

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `HYPOTHESIS_LIST_MISSING` | 셋 중 하나가 없음 → 2막이 영영 안 열림 | `times` 없음 | E |
| `HYPOTHESIS_TRUTH_COUNT` | `truth:true`가 정확히 하나가 아님 | 정답 둘 | E |
| `HYPOTHESIS_ID_BROKEN` · `HYPOTHESIS_TEXT_MISSING` | id 비거나 겹침 / 고를 문구가 비어 있음 | `M01`이 둘 | E |
| `HYPOTHESIS_UNKNOWN_ID` · `HYPOTHESIS_TRUTH_NO_EVIDENCE` | `evidence_for`가 없는 카드 / 정답인데 `evidence_for` 없음(무엇을 걸어도 확정 안 됨) | `M02.evidence_for: [E22]` | E |
| `HYPOTHESIS_NO_REFUTATION` | 가짜 후보에 `refutation` 없음 → 그 갈래는 벽 | `T03` 오답인데 반박 없음 | E |
| `HYPOTHESIS_CULPRIT_REFUTATION` | `suspect_refutations`에 진범이 있음 → 정답 지목이 반박당함 | `suspect_refutations.CH01`(진범) | E |
| `BOARD_SUGGESTER_MISSING` · `BOARD_SUGGESTER_UNKNOWN` · `BOARD_CUE_MISSING` | 재료(`suggested_by`)가 없음 / 없는 id / 핵심어(`cue`) 없음 — 파일에 하나라도 재료가 있으면 전원 필수 | `H02`에 `suggested_by` 없음 | E |
| `BOARD_SUGGESTER_ACT2_ONLY` | 재료 전부가 2막에서만 열림(카드 제시 전제·단계 release) → 1막에서 그 후보를 떠올릴 길이 없음 | 재료 셋이 다 `hidden_until: C02` 뒤 | E |

### 2-10. 오프라인 판본 전용 (파일 이름이 `.offline.json`일 때만 돈다 — 원본에는 안 돈다, 부채는 `audit:offline`이 센다)

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `OFFLINE_SKELETON_MISSING` | 필수 표(`points_finger`·`comic_tell`·`knowledge_limits`·`points_at`·`mismatch`·헛다리 `character_id`/`weight`/`clearing_points_at`·관계 `id`·`access_level`·`connects_to`·보드)가 비어 있음. 무엇이 안 되는지는 `docs/offline-master-format.md` 「필수」 표 | 인물 둘에 `comic_tell` 없음 | E |
| `OFFLINE_SPEECH_SHAPE` | 말 필드가 따옴표에 싸여 있음(따옴표는 런타임이 세운다) | `says.CH02: "\"…\""` | E |
| `OFFLINE_TESTIMONY_UNQUOTED` | 증언 카드 `content`가 보고문(「○○는 …라고 인정한다」)이고 그 사람의 말이 아님 | 「최덕구는 새벽에 왔다고 인정한다.」 | E |

### 2-11. 분류 코드와 코퍼스 비율 (과용 — 전 마스터를 `otherCases`로 읽어 견준다)

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `UNKNOWN_ARCHETYPE_KEY` | 표에 없는 키 — 선언이 있으면 폴백을 건너뛰어 **어느 칸에도 안 세어진다**(값 없는 것보다 나쁨) | `method_archetypes: ["object_substitution"]`(은폐 축 키) | E* |
| `LEGACY_ARCHETYPE_KEY` | 옛 이름 | `staging` → `staging_cover_up` | E* |
| `MOTIVE_ARCHETYPE_OVERUSE` · `METHOD_ARCHETYPE_OVERUSE` | 동기·수법 칸이 코퍼스 8% 이상(37·35칸이라 기대치 ×2 ≈ 10%와 근접). `위장·은폐 조작`은 수법 축에서 뺀다 | `blunt_force` 8.4% | E/W |
| `LOCATION_ARCHETYPE_OVERUSE` · `LOCATION_FAMILY_OVERUSE` | 무대 칸 5% / 계열 20% | 공예 공방 계열 30% | E/W |
| `BACKGROUND_ARCHETYPE_OVERUSE` · `BACKGROUND_FAMILY_OVERUSE` · `BACKGROUND_PHRASING_OVERUSE` | 배경 칸 8% / 계열 20% / 서술 꼴 30% | 「…를 앞둔」 48% | E/W |
| `BACKGROUND_INTENSITY_UNSUPPORTED` | `background_intensity`를 `contributory` 이상으로 적었는데 그 배경 낱말이 `full_truth`에 없음(정규식 목록이 좁으면 오탐 — 갭 문서에 낱말을 적는다) | 「대조 물때」가 `seasonal_peak` 목록에 없어 운다 | E/W |
| `COVER_UP_TARGET_OVERUSE` · `COVER_UP_METHOD_OVERUSE` | **고정 8%가 아니라 칸당 기대치(사건당 평균 라벨 수 ÷ 칸 수) 대비 배수** — 1.5배 warn, 2배 새 사건 error(2026-09-26). 14·20칸이라 8%는 평균 미만이었다 | 「사인」 41% = 기대 13%의 3.2배 → 새 사건 error · 「현장 재배치」 19% = 2.0배 → warn | 배수별 |
| `COVER_UP_PAIR_OVERUSE` | 은폐 방식 **둘의 짝**이 8% 이상(가능한 짝 190개라 8%는 평균의 열세 배) | 「사고 위장 + 증거 제거」 20% | E/W |
| `TITLE_TEMPLATE_OVERUSE` | 제목 틀(조사+관형형 서술어)이 5건 이상 | 「○가 삼킨 △」 12건 | E/W |

### 2-12. 판박이 — 틀·쌍·구간 (전 마스터를 읽어 번호가 붙은 것과 견준다)

| 코드 | 무엇을 보나 | 걸리는 예 | 심각도 |
| --- | --- | --- | --- |
| `CORPUS_TEMPLATE_DUPLICATION` | `full_truth` 문장이 기존 사건과 골격 수준으로 겹침(명사만 바꾼 재사용) | `method`가 CASE071과 명사만 다름 | E |
| `SETTING_DEADLINE_DISCOVERY_TEMPLATE` | `setting`이 「○○를 앞둔 시점 + 숨진/쓰러진 채 발견」 골격(코퍼스 87%가 쓰던 틀). 낱말만 갈아서는 안 풀린다 | 「공개를 사흘 앞둔 밤, 대표가 숨을 거둔 채 발견됐다」 | E* |
| `METHOD_GAUGE_TAMPER_TEMPLATE` | 「계기 표시값 조작 → 안전장치 우회 → 정상 수치를 믿고 진입」 골격(옛 CASE061~111 51건) | 압력계 눈금을 돌려 놓는 트릭 | E |
| `TIMELINE_GENERIC_DISCOVERY_TEMPLATE` | 「3일 전 16:00 우연히 발견」·「순찰 중 쓰러진 ○○를 발견」 골격 | `T01` 「3일 전 16:00 … 우연히 발견한다」 | E |
| `NEIGHBOR_TWIN` · `NEIGHBOR_TWIN_UNJUDGED` | 같은 막·붙은 번호와 축 다섯(수법·동기·진입 시각·단계 이름·인물 배치) 중 셋 겹침 / 둘 겹치는데 나머지를 잴 값이 없음 | 019↔020: 진입 06:10·단계 사슬·인물 배치 | E/W |
| `RANGE_TWIN` | ±10 번호 안에 같은 골격(단계 사슬·진입 시각·타임라인 시각 골격)이 넷 이상 몰림 | `initial→admits_dispute→…` 39건이 061~110에 | E/W |
| `PAIR_TWIN` | 붙은 두 번호(Δ≤2)가 축 셋 이상 겹침 — 사슬 골격(필수)·수법·동기·배경·무대·인물 배치·은폐 두 칸 이상 겹침·**엔딩 산문**(이름·숫자 지운 문장 ≥3 같음) | 038↔039: 사슬 + 동기 + 엔딩 마무리 세 줄 | E* |

## 3. `npm run check:offline [ID…]` — 무식한 플레이어가 끝까지 가나 (①·②에서 돈다)

`offline-playthrough-check.mjs`. 방에 다 들어가고 뒤질 것을 전부 뒤지고 모두에게 모든 카드를 제시하며 움직임이 멈출 때까지
반복한다. 판본(`.offline.json`)이 있으면 그것을 건다. **여기서 막히는 사건은 영영 못 깨는 사건이고 번호가 곧 막이라 플레이어가 갇힌다.**

| 보는 것 | 걸리는 예 |
| --- | --- |
| **완주 가능/불가** — 마지막 대립 단계까지 가고 종결 화면(엔딩 장면)이 뜨는가 | `C03`이 요구하는 카드를 어느 방도 내주지 않아 불가 |
| **가설 보드** — 네 칸이 굳는가(걸고 → 굳혀 보고 → 들이댄다), 잠긴 후보는 건너뜀 | 정답의 `evidence_for` 카드가 1막에서 못 나와 굳지 않음 |
| **텍스트 이상** — 빈 메시지 · 시스템체/영문 코드가 새는 문장(`BAD` 정규식) · 뒷토막·한지우·탐정 대사에 같은 것 | 화면에 `undefined`, `[object Object]`, `E03`이 그대로 |
| `OFFLINE_CHECK_HERRING=1` | 헛다리가 실제로 풀리는가 | 카드를 다 내밀어도 `R02`가 안 풀림 |

## 4. `npm run check:novel [파일]` — 소설의 시간 흐름을 마스터와 (⑤ 루틴만, CI에 없다)

`check-novel-time.mjs`. 전제 둘: 서술문의 시각은 앞으로만 가고, 대사 속 시각은 회상이라 역행해도 되지만 전부 마스터에 있어야 한다.

| 코드 | 무엇을 보나 | 걸리는 예 |
| --- | --- | --- |
| `TIME_BACKWARD` | 지문의 시각이 앞 장보다 뒤로 감 | 3장 21:10 뒤에 4장 20:50 |
| `TIME_NOT_IN_MASTER` | 소설이 쓴 시각이 마스터에 없는데 「보탠 것」에 근거가 적혀 있다 → 시각 되먹임 루틴의 입력 | CASE008의 21:03(제다실→다호 이동) |
| `TIME_UNRECORDED` | 근거가 어디에도 없는 지어낸 시각 | 분위기용 「10시 40분」 |
| `ENTRY_TIME_MISMATCH` · `ENTRY_TIME_UNPARSED` | 1장 시각이 진입 시각과 다름 / 진입 시각을 못 읽음(그 편의 다른 검사도 건너뜀) | 진입 「사건 다음날 오전」 |
| `TIMELINE_AFTER_ENTRY_UNUSED` | 마스터엔 있는데 소설이 안 쓴 진입 이후 항목(소설 쪽 일감) | `T14`를 소설이 건너뜀 |
| `TITLE_LABEL` 파싱 | 장 제목을 구분자(`—`·`,`·`·`)로 **토막 내고 토막마다** 읽는다 — 낱말이 목록에 없으면 그 편 검사가 조용히 꺼진다(「밤」이 빠져 있던 사고). **2026-09-26 이전에는 `TITLE_SCENE` 이었고 「시각으로 끝나는」 제목만 읽어 「## 1. 저녁 8시 15분 — 조정실」 꼴이 통째로 안 잡혔다**(그 편들은 역행·진입 시각 검사가 안 돈 채 「이상 없음」이 나왔다 — 다섯 편). | 제목이 「저녁 무렵」이면 구간으로 |

## 5. 감사 (`audit:*`) — 세는 것, 막지 않는 것 (⑤ 루틴·손으로. `lint:baseline`만 ②에도 있다)

| 명령 | 무엇을 세나 | 예 |
| --- | --- | --- |
| `audit:format` | 마스터 포맷 부채 — `masterFormatWarnings`(장소/인물 못 읽음 · 진입 시각 없음 · 관계 없음 · 단계 키가 서술문) + 「읽고 다시 써야 남는 것」(관계 모양·헛다리 해소·knows 홍수·알리바이만·자기 동기·오프닝 명부·`RANGE_TWIN`) | `--list`로 사건 id까지 |
| `audit:offline` | 원본(판본 있으면 판본)이 오프라인 필수 표를 얼마나 갖췼나, 번호순. 필수 열은 준비도를 막고 권장 열(반박 전원·목소리·해결편)은 따로. **다음 게이트까지 비는 번호**가 판본 루틴의 입력 | 「앞에서부터 013까지 → 16편까지 비는 번호 014·015·016」 |
| `audit:duplication` | 인물명·숫자를 지운 뼈대로 **3건 이상**에서 같은 문장. 필드 목록을 들고 있지 않다(전 필드) | 「외부인의 침입 흔적은 확인되지 않았다」 65건 |
| `check:spelling` | 코퍼스와 대사 풀의 띄어쓰기·맞춤법 아홉 규칙(`scripts/lib/korean-proofread.mjs`) — 의존명사 거/것/수/지, 오래되다, -ㄹ게, -이에요, 문장부호 앞 붙임. 고치지 않고 센다 | 「실수 없이」의 「수」를 의존명사로 오인한 1건이 지금 기존 오탐 |
| `check:banter` | 탐정·한지우 대사 풀이 **고르게** 나오나 — N건 완전 탐색 뒤 가장 쏠린 풀이 고른 분포보다 몇 %p 넘는지 | 한 풀이 +18%p |
| `lint:baseline` | oxlint 에러 수를 기준선(49)과 비교, 늘면 실패. JSON 리포터로 세는 이유는 CI 리포터가 요약 줄을 덧붙여 수가 달라져서 | 50건 → 실패 |
| `recent:avoid` | 최근 10건에서 반복된 수법 계열·제목 틀·배경 장치·진입 경로 — 새 사건이 피할 목록(코퍼스 크기와 무관하게 듣는다) | 「최근 10건 중 4건이 공예 공방」 |
| `next:case-id` | 가장 작은 빈 번호(registry에 있던 번호는 건너뜀). 번호가 곧 플레이 순서 | CASE331 |
| `ids <ID> [이름\|fix]` | id 대응표 / 이름→id / `red_herrings[].character_id`를 문장에서 유도해 채움 | `npm run ids CASE045 fix` |
| `build:source <ID>` | 마스터를 사람이 읽는 `<ID>.source.md`로. 손으로 고쳤으면 다시 돈다 | — |
| `pools:doc` | 태도별 대사 표 넷을 `docs/banter-pools.md`로 재생성 | — |

## 6. 런타임 백스톱 — 검사기가 아니라 게임이 돌 때 잡는 것 (④)

| 자리 | 무엇을 막나 | 예 |
| --- | --- | --- |
| `app/gm/response-signals.ts` | AI GM 응답의 화자 드리프트·모순 봉합·정보 유출. 정답 자체를 가리키는 낱말(동기/수법/범인/정답)과 구체적 은폐 낱말(조작/은폐/위조/독성…)만 본다 — 의혹·다툼·언쟁 같은 일상 수사 어휘로 잡던 오탐(CASE009 실플레이)은 뺐다 | 두 NPC 이름 + 「수법」이 한 문장에 |
| `evidenceLeakDetected` (`app/game.ts`) | 아직 내주지 않은 카드의 내용이 서술에 나오는가. `audit-evidence-leak.ts`가 이것을 세 상황으로 재현한다 | 위 1절 |
| `masterFormatWarnings` (`app/gm/master-index.ts`) | 사건을 열 때 화면에 뜨는 포맷 경고 넷 — 장소/인물 못 읽음 · 진입 시각 없음 · 관계 없음 · 단계 키가 서술문 | 「인물 관계 데이터가 없다 — GM이 관계를 매 턴 즉흥으로 만든다」 |
| `pendingReworkWarnings` | 목록 화면의 「수사 가능」 라벨이 보는 판정(`audit:format`의 부합 판정과 같아야 한다) | — |

## 7. 심각도 규칙 한 장

- **새 검사는 error**(2026-09-21). warn으로 두려면 사용자 승인. 읽는 사람 없는 경고는 부채를 세는 일일 뿐이다.
- **비율·뼈대 검사는 등록 warn·새 사건 error** — 채우면 끝나는 부채용. 예외로 등록 무관 error 여덟: `UNKNOWN_ARCHETYPE_KEY` · `LEGACY_ARCHETYPE_KEY` · `CASE_COMPLETE_UNREACHABLE` · `SETTING_DEADLINE_DISCOVERY_TEMPLATE` · `STAGE_KEY_IS_OWN_TESTIMONY` · `PAIR_TWIN` · `STAGE_COMPARISON_NOT_LIE` · `STAGE_REQUIRES_BEYOND_COMPARISON`.
- **은폐 두 축**은 고정 8%가 아니라 칸당 기대치 대비 배수(1.5배 warn · 2배 새 사건 error). 「칸이 흔해서」 `other`로 내리지 않는다.
- **판박이는 고쳐 쓰지 않고 뒷번호를 지운다**(사용자 지정). 엔딩 산문 축으로만 걸린 쌍은 뒷번호의 겹친 문장만 다시 썼다(사건이 아니라 마무리 틀만 같아서).
- `check:case`는 **JSON 스키마를 돌리지 않는다** — 스키마의 `required`·설명문은 아무것도 막지 않는다. 막고 싶으면 여기 검사를 넣는다.
