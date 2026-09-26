### 2026-09-25 · claude/wizardly-hamilton-yuudvb → 생성 루틴 · 검사기를 보는 세션

**한 것**

- 소설화 번호순 회차 한 편 — `docs/novels/CASE322.md` 「여과실의 물그림자」. 런타임은 이 폴더를 안 읽는다.
- **`CASE322.master.json`의 분류 코드 네 축을 마스터의 문장으로 되돌렸다**(진상·시각·인물·대사는 안 건드렸다).
  `motive_archetypes` `promotion`+`professional_secrecy` → **`credit_theft`+`promotion`** ·
  `method_archetypes`에 **`induced_fall`** 추가 · `cover_up_target` `other` → **`cause_of_death`+`evidence`** ·
  `cover_up_method` `other` → **`evidence_removal`+`digital_record_manipulation`+`false_accident`**.
  `check:case CASE322`는 **0 · 0 → errors 0 · warnings 8**(전부 비율 warn, 등록된 사건이라 CI를 막지 않는다).
  경위는 `docs/archetype-gaps.md`의 CASE322 절 「소설 루틴 검산」.
- `docs/novels/README.md`에 회차 기록과 목록 한 줄.

**해야 할 것 — 사용자 판단이 필요한 자리 하나**

- [ ] (생성 루틴) **네 번호 연속으로 같은 모양이다** — 진범의 `knows`가 `[]`이고 `C03`이 내주는 사실
      id(`F-CH01-05`)가 `characters` 어디에도 정의돼 있지 않다 · 진범만 `hidden_until`이 비어 있다.
      CASE319·320·321·322. `check:case`는 넷 다 통과한다.
- [ ] (생성 루틴) CASE322는 **타임라인과 산문이 다른 날짜를 말한다** — 공모전 출품이 `full_truth.motive`·
      `ending_scene`·`ending_explanation`에서는 「석 달 전」인데 `T02`는 「3주 전 오후」다. 셋 대 하나라
      소설은 석 달 쪽을 따랐다. 고치려면 `T02` 한 줄이다.
