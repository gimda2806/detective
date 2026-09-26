### 2026-09-25 · claude/wizardly-hamilton-m5otx9 → 생성 루틴 · 검사기를 보는 세션

**한 것**

- 소설화 **번호순 회차 — CASE321 한 편**([docs/novels/CASE321.md](../novels/CASE321.md), 「부스 안의 마지막 테이크」).
  README 표 한 행·「다음 차례」 줄·회차 절을 갱신했다. 회차 시작할 때와 PR 직전에 두 번 셌고
  둘 다 하나였다(`for d in $(ls data/pending-cases/); do [ -f "docs/novels/$d.md" ] || echo $d; done`).
  판본 대조 갈래도 비어 있다 — `Case-No-*.offline.json` 열셋 전부 그 번호의 소설에 절이 붙어 있다.
- **`CASE321.master.json`을 여섯 칸 고쳤다**(진상·시각·인물은 한 글자도 안 건드렸다). 아래 둘이다.
- 검사: `check:case CASE321` errors 0 · warnings 4(고치기 전 0 · 0) · `check:novel` 이 편 이상 없음
  (코퍼스 총계 360 그대로) · `check:offline CASE321` 완주 가능 1 · 불가 0 · 텍스트 이상 0 ·
  `build:source CASE321` 재실행(출력 변화 없음).

#### 1. 「웨이트 블록」 세 줄 — **바꾼 수법이 세 자리에 안 닿았다**

이 사건의 수법은 **방음 담요 질식**인데(`full_truth.method`·`method_archetypes`·`E03`·`E04`·`C03`·
`ending_scene` 전부), 아래 셋이 **둔기 타격**을 그대로 말하고 있었다.

```
case_identity.genre                    「격분해 폴리 웨이트 블록으로 내리친 살인 / 장비 사고 위장」
CH04 S-CH04-04.reason_for_limit_or_lie 「웨이트 블록으로 가격해 살해한 사실을 감추기 위해」
C02.must_not_release[0]                「웨이트 블록으로 가격한 사실」
```

경위는 `docs/archetype-gaps.md`의 CASE321 절에 있다 — 처음 `blunt_force`로 썼다가 **비율 경고(8.4%)를
피하려고 트릭 자체를 다시 짰고**, 그 치환이 이 셋에 닿지 않았다. **`check:case` 세 검사도 JSON 스키마도
안 잡는다**(errors 0 · warnings 0으로 통과했다). 셋 다 담요 질식으로 고쳤다.

**생성 루틴에 영향이 있다**: `recent-avoid.mjs`는 `full_truth.method`와 `case_identity.genre`를 **함께**
읽어 수법 계열을 고른다(`scripts/recent-avoid.mjs:122`). 그대로 뒀으면 **다음 회차가 코퍼스에 둔기 사건을
하나 더 세고 그만큼 다른 수법을 골랐을 자리**다. `genre`는 `structured-master-converter.ts`가 `raw_text`로
내보내고 `build_case_registry.ts`가 레지스트리에도 싣는다.

**CASE320의 「윤슬이요?」(지워진 인물 이름이 `says` 한 줄에 남은 것)와 같은 구멍의 두 번째 얼굴이다** —
겹치는 것만 문제가 아니라 **고친 뒤 남는 것**이 문제이고, 이번엔 이름이 아니라 **흉기**가 남았다.
**값을 통째로 바꾼 뒤 그 낱말을 마스터 전문에서 다시 세는 절차**가 생성 루틴에 있으면 둘 다 잡힌다
(이번엔 `grep -rn "웨이트 블록" data/pending-cases/CASE321/` 한 줄이었다).

#### 2. 분류 코드 세 축 — **「등록 뒤 되돌릴 여지가 있다」를 실제로 썼다**

`docs/archetype-gaps.md`의 CASE321 절이 스스로 적어 둔 문장이다: *「등록 뒤 warn으로 내려가면
`location_archetypes`·`cover_up_target`을 실제 값으로 되돌릴 여지가 있다」*. 그 여지를 썼다.

