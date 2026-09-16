# CASE121 — 그물이 걷힌 자리
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

전국 서커스 페스티벌 개막을 앞둔 이동 서커스단 '별빛서커스'. 개막 전날 늦은 밤, 단독 리허설을 하던 수석 공중곡예사가 안전그물이 걷힌 트라피즈 리깅 아래로 추락해 숨진 채 발견된다.

## 톤

화려한 개막 준비와 그 뒤편의 재정 압박이 대비되는 폐쇄적인 이동 서커스단 분위기.

## 탐정의 진입

- 경로: `anonymous_tip_self_initiated`

탐정은 별빛서커스의 미등록 단원 착취 의혹을 담은 익명 제보를 받고, 개막을 앞둔 페스티벌 부지를 스스로 둘러보러 왔다.

## 진실

**진범**: 육하연 (CH02)
**공범**: 없음 (화서인은 정비 목적이라 믿고 지시를 따랐을 뿐 공범이 아니다).

### 동기

노바서커스와의 인수합병 계약을 서문가은이 개막 기자간담회에서 폭로하겠다고 압박했고, 육하연은 계약이 무산되면 재정난에 빠진 서커스단을 살릴 마지막 기회를 잃는다고 판단했다.

### 수법

리깅 담당자 화서인에게 그물 정비를 핑계로 안전그물을 걷게 하고, 서문가은이 그물 없는 상태로 단독 리허설을 하다 추락하도록 방치했다.

### 결정적 시각·장소

20:50, L04에서 화서인에게 그물 철거 지시 / 21:20, L02에서 서문가은 추락 / 21:25, L02에서 발견 후 21:35 그물을 다시 걸어 정황을 은폐.

### 은폐

처음부터 그물이 걸려 있었다고 주장하고, 신고를 늦춰 순수한 사고처럼 보이게 했다.

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