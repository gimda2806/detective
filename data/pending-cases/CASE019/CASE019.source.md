# CASE019 — 온실이 감춘 낙찰가
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

전국 분재 명인전 출품을 앞둔 산속 분재원 온실. 이른 아침, 수석 재배사가 온실 안에서 쓰러진 채 발견된다.

## 톤

고요한 온실의 정적과 명인전을 앞둔 긴장이 뒤섞인 분위기.

## 탐정의 진입

탐정은 산길을 넘던 중 타이어가 펑크 나 도움을 청하러 분재원에 들렀다가, 마침 그 시각 벌어진 소동과 우연히 마주친다.

## 진실

**진범**: 고인석 (CH03)
**공범**: 없음

### 동기

고인석은 명인전 출품용 희귀 분재 여러 점을 경매 담합으로 시세보다 훨씬 싸게 낙찰받은 뒤, 실제 감정가로 뒷거래해 차액을 개인적으로 챙겨 왔다. 수석 재배사 남기현이 장부 정리 중 낙찰가와 감정가의 불일치를 발견하고 경매협회 감사역에게 알리겠다고 하자, 발각과 명인전 자격 박탈을 막기 위해 그를 살해했다.

### 수법

사건 전날 밤, 고인석은 남기현이 야간 순찰 때 즐겨 마시는 보온병 차에 온실 방제용 유기인계 살충제를 섞어두었다. 다음 날 새벽 남기현이 순찰 중 이를 마시고 온실 안에서 쓰러지자, 고인석은 방제 살포기를 넘어뜨려 사고 현장처럼 재배치하고 환기창을 열어 냄새를 흐렸다.

### 결정적 시각·장소

사건 전날 22시~사건 당일 5시 35분, L02 온실.

### 은폐

고인석은 방제 살포기 오작동으로 인한 사고사라고 둘러대고, 남기현이 야간에 혼자 방제 점검을 하다 사고를 당한 것처럼 정리했다.

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