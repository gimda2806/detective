# CASE132 — 조명이 꺼진 자리
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

지역 소극장 산아래소극장에서 신작 공연의 기술 리허설이 한창이다. 오늘 저녁은 후원자들을 초청한 공개 리허설이 열려 평소보다 많은 외부인이 드나든다. 낡은 건물이라 무대 뒤 배전반이 리허설 기간 내내 간간이 말썽을 부려 왔다.

## 톤

낡은 소극장 특유의 먼지 냄새와 후원자들의 기대, 무대 뒤에서 새어 나온 다급함이 뒤섞인 밤.

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 후원회 담당자로 일하는 대학 동창 석하은의 초대로 공개 리허설을 보러 왔다가, 휴식 시간 도중 무대 뒤에서 터진 소란과 마주친다.

## 진실

**진범**: 반소진 (CH01)
**공범**: 없음

### 동기

반소진은 청소년 연극교실 지원금 계좌에서 몇 달째 개인 채무 상환을 위해 일정 금액을 조금씩 돌려써 왔다. 이번 분기 예산 정산을 함께 맡게 된 하윤성이 집행 내역과 실제 영수증이 어긋나는 것을 발견하고 다음 이사회에 보고하겠다고 하자, 발각을 막으려 한다.

### 수법

반소진은 그날 오후 반복되는 누전 차단을 임시로 넘기려 배전반 안쪽 차단기에 점퍼선을 연결해 우회해 두었다(정식 수리 비용도 아끼려는 목적이었다). 공개 리허설 휴식 시간에 배전반 구역에서 하윤성과 언쟁하다 그를 밀쳤고, 하윤성이 균형을 잃으며 우회선이 닿아 있던 배전반 문짝을 짚어 감전사했다.

### 결정적 시각·장소

20:15, L04에서 하윤성과 반소진이 함께 들어감 / 20:20, L04에서 언쟁 / 20:25, L04에서 몸싸움 끝에 감전사.

### 은폐

반소진은 낡은 배전반의 만성적 결함으로 인한 사고라고 주장하며, 그날 오후 자신이 직접 배선을 우회해 둔 사실과 사고 직후 우회선을 치운 사실은 언급하지 않는다.

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