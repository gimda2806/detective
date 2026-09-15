# CASE048 — 타지 않은 이름표
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

확장 개장 행사를 하루 앞둔 반려동물 전문 화장장 '별빛펫메모리얼'. 취재진 시연을 앞두고 마지막 점검이 한창인 오후, 운영실장이 소각로 뒤편 경사로 아래에서 추락한 채 발견된다.

## 톤

반려동물을 떠나보낸 이들의 슬픔과, 그 슬픔을 담보로 한 비용 절감이 뒤섞인 화장장의 오후.

## 탐정의 진입

- 경로: `anonymous_tip_self_initiated`

탐정은 이 화장장의 화장 방식에 의문을 제기하는 제보를 받고 사실관계를 확인하러 왔다가, 마침 시연 준비로 분주한 시설 뒤편에서 사람들이 몰려 있는 것을 발견한다.

## 진실

**진범**: 표은결 (CH01)
**공범**: 없음

### 동기

표은결은 소각로의 하루 처리 용량이 정해져 있는데도 예약이 몰리는 날에는 여러 마리를 한 소각로에서 함께 태우는 합동화장으로 처리하면서, 보호자들에게는 개별화장 비용을 그대로 청구해 차액을 챙겨 왔다. 확장 개장 행사로 취재진이 몰릴 예정인 상황에서 운영실장 곽시온이 인식표 재고 불일치를 발견하고 추궁해오자, 이 사실이 드러나면 사업 전체가 무너질 것을 우려했다.

### 수법

표은결은 14시경 공사 중이라 인적이 드문 소각로 뒤편 경사로로 곽시온을 불러내 언쟁을 벌이다, 2시 10분경 그를 밀쳐 추락시켰다. 사고사로 위장하기 위해 곧장 자리를 떴고, 그 과정에서 곽시온이 증거를 정리해 둔 휴대전화를 챙겨 소각로에 넣어 없앴다.

### 결정적 시각·장소

14:00, L04 소각로 뒤편 경사로에서 언쟁 / 14:10, L04에서 곽시온을 밀쳐 추락시킴.

### 은폐

표은결은 공사 중인 경사로에서 발을 헛디딘 사고라고 주장하며, 곽시온의 휴대전화가 사라진 사실은 언급하지 않는다.

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