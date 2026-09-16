# CASE055 — 챔버가 삼킨 숨
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

강남 2호점 확장 개원식을 사흘 앞둔 반려동물 재활전문병원 '무브온동물재활센터'. 밤새 폭우로 도로가 통제된 이른 아침, 로비에서 발이 묶여 있던 탐정 앞에서 지하 고압산소챔버실에 쓰러진 수석 재활치료사가 발견된다.

## 톤

차분하고 씁쓸한 직업윤리 미스터리 톤

## 탐정의 진입

- 경로: `stranded_by_circumstance`

탐정과 한지우는 전날 밤부터 폭우로 도로가 전면 통제되며, 가장 가까운 건물이었던 '무브온동물재활센터' 로비에 발이 묶여 밤을 지새우고 있었다.

## 진실

**진범**: 구현모 (CH01)
**공범**: 없음

### 동기

고압산소챔버 안전인증서의 발급일자를 위조해 사용해 온 사실을 선다혜가 발견하고, 개원식 당일 투자사 심사단에 알리겠다고 선언하자 2호점 개원과 투자 계약이 무산되는 것을 막기 위해 살해했다.

### 수법

고압산소챔버실에서 언쟁 중 격분해 배기 밸브를 조작해 챔버 내 산소 농도를 낮추고 문을 잠가 선다혜를 질식시켰다.

### 결정적 시각·장소

사건 당일 21시 40분경, 고압산소챔버실(L03).

### 은폐

밸브를 원래 설정값으로 되돌리고 챔버 문을 열어두어 노후 장비의 오작동에 의한 사고사처럼 꾸몄고, 원장실 컴퓨터에 야간 서류 작업 파일을 저장해 알리바이 기록을 남겼다.

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