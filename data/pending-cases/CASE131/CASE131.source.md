# CASE131 — 고삐가 풀린 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 주니어 승마대회 예선을 사흘 앞둔 사설 승마 아카데미 '청림 승마 아카데미'. 예선 최종 야간 훈련이 한창이던 늦은 밤, 수석 조교사가 마방 통로에서 쓰러진 채 발견된다.

## 톤

야간 훈련장의 흙먼지와 말 울음소리 사이로 팽팽한 긴장감이 흐르는 정통 추리극.

## 탐정의 진입

- 경로: `stranded_by_circumstance`

탐정과 한지우가 타고 있던 차가 아카데미 정문 앞 도로에서 갑자기 시동이 꺼져 멈춰 섰고, 두 사람은 도움을 청하러 마침 불이 켜진 클럽하우스로 들어갔다.

## 진실

**진범**: 반채운 (CH02)
**공범**: 없음

### 동기

국제 주니어 승마대회 예선을 앞두고 담당 말들의 경기력을 끌어올리기 위해 금지 진정성 도핑 약물을 반복 투여해왔는데, 수석 조교사 도유담이 투약 기록 불일치를 발견하고 협회에 신고하려는 것을 막기 위해 살해했다.

### 수법

도유담의 보온병 커피에 몰래 챙긴 말 진정제를 타 무력화시킨 뒤, 편자 작업실로 옮겨 여벌 편자로 뒤통수를 가격했다. 이후 시신을 마방 통로 흙바닥에 눕히고 발굽 자국을 찍어 조작해 훈련 중 낙마 사고사로 위장했다.

### 결정적 시각·장소

예선 최종 야간 훈련 당일 밤 21시 38분경, 편자 작업실.

### 은폐

사용한 편자를 작업대에 되돌려 놓고 재고 기록을 조작하려 했으나 실패했으며, 도유담이 인쇄해 챙겨둔 투약 기록 사본을 없애려 했으나 이미 확보된 뒤였다.

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