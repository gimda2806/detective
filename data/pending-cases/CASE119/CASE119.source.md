# CASE119 — 탈산조가 삼킨 서명
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국립박물관 기증식을 사흘 앞둔 사설 고문헌 복원 연구소 '청람문헌원'. 자문위원이 보존처리실 탈산 처리조 옆에서 숨진 채 발견된다.

## 톤

차분하고 씁쓸한 정통 미스터리

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 대학 시절 인연이 있는 수석 보존과학자 국여울의 초대로, 기증식을 앞두고 열리는 특별전 사전 공개를 보러 청람문헌원을 찾았다.

## 진실

**진범**: 예찬희 (CH01)
**공범**: 없음

### 동기

위조 의혹이 있는 문집을 그대로 기증식에서 공개해 국가 보존 지원금과 명성을 지키려 했고, 이를 무산시키려는 온재혁을 막으려 했다.

### 수법

보존처리실 탈산 처리조 옆에서 몸싸움 끝에 온재혁을 조 안에 눌러 익사시키고, 발판을 어긋나게 배치해 실족사로 위장했다.

### 결정적 시각·장소

사건 당일 밤 자정 무렵, 보존처리실(L02)

### 은폐

탈산 처리조 옆 발판을 일부러 옮겨 실족한 것처럼 꾸미고, 다음 날 재검증 없이 감정 결론을 예정대로 발표하려 했다.

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