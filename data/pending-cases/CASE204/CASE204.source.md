# CASE204 — 잘리지 않은 가지
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 장미·리시안서스 절화 농원 '봄빛화원'. 두 달 전 작고한 설립자의 뜻에 따라 장남이 운영권을 물려받았고, 매달 첫째 주 토요일에는 그날 수확한 꽃을 인근 요양병원에 나누는 '이웃 장미 나눔데이'를 연다. 포장 작업이 한창이던 이번 나눔데이 오후, 온실 안쪽 삽목실에서 대표가 쓰러진 채 발견된다.

## 톤

따뜻한 관계 이야기 위에 씁쓸한 균열이 겹치는 가족 드라마풍 미스터리

## 탐정의 진입

- 경로: `volunteer_or_helper`

탐정은 매달 나눔데이 포장 작업을 도우러 오는 오랜 동네 자원봉사자였다. 오늘도 어김없이 장미 다발을 묶던 중 온실 쪽 소란에 이끌려 간다.

## 진실

**진범**: 봉재홍 (CH01)
**공범**: 없음

### 동기

두 달 전 세상을 뜬 할머니의 유언대로면 농장 운영권은 삼남매가 함께 결정권을 나누기로 돼 있었지만, 재헌이 아버지 명의의 위임장을 앞세워 운영권 지분을 자기 단독 명의로 돌리는 절차를 이미 시작한 사실을 안 뒤, 자신 몫의 지분이 통째로 사라지는 것을 도저히 받아들일 수 없었다.

### 수법

나눔데이 포장 작업이 한창이라 다들 포장 작업장에 몰려 있는 틈을 타, 재홍이 삽목실로 찾아가 재헌에게 위임장 절차를 그만두라고 요구했다. 재헌이 이미 늦었다며 물러서지 않자, 작업대 위에 놓여 있던 전정가위로 재헌의 손목 안쪽을 찔러 동맥을 끊었다.

### 결정적 시각·장소

사건 당일 오후 나눔데이 포장 작업이 한창이던 시각, 온실 안쪽 삽목실(L04)에서 벌어졌다.

### 은폐

재헌의 손에 전정가위 손잡이를 다시 쥐여줘 혼자 가지치기를 하다 실수로 동맥을 벤 사고처럼 꾸미고, 자신은 그 시간 내내 정산실에서 나눔데이 후원금 장부를 정리하고 있었다는 알리바이를 미리 짜 두었다.

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