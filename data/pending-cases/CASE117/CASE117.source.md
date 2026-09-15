# CASE117 — 부스에 남은 마지막 콜
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

전국 e스포츠 리그 결선 진출을 사흘 앞둔 프로게임단 합숙소 겸 전용 연습실 '노바게이밍하우스'. 결선 진출 확정 자축 회식이 끝난 늦은 밤, 수석 전략분석가가 개인 리플레이 분석 부스 안에서 심정지 상태로 발견된다.

## 톤

결선을 앞둔 프로게임단 특유의 긴장과, 사촌 동생을 향한 탐정의 개인적 염려가 뒤섞인 분위기.

## 탐정의 진입

- 경로: `personal_stake`

탐정의 사촌 동생이 이 팀 신인 선수로 최근 합류해, 마침 격려차 숙소를 찾아와 있던 참이었다.

## 진실

**진범**: 구석현 (CH02)
**공범**: 없음

### 동기

구석현은 온라인 도박으로 진 빚을 갚기 위해 상대팀 스카우트에게 팀의 전략 자료를 팔아 넘겨 왔다. 수석 전략분석가 마지혁이 연습경기 데이터 접속 기록의 이상 징후를 발견하고 그를 추궁하자, 유출 사실이 드러날 것을 두려워했다.

### 수법

구석현은 마지혁이 평소 부정맥 지병으로 상비약을 챙겨 먹는다는 사실을 알고 있었다. 그는 마지혁의 에너지드링크 캔에 다량의 각성제 가루를 몰래 섞어 마시게 했고, 곧바로 의무실 보관함에서 마지혁의 상비약 통을 치워 응급 대응을 할 수 없게 만들었다.

### 결정적 시각·장소

22:45, L02 개인 리플레이 분석 부스에서 음료에 각성제 투입 / 23:20, L05 의무실 보관함에서 상비약 은닉.

### 은폐

구석현은 마지혁이 과로와 스트레스로 스스로 쓰러진 것처럼 두고, 자신은 그날 밤 훈련실에서 혼자 자료만 정리했을 뿐이라고 주장한다.

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