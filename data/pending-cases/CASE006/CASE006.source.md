# CASE006 — 발효실이 삼킨 진실
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

대기업으로의 인수합병 계약 서명을 하루 앞둔 가족 경영 와이너리 '운곡'. 사무동 뒤편, 짧은 계단을 내려간 지하 발효실에 대형 탱크 여덟 기가 늘어서 있다. 발효 중인 탱크는 CO2를 내뿜고, 그 가스는 공기보다 무거워 바닥에 고인다 — 그래서 환기 장치와 CO2 경보가 제어반 하나에 묶여 있다.

## 톤

가업의 자부심과 몰락에 대한 불안이 뒤섞인 폐쇄적인 와이너리 분위기.

## 탐정의 진입

- 경로: `legal_or_official_obligation`

인수 예정 기업 측 법무팀의 의뢰로, 계약 서명 전 감정인의 사망 경위를 확인하기 위해 이른 아침 와이너리에 도착한다.

## 진실

**진범**: 이서준 (CH02)
**공범**: 없음

### 동기

이서준은 이번 인수합병이 무산되면 가업이 파산하고 후계자로서 쌓아 온 입지도 무너진다는 것을 알고 있었다. 인수 기업 측 실사 감정인 노시원이 와이너리가 수년간 저가 구획 포도를 '프리미엄 단일 포도밭산'으로 허위 라벨링해 온 것을 발견하고, 계약 서명 전 최종 보고서에 반영하겠다고 했다.

### 수법

21:30 사무동에서 덮어 달라고 요구했다가 거절당하자, '원본 탱크 일지를 보여 주겠다'는 핑계로 21:50 노시원을 지하 발효실로 데려가 안쪽 탱크 사이에 세워 두고, 22:00 계단 위 제어반을 자동에서 수동으로 돌려 환기를 정지시킨 뒤 자리를 떴다. 수동 모드에서는 CO2 경보까지 함께 꺼지는 결함이 있었다. 무거운 CO2가 바닥에 고였고 노시원은 알아차리지 못한 채 질식했다.

### 결정적 시각·장소

사건 당일 22:00~22:40, 지하 발효실(L02). 은폐 요구는 21:30 사무동(L01).

### 은폐

사건 다음날 00:05 제어반을 다시 자동으로 돌려놓고, 00:10 CO2 센서 로그의 21:50 이후 기록을 정상치로 덧씌워 설비 노후 사고처럼 보이게 했다.

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