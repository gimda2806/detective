# CASE083 — 성형실이 삼킨 성능
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

건축자재 성능인증 갱신 심사를 이틀 앞둔 방음자재 제조공장 '사일런트코어'의 성형·시험 작업동. 인증 시료 마지막 프레스 성형이 한창이던 늦은 밤, 수석 성능시험엔지니어 심서명이 프레스성형실 안에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

인증 갱신 심사를 이틀 앞둔 조급함과, 현장 인력들 사이 책임 회피가 뒤섞이며 번지는 냉랭함이 공존하는 분위기.

## 탐정의 진입

- 경로: `onsite_recognized_and_asked`

탐정은 인근 거래처 방문을 마치고 사일런트코어 앞을 지나던 중, 마당에서 서성이던 경비 직원이 그를 알아보고 다급히 손짓해 안으로 이끌었다.

## 진실

**진범**: 전건하 (CH03)
**공범**: 없음

### 동기

전건하는 인증 갱신 심사를 통과시키기 위해 방음성능 시험 데이터 일부를 실제 측정값보다 높여 제출해 왔다. 심서명이 시험성적 원본과 제출본 사이의 오차를 발견하고 이틀 뒤 인증심사위원 앞에서 그대로 밝히겠다고 통보하자, 전건하는 심사 전에 그 폭로를 막아설 방법을 찾아야 했다.

### 수법

전건하는 사고 전날 미리 프레스 성형기의 안전 인터록 센서에 우회 배선을 연결해, 금형 도어가 열린 채로도 가압이 걸리도록 만들어 두었다. 마지막 인증 시료를 직접 점검하던 심서명이 금형 안쪽으로 손을 넣어 시료 위치를 바로잡는 순간, 프레스가 예고 없이 하강했고 심서명은 팔과 상반신이 그대로 눌린 채 쓰러졌다.

### 결정적 시각·장소

D-1, 19:30, L03 프레스성형실에서 인터록 우회 배선 연결 / D-1, 19:51, L03 프레스성형실에서 압착 사고 / D-1, 20:10, L03 프레스성형실에서 배선 원상복구.

### 은폐

전건하는 사고 직후 우회 배선을 원래대로 되돌려 놓아, 안전 인터록이 애초부터 정상 작동했던 것처럼 꾸며 두었다.

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