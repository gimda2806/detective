# CASE201 — 고리가 놓아버린 순간
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

소규모 공중곡예(에어리얼) 컴퍼니 '실크라인'이 매달 한 번 여는 정기 오픈리허설 관람 데이. 관람객들이 돌아간 늦은 오후, 혼자 남아 리깅 안전점검 겸 테스트 상승을 하던 대표 겸 수석 코치가 안전매트 구역 프레임 아래 쓰러진 채로 발견돼 병원으로 옮겨졌으나 끝내 사망이 확인된다.

## 톤

차분하고 씁쓸한 정극 톤, 가족애가 바탕에 깔린 미스터리

## 탐정의 진입

- 경로: `anonymous_tip_self_initiated`

탐정은 이 컴퍼니의 리깅 안전 관리에 문제가 있다는 익명 제보를 받고, 마침 열리는 오픈리허설 관람 데이를 틈타 직접 살펴보러 왔다.

## 진실

**진범**: 임서린 (CH01)
**공범**: 없음

### 동기

배도현이 채수안의 무릎 부상 이력을 스폰서 쪽에 흘려 자진 하차를 압박하려 하자, 동생을 지키려는 집착에 사로잡힌 임서린이 계획적으로 범행을 저질렀다.

### 수법

임서린은 2일 전 오후 아무도 없는 정비실에서, 배도현이 매번 리허설 뒤 혼자 점검·테스트 상승에 쓰는 백업 세이프티 라인의 스크류게이트 카라비너 나사산을 공구로 반쯤 풀어, 하중이 실리면 게이트가 벌어지도록 만들어 두었다. 하중이 실리는 순간 게이트가 벌어지며 라인이 앵커에서 이탈했고, 배도현은 안전매트 지지프레임 모서리로 떨어져 복부를 부딪쳤다.

### 결정적 시각·장소

2일 전 오후, 리깅 정비실(L03)

### 은폐

임서린은 사건 직후 정비실 출입 기록을 지우려 했으나 시스템 특성상 삭제하지 못했고, 사건 당일 오후 내내 로비에 있었다는 거짓 알리바이로 버텼다.

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