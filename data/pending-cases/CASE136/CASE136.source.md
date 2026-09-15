# CASE136 — 회로가 젖어 있던 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

글로벌 스포츠용품 브랜드와의 국내 독점 프랜차이즈 확장 계약 체결식을 사흘 앞둔 도심형 실내 서핑파크 '웨이브포지(WavePorge)'. 신규 안전인증 재심사가 함께 진행되던 이른 아침, 수석 웨이브 엔지니어가 웨이브머신 제어실 배전반 앞에서 감전된 채 쓰러진 모습으로 발견된다.

## 톤

국내 진출을 눈앞에 둔 스타트업 특유의 조급함과, 물과 전기가 늘 붙어 있는 시설 특유의 아슬아슬한 긴장이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `onsite_recognized_and_asked`

탐정은 이른 아침 개인 서핑 강습을 받으러 '웨이브포지'에 와 있다가, 소란이 인 풀 쪽에서 그를 알아본 안전관리팀장에게 붙들려 자리를 함께하게 된다.

## 진실

**진범**: 봉수아 (CH02)
**공범**: 없음

### 동기

봉수아는 글로벌 스포츠용품 브랜드와의 국내 독점 프랜차이즈 확장 계약이 사흘 앞으로 다가온 안전인증 재심사 통과 여부에 달려 있다는 사실에 쫓기고 있었다. 그런데 웨이브머신 유압 패널이 최근 석 달간 반복적으로 오작동을 일으켜 온 사실이 정비 로그에 고스란히 남아 있었고, 이를 그대로 제출하면 재심사 통과가 불가능했다. 봉수아는 정비 대장 사본에서 오작동 이력을 지우고 조작본으로 바꿔치기하려 했다.

### 수법

05:15 제어실에 몰래 들어가 정비 대장을 조작본으로 바꿔치기하던 중 05:20 되돌아온 명하온에게 발각되었다. 몸싸움 끝에 05:28 배전반 안전 커버를 강제로 열어 절연 차단기를 무력화했고, 05:35 당황한 채 수동 가동 버튼을 누르자 환기구 누수로 젖어 있던 바닥에 서 있던 명하온이 배전반을 짚은 순간 감전되어 숨졌다.

### 결정적 시각·장소

05:15~05:35, L03 웨이브머신 제어실.

### 은폐

봉수아는 이를 정기 시험가동 중 벌어진 단순 배전반 오작동 사고로 발표하려 한다.

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