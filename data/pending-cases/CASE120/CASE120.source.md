# CASE120 — 서냉로가 식던 자리
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 유리공예 비엔날레 출품을 사흘 앞둔 유리공예 공방 '풍로유리공방'. 이른 아침, 공방 부속 카페에서 일하던 탐정 앞에서 냉각로 보관실에 쓰러진 원장이 발견된다.

## 톤

차분하고 씁쓸한 예술가 드라마 톤

## 탐정의 진입

- 경로: `employee_or_staff`

탐정은 공방 바로 옆 카페 '유리온'에서 몇 주째 파트타임으로 오전 근무를 하고 있었다. 그날도 여느 아침처럼 원두를 갈고 있었을 뿐이다.

## 진실

**진범**: 고은결 (CH01)
**공범**: 없음

### 동기

몇 년 전 탁문경의 미공개 신기법 도안을 훔쳐 자신의 이름으로 비엔날레 출품을 준비해왔는데, 탁문경이 스케치북에서 찢겨나간 페이지를 발견하고 표절 사실을 알아채 심사위원단에 알리겠다고 선언하자 커리어와 명예가 한번에 무너지는 것을 막기 위해 살해했다.

### 수법

냉각로 보관실에서 말다툼 중 격분해 선반 위 깨진 초벌 유리 조각으로 탁문경의 옆구리를 찔러 과다출혈로 사망하게 했다.

### 결정적 시각·장소

사건 전날 밤 9시 20분경, 냉각로 보관실(L03).

### 은폐

탁문경의 안전장갑을 벗겨 바닥에 내던지고 깨진 유리 조각을 서냉로 앞에 흩뿌려, 뜨거운 작품을 옮기다 넘어져 유리에 찔린 사고사처럼 꾸몄다.

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