| 축 | 전 | 후 |
| --- | --- | --- |
| `location_archetypes` | `other` | `production_studio` |
| `motive_archetypes` | `business_control` · `contract_breach` | **`credit_theft`** · `contract_breach` · `business_control` |
| `cover_up_target` | `other` | `cause_of_death` · `evidence` |

갭 문서가 세 칸 모두 **「칸이 없어서가 아니다」**라고 명시해 두었고, CLAUDE.md는 「경고를 없애려고 칸을
내리지 않는다」·「가장 가까운 칸에 억지로 밀어 넣지 말 것」이라고 적는다. 새 사건에서는 그 검사가 error라
생성 루틴에 선택지가 없었고, **등록된 지금은 같은 검사가 warn이다.** 경고 넷이 되돌린 세 축에만 붙었다.

**해야 할 것**

- [x] **(생성 루틴 · 사용자)** **비율 검사가 새 사건에서 error인 것이 분류 코드만이 아니라 트릭까지 밀고 있다.**
      → **처리(2026-09-26, l19qag 정리)**: 다섯 쪽지(2anhie×2·o1mcaq·yuudvb·m5otx9)가 같은 것을 말한다 — 한 자리로 모아 사용자 결정으로 올렸다: `docs/handoff/2026-09-26-offline-master-schema-dialogue-l19qag-2.md`. 스펙의 `other` 규칙에는 「칸이 흔해서는 `other`의 이유가 아니다」를 적었다.
      CASE321 한 사건에서 **다섯 축이 비율 때문에 움직였고**, 그중 하나는 **수법을 둔기에서 질식으로 다시 짠
      것**이다(갭 문서에 그렇게 적혀 있다). 그 결과가 위 1번의 세 줄이다. CLAUDE.md가 적은 「두 번 잃는다」
      위에 **세 번째 손실**이 있다 — 사건 자체가 검사기를 피해 움직인다. 소설 루틴이 정할 일이 아니라 남긴다.
      (참고: `MOTIVE_ARCHETYPE_OVERUSE`의 경고문은 「덜 쓰인 동기로 **다시 설계할 것**」이라고 말하는데,
      등록된 사건에서는 다시 설계할 수 없다 — CASE320 회차가 「같은 문장이 등록 전후로 다르게 읽혀야 한다」고
      적어 둔 자리다.)
- [ ] **(생성 루틴)** **CASE319 → 320 → 321 세 번호 연속으로 같은 셋이 나온다.** ① 진범의 `knows`가 `[]`인데
      단계가 내주는 사실 id(`F-CH04-05`)가 `characters` 어디에도 정의돼 있지 않다 — `case_complete`와
      `ending_explanation`이 그 id를 부르는데 `check:case`는 통과한다. ② **진범만 `hidden_until`이 비어 있다**
      (다른 넷은 전부 갖는다) — CLAUDE.md의 「변명은 그 사실에 `hidden_until`로 잠근다」와 다른 모양이다.
      ③ 알리바이 카드가 전부 「계정 기록이 끊김 없이 돌았다」 한 모양이고 `does_not_prove`도 같은 문장이다.
      **세 번 연속이면 개별 사건의 실수가 아니라 틀이다.**
- [ ] **(이주 루틴 · 판본을 뜰 세션)** **`L03.base_description`이 CASE321을 스스로 깬다.** 「부스 쪽 방음 유리
      너머로 쓰러진 설재하의 모습이 보인다」인데, `E07`·`E11`은 **두 사람이 19시 40분부터 20시 5분까지 그 방에
      있었다**고 적고 살해는 19시 50분, 부스로 가는 길은 그 방 하나뿐이다(`L02.connects_to`). **그 유리가 늘
      보이는 것이면 사건이 성립하지 않는다.** 소설은 **콘솔이 유리를 등지고 있다**는 한 줄로 메웠고
      (창고를 개조한 건물이라는 `setting`에서 따라 나오며, `T14`의 20시 5분 발견까지 같이 설명한다)
      그 자리를 「오프라인으로 옮길 것」의 첫 줄로 적어 뒀다. **마스터에는 그 값이 없다.**
