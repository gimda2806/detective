# 오프라인 전용 마스터 포맷

`data/pending-cases/<ID>/Case-No-<NNN>.offline.json` 이 갖춰야 하는 것.

**이 문서가 기준이다**(2026-09-21 사용자 결정). 지금까지 이 규칙은 세 군데에
흩어져 있었다 — `case_master.schema.json` 의 설명문, `validate_master.ts` 의
검사 함수들, 그리고 CLAUDE.md 의 절 몇 개. 그래서 **스키마가 「오프라인에서는
필수」라고 적어 둔 규칙이 아무 데서도 안 돌고 있는** 일이 실제로 일어났다
(`check:case` 는 JSON 스키마를 돌리지 않는다). 앞으로는 여기를 고치고, 검사기를
여기에 맞추고, **벗어난 판본을 고친다** — 이 순서다.

## 왜 원본과 다른 파일인가

같은 번호를 두 경로가 다른 데이터로 연다. `/offline` 만 이 파일을 보고, AI
경로와 목록 화면은 원본 `<ID>.master.json` 을 그대로 본다(원본은 지우지 않는다).

가르는 이유는 하나다 — **오프라인 GM 에게는 모델이 없다.** AI 경로는 빈칸을
즉흥으로 메우지만 이쪽은 못 메운다. 그래서 **마스터에 안 적힌 것은 오프라인에
없는 것**이고, 원본에서 선택이던 필드들이 여기서는 필수가 된다.

## 필수 — 없으면 `check:case` 가 선다

`validate_master.ts` 의 `checkOfflineSkeleton` 이 **파일 이름이
`.offline.json` 으로 끝날 때만** 붙어서 본다. 전부 `severity: 'error'` 이고
등록 여부와 무관하다(원본에는 아예 안 돈다 — 253건의 부채는 `audit:format` 이
따로 센다).

| 필드 | 없으면 무엇이 안 되나 |
| --- | --- |
| `characters[].points_finger` | 「누가 그랬다고 생각하는지 묻는다」가 내줄 것이 없어 **그 보기가 아예 안 뜬다** |
| `characters[].comic_tell` | 인물의 버릇을 런타임이 못 꺼낸다(`npc-voice.ts`·`offline-engine.ts`) |
| `characters[].knowledge_limits` | 그 사람이 **모르는 것**의 경계가 없어진다(`master-index.ts`) |
| `evidence[].points_at` | `SUSPICION_THIN`·`TESTIMONY_*` 세 검사가 **통째로 안 켜진다**. 어느 쪽으로도 안 기우는 카드는 **`null` 로 적는다** — 키가 없는 것과 다르다 |
| `evidence[].mismatch` | 물증이 「무엇이 있었다」로 끝나고 「있어야 할 자리에 없다」가 사라진다 |
| `red_herrings[].character_id` | 런타임이 `surface_suspicion` **문장에서 이름을 찾는** 폴백으로 떨어진다 → 가나다순으로 먼저인 사람이 주인이 된다 |
| `red_herrings[].weight` | 헛다리가 「그럴 만한 사람」에서 그치고 「그날 그럴 수 있었던 사람」이 안 된다 |
| `red_herrings[].clearing_points_at` | 헛다리를 지우는 것이 진범 쪽으로 한 걸음이 되지 않는다 |
| `relationships[].id` | 관계를 가리킬 이름이 없다 |
| `locations[].access_level` | 지도가 통제 구역을 구분해 그릴 수 없다(`access` 는 서술문이라 UI 가 못 읽는다) |
| `locations[].connects_to` | 지도에 연결선이 안 그려진다 |

같이 붙는 것 둘:

- **`HERRING_OWNER_MISMATCH`** — `character_id` 가 **엉뚱한 사람**일 때 운다.
  `surface_suspicion` 에 그 사람 이름이 없고 남의 이름만 있으면 어긋난 것이다.
  **전수 플레이는 이것을 못 잡는다** — 모든 카드를 모두에게 내밀기 때문에
  조건만 차면 주인이 누구든 헛다리가 풀린다.
- **`REFERENCE_OWNERSHIP`** — id 가 **그 자리에 올 수 있는 것인가**. 원본에도
  돈다. `points_finger.at`(존재·자기 자신 아님)·`because`/`opens`(그 **인물
  자신의** knows/initial_claims)·`clearing_points_at`(존재·주인공 아님)·
  `weight.motive`(M## 이거나 빈 문자열)·`weight.means`(존재하는 카드이고 그
  카드의 `points_at` 이 이 인물).

