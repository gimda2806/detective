# CASE067 — 양식조가 삼킨 등급
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

해외 수출 등급 인증 심사를 이틀 앞둔 철갑상어 캐비어 양식장 '스타지온캐비어팜'의 양식조 관리동. 수출용 캐비어 등급 선별 작업이 한창이던 늦은 밤, 수석 양식관리사 허윤진이 철갑상어 양식조 안에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

해외 수출 인증 심사를 이틀 앞두고 팽팽하던 양식장이, 사고 하나로 순식간에 얼어붙는 분위기.

## 탐정의 진입

- 경로: `onsite_recognized_and_asked`

탐정은 근처에 볼일이 있어 스타지온캐비어팜 로비에 머물러 있었는데, 안면이 있는 직원이 그를 알아보고 다급히 도움을 청했다.

## 진실

**진범**: 조원규 (CH03)
**공범**: 없음

### 동기

조원규는 캐비어 선별 등급을 실제보다 부풀려 기록해 온 사람이었다. 허윤진이 선별 대장의 무게와 등급이 맞지 않는다는 것을 확인하고 투자심사위원에게 알리겠다고 나서자, 이틀 앞으로 다가온 해외 수출 등급 인증 심사 전에 이를 막아야 하는 처지에 몰렸다.

### 수법

조원규는 늦은 밤 양식조 위에서 허윤진과 실랑이를 벌이다, 허윤진이 발을 헛디뎌 양식조 안으로 빠졌다. 허윤진은 수면 위로 올라와 그물망 덮개를 밀어 올리려 했지만, 조원규는 그 덮개를 다시 눌러 닫고 걸쇠를 걸어 잠갔다. 허윤진은 안에서 한동안 덮개를 두드리며 빠져나오려 했으나 끝내 실패했고, 결국 숨이 다해 물 아래로 가라앉았다.

### 결정적 시각·장소

D-1, 21:40, L03 철갑상어 양식조에서 실랑이 및 낙수 / D-1, 21:45, L03 철갑상어 양식조에서 덮개 잠금 / D-1, 22:00, L03 철갑상어 양식조에서 탈출 시도.

### 은폐

조원규는 사고 후 걸쇠를 다시 풀어 두고, '순찰하다 늦게 발견했을 뿐'이라며 자신이 그 시각 그 자리에 있었다는 사실 자체를 숨겼다.

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