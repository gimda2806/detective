# CASE115 — 찾아가지 않은 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

VIP 고객 초청 감정 행사가 한창인 백화점 지하 명품관 종합 수선센터 '아틀리에 프리제'. 행사 중 자리를 비운 수석 수선사가 도금실 안에서 의식을 잃은 채 발견된다.

## 톤

매끄러운 응대 뒤에 감춰진 씁쓸한 배신극.

## 탐정의 진입

- 경로: `onsite_recognized_and_asked`

탐정은 얼마 전 맡겨 둔 가죽 지갑을 찾으러 아틀리에 프리제에 들렀다가, 마침 진행 중이던 VIP 초청 감정 행사장 한켠에서 시간을 보내고 있었다. 소란이 일자 예전에 안면을 튼 보안팀장 문소혁이 그를 알아보고 다급히 도움을 청했다.

## 진실

**진범**: 곽지완 (CH02)
**공범**: 없음

### 동기

곽지완은 수년간 장기 미수령 위탁품을 몰래 되팔고 고객에게는 분실·파손으로 보험 처리해 온 행각을 우석현과 함께 저질러 왔다. 최근 한 VIP 고객이 어머니의 유품 진주 목걸이를 찾으러 왔다가 이미 '분실 처리'됐다는 통보를 받고 크게 분노한 일을 계기로 우석현이 죄책감에 시달리다 이번 행사에서 외부 감정사 탁현서에게 모든 것을 자백하겠다고 통보하자, 이를 막기 위해 그를 살해했다.

### 수법

곽지완은 도금실 환기 덕트 입구를 미리 젖은 걸레와 테이프로 막아 두고, 처분 장부를 태워 없애자며 우석현을 도금실로 유인했다. 그런 다음 청산가리 성분 도금액과 산성 세척액을 한 통에 부어 시안화가스를 발생시켰고, 가스가 퍼지기 시작하자 먼저 방을 빠져나와 문을 밖에서 잠갔다.

### 결정적 시각·장소

당일 10:25~10:33, 도금실(L04) 안

### 은폐

곽지완은 신아영에게 그 시각 계속 함께 있었다고 말해 달라 부탁해 거짓 알리바이를 만들었고, 우석현이 평소 세척액을 함부로 다뤘다는 인상을 심어 사고사로 위장하려 했다.

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