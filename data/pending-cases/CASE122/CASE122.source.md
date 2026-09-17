# CASE122 — 날이 풀리던 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가대표 피겨스케이팅 선발전을 사흘 앞둔 실내 빙상훈련센터 '설연 아이스아레나'. 늦은 밤 혼자 개인 훈련을 하던 부코치가 메인링크에서 낙상해 숨을 거둔 채 발견된다.

## 톤

국가대표 선발이라는 화려한 목표와 그 이면의 압박이 대비되는 폐쇄적인 피겨스케이팅 훈련장 분위기.

## 탐정의 진입

- 경로: `travel`

지방 여행 중이던 탐정은 이 도시에서 열릴 예정이던 갈라쇼 티켓을 예매해 둔 터라, 일정을 확인하러 아이스아레나에 들렀다가 소동과 마주쳤다.

## 진실

**진범**: 노경환 (CH01)
**공범**: 없음 (최시완은 정기 점검이라 믿고 지시를 따랐을 뿐 공범이 아니다).

### 동기

노경환은 편도영의 국제대회 예선 성적표를 조작해 선발전 와일드카드 자격으로 밀어넣었고, 부코치 하영주가 원본 통지서를 발견해 선발전 전에 협회에 알리겠다고 압박했다.

### 수법

장비관리사 최시완에게 '정기 점검'을 핑계로 하영주의 스케이트 블레이드 고정 리벳을 몰래 풀어놓게 하고, 하영주가 늦은 밤 혼자 개인 훈련을 하다 블레이드가 빠지며 낙상하도록 방치했다.

### 결정적 시각·장소

21:10, L04에서 최시완에게 블레이드 리벳 재점검 지시 / 21:40, L02에서 하영주 낙상 / 21:50 발견 후 22:05 블레이드를 여벌로 바꿔치기해 은폐.

### 은폐

처음부터 최근 며칠간 사무실에 있었다고만 말하며 성적 조작 사실을 부인하고, 사고 당일에는 일찍 퇴근했다가 뒤늦게 연락받고 왔다고 주장했다.

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