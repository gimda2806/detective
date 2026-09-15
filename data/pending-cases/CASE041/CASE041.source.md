# CASE041 — 장독대가 삼킨 삼 년
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

해외 유통 계약을 사흘 앞둔 3대째 전통 장류 명가 '천염당(天鹽堂)'. 수출용 3년 자연숙성 장류에 대한 최종 시식 심사를 앞둔 이른 오전, 품질관리 담당 직원이 대형 간장독 안에 잠긴 채 발견된다.

## 톤

차분한 장인 정신과 수출 계약의 압박감이 공존하는 톤.

## 탐정의 진입

- 경로: `meal_or_rest`

탐정은 장독대 옆에 딸린 손맛집 식당에서 이른 점심을 먹으러 들렀다가, 창밖 마당 쪽이 소란스러워지는 걸 알아챈다.

## 진실

**진범**: 배건우 (CH02)
**공범**: 없음

### 동기

배건우는 6개월 전 자금난 때문에 발효 촉진 효소제를 몰래 사용해 3년 자연숙성이 필요한 장류의 숙성 기간을 단축했다. 해외 유통 계약의 최종 시식 심사를 통과하면 문제가 묻힐 것이라 판단하고 있었는데, 설아름이 정밀 검사로 효소 잔류 수치를 발견해 시식 자리에서 이를 폭로하겠다고 예고하자 이를 막으려 했다.

### 수법

새벽 장독대에서 설아름과 담판을 짓다 몸싸움 끝에 미리 풀어놓은 안전 난간 너머로 그녀를 대형 간장독 안으로 밀어 넣고 뚜껑을 덮어 익사시켰다.

### 결정적 시각·장소

사건 당일 6시 10분경, L01 장독대 마당.

### 은폐

독 뚜껑을 다시 덮고 헐거워진 난간을 몰래 조여 사고처럼 위장한 뒤, 실험실 컴퓨터에서 설아름의 검사 결과 원본 파일을 삭제했다.

---

## 이 소스가 마스터의 어디로 가는가

| 소스 | 마스터 |
| --- | --- |
| 배경 | `locations[]`, `characters[].role`, `relationships[]` |
| 톤 | `opening_scene.narrative`, `ending_scene.narrative` |
| 탐정의 진입 | `opening_scene.narrative`, `opening_scene.detective_entry_time` |
| 동기 | `contradiction_stages`, `red_herrings`, `final_deduction.motive` |
| 수법 | `actual_timeline`, `evidence[]`, `final_deduction.method` |
| 결정적 시각·장소 | `actual_timeline`, `final_deduction.key_connection` |
| 은폐 | `actual_timeline`의 은폐 항목, `red_herrings`, `characters[].initial_claims` |
`full_truth.responsible_character_id`만은 마스터에 그대로 남는다 — 진범 판정,
타임라인 필터(`filterSafeTimelineFacts`), 대립 단계가 전부 그 값에 걸려 있다.