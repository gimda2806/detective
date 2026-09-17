# CASE009 — 폭설이 잠근 문
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

동계 국가대표 알파인 스키 선발전을 사흘 앞둔 산악 훈련캠프. 폭설이 지나간 새벽, 코치가 장비창고 밖에서 저체온 상태로 싸늘하게 식어 있다.

## 톤

국가대표 선발이라는 압박과 사제 관계의 긴장이 뒤섞인 폐쇄적인 산악 캠프 분위기.

## 탐정의 진입

탐정은 협회 감사관의 의뢰로, 코치의 죽음이 단순 사고인지 확인하기 위해 선발전을 사흘 앞둔 캠프에 들어온다.

## 진실

**진범**: 박지훈 (CH01)
**공범**: 없음

### 동기

박지훈은 이번 선발전에서 국가대표 자격을 얻지 못하면 후원과 훈련 지원이 모두 끊길 위기에 있었다. 그는 최근 몇 달간 금지약물(에리스로포이에틴)을 사용해 기록을 끌어올려 왔는데, 팀닥터와 예비 결과를 검토하던 코치가 혈액 수치 이상을 발견하고 협회에 보고하겠다고 하자 이를 막아야 했다.

### 수법

박지훈은 20시경 라운지에서 추궁당한 뒤 코치를 장비창고로 유인해 대화를 이어가는 척하다가, 자신만 나와 문을 밖에서 잠그고 숙소로 돌아갔다. 코치는 영하의 기온과 강풍 속에 갇힌 채 밤새 저체온증으로 사망했다.

### 결정적 시각·장소

20:30, L02 장비창고로 유인 / 20:45, L02 문을 밖에서 잠금.

### 은폐

박지훈은 코치와 나눈 대화가 사소한 훈련 이야기였을 뿐이라고 주장하고, 문이 바람에 저절로 잠긴 사고라고 둘러댄다.

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