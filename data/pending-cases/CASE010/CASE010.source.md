# CASE010 — 식지 않은 한증막
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

재개발로 폐업을 하루 앞둔 산속 전통 온천 료칸 '운천각'. 본관 로비의 프런트 뒤에 설비 경보 패널이 걸려 있고, 창 너머 마당 건너편이 별채다. 별채에는 개인용 황토 한증막이 딸려 있는데 문이 전자도어락이고 온도조절기는 그 방 안에 있다. 본관 뒤로 주방과 보일러실, 그 너머 비탈에 직원 관사가 있다.

## 톤

폐업을 앞둔 쓸쓸한 온천 마을의 공기와 오래된 인간관계의 무게가 뒤섞인 분위기.

## 탐정의 진입

- 경로: `customer_or_client`

탐정은 피해자의 딸 노유진의 개인적인 의뢰를 받아, 아버지가 무슨 일에 걸려 있는지 알아봐 달라는 부탁을 안고 폐업 전날 밤 료칸에 도착한다.

## 진실

**진범**: 강태선 (CH01)
**공범**: 없음

### 동기

강태선은 15년 전 무면허 오토바이 운전 중 사람을 치고 그대로 도주한 뺑소니 전력이 있다. 노관식은 우연히 그 사실을 알게 된 뒤 지난 몇 년간 강태선에게 입막음 대가로 매달 돈을 받아 왔다. 폐업으로 거액의 재개발 보상금이 강태선에게 들어온다는 것을 안 노관식은 마지막으로 3천만 원을 한 번에 요구하며, 주지 않으면 재개발 시행사와 마을 사람들에게 모두 알리겠다고 최후통첩했다.

### 수법

강태선은 폐업 전날 밤 노관식을 개인 한증막으로 불러 협상하는 척하다가, 문을 밖에서 잠그고 온도조절기를 최고치로 올려놓은 뒤 나왔다. 노관식은 밤새 한증막에 갇혀 열사병으로 사망했다.

### 결정적 시각·장소

22:00, L03 한증막에서 마지막 요구와 최후통첩 / 22:20~22:25, L03 한증막 감금 및 온도 조작.

### 은폐

강태선은 보일러 노후로 인한 사고사처럼 보이도록 보일러실 표시 패널의 온도조절기 로그를 지우려 시도한다.

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