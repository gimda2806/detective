# CASE017 — 테이스팅룸에 남은 한 입
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

전국 쇼콜라티에 경연 출품을 앞둔 소규모 초콜릿 아틀리에 '카카오노트'. 안쪽 개인 시식용 테이스팅룸에서 수석 파티시에가 갑작스러운 알레르기 쇼크로 숨진 채 발견된다.

## 톤

달콤한 공방의 겉모습과 경연을 앞둔 압박감이 대비되는 분위기.

## 탐정의 진입

탐정은 매일 아침 같은 길로 산책을 하다가, 평소엔 늦게 문을 여는 아틀리에 앞에 사람들이 몰려 웅성거리는 것을 보고 걸음을 멈춘다.

## 진실

**진범**: 구태영 (CH02)
**공범**: 없음

### 동기

구태영은 아틀리에 '카카오노트'의 최근 신상품과 이번 경연 출품작 대부분이 실제로는 윤채희가 개발한 것이었는데도 자신의 이름으로 발표해 왔다. 투자 유치가 이번 경연 성적에 달려 있는 상황에서, 윤채희가 경연 직후 독립을 선언하며 그동안의 레시피 도용 사실을 폭로하겠다고 예고하자 이를 막아야 했다.

### 수법

구태영은 경연 전날 새벽, 윤채희가 미리 준비해 둔 무견과 표시 시식 접시에 헤이즐넛 프랄린 조각을 몰래 섞어 넣고, 곧이어 그녀의 에피펜을 사무실 책상 서랍에 숨겨 알레르기 쇼크가 왔을 때 스스로 대응하지 못하게 만들었다.

### 결정적 시각·장소

06:40, L03 테이스팅룸에서 시식 접시 조작 / 06:50, L05 사무실에서 에피펜 은닉.

### 은폐

구태영은 채희가 새 레시피를 시험하다 실수로 자기 견과류를 넣은 것 같다고 둘러대며 단순 사고사로 마무리하려 한다.

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