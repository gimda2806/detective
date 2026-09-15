# CASE231 — 차가워진 마지막 릴
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

도심 외곽 골목 안쪽에서 3대째 이어온 단관 영화관 '산해극장'. 오직 35mm 필름으로만 상영하는 이곳은 매주 목요일 저녁 정기 상영회를 연다. 특별한 발표회나 개봉 일정 없이 흘러가는 평범한 목요일 밤, 상영이 끝난 뒤 필름 보존고 안에서 공동대표가 쓰러진 채 발견된다.

## 톤

낡은 필름 특유의 정취와, 오랜 세월 감춰온 은밀한 관계가 만든 파국이 부딪히는 분위기.

## 탐정의 진입

- 경로: `invited_by_acquaintance`

탐정은 대학 시절 동기이자 이 극장 단골인 봉시아의 권유로, 그날 저녁 정기 35mm 상영회를 보러 왔다. 미리 알고 온 것은 상영 시간뿐, 그 안에서 벌어진 일은 전혀 예상하지 못했다.

## 진실

**진범**: 설유겸 (CH02)
**공범**: 없음

### 동기

설유겸과 임한서는 3년간 아무도 모르게 연인 관계를 이어왔다. 최근 임한서가 편해준과의 결혼을 발표하며 관계를 완전히 정리하려 하자, 설유겸은 배신감과 모욕감에 사로잡혔다.

### 수법

설유겸은 상영 준비를 핑계로 필름 보존고에서 임한서와 단둘이 마주칠 기회를 만들어 결혼 발표를 취소해 달라고 요구했고, 임한서가 단호히 거절하자 격분해 선반 쪽으로 밀쳐 넘어뜨렸다. 이후 문 앞 온도조절기 전원을 끄고 도어락을 잠근 채 보존고를 나와, 저체온 상태로 방치된 임한서가 사고로 갇힌 것처럼 보이게 했다.

### 결정적 시각·장소

17:00~17:05, L04 필름 보존고에서 발생.

### 은폐

설유겸은 그날 저녁 내내 영사실에서 필름 점검만 했다고 주장하며 임한서와 마주친 사실을 부인했고, 도어락이 예전부터 가끔 저절로 잠기곤 했다는 소문을 은근히 흘려 기계 고장처럼 보이게 하려 했다.

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