# CASE123 — 동기화되지 않은 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

시리즈 B 투자 라운드 클로징을 사흘 앞둔 VR 테마파크 체험관 '노바돔(NovaDome)'. 신규 투자자 실사단을 위한 프레스 데모데이 도중, 수석 콘텐츠 디렉터가 신작 모션 시뮬레이터 캡슐 안에서 의식을 잃은 채 발견된다.

## 톤

투자 유치라는 화려한 목표와 그 이면의 데이터 은폐가 대비되는 신생 VR 스타트업 분위기.

## 탐정의 진입

- 경로: `event_attendance`

탐정은 게임 전문 매체 기고를 위해 노바돔의 데모데이 프레스 프리뷰에 초청받아 한지우와 함께 로비에서 체험 순서를 기다리고 있었다. 안내 방송 대신 무전기 너머로 다급한 목소리가 흘러나온 건 그로부터 얼마 지나지 않아서였다.

## 진실

**진범**: 표건하 (CH01)
**공범**: 없음 (나윤재는 정기 캘리브레이션이라 믿고 지시를 따랐을 뿐 공범이 아니다).

### 동기

표건하는 사용자 생체 데이터를 무단 수집·조작해 투자 실사 자료에 제출했고, 콘텐츠 디렉터 서은교가 원본 로그를 발견해 데모데이 전에 투자사에 알리겠다고 압박했다.

### 수법

시뮬레이터 개발팀장 나윤재에게 '정기 캘리브레이션'을 핑계로 서은교가 테스트할 캡슐의 배기 밸브를 몰래 잠그게 하고, 서은교가 늦은 밤 혼자 캡슐 테스트를 하다 산소 결핍으로 의식을 잃도록 방치했다.

### 결정적 시각·장소

21:10, L04에서 나윤재에게 배기 밸브 재점검 지시 / 21:40, L02에서 서은교 의식 잃음 / 21:50 발견 후 22:05 밸브 로그를 정상 기록으로 덮어써 은폐.

### 은폐

사고가 알려지자 표건하는 곧장 캡슐 캘리브레이션 시스템에 접속해, 밸브를 잠그라고 지시했던 로그 항목을 정상 수치로 바꿔치기했다. 면담 중에는 데이터 조작 자체를 부인하며, 그날 밤은 일찍 퇴근해 체험관 근처에도 없었다고 잡아뗐다.

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