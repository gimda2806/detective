# CASE329 — 탄 자국 없는 케이블
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

공단 안쪽 배터리 코팅 스타트업 온결소재의 시험동에서, 내일 오전 주요 고객사에게 보여줄 열충격 시험 결과를 확정하기 위해 다섯 명이 밤새 자리를 지키고 있다.

## 톤

야간 시험동 특유의 기계 소음과 정적이 교차하고, 사람들 사이에는 시연 준비의 들뜸과는 다른 팽팽함이 흐른다.

## 탐정의 진입

- 경로: `witnessed_incident`

탐정은 하천 산책로에서 야간 산책을 하다가 공단 쪽 건물 창문 너머로 파란 섬광이 번쩍이는 걸 봤다. 잠시 후 그 창문들이 캄캄해졌다. 한지우도 그 옆에서 나란히 걷고 있었다.

## 진실

**진범**: 조재헌 (CH01)
**공범**: 없음

### 동기

여동생 조재인이 사흘 전 배치 3-7의 경화 시간을 규정보다 40분 짧게 처리한 사실을, 세이프티 리드 남평오가 정기 점검 중 발견했다. 남평오는 그날 밤 조재인에게 확인한 뒤 다음 날 아침 고객사 시연 전에 이 사실을 알리는 통보문을 작성해 저장했다. 조재헌은 그 통보문이 나가면 재인이 이 바닥에서 끝장난다는 것을 알았고, 발표 전에 이를 막아야 한다고 생각했다.

### 수법

조재헌이 시험실로 남평오를 따라가 통보를 미뤄 달라고 다그치다 몸싸움이 벌어졌고, 방금 케이블 점검 때문에 접지 덮개가 열린 채 방치돼 있던 시험대 쪽으로 남평오가 밀려 넘어지며 노출된 단자에 손이 닿아 감전됐다.

### 결정적 시각·장소

사건 당일 22:14, 온결소재 시험동 시험실(L01)

### 은폐

조재헌은 곧장 도움을 청하지 않고, 정전으로 어두워진 틈을 타 서버실로 가 데이터 로거의 22시 10분부터 22시 20분 구간 기록을 지웠다. 이어 창고로 가 그을린 케이블을 폐기함 속 낡은 케이블과 바꿔치기해, 남은 흔적만으로는 설비 노후에 의한 단순 사고로 보이게 했다.

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