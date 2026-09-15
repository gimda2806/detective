# CASE158 — 무게추가 삼킨 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가대표 아마추어 복싱 선발전 최종 트라이얼을 사흘 앞둔 지역 실업팀 복싱 체육관 '라이트닝 복싱짐'. 신형 전자채점 시스템의 무결성 점검차 파견된 외부 감사역이 머무는 동안, 협회 소속 규정준수관이 웨이트룸 케이블 크로스오버 머신 앞에서 쓰러진 채 발견된다.

## 톤

국가대표 선발이라는 압박과 사제·후원 관계의 이해관계가 뒤섞인 폐쇄적인 체육관 분위기.

## 탐정의 진입

- 경로: `professional_consultant`

탐정은 대한복싱협회가 신형 전자채점 시스템의 무결성을 최종 점검하기 위해 초빙한 외부 감사역으로, 선발전을 앞두고 이미 체육관에 머물며 서버 로그를 살펴보던 중이었다.

## 진실

**진범**: 황보선 (CH02)
**공범**: 없음

### 동기

스폰서 기업으로부터 어수빈이 국가대표로 최종 선발되면 별도 지도 커미션을 받기로 한 이면 계약이 있었는데, 판도현이 전자채점 보정 로그의 이상치를 발견해 재검증을 요구하자 그 계약과 코치 경력 전체가 무너질 위기에 처했다.

### 수법

황보선은 이틀 전 코치실 서버에서 어수빈의 스파링 점수 보정값을 상향 조작했고, 이를 판도현에게 들켜 재검증 요청을 통보받자 어제 저녁 정비창고에서 렌치를 대여해 웨이트룸 케이블 크로스오버 머신의 안전 잠금핀을 제거해 두었다. 판도현이 평소처럼 밤늦게 혼자 그 기구로 운동하다 무게추 스택에 목과 등을 가격당해 숨졌다.

### 결정적 시각·장소

이틀 전 08:00, L04 코치실에서 채점 보정값 조작 / 어제 20:30, L05 정비창고에서 렌치 대여 / 어제 21:15, L03 웨이트룸에서 안전 잠금핀 제거.

### 은폐

황보선은 사고 직후 노후 장비의 자연 마모로 인한 사고라고 둘러대고, 정비 기록 대장에 사고 이후 날짜를 소급해 안전핀 마모 점검 항목을 추가해 넣었다.

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