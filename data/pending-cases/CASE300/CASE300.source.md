# CASE300 — 물 위에 남은 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

강 상류 댐 아래, 갈대밭에 반쯤 묻힌 2층짜리 조정 클럽하우스 '무명호'. 1970년대에 세워진 건물을 배성록이 22년 전 사들여 유소년 조정 클럽으로 되살렸고, 계류장과 콘크리트 슬립웨이가 건물 바로 앞 강가로 이어진다. 선수 대여섯 명과 관리인 한 명이 상주하다시피 하는 작은 곳이라 서로의 습관까지 전부 알고 지낸다. 밤새 내린 비로 아래쪽 국도가 물에 잠기면서, 클럽하우스에 들러 하룻밤 신세를 지고 있던 탐정과 한지우는 아침까지 발이 묶여 있었다.

## 톤

젖은 나무와 강 냄새가 배어 있는 정적인 톤. 사람들이 말을 아끼고, 아끼는 방식으로 서로를 드러낸다.

## 탐정의 진입

- 경로: `stranded_by_circumstance`

밤새 내린 비로 국도가 잠겨, 지나던 길에 들른 클럽하우스 2층 빈 방에서 하룻밤을 묵고 아침을 기다리던 참이었다.

## 진실

**진범**: 하무진 (CH01)
**공범**: 없음

### 동기

20년 전 훈련 중 사고로 죽은 친형 하무경을 배성록이 회고록에 "스스로를 몰아붙이다 무너진 선수"로 적어 남기려 했고, 하무진은 형의 이름이 활자로 그렇게 굳는 것을 견디지 못했다.

### 수법

새벽 4시 50분 슬립웨이에서 원고 문제로 다시 다투다 배성록을 젖은 경사면 아래로 밀쳤고, 물에 빠진 그가 한 번 떠올랐을 때 손을 내밀지 않은 채 돌아섰다.

### 결정적 시각·장소

사건 당일 04:50, 계류장 슬립웨이(L02)

### 은폐

5시 10분에 배성록의 빈 싱글스컬과 노를 물에 띄워 단독 훈련 중 전복 사고처럼 보이게 했고, 5시 25분에 사물함에 보관하던 원고 사본을 코치실 난로에 태웠다.

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