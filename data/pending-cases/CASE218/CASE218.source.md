# CASE218 — 사다리가 기억하는 무게
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

지방 하천가에 자리한 3대째 가업 민물장어 양식장 '청류가'. 대형 순환여과 양식조 여섯 기와 사료저장다락을 갖춘 축사형 건물이 부지 한쪽에 자리하고, 반대편엔 가족이 지내는 안채가 붙어 있다. 특별한 행사나 마감 없이, 간밤 폭우로 진입로 일부가 유실된 채 다음 날 아침을 맞는다.

## 톤

습기 찬 새벽 공기처럼 서서히 무거워지는 가족 드라마형 정통 추리 분위기.

## 탐정의 진입

- 경로: `stranded_by_circumstance`

탐정은 인근 지역 답사를 마치고 돌아가던 길에 폭우로 도로 일부가 유실되며 차가 고립되자, 근처에 있던 청류가에서 하룻밤 신세를 지게 된다.

## 진실

**진범**: 하경목 (CH01)
**공범**: 없음

### 동기

부지 매각이 성사되면 심장이 약한 아버지 하대영이 받을 충격을 두려워한 하경목이, 매각을 막고 아버지를 지키기 위해 오빠를 없애기로 결심했다.

### 수법

하경목은 사고 전날 밤 다락 사다리의 디딤대 고정 볼트와 안전 손잡이 걸쇠를 미리 풀어 두었고, 다음 날 새벽 평소처럼 재고를 확인하러 다락에 오른 하태선이 내려오다 헐거워진 손잡이를 붙잡는 순간 볼트가 빠지며 사다리와 함께 바닥으로 추락해 사망했다.

### 결정적 시각·장소

전날 21:50~22:00경 L02 사료저장다락에서 볼트·손잡이 조작, 당일 05:30경 L02에서 추락 발생.

### 은폐

하경목은 사고 직후 사람들이 흩어진 틈을 타 다시 다락에 올라가 풀어 두었던 볼트를 조여 사다리가 원래부터 낡아 부서진 것처럼 보이게 했지만, 이음새에 새로 조인 자국이 이전 흔적과 겹쳐 남았고 공구함에 넣어 둔 렌치의 사용 흔적도 완전히 지우지 못했다.

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