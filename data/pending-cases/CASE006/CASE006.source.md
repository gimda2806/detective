# CASE006 — 발효실이 삼킨 진실
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

대기업으로의 인수합병 계약 서명을 하루 앞둔 가족 경영 와이너리. 밤새 열린 채였던 발효실 출입문 안쪽에서, 인수 측이 파견한 실사 감정인이 탱크 사이에 쓰러져 있다.

## 톤

가업의 자부심과 몰락에 대한 불안이 뒤섞인 폐쇄적인 와이너리 분위기.

## 탐정의 진입

탐정은 인수 예정 기업 측 법무팀의 의뢰로, 계약 서명 전 감정인의 사망 경위를 확인하기 위해 와이너리에 도착한다.

## 진실

**진범**: 이서준 (CH02)
**공범**: 없음

### 동기

이서준은 이번 인수합병이 무산되면 가업이 사실상 파산 위기에 처하고, 자신이 후계자로서 그동안 쌓아온 입지도 한순간에 무너진다는 것을 알고 있었다. 그런데 인수 기업 측 실사 감정인 노시원이 와이너리가 수년간 저가 포도를 '프리미엄 단일 포도밭산'으로 허위 라벨링해 온 사실을 발견하고, 이를 계약 서명 전 최종 보고서에 반영하려 했다.

### 수법

이서준은 21:30경 사무동에서 노시원에게 이 사실을 덮어 달라고 요구했지만 거절당하자, '원본 기록을 보여주겠다'는 핑계로 그를 발효실로 데려가 환기 시스템을 수동으로 정지시키고 자리를 떠났다. 노시원은 CO2 농도가 위험 수준까지 상승한 것을 알아차리지 못한 채 발효실 안에서 질식사했다.

### 결정적 시각·장소

21:30, L01 사무동에서 은폐 요구/거절 / 22:00, L02 발효실에서 환기 시스템 수동 정지.

### 은폐

이서준은 환기 시스템을 자정 무렵 다시 자동으로 복구시키고 CO2 센서 로그를 정상 수치로 조작해, 노시원의 죽음이 설비 노후로 인한 사고처럼 보이게 만들었다.

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