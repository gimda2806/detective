# CASE153 — 실린더에 새겨진 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 앤티크 오르골 경매 프리뷰를 사흘 앞둔 태엽 오르골 복원 공방 '태엽정원'. 마감 작업이 한창이던 새벽, 복원을 총괄해 온 수석 복원사가 태엽 조립실에서 숨을 거둔 채 발견된다.

## 톤

고풍스러운 기계 부품 냄새와 팽팽한 긴장이 뒤섞인 폐쇄적인 공방.

## 탐정의 진입

- 경로: `returning_former_affiliate`

탐정은 예전에 이 공방에서 잠깐 견습으로 일했던 인연으로, 오래된 개인 소장품 오르골의 수리 가능 여부를 물어보러 사적으로 들렀다가 소란한 상황과 마주친다.

## 진실

**진범**: 옥지안 (CH02)
**공범**: 없음

### 동기

옥지안은 3년 전 세상을 떠난 작은아버지의 오르골 컬렉션을 정리하며, 원래 사촌 심유안에게 상속되어야 할 희귀 오르골 '노래하는 종달새'의 등록 서류를 손봐 자신의 개인 소장품으로 만들어 이번 경매에 출품했다. 연도하가 복원 작업 중 실린더에 새겨진 제작 일련번호가 그 등록 서류의 번호와 다르다는 사실을 알아챘다.

### 수법

옥지안은 야간에 연도하와 언쟁하다 그를 밀쳤고, 넘어진 연도하는 장력이 걸린 태엽 릴리스암에 목이 걸려 크게 다쳤다. 옥지안은 그가 숨을 거두는 것을 지켜보면서도 구조를 요청하지 않았다.

### 결정적 시각·장소

22:10, L03 태엽 조립실에서 몸싸움 및 부상 / 22:20, L03에서 방치 후 안전핀 제거.

### 은폐

옥지안은 안전핀을 미리 제거해 두어, 연도하가 야간에 혼자 장력 시험대를 점검하다 안전장치 오작동으로 사고를 당한 것처럼 현장을 꾸민다.

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