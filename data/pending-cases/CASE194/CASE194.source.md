# CASE194 — 겨눈 적 없는 날
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

소규모 인디 게임 개발사 '옐로우문스튜디오'가 신작의 비공개 베타 쇼케이스를 사옥 안에서 직접 열고 있다. 초대된 소수의 스트리머와 관계자들이 로비에서 데모 빌드를 체험하는 동안, 안쪽 모션캡처 스테이지에서 소동이 벌어진다.

## 톤

가볍고 활기찬 인디 게임 현장 분위기에서 시작해, 후반부로 갈수록 씁쓸해지는 정통 추리.

## 탐정의 진입

- 경로: `accompanying_someone`

탐정은 인디 게임 스트리머로 활동하는 지인 반이설이 옐로우문스튜디오의 비공개 베타 쇼케이스에 초대받아 함께 가자고 조르는 바람에 따라나선 참이었다.

## 진실

**진범**: 목라온 (CH02)
**공범**: 없음

### 동기

목라온은 오랫동안 챙겨온 후배 소하율이 최근 몇 달째 우재이에게 사적인 심부름과 과도한 잔업을 반복해서 떠맡고, 거절할 때마다 다른 팀원들 앞에서 망신을 당해 왔다는 사실을 알게 되고 참을 수 없는 분노에 사로잡힌다.

### 수법

목라온은 모션캡처 스테이지로 우재이를 찾아가 소하율을 그만 힘들게 하라고 항의했지만 코웃음 섞인 무시만 돌아오자, 격분해 근처 소품 걸이대의 레플리카 도검을 집어 들어 우재이 쪽으로 휘둘렀다. 화보 촬영을 위해 다시 벼려져 아직 무디게 처리되지 않은 날에 우재이가 막던 팔과 목 옆을 베였고, 목라온은 곧바로 지혈하지 않고 몇 걸음 물러나 그가 과다출혈로 쓰러지는 걸 그대로 지켜봤다.

### 결정적 시각·장소

14시 13분경, L02 모션캡처 스테이지 소품 걸이대 앞.

### 은폐

목라온은 피 묻은 도검을 소품 보관실로 가져가 수돗물로 씻어 걸이대에 되돌려 놓고, 핏자국이 튄 작업복 상의를 세탁 바구니 아래에 숨긴 뒤 여벌 셔츠로 갈아입어 아무 일도 없었다는 듯 자리로 돌아갔다.

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