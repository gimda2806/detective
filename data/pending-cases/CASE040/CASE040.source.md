# CASE040 — 건조판이 삼킨 새벽
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가 문화재 복원사업 협력업체 최종 선정을 사흘 앞둔 3대째 전통 한지 공방 '고운닥방'. 후계자 후보 도제들의 단독 초지 시연을 준비하던 새벽, 도제 중 한 명이 건조실 대형 압착 건조판 사이에 끼인 채 발견된다.

## 톤

차분하고 서정적인 장인 공방의 분위기와 후계자 경쟁의 긴장감이 공존하는 톤.

## 탐정의 진입

- 경로: `event_attendance`

탐정은 공방에서 진행하는 전통 한지 뜨기 체험 강좌를 개인적으로 신청해 참가하러 왔다가, 강좌 시작 전 마당에서 소란과 마주친다.

## 진실

**진범**: 서도현 (CH02)
**공범**: 없음

### 동기

서도현은 2년 전 개인적 자금난 때문에 대형 제지회사 '한백제지'에 명우석 고유의 전통 배합 비율을 몰래 넘기는 대가로 돈을 받는 비밀 계약을 맺었다. 국가 문화재 복원사업 협력업체 선정 심사의 '후계자 단독 시연'을 통과해 공식 후계자가 되면 모든 배합 정보에 완전히 접근하게 되어 유출 사실이 드러날 위험이 오히려 줄어들 것이라 판단하고 있었는데, 조민하가 우연히 옛 계약서 사본을 발견해 심사 전 이를 폭로하겠다고 예고하자 이를 막으려 했다.

### 수법

새벽 건조실에서 조민하와 담판을 짓다 몸싸움 끝에 그녀를 대형 압착 건조판 사이로 밀어 넣고, 온풍 건조기 온도조절기를 최고 단계로 돌려 가동시켜 압박과 열기로 질식사시켰다.

### 결정적 시각·장소

사건 당일 새벽 4시 5분경, L02 건조실.

### 은폐

온풍 건조기가 오작동한 사고처럼 현장을 정리하고 건조실 문을 밖에서 걸쇠로 잠근 뒤, 명우석의 서재에서 계약서 원본 봉투를 찾아 마당 화로에 태워 없애려 했다.

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