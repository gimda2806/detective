# CASE225 — 능선에 남은 마지막 교신
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

도심에서 한참 떨어진 산 능선 중턱, 아마추어 무선(햄) 동호회가 운영하는 중계소 겸 대피 오두막 '메아리능선'. 전국 비상통신 릴레이 경연대회 예선에 개인 참가자로 등록한 탐정은, 폭우가 쏟아지는 토요일 낮 이 체크포인트에 들러 교신 기록표에 도장을 받으려던 참이다.

## 톤

빗속 능선의 스산한 분위기와 오래된 죄책감을 다루는, 담담하고 씁쓸한 여운의 미스터리

## 탐정의 진입

- 경로: `competitor_or_participant`

탐정은 전국 비상통신 릴레이 경연대회 예선에 개인 참가자로 등록해, 정해진 산길 코스를 따라 이동하며 각 체크포인트에서 무선 교신 기록을 남기는 중이었다.

## 진실

**진범**: 목단해 (CH01)
**공범**: 없음

### 동기

10년 전 겨울, 목단해의 동생 목재하는 조난 상황에서 무선 구조 요청을 보냈으나, 당시 중계를 맡았던 하동익이 동호회의 안전 관리 부실 논란을 피하려 좌표를 잘못 전달해 구조가 늦어지며 동생을 잃었다. 목단해는 최근에야 옛 교신 기록에서 그 진실을 알게 되었고, 10년간 묻어둔 책임을 묻기 위해 하동익을 살해하기로 결심한다.

### 수법

목단해가 사건 나흘 전 장비 창고에서 송신실 접지 단자의 피복을 미리 벗겨 놓고, 사건 당일 폭우로 송신 출력이 떨어져 하동익이 혼자 점검판을 열고 접지 단자를 만지는 순간에 맞춰 옆에 있던 발전기 전원을 재투입해 감전시킨다.

### 결정적 시각·장소

사건 당일 오후 1시 55분경, 송신실 점검판 앞.

### 은폐

사고 다음날 목단해가 벗겨둔 접지선을 미리 준비해 둔 새 부품으로 몰래 교체하고, 폭우 중 낙뢰로 인한 순간 과전류 사고였을 뿐이라고 먼저 이야기를 꺼낸다.

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