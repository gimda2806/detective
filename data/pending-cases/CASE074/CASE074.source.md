# CASE074 — 가압조가 삼킨 내압
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

해양안전 내압인증 심사를 이틀 앞둔 특수 잠수정 개발업체 '딥로어마린'의 가압시험동. 심해 잠수정 마지막 내압시험이 한창이던 늦은 밤, 수석 내압엔지니어 유경인이 가압테스트챔버 안에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

심사를 코앞에 둔 팽팽한 긴장과, 같은 팀원을 의심해야 하는 씁쓸함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `event_attendance`

탐정은 딥로어마린이 여는 신형 잠수정 공개 시연회에 초청받아 참석해 있었다.

## 진실

**진범**: 심국경 (CH03)
**공범**: 없음

### 동기

심국경은 설계팀장으로서 내압인증 시험성적을 실제보다 높게 부풀려 제출해 왔다. 유경인이 시험 원본 로그와 제출된 성적서의 수치 차이를 짚어내고, 이틀 뒤 인증심사위원 앞에서 그대로 밝히겠다고 통보하자 심국경은 심사 자체가 무산될 위기에 몰렸다.

### 수법

심국경은 사흘 전 미리 가압테스트챔버 해치 연동장치의 고정핀을 빼 두었다. 겉으로는 평소와 똑같이 작동하는 듯 보였지만, 실제로는 챔버 내부 감압이 다 끝나지 않아도 해치가 열리도록 되어 있었다. 유경인이 마지막 시험을 마치고 혼자 남아 해치를 열자, 미처 빠지지 않은 압력차가 한꺼번에 터져 나오며 그를 덮쳤고, 그는 챔버 안에서 쓰러진 채 발견됐다.

### 결정적 시각·장소

D-3, 오후, L03 가압테스트챔버에서 고정핀 제거 / D-1, 22:20, L03 가압테스트챔버에서 해치 개방 및 감압 사고 / D-1, 22:40, L03 가압테스트챔버에서 고정핀 재장착.

### 은폐

심국경은 사고 직후 소란한 틈을 타 다시 가압테스트챔버 안으로 들어가 고정핀을 원래 자리에 끼워 넣고, 정비 이력에는 자신이 손대지 않은 것처럼 남겨 두었다.

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