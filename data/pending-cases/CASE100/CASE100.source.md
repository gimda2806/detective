# CASE100 — LPG실이 삼킨 안전
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

교통안전공단 안전검사 갱신 심사를 이틀 앞둔 캠핑카 제작공장 '노마드하우스'의 배관·의장 작업동. 출고 전 마지막 가스배관 점검이 한창이던 늦은 밤, 수석 배관엔지니어 추창헌이 LPG배관실 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

안전검사 갱신을 이틀 앞두고 팽팽해진 공기와, 정작 안전을 다뤄야 할 배관실에서 벌어진 죽음이 자아내는 서늘한 아이러니가 뒤섞인 분위기.

## 탐정의 진입

- 경로: `anonymous_tip_self_initiated`

탐정은 캠핑카 안전검사와 관련해 뭔가 이상하다는 익명 제보 메시지를 받고, 직접 판단해 노마드하우스 공장을 찾아왔다.

## 진실

**진범**: 천경재 (CH03)
**공범**: 없음

### 동기

천경재는 출고 물량의 배관 압력 시험을 실제로 하지 않고도 검사서에는 통과로 기재해 시간과 비용을 아껴 왔다. 배관 검사 기록과 실제 압력 시험 결과가 다르다는 걸 발견한 추창헌이 본사 감사팀에 바로 넘기겠다고 나서면서, 이틀 앞으로 다가온 안전검사 갱신 심사 전에 그 기록이 밖으로 나가는 걸 막아야 했다.

### 수법

천경재는 LPG배관실 이음쇠 하나를 살짝 풀어 미세한 누출이 생기게 두고, 환기 덕트 입구는 두꺼운 천으로 덮어 가스가 실내에 고이도록 만들었다. 야간 마지막 배관 점검을 맡은 추창헌은 좁은 LPG배관실 안에서 이음쇠를 살피다가 이미 짙게 고인 가스를 그대로 들이마셨고, 환기가 되지 않는 밀폐 공간이라 스스로 이상을 느꼈을 땐 이미 몸을 가누기 어려운 상태였다.

### 결정적 시각·장소

D-1, 21:00, L03 LPG배관실에서 이음쇠를 풀고 덕트를 막음 / D-1, 21:40, L03 LPG배관실에서 점검 중 가스 흡입 / D-1, 22:10, L03 LPG배관실에서 덕트와 이음쇠 정리.

### 은폐

천경재는 사고 다음 날 새벽 LPG배관실에 다시 들어가 이음쇠를 도로 조이고 덕트를 덮었던 천을 치워, 자신이 전날 밤 손댔다는 흔적 자체를 지우려 했다.

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