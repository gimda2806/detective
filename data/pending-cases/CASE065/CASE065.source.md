# CASE065 — 도장부스가 삼킨 등급
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

선급 협회 최종 인증 검사를 사흘 앞둔 소형선박 건조도크 '해오름조선'의 선체 도장·의장 작업동. 진수를 앞둔 마지막 도장 작업이 한창이던 늦은 밤, 수석 품질검사관 한서린이 도장부스 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

선급 인증 검사를 사흘 앞두고 팽팽하던 도크가, 순식간에 치솟은 불길 하나로 얼어붙는 분위기.

## 탐정의 진입

- 경로: `witnessed_incident`

탐정은 도크 앞 방파제를 지나던 중 도장 작업동 쪽에서 치솟는 섬광과 뒤이은 비명을 직접 목격했다.

## 진실

**진범**: 서문수아 (CH03)
**공범**: 없음

### 동기

서문수아는 원가를 줄이려 저등급 선체 자재를 상위 등급 성적서로 바꿔치기해 인증받아 왔다. 한서린이 성적서 번호와 실제 입고 자재의 로트가 어긋난다는 것을 확인하고 이사회에 그대로 보고하겠다고 나서면서, 사흘 앞으로 다가온 선급협회 인증 검사 전에 그를 막아야 하는 처지에 몰렸다.

### 수법

서문수아는 마지막 도장 작업 직전, 도장부스 접지선을 몰래 풀어 정전기 방전 경로를 끊어 두었다. 한서린이 습관대로 스프레이건 방아쇠를 당기는 순간 정전기 스파크가 튀었고, 부스 안에 가득 차 있던 인화성 시너 증기에 그대로 옮겨붙었다. 순식간에 치솟은 섬광에 한서린은 화상과 함께 의식을 잃었고, 병원으로 옮겨졌지만 끝내 숨을 거뒀다.

### 결정적 시각·장소

D-1, 21:10, L03 도장부스에서 접지선 제거 / D-1, 21:35, L03 도장부스에서 정전기 발화 / D-1, 21:55, L03 도장부스에서 접지선 복구.

### 은폐

서문수아는 소방대가 도착하기 전 부스로 되돌아가 풀어 뒀던 접지선을 다시 연결해, 자신이 그 시각 접지 설비에 손을 댔다는 흔적 자체를 지우려 했다.

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