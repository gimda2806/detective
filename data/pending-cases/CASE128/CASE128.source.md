# CASE128 — 얼어붙은 다섯 번째 접시
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

미쉐린 가이드 서울판 비공개 암행 심사를 사흘 앞둔 분자미식 파인다이닝 레스토랑 '앱솔루트제로'. 신메뉴 최종 테이스팅이 한창이던 이른 오후, 수 셰프가 액체질소 저장실(냉각챔버) 안에서 쓰러진 채 발견된다.

## 톤

미쉐린 심사 압박과 화려한 파인다이닝 이면의 긴장감이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `meal_or_rest`

탐정은 미식 담당 지인의 추천으로 '앱솔루트제로'의 비공개 프리뷰 코스를 예약해 두고 있었다. 다섯 번째 접시를 기다리던 중 주방 뒤편에서 비명이 터진다.

## 진실

**진범**: 엄태오 (CH02)
**공범**: 없음

### 동기

엄태오는 경쟁 레스토랑 그룹과 비밀리에 이적 계약(경업금지 조항 포함) 초안에 이미 서명해 둔 상태였다. 미쉐린 심사를 앞두고 이 사실이 알려지면 그의 입지는 물론 레스토랑 전체의 평판까지 흔들릴 상황이었는데, 목현서가 서류를 돌려주러 왔다가 우연히 계약서 초안을 보고 말았다.

### 수법

엄태오는 정오 무렵 목현서에게 냉각챔버에서 단둘이 신메뉴 액체질소 테스트를 하자고 제안해 그녀를 안으로 들여보냈다. 13:05 문을 밖에서 잠그고, 13:06 환기밸브까지 잠가 액체질소가 기화하며 산소를 밀어낸 밀폐 공간에 그녀를 가둬 질식하게 만들었다.

### 결정적 시각·장소

13:05, L03 냉각챔버 문 잠금 / 13:06, L03 환기밸브 잠금.

### 은폐

엄태오는 목현서가 실수로 스스로 문을 잠그고 들어갔다가 사고를 당한 것처럼 꾸미고, 도어락 전자 로그에서 13:00~13:10 구간 기록을 지우려 했다.

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