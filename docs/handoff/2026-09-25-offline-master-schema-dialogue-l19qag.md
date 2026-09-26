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

## 단계 요구 카드 = 비교 카드 (검사기 + 마스터 110건)

- `STAGE_REQUIRES_BEYOND_COMPARISON`(error, 원본·판본 모두). `requires_presented_evidence_ids` 에
  `requires_comparison.evidence_ids` 밖의 카드가 있으면 선다.
- 올리며 원본 108건 200단계 + 판본 2건(CASE006 C02, CASE008 C03)을 기계로 잘랐다 — 요구를 비교
  카드로, 뺀 카드의 `presentation_effect` 에서 그 단계를 뺐다. `build:source` 도 다시 돌렸다.
- **생성 루틴·이주 루틴에 영향**: 새 사건은 단계의 요구 카드를 비교 카드와 같게 써야 한다.
  `scripts/case_generation_prompt.md` 6번 항목에도 넣었다.

## 1막의 화폐는 말 — 후보 재료 `suggested_by`·`cue`

- 스키마·변환기·인덱스에 두 필드. 엔진 `candidateLocked`: 재료가 안 닿은 후보는 적을 수도(set)
  들이댈 수도(press) 없다. 화면은 흐리게(`hyp-candidate--locked`). 재료 없는 판본은 늘 열림.
- 검사 `BOARD_SUGGESTER_MISSING`·`BOARD_SUGGESTER_UNKNOWN`·`BOARD_CUE_MISSING`(error) — 파일에
  `suggested_by` 가 하나라도 있으면 후보 전원이 가져야 한다.
- 열두 판본 전부 이었다(후보 140개, 재료 337개 — 진술 253·카드 84). `BOARD_SUGGESTER_ACT2_ONLY`
  추가: 재료가 전부 2막 전용(단계 release·카드 제시 게이트·C## 게이트)이면 error. `points_finger`
  의 opens/because 는 1막에 들리므로 예외.
- **소설 루틴**: 「오프라인으로 옮길 것」에 후보마다 재료(누구의 어떤 말)와 핵심어를 같이 적으면
  판본 작업이 준다. **생성 루틴**: 원본에는 보드가 없으니 영향 없음.

## CASE013 판본 (`Case-No-013.offline.json`)

- 소설 `docs/novels/CASE013.md` 끝의 「오프라인으로 옮길 것」을 설계도로 만들었다 — 새 카드 E11(보수 공사
  기록, E01 이 연다)·E12(자물쇠 교체 기록)·E13(점검 기록 소관)·E14(수리 요청 이력), `requires` 한 칸
  (E02 ← E06), E04.proves·E06.content·L02 서술, 강윤재 약속(9시·보름 전·두 시간), 백소민 예산 줄. 소설이
  「옮기지 않는 것」으로 남긴 자리(액자 뒷면, 4년 전 여름)는 비워 뒀다.
- 소설이 안 적은 것은 새로 썼다: 보드 4/4/4 와 재료·핵심어, `suspect_refutations` 넷, `points_finger`
  다섯, `voice_profile`·`comic_tell`, 헛다리 `weight.means` 용 카드 E15·E16·E17, 증언 방향용 E18·E19.
  **소설 루틴**: 「오프라인으로 옮길 것」에 보드 후보(정답·오답)와 후보마다 재료(누구의 어떤 말)를 같이
  적으면 판본 작업의 절반이 준다. 판본 노트는 이제 소설이 아니라 판본 옆 `Case-No-<NNN>.offline.md` 에 쓴다
  (2026-09-26 사용자 결정, 판본 PR 의 마무리 단계 — 포맷 문서 「새 판본을 만들 때」). CASE013 것은 이 세션이 썼고
  소설 끝에는 가리키는 한 줄만 있다. 001~012 의 「판본이 따로 더한 것」은 소설 안에 그대로.
- 원본 C03 이 요구하던 E07·E08 은 비교 카드가 아니라 뺐다(E07·E08 은 1막 재료로 산다). 원본은 안 건드렸다.
- 검사기 고침: `checkHypothesisBoard` 의 cue 검사가 장소 관찰 본문을 `result` 가 아닌 `description` 에서
  읽어 관찰 재료의 cue 가 늘 「없다」로 났다. 이제 `result` 를 본다.
