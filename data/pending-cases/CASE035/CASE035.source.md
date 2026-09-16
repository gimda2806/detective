# CASE035 — 유리눈이 지켜본 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

야생동물 박제 공방 '야생방'

## 톤

서늘하고 스산하지만, 탐정과 한지우의 티키타카로 숨통을 틔우는 톤.

## 탐정의 진입

탐정은 온라인 벼룩시장 구인 게시판에서 본 박제 공방의 전시 보조 아르바이트 면접을 보러 찾아갔다가, 면접 시간에 맞춰 도착한 순간 공방 안쪽에서 터져 나온 비명과 마주친다.

## 진실

**진범**: 옥재훈 (CH01)
**공범**: 없음

### 동기

냉동 보관고에 숨겨둔 밀렵된 삵(보호종) 사체를 좌민규에게 밀거래하려던 사실을 판시우가 발견해 신고를 예고하자, 공방 전체가 무너질 것이 두려워 그를 살해했다.

### 수법

무두질실 환기팬 배전함의 퓨즈를 미리 뽑아 환기를 차단한 뒤, 판시우를 안으로 불러들여 폼알데히드 원액을 다량으로 쏟고 문을 잠근 채 빠져나가 중독사로 위장했다.

### 결정적 시각·장소

사건 전날 22시 40분경, 무두질실(L03)

### 은폐

환기팬 퓨즈를 미리 뽑아 '고장'으로 보이게 하고, 판시우가 홀로 야근하다 사고를 당한 것처럼 위장했다. 판시우의 작업 노트를 회수해 자신의 사무실 서랍에 숨기고, 밀렵 표본은 손대지 않은 채 그대로 두어 의심을 피하려 했다.

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