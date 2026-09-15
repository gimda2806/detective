# CASE165 — 갈피 사이의 독
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

상속 소송 재산목록 검증일을 맞은 3대째 고서점 겸 고문헌 감정소 '고요서가'. 법원이 지정한 감정평가사가 지하 서고에서 검증 작업 도중 쓰러진 채 발견된다.

## 톤

고서 특유의 정적과 상속 분쟁의 날 선 신경전이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `legal_or_official_obligation`

탐정은 이번 상속 소송의 재산목록 검증 절차에 법원이 지정한 입회인으로 참석할 공적 의무가 있어 고요서가에 나와 있었다.

## 진실

**진범**: 감이든 (CH03)
**공범**: 없음

### 동기

감이든은 노모의 수술비를 마련하지 못해 궁지에 몰려 있었다. 오랫동안 상속 목록에 정확히 등재되지 않은 채 방치돼 있던 《현암집》 초간본을 몰래 빼돌려 팔면 들키지 않을 거라 판단했다. 그런데 정식 재산목록 검증을 맡은 신유하가 실물과 목록의 불일치를 알아채고 법원에 알리겠다고 하자, 발각을 막아야 한다는 압박에 몰렸다.

### 수법

감이든은 검증 당일 오전 신유하에게 책의 행방을 추궁당한 뒤, 훈증 보관실에 오래전부터 남아 있던 옛 방식의 목재용 방충 분말(비소 화합물 함유)을 손수건에 덜어내 신유하의 보온병에 섞어 넣었다. 신유하에게는 이미 부정맥 지병이 있어, 급성 중독 증상이 심장 발작처럼 보일 거라 계산했다.

### 결정적 시각·장소

당일 11시 45분, L05 훈증 보관실에서 방충 분말을 덜어냄 / 당일 12시 20분, L01 매장 탕비대에서 보온병에 혼입 / 당일 14시 05분~15시 40분, L03 지하 서고에서 음용 후 쓰러진 채 발견됨.

### 은폐

감이든은 신유하의 죽음이 지병 발작에 의한 것으로 보이도록 훈증 보관실 캔을 원래 위치로 되돌려 놓고 지문을 닦아냈다. 책의 실종에 대해서는 미리 '재작년 곰팡이 피해로 폐기 처리했다'고 둘러대 두었다.

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