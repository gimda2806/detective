# 2026-09-25 — offline-master-schema-dialogue-l19qag

## 가설 제시와 증거 제시를 갈랐다 (엔진)

- `judgePress`는 이제 카드를 안 본다 — `deny` / `refuted` 둘뿐. `wrong_respondent`·`short`·
  `confirmed`는 사라졌다. 굳힘은 새 `judgeConfirm` + 행동 `hypothesis|confirm|<slot>`
  (composed, 화면 버튼 「굳힌다」).
- 「누가」 보기는 본인 앞에서만·한 번만(`hyp|pressed|who|CH##`). 접히지 않는다.
- 진범이 지목당하면 `initialClaims`의 첫 lie를 말한다(`heard_statements`에 들어간다).
- 완주 검사기(`offline-playthrough-check.mjs`)의 보드 놀이 순서가 바뀌었다: 걸고 → 굳혀 보고 → 들이댄다.
- 대사 풀: `LEAD_HYP_DENY`·`JIWOO_HYP_DENY`·`JIWOO_HYP_DENY_HEARD`·`NPC_HYP_DENY_OTHER`·
  `LEAD_HYP_UNSUPPORTED`·`JIWOO_HYP_UNSUPPORTED` 새로, `LEAD_HYP_CONFIRMED`는 보드 서술로.
- 근거: `docs/offline-deduction.md` 「2026-09-25」 절. 실측은 CASE012 카드 0장 전수 찍기(구 규칙에서 네 칸 다 읽힘)와 CASE008 시나리오.

## 판본 부채

- 001~011 판본은 헛다리 주인에게 `suspect_refutations`가 없어 「누가」 지목에 일반 부인이 나온다
  (CASE008 오지수·서준혁). 진범 표시는 아니지만 얇다. 「진범 뺀 전원」 규칙에 맞춰 채우면 좋다.
