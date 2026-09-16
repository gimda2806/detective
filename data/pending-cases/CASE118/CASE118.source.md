# CASE118 — 사일로 아래 남은 온기
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 치즈 아르티장 어워드 결선 진출 확정을 위한 마지막 원산지 인증 심사를 사흘 앞둔 산속 목장형 치즈 공방 '초원낙농(草原酪農)'. 이른 아침, 수석 치즈메이커가 사료용 목초 저장 사일로 안에 매몰된 채 발견된다.

## 톤

이른 아침 산 안개가 낀 목장의 목가적인 정적과, 그 속에서 실적 압박에 찌든 인물들 사이의 대비가 느껴지는 분위기.

## 탐정의 진입

- 경로: `unrelated_errand`

탐정은 개인적으로 즐겨 사던 치즈를 사러 목장 직영매장에 들렀다가, 마침 그 자리에서 벌어진 소동에 휘말린다.

## 진실

**진범**: 채수완 (CH02)
**공범**: 없음

### 동기

채수완은 국제 치즈 아르티장 어워드 결선 진출과 그에 연동된 수출 계약 유지가 이번 원산지 인증 심사(자가 목장 원유 100% 요건) 통과 여부에 달려 있다고 믿었다. 그런데 최근 원유 생산량이 줄어 부족분을 메울 방법이 없었고, 그는 저가 수입 탈지분유를 몰래 배합에 섞어 왔다.

### 수법

새벽에 수석 치즈메이커 남연우가 사료 창고에서 수입 분유 포대를 발견하고 채수완에게 해명을 요구하자, 몸싸움 끝에 채수완이 그를 사일로 점검구 계단 쪽으로 강하게 밀쳤다. 남연우는 실족해 사일로 내부로 추락했고 발효 중인 사료 더미에 파묻혀 질식했다.

### 결정적 시각·장소

05:20, L02 사료 창고에서 발각 및 몸싸움 / 05:28~05:32, L03 사일로 계단에서 추락 및 매몰.

### 은폐

채수완은 점검구 덮개를 다시 덮고, 방재훈의 서명을 흉내 내 점검 일지에 05:50 재점검 기록을 새로 적어 넣어 '정기 안전 점검 중 사고'로 위장했다.

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