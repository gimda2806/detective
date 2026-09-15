# CASE036 — 리프트가 삼킨 이력
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

온라인 커뮤니티에 사고이력 은폐 의혹 게시물이 올라와 발칵 뒤집힌 중고차 매매단지 '클리어모터스'. 부속 사전점검소엔 상시 가동되는 유압 리프트 세 대가 있다.

## 톤

긴장감 있는 서스펜스지만, 탐정과 한지우의 티키타카로 숨통을 틔우는 톤.

## 탐정의 진입

- 경로: `group_member`

탐정은 전기차 동호회 정기 시승 모임에 참가하려 매매단지 '클리어모터스'의 야외 대기구역에 나와 있었다가, 순서를 기다리던 중 실내 정비고 쪽에서 터져 나온 비명과 마주친다.

## 진실

**진범**: 우현탁 (CH01)
**공범**: 없음

### 동기

재입고 차량들의 사고이력을 무사고로 조작해 판매해 온 사기를 손태율이 발견해 신고를 예고하자, 매매단지 전체가 무너질 것이 두려워 그를 살해했다.

### 수법

정비고 3번 리프트의 안전 고정핀을 미리 뽑아둔 뒤, 손태율을 리프트 하부 누유 점검 명목으로 불러들여 조작 레버를 눌러 하강시켜 깔려 죽게 하고 사고로 위장했다.

### 결정적 시각·장소

사건 전날 밤 21시 50분경, 사전점검소 정비고(L02) 3번 리프트

### 은폐

사고 직후 뽑아뒀던 안전 고정핀을 다시 꽂아 마모로 인한 자연 이탈처럼 보이게 했고, 손태율이 쓰던 태블릿을 회수해 자신의 사무실 캐비닛에 숨겼다. 조작된 차량 서류는 그대로 두어 의심을 피했다.

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