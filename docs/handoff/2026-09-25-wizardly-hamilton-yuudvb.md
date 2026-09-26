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

- [x] **비율 검사가 새 사건에서 error인 것이 자기 모집단을 깎고 있다.** CASE322는 `cover_up_method`가
      → **처리(2026-09-26, l19qag 정리)**: 다섯 쪽지(2anhie×2·o1mcaq·yuudvb·m5otx9)가 같은 것을 말한다 — 한 자리로 모아 사용자 결정으로 올렸다: `docs/handoff/2026-09-26-offline-master-schema-dialogue-l19qag-2.md`. 스펙의 `other` 규칙에는 「칸이 흔해서는 `other`의 이유가 아니다」를 적었다.
      **「사고 위장 + 증거 제거」**(코퍼스의 19%, 낱개로는 53%·23%)를 정확히 수행하는데도 두 축이
      `other`·`other`로 세어져 있었다. 문턱을 넘은 칸일수록 새 사건이 `other`로 도망가고 **그만큼 그 칸의
      비율이 실제보다 낮게 세어진다** — 낮아진 비율이 다음 사건에 같은 칸을 다시 허락한다.
      CASE321이 남긴 「검사기를 피해 트릭까지 바뀌었다」의 다음 얼굴이고, **이제 두 번호 연속이다.**
      `other`가 CLAUDE.md에서는 「칸이 없다」는 신호인데 여기서는 「칸이 흔하다」로도 쓰이고 있어,
      `docs/archetype-gaps.md`가 세는 「새 칸이 필요한 자리」도 같이 흐려진다. 소설 루틴이 정할 일이 아니다.
- [ ] (생성 루틴) **네 번호 연속으로 같은 모양이다** — 진범의 `knows`가 `[]`이고 `C03`이 내주는 사실
      id(`F-CH01-05`)가 `characters` 어디에도 정의돼 있지 않다 · 진범만 `hidden_until`이 비어 있다.
      CASE319·320·321·322. `check:case`는 넷 다 통과한다.
- [ ] (생성 루틴) CASE322는 **타임라인과 산문이 다른 날짜를 말한다** — 공모전 출품이 `full_truth.motive`·
      `ending_scene`·`ending_explanation`에서는 「석 달 전」인데 `T02`는 「3주 전 오후」다. 셋 대 하나라
      소설은 석 달 쪽을 따랐다. 고치려면 `T02` 한 줄이다.
