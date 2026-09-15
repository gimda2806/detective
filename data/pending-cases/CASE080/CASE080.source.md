# CASE080 — 경화실이 삼킨 인증
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제요트협회 선체 인증 검사를 사흘 앞둔 요트 건조소 '아즈마요트웍스'의 선체 성형·경화 작업동. 진수를 앞둔 마지막 선체 경화 작업이 한창이던 늦은 밤, 수석 선체엔지니어 편진람이 수지경화실 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

인증 검사를 사흘 앞둔 조급함과, 몸싸움 끝에 벌어진 일을 조용히 덮으려 한 냉담함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `unrelated_errand`

탐정은 아즈마요트웍스에 맡겨 둔 지인의 소포를 대신 찾아 주러 잠깐 들렀다.

## 진실

**진범**: 류은원 (CH03)
**공범**: 없음

### 동기

류은원은 생산팀장으로서 선체 적층 두께를 실제보다 부풀려 인증 서류에 올려 왔다. 편진람이 적층 검사 원본 기록과 인증 서류의 두께 값이 다르다는 것을 짚어내고, 사흘 뒤 이사회에 그대로 알리겠다고 통보하자 류은원은 진수 자체가 무산될 위기에 몰렸다.

### 수법

늦은 밤 편진람은 마지막 경화 작업을 확인하려 수지경화실에 들어갔다가 그를 뒤따라온 류은원과 다시 부딪혔다. 언쟁이 몸싸움으로 번지며 류은원이 밀치자 편진람은 성형틀 모서리에 머리를 부딪히고 그대로 쓰러져 의식을 잃었다. 류은원은 겁에 질려 도움을 청하는 대신, 자신의 지문과 실랑이 흔적을 지우려 경화 사이클을 가동시켜 방을 밀폐한 채 그를 두고 나갔다.

### 결정적 시각·장소

D-1, 21:50, L03 수지경화실에서 몸싸움 및 낙상 / D-1, 21:55, L03 수지경화실에서 경화 사이클 가동 / D-1, 22:30, L03 수지경화실에서 경화 사이클 중단.

### 은폐

류은원은 얼마 뒤 경화 사이클을 서둘러 멈추고 방을 나섰으며, 그날 밤엔 경화실 근처에도 가지 않았다고 잡아뗐다.

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