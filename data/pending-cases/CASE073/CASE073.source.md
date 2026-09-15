# CASE073 — 격납고가 삼킨 정비
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

항공안전 정비인증 갱신 심사를 사흘 앞둔 헬기 관광투어 회사 '스카이패스에비에이션'의 격납고·정비동. 관광 재개를 앞둔 마지막 시운전 점검이 한창이던 늦은 밤, 수석 정비사 권충영이 로터 격납고 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

관광 재개와 정비인증 갱신을 동시에 앞둔 격납고 특유의 초조함과, 동료 사이 신뢰가 무너지는 서늘함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `personal_appointment`

탐정은 스카이패스에비에이션에서 일하는 지인과 개인적인 약속이 있어 미리 도착해 기다리던 참이었다.

## 진실

**진범**: 이환채 (CH03)
**공범**: 없음

### 동기

이환채는 정비교체 대장을 조작해 실제로는 하지 않은 부품 교체를 완료된 것처럼 꾸며 왔다. 권충영이 부품교체 대장과 실제 재고가 맞지 않는다는 것을 확인하고 인증심사위원에게 알리겠다고 나서자, 사흘 앞으로 다가온 항공안전 정비인증 갱신 심사 전에 이를 막아야 하는 처지에 몰렸다.

### 수법

이환채는 천장 크레인에 매달아 둔 로터 블레이드 조립품의 고정 클램프에서 볼트 두 개를 미리 빼 두었다. 권충영이 마지막 시운전 점검을 위해 그 아래로 들어가 조립품 상태를 확인하는 사이, 남은 볼트 하나만으로 버티던 클램프가 풀리며 조립품이 그대로 떨어졌다. 권충영은 그 자리에서 조립품에 깔려 의식을 잃었다.

### 결정적 시각·장소

D-1, 21:20, L03 로터 격납고에서 클램프 볼트 제거 / D-1, 21:40, L03 로터 격납고에서 조립품 낙하 사고 / D-1, 22:00, L03 로터 격납고에서 현장 정리.

### 은폐

이환채는 사고 직후 남은 볼트를 다시 채워 넣어, 클램프가 원래부터 정상이었던 것처럼 보이게 해 두었다.

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