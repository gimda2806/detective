# CASE168 — 녹지 않은 마지막 조각
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

5성급 호텔 윈터 갈라 센터피스 공개를 하루 앞둔 프리미엄 아이스카빙 스튜디오 '프로스트라인(Frostline)'. 밤새 폭설로 도로가 전면 통제된 가운데, 이른 아침 대형 냉동보관실 안에서 수석 조각가가 쓰러진 채 발견된다.

## 톤

화려한 갈라 준비의 긴장감과 폭설로 고립된 밤이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `stranded_by_circumstance`

탐정과 한지우는 폭설로 고속도로가 전면 통제되면서 오도 가도 못한 채, 마침 스튜디오 관계자와 안면이 있던 한지우 덕분에 '프로스트라인'에서 하룻밤 신세를 지게 됐다.

## 진실

**진범**: 겸시우 (CH01)
**공범**: 없음

### 동기

겸시우는 호텔과의 5년 독점 계약 서명을 앞두고 있었다. 계약의 핵심 조건은 이번 겨울 갈라에서 선보일 센터피스가 '프로스트라인'의 독자 개발작이어야 한다는 것이었는데, 실제로는 지난달 트레이드쇼에서 공개된 경쟁 스튜디오 '글레이셜웍스'의 수상작 3D 스캔 데이터를 몰래 입수해 재현한 것이었다. 우진하가 백업 폴더에서 그 원본 스캔 파일의 워터마크를 발견하면서 도용 사실이 발각될 위기에 처했다.

### 수법

겸시우는 20:45 대표 사무실에서 스캔 원본 파일 사본을 통째로 삭제했지만, 이미 진하와 언쟁을 벌인 뒤였다. 22:40 발전기 점검을 핑계로 우진하를 냉동보관실 안쪽 예비 보관 구역으로 데려갔고, 23:05 문을 밖에서 잠갔다. 자정 무렵 문 앞까지 왔다가 안에서 인기척이 없자 그대로 발길을 돌렸다.

### 결정적 시각·장소

20:45, L02 대표 사무실에서 파일 삭제 / 23:05, L04 냉동보관실에 감금.

### 은폐

겸시우는 우진하가 몸이 안 좋아 먼저 숙소로 돌아간 것 같다는 메모를 남기고, 삭제한 파일 대신 자체 개발 과정을 담은 것처럼 보이는 가짜 렌더링 기록을 새로 만들려 한다.

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