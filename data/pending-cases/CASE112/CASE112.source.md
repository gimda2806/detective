# CASE112 — 가라앉은 숨
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가대표 선발전을 사흘 앞둔 실내 프리다이빙 트레이닝 센터. 이른 아침 개인훈련 중이던 국가대표 선수가 훈련 풀 바닥에서 의식을 잃은 채 발견된다.

## 톤

물비린내와 이른 새벽의 정적이 감도는 훈련센터. 선발전을 앞둔 긴장과 사제 관계의 무게가 뒤섞여 있다.

## 탐정의 진입

탐정은 오래전부터 다니던 프리다이빙 센터에 개인 강습을 받으러 이른 아침 도착했다가, 훈련 풀 바닥에서 발견된 국가대표 선수의 사고 소식과 맞닥뜨린다.

## 진실

**진범**: 명준혁 (CH02)
**공범**: 없음

### 동기

명준혁은 후원사로부터 받은 후원금 일부를 개인적으로 유용해 왔다. 최근 정산 감사에서 지출 불일치가 발견되기 시작했고, 조은결이 이를 눈치채고 직접 회계 자료 확인을 계속 요구하자 발각이 임박했음을 느꼈다.

### 수법

명준혁은 사고 당일 새벽 사무실에서 회계 자료를 손본 뒤, 장비보관실에서 조은결 전용 웨이트벨트의 퀵릴리즈 버클에 접착 처리를 했다. 그리고 부코치 박서인에게 예정에 없던 심부름을 시켜 이른 아침 개인훈련 시간대 안전요원 자리를 비우게 만들었다.

### 결정적 시각·장소

05:20, L04 사무실에서 회계 자료 수정 / 05:30, L03 장비보관실에서 벨트 조작 / 06:15, L02 훈련 풀에서 조은결이 벨트를 풀지 못하고 익사.

### 은폐

명준혁은 사고 직후 후원금 정산 장부를 감사 기준에 맞춰 다시 손봤다. 웨이트벨트 퀵릴리즈 버클에 대해서는 오래돼서 생긴 자국일 뿐 손댄 적 없다고 주장했고, 박서인에게 심부름을 시킨 것도 그저 우연히 시간이 겹쳤을 뿐이라며 발뺌했다.

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