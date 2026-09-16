# CASE054 — 훈증실이 삼킨 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국내 대형 식품기업과의 독점 원료 공급계약 서명을 사흘 앞둔 도심형 스마트팜 식용곤충 생산센터 '인섹토피아'. 투자자 실사 요구로 전 직원 신원 재조회가 진행되던 중, 엔젤투자자 모임의 월례 현장 투어 도중 수석 품질관리팀장이 훈증실 안에서 의식을 잃은 채 발견된다.

## 톤

성장 압박과 오래된 죄책감이 뒤섞인 스타트업 현장의 긴장감.

## 탐정의 진입

- 경로: `group_member`

탐정은 소규모 엔젤투자자 모임의 정회원으로 매달 정기 현장 투어에 참여해 왔고, 이번 투어 도중 훈증실 인근에서 소동과 마주친다.

## 진실

**진범**: 서은결 (CH02)
**공범**: 없음

### 동기

서은결은 3년 전 다른 지역의 곤충 사료 공장에서 다른 이름으로 근무하며 안전 수칙을 어겨 동료를 사망케 한 뒤 신원을 세탁해 인섹토피아에 입사했다. 남시우가 투자자 실사에 따른 신원 재조회 결과 그의 지문이 옛 사고 보고서의 작업자 지문과 일치한다는 사실을 확인하고 이를 대표에게 알리려 하자, 서은결은 자신의 과거가 드러나는 것을 막으려 했다.

### 수법

서은결은 사고 전날 밤 훈증실 배기팬 제어반의 타이머 설정을 조작해, 다음날 아침 남시우가 정기 점검을 위해 들어갔을 때 배기팬이 가동되지 않아 이산화탄소 농도가 치명적으로 치솟도록 만들었다.

### 결정적 시각·장소

21:45, L02 훈증실에서 배기팬 타이머 조작 / 06:55, L02 훈증실에서 남시우가 고농도 이산화탄소에 노출돼 의식을 잃음.

### 은폐

서은결은 사고 원인을 '노후 배기 설비의 자연 고장'으로 보고하고, 자신의 옛 신원 관련 서류는 그날 밤 몰래 폐기하려 했다.

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