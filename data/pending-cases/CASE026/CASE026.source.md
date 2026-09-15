# CASE026 — 태엽이 멈춘 계단
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 회중시계 복원 공방 '태엽방(泰葉房)'. 경매하우스 '클리오옥션'과 협업해 온 희귀 시계 감정 스캔들이 곧 터지기 직전, 다락 보관실로 오르는 계단 아래에서 감정위원장이 추락한 채 발견된다.

## 톤

정교한 기계장치처럼 맞물린 위조와 배신, 그 톱니 사이에 낀 후회를 씁쓸하게 들여다보는 톤.

## 탐정의 진입

탐정은 거리에서 주운 낡은 회중시계의 주인을 찾아 뚜껑 안쪽에 새겨진 공방 마크를 실마리로 수소문한 끝에 복원 공방 '태엽방'을 찾아갔다가, 문을 두드리려는 순간 안쪽에서 터진 비명과 함께 사건과 마주친다.

## 진실

**진범**: 백이든 (CH02)
**공범**: 없음

### 동기

수년간 위조 감정서로 벌어들인 부정 수익과 경매하우스 '클리오옥션'의 명성을 지키기 위해, 다음 날 아침 모든 걸 경찰에 넘기겠다고 통보한 임소향의 폭로를 막으려 했다.

### 수법

사건 전날 밤 태엽방 뒷문을 자신의 도어락 코드로 열고 몰래 들어가 다락 계단 난간 고정 나사를 풀어 헐겁게 만들어 두었다. 다음 날 새벽 임소향이 원본 감정 기록철을 챙기러 다락을 내려오다 그 난간에 기대는 순간 통째로 빠지며 계단 아래로 추락해 사망했다.

### 결정적 시각·장소

사건 전날 밤 11시경 태엽방 계단참(L03), 사건 당일 새벽 6시경 같은 장소.

### 은폐

추락 직후 현장에 다시 들어가 임소향이 놓친 원본 감정 기록철을 훔쳐 은닉하고, 계단 난간은 원래 낡아서 일어난 사고처럼 그대로 방치한 채 빠져나갔다.

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