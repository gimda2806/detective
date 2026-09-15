# CASE260 — 핀 뒤에서 멈춘 손
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

동네 아마추어 볼링 리그가 주 2회 저녁 정기전을 여는 볼링장 '스트라이크존'. 대표 배정훈이 10년 넘게 혼자 운영해 왔고, 프런트 매니저 유상희가 실질적인 안살림을 도맡아 왔다. 특별한 행사나 마감 없이 흘러가는 평범한 화요일 저녁, 리그 경기가 막 시작되려던 참에 핀세터 정비실에서 배정훈이 오른팔을 움켜쥔 채 쓰러진 채로 발견된다.

## 톤

잔잔한 일상 속에 스며든 배신극

## 탐정의 진입

- 경로: `unrelated_errand`

탐정은 며칠 전 이곳에 두고 간 우산을 찾으러 들렀다가, 마침 함께 있던 한지우와 소동과 마주친다.

## 진실

**진범**: 유상희 (CH01)
**공범**: 없음

### 동기

배정훈이 신입 직원 구하람에게 부매니저 자리를 제안하며 정작 10년 가까이 연인이자 사업 동반자로 곁을 지켜온 유상희에게는 그 사실을 숨기자, 유상희는 자신이 쏟은 시간과 관계 모두를 한순간에 밀려난다는 배신감에 사로잡혀 살해를 계획한다.

### 수법

유상희는 남재헌이 정기점검을 마치고 자리를 비운 틈에 핀세터 결선함을 열어 스위퍼바 리밋스위치로 이어지는 배선 두 가닥의 색을 서로 바꿔 연결해, 감지 신호보다 스위퍼바가 먼저 움직이도록 만든다. 배정훈이 경기 시작 전 마지막 점검으로 평소 습관대로 전원을 차단하지 않은 채 걸린 핀을 손으로 빼내려 통로에 손을 넣자, 예정보다 일찍 움직인 스위퍼바가 그의 오른팔을 강하게 후려친다.

### 결정적 시각·장소

사건 당일 18시 6분, 핀세터 정비실(L03)에서 배정훈이 홀로 걸린 핀을 손으로 빼내려던 순간.

### 은폐

유상희는 소동이 벌어지자 뒤늦게 달려온 척 정비실로 들어가 배선을 원래대로 되돌려 끼워 넣어, 노후 장비의 정비 불량 사고처럼 보이게 만든다.

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