# CASE005 — 금고가 지킨 거짓말
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

경매 전야 프리뷰 전시가 열리는 고급 골동품 갤러리 겸 감정 공방. 안쪽 감정실에는 개조된 대형 금고가 놓여 있다.

## 톤

상류층 미술품 경매 업계의 허영과 신뢰가 뒤섞인 서늘하고 정제된 분위기.

## 탐정의 진입

탐정은 갤러리 대표의 신고를 받고, 시신이 발견된 이른 아침 갤러리에 도착한다.

## 진실

**진범**: 서지안 (CH03)
**공범**: 없음 (위조 감정서를 사들인 위조범은 이번 사건 수사 범위 밖의 별도 인물이다.)

### 동기

서지안은 개인 채무를 갚기 위해 위조범과 짜고 몇 점의 골동품에 위조 감정서를 발급해 왔다. 그런데 오영신이 경매 전날 밤 재감정 중 감정서 등록번호의 불일치를 발견하고 그녀를 추궁했다.

### 수법

감정실에서 추궁당한 서지안은 몸싸움 끝에 오영신을 금고 안으로 밀어 넣고 문을 잠갔다. 이어 금고 내부 비상 개폐장치의 배선을 끊어 오영신이 스스로 탈출하지 못하게 만들었다.

### 결정적 시각·장소

21:05~21:12, L02 감정실 겸 금고실.

### 은폐

서지안은 태연히 전시홀로 돌아가 손님 응대를 계속했고, 다음날 시신이 발견된 뒤에도 금고 노후 고장으로 인한 사고라는 갤러리 측 추정에 편승해 침묵했다.

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