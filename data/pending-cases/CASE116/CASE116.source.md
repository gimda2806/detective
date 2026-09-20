# CASE116 — 밟았는데 없었다
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 모터스포츠 챔피언십 예선을 사흘 앞둔 프라이빗 테스트트랙 겸 레이싱팀 개러지 '벨로시타 레이싱'. 신형 브레이크 시스템 최종 테스트 주행 중, 수석 테스트드라이버가 헤어핀 구간에서 방호벽에 충돌해 그 자리에서 숨을 거둔 채 발견된다.

## 톤

성과 압박과 팀 내부 신뢰가 팽팽하게 부딪히는 모터스포츠 개러지의 긴장감.

## 탐정의 진입

- 경로: `curious_bystander`

탐정은 트랙 개방일 구경을 나왔다가, 통제선 안쪽에서 어수선해진 정비고 쪽 분위기를 보고 호기심에 다가간다.

## 진실

**진범**: 편지수 (CH02)
**공범**: 없음

### 동기

편지수는 예산 절감을 위해 인증받은 카본세라믹 브레이크 패드 대신 저가 대체품을 몰래 사용하고, 인증 시험 데이터의 마모율 수치를 조작해 서류를 통과시켰다. 하도윤이 최종 테스트 주행 중 이상 제동감을 느끼고 이를 감독에게 보고하려 하자, 편지수는 사실이 드러나는 것을 막으려 했다.

### 수법

편지수는 사고 전날 밤 개러지에서 하도윤의 차량 브레이크 유압 라인 커넥터를 공구로 미세하게 풀어놓아, 다음날 헤어핀 구간에서 제동력이 완전히 상실되도록 만들었다.

### 결정적 시각·장소

20:00, L03 브레이크 연구개발랩에서 인증 데이터 조작 / 22:35, L01 개러지에서 브레이크 라인 커넥터 훼손 / 06:50, L02 헤어핀 커브에서 충돌 사망.

### 은폐

편지수는 사고 원인을 '고속 주행 중 부품 피로 파손'으로 보고서에 기재하고, 조작된 인증 자료를 그대로 유지해 감사에 대비한다.

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