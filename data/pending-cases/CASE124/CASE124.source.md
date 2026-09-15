# CASE124 — 밑그림이 지운 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 타투 컨벤션 초청 작가 최종 선발 심사를 사흘 앞둔 타투 스튜디오 '묵혼(墨魂)'. 심사용 데몬스트레이션 준비를 하던 수석 아티스트가 소독작업실 안에서 패혈성 쇼크 증세로 쓰러진 채 발견된다.

## 톤

국제 무대 데뷔라는 화려한 목표와 그 이면의 도안 도용이 대비되는 타투 스튜디오 분위기.

## 탐정의 진입

- 경로: `personal_appointment`

탐정은 오래전부터 미뤄온 타투 상담 예약차 한지우와 함께 '묵혼'을 찾았다가, 소독작업실 쪽에서 터진 소란과 마주쳤다.

## 진실

**진범**: 염태준 (CH01)
**공범**: 없음 (라건우는 정기 점검이라 믿고 지시를 따랐을 뿐 공범이 아니다).

### 동기

염태준은 국제 컨벤션 초청 작가 선발에 필요한 포트폴리오에, 이미 은퇴한 해외 작가의 미공개 도안을 자신이 그린 것처럼 도용해 제출했다. 수석 아티스트 양지호가 원본 스케치 파일을 우연히 발견해 심사 전 컨벤션 사무국에 알리겠다고 압박했다.

### 수법

위생관리 담당 라건우에게 '정기 점검'을 핑계로 양지호가 쓸 멸균기의 소독 사이클을 몰래 단축시키고, 양지호가 리허설 마무리 중 오염된 니들에 찔려 패혈성 쇼크로 쓰러지도록 방치했다.

### 결정적 시각·장소

21:10, L04에서 라건우에게 멸균 사이클 단축 지시 / 21:40, L02에서 양지호 의식 잃음 / 21:50 발견 후 22:05 멸균기 로그를 정상 기록으로 덮어써 은폐.

### 은폐

양지호가 쓰러졌다는 소식을 듣자마자 염태준은 멸균기 관리 시스템의 로그부터 손을 댔다. 소독 사이클이 단축됐던 기록을 정상 값으로 지워버린 뒤, 도안 도용 건에 대해서는 끝까지 모른다고 잡아떼며 그날 밤 스튜디오 근처에 얼씬도 안 했다고 주장했다.

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