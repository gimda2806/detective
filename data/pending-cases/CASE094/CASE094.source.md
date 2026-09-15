# CASE094 — 사격장이 삼킨 명중
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

근대5종 국가대표 훈련센터 '펜타애슬론센터'의 사격·펜싱 훈련동. 국가대표 최종 선발전을 사흘 앞둔 밤, 선발전 전야 사격 훈련이 한창이던 늦은 밤, 수석 사격코치 노수열이 사격훈련장 사대 뒤편에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

최종 선발전을 사흘 앞둔 팽팽한 긴장감과, 기록을 다루던 사람이 정작 기록 때문에 배신당했다는 서늘함이 겹치는 분위기.

## 탐정의 진입

- 경로: `meal_or_rest`

탐정은 훈련센터 근처 벤치에서 늦은 저녁을 먹으며 쉬고 있었다.

## 진실

**진범**: 문충상 (CH03)
**공범**: 없음

### 동기

문충상은 자신이 지도하는 선수의 순위를 끌어올리려 채점표의 명중 점수를 실제보다 높게 고쳐 왔다. 노수열이 채점기록과 표적지 실물이 어긋난다는 것을 짚어내고 이사회에 그대로 넘기겠다고 나서자, 사흘 뒤로 다가온 최종 선발전이 문충상을 궁지로 몰아넣었다.

### 수법

그날 밤 사대에서 노수열이 채점표를 들이밀며 다시 한번 다그치자 문충상은 격분해 옆에 세워 둔 사격 거치대를 집어 들어 그의 어깨와 머리를 가격했다. 노수열은 충격으로 균형을 잃고 뒤로 넘어지며 사대 뒤편 콘크리트 격벽 모서리에 머리를 부딪혔고, 그대로 의식을 잃었다.

### 결정적 시각·장소

D-1, 21:10, L03 사격훈련장에서 거치대로 가격 및 격벽 충돌 / D-1, 21:30, L03 사격훈련장에서 거치대 정리 / D-1, 22:00, L03 사격훈련장에서 격벽 주변 정돈.

### 은폐

문충상은 사고 직후 거치대를 원래 자리에 되돌려 놓고, 격벽에 남은 흔적을 소매로 닦아내며 노수열이 스스로 넘어진 것처럼 보이게 해 두었다.

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