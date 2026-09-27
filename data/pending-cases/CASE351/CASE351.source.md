# CASE351 — 마지막 발판
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

리모델링 공사가 한창인 8층 복합상가 '동해타워' 현장. 시공사 대표 백강호가 이끄는 시온건설이 3년째 맡아 온 현장으로, 그날은 3층 골조 구간의 최종 안전 점검이 예정돼 있었고 발주처 대기실에는 시행사 담당자가 결과를 기다리고 있었다.

## 톤

골조 사이로 들이치는 저녁 볕과, 방금까지 팽팽했던 공기가 가라앉는 자리. 탐정과 한지우는 안전모를 고쳐 쓰며 이 정적을 지켜본다.

## 탐정의 진입

- 경로: `professional_consultant`

탐정과 한지우는 이 현장의 외부 안전 컨설턴트로 고용돼, 그 주 내내 3층 골조 구간의 마감 점검을 도와 왔다. 그날도 오후 점검을 마무리하던 중 소란을 맞닥뜨린다.

## 진실

**진범**: 이여준 (CH03)
**공범**: 없음

### 동기

이여준은 12년째 이 리모델링 공사 현장을 지켜 온 베테랑 기술팀장이었으나, 본사가 편시윤을 조기 발탁해 정식 현장소장으로 앉히고 자신을 다른 현장으로 돌리기로 확정한 사실을 사건 전날 밤 우연히 알게 되었다. 아무 통보도 없이 자신의 자리가 지워졌다는 배신감에 휩싸여, 3층 작업발판에서 이를 따지다가 격분해 범행에 이르렀다.

### 수법

3층 작업발판에서 언쟁이 격해지자 이여준이 발판을 받치던 지지핀을 발로 걷어차 뽑았고, 편시윤이 무너진 발판과 함께 아래로 떨어져 치명상을 입었다.

### 결정적 시각·장소

사건 당일 14시 32분경, 3층 골조 작업발판(L02)에서.

### 은폐

이여준은 편시윤이 떨어진 직후 뽑아낸 지지핀 자리에 자재 창고에 있던 다른 여분 지지핀을 몰래 끼워 넣었다. 원래 지지핀은 자재 창고 구석 자재 더미 밑에 숨겼다. 이어 현장 사무실 안전 점검일지에 그 지지핀에 대한 점검 기록을 미리 있었던 것처럼 소급해 적어 넣어, 이번 일이 자신과 무관한 것처럼 보이게 했다.

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