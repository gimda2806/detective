# CASE012 — 슬립조가 삼킨 문양
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 전통 도자기 공방 '청연요'. 몇 년 만에 여는 장작가마 개요식(開窯式) 당일 새벽, 선임 문하생이 성형실 슬립(泥漿) 탱크에 잠긴 채 발견된다.

## 톤

몇 년 만의 개요식을 앞둔 들뜬 분위기와 도제 관계 속에 눌려 있던 배신이 뒤섞인 폐쇄적인 공방 분위기.

## 탐정의 진입

탐정은 개인적으로 신청해 둔 공방의 하루 도자기 체험 클래스에 참가하려고 개요식 당일 아침 공방을 찾았다가, 그 자리에서 벌어진 사건과 우연히 마주친다.

## 진실

**진범**: 오영재 (CH02)
**공범**: 없음

### 동기

오영재는 몇 달 전 청연요 3대째 내려오는 독점 청자 유약 배합 비법을 몰래 촬영해 한성도자에 넘기고 거액을 받았으며, 이를 발판으로 독립을 준비하고 있었다. 개요식 날 한성도자와의 공식 라이선스 계약 발표가 예정되어 있었는데, 이 사실을 우연히 알게 된 한서준이 송금 내역을 확보해 개요식 당일 모든 사실을 폭로하겠다고 통보하자, 이를 막기 위해 살해를 결심했다.

### 수법

오영재는 전날 밤 성형실로 한서준을 뒤따라가 받침목으로 뒤통수를 가격해 실신시킨 뒤, 슬립 탱크 안으로 고의로 밀어 넣어 살해했다.

### 결정적 시각·장소

22:20, L02 성형실에서 몸싸움 시작 / 22:25, L02 성형실에서 받침목으로 가격 / 22:27, L02 성형실 슬립 탱크에서 살해.

### 은폐

오영재는 범행 직후 유약 조합실로 돌아가 한서준이 만든 사본과 송금 내역 출력물을 챙겨 나왔고, 가마터의 세척대에서 몸과 옷에 묻은 흔적을 급히 씻어냈다.

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