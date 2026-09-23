# CASE108 — 닫히지 않은 장부
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

밤새 이어진 열두 시간 특별 생방송 '소리마루 나눔 마라톤'이 막 끝난 이른 아침의 지역 공동체 라디오 방송국 '라디오 소리마루'. 지역 아동병원 후원금을 모으는 방송이었고, 종료 직후에도 몇몇 스태프가 남아 정산과 장비 정리를 하고 있었다.

## 톤

밤샘 생방송의 여운과 이른 아침의 서늘한 정적이 뒤섞인 지역 라디오 방송국.

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 방송국 프로듀서인 오랜 지인 채유겸의 초대로 전날 밤 열두 시간 생방송 마라톤을 참관하러 왔다가, 막차 시간을 놓쳐 방송국 대기실에서 밤을 새우던 참이었다.

## 진실

**진범**: 목윤재 (CH01)
**공범**: 없음

### 동기

목윤재는 방송국 운영 자금난으로 개인적으로 진 사업 대출을 막기 위해, '나눔 마라톤'으로 모금된 후원금 중 일부를 재단에 정산하기 전에 개인 계좌로 돌려썼다. 고재하가 방송 종료 직후 실제 입금 내역과 발표된 모금 총액을 대조하다 그 차액을 발견하고, 다음 날 아침 이사회에 알리겠다고 하자 입을 막으려 했다.

### 수법

목윤재는 22시경 송출기술실에서 정산 차액을 추궁하는 고재하와 실랑이를 벌이다, 미리 고정 볼트를 풀어 둔 장비 랙 쪽으로 그를 밀쳤다. 노후한 랙이 그대로 무너져 내려 고재하가 깔려 숨졌다. 목윤재는 저절로 무너진 사고처럼 보이도록 현장을 그대로 두고, 고재하가 들고 있던 정산 메모와 개인 USB만 챙겨 없앴다.

### 결정적 시각·장소

22:00, L03(송출기술실)에서 실랑이 / 22:05, L03에서 장비 랙 쪽으로 밀쳐 랙이 무너지며 압사.

### 은폐

목윤재는 노후한 장비 랙 고정 장치가 저절로 풀려 무너진 사고라고 주장하며, 자신이 그 시간 그 자리에 있었다는 사실이나 고재하와 다툼이 있었다는 사실은 언급하지 않는다.

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