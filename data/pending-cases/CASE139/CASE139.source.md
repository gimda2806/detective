# CASE139 — 지워진 열 번째 프레임
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가대표 선발전을 사흘 앞둔 프로볼링단 전용 훈련센터 '스트라이크존'. 공인구 인증 심사를 앞두고 볼의 무게중심을 맞추는 드릴링 작업장과, 핀을 자동으로 세우고 볼을 되돌리는 핀세터 기계실이 나란히 붙어 있다. 늦은 저녁, 수석 볼 드릴러가 핀세터 컨베이어 벨트에 끼인 채 쓰러진 모습으로 발견된다.

## 톤

성적과 후원계약을 둘러싼 팽팽한 셈법이 뒤섞인 훈련센터 분위기.

## 탐정의 진입

- 경로: `anonymous_tip_self_initiated`

탐정은 프로볼링단의 공인구 규격 위반을 알리는 익명 제보를 받고, 대회 인증 심사를 앞둔 훈련센터를 스스로 판단해 찾아간다.

## 진실

**진범**: 표하윤 (CH02)
**공범**: 없음

### 동기

표하윤은 스포츠용품 브랜드와의 후원계약 갱신이 어시완의 이번 선발전 성적에 달려 있는 상황에서, 어시완의 경기용 볼에 규정 위반 편심 웨이트 코어를 몰래 넣어 후크 성능을 인위적으로 끌어올렸다. 이 사실이 발각되면 실격 처리와 함께 계약이 무산될 상황이었다.

### 수법

표하윤은 심다은에게 발각당하자, 핀세터 기계실 제어반의 안전 인터록을 미리 수동으로 해제해 두었다가 그녀를 기계실로 불러들여 컨베이어 점검구를 들여다보는 사이 컨베이어를 가동시켜 사고사로 위장해 살해했다.

### 결정적 시각·장소

18:50, L04 핀세터 기계실에서 안전 인터록 해제 / 19:15, L04에서 컨베이어 가동으로 살해.

### 은폐

표하윤은 심다은이 늦게까지 혼자 기계 점검을 하다 사고를 당한 것이라 몰아가고, 문제의 코어가 든 볼을 정품 볼로 몰래 교체한다.

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