# CASE137 — 타지 않은 진실
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

고인의 유골을 초고온·초고압으로 압축해 다이아몬드로 만들어주는 프리미엄 메모리얼 다이아몬드 랩 '이터널카본'. 대형 투자 유치를 앞두고 유명 소설가의 고 남편 유골로 완성한 다이아몬드 반지를 공개하는 라이브스트리밍 행사가 예정된 오후, 리허설을 점검하던 수석 랩 매니저가 합성로실에서 전신 화상을 입은 채 쓰러진 모습으로 발견된다.

## 톤

고급스러운 미디어 행사 특유의 화려함과, 죽음과 그리움을 다루는 산업 특유의 조심스러운 정서가 뒤섞인 분위기.

## 탐정의 진입

- 경로: `event_attendance`

탐정은 지인의 소개로 오늘 오후 '이터널카본'의 다이아몬드 공개 행사에 하객으로 초대받아 로비 리셉션에 있었다.

## 진실

**진범**: 도재희 (CH02)
**공범**: 없음

### 동기

도재희는 랩 확장을 위한 대규모 투자 유치를 앞두고 원가 절감이 시급했다. 실제로는 상당수 주문에서 진짜 유골 대신 값싼 산업용 흑연 분말을 섞어 합성했지만, '100% 유골 원료'로 광고해 프리미엄 요금을 받아왔다. 신재하는 접수 중량과 합성로 배치 기록이 반복적으로 어긋나는 것을 발견하고 진실을 캐고 있었다.

### 수법

14:30 합성로실에 들어가 리허설용 최종 압력 테스트를 준비하던 중, 14:45 배치 기록 대조본을 든 신재하에게 다그침을 당했다. 몸싸움 중 14:52 냉각재킷 비상 밸브를 잘못 건드려 열었고, 14:53 당황해 다시 잠그려다 놓치는 사이 분출된 고온 증기에 근접해 있던 신재하가 전신 화상을 입고 쓰러져 숨졌다.

### 결정적 시각·장소

14:30~14:53, L03 합성로실.

### 은폐

도재희는 이를 정기 압력 테스트 중 벌어진 설비 오작동 사고로 발표하려 한다.

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