## 사건마다 달라서 강제하지 않는 것

없어도 되는 게 아니라 **있고 없고가 사건에 달린** 것들이다.

- `relationships[].says.<CH>` — 그 관계에 낀 사람만 말한다. 피해자(V##)는
  면담할 수 없으므로 빠진다.
- `suspect_refutations.<CH>` — 보드의 칸을 반박하는 사람만 가진다.
- `full_truth.accomplice` — 공범이 있는 사건만.
- `full_truth.cover_up_method`/`cover_up_target` — 은폐가 있는 사건만.
- `locations[].detail_rules[].requires` — 선행 조건이 있는 규칙만.

## 아직 안 정한 것

여기에 적어 두고, 정해지면 위로 옮긴다.

- `case_identity.title_ko` — CASE001 에만 있다. 나머지 일곱은 쓰지 않는다.
  옛 키인지 살릴 키인지 정하지 않았다.
- `case_identity.detective_entry_type` — CASE005 에만 없다.
- `evidence[].points_at` 을 **런타임도** 읽게 할 것인가. 지금은 검사기
  (`SUSPICION_THIN` 등)만 본다.

## 지금 벗어나 있는 판본

**없다**(2026-09-21). 여덟 판본(001~006·008·009)이 위의 필수 표를 전부
채우고 `check:case` 를 통과한다. `npm run check:case <ID>` 가 그대로
짚어 주므로, 벗어난 것이 생기면 여기에 줄을 적고 고치면 지운다.

이 문서를 세우면서 실제로 셋이 드러났고 같은 커밋에서 고쳤다:

- **CASE001** 이 여덟 중 가장 옛 포맷이었다 — `comic_tell`·`knowledge_limits`·
  `relationships[].id` 가 없었다. 앞의 둘은 런타임이 읽는 값이라 그동안 GM 이
  그만큼 덜 가진 채 돌았다. 첫 막의 유일한 사건이 가장 오래된 판본이었던 셈이다.
- **`access_level`/`connects_to` 가 4대4로 갈려 있었다**(001~004 에만 있었다).
  한때 「CASE005 가 그 둘 없이 도니 선택」이라고 판단했는데 실은 넷이 갖고
  있었다 — 없어도 도는 값이지만 절반만 가진 상태는 포맷이 아니므로 필수로
  올리고 넷을 채웠다. 여덟 사건 모두 **장소가 한 덩어리로 이어진다**(고립된
  장소 없음).
- **CASE009** 에 구멍 셋(`does_not_prove` 한 장, `cleared_by` 한 자리,
  `observation_rules` 한 곳)이 있었다. 앞의 둘은 이 세션이 그 판본을 만들며
  낸 것이다.

## 어떻게 검사되는가

```
npm run check:case <CASE_ID>
```

오프라인 판본이 있으면 **원본과 그 파일을 따로 한 번씩** 돌린다. 출력에
`──── validate_master (Case-No-004.offline.json) ────` 섹션이 그것이다.

```
npm run check:offline
```

전 사건을 무식한 플레이어로 완주시킨다. **오프라인 판본이 있는 번호는 그
파일로 센다.** 여기서 막히는 사건은 영영 못 깨는 사건이 되고, 번호가 곧 막이라
(`case-gate.ts`) 그 막에 플레이어가 갇힌다.

```
npm run ids <CASE_ID>            인물·카드·헛다리 대응표
npm run ids <CASE_ID> <이름>      그 사람의 id 하나
npm run ids <CASE_ID> fix        character_id 를 문장 속 이름에서 채우거나 고친다
```

**마스터를 손으로 고칠 때 번호를 타이핑하지 않는다.** 이름에서 번호로 옮겨
적는 그 한 단계가 실수가 나는 자리다.

## 새 판본을 만들 때

원본을 복사해서 시작해도 된다 — 2막 세 건(CASE006·008·009)이 그렇게 만들어졌다.
다만 복사만으로는 위의 **필수** 표가 비므로 `check:case` 가 선다. 채워야 할
것은 사건을 읽어야 나오는 값들이고, 그중 둘만 요령이 있다.

- `points_finger` 는 **다섯이 저마다 다른 곳을 가리켜야** 한다. 진범을
  가리키는 것은 하나면 족하다 — 물어보는 족족 같은 이름이 돌아오면 세 번째쯤에
  답이 보인다.
- `weight.means` 는 **그 사람 쪽으로 기울어지는 카드**(`points_at` 이 그
  인물인 것) 둘이어야 한다. 하나면 우연으로 읽히고 둘이 겹쳐야 사람이 된다.
