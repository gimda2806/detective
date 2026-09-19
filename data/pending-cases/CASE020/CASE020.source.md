# CASE020 — 노트에 새겨진 거짓말
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

시그니처 향수 론칭 프레스 프리뷰를 사흘 앞둔 독립 조향 스튜디오 '베르가못'. 이른 아침, 운영실장이 조향실에서 쓰러진 채 발견된다.

## 톤

이른 아침 향수 스튜디오의 정적과 론칭을 앞둔 긴장이 뒤섞인 분위기.

## 탐정의 진입

탐정은 중고거래 앱으로 낙찰받은 빈티지 향수병을 받으러 판매자와 만나기로 한 조향 스튜디오 앞에 도착했다가, 마침 그 순간 벌어진 소동과 마주친다.

## 진실

**진범**: 하유담 (CH03)
**공범**: 없음

### 동기

하유담이 3년 전 발표한 시그니처 향은 12년 전 세상을 떠난 스승 서경란의 미공개 노트에 적힌 처방이고, 하유담은 그것을 자기 것으로 발표해 왔다. 운영실장 남소원은 원가를 낮추려고 론칭 향의 희석 처방을 후원사에 제안해 승인까지 받아 두었고, 시행일을 론칭일로 확정하면서도 하유담에게는 알리지 않았다. 희석이 시행되면 스승이 맞춘 비율은 영영 사라진다. 서명도 승인도 이미 끝나 되돌릴 길이 없었고 론칭은 사흘 뒤였다.

### 수법

사건 전날 밤, 하유담은 원료 보관고에서 고농축 윈터그린 원액을 반출해 남소원이 매일 아침 쓰는 핸드크림에 섞어두었다. 다음 날 새벽 남소원이 이를 바르고 조향실에서 급성 중독으로 쓰러지자, 하유담은 알레르기 주의 원료병을 열어 책상 위에 두고 환기 시스템을 가동해 사고 현장처럼 꾸몄다.

### 결정적 시각·장소

사건 전날 21시~사건 당일 5시 25분, L02 조향실 및 L05 남소원의 작업공간.

### 은폐

하유담은 원료 알레르기로 인한 사고사라고 둘러대고, 남소원이 새벽에 혼자 원료를 확인하다 사고를 당한 것처럼 정리했다.

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