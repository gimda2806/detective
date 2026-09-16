# CASE186 — 참기름이 식던 오후
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 재래식 참기름·들기름 방앗간 '향유당(香油堂)'. 가을 들깨 수확철을 맞아 단골손님들의 발걸음이 이어지는 어느 오후, 낡은 착유기를 손보러 온 수리기사가 착유실에서 고온 참기름을 뒤집어쓴 채 쓰러진 2대 사장을 발견해 병원으로 옮겼으나, 그는 끝내 숨을 거둔다.

## 톤

3대를 이어온 방앗간의 정겨운 분위기 속에 가정의 어두운 그늘이 서서히 드러나는 무거운 톤. 한지우의 능청스러운 참견이 초반 분위기를 가볍게 하지만, 진실이 드러나는 순간만큼은 무겁게 다룬다.

## 탐정의 진입

- 경로: `service_call`

탐정은 향유당의 낡은 볶음가마 온도조절장치 수리를 의뢰받아 출장을 나온 참이었다. 한지우가 조수로 공구가방을 들고 따라왔다.

## 진실

**진범**: 류하경 (CH01)
**공범**: 없음

### 동기

향유당 안주인 류하경은 남편 진묘성이 오래전부터 아들 진하람에게 손찌검을 해 온 것을 알면서도 뜯어말리는 데 늘 실패해 왔고, 그날 오후에도 또다시 아들의 멱살을 잡고 몰아붙이는 남편을 보며 오랜 무력감과 분노가 한꺼번에 터져 나왔다.

### 수법

오늘 14시 21분경 착유실에서 류하경은 방금 아들에게 손찌검한 남편에게 대들며 그를 세게 밀쳤다. 뒤로 넘어진 진묘성의 팔꿈치가 가동 중이던 착유기 압력밸브 레버를 세게 쳐 열어젖혔고, 압력을 받고 있던 고온 참기름이 순식간에 그의 상체로 뿜어져 나와 전신 화상을 입었다.

### 결정적 시각·장소

오늘 14시 18분~2시 24분경, 착유실 안.

### 은폐

류하경은 비명을 지르는 대신 먼저 넘어진 걸상과 흩어진 참깨자루를 서둘러 정리한 뒤에야 사람들을 불러 사고를 알렸다.

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