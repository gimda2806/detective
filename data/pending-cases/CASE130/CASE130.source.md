# CASE130 — 허물을 벗은 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

해외 희귀 파충류 특별전 프리뷰가 열리는 사설 파충류 생태원 '에덴 파충류 생태원'. 행사 당일 밤, 생태원 대표가 사육동 안쪽 격리사육실에서 쓰러진 채 발견된다.

## 톤

특별전 프리뷰의 들뜬 분위기와 사육동 안쪽의 서늘한 긴장감이 대비되는 정통 추리극.

## 탐정의 진입

- 경로: `event_attendance`

탐정과 한지우는 희귀 파충류 특별전 프리뷰 초청 명단에 이름이 올라 있었고, 행사 시작 전부터 전시관 한쪽에서 개체들을 구경하며 시간을 보내고 있었다.

## 진실

**진범**: 추현서 (CH02)
**공범**: 없음

### 동기

특별전에 전시할 개체를 확보하기 위해 정식 수입 절차 없이 희귀 독사를 밀반입하면서 원산지 증명서를 위조했는데, 대표 천도윤이 이를 발견하고 해외 종보전기구에 신고하는 확인 메일을 예약발송해 둔 것을 알고 이를 막기 위해 살해했다.

### 수법

사육동 진료함에서 몰래 챙긴 동물용 진정제를 천도윤의 목덜미에 주사해 무력화시킨 뒤, 격리사육실 사육장 잠금장치를 해제해 독사에게 물리게 함으로써 '사육 중 교상 사고사'로 위장했다.

### 결정적 시각·장소

특별전 프리뷰 당일 21시 5분경, 사육동 격리사육실.

### 은폐

사육장 문을 다시 잠가 정상 상태처럼 꾸미고 진료함 재고 기록을 조작하려 했으나 실패했으며, 천도윤의 예약발송 메일을 삭제하려 했으나 이미 발송된 뒤였다.

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