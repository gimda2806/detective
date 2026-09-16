# CASE126 — 내려앉은 그림자
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 그림자극 페스티벌 초청 공연을 사흘 앞둔 전통 그림자인형극단 '그림자패 소리결'. 극단 창단 때부터 내려온 200년 된 골동 그림자인형 원본 세트가 무대 아래 보관창고에 있고, 그 위 조종대에는 인형과 조종사를 무대로 올리는 수동 승강 트랩도어가 설치돼 있다.

## 톤

전통 공예와 무대 뒤 재정난이 뒤섞인 차분하고 무거운 분위기.

## 탐정의 진입

- 경로: `witnessed_incident`

탐정은 극단의 그림자인형 제작 과정을 취재하러 리허설을 참관하던 중, 눈앞에서 트랩도어가 작동하며 벌어진 사고를 직접 목격한다.

## 진실

**진범**: 강태욱 (CH05)
**공범**: 없음

### 동기

극단이 만성 재정난에 시달리는 가운데, 강태욱은 몇 달 전 창단 소장품인 200년 된 골동 그림자인형 원본 세트를 익명의 해외 수집가에게 몰래 팔아 운영자금을 마련했다. 무대에는 정교한 복제품을 대신 걸어 두고 아무도 눈치채지 못하게 했다. 국제 페스티벌 초청이 확정되며 진위 감정서가 딸린 프로그램북 제작이 예정되자, 복제품이 감정에서 들통날 위기에 처했다.

### 수법

리허설 전날 밤, 유겸재가 인형의 무게와 이음새 차이를 알아채고 강태욱을 조종대로 불러 추궁했다. 강태욱은 그를 진정시키는 척하며 제어반 옆에 세워두고, 정비 점검을 핑계로 트랩도어를 수동으로 조작해 유겸재가 딛고 있던 발판을 갑자기 내려앉게 했다.

### 결정적 시각·장소

22:40, L03 무대 아래 조종대에서 추궁 시작 / 22:55, L03에서 트랩도어 조작으로 추락.

### 은폐

강태욱은 "정기 점검 중 오작동으로 인한 사고"라고 주장하고, 위작 판매 계약서와 송금 기록을 사무실 금고 깊숙이 숨긴다.

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