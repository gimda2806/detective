# CASE013 — 용해로가 삼킨 증언
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가무형문화재 보유자 심사를 앞둔 오래된 유리공예 공방 겸 전시장. 안쪽에는 상시 가동 중인 용해로가 있다.

## 톤

장인의 자존심과 계승의 압박이 뒤섞인 폐쇄적인 공방 분위기.

## 탐정의 진입

탐정은 개인적으로 유리 소품을 사러 공방에 들렀다가, 마침 그날 아침 벌어진 소동과 우연히 마주친다.

## 진실

**진범**: 최덕구 (CH03)
**공범**: 없음

### 동기

최덕구는 국가무형문화재 보유자 심사 서류에 실제로는 완성하지 못한 핵심 색유리 기법의 이수 기록을 위조해 제출했다. 공방의 기록 담당자 송지원이 서류 정리 중 이수 일지의 필적과 날짜 불일치를 발견하고 심사위원회에 알리겠다고 통보하자, 명장 지정이 무산되고 위조 사실이 드러나는 것을 막기 위해 그를 살해했다.

### 수법

최덕구는 사건 당일 새벽 용해로실 환기팬을 차단기로 꺼두고 가스 밸브 조절기를 조작해 불완전연소 가스가 실내에 차오르게 만든 뒤, 배관 점검을 핑계로 송지원을 불러들여 의식을 잃게 했다. 이후 밸브와 차단기를 원상태로 되돌려 놓고, 쓰러진 송지원을 고열 작업대 근처로 옮겨 낙상·화상 사고처럼 현장을 재배치했다.

### 결정적 시각·장소

사건 당일 5시~6시 10분, L02 용해로실.

### 은폐

최덕구는 환기팬이 갑자기 고장 났다고 둘러대고, 송지원이 야간에 혼자 위험한 점검 작업을 하다 사고를 당한 것처럼 현장을 정리했다.

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