# CASE146 — 타래에 남은 손자국
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

왕실복식 복원사업 마지막 공개 시연을 사흘 앞둔 3대째 전통 매듭공방 '매듭재(結才)'. 이른 아침, 복원사업 실무를 총괄해 온 수석 매듭장이 대형 연사기 작업실 바닥에 머리를 다친 채 쓰러진 상태로 발견된다.

## 톤

장인 정신과 그 밑에 눌려 있던 재정 압박이 대비되는 차분하고 씁쓸한 분위기.

## 탐정의 진입

- 경로: `returning_former_affiliate`

탐정은 몇 해 전 이 공방에서 잠깐 매듭 기초를 배웠던 인연으로, 그때 빌린 공구를 돌려주러 개인적인 용무로 오랜만에 들렀다가 이른 아침의 소란과 마주친다.

## 진실

**진범**: 지헌우 (CH02)
**공범**: 없음

### 동기

지헌우는 왕실복식 복원사업 예산 중 정품 왕실 인증 명주실 구매 명목의 차액을 저가 합성 대체실로 바꿔치기해 개인적으로 유용해 왔다. 공개 시연을 사흘 앞두고 임서형이 시연작 매듭의 광택이 이상하다며 성분 검사를 의뢰하려 하자, 발각되면 사업 전체가 무너지고 형사처벌까지 받을 상황이라 그녀를 막으려 했다.

### 수법

지헌우는 임서형의 다이어리에 '연사기 점검 21:40 - 헌우'라는 메모를 남겨 그녀를 야간에 작업실로 불러냈다. 성분 검사를 그만두라며 다투다 그녀를 밀쳤고, 임서형은 가동 중이던 연사기의 열린 점검구 쪽으로 넘어지며 회전축 덮개 모서리에 머리를 부딪혀 그 자리에서 의식을 잃었다.

### 결정적 시각·장소

21:40, L05 사무실에서 야간 호출 메모 작성 / 22:30, L02 연사기 작업실에서 몸싸움 및 낙상.

### 은폐

지헌우는 쓰러진 임서형을 그대로 둔 채 점검구 덮개를 다시 닫고, 다이어리에서 자신의 이름이 적힌 메모만 회수한 뒤 자리를 떠나 '혼자 야간 점검을 하다 사고를 당한 것'으로 보이게 했다.

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