# CASE114 — 걸쇠는 바깥에 있다
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

특급호텔·베이커리 체인과의 독점 납품계약 체결식을 사흘 앞둔 도심 빌딩 옥상 양봉장 '봉정원(蜂庭園)'. 유기농·무농약 인증 갱신 심사를 통과해야 계약이 성사되는 상황에서, 이른 아침 수석 양봉가가 밀폐된 훈연장비 창고 안에서 의식을 잃은 채 발견된다.

## 톤

이른 아침 도심 옥상이라는 밝은 공간과, 계약 하나에 걸린 압박이 만들어내는 긴장이 대비되는 분위기.

## 탐정의 진입

- 경로: `witnessed_incident`

탐정은 봉정원이 그날 아침 일반에 개방한 옥상 정원 견학 프로그램에 개인적으로 신청해 마침 그 시각 현장에 있었고, 훈연장비 창고 환기구에서 새어 나오는 연기를 눈앞에서 목격하고 곧장 뛰어든다.

## 진실

**진범**: 탁준영 (CH01)
**공범**: 없음

### 동기

탁준영은 호텔 공급계약이 성사되면 거액의 성과급을 받기로 되어 있었다. 그런데 하도진이 진행한 재검사에서 꿀 시료에 잔류 농약이 검출됐고, 이 사실이 알려지면 유기농 인증이 취소되고 계약도 무산될 상황이었다.

### 수법

탁준영은 하도진의 재검사 보고서를 압수하고 정식 제출본에서 관련 항목을 뺀 뒤, 문제를 조용히 정리하자며 하도진을 훈연장비 창고로 데리고 들어갔다. 실랑이 끝에 그를 창고 바닥에 넘어뜨리고, 보관 중이던 훈연기 연료용 왕겨 뭉치에 불을 붙인 뒤 문을 밖에서 잠갔다.

### 결정적 시각·장소

06:55, L03 훈연장비 창고로 하도진을 데리고 들어감 / 07:00~07:03, L03에서 몸싸움과 방화 후 문을 잠금.

### 은폐

탁준영은 하도진이 평소처럼 훈연기 연료를 정리하다 실수로 불을 내고 스스로 갇힌 것처럼 보이게 두고, 정식 제출본에서는 재검사 항목 자체를 없앤 채 계약을 예정대로 진행하려 한다.

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