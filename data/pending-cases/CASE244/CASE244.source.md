# CASE244 — 얼음광에 잠긴 유언
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 전통 빙과·화채 찻집 겸 석빙고(石氷庫) '설한고(雪寒庫)'. 대표 목서한이 사촌 동생들과 함께 공동상속인으로 지분을 나눠 갖고 있으며, 최근 리조트 부지 매각 여부를 둘러싸고 상속인들 사이에 의견이 갈려 왔다. 늦가을 평일 오후, 신메뉴 시식회 준비로 찻집 안이 분주한 가운데, 후원 쪽 석빙고에서 목서한이 저체온 상태로 쓰러진 채 발견된다.

## 톤

가을 정취와 가족 간 오랜 앙금이 뒤섞인 잔잔하지만 씁쓸한 톤. 탐정과 한지우의 능청스러운 티키타카로 무게를 던다.

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 고등학교 동창인 편라헌의 초대로, 설한고가 새로 선보이는 빙수 메뉴 시식회에 참석하기 위해 한지우와 함께 찻집을 찾았다.

## 진실

**진범**: 태은규 (CH01)
**공범**: 없음

### 동기

매각 안건이 상속인 회의에서 부결되면 지분과 주도권을 모두 잃을 것을 두려워한 태은규가, 반대를 주도하던 목서한을 제거해 상황을 뒤집으려 했다.

### 수법

재료창고에서 미리 손봐둔 석빙고 빗장 경첩을 이용해, 목서한이 혼자 재고를 확인하러 들어간 틈에 문을 걸어 잠가 저체온 상태로 방치했다.

### 결정적 시각·장소

사건 당일 12시 5분, 설한고 후원 석빙고 앞.

### 은폐

태은규는 빗장이 낡아 저절로 걸린 사고처럼 보이도록 평소 걸쇠가 헐겁다는 이야기를 미리 주변에 흘려두고, 자신이 마당을 가로지른 시간대에는 재료창고에서 혼자 정리를 하고 있었다고 둘러댔다.

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