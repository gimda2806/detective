# CASE220 — 절반의 유언
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

산기슭 3대째 배 과수원 겸 즙 가공작업장 '설매원'. 특별한 행사나 마감 없이 맞는 평범한 화요일 아침, 지난달 세상을 뜬 설립자의 토지 등기 이전을 위한 경계측량 입회가 예정된 날이다.

## 톤

가족 안의 해묵은 앙금과 서류 뒤에 숨은 조바심이 팽팽하게 얽힌 분위기.

## 탐정의 진입

- 경로: `legal_or_official_obligation`

탐정은 얼마 전 신원 확인을 도왔던 인연으로, 오늘 예정된 경계측량 결과에 서명할 입회인으로 법원 서류에 이름이 올라 있다. 정해진 시간에 맞춰 설매원 마당에 들어선 참이다.

## 진실

**진범**: 김태근 (CH02)
**공범**: 없음

### 동기

김태근은 아버지 김병수가 죽기 전 몰래 남긴 자필 유언 보충서가 등기 절차에 함께 제출되면, 단독으로 물려받기로 되어 있던 과수원 지분 절반이 이복동생 우경환에게 넘어간다는 사실을 알게 됐다. 오늘 측량 입회가 끝나기 전에 그 문서를 없애지 않으면 지분을 되돌릴 방법이 없다는 조바심이 그를 몰아붙였다.

### 수법

김태근은 전날 밤 착즙실 압착판의 안전핀을 미리 빼 두었고, 다음 날 아침 방준혁을 착즙실로 불러 사본을 먼저 보여 달라고 다그치다 실랑이 끝에 하강 레버를 당겨 압착판을 그의 머리 위로 떨어뜨렸다.

### 결정적 시각·장소

당일 07:10~07:20, L03 착즙실.

### 은폐

김태근은 쓰러진 방준혁의 서류봉투에서 보충서 사본을 꺼내 관리사무실 소각통에서 태우고, 압착판 안전핀이 스스로 풀리는 사고였다고 둘러댄다.

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